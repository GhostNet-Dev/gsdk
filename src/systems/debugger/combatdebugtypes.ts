import * as THREE from "three";

export enum CombatDebugTeam {
    Ally = "ally",
    Monster = "monster",
}

export enum CombatDebugVisualKind {
    Hitbox = "hitbox",
    MoveDirection = "move-direction",
    AttackRange = "attack-range",
    TargetLine = "target-line",
}

export interface CombatDebugInfo {
    team: CombatDebugTeam
    targetId: string
    damageBox: THREE.Mesh
    box: THREE.Box3
    centerPos: THREE.Vector3
    moveDirection: THREE.Vector3
    attackRange: number
    currentTargetId?: string
    currentTargetBounds?: THREE.Box3
    currentTargetCenter?: THREE.Vector3
}

export interface IDebuggableActor {
    GetDebugInfo(): CombatDebugInfo
}
