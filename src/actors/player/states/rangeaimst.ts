import * as THREE from "three";
import { IPlayerAction } from "./playerstate";
import { Player } from "../player";
import { BaseSpec } from "../../battle/basespec";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { CameraMode } from "@Glibs/systems/camera/cameratypes";
import { PlayerCtrl } from "../playerctrl";
import { ActionType } from "../playertypes";
import { Item } from "@Glibs/inventory/items/item";
import { KeyType } from "@Glibs/types/eventtypes";
import { AttackItemType } from "@Glibs/types/inventypes";
import { AttackState } from "./attackstate";

export class RangeAimState extends AttackState implements IPlayerAction {
    private waitReleaseBeforeFire = false
    private keepAimCameraOnExit = false

    constructor(
        playerCtrl: PlayerCtrl,
        player: Player,
        gphysic: IGPhysic,
        protected eventCtrl: IEventController,
        baseSpec: BaseSpec,
    ) {
        super(playerCtrl, player, gphysic, eventCtrl, baseSpec)
    }

    Init(): void {
        const handItem = this.playerCtrl.baseSpec.GetRangedItem()
        if (!handItem) {
            this.playerCtrl.currentIdleState.Init()
            return
        }
        if (handItem.AutoAttack) {
            this.playerCtrl.RangeAttackSt.Init()
            return
        }

        this.keepAimCameraOnExit = false
        this.player.ChangeAction(this.getAnimationForItem(handItem))
        this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.AimThirdPerson)
        this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, true)
        this.player.createDashedCircle(this.baseSpec.AttackRange)
        this.waitReleaseBeforeFire = this.playerCtrl.KeyState[KeyType.Action1] === true

        ;(handItem as Item).activate()
        this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound)
    }

    override Uninit(): void {
        if (!this.keepAimCameraOnExit) {
            this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, false)
            this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.ThirdFollowPerson)
        }
        super.Uninit()
    }

    Update(): IPlayerAction {
        const d = this.DefaultCheck({ attack: false })
        if (d != undefined) {
            this.Uninit()
            return d
        }

        // 🎯 핵심 개선: 조준 시차(Parallax) 수정
        // 1. 화면 중앙 조준점이 가리키는 월드 상의 실제 지점을 찾습니다.
        const targetPos = this.getReticleWorldTarget(100); 

        // 2. 캐릭터가 그 지점을 바라보게 합니다.
        // Y축은 캐릭터의 높이를 유지하여 캐릭터가 앞으로 고꾸라지거나 뒤로 젖혀지지 않게 합니다.
        this.player.Meshs.lookAt(
            targetPos.x,
            this.player.Pos.y,
            targetPos.z
        );

        // 🎯 추가: 총구 방향 충돌 지점에 가늠자 배치
        const muzzleHitPoint = this.getMuzzleWorldTarget(100);
        (this.playerCtrl.camera as any).setCrosshairWorldPosition(muzzleHitPoint);

        const firePressed = this.playerCtrl.KeyState[KeyType.Action1] === true
        if (this.waitReleaseBeforeFire) {
            if (!firePressed) this.waitReleaseBeforeFire = false
            return this
        }

        if (firePressed) {
            this.keepAimCameraOnExit = true
            this.Uninit()
            this.playerCtrl.AimRangeAttackSt.Init()
            return this.playerCtrl.AimRangeAttackSt
        }

        return this
    }

    public override getAnimationForItem(item: any): ActionType {
        switch (item.AttackType) {
            case AttackItemType.OneHandGun:
                return ActionType.PistolAimIdle
            case AttackItemType.TwoHandGun:
                return ActionType.RifleAimIdle
            default:
                return ActionType.Punch
        }
    }
}
