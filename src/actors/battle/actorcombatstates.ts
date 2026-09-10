import * as THREE from "three"
import { IGPhysic } from "@Glibs/interface/igphysics"
import IEventController from "@Glibs/interface/ievent"
import { ActionType, AttackType } from "@Glibs/types/playertypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { IActorModel } from "@Glibs/actors/battle/iactormodel"
import { IActorState } from "@Glibs/actors/monsters/monstertypes"
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes"
import { ProjectileDamageType, ProjectileWeaponDef } from "@Glibs/actors/projectile/projectiletypes"
import { ATTACK_EXIT_HYSTERESIS, GetEffectiveAttackRange } from "@Glibs/actors/battle/combatrange"
import {
    BuildKnockbackVector,
    GetHorizontalDistanceToBoxSurface,
    GetMeleeTargetValidator,
    MeleeValidationResult,
} from "@Glibs/actors/battle/meleecombat"

export type ActorStates = Record<string, IActorState>

type ActorAttackTarget = IPhysicsObject & { TargetId?: string; HasTarget?: boolean }
type RangedTargetValidator = {
    ValidateRangedAttackTarget?: (targetId: string, attackRange: number) => boolean
}

const DEFAULT_ATTACK_SPEED = 1

/**
 * 몬스터/아군 FSM 을 하나로 병합하기 위한 사이드별 설정. (설계 §5.4)
 * 두 사이드의 실동작을 1:1 로 재현하기 위해 공식이 갈리는 지점(타겟 미보유 대기,
 * 공격 타이밍 산출, 사망 이벤트, 근접 히트 허용치, muzzle 기본값)은 전부 여기로 뺀다.
 */
export interface ActorStateConfig {
    /** `[CombatDebug]` 로그 actor 라벨 ("monster" / "ally" / "dash_monster") */
    debugActor: string
    /** 타겟 id 미해석 시 fallback (몬스터 = player, 아군 = monster) */
    fallbackTargetId: string
    /** 근접 공격 액션 (기본 Punch) */
    attackAction?: ActionType
    /** 원거리 무기 정의. 존재하면 원거리 사거리/발사 경로 사용 */
    projectileDef?: ProjectileWeaponDef
    /** 원거리 총구 오프셋 기본값 (projectileDef.muzzleOffset 미지정 시) */
    muzzleOffset: { x: number; y: number; z: number }
    /** 근접 히트 초근접 허용 반경 (몬스터 1.0, 아군 0). dist <= 이 값이면 validator 통과로 간주 */
    meleeHitToleranceRadius: number
    /** 타겟 없으면 Idle 로 대기 (아군 true, 몬스터 false — 몬스터는 항상 플레이어 폴백) */
    standDownWithoutTarget: boolean
    /** Dying 진입 시 부가 이벤트 (몬스터 = Exp 발행, 아군 = noop) */
    onDeathInit?: () => void
    /**
     * Attack 진입 시 공격 애니메이션 재생 + 스윙 간격/초기 타이머 산출.
     * - 몬스터: spec.AttackSpeed>0 이면 그 값으로 애니 속도 지정, 아니면 애니 duration, 아니면 1. 초기 타이머 = 간격
     * - 아군: 애니를 자연속도로 재생, 간격 = duration*0.8 (없으면 spec.AttackSpeed), 초기 타이머 = spec.AttackSpeed
     */
    beginAttackAnim: (model: IActorModel, spec: BaseSpec, action: ActionType) => { swingInterval: number; initialTimer: number }
}

export function GetActorAttackTargetId(target: IPhysicsObject | undefined, cfg: ActorStateConfig) {
    return (target as ActorAttackTarget | undefined)?.TargetId ?? cfg.fallbackTargetId
}

function HasActorAttackTarget(target?: IPhysicsObject) {
    return (target as ActorAttackTarget | undefined)?.HasTarget !== false
}

// ────────────────────────────────────────────────────────────────────────────
// 베이스
// ────────────────────────────────────────────────────────────────────────────

