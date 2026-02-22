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
import { CameraMode } from "@Glibs/systems/camera/cameratypes";
import { KeyType } from "@Glibs/types/eventtypes";

export class RangeAttackState extends AttackState implements IPlayerAction {
    private manualAimMode = false

    constructor(playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        protected eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic, eventCtrl, spec)
        this.raycast.params.Points.threshold = 20
    }

    Init(): void {
        console.log("ranged Attack!!")
        this.attackProcess = false
        this.attackSpeed = this.baseSpec.AttackSpeed
        this.attackDist = this.baseSpec.AttackRange
        this.manualAimMode = false
        const handItem = this.playerCtrl.baseSpec.GetRangedItem()
        if(handItem == undefined) {
            this.player.ChangeAction(ActionType.Punch, this.attackSpeed)
        } else {
            const anim = this.getAnimationForItem(handItem)
            this.player.ChangeAction(anim, this.attackSpeed)
            if (handItem.AutoAttack) {
                this.autoDirection();
                this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, false)
                this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.ThirdFollowPerson)
            } else {
                this.manualAimMode = true
                this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.AimThirdPerson)
                this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, true)
                this.detectEnermy = true
            }

            (handItem as Item).activate()
            this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound)
        }
        
        this.attackTime = this.attackSpeed
        this.clock = new THREE.Clock()
        this.player.createDashedCircle(this.attackDist)
    }
    
    rangedAttack(itemInfo: IItem) {
        if (itemInfo.AutoAttack && this.autoDirection() == null) {
            return false
        }
        const startPos = new THREE.Vector3()
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.player.GetMuzzlePosition(startPos);

        (itemInfo as Item).trigger("onFire", { direction: this.attackDir })

        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.BulletLine, 
            ownerSpec: this.baseSpec,
            damage: this.baseSpec.Damage,
            src: startPos, 
            dir: this.attackDir,
            range: this.attackDist
        })
        this.attackProcess = false
        return true
    }
    override Uninit(): void {
        super.Uninit()
        this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, false)
        this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.ThirdFollowPerson)
    }
    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck({ attack: false })
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

        if (!this.manualAimMode && !this.detectEnermy) {
            return this.ChangeMode(this.playerCtrl.currentIdleState)
        }

        if (this.manualAimMode && this.playerCtrl.keyType != KeyType.Action1) {
            return this
        }

        this.attackProcess = true
        const handItem = this.playerCtrl.baseSpec.GetRangedItem()
        if (handItem == undefined) return this;

        this.eventCtrl.SendEventMessage(EventTypes.PlaySound, handItem.Mesh, handItem.Sound)

        this.keytimeout.push(setTimeout(() => {
            this.rangedAttack(handItem)
        }, this.attackSpeed * 1000 * 0.3))
        return this
    }
}
