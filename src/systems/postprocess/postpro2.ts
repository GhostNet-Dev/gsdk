import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
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
    // passes & composers
    private renderScene = new RenderPass(this.scene, this.camera)
    private bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.4,  // strength (1.0~2.0 권장)
        0.45, // radius (0.3~0.7)
        0.2   // threshold (0.0~0.3 시작)
    )
    private bloomComposer: EffectComposer
    private finalComposer: EffectComposer
    private _finalPass!: ShaderPass

    // AA
    private _useSMAA: boolean
    private _smaa1?: SMAAPass
    private _smaa2?: SMAAPass
    private _fxaa1?: ShaderPass
    private _fxaa2?: ShaderPass

    // outline & occlusion
    private outlinePass: OutlinePass
    private outlineTargets: THREE.Object3D[] = []
    private occlusionObstacles: THREE.Object3D[] = []
    private raycaster = new THREE.Raycaster()
    private _tmp = new THREE.Vector3()

    // darken-non-bloom cache
    private _darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    private _matCache = new Map<string, THREE.Material>()

    constructor(
        private scene: THREE.Scene,
        private camera: THREE.Camera,
        private renderer: THREE.WebGLRenderer,
        eventCtrl: IEventController
    ) {
        // renderer config
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // (Reinhard보다 색 안정)
        this.renderer.toneMappingExposure = 1.5
        this.renderer.outputColorSpace = THREE.SRGBColorSpace


        const w = window.innerWidth, h = window.innerHeight
        const isWebGL2 = (this.renderer.capabilities as any).isWebGL2 === true
        const pr = this.renderer.getPixelRatio()
        this._useSMAA = pr <= 1

        const rtOpts: THREE.WebGLRenderTargetOptions = {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.NoColorSpace, // 중간 버퍼는 linear 유지
            // samples: 4  // ❌ 호환성 문제로 비활성
        }
        // bloom chain
        const rtBloom = new THREE.WebGLRenderTarget(w, h, rtOpts)
        this.bloomComposer = new EffectComposer(this.renderer, rtBloom)
        this.bloomComposer.renderToScreen = false
        this.bloomComposer.setPixelRatio(this._useSMAA ? 1 : pr)
        this.bloomComposer.addPass(this.renderScene)
        this.bloomComposer.addPass(this.bloomPass)

        const finalMat = new THREE.ShaderMaterial({
            uniforms: {
                postBaseTexture: { value: null },
                postBloomTexture: { value: null },
                useScreenBlend: { value: 1 },     // 0=ADD, 1=SCREEN
                bloomGain: { value: 1.0 },   // ✅ 추가: 블룸 게인
            },
            vertexShader: `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
            fragmentShader: `
    precision mediump float;
    varying vec2 vUv;

    uniform sampler2D postBaseTexture;
    uniform sampler2D postBloomTexture;
    uniform int   useScreenBlend;  // ✅ 이름 통일
    uniform float bloomGain;       // ✅ 추가

    #include <common>
    #include <tonemapping_pars_fragment>

    vec3 screenBlend(vec3 a, vec3 b){ return 1. - (1. - a)*(1. - b); }

    void main(){
      vec3 base  = texture2D(postBaseTexture,  vUv).rgb;
      vec3 bloom = texture2D(postBloomTexture, vUv).rgb * bloomGain;

      vec3 outc = (useScreenBlend==1) ? screenBlend(base, bloom) : (base + bloom);
      gl_FragColor = vec4(outc, 1.0);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
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

        // outline
        this.outlinePass = new OutlinePass(new THREE.Vector2(w, h), this.scene, this.camera)
        this.outlinePass.edgeStrength = 4.0
        this.outlinePass.edgeThickness = 1.5
        this.outlinePass.pulsePeriod = 0.0
        this.outlinePass.visibleEdgeColor.set(0xff3a3a)
        this.outlinePass.hiddenEdgeColor.set(0xff3a3a)
        this.outlinePass.selectedObjects = []
        this.finalComposer.addPass(this.outlinePass)

        // AA attach
        if (this._useSMAA) {
            this._smaa1 = new SMAAPass(w, h)
            this._smaa2 = new SMAAPass(w, h)
            this.bloomComposer.addPass(this._smaa1)
            this.finalComposer.addPass(this._smaa2)
        } else {
            const makeFXAA = () => {
                const fx = new ShaderPass(FXAAShader)
                fx.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr))
                return fx
            }
            this._fxaa1 = makeFXAA()
            this._fxaa2 = makeFXAA()
            this.bloomComposer.addPass(this._fxaa1)
            this.finalComposer.addPass(this._fxaa2)
        }

        if (isWebGL2 && (this.bloomComposer as any).setMultisample) {
            (this.bloomComposer as any).setMultisample(4)
                (this.finalComposer as any).setMultisample(4)
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
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (o: THREE.Object3D) => this.occlusionObstacles.push(o))

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
        if (this._useSMAA) { this._smaa1?.setSize(w, h); this._smaa2?.setSize(w, h) }
        else {
            this._fxaa1?.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr))
            this._fxaa2?.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr))
        }
    }

    // ---------- Render ----------
    //   render(_delta: number) {
    //     // 1) 블룸 패스: non-bloom 객체를 검은색으로 치환 → 밝은(레벨1)만 남김
    //     this.camera.layers.set(BLOOM_LAYER)
    //     this._darkenNonBloom(true)
    //     this.bloomComposer.render()
    //     this._darkenNonBloom(false)

    //     // 2) 블룸 텍스처 최신값을 최종 합성으로 전달
    //     const mat = this._finalPass.material as THREE.ShaderMaterial
    //     mat.uniforms.postBloomTexture.value = this._getBloomTexture()

    //     // 3) outline 갱신
    //     this.updateOutlineSelection()

    //     // 4) 기본(0)+BLOOM_LAYER로 복원 후 최종 합성
    //     this.camera.layers.set(0)
    //     this.camera.layers.enable(BLOOM_LAYER)
    //     this.finalComposer.render()
    //   }
    render(_dt: number) {
        // BLOOM_LAYER만
        const prevScene = (this.renderScene as any).scene;
        const prevBg = this.scene.background;
        (this.renderScene as any).scene = this.scene; // 그대로
        this.scene.background = null;                 // ✅ 블룸 시 배경 제거

        this.camera.layers.set(BLOOM_LAYER);
        this.bloomComposer.render();

        // 최신 블룸 텍스처 전달
        (this._finalPass.material as THREE.ShaderMaterial).uniforms.postBloomTexture.value = this._getBloomTexture();

        // 복원
        (this.renderScene as any).scene = prevScene;
        this.scene.background = prevBg;

        // 최종 합성 (기본 0 + BLOOM_LAYER)
        this.camera.layers.set(0);
        this.camera.layers.enable(BLOOM_LAYER);
        this.updateOutlineSelection(); // 필요 시만
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
        const c: any = this.bloomComposer
        return c.readBuffer?.texture || c.renderTarget2?.texture || c.writeBuffer?.texture
    }
}
