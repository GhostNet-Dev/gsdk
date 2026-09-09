import * as THREE from "three";
import {
    FollowPathBehavior,
    Path,
    SeparationBehavior,
    Vehicle,
    Vector3 as YukaVector3,
} from "yuka";
import { AllyModel } from "./allymodel";
import { IAllyCtrl, AllyBox, AllyId, AllyProperty, IActorState } from "./allytypes";
import { AttackAllyState, DyingAllyState, HurtAllyState, JumpAllyState } from "./ally/allystate";
import { INavGridService, NavPathStatus } from "@Glibs/systems/navigation/navtypes";
import { IYukaEntityManager } from "@Glibs/systems/navigation/yukaentitymanager";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EffectType } from "@Glibs/types/effecttypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { StatKey } from "@Glibs/types/stattypes";
import { Buff } from "@Glibs/magical/buff/buff";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { TargetDistanceMode, TargetRecord, TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { GetHorizontalDistanceToBoxSurface, MeleeValidationResult, PendingMeleeImpactContext } from "@Glibs/actors/battle/meleecombat";
import { WeaponMode } from "@Glibs/actors/projectile/projectiletypes";
import { CombatDebugInfo, CombatDebugTeam } from "@Glibs/systems/debugger/combatdebugtypes";
import { LineOfSightTester } from "@Glibs/actors/battle/lineofsight";

// speed 스탯 누락 시 Vehicle maxSpeed = 0 고정을 막는 하한 (몬스터 monctrl.ts와 동일 방침).
const MIN_MOVE_SPEED = 0.3

// 타겟 레코드를 IPhysicsObject로 래핑하여 TargetId를 state machine에 전달
class AllyTargetAdapter implements IPhysicsObject {
    private static readonly fallbackBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    private target?: TargetRecord
    private velocity = 0
    private readonly size = new THREE.Vector3(1, 1, 1)
    private readonly centerPos = new THREE.Vector3()
    private readonly headPos = new THREE.Vector3()
    private readonly box = new THREE.Box3()
    private isDirty = true

    // 플레이어 위치를 폴백으로 사용하지 않음: 아군은 타겟 없으면 제자리 대기
    private static readonly ZERO = new THREE.Vector3()

    get HasTarget() { return this.target != undefined }
    get TargetId() { return this.target?.id ?? TargetTeamId.Monster }

    set Target(record: TargetRecord | undefined) {
        if (this.target !== record) {
            this.target = record
            this.isDirty = true
        }
    }

    get Velocity() { return this.velocity }
    set Velocity(n: number) { this.velocity = n }

    get Size(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.size
    }
    get CBox(): THREE.Mesh { return AllyTargetAdapter.fallbackBoxMesh }
    get BoxPos(): THREE.Vector3 { return this.CenterPos }
    get Box(): THREE.Box3 {
        if (this.isDirty) this.updateCache()
        return this.box
    }
    get HeadPos(): THREE.Vector3 {
        this.headPos.copy(this.CenterPos)
        this.headPos.y += this.Size.y / 2
        return this.headPos
    }
    get CenterPos(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.centerPos
    }
    get Pos(): THREE.Vector3 {
        return this.target?.object.position ?? AllyTargetAdapter.ZERO
    }
    set Visible(flag: boolean) {
        const object = this.target?.object
        if (object) object.visible = flag
    }
    get Meshs(): THREE.Group | THREE.Mesh {
        const object = this.target?.object
        if (object instanceof THREE.Group || object instanceof THREE.Mesh) return object
        return AllyTargetAdapter.fallbackBoxMesh
    }
    get UUID(): string { return this.target?.object.uuid ?? "" }

    update() { this.isDirty = true }

    private updateCache() {
        const target = this.target
        const object = target?.object
        if (!object) {
            this.box.makeEmpty()
            this.size.set(1, 1, 1)
            this.centerPos.copy(AllyTargetAdapter.ZERO)
            this.isDirty = false
            return
        }
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            this.box.copy(target.bounds)
        } else {
            // 거리/사거리 판정은 히트박스(colliderObject) 기준. 비주얼 모델 그룹은
            // 네임플레이트·이펙터 자식으로 AABB가 부풀어 조기 정지를 유발한다.
            this.box.setFromObject(target.colliderObject ?? object)
        }
        if (this.box.isEmpty()) {
            this.size.set(1, 1, 1)
            this.centerPos.copy(object.position)
        } else {
            this.box.getSize(this.size)
            this.box.getCenter(this.centerPos)
        }
        this.isDirty = false
    }
}

