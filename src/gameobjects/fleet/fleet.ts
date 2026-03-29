import * as THREE from "three"
import { ActorCommand } from "@Glibs/actors/controllable/controllabletypes"
import { FleetFormation, Formation } from "./formation"

export type FleetCommandIssuer = "human" | "ai" | "script"

export type FleetOrder = {
  type: "move" | "attack" | "hold" | "follow"
  issuedAt?: number
  issuer?: FleetCommandIssuer
  priority?: number
  point?: THREE.Vector3
  targetId?: string
  formation?: FleetFormation
  spacing?: number
  facing?: THREE.Vector3
}

export type FleetConfig = {
  formation?: FleetFormation
  spacing?: number
}

export class Fleet {
  private readonly members = new Set<string>()
  private formation: FleetFormation
  private spacing: number

  constructor(
    public readonly id: string,
    memberIds: string[] = [],
    config: FleetConfig = {},
  ) {
    this.formation = config.formation ?? "line"
    this.spacing = config.spacing ?? 6
    memberIds.forEach((memberId) => this.members.add(memberId))
  }

  getMembers(): string[] {
    return [...this.members]
  }

  hasMember(actorId: string): boolean {
    return this.members.has(actorId)
  }

  addMember(actorId: string) {
    this.members.add(actorId)
  }

  addMembers(actorIds: string[]) {
    actorIds.forEach((actorId) => this.members.add(actorId))
  }

  removeMember(actorId: string) {
    this.members.delete(actorId)
  }

  clearMembers() {
    this.members.clear()
  }

  setFormation(formation: FleetFormation) {
    this.formation = formation
  }

  setSpacing(spacing: number) {
    this.spacing = Math.max(1, spacing)
  }

  toCommands(order: FleetOrder): ActorCommand[] {
    const members = this.getMembers()
    if (members.length === 0) return []

    const issuedAt = order.issuedAt ?? Date.now()
    const issuer = order.issuer ?? "human"
    const priority = order.priority

    switch (order.type) {
      case "move":
        if (!order.point) return []
        return this.moveCommands(members, order.point, issuedAt, issuer, priority, order)
      case "attack":
        if (!order.targetId) return []
        return members.map((actorId) => ({
          type: "attack",
          actorId,
          targetId: order.targetId,
          issuedAt,
          issuer,
          priority,
        }))
      case "follow":
        if (!order.targetId) return []
        return members.map((actorId) => ({
          type: "follow",
          actorId,
          targetId: order.targetId,
          issuedAt,
          issuer,
          priority,
        }))
      case "hold":
      default:
        return members.map((actorId) => ({
          type: "hold",
          actorId,
          issuedAt,
          issuer,
          priority,
        }))
    }
  }

  private moveCommands(
    members: string[],
    anchor: THREE.Vector3,
    issuedAt: number,
    issuer: FleetCommandIssuer,
    priority: number | undefined,
    order: FleetOrder,
  ): ActorCommand[] {
    const positions = Formation.layout(order.formation ?? this.formation, {
      anchor,
      count: members.length,
      spacing: order.spacing ?? this.spacing,
      facing: order.facing,
    })

    return members.map((actorId, index) => ({
      type: "move",
      actorId,
      point: positions[index]?.clone() ?? anchor.clone(),
      issuedAt,
      issuer,
      priority,
    }))
  }
}
