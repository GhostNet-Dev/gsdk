import * as THREE from "three"

export type TargetKind = "ship" | "unit" | "structure" | "projectile" | "other"

export const TargetTeamId = {
  Player: "player",
  Monster: "monster",
} as const

export type TargetTeamId = typeof TargetTeamId[keyof typeof TargetTeamId]

export type Relation = "ally" | "enemy" | "neutral"

export type TargetRecord = {
  id: string
  object: THREE.Object3D
  teamId?: string
  factionId?: string
  fleetId?: string
  kind: TargetKind
  alive: boolean
  targetable: boolean
  collidable: boolean
}

export type RegisterTargetMsg = {
  id: string
  object: THREE.Object3D
  teamId?: string
  factionId?: string
  fleetId?: string
  kind?: TargetKind
  alive?: boolean
  targetable?: boolean
  collidable?: boolean
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
}
