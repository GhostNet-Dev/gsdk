import * as THREE from 'three'
import { IPostPro } from './postpro'
import IEventController from '@Glibs/interface/ievent'

// ⬇️ 추가 import
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass'
import { EventTypes } from '@Glibs/types/globaltypes'

export class Postpro3 implements IPostPro {
  private composer: EffectComposer
  private renderPass: RenderPass
  private outlinePass: OutlinePass
  private smaaPass: SMAAPass

  // occlusion 검사용
  private raycaster = new THREE.Raycaster()
  private tmp = new THREE.Vector3()

  // 외곽선 대상/가림 장애물
  private outlineTargets: THREE.Object3D[] = []
  private occlusionObstacles: THREE.Object3D[] = []

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer,
    private eventCtrl: IEventController,
  ) {
    // 화면이 어둡지 않게 (원한다면 조정)
    this.renderer.toneMapping = THREE.ReinhardToneMapping
    this.renderer.toneMappingExposure = 1.0

    // ---- Post chain ----
    this.composer = new EffectComposer(this.renderer)
    this.composer.setPixelRatio(this.renderer.getPixelRatio())

    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    )
    // 기본 스타일(원하면 아래 값 바꾸세요)
    this.outlinePass.edgeStrength = 4.0
    this.outlinePass.edgeThickness = 1.5
    this.outlinePass.pulsePeriod = 0
    this.outlinePass.visibleEdgeColor.set(0x5ad1ff)
    this.outlinePass.hiddenEdgeColor.set(0x5ad1ff)
    this.outlinePass.selectedObjects = [] // 처음엔 비활성
    this.composer.addPass(this.outlinePass)

    // 가장 마지막에 SMAA(선택)
    this.smaaPass = new SMAAPass(
      window.innerWidth * this.renderer.getPixelRatio(),
      window.innerHeight * this.renderer.getPixelRatio()
    )
    this.composer.addPass(this.smaaPass)

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

  // ----- 공개 유틸(인터페이스 외 추가 메서드) -----
  /** 외곽선 표시 대상(플레이어 등) 지정 */
  public setOutlineTargets(targets: THREE.Object3D[]) {
    this.outlineTargets = targets ?? []
  }
  /** 가림을 유발할 수 있는 장애물 목록 지정(성능 위해 전체 scene 대신 후보만) */
  public setOcclusionObstacles(obstacles: THREE.Object3D[]) {
    this.occlusionObstacles = obstacles ?? []
  }
  /** 외곽선 스타일 변경 */
  public setOutlineStyle(opts: Partial<{
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

  // ----- IPostPro 구현 -----
  resize(): void {
    const w = window.innerWidth, h = window.innerHeight
    this.composer.setSize(w, h)
    this.outlinePass.setSize(w, h)
  }

  setGlow(_: THREE.Mesh) { /* noop (이 클래스는 outline만 담당) */ }
  setNonGlow(_: THREE.Mesh | THREE.Group) { /* noop */ }

  render(_delta: number) {
    // 가려진 타겟만 outline에 넣기
    this.updateOutlineSelection()
    this.composer.render()
  }

  // ----- 내부 로직 -----
  private isOccluded(target: THREE.Object3D): boolean {
    if (!this.occlusionObstacles.length) return false

    const targetPos = target.getWorldPosition(this.tmp)
    const camPos = (this.camera as THREE.Camera).position
    const dir = new THREE.Vector3().subVectors(targetPos, camPos).normalize()

    this.raycaster.set(camPos, dir)
    const hits = this.raycaster.intersectObjects(this.occlusionObstacles, true)
    if (!hits.length) return false

    const distToTarget = camPos.distanceTo(targetPos)
    // 첫 충돌체가 타겟보다 카메라에 더 가깝다면 가려진 것
    return hits[0].distance < distToTarget
  }

  private updateOutlineSelection() {
    if (!this.outlineTargets.length) {
      this.outlinePass.selectedObjects = []
      return
    }
    const occluded: THREE.Object3D[] = []
    for (const t of this.outlineTargets) {
      if (this.isOccluded(t)) occluded.push(t)
    }
    this.outlinePass.selectedObjects = occluded
  }
}
