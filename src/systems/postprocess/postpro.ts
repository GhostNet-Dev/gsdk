import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader'
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { ToonShader1 } from 'three/examples/jsm/shaders/ToonShader'
import IEventController from '@Glibs/interface/ievent'
import { EventTypes } from '@Glibs/types/globaltypes'

export interface IPostPro {
  setGlow(target: THREE.Mesh | THREE.Group): void
  setNonGlow(target: THREE.Mesh | THREE.Group): void
  /** 외곽선(가림 감지) 대상 설정 */
  // setOutlineTargets(targets: (THREE.Object3D)[]): void
  // /** 가림을 일으킬 수 있는 장애물(레이캐스트 충돌 검사 대상) 등록 */
  // setOcclusionObstacles(obstacles: THREE.Object3D[]): void
  // /** 외곽선 스타일(색/두께 등) */
  // setOutlineStyle(opts: Partial<{
  //   edgeStrength: number
  //   edgeThickness: number
  //   visibleEdgeColor: THREE.ColorRepresentation
  //   hiddenEdgeColor: THREE.ColorRepresentation
  //   pulsePeriod: number
  // }>): void

  render(delta: number): void
  resize(): void
}

export class Postpro implements IPostPro {
  renderScene = new RenderPass(this.scene, this.camera)
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    .5, .01, .9
  )
  rendertarget1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.NoColorSpace,
    samples: 4
  })
  bloomComposer: EffectComposer
  finalComposer: EffectComposer

  // ---------- Outline 관련 ----------
  private outlinePass: OutlinePass
  private outlineTargets: THREE.Object3D[] = []
  private occlusionObstacles: THREE.Object3D[] = []
  private raycaster = new THREE.Raycaster()
  private _tmp = new THREE.Vector3()

  gu = {
    time: { value: 0 },
    globalBloom: { value: 0 }
  }
  param = {
    mulR: 1.0,
    mulG: 1.0,
    mulB: 1.0,
    powR: 0.6,
    powG: 0.6,
    powB: 0.6,
  }
  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer,
    eventCtrl: IEventController
  ) {
    // ✔ 밝게 보기 좋은 톤매핑(원 코드 유지)
    this.renderer.toneMapping = THREE.ReinhardToneMapping
    this.renderer.toneMappingExposure = 1.5

    // ---- Bloom pass chain (offscreen) ----
    this.bloomComposer = new EffectComposer(this.renderer, this.rendertarget1)
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.setPixelRatio(this.renderer.getPixelRatio())
    this.bloomComposer.addPass(this.renderScene)
    this.bloomComposer.addPass(this.bloomPass)
    //this.bloomComposer.addPass(new ShaderPass(FXAAShader))
    this.bloomComposer.addPass(new SMAAPass(
      window.innerWidth * this.renderer.getPixelRatio(),
      window.innerHeight * this.renderer.getPixelRatio()))
    const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
    colorCorrectionPass.uniforms['powRGB'].value = new THREE.Vector3(this.param.powR, this.param.powG, this.param.powB);  // 밝기 조절
    colorCorrectionPass.uniforms['mulRGB'].value = new THREE.Vector3(this.param.mulR, this.param.mulG, this.param.mulB);
    //this.bloomComposer.addPass(colorCorrectionPass)

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
        },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main(){
            gl_FragColor = texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv);
          }
        `,
      }),
      'baseTexture'
    )
    finalPass.needsSwap = true

    const target2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.NoColorSpace,
      samples: 4
    })

    this.finalComposer = new EffectComposer(this.renderer, target2)
    this.finalComposer.setPixelRatio(this.renderer.getPixelRatio())
    this.finalComposer.addPass(this.renderScene)     // 1) 기본 장면 렌더
    this.finalComposer.addPass(finalPass)            // 2) bloom 합성
    this.finalComposer.addPass(colorCorrectionPass)  // 3) 컬러 보정

    // ---- OutlinePass 추가 (컬러보정 후, SMAA 전) ----
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    )
    // 기본 스타일 (원하면 setOutlineStyle로 바꾸세요)
    this.outlinePass.edgeStrength = 4.0
    this.outlinePass.edgeThickness = 1.5
    this.outlinePass.pulsePeriod = 0.0
    this.outlinePass.visibleEdgeColor.set(0xff3a3a)
    this.outlinePass.hiddenEdgeColor.set(0xff3a3a)
    this.outlinePass.selectedObjects = [] // 처음엔 비활성처럼
    this.finalComposer.addPass(this.outlinePass)

    // **SMAA는 가장 마지막**
    this.finalComposer.addPass(new SMAAPass(
      window.innerWidth * this.renderer.getPixelRatio(),
      window.innerHeight * this.renderer.getPixelRatio()
    ))

    // 이벤트 훅 유지
    eventCtrl.RegisterEventListener(EventTypes.SetNonGlow, (target: THREE.Mesh | THREE.Group) => {
      this.setNonGlow(target)
    })
    eventCtrl.RegisterEventListener(EventTypes.Outline, (target: THREE.Mesh | THREE.Group) => {
      const index = this.outlineTargets.findIndex(user => user.uuid === target.uuid);

      // 2. 만약 해당 ID를 가진 객체가 배열에 있다면 (index가 -1이 아니면)
      if (index !== -1) {
        // 스프레드 문법(...)을 사용하여 해당 객체를 제외한 새로운 배열을 만듭니다.
        // slice(0, index)는 제거할 객체 앞까지의 배열을,
        // slice(index + 1)은 제거할 객체 뒤부터의 배열을 만듭니다.
        this.outlineTargets = [...this.outlineTargets.slice(0, index), ...this.outlineTargets.slice(index + 1)];
      }
      // 3. 만약 해당 ID를 가진 객체가 배열에 없다면 (index가 -1이면)
      else {
        // 새로운 사용자 객체를 추가한 배열을 반환합니다.
        this.outlineTargets = [...this.outlineTargets, target];
      }
    })
    eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (obj: THREE.Object3D) => {
      this.occlusionObstacles.push(obj)
    })
  }

  // ---------- Public APIs ----------
  setOutlineTargets(targets: THREE.Object3D[]) {
    this.outlineTargets = targets ?? []
  }

  setOcclusionObstacles(obstacles: THREE.Object3D[]) {
    this.occlusionObstacles = obstacles ?? []
  }

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
    this.bloomComposer.setSize(window.innerWidth, window.innerHeight)
    this.finalComposer.setSize(window.innerWidth, window.innerHeight)
    this.outlinePass.setSize(window.innerWidth, window.innerHeight)
  }
  setGlow(target: THREE.Mesh) {
    // (원 구현의 bloom 마스크/레이어 전략을 쓰고 있다면 여기에 추가)
  }
  setNonGlow(target: THREE.Mesh | THREE.Group) {
    target.traverse((child: any) => {
      if (child.isMesh) {
        const originalOnBeforeCompile = child.material.onBeforeCompile;
        child.material.onBeforeCompile = (shader: any) => {
          if (originalOnBeforeCompile) originalOnBeforeCompile(shader)
          if (shader.fragmentShader.includes('// alreadyhasapply')) return

          shader.uniforms.globalBloom = this.gu.globalBloom
          shader.fragmentShader = `
            // alreadyhasapply
            uniform float globalBloom;
            ${shader.fragmentShader}
            `.replace(
            `#include <dithering_fragment>`,
            `#include <dithering_fragment>
             gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), globalBloom);
              `
          )
        }
      }
    })
  }

  // ---------- 내부: 가림(occlusion) 체크 ----------
  /** 대상이 카메라와의 직선 경로에서 obstacle에 의해 가려졌는지 확인 */
  private isOccluded(target: THREE.Object3D): boolean {
    if (!this.occlusionObstacles || this.occlusionObstacles.length === 0) return false

    // 타겟의 월드 위치
    const targetPos = target.getWorldPosition(this._tmp)
    targetPos.y += 1
    const camPos = (this.camera as THREE.Camera).position
    const dir = new THREE.Vector3().subVectors(targetPos, camPos).normalize()

    this.raycaster.set(camPos, dir)
    // 장애물들만 교차 검사 (scene 전체가 아닌)
    const hits = this.raycaster.intersectObjects(this.occlusionObstacles, true)
    if (hits.length === 0) return false

    const distToTarget = camPos.distanceTo(targetPos)
    // 첫 히트가 타겟보다 가까우면 가려진 것
    return hits[0].distance < distToTarget
  }

  /** OutlinePass에 "가려진" 타겟만 넣는다 */
  private updateOutlineSelection() {
    if (!this.outlineTargets || this.outlineTargets.length === 0) {
      this.outlinePass.selectedObjects = []
      return
    }

    const occluded: THREE.Object3D[] = []
    for (const t of this.outlineTargets) {
      if (this.isOccluded(t)) occluded.push(t)
    }
    this.outlinePass.selectedObjects = occluded
  }

  render(delta: number) {
    // Bloom chain
    this.gu.globalBloom.value = 1
    this.bloomComposer.render()
    this.gu.globalBloom.value = 0

    // Outline 대상 업데이트(가려졌을 때만 표시)
    this.updateOutlineSelection()

    // 최종 합성 렌더
    this.finalComposer.render()
  }
}