export class AllyCtrl implements ILoop, IAllyCtrl, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec = new BaseSpec(this.stats, this)
    currentState: IActorState
    idleState: IActorState
    dir = new THREE.Vector3()
    moveDirection = new THREE.Vector3()
    public pendingAttackRange: PendingMeleeImpactContext["pendingAttackRange"] = 0
    public pendingKnockbackDist: PendingMeleeImpactContext["pendingKnockbackDist"] = 0

    private phybox: AllyBox
    private readonly targetId: string
    private readonly targetAdapter = new AllyTargetAdapter()
    private targetRegistry?: TargetRegistrySystem
    private currentTarget?: TargetRecord
    private disposed = false
    private updateBuffEvent = ""
    private removeBuffEvent = ""
    private readonly aggroRange = 60
    private lastSearchTime = 0
    private readonly searchInterval = 500
    private readonly _cp = new THREE.Vector3()
    private readonly targetBounds = new THREE.Box3()
    private readonly lineOfSight = new LineOfSightTester()
    private loggedNoTarget = false

    private navGrid?: INavGridService
    private yukaManager?: IYukaEntityManager
    private vehicle?: Vehicle
    private followPathBehavior?: FollowPathBehavior
    private separationBehavior?: SeparationBehavior
    private currentPathTargetId?: string
    private currentPathGridVersion = -1
    private nextRepathElapsed = 0
    private readonly repathInterval = 0.35
    private readonly repathJitter = Math.random() * 0.15
    private readonly vehicleVelocityDir = new THREE.Vector3()
    private readonly desiredVehiclePos = new THREE.Vector3()
    private readonly actualMove = new THREE.Vector3()
    private readonly directPathTarget = new THREE.Vector3()

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

    get AllyBox() { return this.phybox }
    get Spec() { return this.baseSpec }
    get TargetId() { return this.targetId }
    get DeckLevel() { return this.deckLevel }
    get objs() { return this.allyModel.Meshs }

    constructor(
        id: number,
        private readonly deckLevel: number,
        private allyModel: AllyModel,
        private gphysic: IGPhysic,
        private eventCtrl: IEventController,
        private property: AllyProperty,
        private stats: Partial<Record<StatKey, number>>,
    ) {
        this.targetId = `ally:${property.id}:${id}`
        this.baseSpec.lastUsedWeaponMode = property.projectileDef ? WeaponMode.Ranged : WeaponMode.Melee

        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

        const size = allyModel.Size
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true })

        this.idleState = this.currentState = property.idleStates!(
            id, this.allyModel, this.property, this.gphysic, this.eventCtrl, this.baseSpec
        )

        this.phybox = new AllyBox(id, "ally", property.id, geometry, material)
        this.phybox.visible = false
        this.phybox.position.copy(this.allyModel.Pos)

        this.updateBuffEvent = EventTypes.UpdateBuff + "ally" + id
        this.removeBuffEvent = EventTypes.RemoveBuff + "ally" + id
        eventCtrl.RegisterEventListener(this.updateBuffEvent, this.onUpdateBuff)
        eventCtrl.RegisterEventListener(this.removeBuffEvent, this.onRemoveBuff)
        eventCtrl.RegisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry)
        eventCtrl.RegisterEventListener(EventTypes.RegisterNavGridService, this.setNavGrid)
        eventCtrl.RegisterEventListener(EventTypes.RegisterYukaEntityManager, this.setYukaManager)
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
        if (this.vehicle) {
            this.yukaManager?.remove(this.vehicle)
            this.vehicle = undefined
        }
    }

    Summoned(): void {
        this.baseSpec.ResetStatus()
        this.allyModel.SetOpacity(1)
        this.currentState = this.idleState
        this.currentState.Init()
        this.AllyBox.position.copy(this.allyModel.Pos)
        this.currentPathTargetId = undefined
        this.currentPathGridVersion = -1
        this.syncVehicleFromMesh()
    }

    GetDebugInfo(): CombatDebugInfo {
        const targetBounds = this.getDebugTargetBounds(this.currentTarget)
        const targetCenter = targetBounds
            ? targetBounds.getCenter(new THREE.Vector3())
            : this.currentTarget ? this.targetGeomObject(this.currentTarget).position.clone() : undefined

        return {
            team: CombatDebugTeam.Ally,
            targetId: this.targetId,
            damageBox: this.AllyBox,
            box: new THREE.Box3().setFromObject(this.AllyBox),
            centerPos: this.allyModel.CenterPos.clone(),
            moveDirection: this.moveDirection.clone(),
            attackRange: this.Spec.AttackRange,
            currentTargetId: this.currentTarget?.id,
            currentTargetBounds: targetBounds,
            currentTargetCenter: targetCenter,
        }
    }

    update(delta: number): void {
        if (!this.allyModel.Visible) return

        this.ensureVehicle()
        this.applyVehiclePosition(delta)
        this.targetAdapter.update()
        const target = this.resolveTarget()

        if (this.Spec.Health > 0 && this.currentTarget) {
            this.loggedNoTarget = false
            // 이동 중 LoS 정지 게이트 제거 (§6.1-A). LoS는 공격 검증에서만 사용.
            this.updateNavigation(delta, target)
        } else {
            if (this.Spec.Health > 0 && !this.currentTarget && !this.loggedNoTarget) {
                console.log("[CombatDebug] NoTarget", {
                    actor: "ally",
                    actorId: this.targetId,
                    targetId: undefined,
                    currentTargetId: undefined,
                    actorPos: {
                        x: this.allyModel.Pos.x,
                        y: this.allyModel.Pos.y,
                        z: this.allyModel.Pos.z,
                    },
                    targetPos: undefined,
                    distance: undefined,
                    attackRange: undefined,
                    validation: undefined,
                    boundsEmpty: undefined,
                })
                this.loggedNoTarget = true
            }
            // 타겟이 없으면 제자리 대기 (AllyTargetAdapter는 의도적으로 플레이어 폴백이 없음).
            this.moveDirection.set(0, 0, 0)
            if (this.followPathBehavior) this.followPathBehavior.active = false
        }

        this.currentState = this.currentState.Update(delta, this.moveDirection, target)
        this.applyStateNavigationMode()
        this.allyModel.update(delta)

        this.phybox.position.copy(this.allyModel.Pos)
        this.phybox.rotation.copy(this.allyModel.Meshs.rotation)
        this.phybox.position.y += this.allyModel.Size.y / 2
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

    private ensureVehicle() {
        if (this.vehicle || !this.yukaManager) return

        const vehicle = new Vehicle()
        vehicle.name = this.targetId
        const speed = this.getMoveSpeed()
        vehicle.maxSpeed = speed
        vehicle.maxForce = Math.max(20, speed * 12)
        vehicle.boundingRadius = Math.max(this.allyModel.Size.x, this.allyModel.Size.z) * 0.5
        vehicle.neighborhoodRadius = Math.max(3, vehicle.boundingRadius * 4)
        vehicle.updateNeighborhood = true
        vehicle.updateOrientation = false
        vehicle.position.set(this.allyModel.Pos.x, this.allyModel.Pos.y, this.allyModel.Pos.z)

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

    private syncVehicleFromMesh() {
        if (!this.vehicle) return
        this.vehicle.position.set(this.allyModel.Pos.x, this.allyModel.Pos.y, this.allyModel.Pos.z)
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
            this.allyModel.Pos.y,
        ) ?? this.allyModel.Pos.y

        this.actualMove.subVectors(this.desiredVehiclePos, this.allyModel.Pos)
        const horizontalMove = this.actualMove.clone()
        horizontalMove.y = 0

        if (horizontalMove.lengthSq() > 0.0001) {
            const dir = horizontalMove.clone().normalize()
            const hit = this.gphysic.CheckDirection(this.allyModel, dir, this.getMoveSpeed())
            if (hit.obj && horizontalMove.length() >= Math.max(0, hit.distance)) {
                this.syncVehicleFromMesh()
            } else {
                this.allyModel.Pos.copy(this.desiredVehiclePos)
            }
        } else {
            this.allyModel.Pos.y = this.desiredVehiclePos.y
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

        const attackRange = this.Spec.AttackRange
        const targetDistance = GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, target.Box, target.Pos, this._cp)
        if (targetDistance <= attackRange * 0.92) {
            follow.active = false
            vehicle.velocity.set(0, 0, 0)
            this.moveDirection.set(0, 0, 0)
            return
        }

        this.nextRepathElapsed -= delta
        const targetId = this.currentTarget?.id ?? target.UUID
        const gridVersion = this.navGrid?.Version ?? -1
        const needsPath = !follow.active
            || this.currentPathTargetId !== targetId
            || this.currentPathGridVersion !== gridVersion

        if (!needsPath || this.nextRepathElapsed > 0) return

        this.nextRepathElapsed = this.repathInterval + this.repathJitter
        this.currentPathTargetId = targetId
        this.currentPathGridVersion = gridVersion
        const waypoints = this.resolveWaypoints(target)
        this.applyPath(waypoints)
    }

    private resolveWaypoints(target: IPhysicsObject): THREE.Vector3[] {
        if (this.currentTarget && this.navGrid?.IsReady) {
            const path = this.navGrid.findPath({
                start: this.allyModel.Pos,
                target: this.currentTarget,
                attackRange: this.Spec.AttackRange,
            })
            if (path.status === NavPathStatus.Complete && path.waypoints.length > 0) {
                return path.waypoints
            }
        }

        this.directPathTarget.copy(target.CenterPos)
        this.directPathTarget.y = this.navGrid?.getHeightAt(
            this.directPathTarget.x,
            this.directPathTarget.z,
            this.allyModel.Pos.y,
        ) ?? this.allyModel.Pos.y
        return [this.allyModel.Pos.clone(), this.directPathTarget.clone()]
    }

    private applyPath(waypoints: THREE.Vector3[]) {
        const vehicle = this.vehicle
        const follow = this.followPathBehavior
        if (!vehicle || !follow || waypoints.length === 0) return

        const path = new Path()
        path.loop = false
        for (const waypoint of waypoints) {
            path.add(new YukaVector3(waypoint.x, waypoint.y, waypoint.z))
        }
        follow.path = path
        follow.active = waypoints.length > 1
        vehicle.position.set(this.allyModel.Pos.x, this.allyModel.Pos.y, this.allyModel.Pos.z)
    }

    private applyStateNavigationMode() {
        const suspended = this.isNavigationSuspended()
        if (this.followPathBehavior) this.followPathBehavior.active = !suspended && this.followPathBehavior.active
        if (this.separationBehavior) this.separationBehavior.active = !suspended
        if (suspended) this.syncVehicleFromMesh()
    }

    private isNavigationSuspended(): boolean {
        return this.currentState instanceof AttackAllyState
            || this.currentState instanceof JumpAllyState
            || this.currentState instanceof HurtAllyState
            || this.currentState instanceof DyingAllyState
            || this.Spec.Health <= 0
    }

    ReceiveDemage(damage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number): boolean {
        if (this.Spec.Health <= 0) return false
        this.allyModel.DamageEffect(damage, effect)
        this.pendingAttackRange = attackRange ?? 0
        this.pendingKnockbackDist = knockbackDist ?? 0
        this.Spec.ReceiveCalcDamage(damage)
        return this.Spec.Health > 0
    }

    ValidateMeleeAttackTarget(targetId: string, attackRange: number): MeleeValidationResult {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return MeleeValidationResult.InvalidTarget
        if (!target.alive) return MeleeValidationResult.DeadTarget
        if (!target.targetable || !target.collidable) return MeleeValidationResult.InvalidTarget

        const dist = GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, this.targetAdapter.Box, this.targetGeomObject(target).position, this._cp)
        if (dist > attackRange) return MeleeValidationResult.OutOfRange
        if (this.isTargetLineOfSightBlocked(target, "ally:melee-validate")) return MeleeValidationResult.InvalidTarget
        return MeleeValidationResult.InRange
    }

    ValidateRangedAttackTarget(targetId: string, attackRange: number): boolean {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return false
        if (!target.alive || !target.targetable || !target.collidable) return false

        if (GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, this.targetAdapter.Box, this.targetGeomObject(target).position, this._cp) > attackRange) {
            return false
        }
        return !this.isTargetLineOfSightBlocked(target, "ally:ranged-validate")
    }

    private resolveTarget(): IPhysicsObject {
        const previousTargetId = this.currentTarget?.id
        this.currentTarget = this.findRegistryTarget()
        this.targetAdapter.Target = this.currentTarget
        const currentTargetId = this.currentTarget?.id
        if (previousTargetId !== currentTargetId) {
            console.log("[CombatDebug] TargetChanged", {
                actor: "ally",
                actorId: this.targetId,
                targetId: currentTargetId,
                currentTargetId,
                previousTargetId,
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
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
        if (this.isValidTarget(current)) {
            if (now - this.lastSearchTime < this.searchInterval) return current
        }

        this.lastSearchTime = now
        return registry.findNearestHostile(this.targetId, this.aggroRange, {
            aliveOnly: true,
            targetableOnly: true,
            collidableOnly: true,
            kinds: ["unit", "structure"],
            distanceMode: TargetDistanceMode.BoundsSurface,
        })
    }

    private isValidTarget(target?: TargetRecord): target is TargetRecord {
        if (!target?.alive || !target.targetable || !target.collidable) return false
        if (GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, this.getTargetBounds(target), this.targetGeomObject(target).position, this._cp) > this.aggroRange) return false
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

    private isTargetLineOfSightBlocked(target: TargetRecord, debugLabel: string): boolean {
        return this.lineOfSight.isBlocked(
            this.allyModel.CenterPos,
            this.targetAdapter.CenterPos,
            this.gphysic.GetObjects(),
            this.allyModel.Size.x,
            {
                ignoreObjects: [target.object, this.allyModel.Meshs],
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
