import * as THREE from "three";
import { IPlayerAction } from "./playerstate"
import { Player } from "../player";
import { BaseSpec } from "../../battle/basespec";
import { PlayerCtrl } from "../playerctrl";
import { MonsterId } from "@Glibs/types/monstertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ActionType } from "../playertypes";
import { IItem } from "@Glibs/interface/iinven";
import { Item } from "@Glibs/inventory/items/item";
import { AttackState } from "./attackstate";
import { KeyType } from "@Glibs/types/eventtypes";

export class AimRangeAttackState extends AttackState implements IPlayerAction {
    constructor(playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic,
        protected eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic, eventCtrl, spec)
        this.raycast.params.Points.threshold = 20
    }

    private hasFired = false;

    Init(): void {
        this.attackProcess = false
        this.hasFired = false
        this.attackSpeed = this.baseSpec.AttackSpeed
        this.attackDist = this.baseSpec.AttackRange
        const handItem = this.playerCtrl.baseSpec.GetRangedItem()
        if (handItem == undefined) {
            this.player.ChangeAction(ActionType.Punch, this.attackSpeed)
        } else {
            const anim = this.getAnimationForItem(handItem)
            this.player.ChangeAction(anim, this.attackSpeed)
            ;(handItem as Item).activate()
            this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound)
        }

        this.attackTime = this.attackSpeed
        this.clock = new THREE.Clock()
        this.player.createDashedCircle(this.attackDist)
    }

    private startFiring() {
        this.attackTime = 0;
        this.attackProcess = true;
        this.hasFired = true; 
        const handItem = this.playerCtrl.baseSpec.GetRangedItem()
        if (handItem == undefined) return;

        this.eventCtrl.SendEventMessage(EventTypes.PlaySound, handItem.Mesh, handItem.Sound)

        this.keytimeout.push(setTimeout(() => {
            this.rangedAttack(handItem)
        }, this.attackSpeed * 1000 * 0.3))
    }

    rangedAttack(itemInfo: IItem) {
        const gunPos = new THREE.Vector3()
        this.player.GetMuzzlePosition(gunPos)

        // 화면 중앙 조준점이 가리키는 월드 좌표를 얻는다.
        const targetPos = this.getReticleWorldTarget(this.attackDist)
        // 실제 총구 기준 발사 벡터를 계산해 시차(parallax)를 제거한다.
        const shootDir = this.computeShootDirectionFromGun(gunPos, targetPos)
        this.attackDir.copy(shootDir)

        ;(itemInfo as Item).trigger("onFire", { direction: this.attackDir })

        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.BulletLine,
            ownerSpec: this.baseSpec,
            damage: this.baseSpec.Damage,
            src: gunPos,
            dir: this.attackDir,
            range: this.attackDist
        })
        this.attackProcess = false
        return true
    }

    override Uninit(): void {
        super.Uninit()
    }

    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck({ attack: false })
        if (d != undefined) {
            this.Uninit()
            return d
        }
        if (this.clock == undefined) return this

        delta = this.clock?.getDelta()
        this.attackTime += delta

        const camForward = new THREE.Vector3();
        this.playerCtrl.camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();
        this.player.Meshs.lookAt(
            this.player.Pos.x + camForward.x,
            this.player.Pos.y,
            this.player.Pos.z + camForward.z
        );

        if (this.attackProcess) return this

        // Cooldown/Animation Duration Check
        if (this.attackTime / this.attackSpeed < 1) return this

        // Cooldown finished.
        const firePressed = this.playerCtrl.KeyState[KeyType.Action1] === true

        if (firePressed) {
            // Keep firing in this state
            this.startFiring()
            return this
        }

        // If we already fired once and the button is released, return to Aim State
        if (this.hasFired) {
             return this.ChangeMode(this.playerCtrl.RangeAimSt)
        }

        // First fire trigger
        this.startFiring()

        return this
    }
}
