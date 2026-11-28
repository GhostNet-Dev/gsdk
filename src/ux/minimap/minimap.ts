import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { LoopType } from "@Glibs/systems/event/canvas";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { RegisterTargetMsg, TargetKind, UpdateTargetStateMsg } from "@Glibs/systems/targeting/targettypes";
import { GUX, UxLayerIndex } from "../gux";
import { MinimapRegistry } from "./minimapregistry";
import { MinimapRenderer } from "./minimaprenderer";
import {
  MINIMAP_DEFAULTS, MinimapAnchor, MinimapButtons, MinimapMarkerParam, MinimapOptions, MinimapOrientation,
  MinimapPlane, MinimapRuntimeOptions, MinimapShape, MinimapTargetInfo, MinimapWorldBounds, projectToPlane, wrapAngle,
} from "./minimaptypes";

type FollowTarget = THREE.Vector3 | THREE.Object3D
type TargetRec = MinimapTargetInfo & { alive: boolean }

const TARGET_PREFIX = "tgt:"
const TRACKED_KINDS: ReadonlySet<TargetKind> = new Set<TargetKind>(["unit", "structure", "ship"])

interface ResolvedOptions {
  mount: "fixed" | "embedded"
  shape: MinimapShape
  size: number | "fill"
  anchor: MinimapAnchor
  offset: { x: number, y: number }
  align: "start" | "center" | "end"
  plane: MinimapPlane
  zoom: number
  minZoom: number
  maxZoom: number
  zoomStep: number
  worldBounds?: MinimapWorldBounds
  updateHz: number
  moveEpsilon: number
  orientation: MinimapOrientation
  rotateEpsilon: number
  northLabel: boolean
  buttons: Required<MinimapButtons>
  background: string
}

/**
 * 범용 미니맵. 이벤트(EventTypes.Minimap*)로 마커를 받고, targetStyle이 있으면 Target 이벤트를 직접 추적한다.
 * 이벤트가 브로드캐스트이므로 인스턴스는 동시에 하나만 존재해야 한다.
 */
export class Minimap extends GUX implements ILoop {
  LoopId = 0
  Dom = document.createElement("div")

  /** 디버그/검증용 */
  readonly registry: MinimapRegistry
  readonly renderer = new MinimapRenderer()

  private opts: ResolvedOptions
  private readonly mount: "fixed" | "embedded"
  private readonly parent: HTMLElement
  private readonly onVisibleChanged?: (v: boolean) => void
  private readonly onOrientationChanged?: (o: MinimapOrientation) => void
  private readonly targetStyle?: MinimapOptions["targetStyle"]
  private readonly followTargetId?: string

  private view = document.createElement("div")
  private northEl = document.createElement("span")
  private btnBox = document.createElement("div")
  private compassEl?: SVGElement
  private resizeObs?: ResizeObserver

  private centerU = 0
  private centerV = 0
  private rot = 0
  private acc = 0
  private viewDirty = true
  private wasHidden = false
  private disposed = false

  private followTarget?: FollowTarget
  private followHeading?: () => number
  private followEnabled = true

  private tracking = false
  private targetSystem?: TargetRegistrySystem
  private readonly targets = new Map<string, TargetRec>()
  /**
   * 시드 시점에 씬에 붙어 있지 않던 Target. GameCenter는 모드 Init이 끝난 뒤 Physics(플레이어 등)를
   * scene.add 하므로 HUD 표시(Init 내부) 시점엔 미부착일 수 있다. 틱마다 부착을 확인해 등록한다.
   * detach된 다른 씬의 잔여 건물은 계속 여기 남아 표시되지 않는다.
   */
  private readonly pendingTargets = new Map<string, TargetRec>()

  private readonly tmpV = new THREE.Vector3()
  private readonly tmpP = { u: 0, v: 0 }

