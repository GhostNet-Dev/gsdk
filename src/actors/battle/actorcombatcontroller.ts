import * as THREE from "three"
import {
    FollowPathBehavior,
    Path,
    SeparationBehavior,
    Vehicle,
    Vector3 as YukaVector3,
} from "yuka"
import { IGPhysic } from "@Glibs/interface/igphysics"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { EffectType } from "@Glibs/types/effecttypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { StatKey } from "@Glibs/types/stattypes"
import { Buff } from "@Glibs/magical/buff/buff"
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem"
import { TargetDistanceMode, TargetRecord } from "@Glibs/systems/targeting/targettypes"
import { GetHorizontalDistanceToBoxSurface, MeleeValidationResult, PendingMeleeImpactContext } from "@Glibs/actors/battle/meleecombat"
import { GetEffectiveAttackRange, REACHABLE_NOPATH_THRESHOLD } from "@Glibs/actors/battle/combatrange"
import { AttackerRef, resolveAttackerId } from "@Glibs/actors/battle/combatattribution"
import { ThreatBook } from "@Glibs/actors/battle/threatbook"
import { ActorTargetAdapter } from "@Glibs/actors/battle/actortargetadapter"
import { IActorModel } from "@Glibs/actors/battle/iactormodel"
import { ProjectileWeaponDef, WeaponMode } from "@Glibs/actors/projectile/projectiletypes"
import { CombatDebugInfo, CombatDebugTeam } from "@Glibs/systems/debugger/combatdebugtypes"
import { LineOfSightTester } from "@Glibs/actors/battle/lineofsight"
import { INavGridService, NavPathStatus } from "@Glibs/systems/navigation/navtypes"
import { IYukaEntityManager } from "@Glibs/systems/navigation/yukaentitymanager"
import { TargetPolicyConfig, TargetSelectionPolicy } from "@Glibs/systems/targeting/targetselectionpolicy"
import { createTargetPolicy } from "@Glibs/systems/targeting/policies/targetpolicyfactory"
import { IActorState } from "@Glibs/actors/monsters/monstertypes"
import { MarchOrder, MonsterAdvancePhase } from "@Glibs/actors/battle/marchorder"
import {
    AttackActorState,
    DyingActorState,
    HurtActorState,
    JumpActorState,
} from "@Glibs/actors/battle/actorcombatstates"

// 진군 waypoint 도달 판정 반경(m). 종대 열 간격과 도로 반폭을 고려한다.
const MARCH_WAYPOINT_ARRIVE_RADIUS = 5
// 공성 접근 단계 A* 재계산 주기(초). 진군 중에는 경로가 크게 바뀌지 않으므로 전투 repath보다 길게 둔다.
const SIEGE_REPATH_INTERVAL = 1.5

// speed 스탯이 누락된 프리셋이 Vehicle maxSpeed = 0 으로 고정되어 영구 정지하는 것을 막는 하한.
export const MIN_MOVE_SPEED = 0.3

export type ActorControllerProperty = {
    id: string
    projectileDef?: ProjectileWeaponDef
    targetPolicy?: TargetPolicyConfig
}

export interface ActorCombatControllerOptions<P extends ActorControllerProperty> {
    id: number
    model: IActorModel
    gphysic: IGPhysic
    eventCtrl: IEventController
    property: P
    stats: Partial<Record<StatKey, number>>
    /** targetId / 버프 이벤트 접두어 ("mon" / "ally") */
    idPrefix: string
    idleStates: (...params: any[]) => IActorState
    /** 타겟 미해석 시 어댑터 TargetId 폴백 (몬스터 = player, 아군 = monster) */
    adapterEmptyTargetId: string
    /** 어댑터 위치 폴백 (몬스터 = 플레이어, 아군 = 없음) */
    adapterFallback?: IPhysicsObject
}

/**
 * 몬스터/아군 전투 컨트롤러의 공용 베이스. (설계 §5.2)
 * Yuka Vehicle 길찾기 / NavGrid 경로 / 타겟 해석·정책 / ThreatBook / 공격자 신원 배선 /
 * update 루프 템플릿을 전부 여기서 담당하고, 서브클래스는 사이드별 훅만 구현한다.
 */
