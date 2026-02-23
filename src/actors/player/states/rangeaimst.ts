import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate";
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

export class RangeAimState extends State implements IPlayerAction {
    private waitReleaseBeforeFire = false
    private keepAimCameraOnExit = false

    constructor(
        playerCtrl: PlayerCtrl,
        player: Player,
        gphysic: IGPhysic,
        private eventCtrl: IEventController,
        baseSpec: BaseSpec,
    ) {
        super(playerCtrl, player, gphysic, baseSpec)
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
        this.player.ChangeAction(this.getAnimationForItem(handItem), this.baseSpec.AttackSpeed)
        this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.AimThirdPerson)
        this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, true)
        this.player.createDashedCircle(this.baseSpec.AttackRange)
        this.waitReleaseBeforeFire = this.playerCtrl.KeyState[KeyType.Action1] === true

        ;(handItem as Item).activate()
        this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound)
    }

    Uninit(): void {
        if (!this.keepAimCameraOnExit) {
            this.eventCtrl.SendEventMessage(EventTypes.AimOverlay, false)
            this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.ThirdFollowPerson)
        }
        this.player.releaseDashsedCircle()
    }

    Update(): IPlayerAction {
        const d = this.DefaultCheck({ attack: false })
        if (d != undefined) {
            this.Uninit()
            return d
        }

        const camForward = new THREE.Vector3();
        this.playerCtrl.camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();
        this.player.Meshs.lookAt(
            this.player.Pos.x + camForward.x,
            this.player.Pos.y,
            this.player.Pos.z + camForward.z
        );

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

    private getAnimationForItem(item: any): ActionType {
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