  constructor(private eventCtrl: IEventController, options: MinimapOptions = {}) {
    super()
    const d = MINIMAP_DEFAULTS
    this.mount = options.mount ?? d.mount
    this.parent = options.parent ?? document.body
    this.onVisibleChanged = options.onVisibleChanged
    this.onOrientationChanged = options.onOrientationChanged
    this.targetStyle = options.targetStyle
    this.followTargetId = options.followTargetId
    this.opts = {
      mount: this.mount,
      shape: options.shape ?? d.shape,
      size: options.size ?? d.size,
      anchor: options.anchor ?? d.anchor,
      offset: options.offset ?? { ...d.offset },
      align: options.align ?? d.align,
      plane: options.plane ?? d.plane,
      zoom: options.zoom ?? d.zoom,
      minZoom: options.minZoom ?? d.minZoom,
      maxZoom: options.maxZoom ?? d.maxZoom,
      zoomStep: options.zoomStep ?? d.zoomStep,
      worldBounds: options.worldBounds,
      updateHz: options.updateHz ?? d.updateHz,
      moveEpsilon: options.moveEpsilon ?? d.moveEpsilon,
      orientation: options.orientation ?? d.orientation,
      rotateEpsilon: options.rotateEpsilon ?? d.rotateEpsilon,
      northLabel: options.northLabel ?? d.northLabel,
      buttons: resolveButtons(options.buttons),
      background: options.background ?? d.background,
    }
    this.opts.zoom = clamp(this.opts.zoom, this.opts.minZoom, this.opts.maxZoom)
    this.registry = new MinimapRegistry(this.opts.plane)
    this.centerToBounds()

    this.RenderHTML()

    const ec = this.eventCtrl
    ec.RegisterEventListener(EventTypes.MinimapRegister, this.onRegister)
    ec.RegisterEventListener(EventTypes.MinimapUnregister, this.onUnregister)
    ec.RegisterEventListener(EventTypes.MinimapUpdate, this.onUpdate)
    ec.RegisterEventListener(EventTypes.MinimapClear, this.onClear)
    ec.RegisterEventListener(EventTypes.MinimapConfig, this.onConfig)
    ec.RegisterEventListener(EventTypes.MinimapFollow, this.onFollow)
    ec.RegisterEventListener(EventTypes.MinimapVisible, this.onVisible)
    ec.RegisterEventListener(EventTypes.SceneClear, this.onClear)
    if (this.targetStyle) {
      ec.RegisterEventListener(EventTypes.RegisterTargetSystem, this.onTargetSystem)
      ec.RegisterEventListener(EventTypes.RegisterTarget, this.onRegisterTarget)
      ec.RegisterEventListener(EventTypes.DeregisterTarget, this.onDeregisterTarget)
      ec.RegisterEventListener(EventTypes.UpdateTargetState, this.onUpdateTargetState)
      ec.RegisterEventListener(EventTypes.UpdateTargetObject, this.onUpdateTargetObject)
      ec.SendEventMessage(EventTypes.RequestTargetSystem)
    }
    ec.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems)
  }

  // ───────────────────────────── GUX ─────────────────────────────

  RenderHTML(): void {
    this.applyDynamicStyle("gnx-minimap-css", CSS)
    this.Dom.className = "gnx-minimap"
    this.view.className = "gnx-minimap-view"
    this.northEl.className = "gnx-minimap-north"
    this.northEl.textContent = "N"
    this.btnBox.className = "gnx-minimap-btns"
    this.view.appendChild(this.renderer.canvas)
    this.view.appendChild(this.northEl)
    this.Dom.appendChild(this.view)
    this.Dom.appendChild(this.btnBox)

    // 게임 입력(카메라/선택)과 분리
    for (const t of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "touchstart"]) {
      this.Dom.addEventListener(t, stopEvent)
    }
    this.Dom.addEventListener("wheel", this.onWheel, { passive: false })

    this.buildButtons()
    this.applyLayout()
    if (this.mount === "fixed") this.parent.appendChild(this.Dom)
  }

  Show(): void {
    if (this.visible) return
    this.visible = true
    this.Dom.style.display = ""
    this.onVisibleChanged?.(true)
  }

  Hide(): void {
    if (!this.visible) return
    this.visible = false
    this.Dom.style.display = "none"
    this.onVisibleChanged?.(false)
  }

  onLayout(_slotIndex: number, _total: number): void {
    if (this.opts.size === "fill") this.measureFill()
  }

  // ───────────────────────────── 공개 API ─────────────────────────────

  setOptions(partial: MinimapRuntimeOptions) {
    if (!partial || this.disposed) return
    const o = this.opts
    if (partial.shape !== undefined) o.shape = partial.shape
    if (partial.size !== undefined) o.size = partial.size
    if (partial.anchor !== undefined) o.anchor = partial.anchor
    if (partial.offset !== undefined) o.offset = { ...partial.offset }
    if (partial.align !== undefined) o.align = partial.align
    if (partial.minZoom !== undefined) o.minZoom = partial.minZoom
    if (partial.maxZoom !== undefined) o.maxZoom = partial.maxZoom
    if (partial.zoomStep !== undefined) o.zoomStep = partial.zoomStep
    if (partial.updateHz !== undefined) o.updateHz = Math.max(1, partial.updateHz)
    if (partial.moveEpsilon !== undefined) o.moveEpsilon = partial.moveEpsilon
    if (partial.rotateEpsilon !== undefined) o.rotateEpsilon = partial.rotateEpsilon
    if (partial.northLabel !== undefined) o.northLabel = partial.northLabel
    if (partial.background !== undefined) o.background = partial.background
    if (partial.buttons !== undefined) {
      o.buttons = resolveButtons({ ...o.buttons, ...partial.buttons })
      this.buildButtons()
    }
    if (partial.plane !== undefined && partial.plane !== o.plane) {
      o.plane = partial.plane
      this.registry.setPlane(o.plane)
    }
    if ("worldBounds" in partial) {
      o.worldBounds = partial.worldBounds ? { ...partial.worldBounds } : undefined
      if (!this.isFollowing()) this.centerToBounds()
    }
    o.zoom = clamp(partial.zoom ?? o.zoom, o.minZoom, o.maxZoom)
    this.applyLayout()
    if (partial.orientation !== undefined) this.setOrientation(partial.orientation)
    this.markAllDirty()
  }

  setZoom(z: number) {
    const next = clamp(z, this.opts.minZoom, this.opts.maxZoom)
    if (next === this.opts.zoom) return
    this.opts.zoom = next
    this.viewDirty = true
  }

  get zoom() { return this.opts.zoom }
  get orientation() { return this.opts.orientation }

  /** target 미지정 = 현재 중심 고정. heading = heading 모드 회전 소스 */
  setFollow(target?: FollowTarget, heading?: () => number) {
    this.followTarget = target
    this.followHeading = target ? heading : undefined
    if (target) this.followEnabled = true
    this.viewDirty = true
    this.updateCenterFromFollow()
    this.updateRotationFromFollow()
    this.updateOrientUi()
  }

  setOrientation(o: MinimapOrientation) {
    if (o === this.opts.orientation) return
    this.opts.orientation = o
    this.renderer.invalidateStatic() // 뷰 캐시 모드면 캐시 크기(대각선) 재계산
    this.updateRotationFromFollow()
    this.updateOrientUi()
    this.viewDirty = true
    this.onOrientationChanged?.(o)
  }

  register(param: MinimapMarkerParam | MinimapMarkerParam[]) {
    if (Array.isArray(param)) param.forEach((p) => this.registry.add(p))
    else this.registry.add(param)
  }

  unregister(id: string | string[]) {
    if (Array.isArray(id)) id.forEach((i) => this.registry.remove(i))
    else this.registry.remove(id)
  }

  /** 마커만 제거. 옵션은 유지 */
  clear() {
    this.registry.clear()
    this.targets.clear()
    this.pendingTargets.clear()
  }

  /** Clear → Target 시드 → 이벤트 반영 시작 */
  beginTracking() {
    if (this.disposed) return
    this.clear()
    if (this.targetStyle) {
      if (!this.targetSystem) this.eventCtrl.SendEventMessage(EventTypes.RequestTargetSystem)
      const sys = this.targetSystem
      if (sys) {
        for (const rec of sys.getTargets({ aliveOnly: true })) {
          if (!TRACKED_KINDS.has(rec.kind)) continue
          const t: TargetRec = {
            id: rec.id, teamId: rec.teamId, factionId: rec.factionId, kind: rec.kind, object: rec.object, alive: true,
          }
          if (isAttachedToScene(rec.object)) this.applyTarget(t)
          else this.pendingTargets.set(t.id, t)
        }
      }
    }
    this.tracking = true
  }

  /** 이벤트 반영 중단 → follow 해제 → Clear → worldBounds 초기화 */
  endTracking() {
    this.tracking = false
    this.setFollow(undefined)
    this.clear()
    this.setOptions({ worldBounds: undefined })
  }

  get isTracking() { return this.tracking }

  Dispose() {
    if (this.disposed) return
    this.disposed = true
    const ec = this.eventCtrl
    ec.DeregisterEventListener(EventTypes.MinimapRegister, this.onRegister)
    ec.DeregisterEventListener(EventTypes.MinimapUnregister, this.onUnregister)
    ec.DeregisterEventListener(EventTypes.MinimapUpdate, this.onUpdate)
    ec.DeregisterEventListener(EventTypes.MinimapClear, this.onClear)
    ec.DeregisterEventListener(EventTypes.MinimapConfig, this.onConfig)
    ec.DeregisterEventListener(EventTypes.MinimapFollow, this.onFollow)
    ec.DeregisterEventListener(EventTypes.MinimapVisible, this.onVisible)
    ec.DeregisterEventListener(EventTypes.SceneClear, this.onClear)
    if (this.targetStyle) {
      ec.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.onTargetSystem)
      ec.DeregisterEventListener(EventTypes.RegisterTarget, this.onRegisterTarget)
      ec.DeregisterEventListener(EventTypes.DeregisterTarget, this.onDeregisterTarget)
      ec.DeregisterEventListener(EventTypes.UpdateTargetState, this.onUpdateTargetState)
      ec.DeregisterEventListener(EventTypes.UpdateTargetObject, this.onUpdateTargetObject)
    }
    ec.SendEventMessage(EventTypes.DeregisterLoop, this)
    this.resizeObs?.disconnect()
    this.resizeObs = undefined
    this.tracking = false
    this.followTarget = undefined
    this.followHeading = undefined
    this.registry.clear()
    this.targets.clear()
    this.pendingTargets.clear()
    this.Dom.remove()
  }

  // ───────────────────────────── 루프 ─────────────────────────────

  update(delta: number): void {
    if (this.disposed) return
    if (!this.visible || this.isHostHidden()) {
      this.wasHidden = true
      return
    }
    if (this.wasHidden) {
      this.wasHidden = false
      if (this.opts.size === "fill") this.measureFill()
      this.markAllDirty()
    }
    const reg = this.registry
    if (reg.size === 0 && this.pendingTargets.size === 0 && !reg.staticDirty && !reg.dynamicDirty && !this.viewDirty) return

    const interval = 1 / this.opts.updateHz
    this.acc += delta
    if (this.acc >= interval) {
      this.acc %= interval
      if (this.tracking && this.pendingTargets.size > 0) this.flushPendingTargets()
      reg.pollDynamic(this.opts.moveEpsilon, this.opts.rotateEpsilon)
    }
    if (this.isFollowing()) {
      if (this.updateCenterFromFollow()) this.viewDirty = true
      if (this.updateRotationFromFollow()) this.viewDirty = true
    }
    if (reg.staticDirty || reg.dynamicDirty || this.viewDirty) {
      this.renderer.render(reg, {
        shape: this.opts.shape,
        orientation: this.opts.orientation,
        zoom: this.opts.zoom,
        centerU: this.centerU,
        centerV: this.centerV,
        rot: this.rot,
        worldBounds: this.opts.worldBounds,
        background: this.opts.background,
      })
      reg.staticDirty = reg.dynamicDirty = this.viewDirty = false
    }
  }

  // ───────────────────────────── 내부 ─────────────────────────────

  private isFollowing() {
    return this.followEnabled && this.followTarget !== undefined
  }

  private markAllDirty() {
    this.registry.staticDirty = this.registry.dynamicDirty = true
    this.renderer.invalidateStatic()
    this.viewDirty = true
  }

  private isHostHidden(): boolean {
    if (!this.Dom.isConnected) return true
    // offsetParent는 position:fixed 요소에서 항상 null이므로 사용하지 않는다
    return this.Dom.getClientRects().length === 0
  }

  private centerToBounds() {
    const b = this.opts.worldBounds
    if (!b) return
    this.centerU = (b.minU + b.maxU) / 2
    this.centerV = (b.minV + b.maxV) / 2
    this.viewDirty = true
  }

  private updateCenterFromFollow(): boolean {
    const t = this.followTarget
    if (!t || !this.followEnabled) return false
    const pos = t instanceof THREE.Object3D ? t.getWorldPosition(this.tmpV) : t
    const p = projectToPlane(pos, this.opts.plane, this.tmpP)
    // 0.1 css px 미만 이동은 무시 (정지 시 렌더 0회)
    const thr = 0.1 / this.opts.zoom
    if (Math.abs(p.u - this.centerU) <= thr && Math.abs(p.v - this.centerV) <= thr) return false
    this.centerU = p.u
    this.centerV = p.v
    return true
  }

  /** heading 모드에서 follow 대상의 방위가 화면 위가 되도록 rot 계산 */
  private updateRotationFromFollow(): boolean {
    const next = (this.opts.orientation === "heading" && this.isFollowing() && this.followHeading)
      ? wrapAngle(-this.followHeading())
      : 0
    const d = wrapAngle(next - this.rot)
    // 폴백(next=0)은 epsilon과 무관하게 정확히 0으로 스냅
    if (d === 0 || (next !== 0 && Math.abs(d) <= this.opts.rotateEpsilon)) {
      if (next === 0 && this.rot !== 0) { this.rot = 0; this.updateOrientUi(); return true }
      return false
    }
    this.rot = next
    this.updateOrientUi()
    return true
  }

  private updateOrientUi() {
    const o = this.opts.orientation
    this.Dom.dataset.orient = o
    const fallback = o === "heading" && !(this.isFollowing() && this.followHeading)
    if (fallback) this.Dom.dataset.fallback = ""
    else delete this.Dom.dataset.fallback
    if (this.isFollowing()) this.Dom.dataset.following = ""
    else delete this.Dom.dataset.following
    if (this.compassEl) this.compassEl.style.transform = `rotate(${this.rot}rad)`

    const showN = o === "heading" && this.opts.northLabel && !fallback
    this.northEl.style.display = showN ? "block" : "none"
    if (showN) {
      const r = Math.max(0, this.renderer.width / 2 - 9)
      const x = Math.sin(this.rot) * r
      const y = -Math.cos(this.rot) * r
      this.northEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
    }
  }

  private applyLayout() {
    const o = this.opts
    const st = this.Dom.style
    this.Dom.dataset.mount = this.mount
    this.Dom.dataset.shape = o.shape
    this.Dom.dataset.anchor = o.anchor
    if (this.mount === "fixed") {
      st.position = "fixed"
      st.zIndex = (UxLayerIndex.default + 5).toString()
      st.top = st.bottom = st.left = st.right = ""
      if (o.anchor.startsWith("top")) st.top = `${o.offset.y}px`
      else st.bottom = `${o.offset.y}px`
      if (o.anchor.endsWith("left")) st.left = `${o.offset.x}px`
      else st.right = `${o.offset.x}px`
      st.justifySelf = ""
    } else {
      st.position = "relative"
      st.justifySelf = o.align
    }

    const fill = o.size === "fill" && this.mount === "embedded"
    if (fill) {
      st.width = "100%"
      this.ensureResizeObserver()
      this.measureFill()
    } else {
      this.resizeObs?.disconnect()
      this.resizeObs = undefined
      const px = typeof o.size === "number" ? o.size : MINIMAP_DEFAULTS.size
      st.width = `${px}px`
      this.renderer.setSize(px, px)
    }
    this.updateOrientUi()
  }

  private ensureResizeObserver() {
    if (this.resizeObs || typeof ResizeObserver === "undefined") return
    this.resizeObs = new ResizeObserver(() => this.measureFill())
    this.resizeObs.observe(this.Dom)
  }

  private measureFill() {
    const w = this.Dom.clientWidth
    if (w <= 0) {
      if (this.renderer.width <= 1) this.renderer.setSize(MINIMAP_DEFAULTS.size, MINIMAP_DEFAULTS.size)
      return
    }
    if (Math.abs(w - this.renderer.width) < 1) return
    this.renderer.setSize(w, w)
    this.updateOrientUi()
    this.markAllDirty()
  }

  private buildButtons() {
    this.btnBox.innerHTML = ""
    this.compassEl = undefined
    const b = this.opts.buttons
    const add = (act: string, label: string, title: string, fn: () => void) => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.dataset.act = act
      btn.title = title
      btn.innerHTML = label
      btn.addEventListener("click", (e) => { e.stopPropagation(); fn() })
      this.btnBox.appendChild(btn)
      return btn
    }
    if (b.zoom) {
      add("zoom-in", "＋", "확대", () => this.setZoom(this.opts.zoom * this.opts.zoomStep))
      add("zoom-out", "－", "축소", () => this.setZoom(this.opts.zoom / this.opts.zoomStep))
    }
    if (b.follow) {
      add("follow", "◎", "추적 on/off", () => {
        this.followEnabled = !this.followEnabled
        this.viewDirty = true
        this.updateCenterFromFollow()
        this.updateRotationFromFollow()
        this.updateOrientUi()
      })
    }
    if (b.orientation) {
      const btn = add("orient", COMPASS_SVG, "방향: 북쪽 고정 / 캐릭터 방향",
        () => this.setOrientation(this.opts.orientation === "north" ? "heading" : "north"))
      this.compassEl = btn.querySelector("svg") as SVGElement
    }
    if (b.shapeToggle) {
      add("shape", "◻/○", "모양 전환", () => this.setOptions({ shape: this.opts.shape === "rect" ? "circle" : "rect" }))
    }
    this.btnBox.style.display = this.btnBox.childElementCount > 0 ? "" : "none"
  }

  // ───────────────────────────── Target 추적 ─────────────────────────────

  private flushPendingTargets() {
    for (const [id, rec] of this.pendingTargets) {
      if (!isAttachedToScene(rec.object)) continue
      this.pendingTargets.delete(id)
      this.applyTarget(rec)
    }
  }

  private applyTarget(rec: TargetRec) {
    this.targets.set(rec.id, rec)
    const mid = TARGET_PREFIX + rec.id
    const style = this.targetStyle?.(rec)
    if (!style) {
      this.registry.remove(mid)
      return
    }
    this.registry.add({
      ...style,
      id: mid,
      object: rec.object,
      dynamic: rec.kind !== "structure",
      visible: rec.alive && style.visible !== false,
    })
    if (rec.id === this.followTargetId) this.setFollow(rec.object, style.heading)
  }

  /** 레지스트리가 먼저 처리했으면 그 레코드, 아니면 msg + object 메타 + 이전 값으로 보완 */
  private resolveTarget(msg: RegisterTargetMsg): TargetRec {
    const rec = this.targetSystem?.get(msg.id)
    if (rec && rec.object === msg.object) {
      return { id: rec.id, teamId: rec.teamId, factionId: rec.factionId, kind: rec.kind, object: rec.object, alive: rec.alive }
    }
    const meta = msg.object.userData?.targetMeta as Partial<RegisterTargetMsg> | undefined
    const prev = this.targets.get(msg.id)
    return {
      id: msg.id,
      object: msg.object,
      teamId: msg.teamId ?? meta?.teamId ?? prev?.teamId,
      factionId: msg.factionId ?? meta?.factionId ?? prev?.factionId,
      kind: msg.kind ?? meta?.kind ?? prev?.kind ?? "other",
      alive: msg.alive ?? prev?.alive ?? true,
    }
  }

  private onTargetSystem = (sys: TargetRegistrySystem) => {
    this.targetSystem = sys
  }

  private onRegisterTarget = (msg: RegisterTargetMsg) => {
    if (!this.tracking || !msg?.id || !msg.object) return
    this.pendingTargets.delete(msg.id)
    const rec = this.resolveTarget(msg)
    if (!TRACKED_KINDS.has(rec.kind)) {
      this.targets.delete(rec.id)
      this.registry.remove(TARGET_PREFIX + rec.id)
      return
    }
    this.applyTarget(rec)
  }

  private onDeregisterTarget = (id: string) => {
    if (!this.tracking) return
    const rec = this.targets.get(id)
    this.targets.delete(id)
    this.pendingTargets.delete(id)
    this.registry.remove(TARGET_PREFIX + id)
    if (id === this.followTargetId && rec && this.followTarget === rec.object) this.setFollow(undefined)
  }

  private onUpdateTargetState = (msg: UpdateTargetStateMsg) => {
    if (!this.tracking || !msg) return
    const pending = this.pendingTargets.get(msg.id)
    if (pending) {
      if (msg.teamId !== undefined) pending.teamId = msg.teamId
      if (msg.factionId !== undefined) pending.factionId = msg.factionId
      if (msg.alive !== undefined) pending.alive = msg.alive
      return
    }
    const rec = this.targets.get(msg.id)
    if (!rec) return
    const restyle = (msg.teamId !== undefined && msg.teamId !== rec.teamId)
      || (msg.factionId !== undefined && msg.factionId !== rec.factionId)
    if (msg.teamId !== undefined) rec.teamId = msg.teamId
    if (msg.factionId !== undefined) rec.factionId = msg.factionId
    const aliveChanged = msg.alive !== undefined && msg.alive !== rec.alive
    if (msg.alive !== undefined) rec.alive = msg.alive
    if (restyle) {
      this.applyTarget(rec)
    } else if (aliveChanged) {
      this.registry.update(TARGET_PREFIX + rec.id, { visible: rec.alive })
    }
  }

  private onUpdateTargetObject = (id: string, object: THREE.Object3D) => {
    if (!this.tracking || !object) return
    const pending = this.pendingTargets.get(id)
    if (pending) {
      pending.object = object
      return
    }
    const rec = this.targets.get(id)
    if (!rec) return
    rec.object = object
    this.applyTarget(rec) // heading 등 object를 캡처한 스타일 재계산
  }

  // ───────────────────────────── Minimap 이벤트 ─────────────────────────────

  private onRegister = (param: MinimapMarkerParam | MinimapMarkerParam[]) => this.register(param)
  private onUnregister = (id: string | string[]) => this.unregister(id)
  private onUpdate = (id: string, patch: Partial<MinimapMarkerParam>) => { this.registry.update(id, patch) }
  private onClear = () => this.clear()
  private onConfig = (opts: MinimapRuntimeOptions) => this.setOptions(opts)
  private onFollow = (target?: FollowTarget, heading?: () => number) => this.setFollow(target, heading)
  private onVisible = (v: boolean) => { v ? this.Show() : this.Hide() }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.deltaY === 0) return
    this.setZoom(e.deltaY < 0 ? this.opts.zoom * this.opts.zoomStep : this.opts.zoom / this.opts.zoomStep)
  }
}

