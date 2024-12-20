import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate"
import { Player } from "./player";
import { PlayerSpec } from "./playerspec";
import { AttackItemType } from "@Glibs/types/inventypes";
import { PlayerCtrl } from "./playerctrl";
import { MonsterId } from "@Glibs/types/monstertypes";
import { AttackType } from "@Glibs/types/playertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Bind } from "@Glibs/types/assettypes";
import { ActionType } from "./playertypes";

export class AttackState extends State implements IPlayerAction {
    raycast = new THREE.Raycaster()
    attackDist = 5
    attackDir = new THREE.Vector3()
    attackTime = 0
    attackSpeed = 2
    attackDamageMax = 1
    attackDamageMin = 1
    keytimeout?:NodeJS.Timeout
    attackProcess = false
    clock?: THREE.Clock
    meleeAttackMode = true

    constructor(playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        private eventCtrl: IEventController, private spec: PlayerSpec
    ) {
        super(playerCtrl, player, gphysic)
        this.raycast.params.Points.threshold = 20
    }
    Init(): void {
        console.log("Attack!!")
        this.attackProcess = false
        this.attackSpeed = this.spec.attackSpeed
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
        const handItem = this.playerCtrl.inventory.GetBindItem(Bind.Hands_R)
        if(handItem == undefined) {
            this.player.ChangeAction(ActionType.Punch, this.attackSpeed)
        } else {
            switch(handItem.AttackType) {
                case AttackItemType.Blunt:
                case AttackItemType.Axe:
                case AttackItemType.Sword:
                    this.player.ChangeAction(ActionType.Sword, this.attackSpeed)
                    this.attackDist = 5
                    this.meleeAttackMode = true
                    break;
                case AttackItemType.Knife:
                    this.player.ChangeAction(ActionType.Sword, this.attackSpeed)
                    this.attackDist = 2
                    this.meleeAttackMode = true
                    break;
                case AttackItemType.Gun:
                    this.player.ChangeAction(ActionType.Gun, this.attackSpeed)
                    this.attackDist = 20
                    this.meleeAttackMode = false
                    break;
                case AttackItemType.Bow:
                    this.player.ChangeAction(ActionType.Bow, this.attackSpeed)
                    this.meleeAttackMode = false
                    break;
                case AttackItemType.Wand:
                    this.player.ChangeAction(ActionType.Wand, this.attackSpeed)
                    this.meleeAttackMode = false
                    break;
            }
        }
        
        this.playerCtrl.RunSt.PreviousState(this)
        this.attackTime = this.attackSpeed
        this.clock = new THREE.Clock()
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    rangedAttack() {
        const startPos = new THREE.Vector3()
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.player.GetItemPosition(startPos)
        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.DefaultBullet, 
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            src: startPos, 
            dir: this.attackDir
        })
        this.attackProcess = false
    }
    
    meleeAttack() {
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
    
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            const msgs = new Map()
            intersects.forEach((obj) => {
                if (obj.distance> this.attackDist) return false
                const mons = msgs.get(obj.object.name)
                const msg = {
                        type: AttackType.NormalSwing,
                        damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
                        obj: obj.object
                    }
                if(mons == undefined) {
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
        this.keytimeout = setTimeout(() => {
            if (this.meleeAttackMode) this.meleeAttack()
            else this.rangedAttack()
        }, this.attackSpeed * 1000 * 0.6)
        return this
    }
}

export class AttackIdleState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        this.player.ChangeAction(ActionType.Fight)
    }
    Uninit(): void {
        
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if(d != undefined) return d

        return this
    }
}
