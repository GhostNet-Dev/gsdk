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

export abstract class AttackState extends State implements IPlayerAction {
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
        protected eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic, spec)
        this.raycast.params.Points.threshold = 20
    }
    abstract Init(): void;
    abstract Update(delta: number): IPlayerAction;

    getAnimationForItem(item: IItem): ActionType {
        switch (item.AttackType) {
            case AttackItemType.OneHandSword:
            case AttackItemType.OneHandAxe:
            case AttackItemType.OneHandBlunt:
                return ActionType.Sword
            case AttackItemType.TwoHandSword:
            case AttackItemType.TwoHandAxe:
            case AttackItemType.TwoHandBlunt:
                return ActionType.TwoHandSword1
            case AttackItemType.OneHandGun:
                return ActionType.OneHandGun
            case AttackItemType.TwoHandGun:
                return ActionType.TwoHandGun
            default:
                return ActionType.Punch
        }
    }

    isMeleeWeapon(type: AttackItemType): boolean {
        return [AttackItemType.OneHandSword, AttackItemType.OneHandAxe, AttackItemType.OneHandBlunt, AttackItemType.Knife].includes(type)
    }
    /**
     * 해제
     * - attack timeout 해제
     * - 공격 반경 표시 해제
     */
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
        if (handItem) (handItem as Item).deactivate()
        this.player.releaseDashsedCircle()
    }
    autoDirection() {
        const playerPos = this.player.Pos;
        let closestTarget: THREE.Object3D | null = null;
        let minDistance = this.attackDist;

        // 🎯 1. 모든 적 중에서 가장 가까운 대상 찾기
        for (const target of this.playerCtrl.targets) {
            const dist = target.position.distanceTo(this.player.CenterPos);
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

    ChangeMode(state: IPlayerAction) {
        this.Uninit()
        state.Init()
        return state
    }
}

export class AttackIdleState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
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
