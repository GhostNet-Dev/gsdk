import * as THREE from "three";
import { IPlayerAction } from "./playerstate"
import { Player } from "../player";
import { BaseSpec } from "../../battle/basespec";
import { PlayerCtrl } from "../playerctrl";
import { AttackType } from "@Glibs/types/playertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Bind } from "@Glibs/types/assettypes";
import { ActionType, AttackOption } from "../playertypes";
import { IItem } from "@Glibs/interface/iinven";
import { Item } from "@Glibs/inventory/items/item";
import { AttackState } from "./attackstate";
import { CameraMode } from "@Glibs/systems/camera/cameratypes";
import { KeyType } from "@Glibs/types/eventtypes";

export class MeleeAttackState extends AttackState implements IPlayerAction {
    private manualAimMode = false

    constructor(playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        protected eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic, eventCtrl, spec)
        this.raycast.params.Points.threshold = 20
    }

    Init(): void {
        console.log("Melee Attack!!")
        this.attackProcess = false
        this.attackSpeed = this.baseSpec.AttackSpeed
        this.attackDist = this.baseSpec.AttackRange
        this.manualAimMode = false
        const handItem = this.playerCtrl.baseSpec.GetMeleeItem()
        if(handItem == undefined) {
            this.player.ChangeAction(ActionType.Punch, this.attackSpeed)
        } else {
            const anim = this.getAnimationForItem(handItem)
            this.player.ChangeAction(anim, this.attackSpeed)
            if (handItem.AutoAttack) {
                this.autoDirection();
            } else {
                this.manualAimMode = true
                this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.AimThirdPerson)
                this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, true)
                this.detectEnermy = true
            }

            (handItem as Item).trigger("onUse")
            if (handItem.Sound) this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound)
        }
        
        this.attackTime = this.attackSpeed
        this.clock = new THREE.Clock()
        this.player.createDashedCircle(this.attackDist)
    }

    meleeAutoAttack() {
        const closestTarget = this.autoDirection()
        if (closestTarget == null) return
        // 💥 4. 공격 메시지 전송
        const msg: AttackOption = {
            type: AttackType.NormalSwing,
            damage: this.baseSpec.Damage,
            spec: this.baseSpec,
            obj: closestTarget
        };

        this.eventCtrl.SendEventMessage(EventTypes.Attack + closestTarget.name, [msg]);
        this.attackProcess = false;
    }
    
    meleeAttack(itemInfo: IItem) {
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize());
    
        (itemInfo as Item).trigger("onAttack", { direction: this.attackDir })

        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            const msgs = new Map()
            intersects.forEach((obj) => {
                if (obj.distance> this.attackDist) return false
                const mons = msgs.get(obj.object.name)
                const msg: AttackOption = {
                    type: AttackType.NormalSwing,
                    damage: this.baseSpec.Damage,
                    spec: this.baseSpec,
                    obj: obj.object
                } 
                if (mons == undefined) {
                    msgs.set(obj.object.name, [msg])
                } else {
                    mons.push(msg)
                }
            })
            msgs.forEach((v, k) => {
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, v)
            })
        }
        this.attackProcess = false
    }

    override Uninit(): void {
        super.Uninit()
        this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, false)
        this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.ThirdFollowPerson)
    }

    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck()
        if(d != undefined) {
            this.Uninit()
            return d
        }
        if(this.clock == undefined) return  this

        delta = this.clock?.getDelta()
        this.attackTime += delta

        // Manual Aim Logic: Rotate player to face camera direction
        const camForward = new THREE.Vector3();
        this.playerCtrl.camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();
        this.player.Meshs.lookAt(
            this.player.Pos.x + camForward.x,
            this.player.Pos.y,
            this.player.Pos.z + camForward.z
        );

        if (!this.detectEnermy) {
            return this.ChangeMode(this.playerCtrl.currentIdleState)
        }

        const isFireButtonPressed = this.playerCtrl.KeyState[KeyType.Action1];

        // EXIT CONDITION for Manual Mode: Release button to stop aiming
        if (this.manualAimMode && !isFireButtonPressed) {
            return this.ChangeMode(this.playerCtrl.currentIdleState);
        }

        if(this.attackProcess) return this
        if(this.attackTime / this.attackSpeed < 1) return this

        this.attackTime = 0;
        this.attackProcess = true
        const handItem = this.playerCtrl.baseSpec.GetMeleeItem()
        if (handItem == undefined) return this;

        if(handItem.Sound) this.eventCtrl.SendEventMessage(EventTypes.PlaySound, handItem.Mesh, handItem.Sound)

        this.keytimeout.push(setTimeout(() => {
                if (handItem.AutoAttack) this.meleeAutoAttack()
                else this.meleeAttack(handItem)
        }, this.attackSpeed * 1000 * 0.6))
        return this
    }
}
