import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate"
import { Player } from "./player";
import { BaseSpec } from "../battle/basespec";
import { AttackItemType } from "@Glibs/types/inventypes";
import { PlayerCtrl } from "./playerctrl";
import { MonsterId } from "@Glibs/types/monstertypes";
import { AttackType } from "@Glibs/types/playertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Bind } from "@Glibs/types/assettypes";
import { ActionType } from "./playertypes";
import { IItem } from "@Glibs/interface/iinven";

export class AttackState extends State implements IPlayerAction {
    raycast = new THREE.Raycaster()
    attackDist = 5
    attackDir = new THREE.Vector3()
    attackTime = 0
    attackSpeed = 2
    keytimeout?:NodeJS.Timeout
    attackProcess = false
    clock?: THREE.Clock
    meleeAttackMode = true
    detectEnermy = false

    constructor(playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        private eventCtrl: IEventController, private spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic)
        this.raycast.params.Points.threshold = 20
    }

    Init(): void {
        console.log("Attack!!")
        this.attackProcess = false
        this.attackSpeed = this.spec.AttackSpeed
        this.attackDist = this.spec.AttackRange
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
        if(handItem == undefined) {
            this.player.ChangeAction(ActionType.Punch, this.attackSpeed)
        } else {
            switch(handItem.AttackType) {
                case AttackItemType.Blunt:
                case AttackItemType.Axe:
                case AttackItemType.Sword:
                    this.player.ChangeAction(ActionType.Sword, this.attackSpeed)
                    this.meleeAttackMode = true
                    break;
                case AttackItemType.Knife:
                    this.player.ChangeAction(ActionType.Sword, this.attackSpeed)
                    this.meleeAttackMode = true
                    break;
                case AttackItemType.OneHandGun:
                    this.player.ChangeAction(ActionType.OneHandGun, this.attackSpeed)
                    this.meleeAttackMode = false
                    break;
                case AttackItemType.TwoHandGun:
                    this.player.ChangeAction(ActionType.TwoHandGun, this.attackSpeed)
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
            if (handItem.AutoAttack) this.autoDirection()
            this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound)
        }
        
        this.playerCtrl.RunSt.PreviousState(this)
        this.attackTime = this.attackSpeed
        this.clock = new THREE.Clock()
        this.player.createDashedCircle(this.attackDist)
    }
    /**
     * 해제
     * - attack timeout 해제
     * - 공격 반경 표시 해제
     */
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        this.player.releaseDashsedCircle()
    }
    autoDirection() {
        const playerPos = this.player.Pos;
        let closestTarget: THREE.Object3D | null = null;
        let minDistance = this.attackDist;

        // 🎯 1. 모든 적 중에서 가장 가까운 대상 찾기
        for (const target of this.playerCtrl.targets) {
            const dist = target.position.distanceTo(playerPos);
            if (dist < minDistance) {
                minDistance = dist;
                closestTarget = target;
            }
        }

        // 🎯 2. 범위 내 적이 없으면 종료
        if (!closestTarget) {
            this.attackProcess = false;
            this.detectEnermy = false
            return null;
        }

        // 🔁 3. 가장 가까운 적을 향해 회전
        // const lookDir = new THREE.Vector3().subVectors(closestTarget.position, playerPos).normalize();
        // const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        //     new THREE.Vector3(0, 0, 1),
        //     lookDir
        // );
   
        // this.player.Meshs.quaternion.slerp(targetQuat, 0.2); // 부드럽게 회전
        // this.player.Meshs.quaternion.copy(targetQuat); // 부드럽게 회전

        this.detectEnermy = true
        this.player.Meshs.lookAt(closestTarget.position.x, playerPos.y, closestTarget.position.z);
        return closestTarget
    }
    rangedAttack(itemInfo: IItem) {
        this.eventCtrl.SendEventMessage(EventTypes.PlaySound, itemInfo.Mesh, itemInfo.Sound)
        if (itemInfo.AutoAttack && this.autoDirection() == null) {
            return false
        }
        const startPos = new THREE.Vector3()
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.player.GetMuzzlePosition(startPos)
        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.BulletLine, 
            ownerSpec: this.spec,
            damage: this.spec.Damage,
            src: startPos, 
            dir: this.attackDir,
            range: this.attackDist
        })
        this.attackProcess = false
        return true
    }
    meleeAutoAttack() {
        const closestTarget = this.autoDirection()
        if (closestTarget == null) return
        // 💥 4. 공격 메시지 전송
        const msg = {
            type: AttackType.NormalSwing,
            damage: this.spec.Damage,
            spec: this.spec,
            obj: closestTarget
        };

        this.eventCtrl.SendEventMessage(EventTypes.Attack + closestTarget.name, [msg]);
        this.attackProcess = false;
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
                    damage: this.spec.Damage,
                    spec: [this.spec],
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
    ChangeMode(state: IPlayerAction) {
        this.Uninit()
        state.Init()
        return state
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

        if (!this.meleeAttackMode && !this.detectEnermy) {
            return this.ChangeMode(this.playerCtrl.IdleSt)
        }
        this.attackProcess = true
        this.keytimeout = setTimeout(() => {
            const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
            if(handItem == undefined) return
            if (this.meleeAttackMode) {
                if(handItem.AutoAttack) this.meleeAutoAttack()
                else this.meleeAttack()
            } else this.rangedAttack(handItem)
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
        if (d != undefined) return d

        return this
    }
}
