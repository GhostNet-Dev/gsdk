import * as THREE from "three";
import { IActorState } from "./playerstate"
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
import { ActionCostSpec, cost } from "@Glibs/actors/battle/resourcecosttypes";

const DEFAULT_AIM_RANGE_ATTACK_COST: ActionCostSpec = {
    id: "attack.range.aim",
    cost: cost.all(
        cost.any(
            cost.atom("mp", 2),
        ),
        cost.optional(cost.atom("stamina", 1))
    )
}

export class AimRangeAttackState extends AttackState implements IActorState {
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
        this.player.EnableAimPitch(true)
    }

    private startFiring() {
        this.attackTime = 0;
        this.attackProcess = true;
        this.hasFired = true; 
        const handItem = this.playerCtrl.baseSpec.GetRangedItem()
        if (handItem == undefined) return;

        if (!this.tryConsumeAttackCost(this.resolveAttackCostSpec(handItem, DEFAULT_AIM_RANGE_ATTACK_COST), "자원이 부족합니다.")) {
            this.attackProcess = false
            return
        }

        this.eventCtrl.SendEventMessage(EventTypes.PlaySound, handItem.Mesh, handItem.Sound)

        this.keytimeout.push(setTimeout(() => {
            this.rangedAttack(handItem)
        }, this.attackSpeed * 1000 * 0.3))
    }

    rangedAttack(itemInfo: IItem) {
        const gunPos = new THREE.Vector3()
        this.player.GetMuzzlePosition(gunPos)

        // 가늠자(크로스헤어)와 동일한 기준: 카메라 중앙 레이캐스트로 타겟 지점 계산
        const aimTarget = this.getReticleWorldTarget(Math.max(this.attackDist, 100))
        const shootDir = this.computeShootDirectionFromGun(gunPos, aimTarget)
        this.attackDir.copy(shootDir)

        ;(itemInfo as Item).trigger("onFire", { direction: this.attackDir })

        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.WarhamerTracer,
            ownerSpec: this.baseSpec,
            damage: this.baseSpec.Damage,
            src: gunPos,
            dir: this.attackDir,
            range: gunPos.distanceTo(aimTarget), // 가늠자까지의 실제 거리
            hitscan: true,
            tracerLife: 2.12,
            useRaycast: true,
        })
        this.attackProcess = false
        return true
    }

    override Uninit(): void {
        this.player.EnableAimPitch(false)
        super.Uninit()
    }

    Update(delta: number): IActorState {
        const d = this.DefaultCheck({ attack: false, run: false })
        if (d != undefined) {
            this.Uninit()
            return d
        }
        if (this.clock == undefined) return this

        delta = this.clock?.getDelta()
        this.attackTime += delta

        // 🎯 핵심 개선: 조준 시차(Parallax) 수정
        // 화면 중앙 조준점이 가리키는 월드 상의 실제 지점을 찾고 캐릭터가 그곳을 바라보게 합니다.
        const targetPos = this.getReticleWorldTarget(100);
        const bodyAimTarget = this.getCameraForwardWorldTarget(1000)
        this.player.SetAimTarget(bodyAimTarget)
        this.player.Meshs.lookAt(
            targetPos.x,
            this.player.Pos.y,
            targetPos.z
        );

        // 🎯 가늠자는 카메라 중앙 레티클이 가리키는 실제 월드 지점을 따라가야
        // orbit 상/하 회전 시에도 함께 위아래로 이동한다.
        (this.playerCtrl.camera as any).setCrosshairWorldPosition(targetPos);

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
