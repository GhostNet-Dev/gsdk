import { MinimapEntry, MinimapRegistry } from "./minimapregistry";
import { MINIMAP_DEFAULTS, MinimapIcon, MinimapOrientation, MinimapShape, MinimapWorldBounds } from "./minimaptypes";

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type CacheCanvas = HTMLCanvasElement | OffscreenCanvas

export interface MinimapViewState {
  shape: MinimapShape
  orientation: MinimapOrientation
  zoom: number
  centerU: number
  centerV: number
  /** 지도 회전각(rad, 화면 시계 방향 +). north 모드 / 폴백이면 0 */
  rot: number
  worldBounds?: MinimapWorldBounds
  background: string
}

/** 월드 캐시 최대 크기 (device px) */
const MAX_CACHE_DIM = 4096
const MAX_CACHE_AREA = 4096 * 4096

/**
 * Canvas 2D 렌더러. static 캐시 레이어 + dynamic 레이어 2단 구조.
 * - 월드 캐시: worldBounds 전체를 현재 zoom으로 한 번 그리고, 이동/회전 시 blit만 한다.
 * - 뷰 캐시: worldBounds가 없거나 너무 크면 뷰(heading 모드는 대각선) 크기로 그리고 중심/줌 변경 시 재렌더.
 * 캐시는 항상 north 기준이며 회전은 blit에서만 적용한다.
 */
export class MinimapRenderer {
  readonly canvas = document.createElement("canvas")
  /** 디버그/검증용 카운터 */
  renderCount = 0
  staticRenderCount = 0

  private readonly ctx: CanvasRenderingContext2D
  private cache: CacheCanvas
  private cacheCtx: Ctx2D
  private cssW = 0
  private cssH = 0
  private dpr = 1

  private cacheValid = false
  private cacheMode: "world" | "view" = "view"
  private cacheZoom = NaN
  private cacheCU = NaN
  private cacheCV = NaN
  private cacheBounds?: MinimapWorldBounds

  private readonly drawList: { e: MinimapEntry, isStatic: boolean }[] = []

  constructor() {
    this.canvas.className = "gnx-minimap-canvas"
    this.ctx = this.canvas.getContext("2d")!
    if (typeof OffscreenCanvas !== "undefined") {
      this.cache = new OffscreenCanvas(1, 1)
      this.cacheCtx = this.cache.getContext("2d")!
    } else {
      const c = document.createElement("canvas")
      this.cache = c
      this.cacheCtx = c.getContext("2d")!
    }
  }

  /** css px 크기 지정. 내부 해상도는 dpr 반영 */
  setSize(w: number, h: number, dpr = window.devicePixelRatio || 1) {
    w = Math.max(1, Math.round(w))
    h = Math.max(1, Math.round(h))
    if (w === this.cssW && h === this.cssH && dpr === this.dpr) return
    this.cssW = w
    this.cssH = h
    this.dpr = dpr
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.invalidateStatic()
  }

  get width() { return this.cssW }
  get height() { return this.cssH }

  invalidateStatic() {
    this.cacheValid = false
  }

