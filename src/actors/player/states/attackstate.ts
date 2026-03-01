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
import { CombatResourcePool, CostEngine } from "@Glibs/actors/battle/resourcecost";
import { ActionCostSpec } from "@Glibs/actors/battle/resourcecosttypes";
import { ItemId } from "@Glibs/inventory/items/itemdefs";

export abstract class AttackState extends State implements IPlayerAction {
    raycast = new THREE.Raycaster()
    attackDist = 5
    attackDir = new THREE.Vector3()
    attackTime = 0
    attackSpeed = 2
    keytimeout:NodeJS.Timeout[] = []
    attackProcess = false
    clock?: THREE.Clock
    meleeAttackMode = true
    detectEnermy = false
    private static readonly FAR_AIM_DISTANCE = 1000

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
        this.keytimeout.forEach((timeout) => {
            clearTimeout(timeout)
        })
        this.keytimeout = []
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
        if (handItem) (handItem as Item).trigger("onUnuse")
        this.player.releaseDashsedCircle()
    }
    autoDirection(rangeMultiplier = 1.0) {
        const playerPos = this.player.Pos;
        let closestTarget: THREE.Object3D | null = null;
        let minDistance = this.attackDist * rangeMultiplier;

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


    protected readonly costEngine = new CostEngine()

    protected tryConsumeAttackCost(spec: ActionCostSpec, failMessage = "자원이 부족합니다.") {
        const pool = new CombatResourcePool({
            spec: this.baseSpec,
            inventory: this.playerCtrl.inventory,
            consumeInventoryItem: (id: ItemId, count: number) => {
                this.eventCtrl.SendEventMessage(EventTypes.UseItem, id, count)
            }
        })

        const resolved = this.costEngine.resolve(spec, pool)
        if (!resolved.ok) {
            this.eventCtrl.SendEventMessage(EventTypes.AlarmWarning, failMessage)
            return false
        }

        if (!this.costEngine.commit(resolved, pool)) {
            this.eventCtrl.SendEventMessage(EventTypes.AlarmWarning, failMessage)
            return false
        }

        return true
    }

    ChangeMode(state: IPlayerAction) {
        this.Uninit()
        state.Init()
        return state
    }

    /**
     * 화면 중앙(조준점) 기준 레이캐스트로 타겟 좌표를 계산한다.
     * - 충돌체가 있으면 충돌 지점 반환
     * - 충돌체가 없으면 카메라 전방의 먼 지점 반환
     */
    protected getReticleWorldTarget(maxDistance = this.attackDist): THREE.Vector3 {
        const targetPoint = new THREE.Vector3()
        const forward = new THREE.Vector3()

        this.raycast.setFromCamera(new THREE.Vector2(0, 0), this.playerCtrl.camera)
        this.raycast.far = maxDistance

        // 월드 충돌체 + 전투 타겟을 함께 검사해 지형/장애물/적 모두 조준 가능하게 한다.
        const collisionTargets = [...this.gphysic.GetObjects(), ...this.playerCtrl.targets]
        const hit = this.raycast.intersectObjects(collisionTargets, true)
            .find((intersect) => !this.isPlayerOwnedObject(intersect.object))

        if (hit) return targetPoint.copy(hit.point)

        this.playerCtrl.camera.getWorldDirection(forward)
        return targetPoint
            .copy(this.playerCtrl.camera.position)
            .add(forward.multiplyScalar(Math.max(maxDistance, AttackState.FAR_AIM_DISTANCE)))
    }


    private isPlayerOwnedObject(obj: THREE.Object3D): boolean {
        let current: THREE.Object3D | null = obj
        while (current) {
            if (current.uuid === this.player.Meshs.uuid) return true
            current = current.parent
        }
        return false
    }

    /**
     * 총구 위치에서 조준 좌표를 향하는 발사 방향 벡터를 계산한다.
     * V_shoot = normalize(P_target - P_gun)
     */
    protected computeShootDirectionFromGun(gunPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3().subVectors(targetPos, gunPos).normalize()
    }

    /**
     * 총구가 현재 가리키고 있는 실제 월드 좌표를 찾습니다.
     * @param maxDistance 최대 측정 거리
     */
    protected getMuzzleWorldTarget(maxDistance = this.attackDist): THREE.Vector3 {
        const muzzlePos = new THREE.Vector3();
        this.player.GetMuzzlePosition(muzzlePos);

        const muzzleDir = new THREE.Vector3();
        this.player.Meshs.getWorldDirection(muzzleDir);

        this.raycast.set(muzzlePos, muzzleDir.normalize());
        this.raycast.far = maxDistance;

        const collisionTargets = [...this.gphysic.GetObjects(), ...this.playerCtrl.targets];
        const hit = this.raycast.intersectObjects(collisionTargets, true)
            .find((intersect) => !this.isPlayerOwnedObject(intersect.object));

        if (hit) return hit.point;

        // 충돌체가 없으면 총구 방향의 최대 거리 지점 반환
        return muzzlePos.add(muzzleDir.multiplyScalar(maxDistance));
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