export abstract class ActorCombatState {
    constructor(
        public states: ActorStates,
        protected model: IActorModel,
        protected gphysic: IGPhysic,
        protected spec: BaseSpec,
        protected cfg: ActorStateConfig,
        protected eventCtrl?: IEventController,
    ) { }

    abstract Uninit(): void

    protected GetAttackDistance() {
        return GetEffectiveAttackRange(this.spec, this.cfg.projectileDef?.range)
    }

    private _cp = new THREE.Vector3()
    protected GetTargetDistance(target: IPhysicsObject) {
        return GetHorizontalDistanceToBoxSurface(this.model.Pos, target.Box, target.Pos, this._cp)
    }

    protected AttackTargetId(target: IPhysicsObject) {
        return GetActorAttackTargetId(target, this.cfg)
    }

    protected StandDown(target: IPhysicsObject) {
        return this.cfg.standDownWithoutTarget && !HasActorAttackTarget(target)
    }

    /** 몬스터 공식: spec.AttackSpeed>0 이면 그 값으로 애니 속도 지정, 아니면 duration, 아니면 1 */
    protected ChangeAttackAction(action: ActionType) {
        const configuredAttackSpeed = this.spec.AttackSpeed
        const animationSpeed = configuredAttackSpeed > 0 ? configuredAttackSpeed : undefined
        const duration = this.model.ChangeAction(action, animationSpeed)
        return animationSpeed ?? duration ?? DEFAULT_ATTACK_SPEED
    }

    CheckRun(v: THREE.Vector3) {
        if (v.x || v.z) {
            this.Uninit()
            this.states.RunSt.Init()
            return this.states.RunSt
        }
    }

    perf = 0
    CheckGravity() {
        if (this.perf++ % 3 != 0) return
        this.model.Meshs.position.y -= 0.5
        if (!this.gphysic.Check(this.model)) {
            this.model.Meshs.position.y += 0.5
            this.Uninit()
            this.states.JumpSt.Init(0)
            return this.states.JumpSt
        }
        this.model.Meshs.position.y += 0.5
    }

    CheckDying() {
        if (this.spec.Health <= 0) {
            this.Uninit()
            this.states.DyingSt.Init()
            return this.states.DyingSt
        }
    }

    CheckHit(target: IPhysicsObject) {
        if (this.spec.Status.hit) {
            const ctrl = GetMeleeTargetValidator(this.spec.Owner)
            const attackRange = ctrl?.pendingAttackRange ?? 0
            const explicitKbDist = ctrl?.pendingKnockbackDist ?? 0
            const knockbackVector = BuildKnockbackVector(
                this.model.Pos,
                target.Pos,
                attackRange,
                explicitKbDist,
            )

            if (ctrl) {
                ctrl.pendingAttackRange = 0
                ctrl.pendingKnockbackDist = 0
            }

            this.Uninit()
            this.states.HurtSt.Init(knockbackVector)
            return this.states.HurtSt
        }
    }

    CheckAttack(target: IPhysicsObject, dist: number) {
        if (this.StandDown(target)) return
        const attackDistance = this.GetAttackDistance()
        if (dist < attackDistance && this.CanScheduleAttack(target, attackDistance)) {
            this.Uninit()
            this.states.AttackSt.Init()
            return this.states.AttackSt
        }
    }

    protected CanScheduleAttack(target: IPhysicsObject, attackDistance: number): boolean {
        const targetId = this.AttackTargetId(target)
        if (this.cfg.projectileDef) {
            const validator = this.spec.Owner as RangedTargetValidator
            return validator.ValidateRangedAttackTarget?.(targetId, attackDistance) === true
        }

        const validator = GetMeleeTargetValidator(this.spec.Owner)
        const validation = validator?.ValidateMeleeAttackTarget(targetId, attackDistance)
            ?? MeleeValidationResult.InvalidTarget
        return validation === MeleeValidationResult.InRange
    }

