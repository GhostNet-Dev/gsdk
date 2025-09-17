import * as THREE from "three";
import { Zombie } from "./zombie"
import { AttackZState, DyingZState, IdleZState, JumpZState, RunZState } from "./zombie/monstate"
import { IMonsterCtrl, MonsterBox } from "./monsters";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { MonsterProperty } from "./monstertypes";
import { EffectType } from "@Glibs/types/effecttypes";
import { IMonsterAction } from "./monstertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { StatKey } from "@Glibs/types/stattypes";
import { Buff } from "@Glibs/magical/buff/buff";



export class MonsterCtrl implements ILoop, IMonsterCtrl, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec = new BaseSpec(this.stats, this)
    currentState: IMonsterAction
    idleState: IMonsterAction
    raycast = new THREE.Raycaster()
    dir = new THREE.Vector3(0, 0, 0)
    moveDirection = new THREE.Vector3()
    private phybox: MonsterBox
    get Drop() { return this.property.drop }
    get MonsterBox() { return this.phybox }
    get Spec() { return this.baseSpec }
    get objs() { return this.zombie.Meshs }

    constructor(
        id: number,
        private player: IPhysicsObject, 
        private zombie: Zombie, 
        private gphysic: IGPhysic,
        private eventCtrl: IEventController,
        private property: MonsterProperty,
        private stats: Partial<Record<StatKey, number>>,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        const size = zombie.Size
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true
        })
        this.idleState = this.currentState = property.idleStates!(id, this.zombie, this.gphysic, this.eventCtrl, this.baseSpec);

        this.phybox = new MonsterBox(id, "mon", property.id, geometry, material)
        if (window.location.hostname == "hons.ghostwebservice.com") {
            this.phybox.visible = false
        }
        this.phybox.position.copy(this.zombie.Pos)

        eventCtrl.RegisterEventListener(EventTypes.UpdateBuff + "mon" + id, (buff: Buff) => {
            this.baseSpec.Buff(buff)
        })
        eventCtrl.RegisterEventListener(EventTypes.RemoveBuff + "mon" + id, (buff: Buff) => {
            this.baseSpec.RemoveBuff(buff)
        })
    }
    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
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

        const dist = this.zombie.Pos.distanceTo(this.player.Pos)

        if (this.Spec.Health > 0) {
            this.dir.subVectors(this.player.CenterPos, this.zombie.CenterPos)
            this.raycast.set(this.zombie.CenterPos, this.dir.normalize())

            let find = false

            // this.instanceBlock.forEach((block) => {
            //     if (block) find = this.CheckVisible(block, dist)
            // })
            find = this.CheckVisibleMeshs(this.gphysic.GetObjects(), dist)
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
        this.currentState = this.currentState.Update(delta, this.moveDirection, this.player)

        this.zombie.update(delta)

        this.phybox.position.copy(this.zombie.Pos)
        this.phybox.rotation.copy(this.zombie.Meshs.rotation)
        this.phybox.position.y += this.zombie.Size.y / 2
    }
    
    ReceiveDemage(damage: number, effect?: EffectType): boolean {
        if (this.Spec.Health <= 0) return false
        this.zombie.DamageEffect(damage, effect)
        this.Spec.ReceiveCalcDamage(damage)
        if (this.Spec.Health <= 0) {
            return false
        }
        return true
    }
    CheckVisible(physBox: THREE.InstancedMesh, dist: number): boolean {
        const intersects = this.raycast.intersectObject(physBox, false)
        if (intersects.length > 0 && intersects[0].distance < dist) {
            return true //keep searching
        }
        return false
    }
    CheckVisibleMeshs(physBox: THREE.Object3D[], dist: number): boolean {
        return this.getClosestHit(this.player.CenterPos, this.zombie.CenterPos, physBox, this.zombie.Size.x)
        // this.raycast.far = dist
        // const intersects = this.raycast.intersectObjects(physBox, false)
        // if (intersects.length > 0 && intersects[0].distance < dist) {
        //     return true //keep searching
        // }
        // return false
    }
    getClosestHit(
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        targets: THREE.Object3D[],
        radius = 1
    ) {
        for (const target of targets) {
            const center = target.position;
            const seg = new THREE.Vector3().subVectors(p2, p1);
            const segDir = seg.clone().normalize();
            const toCenter = new THREE.Vector3().subVectors(center, p1);
            const projLen = toCenter.dot(segDir);

            // 충돌 지점 계산
            const closestPoint = p1.clone().add(segDir.clone().multiplyScalar(projLen));
            const distToCenter = closestPoint.distanceTo(center);

            if (distToCenter <= radius) {
                return true
            }
        }

        return false;
    }
}