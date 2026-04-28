import * as THREE from "three";
import { Zombie } from "./zombie"
import { AttackZState, DyingZState, IdleZState, JumpZState, RunZState } from "./zombie/monstate"
import { IMonsterCtrl, MonsterBox } from "./monsters";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { MonsterProperty } from "./monstertypes";
import { EffectType } from "@Glibs/types/effecttypes";
import { IActorState } from "./monstertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { StatKey } from "@Glibs/types/stattypes";
import { Buff } from "@Glibs/magical/buff/buff";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { TargetDistanceMode, TargetRecord, TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { GetHorizontalDistanceToBoxSurface, MeleeValidationResult, PendingMeleeImpactContext } from "@Glibs/actors/battle/meleecombat";
import { WeaponMode } from "@Glibs/actors/projectile/projectiletypes";

class MonsterTargetAdapter implements IPhysicsObject {
    private static readonly fallbackBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    private target?: TargetRecord
    private velocity = 0
    private readonly size = new THREE.Vector3(1, 1, 1)
    private readonly centerPos = new THREE.Vector3()
    private readonly headPos = new THREE.Vector3()
    private readonly box = new THREE.Box3()
    private isDirty = true

    constructor(private readonly fallback: IPhysicsObject) { }

    set Target(record: TargetRecord | undefined) {
        if (this.target !== record) {
            this.target = record
            this.isDirty = true
        }
    }
    get TargetId() { return this.target?.id ?? TargetTeamId.Player }
    get Velocity() { return this.velocity }
    set Velocity(n: number) { this.velocity = n }
    get Size(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.target ? this.size : this.fallback.Size
    }
    get CBox(): THREE.Mesh { return MonsterTargetAdapter.fallbackBoxMesh }
    get BoxPos(): THREE.Vector3 { return this.CenterPos }
    get Box(): THREE.Box3 {
        if (this.isDirty) this.updateCache()
        return this.target ? this.box : this.fallback.Box
    }
    get HeadPos(): THREE.Vector3 {
        this.headPos.copy(this.CenterPos)
        this.headPos.y += this.Size.y / 2
        return this.headPos
    }
    get CenterPos(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.target ? this.centerPos : this.fallback.CenterPos
    }
    get Pos(): THREE.Vector3 { return this.target?.object.position ?? this.fallback.Pos }
    set Visible(flag: boolean) {
        const object = this.target?.object
        if (object) object.visible = flag
        else this.fallback.Visible = flag
    }
    get Meshs(): THREE.Group | THREE.Mesh {
        const object = this.target?.object
        if (object instanceof THREE.Group || object instanceof THREE.Mesh) return object
        return this.fallback.Meshs
    }
    get UUID(): string { return this.target?.object.uuid ?? this.fallback.UUID }

    update() {
        this.isDirty = true
    }

    private updateCache() {
        const target = this.target
        const object = target?.object
        if (!object) {
            this.box.makeEmpty()
            this.isDirty = false
            return
        }
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            this.box.copy(target.bounds)
        } else {
            this.box.setFromObject(object)
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


export class MonsterCtrl implements ILoop, IMonsterCtrl, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec = new BaseSpec(this.stats, this)
    currentState: IActorState
    idleState: IActorState
    raycast = new THREE.Raycaster()
    dir = new THREE.Vector3(0, 0, 0)
    moveDirection = new THREE.Vector3()
    public pendingAttackRange: PendingMeleeImpactContext["pendingAttackRange"] = 0;
    public pendingKnockbackDist: PendingMeleeImpactContext["pendingKnockbackDist"] = 0;
    private phybox: MonsterBox
    private readonly targetId: string
    private readonly targetAdapter: MonsterTargetAdapter
    private targetRegistry?: TargetRegistrySystem
    private currentTarget?: TargetRecord
    private disposed = false
    private updateBuffEvent = ""
    private removeBuffEvent = ""
    private readonly aggroRange = 60
    private lastSearchTime = 0
    private readonly searchInterval = 500
    private readonly tempV1 = new THREE.Vector3()
    private readonly tempV2 = new THREE.Vector3()
    private readonly tempV3 = new THREE.Vector3()
    private readonly _cp = new THREE.Vector3()
    private readonly targetBounds = new THREE.Box3()
    private readonly setTargetRegistry = (targetRegistry?: TargetRegistrySystem) => {
        this.targetRegistry = targetRegistry
    }
    private readonly onUpdateBuff = (buff: Buff, level = 0) => {
        this.baseSpec.Buff(buff, level)
    }
    private readonly onRemoveBuff = (buff: Buff) => {
        this.baseSpec.RemoveBuff(buff)
    }
    get Drop() { return this.property.drop }
    get MonsterBox() { return this.phybox }
    get Spec() { return this.baseSpec }
    get objs() { return this.zombie.Meshs }
    get TargetId() { return this.targetId }
    get MonsterProperty() { return this.property }

    constructor(
        id: number,
        private player: IPhysicsObject, 
        private zombie: Zombie, 
        private gphysic: IGPhysic,
        private eventCtrl: IEventController,
        private property: MonsterProperty,
        private stats: Partial<Record<StatKey, number>>,
    ) {
        this.targetId = `mon:${property.id}:${id}`
        this.baseSpec.lastUsedWeaponMode = property.projectileDef ? WeaponMode.Ranged : WeaponMode.Melee
        this.targetAdapter = new MonsterTargetAdapter(this.player)
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        const size = zombie.Size
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true
        })
        this.idleState = this.currentState = property.idleStates!(id, this.zombie, this.property, this.gphysic, this.eventCtrl, this.baseSpec);

        this.phybox = new MonsterBox(id, "mon", property.id, geometry, material)
        // if (window.location.hostname == "hons.ghostwebservice.com") 
        this.phybox.visible = false
        this.phybox.position.copy(this.zombie.Pos)

        this.updateBuffEvent = EventTypes.UpdateBuff + "mon" + id
        this.removeBuffEvent = EventTypes.RemoveBuff + "mon" + id
        eventCtrl.RegisterEventListener(this.updateBuffEvent, this.onUpdateBuff)
        eventCtrl.RegisterEventListener(this.removeBuffEvent, this.onRemoveBuff)
        eventCtrl.RegisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry)
        eventCtrl.SendEventMessage(EventTypes.RequestTargetSystem)
    }
    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
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
    }
    Respawning() {
        this.baseSpec.ResetStatus()
        this.zombie.SetOpacity(1)
        this.currentState = this.idleState
        this.currentState.Init()
        this.MonsterBox.position.copy(this.zombie.Pos)
    }

    update(delta: number): void {
        if (!this.zombie.Visible) return

        this.targetAdapter.update()
        const target = this.resolveTarget()
        const dist = this.zombie.Pos.distanceTo(target.Pos)

        if (this.Spec.Health > 0) {
            this.dir.subVectors(target.CenterPos, this.zombie.CenterPos)
            this.raycast.set(this.zombie.CenterPos, this.dir.normalize())

            let find = false

            // this.instanceBlock.forEach((block) => {
            //     if (block) find = this.CheckVisible(block, dist)
            // })
            find = this.CheckVisibleMeshs(target, this.gphysic.GetObjects(), dist)
            /*
            if (this.legos.instancedBlock != undefined)
                find = this.CheckVisible(this.legos.instancedBlock, dist)
            if (this.legos.bricks2.length > 0 && !find)
                find = this.CheckVisibleMeshs(this.legos.bricks2, dist)
            if (this.nonlegos.instancedBlock != undefined)
                find = this.CheckVisible(this.nonlegos.instancedBlock, dist)
            if (this.nonlegos.bricks2.length > 0 && !find)
                find = this.CheckVisibleMeshs(this.nonlegos.bricks2, dist)
                */

            if (find) {
                // not visible player
                this.moveDirection.set(0, 0, 0)
            } else {
                this.moveDirection.copy(this.dir)
            }
        }
        this.currentState = this.currentState.Update(delta, this.moveDirection, target)

        this.zombie.update(delta)

        this.phybox.position.copy(this.zombie.Pos)
        this.phybox.rotation.copy(this.zombie.Meshs.rotation)
        this.phybox.position.y += this.zombie.Size.y / 2
    }
    
    ReceiveDemage(damage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number): boolean {
        if (this.Spec.Health <= 0) return false
        this.zombie.DamageEffect(damage, effect)
        
        // [New] 타격 시의 사거리 및 넉백 정보 보관
        this.pendingAttackRange = attackRange ?? 0;
        this.pendingKnockbackDist = knockbackDist ?? 0;

        this.Spec.ReceiveCalcDamage(damage)

        if (this.Spec.Health <= 0) {
            return false
        }
        return true
    }

    ValidateMeleeAttackTarget(targetId: string, attackRange: number): MeleeValidationResult {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return MeleeValidationResult.InvalidTarget
        if (!target.alive) return MeleeValidationResult.DeadTarget
        if (!target.targetable || !target.collidable) return MeleeValidationResult.InvalidTarget

        const dist = GetHorizontalDistanceToBoxSurface(this.zombie.Pos, this.targetAdapter.Box, target.object.position, this._cp)
        if (dist > attackRange) return MeleeValidationResult.OutOfRange
        return MeleeValidationResult.InRange
    }

    ValidateRangedAttackTarget(targetId: string, attackRange: number): boolean {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return false
        if (!target.alive || !target.targetable || !target.collidable) return false

        return GetHorizontalDistanceToBoxSurface(this.zombie.Pos, this.targetAdapter.Box, target.object.position, this._cp) <= attackRange
    }

    CheckVisible(physBox: THREE.InstancedMesh, dist: number): boolean {
        const intersects = this.raycast.intersectObject(physBox, false)
        if (intersects.length > 0 && intersects[0].distance < dist) {
            return true //keep searching
        }
        return false
    }
    CheckVisibleMeshs(target: IPhysicsObject, physBox: THREE.Object3D[], dist: number): boolean {
        return this.getClosestHit(target.CenterPos, this.zombie.CenterPos, physBox, this.zombie.Size.x, target.Meshs)
    }
    getClosestHit(
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        targets: THREE.Object3D[],
        radius = 1,
        ignore?: THREE.Object3D
    ) {
        for (const target of targets) {
            if (ignore && this.isObjectOrChild(target, ignore)) continue
            const center = target.position;
            const seg = this.tempV1.subVectors(p2, p1);
            const segDir = this.tempV2.copy(seg).normalize();
            const toCenter = this.tempV3.subVectors(center, p1);
            const projLen = toCenter.dot(segDir);

            // 충돌 지점 계산
            const closestPoint = this.tempV1.copy(p1).add(segDir.multiplyScalar(projLen));
            const distToCenter = closestPoint.distanceTo(center);

            if (distToCenter <= radius) {
                return true
            }
        }

        return false;
    }

    private isObjectOrChild(candidate: THREE.Object3D, parent: THREE.Object3D) {
        let current: THREE.Object3D | null = candidate
        while (current) {
            if (current === parent) return true
            current = current.parent
        }
        return false
    }

    private resolveTarget(): IPhysicsObject {
        this.currentTarget = this.findRegistryTarget()
        this.targetAdapter.Target = this.currentTarget
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
        if (GetHorizontalDistanceToBoxSurface(this.zombie.Pos, this.getTargetBounds(target), target.object.position, this._cp) > this.aggroRange) return false
        return this.targetRegistry?.isHostile(this.targetId, target.id) ?? false
    }

    private getTargetBounds(target: TargetRecord): THREE.Box3 | undefined {
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            return target.bounds
        }

        this.targetBounds.setFromObject(target.object)
        return this.targetBounds.isEmpty() ? undefined : this.targetBounds
    }
}
