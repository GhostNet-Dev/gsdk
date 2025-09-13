import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate"
import { Player } from "../player";
import { BaseSpec } from "../../battle/basespec";
import { AttackItemType } from "@Glibs/types/inventypes";
import { PlayerCtrl } from "../playerctrl";
import { MonsterId } from "@Glibs/types/monstertypes";
import { AttackType } from "@Glibs/types/playertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Bind } from "@Glibs/types/assettypes";
import { ActionType } from "../playertypes";
import { IItem } from "@Glibs/interface/iinven";
import { Item } from "@Glibs/inventory/items/item";
import { AttackState } from "./attackstate";

export class MeleeAttackState extends AttackState implements IPlayerAction {

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
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
        if(handItem == undefined) {
            this.player.ChangeAction(ActionType.Punch, this.attackSpeed)
        } else {
            const anim = this.getAnimationForItem(handItem)
            this.player.ChangeAction(anim, this.attackSpeed)
            if (handItem.AutoAttack) this.autoDirection();

            (handItem as Item).activate()
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
        const msg = {
            type: AttackType.NormalSwing,
            damage: this.baseSpec.Damage,
            spec: [this.baseSpec],
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
                const msg = {
                    type: AttackType.NormalSwing,
                    damage: this.baseSpec.Damage,
                    spec: [this.baseSpec],
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
    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck()
        if(d != undefined) {
            this.Uninit()
            return d
        }
        if(this.clock == undefined) return  this

        delta = this.clock?.getDelta()
        this.attackTime += delta
        if(this.attackProcess) return this

        if(this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed

        this.attackProcess = true
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
        if (handItem == undefined) return this;

        if(handItem.Sound) this.eventCtrl.SendEventMessage(EventTypes.PlaySound, handItem.Mesh, handItem.Sound)

        this.keytimeout = setTimeout(() => {
                if (handItem.AutoAttack) this.meleeAutoAttack()
                else this.meleeAttack(handItem)
        }, this.attackSpeed * 1000 * 0.6)
        return this
    }
}
export class MeleeAttackIdleState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        this.player.ChangeAction(ActionType.TwoHandSwordIdle)
    }
    Uninit(): void {

    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) return d

        return this
    }
}