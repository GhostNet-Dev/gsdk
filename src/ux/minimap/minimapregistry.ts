import * as THREE from "three";
import { MinimapMarkerParam, MinimapPlane, projectToPlane, wrapAngle } from "./minimaptypes";

export interface MinimapEntry {
  param: MinimapMarkerParam
  /** 마지막 스냅샷 좌표 (plane 기준 가로축) */
  u: number
  /** 마지막 스냅샷 좌표 (plane 기준 세로축) */
  v: number
  /** 마지막 스냅샷 방위각 (heading이 있을 때만 의미) */
  h: number
}

/**
 * 마커 저장소. static은 등록/Update 시에만 좌표를 읽고, dynamic만 주기적으로 검사한다.
 * DOM/Canvas에 의존하지 않는 순수 로직.
 */
export class MinimapRegistry {
  readonly staticMap = new Map<string, MinimapEntry>()
  readonly dynamicMap = new Map<string, MinimapEntry>()
  staticDirty = false
  dynamicDirty = false

  private readonly tmp = new THREE.Vector3()
  private readonly proj = { u: 0, v: 0 }

  constructor(private plane: MinimapPlane = "xz") { }

  get size(): number {
    return this.staticMap.size + this.dynamicMap.size
  }

  get(id: string): MinimapEntry | undefined {
    return this.dynamicMap.get(id) ?? this.staticMap.get(id)
  }

  setPlane(plane: MinimapPlane) {
    if (this.plane === plane) return
    this.plane = plane
    this.staticMap.forEach((e) => this.snapshot(e))
    this.dynamicMap.forEach((e) => this.snapshot(e))
    this.staticDirty = this.dynamicDirty = true
  }

  add(param: MinimapMarkerParam) {
    if (!param || !param.id) return
    if (!param.position && !param.object) {
      console.warn("[Minimap] marker needs position or object:", param.id)
      return
    }
    this.remove(param.id)
    const entry: MinimapEntry = { param: { ...param }, u: 0, v: 0, h: 0 }
    this.snapshot(entry)
    this.mapOf(entry.param.dynamic).set(param.id, entry)
    this.markDirty(entry.param.dynamic)
  }

  remove(id: string): boolean {
    if (this.staticMap.delete(id)) {
      this.staticDirty = true
      return true
    }
    if (this.dynamicMap.delete(id)) {
      this.dynamicDirty = true
      return true
    }
    return false
  }

  /** 속성 병합 + 재스냅샷. dynamic 값이 바뀌면 Map 간 이동 */
  update(id: string, patch: Partial<MinimapMarkerParam>): boolean {
    const entry = this.get(id)
    if (!entry || !patch) return false
    const wasDynamic = entry.param.dynamic
    entry.param = { ...entry.param, ...patch, id }
    const isDynamic = entry.param.dynamic
    if (wasDynamic !== isDynamic) {
      this.mapOf(wasDynamic).delete(id)
      this.mapOf(isDynamic).set(id, entry)
      this.markDirty(wasDynamic)
    }
    this.snapshot(entry)
    this.markDirty(isDynamic)
    return true
  }

  /** dynamicMap만 순회하며 이동/회전한 항목만 스냅샷 갱신. 하나라도 바뀌면 true */
  pollDynamic(eps: number, rotEps: number): boolean {
    const eps2 = eps * eps
    let changed = false
    this.dynamicMap.forEach((e) => {
      if (e.param.visible === false) return
      const p = this.read(e.param)
      if (!p) return
      const du = p.u - e.u
      const dv = p.v - e.v
      if (du * du + dv * dv > eps2) {
        e.u = p.u
        e.v = p.v
        changed = true
      }
      if (e.param.heading) {
        const h = e.param.heading()
        if (Math.abs(wrapAngle(h - e.h)) > rotEps) {
          e.h = h
          changed = true
        }
      }
    })
    if (changed) this.dynamicDirty = true
    return changed
  }

  clear() {
    if (this.size > 0) this.staticDirty = this.dynamicDirty = true
    this.staticMap.clear()
    this.dynamicMap.clear()
  }

  private snapshot(e: MinimapEntry) {
    const p = this.read(e.param)
    if (p) {
      e.u = p.u
      e.v = p.v
    }
    if (e.param.heading) e.h = e.param.heading()
  }

  private read(param: MinimapMarkerParam): { u: number, v: number } | undefined {
    if (param.object) {
      param.object.getWorldPosition(this.tmp)
      return projectToPlane(this.tmp, this.plane, this.proj)
    }
    if (param.position) return projectToPlane(param.position, this.plane, this.proj)
    return undefined
  }

  private mapOf(dynamic: boolean) {
    return dynamic ? this.dynamicMap : this.staticMap
  }

  private markDirty(dynamic: boolean) {
    if (dynamic) this.dynamicDirty = true
    else this.staticDirty = true
  }
}
