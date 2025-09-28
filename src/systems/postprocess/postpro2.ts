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

// -------------------- Pastel Color Grade Shader (linear-space) --------------------
const PastelColorGradeShader = {
    uniforms: {
        tDiffuse: { value: null },   // input (linear)
        saturation: { value: 0.90 },   // < 1.0 → 살짝 탈채
        contrast: { value: 0.95 },   // < 1.0 → 소프트 콘트라스트
        lift: { value: 0.04 },   // 그림자 올리기 (파스텔 밝음)
        gammaVal: { value: 1.10 },   // 감마 >1 → 중간톤 완화
        gain: { value: 0.95 },   // 하이라이트 살짝 내리기
        warmth: { value: 0.03 },   // +R, -B
        highlightDesat: { value: 0.35 },   // 밝을수록 채도 감소
        tint: { value: new THREE.Vector3(1.00, 0.85, 0.80) }, // 살구빛
        tintAmount: { value: 0.12 }    // 틴트 가중
    },
    vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
    fragmentShader: `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;

    uniform float saturation;
    uniform float contrast;
    uniform float lift;
    uniform float gammaVal;
    uniform float gain;
    uniform float warmth;
    uniform float highlightDesat;
    uniform vec3  tint;
    uniform float tintAmount;

    // Rec.709 luma
    float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

    vec3 applySaturation(vec3 c, float s){
      float g = luma(c);
      return mix(vec3(g), c, s);
    }

    vec3 applyContrast(vec3 c, float k){
      // 소프트 콘트라스트: 회색(0.5) 기준
      return mix(vec3(0.5), c, k);
    }

    vec3 liftGammaGain(vec3 c, float l, float g, float gn){
      // lift: +, gamma: pow, gain: *
      c = c + l;
      c = pow(max(c, 0.0), vec3(1.0 / g));
      c = c * gn;
      return c;
    }

    vec3 applyWarmth(vec3 c, float w){
      // 간단한 화이트밸런스: +R, -B
      c.r += w;
      c.b -= w;
      return max(c, 0.0);
    }

    vec3 highlightDesaturate(vec3 c, float amount){
      float g = luma(c);
      // 밝을수록 더 많이 탈채 (곡선: g^2)
      float f = clamp(g*g * amount, 0.0, 1.0);
      return mix(c, vec3(g), f);
    }

    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb; // linear

      // 1) 소프트 콘트라스트 & 리프트/감마/게인
      col = applyContrast(col, contrast);
      col = liftGammaGain(col, lift, gammaVal, gain);

      // 2) 살짝 웜톤
      col = applyWarmth(col, warmth);

      // 3) 전체 채도 약간 감소
      col = applySaturation(col, saturation);

      // 4) 하이라이트 탈채
      col = highlightDesaturate(col, highlightDesat);

      // 5) 파스텔 틴트 섞기
      col = mix(col, tint, tintAmount);

      gl_FragColor = vec4(max(col, 0.0), 1.0); // 인코딩/톤매핑은 renderer에서
    }
  `
}

// -----------------------------------------------------------------------------

export class Postpro2 implements IPostPro {
    private renderScene = new RenderPass(this.scene, this.camera)

    // Bloom: 번짐 완화 & 부드러운 확산
    private bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.1,  // strength ↓
        0.55, // radius ↑
        0.30  // threshold ↑
    )

    private bloomComposer: EffectComposer
    private finalComposer: EffectComposer
    private _finalPass!: ShaderPass
    private _pastelPass!: ShaderPass

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

    private _darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    private _matCache = new Map<string, THREE.Material>()

    constructor(
        private scene: THREE.Scene,
        private camera: THREE.Camera,
        private renderer: THREE.WebGLRenderer,
        eventCtrl: IEventController
    ) {
        // ── Renderer: Neutral + 낮은 노출 (과한 웜톤 억제)
        this.renderer.toneMapping = THREE.ReinhardToneMapping
        this.renderer.toneMappingExposure = 1.1
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
                useScreenBlend: { value: 1 },   // 0=ADD, 1=SCREEN
                bloomGain: { value: 0.85 } // 살짝 억제
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D postBaseTexture;   // linear
        uniform sampler2D postBloomTexture;  // linear
        uniform int   useScreenBlend;
        uniform float bloomGain;

        vec3 screenBlend(vec3 a, vec3 b){
          return 1.0 - (1.0 - a) * (1.0 - b);
        }

        void main(){
          vec3 base  = texture2D(postBaseTexture,  vUv).rgb;
          vec3 bloom = texture2D(postBloomTexture, vUv).rgb * bloomGain;
          vec3 outc  = (useScreenBlend == 1) ? screenBlend(base, bloom) : (base + bloom);
          gl_FragColor = vec4(outc, 1.0);
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

        // ── Pastel Color Grade Pass (outline까지 포함한 뒤 적용)
        this._pastelPass = new ShaderPass(PastelColorGradeShader as any)
        // 필요시 초깃값 조정: this._pastelPass.uniforms.saturation.value = 0.88;
        const pastel = this._pastelPass.uniforms;
        pastel.saturation.value = 0.96;  // 0.90 → 0.96  (채도 덜 깎기)
        pastel.contrast.value = 1.0;  // 0.95 → 0.99  (거의 원본 대비)
        pastel.lift.value = 0.01;  // 0.04 → 0.01  (그림자 lifting 최소화)
        pastel.gammaVal.value = 1.02;  // 1.10 → 1.02  (감마 완화 → 뿌연 중톤 감소)
        pastel.gain.value = 1.00;  // 0.95 → 1.00  (하이라이트 눌림 해제)
        pastel.warmth.value = 0.03; // 0.03 → 0.015 (웜톤 절반만)
        pastel.highlightDesat.value = 0.15;  // 0.35 → 0.20  (하이라이트 탈채 완화)
        pastel.tint.value.set(1.00, 0.90, 0.86); // (1.00,0.85,0.80) → 살짝 중립화
        pastel.tintAmount.value = 0.06;  // 0.12 → 0.06  (틴트 반감)
        this.finalComposer.addPass(this._pastelPass)

        // ── AA
        if (this._useSMAA) {
            this._smaa1 = new SMAAPass(w, h)
            this._smaa2 = new SMAAPass(w, h)
            this.bloomComposer.addPass(this._smaa1)
            this.finalComposer.addPass(this._smaa2) // AA는 항상 제일 마지막
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
        if (this._useSMAA) { this._smaa1?.setSize(w, h); this._smaa2?.setSize(w, h) }
        else {
            this._fxaa1?.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr))
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

        // 최종 합성 + 아웃라인 + 파스텔 그레이딩 + AA
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
        const c: any = this.bloomComposer
        return c.readBuffer?.texture || c.renderTarget2?.texture || c.writeBuffer?.texture
    }
}