function resolveButtons(b?: MinimapButtons): Required<MinimapButtons> {
  return {
    zoom: b?.zoom ?? true,
    follow: b?.follow ?? true,
    shapeToggle: b?.shapeToggle ?? false,
    orientation: b?.orientation ?? true,
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function stopEvent(e: Event) {
  e.stopPropagation()
}

function isAttachedToScene(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj
  while (cur) {
    if ((cur as THREE.Scene).isScene) return true
    cur = cur.parent
  }
  return false
}

const COMPASS_SVG = `<svg class="gnx-minimap-compass" viewBox="0 0 16 16" width="14" height="14">
  <polygon points="8,1 11,8 5,8" fill="#e44"/>
  <polygon points="8,15 11,8 5,8" fill="#ddd"/>
</svg>`

const CSS = `
.gnx-minimap {
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: auto;
  font-family: sans-serif;
}
.gnx-minimap-view {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.45);
  line-height: 0;
}
.gnx-minimap[data-shape="circle"] .gnx-minimap-view { border-radius: 50%; }
.gnx-minimap-canvas { display: block; }
.gnx-minimap-north {
  position: absolute;
  left: 50%;
  top: 50%;
  display: none;
  font: bold 11px/1 sans-serif;
  color: #ff6060;
  text-shadow: 0 0 3px #000, 0 0 2px #000;
  pointer-events: none;
}
.gnx-minimap-btns {
  position: absolute;
  right: 4px;
  bottom: 4px;
  display: flex;
  gap: 2px;
  line-height: 1;
}
.gnx-minimap[data-shape="circle"] .gnx-minimap-btns {
  right: auto;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, calc(100% + 4px));
}
.gnx-minimap-btns button {
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #eee;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  cursor: pointer;
}
.gnx-minimap-btns button:hover { background: rgba(60,60,60,0.8); }
.gnx-minimap[data-following] .gnx-minimap-btns button[data-act="follow"] { color: #44ccff; border-color: #44ccff; }
.gnx-minimap[data-orient="heading"] .gnx-minimap-btns button[data-act="orient"] { border-color: #ffcc44; }
.gnx-minimap[data-orient="heading"][data-fallback] .gnx-minimap-btns button[data-act="orient"] { opacity: 0.45; }
.gnx-minimap-compass { transition: transform 0.05s linear; }
`
