import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import IEventController from '@Glibs/interface/ievent'
import { EventTypes } from '@Glibs/types/globaltypes'

export interface IPostPro {
    setGlow(target: THREE.Mesh | THREE.Group): void
    setNonGlow(target: THREE.Mesh | THREE.Group): void
    render(delta: number): void
    resize(): void
}

const BLOOM_LAYER = 1

export class Postpro2 implements IPostPro {
    private renderScene = new RenderPass(this.scene, this.camera)

    // Bloom: 번짐 완화 & 부드러운 확산
    private bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.45, // strength
        0.4,  // radius
        0.8   // threshold
    )

    private bloomComposer: EffectComposer
    private finalComposer: EffectComposer
    private _finalPass!: ShaderPass

    // AA
    private _useSMAA: boolean
    private _smaa2?: SMAAPass
    private _fxaa2?: ShaderPass

    // outline & occlusion
    private outlinePass: OutlinePass
    private outlineTargets: THREE.Object3D[] = []
    private occlusionObstacles: THREE.Object3D[] = []
    private raycaster = new THREE.Raycaster()
    private _tmp = new THREE.Vector3()

    private _darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    private _matCache = new Map<string, THREE.Material>()

    constructor(
        private scene: THREE.Scene,
        private camera: THREE.Camera,
        private renderer: THREE.WebGLRenderer,
        eventCtrl: IEventController
    ) {
        // ── Renderer: 톤매핑/sRGB 변환은 OutputPass에서 이 설정을 읽어 적용한다.
        //    원색을 섞거나 탈채하지 않고 노출만 적용한다.
        this.renderer.toneMapping = THREE.LinearToneMapping
        this.renderer.toneMappingExposure = 1.0
        this.renderer.outputColorSpace = THREE.SRGBColorSpace

        const w = window.innerWidth, h = window.innerHeight
        const isWebGL2 = (this.renderer.capabilities as any).isWebGL2 === true
        const pr = this.renderer.getPixelRatio()
        this._useSMAA = pr <= 1

        const rtOpts: THREE.WebGLRenderTargetOptions = {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.NoColorSpace, // linear
        }

        // ── Bloom chain
        const rtBloom = new THREE.WebGLRenderTarget(w, h, rtOpts)
        this.bloomComposer = new EffectComposer(this.renderer, rtBloom)
        this.bloomComposer.renderToScreen = false
        this.bloomComposer.setPixelRatio(this._useSMAA ? 1 : pr)
        this.bloomComposer.addPass(this.renderScene)
        this.bloomComposer.addPass(this.bloomPass)

        // ── 최종 합성 (linear에서 base+bloom만)
        const finalMat = new THREE.ShaderMaterial({
            uniforms: {
                postBaseTexture: { value: null },
                postBloomTexture: { value: null },
                bloomGain: { value: 0.6 }
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D postBaseTexture;   // linear
        uniform sampler2D postBloomTexture;  // linear
        uniform float bloomGain;

        void main(){
          vec4 base = texture2D(postBaseTexture, vUv);
          vec3 bloom = texture2D(postBloomTexture, vUv).rgb;
          gl_FragColor = vec4(base.rgb + bloom * bloomGain, base.a);
        }
      `
        })
        finalMat.toneMapped = false

        const finalPass = new ShaderPass(finalMat, 'postBaseTexture')
        finalPass.needsSwap = true
        this._finalPass = finalPass

        const rtFinal = new THREE.WebGLRenderTarget(w, h, {
            ...rtOpts, minFilter: THREE.NearestFilter, magFilter: THREE.LinearFilter
        })
        this.finalComposer = new EffectComposer(this.renderer, rtFinal)
        this.finalComposer.setPixelRatio(this._useSMAA ? 1 : pr)
        this.finalComposer.addPass(this.renderScene)
        this.finalComposer.addPass(finalPass)

        // ── Outline: 살구빛 + 약한 강도
        this.outlinePass = new OutlinePass(new THREE.Vector2(w, h), this.scene, this.camera)
        this.outlinePass.edgeStrength = 2.0
        this.outlinePass.edgeThickness = 1.0
        this.outlinePass.pulsePeriod = 0.0
        this.outlinePass.visibleEdgeColor.set(0xffd7c9)
        this.outlinePass.hiddenEdgeColor.set(0xffd7c9)
        this.outlinePass.selectedObjects = []
        this.finalComposer.addPass(this.outlinePass)

        // ── 출력 변환: 톤매핑 + linear→sRGB (EffectComposer 경로에서는 renderer가 자동 적용하지 않음)
        //    AA(FXAA/SMAA)는 sRGB 입력을 전제로 하므로 그 앞에 둔다.
        this.finalComposer.addPass(new OutputPass())

        // ── AA
        if (this._useSMAA) {
            this._smaa2 = new SMAAPass(w, h)
            this.finalComposer.addPass(this._smaa2) // AA는 항상 제일 마지막
        } else {
            this._fxaa2 = new ShaderPass(FXAAShader)
            this._fxaa2.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr))
            this.finalComposer.addPass(this._fxaa2)
        }

        if (isWebGL2 && (this.bloomComposer as any).setMultisample) {
            (this.bloomComposer as any).setMultisample(4)
                ; (this.finalComposer as any).setMultisample(4)
        }

        // camera layers: 0 + BLOOM_LAYER
        this.camera.layers.enable(0)
        this.camera.layers.enable(BLOOM_LAYER)

        // events
        eventCtrl.RegisterEventListener(EventTypes.SetGlow, (t: THREE.Mesh | THREE.Group) => this.setGlow(t))
        eventCtrl.RegisterEventListener(EventTypes.Outline, (t: THREE.Mesh | THREE.Group) => {
            const i = this.outlineTargets.findIndex(o => o.uuid === t.uuid)
            if (i !== -1) this.outlineTargets = [...this.outlineTargets.slice(0, i), ...this.outlineTargets.slice(i + 1)]
            else this.outlineTargets = [...this.outlineTargets, t]
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (t: THREE.Object3D) => {
          const i = this.occlusionObstacles.findIndex(o => o.uuid === t.uuid)
          if (i < 0) this.occlusionObstacles.push(t)
        })

        // context loss logs
        this.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); console.warn('WebGL context lost') })
        this.renderer.domElement.addEventListener('webglcontextrestored', () => { console.warn('WebGL context restored'); this.resize() })
    }

    // ---------- Public ----------
    setGlow(target: THREE.Mesh | THREE.Group) {
        target.traverse((o: any) => { if (o.isObject3D) { o.layers.enable(0); o.layers.enable(BLOOM_LAYER) } })
    }
    setNonGlow(target: THREE.Mesh | THREE.Group) {
        target.traverse((o: any) => { if (o.isObject3D) { o.layers.enable(0); o.layers.disable(BLOOM_LAYER) } })
    }
    setOutlineTargets(ts: THREE.Object3D[]) { this.outlineTargets = ts ?? [] }
    setOcclusionObstacles(os: THREE.Object3D[]) { this.occlusionObstacles = os ?? [] }

    setOutlineStyle(opts: Partial<{
        edgeStrength: number
        edgeThickness: number
        visibleEdgeColor: THREE.ColorRepresentation
        hiddenEdgeColor: THREE.ColorRepresentation
        pulsePeriod: number
    }>) {
        if (opts.edgeStrength !== undefined) this.outlinePass.edgeStrength = opts.edgeStrength
        if (opts.edgeThickness !== undefined) this.outlinePass.edgeThickness = opts.edgeThickness
        if (opts.pulsePeriod !== undefined) this.outlinePass.pulsePeriod = opts.pulsePeriod
        if (opts.visibleEdgeColor !== undefined) this.outlinePass.visibleEdgeColor.set(opts.visibleEdgeColor)
        if (opts.hiddenEdgeColor !== undefined) this.outlinePass.hiddenEdgeColor.set(opts.hiddenEdgeColor)
    }

    resize(): void {
        const w = window.innerWidth, h = window.innerHeight
        const pr = this.renderer.getPixelRatio()
        this.bloomPass.setSize(w, h)
        this.bloomComposer.setSize(w, h)
        this.finalComposer.setSize(w, h)
        this.outlinePass.setSize(w, h)
        this.bloomComposer.setPixelRatio(this._useSMAA ? 1 : pr)
        this.finalComposer.setPixelRatio(this._useSMAA ? 1 : pr)
        if (this._useSMAA) { this._smaa2?.setSize(w, h) }
        else {
            this._fxaa2?.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr))
        }
    }

    // ---------- Render ----------
    render(_dt: number) {
        // BLOOM_LAYER만 (배경 제외)
        const prevScene = (this.renderScene as any).scene;
        const prevBg = this.scene.background;
        (this.renderScene as any).scene = this.scene;
        this.scene.background = null;

        this.camera.layers.set(BLOOM_LAYER);
        this.bloomComposer.render();

        // 최신 블룸 텍스처 전달
        (this._finalPass.material as THREE.ShaderMaterial).uniforms.postBloomTexture.value = this._getBloomTexture();

        // 복원
        (this.renderScene as any).scene = prevScene;
        this.scene.background = prevBg;

        // 최종 합성 + 아웃라인 + 출력 변환 + AA
        this.camera.layers.set(0);
        this.camera.layers.enable(BLOOM_LAYER);
        this.updateOutlineSelection();
        this.finalComposer.render();
    }

    // ---------- Internal: selective outline ----------
    private isOccluded(target: THREE.Object3D): boolean {
        if (!this.occlusionObstacles.length) return false
        const targetPos = target.getWorldPosition(this._tmp); targetPos.y += 1
        const camPos = (this.camera as THREE.Camera).position
        const dir = new THREE.Vector3().subVectors(targetPos, camPos).normalize()
        this.raycaster.set(camPos, dir)
        const hits = this.raycaster.intersectObjects(this.occlusionObstacles, true)
        if (!hits.length) return false
        return hits[0].distance < camPos.distanceTo(targetPos)
    }
    private updateOutlineSelection() {
        if (!this.outlineTargets.length) { this.outlinePass.selectedObjects = []; return }
        const occluded: THREE.Object3D[] = []
        for (const t of this.outlineTargets) if (this.isOccluded(t)) occluded.push(t)
        this.outlinePass.selectedObjects = occluded
    }

    // ---------- Internal: bloom helpers ----------
    private _getBloomTexture(): THREE.Texture {
        // Three.js r160: 원본 영상이 합쳐지기 전의 블룸 텍스처만 사용한다.
        return this.bloomPass.renderTargetsHorizontal[0].texture
    }
}