export abstract class ActorCombatController<P extends ActorControllerProperty>
    implements ILoop, IActionUser {

    LoopId = 0
    baseSpec: BaseSpec
    currentState: IActorState
    idleState: IActorState
    moveDirection = new THREE.Vector3()
    public pendingAttackRange: PendingMeleeImpactContext["pendingAttackRange"] = 0
    public pendingKnockbackDist: PendingMeleeImpactContext["pendingKnockbackDist"] = 0

    protected readonly instanceId: number
    protected readonly property: P
    protected readonly gphysic: IGPhysic
    protected readonly eventCtrl: IEventController
    /** 액터 모델. `opts.model` 로 베이스가 직접 보유한다 (생성자 중 `RegisterLoop` 시점에 유효해야 함). */
    protected readonly model: IActorModel

    protected phybox: THREE.Mesh
    protected readonly targetId: string
    protected readonly targetAdapter: ActorTargetAdapter
    protected targetRegistry?: TargetRegistrySystem
    protected currentTarget?: TargetRecord
    protected readonly threatBook = new ThreatBook()
    protected readonly defaultTargetPolicy: TargetSelectionPolicy
    protected targetPolicy?: TargetSelectionPolicy
    protected lastPathStatus: NavPathStatus = NavPathStatus.Complete
    protected noPathStreak = 0
    protected currentTargetReachable = true
    private disposed = false
    private updateBuffEvent = ""
    private removeBuffEvent = ""
    protected lastSearchTime = 0
    protected readonly searchInterval = 500
    protected readonly _cp = new THREE.Vector3()
    protected readonly targetBounds = new THREE.Box3()
    protected readonly lineOfSight = new LineOfSightTester()
    private loggedNoTarget = false

    protected navGrid?: INavGridService
    protected yukaManager?: IYukaEntityManager
    protected vehicle?: Vehicle
    protected followPathBehavior?: FollowPathBehavior
    protected separationBehavior?: SeparationBehavior
    protected currentPathTargetId?: string
    protected currentPathGridVersion = -1
    protected nextRepathElapsed = 0
    private wasKnockbackHurt = false
    private wasNavigationSuspended = false
    protected readonly repathInterval = 0.35
    protected readonly repathJitter = Math.random() * 0.15
    private readonly vehicleVelocityDir = new THREE.Vector3()
    private readonly desiredVehiclePos = new THREE.Vector3()
    private readonly actualMove = new THREE.Vector3()
    private readonly directPathTarget = new THREE.Vector3()

    // 진군 명령 (PlayerDefense 등). 없으면 기존 동작과 동일하다.
    protected marchOrder?: MarchOrder
    protected marchWaypointIndex = 0
    protected advancePhase?: MonsterAdvancePhase
    private marchPathDirty = true
    private nextSiegeRepathElapsed = 0
    private siegePathGridVersion = -1

    protected readonly idPrefix: string

    // ── 사이드별 훅 ──────────────────────────────────────────────────────────
    protected abstract get aggroRange(): number
    protected abstract get debugTeam(): CombatDebugTeam
    /** [CombatDebug] 로그 라벨 접두어 ("monster" / "ally") */
    protected abstract get debugActor(): string
    /** NoTarget / TargetChanged 상세 로그 방출 여부 (아군 true, 몬스터 false — 기존 로깅 보존) */
    protected abstract get verboseTargetLogs(): boolean
    protected abstract createPhybox(id: number, size: THREE.Vector3): THREE.Mesh
    protected abstract createDefaultTargetPolicy(): TargetSelectionPolicy
    /** 정책이 폴백으로 쓸 등록 타겟 id (몬스터 = 플레이어 id, 아군 = undefined) */
    protected abstract getFallbackTargetId(): string | undefined

    // ── 이벤트 리스너 ──────────────────────────────────────────────────────────
    private readonly setTargetRegistry = (targetRegistry?: TargetRegistrySystem) => {
        this.targetRegistry = targetRegistry
    }
    private readonly setNavGrid = (navGrid?: INavGridService) => {
        this.navGrid = navGrid
    }
    private readonly setYukaManager = (manager?: IYukaEntityManager) => {
        this.yukaManager = manager
        this.ensureVehicle()
    }
    private readonly onUpdateBuff = (buff: Buff, level = 0) => {
        this.baseSpec.Buff(buff, level)
        this.applyVehicleSpeedFromSpec()
    }
    private readonly onRemoveBuff = (buff: Buff) => {
        this.baseSpec.RemoveBuff(buff)
        this.applyVehicleSpeedFromSpec()
    }
    private readonly onSetActorTargetPolicy = (msg?: { targetId?: string; targetIds?: string[]; policy?: TargetPolicyConfig }) => {
        if (!msg?.policy) return
        if (msg.targetId && msg.targetId !== this.targetId) return
        if (msg.targetIds && !msg.targetIds.includes(this.targetId)) return
        this.setTargetPolicy(msg.policy)
    }

    get Spec() { return this.baseSpec }
    get AdvancePhase() { return this.advancePhase }

    /** 진군 명령을 설정한다. waypoint는 몬스터별로 복제해 공유 배열 변경을 막는다. undefined면 해제한다. */
    setMarchOrder(order?: MarchOrder): void {
        this.clearMarchOrder()
        if (!order) return
        this.marchOrder = {
            siegeTargetId: order.siegeTargetId,
            waypoints: order.waypoints.map((waypoint) => waypoint.clone()),
        }
        this.advancePhase = this.resolveMarchPhase()
        this.lastSearchTime = 0
    }

    protected clearMarchOrder(): void {
        this.marchOrder = undefined
        this.marchWaypointIndex = 0
        this.advancePhase = undefined
        this.marchPathDirty = true
        this.nextSiegeRepathElapsed = 0
        this.siegePathGridVersion = -1
    }
    get TargetId() { return this.targetId }
    get objs() { return this.model.Meshs }

    setTargetPolicy(policyOrConfig: TargetSelectionPolicy | TargetPolicyConfig): void {
        this.targetPolicy = "selectTarget" in policyOrConfig
            ? policyOrConfig
            : createTargetPolicy(policyOrConfig)
        this.lastSearchTime = 0
    }

    constructor(opts: ActorCombatControllerOptions<P>) {
        const { id, model, gphysic, eventCtrl, property, stats } = opts
        this.instanceId = id
        this.model = model
        this.property = property
        this.gphysic = gphysic
        this.eventCtrl = eventCtrl
        this.idPrefix = opts.idPrefix

        this.baseSpec = new BaseSpec(stats, this)
        this.baseSpec.lastUsedWeaponMode = property.projectileDef ? WeaponMode.Ranged : WeaponMode.Melee

        this.targetId = `${this.idPrefix}:${property.id}:${id}`
        this.targetAdapter = new ActorTargetAdapter(opts.adapterEmptyTargetId, opts.adapterFallback)
        this.defaultTargetPolicy = this.createDefaultTargetPolicy()
        this.targetPolicy = property.targetPolicy
            ? createTargetPolicy(property.targetPolicy)
            : undefined

        this.idleState = this.currentState = opts.idleStates(id, model, property, gphysic, eventCtrl, this.baseSpec)

        this.phybox = this.createPhybox(id, model.Size)
        this.phybox.visible = false
        this.phybox.position.copy(model.Pos)

        this.updateBuffEvent = EventTypes.UpdateBuff + this.idPrefix + id
        this.removeBuffEvent = EventTypes.RemoveBuff + this.idPrefix + id
        eventCtrl.RegisterEventListener(this.updateBuffEvent, this.onUpdateBuff)
        eventCtrl.RegisterEventListener(this.removeBuffEvent, this.onRemoveBuff)
        eventCtrl.RegisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry)
        eventCtrl.RegisterEventListener(EventTypes.RegisterNavGridService, this.setNavGrid)
        eventCtrl.RegisterEventListener(EventTypes.RegisterYukaEntityManager, this.setYukaManager)
        eventCtrl.RegisterEventListener(EventTypes.SetActorTargetPolicy, this.onSetActorTargetPolicy)

        // RegisterLoop / Request* 는 동기 응답(예: 이미 떠 있는 YukaEntityManager → ensureVehicle)이
        // 생성자 완료 전에 재진입할 수 있으므로, 컨트롤러가 완전히 구성된 뒤 마지막에 보낸다.
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.SendEventMessage(EventTypes.RequestTargetSystem)
        eventCtrl.SendEventMessage(EventTypes.RequestNavGridService)
        eventCtrl.SendEventMessage(EventTypes.RequestYukaEntityManager)
    }

    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }

    Dispose(): void {
        if (this.disposed) return
        this.disposed = true
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        this.eventCtrl.DeregisterEventListener(this.updateBuffEvent, this.onUpdateBuff)
        this.eventCtrl.DeregisterEventListener(this.removeBuffEvent, this.onRemoveBuff)
        this.eventCtrl.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry)
        this.eventCtrl.DeregisterEventListener(EventTypes.RegisterNavGridService, this.setNavGrid)
        this.eventCtrl.DeregisterEventListener(EventTypes.RegisterYukaEntityManager, this.setYukaManager)
        this.eventCtrl.DeregisterEventListener(EventTypes.SetActorTargetPolicy, this.onSetActorTargetPolicy)
        if (this.vehicle) {
            this.yukaManager?.remove(this.vehicle)
            this.vehicle = undefined
        }
    }

    /** 스폰/리스폰 시 상태 초기화. `Respawning()` / `Summoned()` 가 위임한다. (설계 §5.2) */
    protected resetForSpawn(): void {
        this.baseSpec.ResetStatus()
        this.model.SetOpacity(1)
        this.currentState = this.idleState
        this.currentState.Init()
        this.phybox.position.copy(this.model.Pos)
        this.currentPathTargetId = undefined
        this.currentPathGridVersion = -1
        this.wasKnockbackHurt = false
        this.wasNavigationSuspended = false
        this.noPathStreak = 0
        this.currentTargetReachable = true
        this.threatBook.clear()
        // 재사용/리스폰 시 이전 전투의 타겟·경로·진군 명령이 남지 않게 한다.
        this.currentTarget = undefined
        this.targetAdapter.Target = undefined
        this.lastSearchTime = 0
        this.nextRepathElapsed = 0
        if (this.followPathBehavior) {
            this.followPathBehavior.path = new Path()
            this.followPathBehavior.active = false
        }
        this.clearMarchOrder()
        this.syncVehicleFromMesh()
    }

    GetDebugInfo(): CombatDebugInfo {
        const targetBounds = this.getDebugTargetBounds(this.currentTarget)
        const targetCenter = targetBounds
            ? targetBounds.getCenter(new THREE.Vector3())
            : this.currentTarget ? this.targetGeomObject(this.currentTarget).position.clone() : undefined

        return {
            team: this.debugTeam,
            targetId: this.targetId,
            damageBox: this.phybox,
            box: new THREE.Box3().setFromObject(this.phybox),
            centerPos: this.model.CenterPos.clone(),
            moveDirection: this.moveDirection.clone(),
            attackRange: this.getEffectiveAttackRange(),
            currentTargetId: this.currentTarget?.id,
            currentTargetBounds: targetBounds,
            currentTargetCenter: targetCenter,
        }
    }

    update(delta: number): void {
        if (!this.model.Visible) return

        this.ensureVehicle()
        this.applyVehiclePosition(delta)
        this.threatBook.decay()
        this.targetAdapter.update()
        const target = this.resolveTarget()

        if (this.Spec.Health > 0 && this.marchOrder && !this.isValidTarget(this.currentTarget)) {
            // 진군 명령이 있으면 범위 안 적이 없을 때 player 폴백 대신 도로/공성 목표로 이동한다.
            this.loggedNoTarget = false
            this.updateMarch(delta)
        } else if (this.Spec.Health > 0 && this.targetAdapter.HasTarget) {
            this.loggedNoTarget = false
            if (this.marchOrder && this.advancePhase !== MonsterAdvancePhase.Combat) {
                this.advancePhase = MonsterAdvancePhase.Combat
                this.currentPathTargetId = undefined
            }
            this.updateNavigation(delta, target)
        } else {
            if (this.verboseTargetLogs && this.Spec.Health > 0 && !this.currentTarget && !this.loggedNoTarget) {
                console.log("[CombatDebug] NoTarget", {
                    actor: this.debugActor,
                    actorId: this.targetId,
                    targetId: undefined,
                    currentTargetId: undefined,
                    actorPos: { x: this.model.Pos.x, y: this.model.Pos.y, z: this.model.Pos.z },
                    targetPos: undefined,
                    distance: undefined,
                    attackRange: undefined,
                    validation: undefined,
                    boundsEmpty: undefined,
                })
                this.loggedNoTarget = true
            }
            this.moveDirection.set(0, 0, 0)
            if (this.followPathBehavior) this.followPathBehavior.active = false
        }

        this.currentState = this.currentState.Update(delta, this.moveDirection, target)
        this.applyStateNavigationMode()

        this.model.update(delta)

        this.phybox.position.copy(this.model.Pos)
        this.phybox.rotation.copy(this.model.Meshs.rotation)
        this.phybox.position.y += this.model.Size.y / 2
    }

    protected getEffectiveAttackRange(): number {
        return GetEffectiveAttackRange(this.Spec, this.property.projectileDef?.range)
    }

    private getMoveSpeed(): number {
        return Math.max(this.Spec.Speed, MIN_MOVE_SPEED)
    }

    private applyVehicleSpeedFromSpec() {
        if (!this.vehicle) return
        const speed = this.getMoveSpeed()
        this.vehicle.maxSpeed = speed
        this.vehicle.maxForce = Math.max(20, speed * 12)
    }

    protected ensureVehicle() {
        if (this.vehicle || !this.yukaManager) return

        const vehicle = new Vehicle()
        vehicle.name = this.targetId
        const speed = this.getMoveSpeed()
        vehicle.maxSpeed = speed
        vehicle.maxForce = Math.max(20, speed * 12)
        vehicle.boundingRadius = Math.max(this.model.Size.x, this.model.Size.z) * 0.5
        vehicle.neighborhoodRadius = Math.max(3, vehicle.boundingRadius * 4)
        vehicle.updateNeighborhood = true
        vehicle.updateOrientation = false
        vehicle.position.set(this.model.Pos.x, this.model.Pos.y, this.model.Pos.z)

        const followPath = new FollowPathBehavior(new Path(), 0.75)
        followPath.active = false
        const separation = new SeparationBehavior()
        separation.weight = 0.45
        vehicle.steering.add(followPath)
        vehicle.steering.add(separation)

        this.vehicle = vehicle
        this.followPathBehavior = followPath
        this.separationBehavior = separation
        this.yukaManager.add(vehicle)
    }

    protected syncVehicleFromMesh() {
        if (!this.vehicle) return
        this.vehicle.position.set(this.model.Pos.x, this.model.Pos.y, this.model.Pos.z)
        this.vehicle.velocity.set(0, 0, 0)
    }

    private applyVehiclePosition(delta: number) {
        const vehicle = this.vehicle
        if (!vehicle || this.isNavigationSuspended()) {
            this.syncVehicleFromMesh()
            return
        }

        this.desiredVehiclePos.set(vehicle.position.x, vehicle.position.y, vehicle.position.z)
        this.desiredVehiclePos.y = this.navGrid?.getHeightAt(
            this.desiredVehiclePos.x,
            this.desiredVehiclePos.z,
            this.model.Pos.y,
        ) ?? this.model.Pos.y

        this.actualMove.subVectors(this.desiredVehiclePos, this.model.Pos)
        const horizontalMove = this.actualMove.clone()
        horizontalMove.y = 0

        if (horizontalMove.lengthSq() > 0.0001) {
            const dir = horizontalMove.clone().normalize()
            const hit = this.gphysic.CheckDirection(this.model, dir, this.getMoveSpeed())
            if (hit.obj && horizontalMove.length() >= Math.max(0, hit.distance)) {
                this.syncVehicleFromMesh()
            } else {
                this.model.Pos.copy(this.desiredVehiclePos)
            }
        } else {
            this.model.Pos.y = this.desiredVehiclePos.y
        }

        this.vehicleVelocityDir.set(vehicle.velocity.x, 0, vehicle.velocity.z)
        if (this.vehicleVelocityDir.lengthSq() > 0.0025) {
            this.moveDirection.copy(this.vehicleVelocityDir.normalize())
        } else if (delta > 0 && this.actualMove.lengthSq() > 0.0001) {
            this.moveDirection.copy(this.actualMove).setY(0).normalize()
        } else {
            this.moveDirection.set(0, 0, 0)
        }
    }

    private updateNavigation(delta: number, target: IPhysicsObject) {
        const vehicle = this.vehicle
        const follow = this.followPathBehavior
        if (!vehicle || !follow || this.isNavigationSuspended()) {
            this.moveDirection.set(0, 0, 0)
            return
        }

        const attackRange = this.getEffectiveAttackRange()
        const targetDistance = GetHorizontalDistanceToBoxSurface(this.model.Pos, target.Box, target.Pos, this._cp)
        if (targetDistance <= attackRange * 0.92 && this.canAttackFromCurrentTarget()) {
            follow.active = false
            vehicle.velocity.set(0, 0, 0)
            this.moveDirection.set(0, 0, 0)
            return
        }

        this.nextRepathElapsed -= delta
        const targetId = this.currentTarget?.id ?? target.UUID
        const gridVersion = this.navGrid?.Version ?? -1
        const targetChanged = this.currentPathTargetId !== targetId
        const gridChanged = this.currentPathGridVersion !== gridVersion
        const forceRepath = targetChanged || gridChanged
        const needsPath = !follow.active || forceRepath || this.nextRepathElapsed <= 0

        if (!needsPath || (!forceRepath && this.nextRepathElapsed > 0)) return

        this.nextRepathElapsed = this.repathInterval + this.repathJitter
        if (targetChanged) {
            this.noPathStreak = 0
            this.currentTargetReachable = true
        }
        this.currentPathTargetId = targetId
        this.currentPathGridVersion = gridVersion
        const waypoints = this.resolveWaypoints(target)
        this.applyPath(waypoints, target)
    }

    private resolveWaypoints(target: IPhysicsObject): THREE.Vector3[] {
        if (this.currentTarget && !this.navGrid?.IsReady) {
            this.lastPathStatus = NavPathStatus.NoGrid
        } else if (this.currentTarget && this.navGrid) {
            const path = this.navGrid.findPath({
                start: this.model.Pos,
                target: this.currentTarget,
                attackRange: this.getEffectiveAttackRange(),
            })
            this.lastPathStatus = path.status
            if (path.status === NavPathStatus.Complete) {
                this.noPathStreak = 0
                this.currentTargetReachable = true
                if (path.waypoints.length > 0) return path.waypoints
            } else if (path.status === NavPathStatus.NoPath) {
                this.noPathStreak++
                this.currentTargetReachable = this.noPathStreak < REACHABLE_NOPATH_THRESHOLD
            }
        }

        this.directPathTarget.copy(target.CenterPos)
        this.directPathTarget.y = this.navGrid?.getHeightAt(
            this.directPathTarget.x,
            this.directPathTarget.z,
            this.model.Pos.y,
        ) ?? this.model.Pos.y
        return [this.model.Pos.clone(), this.directPathTarget.clone()]
    }

    private resolveMarchPhase(): MonsterAdvancePhase {
        const waypointCount = this.marchOrder?.waypoints.length ?? 0
        return this.marchWaypointIndex < waypointCount
            ? MonsterAdvancePhase.RoadMarch
            : MonsterAdvancePhase.SiegeApproach
    }

    /** 일반 전투 타겟이 없을 때 도로 waypoint → 공성 목표 순으로 이동한다. 전투 후에는 중단 지점부터 재개한다. */
    private updateMarch(delta: number) {
        const order = this.marchOrder
        const vehicle = this.vehicle
        const follow = this.followPathBehavior
        if (!order || !vehicle || !follow || this.isNavigationSuspended()) {
            this.moveDirection.set(0, 0, 0)
            return
        }

        const pos = this.model.Pos
        let advanced = false
        while (this.marchWaypointIndex < order.waypoints.length) {
            const waypoint = order.waypoints[this.marchWaypointIndex]
            const dx = waypoint.x - pos.x
            const dz = waypoint.z - pos.z
            if ((dx * dx) + (dz * dz) > MARCH_WAYPOINT_ARRIVE_RADIUS * MARCH_WAYPOINT_ARRIVE_RADIUS) break
            this.marchWaypointIndex++
            advanced = true
        }

        const phase = this.resolveMarchPhase()
        if (this.advancePhase !== phase) {
            // 전투 → 진군 복귀 또는 도로 → 공성 전환
            this.advancePhase = phase
            this.marchPathDirty = true
            this.currentPathTargetId = undefined
        }

        if (phase === MonsterAdvancePhase.RoadMarch) {
            // 도로 구간은 A* 대신 도로 기하를 그대로 따른다. 지나간 waypoint는 Yuka Path가 처리하므로
            // 시작/재개 시점과 남은 waypoint가 바뀐 시점에만 경로를 다시 만든다.
            if (!this.marchPathDirty && !advanced && follow.active) return
            this.marchPathDirty = false
            this.applyMarchPath([pos.clone(), ...order.waypoints.slice(this.marchWaypointIndex)])
            return
        }

        this.updateSiegeApproach(delta, order)
    }

    private updateSiegeApproach(delta: number, order: MarchOrder) {
        const follow = this.followPathBehavior!
        this.nextSiegeRepathElapsed -= delta
        const gridVersion = this.navGrid?.Version ?? -1
        const needsPath = this.marchPathDirty
            || !follow.active
            || gridVersion !== this.siegePathGridVersion
            || this.nextSiegeRepathElapsed <= 0
        if (!needsPath) return

        this.marchPathDirty = false
        this.nextSiegeRepathElapsed = SIEGE_REPATH_INTERVAL + this.repathJitter
        this.siegePathGridVersion = gridVersion

        const siegeTarget = this.targetRegistry?.get(order.siegeTargetId)
        if (!siegeTarget?.alive) {
            this.moveDirection.set(0, 0, 0)
            follow.active = false
            return
        }

        const goal = siegeTarget.bounds && !siegeTarget.bounds.isEmpty()
            ? siegeTarget.bounds.getCenter(new THREE.Vector3())
            : this.targetGeomObject(siegeTarget).position.clone()
        const path = this.navGrid?.findPathToPoint(this.model.Pos, goal)
        if (path?.status === NavPathStatus.Complete && path.waypoints.length > 0) {
            this.applyMarchPath(path.waypoints)
            return
        }

        // NavGrid가 없거나 경로를 못 찾으면 CC까지 직선 이동으로 대체한다.
        goal.y = this.navGrid?.getHeightAt(goal.x, goal.z, this.model.Pos.y) ?? this.model.Pos.y
        this.applyMarchPath([this.model.Pos.clone(), goal])
    }

    /** 첫 점(현재 위치)을 제외한 waypoint로 Yuka Path를 구성한다. */
    private applyMarchPath(waypoints: THREE.Vector3[]) {
        const vehicle = this.vehicle
        const follow = this.followPathBehavior
        if (!vehicle || !follow) return

        const path = new Path()
        path.loop = false
        for (let i = 1; i < waypoints.length; i++) {
            const waypoint = waypoints[i]
            const y = this.navGrid?.getHeightAt(waypoint.x, waypoint.z, waypoint.y) ?? waypoint.y
            path.add(new YukaVector3(waypoint.x, y, waypoint.z))
        }
        follow.path = path
        follow.active = waypoints.length > 1
        vehicle.position.set(this.model.Pos.x, this.model.Pos.y, this.model.Pos.z)
    }

    private applyPath(waypoints: THREE.Vector3[], target: IPhysicsObject) {
        const vehicle = this.vehicle
        const follow = this.followPathBehavior
        if (!vehicle || !follow || waypoints.length === 0) return

        const path = new Path()
        path.loop = false
        let waypointCount = 0
        let lastWaypoint: THREE.Vector3 | undefined

        // NavGrid 경로의 첫 점은 현재 위치를 스냅한 셀 중심이다. 재경로마다 이 점을 다시
        // 추종하면 진행 방향과 반대로 되돌아가는 현상이 생기므로 이동 경로에서는 제외한다.
        for (let i = 1; i < waypoints.length; i++) {
            const waypoint = waypoints[i]
            path.add(new YukaVector3(waypoint.x, waypoint.y, waypoint.z))
            lastWaypoint = waypoint
            waypointCount++
        }

        // 유닛 경로는 타겟의 셀 중심에서 끝난다. 같은 셀에 있거나 타겟이 이동한 경우에도
        // 실제 위치까지 계속 접근할 수 있도록 현재 타겟 위치를 마지막 점으로 보강한다.
        if (this.currentTarget?.kind !== "structure") {
            this.directPathTarget.copy(target.CenterPos)
            this.directPathTarget.y = this.navGrid?.getHeightAt(
                this.directPathTarget.x,
                this.directPathTarget.z,
                this.model.Pos.y,
            ) ?? this.model.Pos.y
            const dx = lastWaypoint ? lastWaypoint.x - this.directPathTarget.x : 0
            const dz = lastWaypoint ? lastWaypoint.z - this.directPathTarget.z : 0
            const needsTargetWaypoint = !lastWaypoint || (dx * dx) + (dz * dz) > 0.01
            if (needsTargetWaypoint) {
                path.add(new YukaVector3(
                    this.directPathTarget.x,
                    this.directPathTarget.y,
                    this.directPathTarget.z,
                ))
                waypointCount++
            }
        }
        follow.path = path
        follow.active = waypointCount > 0
        vehicle.position.set(this.model.Pos.x, this.model.Pos.y, this.model.Pos.z)
    }

    private applyStateNavigationMode() {
        const suspended = this.isNavigationSuspended()
        const inKnockbackHurt = this.currentState instanceof HurtActorState
            && this.currentState.suspendsNavigation

        if (this.wasKnockbackHurt && !inKnockbackHurt) {
            // 넉백 Hurt 종료 프레임에는 얼어있던 repath 타이머를 무효화한다.
            this.nextRepathElapsed = 0
        }
        if (this.wasNavigationSuspended && !suspended && this.currentState instanceof HurtActorState) {
            // Attack/Jump 등에서 넉백 없는 Hurt 로 넘어온 경우 꺼져 있던 followPath 를 즉시 복구한다.
            this.nextRepathElapsed = 0
        }
        this.wasKnockbackHurt = inKnockbackHurt
        this.wasNavigationSuspended = suspended

        if (this.followPathBehavior) this.followPathBehavior.active = !suspended && this.followPathBehavior.active
        if (this.separationBehavior) this.separationBehavior.active = !suspended
        if (suspended) this.syncVehicleFromMesh()
    }

    /** Attack/Jump/Dying 상태, 넉백 Hurt 또는 사망 시 Yuka 네비 정지. */
    protected isNavigationSuspended(): boolean {
        if (this.currentState instanceof HurtActorState) {
            return this.currentState.suspendsNavigation
        }
        return this.currentState instanceof AttackActorState
            || this.currentState instanceof JumpActorState
            || this.currentState instanceof DyingActorState
            || this.Spec.Health <= 0
    }

    ReceiveDemage(damage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number, attacker?: AttackerRef): boolean {
        if (this.Spec.Health <= 0) return false
        this.model.DamageEffect(damage, effect)

        // 타격 시의 사거리 및 넉백 정보 보관
        this.pendingAttackRange = attackRange ?? 0
        this.pendingKnockbackDist = knockbackDist ?? 0

        const attackerId = resolveAttackerId(attacker, this.targetRegistry, this.targetId)
        if (attackerId) this.threatBook.record(attackerId, damage)

        this.Spec.ReceiveCalcDamage(damage)
        return this.Spec.Health > 0
    }

    ValidateMeleeAttackTarget(targetId: string, attackRange: number): MeleeValidationResult {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return MeleeValidationResult.InvalidTarget
        if (!target.alive) return MeleeValidationResult.DeadTarget
        if (!target.targetable || !target.collidable) return MeleeValidationResult.InvalidTarget

        const dist = GetHorizontalDistanceToBoxSurface(this.model.Pos, this.targetAdapter.Box, this.targetGeomObject(target).position, this._cp)
        if (dist > attackRange) return MeleeValidationResult.OutOfRange
        if (this.isTargetLineOfSightBlocked(target, `${this.debugActor}:melee-validate`)) return MeleeValidationResult.InvalidTarget
        return MeleeValidationResult.InRange
    }

    ValidateRangedAttackTarget(targetId: string, attackRange: number): boolean {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return false
        if (!target.alive || !target.targetable || !target.collidable) return false

        if (GetHorizontalDistanceToBoxSurface(this.model.Pos, this.targetAdapter.Box, this.targetGeomObject(target).position, this._cp) > attackRange) {
            return false
        }
        return !this.isTargetLineOfSightBlocked(target, `${this.debugActor}:ranged-validate`)
    }

    private resolveTarget(): IPhysicsObject {
        const previousTargetId = this.currentTarget?.id
        this.currentTarget = this.findRegistryTarget()
        if (previousTargetId !== this.currentTarget?.id) {
            this.noPathStreak = 0
            this.currentTargetReachable = true
        }
        this.targetAdapter.Target = this.currentTarget
        const currentTargetId = this.currentTarget?.id
        if (this.verboseTargetLogs && previousTargetId !== currentTargetId) {
            console.log("[CombatDebug] TargetChanged", {
                actor: this.debugActor,
                actorId: this.targetId,
                targetId: currentTargetId,
                currentTargetId,
                previousTargetId,
                actorPos: { x: this.model.Pos.x, y: this.model.Pos.y, z: this.model.Pos.z },
                targetPos: this.currentTarget
                    ? {
                        x: this.currentTarget.object.position.x,
                        y: this.currentTarget.object.position.y,
                        z: this.currentTarget.object.position.z,
                    }
                    : undefined,
                distance: undefined,
                attackRange: undefined,
                validation: undefined,
                boundsEmpty: undefined,
            })
        }
        return this.targetAdapter
    }

    private findRegistryTarget(): TargetRecord | undefined {
        const registry = this.targetRegistry
        if (!registry) return undefined

        const now = Date.now()
        const current = this.currentTarget
        const hasNewThreat = this.threatBook.hasNewSince(this.lastSearchTime)
        if (this.isValidTarget(current) && !hasNewThreat) {
            if (now - this.lastSearchTime < this.searchInterval) return current
        }

        this.lastSearchTime = now
        const query = {
            aliveOnly: true,
            targetableOnly: true,
            collidableOnly: true,
            kinds: ["unit", "structure"] as TargetRecord["kind"][],
            distanceMode: TargetDistanceMode.BoundsSurface,
        }
        const selectionPolicy = this.targetPolicy
            ?? registry.resolveSelectionPolicy(this.defaultTargetPolicy)
        return registry.selectTarget({
            selfId: this.targetId,
            selfTeamId: registry.get(this.targetId)?.teamId,
            selfPos: this.model.Pos,
            maxDistance: this.aggroRange,
            currentTargetId: current?.id,
            currentTargetReachable: this.currentTargetReachable,
            fallbackTargetId: this.marchOrder ? undefined : this.getFallbackTargetId(),
            threats: this.threatBook.list(now),
            registry,
            query,
        }, selectionPolicy) ?? this.resolveSiegeTarget(registry)
    }

    /** 진군 중 범위 안 적이 없으면, aggroRange 안에 들어온 공성 목표를 일반 전투 타겟으로 승격한다. */
    private resolveSiegeTarget(registry: TargetRegistrySystem): TargetRecord | undefined {
        if (!this.marchOrder) return undefined
        const siegeTarget = registry.get(this.marchOrder.siegeTargetId)
        return this.isValidTarget(siegeTarget) ? siegeTarget : undefined
    }

    private isValidTarget(target?: TargetRecord): target is TargetRecord {
        if (!target?.alive || !target.targetable || !target.collidable) return false
        if (GetHorizontalDistanceToBoxSurface(this.model.Pos, this.getTargetBounds(target), this.targetGeomObject(target).position, this._cp) > this.aggroRange) return false
        return this.targetRegistry?.isHostile(this.targetId, target.id) ?? false
    }

    // 전투·이동 기하 판정 기준 오브젝트 (히트박스 우선, 없으면 비주얼 모델).
    private targetGeomObject(target: TargetRecord): THREE.Object3D {
        return target.colliderObject ?? target.object
    }

    private getTargetBounds(target: TargetRecord): THREE.Box3 | undefined {
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            return target.bounds
        }

        this.targetBounds.setFromObject(this.targetGeomObject(target))
        return this.targetBounds.isEmpty() ? undefined : this.targetBounds
    }

    private canAttackFromCurrentTarget(): boolean {
        if (!this.currentTarget) return true
        return !this.isTargetLineOfSightBlocked(this.currentTarget, `${this.debugActor}:nav-gate`)
    }

    private isTargetLineOfSightBlocked(target: TargetRecord, debugLabel: string): boolean {
        return this.lineOfSight.isBlocked(
            this.model.CenterPos,
            this.targetAdapter.CenterPos,
            this.gphysic.GetObjects(),
            this.model.Size.x,
            {
                ignoreObjects: [target.object, this.model.Meshs],
                ignoreStructureId: target.kind === "structure" ? target.id : undefined,
                targetRegistry: this.targetRegistry,
                debugLabel,
            },
        )
    }

    private getDebugTargetBounds(target?: TargetRecord): THREE.Box3 | undefined {
        if (!target) return undefined
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            return target.bounds.clone()
        }

        const bounds = new THREE.Box3().setFromObject(this.targetGeomObject(target))
        return bounds.isEmpty() ? undefined : bounds
    }
}
