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

        // 가늠자 배치와 동일한 레이캐스트(총구 방향)를 사용 → 방향·거리 일치
        // Update()의 getMuzzleWorldTarget(100)과 같은 기준점
        const aimTarget = this.getMuzzleWorldTarget(Math.max(this.attackDist, 100))
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

        // 🎯 핵심 개선: 조준 시차(Parallax) 수정
        // 화면 중앙 조준점이 가리키는 월드 상의 실제 지점을 찾고 캐릭터가 그곳을 바라보게 합니다.
        const targetPos = this.getReticleWorldTarget(100); 
        this.player.Meshs.lookAt(
            targetPos.x,
            this.player.Pos.y,
            targetPos.z
        );

        // 🎯 추가: 총구 방향 충돌 지점에 가늠자 배치
        const muzzleHitPoint = this.getMuzzleWorldTarget(100);
        (this.playerCtrl.camera as any).setCrosshairWorldPosition(muzzleHitPoint);

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
