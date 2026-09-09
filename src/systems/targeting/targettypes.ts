import * as THREE from "three"

export type TargetKind = "ship" | "unit" | "structure" | "projectile" | "other"

export const TargetTeamId = {
  Player: "player",
  Monster: "monster",
} as const

export type TargetTeamId = typeof TargetTeamId[keyof typeof TargetTeamId]

export type Relation = "ally" | "enemy" | "neutral"

export enum TargetDistanceMode {
  Center = "center",
  BoundsSurface = "bounds_surface",
}

export type TargetRecord = {
  id: string
  object: THREE.Object3D
  /**
   * 전투·이동 기하(거리/사거리/경로 목표) 판정에 쓰는 대표 오브젝트.
   * 없으면 `object`를 사용한다. 가시성·아이덴티티·메타는 항상 `object` 기준.
   */
  colliderObject?: THREE.Object3D
  teamId?: string
  factionId?: string
  fleetId?: string
  kind: TargetKind
  alive: boolean
  targetable: boolean
  collidable: boolean
  bounds?: THREE.Box3
}

export type RegisterTargetMsg = {
  id: string
  object: THREE.Object3D
  colliderObject?: THREE.Object3D
  teamId?: string
  factionId?: string
  fleetId?: string
  kind?: TargetKind
  alive?: boolean
  targetable?: boolean
  collidable?: boolean
  bounds?: THREE.Box3
}

export type UpdateTargetStateMsg = {
  id: string
  teamId?: string
  factionId?: string
  fleetId?: string
  alive?: boolean
  targetable?: boolean
  collidable?: boolean
}

export type TargetQueryOptions = {
  aliveOnly?: boolean
  targetableOnly?: boolean
  collidableOnly?: boolean
  kinds?: TargetKind[]
  distanceMode?: TargetDistanceMode
}
