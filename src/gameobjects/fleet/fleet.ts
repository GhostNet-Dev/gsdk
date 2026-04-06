import * as THREE from "three"
import { ActorCommand } from "@Glibs/actors/controllable/controllabletypes"
import { FleetFormation, Formation } from "./formation"

export enum FleetCommandIssuer {
  Human = "human",
  AI = "ai",
  Script = "script"
}
export type FleetControllerType = FleetCommandIssuer
export enum FleetMoveMode {
  Formation = "formation",
  FlagshipFollow = "flagship-follow",
  FlagshipFormation = "flagship-formation"
}

export enum FleetOrderType {
  Move = "move",
  Attack = "attack",
  Hold = "hold",
  Follow = "follow"
}

export type FleetWeaponDoctrine = "balanced" | "long-range" | "close-assault"

export type FleetOrder = {
  type: FleetOrderType
  issuedAt?: number
  issuer?: FleetCommandIssuer
  priority?: number
  point?: THREE.Vector3
  direction?: THREE.Vector3
  targetId?: string
  formation?: FleetFormation
  spacing?: number
  facing?: THREE.Vector3
  moveMode?: FleetMoveMode
  weaponDoctrine?: FleetWeaponDoctrine
}

export type FleetConfig = {
  name?: string
  color?: THREE.ColorRepresentation
  teamId?: string
  controller?: FleetControllerType
  formation?: FleetFormation
  spacing?: number
  moveMode?: FleetMoveMode
}

export class Fleet {
  private readonly members = new Set<string>()
  private formation: FleetFormation
  private spacing: number
  private moveMode: FleetMoveMode
  readonly name: string
  readonly color?: THREE.ColorRepresentation
  readonly teamId: string
  readonly controller: FleetControllerType

  constructor(
    public readonly id: string,
    memberIds: string[] = [],
    config: FleetConfig = {},
  ) {
    this.name = config.name ?? id
    this.color = config.color
    this.teamId = config.teamId ?? id
    this.controller = config.controller ?? FleetCommandIssuer.Human
    this.formation = config.formation ?? "line"
    this.spacing = config.spacing ?? 6
    this.moveMode = config.moveMode ?? FleetMoveMode.Formation
    memberIds.forEach((memberId) => this.members.add(memberId))
  }

  getFormation(): FleetFormation {
    return this.formation
  }

  getSpacing(): number {
    return this.spacing
  }

  getMoveMode(): FleetMoveMode {
    return this.moveMode
  }

  getMembers(): string[] {
    return [...this.members]
  }

  hasMember(actorId: string): boolean {
    return this.members.has(actorId)
  }

  setFormation(formation: FleetFormation) {
    this.formation = formation
  }

  setSpacing(spacing: number) {
    this.spacing = Math.max(1, spacing)
  }

  setMoveMode(moveMode: FleetMoveMode) {
    this.moveMode = moveMode
  }

