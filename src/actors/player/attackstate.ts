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
import { IItem } from "@Glibs/interface/iinven";

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
                    this.attackDist = handItem.AttackRange ?? 5
                    this.meleeAttackMode = true
                    break;
                case AttackItemType.Knife:
                    this.player.ChangeAction(ActionType.Sword, this.attackSpeed)
                    this.attackDist = handItem.AttackRange ?? 2
                    this.meleeAttackMode = true
                    break;
                case AttackItemType.Gun:
                    this.player.ChangeAction(ActionType.Gun, this.attackSpeed)
                    this.attackDist = handItem.AttackRange ?? 20
                    this.meleeAttackMode = false
                    break;
                case AttackItemType.Bow:
                    this.player.ChangeAction(ActionType.Bow, this.attackSpeed)
                    this.attackDist = handItem.AttackRange ?? 20
                    this.meleeAttackMode = false
                    break;
                case AttackItemType.Wand:
                    this.player.ChangeAction(ActionType.Wand, this.attackSpeed)
                    this.attackDist = handItem.AttackRange ?? 20
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
        const playerPos = this.player.CenterPos;
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
            return null;
        }

        // 🔁 3. 가장 가까운 적을 향해 회전
        const lookDir = new THREE.Vector3().subVectors(closestTarget.position, playerPos).normalize();
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            lookDir
        );
        // this.player.Meshs.quaternion.slerp(targetQuat, 0.2); // 부드럽게 회전
        this.player.Meshs.quaternion.copy(targetQuat); // 부드럽게 회전
        return closestTarget
    }
    rangedAttack(itemInfo: IItem) {
        this.eventCtrl.SendEventMessage(EventTypes.PlaySound, itemInfo.Mesh, itemInfo.Sound)
        if (itemInfo.AutoAttack) {
            this.autoDirection()
        }
        const startPos = new THREE.Vector3()
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.player.GetMuzzlePosition(startPos)
        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.BulletLine, 
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            src: startPos, 
            dir: this.attackDir,
            range: itemInfo.AttackRange,
        })
        this.attackProcess = false
    }
    meleeAutoAttack() {
        const closestTarget = this.autoDirection()
        if (closestTarget == null) return
        // 💥 4. 공격 메시지 전송
        const damage = THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax);
        const msg = {
            type: AttackType.NormalSwing,
            damage: damage,
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
            const handItem = this.playerCtrl.inventory.GetBindItem(Bind.Hands_R)
            if (this.meleeAttackMode) {
                if(handItem && handItem.AutoAttack) this.meleeAutoAttack()
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
