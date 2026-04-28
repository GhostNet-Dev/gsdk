import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { AttackOption, AttackType } from "@Glibs/types/playertypes";
import { BaseSpec } from "./basespec";

export const DEFAULT_MELEE_ATTACK_RANGE = 3.5;

export enum MeleeValidationResult {
    InRange = "in_range",
    OutOfRange = "out_of_range",
    InvalidTarget = "invalid_target",
    DeadTarget = "dead_target",
}

export type PendingMeleeImpactContext = {
    pendingAttackRange: number
    pendingKnockbackDist: number
}

export type PlayerMeleeKnockbackParams = {
    attackRange: number
    stepInDistance?: number
    isFinisher?: boolean
}

export type MeleeAttackContext = {
    targetId: string
    distance: number
    attackerObjectId?: string
}

export interface IMeleeTargetValidator extends PendingMeleeImpactContext {
    ValidateMeleeAttackTarget(targetId: string, attackRange: number): MeleeValidationResult
}

export function IsMeleeAttackType(type: AttackType) {
    return type === AttackType.NormalSwing || type === AttackType.FullSwing
}

export function GetHorizontalDistance(a: THREE.Vector3, b: THREE.Vector3) {
    const dx = a.x - b.x
    const dz = a.z - b.z
    return Math.hypot(dx, dz)
}

export function GetHorizontalDistanceToBoxSurface(
    origin: THREE.Vector3,
    box: THREE.Box3 | undefined,
    fallback: THREE.Vector3,
    closestPoint = new THREE.Vector3(),
) {
    if (box && !box.isEmpty()) {
        box.clampPoint(origin, closestPoint)
        return GetHorizontalDistance(origin, closestPoint)
    }
    return GetHorizontalDistance(origin, fallback)
}

export function GetMeleeAttackDistance(spec: BaseSpec) {
    if (spec.stats.getBaseStat("attackRange") > 0) return spec.AttackRange
    return DEFAULT_MELEE_ATTACK_RANGE
}

export function CalculatePlayerMeleeKnockbackDistance({
    attackRange,
    stepInDistance = 0,
    isFinisher = false,
}: PlayerMeleeKnockbackParams) {
    const baselineKnockback = Math.min(1.5, Math.max(1.0, attackRange * 0.35))
    const comboKnockback = Math.max(baselineKnockback, stepInDistance)
    const finisherKnockback = isFinisher ? comboKnockback * 1.25 : comboKnockback
    return Math.min(2.5, Math.max(0.75, finisherKnockback))
}

export function GetMeleeTargetValidator(owner: unknown): IMeleeTargetValidator | undefined {
    const candidate = owner as Partial<IMeleeTargetValidator> | undefined
    if (
        typeof candidate?.pendingAttackRange === "number" &&
        typeof candidate.pendingKnockbackDist === "number" &&
        typeof candidate.ValidateMeleeAttackTarget === "function"
    ) {
        return candidate as IMeleeTargetValidator
    }
}

export function BuildKnockbackVector(
    receiverPos: THREE.Vector3,
    attackerPos: THREE.Vector3,
    attackRange: number,
    explicitKnockbackDist = 0,
) {
    const flatReceiverPos = receiverPos.clone()
    const flatAttackerPos = attackerPos.clone()
    flatReceiverPos.y = 0
    flatAttackerPos.y = 0

    let pushAmount = 0
    if (explicitKnockbackDist > 0) {
        pushAmount = explicitKnockbackDist
    } else {
        if (attackRange <= 0) return undefined
        const currentDist = GetHorizontalDistance(flatReceiverPos, flatAttackerPos)
        const desiredPush = Math.max(1.5, attackRange * 0.5)
        pushAmount = Math.min(desiredPush, Math.max(0, (attackRange - 0.1) - currentDist))
    }

    if (pushAmount <= 0) return undefined

    const knockbackVector = new THREE.Vector3()
        .subVectors(flatReceiverPos, flatAttackerPos)
        .normalize()
    knockbackVector.y = 0
    return knockbackVector.multiplyScalar(pushAmount)
}

export function ValidateReceivedMeleeAttack(
    attack: AttackOption,
    defenderTargetId: string,
    defenderPos: THREE.Vector3,
    defenderAlive: boolean,
    defenderBounds?: THREE.Box3,
) {
    if (!defenderAlive) return MeleeValidationResult.DeadTarget
    if (!IsMeleeAttackType(attack.type)) return MeleeValidationResult.InvalidTarget
    if (attack.targetId !== defenderTargetId) return MeleeValidationResult.InvalidTarget
    if (typeof attack.distance !== "number" || attack.distance <= 0) {
        return MeleeValidationResult.InvalidTarget
    }
    if (!attack.obj) return MeleeValidationResult.InvalidTarget

    const hitDistance = GetHorizontalDistanceToBoxSurface(attack.obj.position, defenderBounds, defenderPos)
    if (hitDistance > attack.distance) return MeleeValidationResult.OutOfRange
    return MeleeValidationResult.InRange
}

export function GetTargetId(target?: IPhysicsObject & { TargetId?: string }, fallback?: string) {
    return target?.TargetId ?? fallback ?? ""
}