  toCommands(order: FleetOrder): ActorCommand[] {
    const members = this.getMembers()
    if (members.length === 0) return []

    const issuedAt = order.issuedAt ?? Date.now()
    const issuer = order.issuer ?? FleetCommandIssuer.Human
    const priority = order.priority

    switch (order.type) {
      case FleetOrderType.Move:
        if (!order.point && !order.direction) return []
        return this.moveCommands(members, order.point, issuedAt, issuer, priority, order)
      case FleetOrderType.Attack:
        if (!order.targetId) return []
        return this.attackCommands(members, issuedAt, issuer, priority, order)
      case FleetOrderType.Follow:
        if (!order.targetId) return []
        return members.map((actorId) => ({
          type: "follow",
          actorId,
          targetId: order.targetId,
          issuedAt,
          issuer,
          priority,
        }))
      case FleetOrderType.Hold:
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
    anchor: THREE.Vector3 | undefined,
    issuedAt: number,
    issuer: FleetCommandIssuer,
    priority: number | undefined,
    order: FleetOrder,
  ): ActorCommand[] {
    const moveMode = order.moveMode ?? this.moveMode
    if (moveMode === FleetMoveMode.FlagshipFollow) {
      return this.flagshipFollowMoveCommands(members, anchor, issuedAt, issuer, priority, order)
    }
    if (moveMode === FleetMoveMode.FlagshipFormation) {
      return this.flagshipFormationMoveCommands(members, anchor, issuedAt, issuer, priority, order)
    }

    const positions = anchor
      ? Formation.layout(order.formation ?? this.formation, {
          anchor,
          count: members.length,
          spacing: order.spacing ?? this.spacing,
          facing: order.facing,
        })
      : []

    return members.map((actorId, index) => ({
      type: "move",
      actorId,
      point: positions[index]?.clone(),
      payload: order.direction
        ? { direction: order.direction.clone() }
        : undefined,
      issuedAt,
      issuer,
      priority,
    }))
  }

  private flagshipFollowMoveCommands(
    members: string[],
    anchor: THREE.Vector3 | undefined,
    issuedAt: number,
    issuer: FleetCommandIssuer,
    priority: number | undefined,
    order: FleetOrder,
  ): ActorCommand[] {
    const flagshipId = members[0]
    if (!flagshipId) return []

    return members.map((actorId) => {
      if (actorId === flagshipId) {
        return {
          type: "move" as const,
          actorId,
          point: anchor?.clone(),
          payload: order.direction
            ? { direction: order.direction.clone() }
            : undefined,
          issuedAt,
          issuer,
          priority,
        }
      }

      return {
        type: "follow" as const,
        actorId,
        targetId: flagshipId,
        issuedAt,
        issuer,
        priority,
      }
    })
  }

  private flagshipFormationMoveCommands(
    members: string[],
    anchor: THREE.Vector3 | undefined,
    issuedAt: number,
    issuer: FleetCommandIssuer,
    priority: number | undefined,
    order: FleetOrder,
  ): ActorCommand[] {
    const flagshipId = members[0]
    if (!flagshipId) return []

    const localAnchor = new THREE.Vector3()
    const localPositions = Formation.layout(order.formation ?? this.formation, {
      anchor: localAnchor,
      count: members.length,
      spacing: order.spacing ?? this.spacing,
    })
    const flagshipLocalPosition = localPositions[0] ?? localAnchor

    return members.map((actorId, index) => {
      if (actorId === flagshipId) {
        return {
          type: "move" as const,
          actorId,
          point: anchor?.clone(),
          payload: order.direction
            ? { direction: order.direction.clone() }
            : undefined,
          issuedAt,
          issuer,
          priority,
        }
      }

      const slotLocalPosition = localPositions[index] ?? localAnchor
      return {
        type: "follow" as const,
        actorId,
        targetId: flagshipId,
        payload: {
          offset: slotLocalPosition.clone().sub(flagshipLocalPosition),
          stopDistance: Math.max(1.5, (order.spacing ?? this.spacing) * 0.35),
        },
        issuedAt,
        issuer,
        priority,
      }
    })
  }

  private attackCommands(
    members: string[],
    issuedAt: number,
    issuer: FleetCommandIssuer,
    priority: number | undefined,
    order: FleetOrder,
  ): ActorCommand[] {
    const targetId = order.targetId
    if (!targetId) return []
    if (issuer !== FleetCommandIssuer.AI) {
      return members.map((actorId) => ({
        type: "attack" as const,
        actorId,
        targetId,
        issuedAt,
        issuer,
        priority,
      }))
    }

    console.log("[Fleet] build ai attack commands", {
      fleetId: this.id,
      moveMode: order.moveMode ?? this.moveMode,
      formation: order.formation ?? this.formation,
      spacing: order.spacing ?? this.spacing,
      targetId,
      memberIds: members,
    })

    const moveMode = order.moveMode ?? this.moveMode
    const flagshipId = members[0]
    const spacing = order.spacing ?? this.spacing

    if (!flagshipId) return []

    if (moveMode === FleetMoveMode.FlagshipFollow) {
      return members.map((actorId) => ({
        type: "attack" as const,
        actorId,
        targetId,
        payload: actorId === flagshipId
          ? {
              engagement: {
                type: "pursue-target",
                targetId,
                stopDistance: Math.max(4, spacing * 0.75),
              },
              weaponDoctrine: order.weaponDoctrine,
            }
          : {
              engagement: {
                type: "follow-ship",
                targetId: flagshipId,
                stopDistance: Math.max(2, spacing * 0.45),
              },
              weaponDoctrine: order.weaponDoctrine,
            },
        issuedAt,
        issuer,
        priority,
      }))
    }

    if (moveMode === FleetMoveMode.FlagshipFormation || moveMode === FleetMoveMode.Formation) {
      const localAnchor = new THREE.Vector3()
      const localPositions = Formation.layout(order.formation ?? this.formation, {
        anchor: localAnchor,
        count: members.length,
        spacing,
      })
      const flagshipLocalPosition = localPositions[0] ?? localAnchor

      return members.map((actorId, index) => ({
        type: "attack" as const,
        actorId,
        targetId,
        payload: actorId === flagshipId
          ? {
              engagement: {
                type: "pursue-target",
                targetId,
                stopDistance: Math.max(4, spacing * 0.75),
              },
              weaponDoctrine: order.weaponDoctrine,
            }
          : {
              engagement: {
                type: "follow-ship",
                targetId: flagshipId,
                offset: (localPositions[index] ?? localAnchor).clone().sub(flagshipLocalPosition),
                stopDistance: Math.max(1.5, spacing * 0.35),
              },
              weaponDoctrine: order.weaponDoctrine,
            },
        issuedAt,
        issuer,
        priority,
      }))
    }

    console.warn("[Fleet] unsupported ai attack move mode", {
      fleetId: this.id,
      moveMode,
      targetId,
    })
    return []
  }
}
