import * as THREE from "three";
import { EventController } from "@Event/eventctrl";
import { IPhysicsObject } from "@Models/iobject";
import { EffectType } from "@Effector/effector";
import { Zombie } from "./zombie"
import { AttackZState, DyingZState, IdleZState, JumpZState, RunZState } from "./monstate"
import { IMonsterCtrl, IMonsterAction, MonsterBox } from "../monsters";
import { MonsterProperty } from "../monsterdb";
import { GPhysics, IGPhysic } from "@Commons/physics/gphysics";



export class MonsterCtrl implements IGPhysic, IMonsterCtrl {
    IdleSt = new IdleZState(this, this.zombie, this.gphysic)
    AttackSt = new AttackZState(this, this.zombie, this.gphysic, this.eventCtrl, this.property)
    RunSt = new RunZState(this, this.zombie, this.gphysic, this.property)
    DyingSt = new DyingZState(this, this.zombie, this.gphysic, this.eventCtrl)
    JumpSt = new JumpZState(this, this.zombie, this.gphysic)

    currentState: IMonsterAction = this.IdleSt
    raycast = new THREE.Raycaster()
    dir = new THREE.Vector3(0, 0, 0)
    moveDirection = new THREE.Vector3()
    health = this.property.health
    private phybox: MonsterBox
    get Drop() { return this.property.drop }
    get MonsterBox() { return this.phybox }

    constructor(
        id: number,
        private player: IPhysicsObject, 
        private zombie: Zombie, 
        private instanceBlock: (THREE.InstancedMesh | undefined)[],
        private meshBlock: THREE.Mesh[],
        private gphysic: GPhysics,
        private eventCtrl: EventController,
        private property: MonsterProperty
    ) {
        gphysic.Register(this)
        const size = zombie.Size
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true
        })
        this.phybox = new MonsterBox(id, "mon", property.id, geometry, material)
        if (window.location.hostname == "hons.ghostwebservice.com") {
            this.phybox.visible = false
        }
        this.phybox.position.copy(this.zombie.CannonPos)
    }
    Respawning() {
        this.health = 10
        this.zombie.SetOpacity(1)
        this.currentState = this.IdleSt
        this.currentState.Init()
    }

    update(delta: number): void {
        if (!this.zombie.Visible) return

        const dist = this.zombie.CannonPos.distanceTo(this.player.CannonPos)

        if (this.health > 0) {
            this.dir.subVectors(this.player.CenterPos, this.zombie.CenterPos)
            this.raycast.set(this.zombie.CenterPos, this.dir.normalize())

            let find = false

            this.instanceBlock.forEach((block) => {
                if (block) find = this.CheckVisible(block, dist)
            })
            find = this.CheckVisibleMeshs(this.meshBlock, dist)
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

        this.currentState = this.currentState.Update(delta, this.moveDirection, dist)
        this.zombie.update()

        this.phybox.position.copy(this.zombie.CannonPos)
        this.phybox.rotation.copy(this.zombie.Meshs.rotation)
        this.phybox.position.y += this.zombie.Size.y / 2
    }
    
    ReceiveDemage(demage: number, effect?: EffectType): boolean {
        if (this.health <= 0) return false
        this.zombie.DamageEffect(demage, effect)
        this.health -= demage
        if (this.health <= 0) {
            this.DyingSt.Init()
            this.currentState = this.DyingSt
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
    CheckVisibleMeshs(physBox: THREE.Mesh[], dist: number): boolean {
        const intersects = this.raycast.intersectObjects(physBox, false)
        if (intersects.length > 0 && intersects[0].distance < dist) {
            return true //keep searching
        }
        return false
    }
}