    protected ValidateTargetHit(target: IPhysicsObject, attackDistance: number): boolean {
        const dist = this.GetTargetDistance(target)
        if (this.cfg.meleeHitToleranceRadius > 0 && dist <= this.cfg.meleeHitToleranceRadius) {
            return true
        }

        const targetId = this.AttackTargetId(target)
        const validator = GetMeleeTargetValidator(this.spec.Owner)
        const validation = validator?.ValidateMeleeAttackTarget(targetId, attackDistance)
            ?? MeleeValidationResult.InvalidTarget
        return validation === MeleeValidationResult.InRange
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Hurt
// ────────────────────────────────────────────────────────────────────────────

export class HurtActorState extends ActorCombatState implements IActorState {
    hurtTime = 0
    hurtDuration = 0.5
    private readonly KNOCKBACK_SPEED = 15.0
    private knockbackDir?: THREE.Vector3
    private maxPushDistance = 0
    private currentPushedDistance = 0

    Init(knockbackVector?: THREE.Vector3): void {
        this.spec.Status.hit = false
        if (knockbackVector) {
            this.maxPushDistance = knockbackVector.length()
            this.knockbackDir = knockbackVector.clone().normalize()
        } else {
            this.maxPushDistance = 0
            this.knockbackDir = undefined
        }
        this.currentPushedDistance = 0

        const duration = this.model.ChangeAction(ActionType.MonHurt2)
        if (duration != undefined) this.hurtDuration = duration
        this.hurtTime = 0
    }

    Uninit(): void {
        this.knockbackDir = undefined
        this.maxPushDistance = 0
    }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        // 피격 동작 중에는 추가 피격 플래그를 계속 소모하여 무한 경직 방지
        if (this.spec.Status.hit) {
            this.spec.Status.hit = false
        }

        // 주입된 거리만큼만 넉백 적용
        if (this.knockbackDir && this.currentPushedDistance < this.maxPushDistance) {
            let moveDist = this.KNOCKBACK_SPEED * delta
            if (this.currentPushedDistance + moveDist > this.maxPushDistance) {
                moveDist = this.maxPushDistance - this.currentPushedDistance
            }

            const moveVec = this.knockbackDir.clone().multiplyScalar(moveDist)
            this.model.Pos.add(moveVec)
            this.currentPushedDistance += moveDist

            if (this.gphysic.Check(this.model)) {
                this.model.Pos.sub(moveVec)
                this.currentPushedDistance = this.maxPushDistance
            }
        }

        this.hurtTime += delta
        if (this.hurtTime >= this.hurtDuration) {
            this.Uninit()
            if (v.x || v.z) {
                this.states.RunSt.Init()
                return this.states.RunSt
            }
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        return this
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Jump
// ────────────────────────────────────────────────────────────────────────────

export class JumpActorState extends ActorCombatState implements IActorState {
    speed = 10
    velocity_y = 16
    dirV = new THREE.Vector3(0, 0, 0)
    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    Init(y?: number): void {
        this.velocity_y = y ?? 16
    }
    Uninit(): void {
        this.velocity_y = 16
    }
    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit

        const movX = v.x * delta * this.speed
        const movZ = v.z * delta * this.speed
        const movY = this.velocity_y * delta

        this.model.Meshs.position.x += movX
        this.model.Meshs.position.z += movZ

        if (movX || movZ) {
            this.dirV.copy(v)
            this.dirV.y = 0
            if (this.dirV.lengthSq() > 0) {
                const mx = this.MX.lookAt(this.dirV, this.ZeroV, this.YV)
                const qt = this.QT.setFromRotationMatrix(mx)
                this.model.Meshs.quaternion.copy(qt)
            }
        }

        if (this.gphysic.Check(this.model)) {
            this.model.Meshs.position.x -= movX
            this.model.Meshs.position.z -= movZ
        }

        this.model.Meshs.position.y += movY

        if (this.gphysic.Check(this.model)) {
            this.model.Meshs.position.y -= movY

            this.Uninit()
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        this.velocity_y -= 9.8 * 3 * delta

        return this
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Attack
// ────────────────────────────────────────────────────────────────────────────

export class AttackActorState extends ActorCombatState implements IActorState {
    protected keytimeout?: NodeJS.Timeout
    protected attackProcess = false
    protected attackTime = 0
    protected attackSpeed = this.spec.AttackSpeed
    protected attackDamageMax = this.spec.AttackDamageMax
    protected attackDamageMin = this.spec.AttackDamageMin
    protected targetId: string = this.cfg.fallbackTargetId
    protected scheduledTarget?: IPhysicsObject
    protected scheduledTargetId: string = this.cfg.fallbackTargetId
    protected scheduledAttackRange = 0
    protected readonly scheduledLookDir = new THREE.Vector3()

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    Init(): void {
        this.attackProcess = false
        const timing = this.cfg.beginAttackAnim(this.model, this.spec, this.cfg.attackAction ?? ActionType.Punch)
        this.attackSpeed = timing.swingInterval
        this.attackTime = timing.initialTimer
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
    }

    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        this.keytimeout = undefined
        this.attackProcess = false
        this.scheduledTarget = undefined
        this.scheduledTargetId = this.cfg.fallbackTargetId
        this.scheduledAttackRange = 0
        this.scheduledLookDir.set(0, 0, 0)
    }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        this.targetId = this.AttackTargetId(target)
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        if (this.StandDown(target)) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: this.cfg.debugActor,
                reason: "no_target_update",
                actorId: this.model.UUID,
                targetId: this.targetId,
                currentTargetId: this.AttackTargetId(target),
                actorPos: { x: this.model.Pos.x, y: this.model.Pos.y, z: this.model.Pos.z },
                targetPos: undefined,
                distance: undefined,
                attackRange: undefined,
                validation: MeleeValidationResult.InvalidTarget,
                boundsEmpty: undefined,
            })
            this.Uninit()
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        const dist = this.GetTargetDistance(target)
        const attackDistance = this.GetAttackDistance()
        if (!this.attackProcess && dist > attackDistance * ATTACK_EXIT_HYSTERESIS) {
            this.Uninit()
            this.states.RunSt.Init()
            return this.states.RunSt
        }

        if (this.attackProcess) {
            this.applyLookDirection(this.scheduledLookDir)
            return this
        }

        this.applyLookDirection(v)
        this.attackTime += delta
        if (this.attackTime / this.attackSpeed < 1) return this
        this.attackTime -= this.attackSpeed

        if (!this.CanScheduleAttack(target, attackDistance)) {
            this.Uninit()
            this.states.RunSt.Init()
            return this.states.RunSt
        }

        this.attackProcess = true
        this.scheduledTarget = target
        this.scheduledTargetId = this.targetId
        this.scheduledAttackRange = attackDistance
        this.scheduledLookDir.copy(v)
        this.scheduledLookDir.y = 0
        if (this.scheduledLookDir.lengthSq() <= 0.0001) {
            this.scheduledLookDir.subVectors(target.CenterPos, this.model.CenterPos)
            this.scheduledLookDir.y = 0
        }
        this.applyLookDirection(this.scheduledLookDir)

        console.log("[CombatDebug] AttackScheduled", {
            actor: this.cfg.debugActor,
            actorId: this.model.UUID,
            targetId: this.scheduledTargetId,
            currentTargetId: this.AttackTargetId(target),
            actorPos: { x: this.model.Pos.x, y: this.model.Pos.y, z: this.model.Pos.z },
            targetPos: { x: target.Pos.x, y: target.Pos.y, z: target.Pos.z },
            distance: dist,
            attackRange: attackDistance,
            validation: undefined,
            boundsEmpty: target.Box.isEmpty(),
        })

        this.keytimeout = setTimeout(() => {
            this.keytimeout = undefined
            if (this.scheduledTarget) {
                this.attack(this.scheduledTarget, this.scheduledAttackRange, this.scheduledTargetId)
            }
        }, this.attackSpeed * 1000 * 0.4)

        return this
    }

    protected applyLookDirection(direction: THREE.Vector3) {
        const lookDir = direction.clone()
        lookDir.y = 0
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.model.Meshs.quaternion.copy(qt)
        }
    }

    protected attack(target: IPhysicsObject, attackDistance: number, expectedTargetId: string) {
        if (!this.attackProcess) {
            this.logCanceled("stale_timeout", target, expectedTargetId, this.AttackTargetId(target), attackDistance)
            return
        }

        if (this.StandDown(target)) {
            this.logCanceled("no_target_hit", target, expectedTargetId, this.AttackTargetId(target), attackDistance)
            this.attackProcess = false
            return
        }

        const currentTargetId = this.AttackTargetId(target)
        if (currentTargetId !== expectedTargetId) {
            this.logCanceled("target_changed_hit", target, expectedTargetId, currentTargetId, attackDistance)
            this.attackProcess = false
            return
        }

        if (this.cfg.projectileDef) {
            this.rangedAttack(target, attackDistance, expectedTargetId)
            return
        }

        if (!this.ValidateTargetHit(target, attackDistance)) {
            const hitDistance = this.GetTargetDistance(target)
            this.logCanceled(
                "validator_failed", target, expectedTargetId, currentTargetId, attackDistance,
                hitDistance > attackDistance ? MeleeValidationResult.OutOfRange : MeleeValidationResult.InvalidTarget,
                hitDistance,
            )
            this.attackProcess = false
            return
        }

        this.eventCtrl?.SendEventMessage(EventTypes.Attack + expectedTargetId, [{
            type: AttackType.NormalSwing,
            spec: this.spec,
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            targetId: expectedTargetId,
            distance: attackDistance,
            attackerObjectId: this.model.UUID,
            attackerTargetId: (this.spec.Owner as { TargetId?: string }).TargetId,
            obj: this.model.Meshs,
        }])

        this.attackProcess = false
    }

    protected rangedAttack(target: IPhysicsObject, attackDistance: number, expectedTargetId: string) {
        const targetId = this.AttackTargetId(target)
        const validator = this.spec.Owner as RangedTargetValidator
        if (
            targetId !== expectedTargetId ||
            validator.ValidateRangedAttackTarget?.(targetId, attackDistance) !== true
        ) {
            this.logCanceled(
                targetId !== expectedTargetId ? "target_changed_ranged" : "ranged_validator_failed",
                target, expectedTargetId, targetId, attackDistance, undefined,
            )
            this.attackProcess = false
            return
        }

        const projectileDef = this.cfg.projectileDef!
        const muzzleOffset = projectileDef.muzzleOffset ?? this.cfg.muzzleOffset
        const src = new THREE.Vector3(muzzleOffset.x, muzzleOffset.y, muzzleOffset.z)
            .applyQuaternion(this.model.Meshs.quaternion)
            .add(this.model.Pos)
        const dir = target.CenterPos.clone().sub(src)
        if (dir.lengthSq() <= 0.0001) {
            this.attackProcess = false
            return
        }
        dir.normalize()

        const damageType = projectileDef.damageType ?? ProjectileDamageType.Physical
        const baseDamage = damageType === ProjectileDamageType.Magic
            ? this.spec.stats.getStat("magicAttack")
            : this.spec.DamageRanged

        this.eventCtrl?.SendEventMessage(EventTypes.SpawnProjectile, {
            id: projectileDef.id,
            ownerSpec: this.spec,
            damage: baseDamage * (projectileDef.damageMultiplier ?? 1),
            damageType,
            src,
            dir,
            range: projectileDef.range ?? this.spec.AttackRange,
            homing: projectileDef.homing,
            hitscan: projectileDef.hitscan,
            tracerLife: projectileDef.tracerLife,
            tracerRange: projectileDef.tracerRange,
            useRaycast: projectileDef.useRaycast,
        })

        this.attackProcess = false
    }

    protected logCanceled(
        reason: string,
        target: IPhysicsObject,
        expectedTargetId: string,
        currentTargetId: string,
        attackRange: number,
        validation?: MeleeValidationResult,
        distance?: number,
    ) {
        console.log("[CombatDebug] AttackCanceled", {
            actor: this.cfg.debugActor,
            reason,
            actorId: this.model.UUID,
            targetId: expectedTargetId,
            currentTargetId,
            actorPos: { x: this.model.Pos.x, y: this.model.Pos.y, z: this.model.Pos.z },
            targetPos: { x: target.Pos.x, y: target.Pos.y, z: target.Pos.z },
            distance: distance ?? this.GetTargetDistance(target),
            attackRange,
            validation: validation ?? MeleeValidationResult.InvalidTarget,
            boundsEmpty: target.Box.isEmpty(),
        })
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Idle / Dying / Run
// ────────────────────────────────────────────────────────────────────────────

export class IdleActorState extends ActorCombatState implements IActorState {
    constructor(
        states: ActorStates, model: IActorModel, gphysic: IGPhysic, spec: BaseSpec,
        cfg: ActorStateConfig, eventCtrl?: IEventController,
    ) {
        super(states, model, gphysic, spec, cfg, eventCtrl)
        this.Init()
    }
    Init(): void {
        this.model.ChangeAction(ActionType.Idle)
    }
    Uninit(): void { }
    Update(_delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkRun = this.CheckRun(v)
        if (checkRun != undefined) return checkRun
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        return this
    }
}

export class DyingActorState extends ActorCombatState implements IActorState {
    Init(): void {
        this.model.ChangeAction(ActionType.Dying)
        this.cfg.onDeathInit?.()
    }
    Uninit(): void { }
    Update(_delta: number, _v: THREE.Vector3, _target: IPhysicsObject): IActorState {
        return this
    }
}

export class RunActorState extends ActorCombatState implements IActorState {
    speed = this.spec.Speed

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3()

    Init(): void {
        this.model.ChangeAction(ActionType.Run)
    }
    Uninit(): void { }

    Update(_delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        if (this.StandDown(target)) {
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        const dist = this.GetTargetDistance(target)
        const checkAttack = this.CheckAttack(target, dist)
        if (checkAttack != undefined) return checkAttack

        if (v.x == 0 && v.z == 0) {
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        v.y = 0

        const lookDir = v.clone()
        lookDir.y = 0
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.model.Meshs.quaternion.copy(qt)
        }

        // 실제 이동은 컨트롤러의 applyVehiclePosition(Yuka Vehicle)이 담당한다.
        return this
    }
}

// ────────────────────────────────────────────────────────────────────────────
// 팩토리
// ────────────────────────────────────────────────────────────────────────────

/** 몬스터용 공격 타이밍: spec.AttackSpeed>0 이면 그 값, 아니면 애니 duration, 아니면 1. 초기 타이머 = 간격 */
export function monsterAttackTiming(model: IActorModel, spec: BaseSpec, action: ActionType) {
    const configuredAttackSpeed = spec.AttackSpeed
    const animationSpeed = configuredAttackSpeed > 0 ? configuredAttackSpeed : undefined
    const duration = model.ChangeAction(action, animationSpeed)
    const swingInterval = animationSpeed ?? duration ?? DEFAULT_ATTACK_SPEED
    return { swingInterval, initialTimer: swingInterval }
}

/** 아군용 공격 타이밍: 애니 자연속도 재생, 간격 = duration*0.8 (없으면 spec.AttackSpeed), 초기 타이머 = spec.AttackSpeed */
export function allyAttackTiming(model: IActorModel, spec: BaseSpec, action: ActionType) {
    let swingInterval = spec.AttackSpeed
    const duration = model.ChangeAction(action)
    if (duration != undefined) swingInterval = duration * 0.8
    return { swingInterval, initialTimer: spec.AttackSpeed }
}

function buildStateSet(
    model: IActorModel,
    gphysic: IGPhysic,
    eventCtrl: IEventController,
    spec: BaseSpec,
    cfg: ActorStateConfig,
): ActorStates {
    const defSt: ActorStates = {}
    defSt["IdleSt"] = new IdleActorState(defSt, model, gphysic, spec, cfg, eventCtrl)
    defSt["RunSt"] = new RunActorState(defSt, model, gphysic, spec, cfg, eventCtrl)
    defSt["AttackSt"] = new AttackActorState(defSt, model, gphysic, spec, cfg, eventCtrl)
    defSt["JumpSt"] = new JumpActorState(defSt, model, gphysic, spec, cfg, eventCtrl)
    defSt["HurtSt"] = new HurtActorState(defSt, model, gphysic, spec, cfg, eventCtrl)
    defSt["DyingSt"] = new DyingActorState(defSt, model, gphysic, spec, cfg, eventCtrl)
    return defSt
}

export { buildStateSet as BuildActorStateSet }