  render(reg: MinimapRegistry, s: MinimapViewState) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const z = s.zoom * this.dpr

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    if (s.shape === "circle") {
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, Math.min(W, H) / 2, 0, Math.PI * 2)
      ctx.clip()
    }
    ctx.fillStyle = s.background
    ctx.fillRect(0, 0, W, H)

    // 1) static 캐시 blit (회전은 여기서만)
    this.ensureCache(reg, s, z, W, H)
    this.blitCache(s, z, W, H)

    // 2) dynamic 패스: clampToEdge static → dynamic (각각 layer 순)
    const list = this.drawList
    list.length = 0
    reg.staticMap.forEach((e) => { if (e.param.clampToEdge && e.param.visible !== false) list.push({ e, isStatic: true }) })
    reg.dynamicMap.forEach((e) => { if (e.param.visible !== false) list.push({ e, isStatic: false }) })
    list.sort((a, b) => (a.isStatic === b.isStatic)
      ? (a.e.param.layer ?? 0) - (b.e.param.layer ?? 0)
      : (a.isStatic ? -1 : 1))

    const cos = Math.cos(s.rot)
    const sin = Math.sin(s.rot)
    const hw = W / 2
    const hh = H / 2
    const radius = Math.min(W, H) / 2
    for (const { e, isStatic } of list) {
      const p = e.param
      const size = (p.size ?? MINIMAP_DEFAULTS.markerSize) * this.dpr
      const dx = (e.u - s.centerU) * z
      const dy = (e.v - s.centerV) * z
      let ox = s.rot === 0 ? dx : dx * cos - dy * sin
      let oy = s.rot === 0 ? dy : dx * sin + dy * cos

      let inside: boolean
      if (s.shape === "circle") {
        inside = ox * ox + oy * oy <= (radius + size) * (radius + size)
      } else {
        inside = Math.abs(ox) <= hw + size && Math.abs(oy) <= hh + size
      }
      if (!inside) {
        if (!p.clampToEdge) continue
        const m = size + 1
        if (s.shape === "circle") {
          const len = Math.hypot(ox, oy) || 1
          const r = Math.max(0, radius - m)
          ox = ox / len * r
          oy = oy / len * r
        } else {
          const tx = Math.abs(ox) > 1e-6 ? (hw - m) / Math.abs(ox) : Infinity
          const ty = Math.abs(oy) > 1e-6 ? (hh - m) / Math.abs(oy) : Infinity
          const t = Math.min(tx, ty, 1)
          ox *= t
          oy *= t
        }
      }
      const icon = p.icon ?? "dot"
      // static 마커는 스냅샷 방위, dynamic은 실시간 방위(follow 대상이 정확히 위를 향하도록)
      const angle = icon === "triangle"
        ? ((!isStatic && p.heading) ? p.heading() : e.h) + s.rot
        : 0
      drawIcon(ctx, hw + ox, hh + oy, size, icon, p.color ?? MINIMAP_DEFAULTS.markerColor, angle)
    }

    ctx.restore()
    this.renderCount++
  }

  private ensureCache(reg: MinimapRegistry, s: MinimapViewState, z: number, W: number, H: number) {
    let mode: "world" | "view" = "view"
    let cw: number
    let ch: number
    const b = s.worldBounds
    if (b) {
      cw = Math.ceil((b.maxU - b.minU) * z)
      ch = Math.ceil((b.maxV - b.minV) * z)
      if (cw > 0 && ch > 0 && Math.max(cw, ch) <= MAX_CACHE_DIM && cw * ch <= MAX_CACHE_AREA) mode = "world"
    }
    if (mode === "view") {
      if (s.orientation === "heading") {
        cw = ch = Math.ceil(Math.hypot(W, H))
      } else {
        cw = W
        ch = H
      }
    }
    const sizeChanged = this.cache.width !== cw! || this.cache.height !== ch!
    const need = !this.cacheValid
      || reg.staticDirty
      || sizeChanged
      || mode !== this.cacheMode
      || z !== this.cacheZoom
      || (mode === "world" && !sameBounds(b, this.cacheBounds))
      || (mode === "view" && (s.centerU !== this.cacheCU || s.centerV !== this.cacheCV))
    if (!need) return

    if (sizeChanged) {
      this.cache.width = cw!
      this.cache.height = ch!
    }
    this.cacheMode = mode
    this.cacheZoom = z
    this.cacheCU = s.centerU
    this.cacheCV = s.centerV
    this.cacheBounds = b ? { ...b } : undefined
    this.cacheValid = true

    // 캐시 픽셀 = (u - originU) * z
    const originU = mode === "world" ? b!.minU : s.centerU - cw! / 2 / z
    const originV = mode === "world" ? b!.minV : s.centerV - ch! / 2 / z
    const c = this.cacheCtx
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, cw!, ch!)
    const entries = [...reg.staticMap.values()]
      .filter((e) => e.param.visible !== false && !e.param.clampToEdge)
      .sort((a, b) => (a.param.layer ?? 0) - (b.param.layer ?? 0))
    for (const e of entries) {
      const p = e.param
      const size = (p.size ?? MINIMAP_DEFAULTS.markerSize) * this.dpr
      const x = (e.u - originU) * z
      const y = (e.v - originV) * z
      if (x < -size || y < -size || x > cw! + size || y > ch! + size) continue
      const icon = p.icon ?? "dot"
      drawIcon(c, x, y, size, icon, p.color ?? MINIMAP_DEFAULTS.markerColor, icon === "triangle" ? e.h : 0)
    }
    this.staticRenderCount++
  }

  private blitCache(s: MinimapViewState, z: number, W: number, H: number) {
    const ctx = this.ctx
    const cw = this.cache.width
    const ch = this.cache.height
    ctx.save()
    ctx.translate(W / 2, H / 2)
    if (s.rot !== 0) ctx.rotate(s.rot)
    if (this.cacheMode === "world") {
      const b = this.cacheBounds!
      // 뷰 대각선 반경만큼만 잘라 붙인다
      const half = Math.ceil(Math.hypot(W, H) / 2)
      const cx = (s.centerU - b.minU) * z
      const cy = (s.centerV - b.minV) * z
      const sx0 = Math.max(0, Math.floor(cx - half))
      const sy0 = Math.max(0, Math.floor(cy - half))
      const sx1 = Math.min(cw, Math.ceil(cx + half))
      const sy1 = Math.min(ch, Math.ceil(cy + half))
      if (sx1 > sx0 && sy1 > sy0) {
        ctx.drawImage(this.cache, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0 - cx, sy0 - cy, sx1 - sx0, sy1 - sy0)
      }
    } else {
      ctx.drawImage(this.cache, -cw / 2, -ch / 2)
    }
    ctx.restore()
  }
}

function sameBounds(a?: MinimapWorldBounds, b?: MinimapWorldBounds) {
  if (!a || !b) return a === b
  return a.minU === b.minU && a.minV === b.minV && a.maxU === b.maxU && a.maxV === b.maxV
}

/** angle: 방위각(rad, 화면 위 = 0, 시계 방향 +) */
function drawIcon(ctx: Ctx2D, x: number, y: number, s: number, icon: MinimapIcon, color: string, angle: number) {
  ctx.fillStyle = color
  switch (icon) {
    case "square":
      ctx.fillRect(x - s, y - s, s * 2, s * 2)
      break
    case "diamond":
      ctx.beginPath()
      ctx.moveTo(x, y - s * 1.3)
      ctx.lineTo(x + s * 1.3, y)
      ctx.lineTo(x, y + s * 1.3)
      ctx.lineTo(x - s * 1.3, y)
      ctx.closePath()
      ctx.fill()
      break
    case "triangle":
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, -s * 1.6)
      ctx.lineTo(s * 1.1, s * 1.1)
      ctx.lineTo(0, s * 0.5)
      ctx.lineTo(-s * 1.1, s * 1.1)
      ctx.closePath()
      ctx.fill()
      ctx.lineWidth = Math.max(1, s * 0.25)
      ctx.strokeStyle = "rgba(0,0,0,0.6)"
      ctx.stroke()
      ctx.restore()
      break
    case "dot":
    default:
      ctx.beginPath()
      ctx.arc(x, y, s, 0, Math.PI * 2)
      ctx.fill()
      break
  }
}
