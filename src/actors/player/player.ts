import * as THREE from "three";
import { Loader } from "@Glibs/loader/loader";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { EffectType } from "@Glibs/types/effecttypes";
import IEventController from "@Glibs/interface/ievent";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag } from "@Glibs/types/eventtypes";
import { Effector } from "@Glibs/magical/effects/effector";
import { Ani, Bind, Char } from "@Glibs/types/assettypes";
import { IAsset } from "@Glibs/interface/iasset";
import IInventory, { IItem } from "@Glibs/interface/iinven";
import { ActionType } from "./playertypes";
import { ItemId } from "@Glibs/inventory/items/itemdefs";



export class Player extends PhysicsObject {
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip
    currentActionType = ActionType.Idle

    private effector = new Effector(this.game, this.eventCtrl)
    private playerModel: Char = Char.CharHumanMale
    bindMesh: Record<string, THREE.Group> = {}

    private aimPitchEnabled = false
    private aimPitchTarget?: THREE.Vector3
    private currentAimPitch = 0
    private spineAimBones: THREE.Bone[] = []
    private spineAimPrevOffset = new Map<THREE.Bone, THREE.Quaternion>()
    private readonly spineAimPitchMaxUp = THREE.MathUtils.degToRad(45)
    private readonly spineAimPitchMaxDown = THREE.MathUtils.degToRad(35)
    private readonly spineAimLerpSpeed = 12

    clipMap = new Map<ActionType, THREE.AnimationClip | undefined>()
    meshs: THREE.Group
    constructor(
        private loader: Loader, 
        asset: IAsset,
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private inventory: IInventory,
        private audioListener?: THREE.AudioListener,
    ) {
        super(asset)
        this.meshs = new THREE.Group
        this.effector.Enable(EffectType.Status)

        this.eventCtrl.RegisterEventListener(EventTypes.AppMode, (mode: AppMode, e: EventFlag) => {
            if (mode == AppMode.Play || mode == AppMode.EditPlay || mode == AppMode.Weapon) {
                switch (e) {
                    case EventFlag.Start:
                        this.eventCtrl.SendEventMessage(EventTypes.CtrlObj, this)
                        this.Init()
                        break
                    case EventFlag.End:
                        this.Uninit()
                        break
                }
                return
            }
            this.meshs.visible = false
        })
    }
    GetItemPosition(target: THREE.Vector3) {
        const rightId = this.asset.GetBodyMeshId(Bind.Hands_R)
        if (rightId == undefined) {
            target.copy(this.Pos)
            return
        }
        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) {
            target.copy(this.Pos)
            return
        }
        mesh.getWorldPosition(target)
    }
    GetMuzzlePosition(target: THREE.Vector3) {
        const mesh = this.meshs.getObjectByName("muzzlePoint")
        if (!mesh) {
            this.GetItemPosition(target)
            return
        }
        mesh.getWorldPosition(target)
    }
    UnequipItem(bind: Bind) {
        const rightId = this.asset.GetBodyMeshId(bind)
        if (rightId == undefined) return
        
        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        const prev = this.bindMesh[bind]
        if (prev) {
            mesh.remove(prev) // Actually remove from the bone
            prev.visible = false
            delete this.bindMesh[bind]
        }
    }
    ReloadBindingItem(item: IItem) {
        const bind = item.Bind
        if(bind == undefined) throw new Error("item bind is undefined")

        const rightId = this.asset.GetBodyMeshId(bind)
        if (rightId == undefined) return

        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        const prev = this.bindMesh[bind]

        if (prev) {
            //mesh.remove(prev)
            prev.visible = false
            delete this.bindMesh[bind]
        }

        if (item && item.Mesh != undefined) {
            const find = mesh.getObjectById(item.Mesh.id)
            if(find) {
                find.visible = true
            } else {
                mesh.add(item.Mesh)
            }
            this.bindMesh[bind] = item.Mesh
        }
    }

    synchronizeWeaponVisibility(mode: 'melee' | 'ranged') {
        const meleeWeapon = this.bindMesh[Bind.Hands_R];
        const rangedWeapon = this.bindMesh[Bind.Weapon_Ranged];

        if (meleeWeapon) meleeWeapon.visible = (mode === 'melee');
        if (rangedWeapon) rangedWeapon.visible = (mode === 'ranged');
    }

    Uninit() {
        this.meshs.visible = false
    }

    Init(pos: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        this.meshs.position.copy(pos)
        console.log("player Init: ", pos)
        this.meshs.visible = true
    }

    async Viliageload(): Promise<void> {
        await this.Reload()
    }
    async Reload(): Promise<void> {
        const model = this.playerModel// this.store.PlayerModel
        
        if (this.playerModel == model) {
            return 
        }
        this.game.remove(this.meshs)
        await this.Loader(this.loader.GetAssets(model), this.meshs.position, "player")
        this.game.add(this.meshs)
    }

    async Loader(asset: IAsset, position: THREE.Vector3, name: string) {
        this.asset = asset
        this.playerModel = asset.Id
        const [meshs, _exist] = await asset.UniqModel(name)
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, meshs)
        
        this.meshs = meshs
        this.meshs.position.copy(position)

        this.audioListener && this.meshs.add(this.audioListener)

        this.mixer = asset.GetMixer(name)
        this.initializeAimPitchBones()

        this.clipMap.set(ActionType.Idle, asset.GetAnimationClip(Ani.Idle))
        this.clipMap.set(ActionType.TreeIdle, asset.GetAnimationClip(Ani.FightIdle))
        this.clipMap.set(ActionType.EventIdle, asset.GetAnimationClip(Ani.Idle))
        this.clipMap.set(ActionType.Run, asset.GetAnimationClip(Ani.Run))
        this.clipMap.set(ActionType.Jump, asset.GetAnimationClip(Ani.Jump))
        this.clipMap.set(ActionType.Punch, asset.GetAnimationClip(Ani.Punch))
        this.clipMap.set(ActionType.Rolling, asset.GetAnimationClip(Ani.Rolling))
        this.clipMap.set(ActionType.SleepingIdle, asset.GetAnimationClip(Ani.SleepingIdle))

        this.clipMap.set(ActionType.Sword, asset.GetAnimationClip(Ani.Sword))
        this.clipMap.set(ActionType.TwoHandSwordIdle, asset.GetAnimationClip(Ani.TwoHandSwordIdle))
        this.clipMap.set(ActionType.TwoHandSword1, asset.GetAnimationClip(Ani.TwoHandSword1))
        this.clipMap.set(ActionType.TwoHandSword2, asset.GetAnimationClip(Ani.TwoHandSword2))
        this.clipMap.set(ActionType.TwoHandSwordTonado, asset.GetAnimationClip(Ani.TwoHandSwordTonado))
        this.clipMap.set(ActionType.TwoHandSwordFinish, asset.GetAnimationClip(Ani.TwoHandSwordFinish))

        this.clipMap.set(ActionType.OneHandGun, asset.GetAnimationClip(Ani.Shooting))
        this.clipMap.set(ActionType.TwoHandGun, asset.GetAnimationClip(Ani.Gunplay))
        this.clipMap.set(ActionType.Fight, asset.GetAnimationClip(Ani.FightIdle))
        this.clipMap.set(ActionType.Dance, asset.GetAnimationClip(Ani.Dance0))
        this.clipMap.set(ActionType.MagicH1, asset.GetAnimationClip(Ani.MagicH1))
        this.clipMap.set(ActionType.MagicH2, asset.GetAnimationClip(Ani.MagicH2))
        this.clipMap.set(ActionType.Dying, asset.GetAnimationClip(Ani.Dying))
        this.clipMap.set(ActionType.PickFruit, asset.GetAnimationClip(Ani.PickFruit))
        this.clipMap.set(ActionType.PickFruitTree, asset.GetAnimationClip(Ani.PickFruitTree))
        this.clipMap.set(ActionType.PlantAPlant, asset.GetAnimationClip(Ani.PlantAPlant))
        this.clipMap.set(ActionType.Watering, asset.GetAnimationClip(Ani.Wartering))
        this.clipMap.set(ActionType.Hammering, asset.GetAnimationClip(Ani.Hammering))
        this.clipMap.set(ActionType.Building, asset.GetAnimationClip(Ani.Hammering))

        this.clipMap.set(ActionType.CutDownTree, asset.GetAnimationClip(Ani.AxeAttack))
        this.clipMap.set(ActionType.EventAction, asset.GetAnimationClip(Ani.PlantAPlant))
        this.clipMap.set(ActionType.AxeAttack, asset.GetAnimationClip(Ani.AxeAttack))
        this.clipMap.set(ActionType.AxeAttack360, asset.GetAnimationClip(Ani.AxeAttack360))
        this.clipMap.set(ActionType.AxeRun, asset.GetAnimationClip(Ani.AxeRun))

        this.clipMap.set(ActionType.SwordRun, asset.GetAnimationClip(Ani.SwordRun))
        this.clipMap.set(ActionType.PistolRun, asset.GetAnimationClip(Ani.PistolRun))
        this.clipMap.set(ActionType.PistolAimIdle, asset.GetAnimationClip(Ani.PistolAimIdle))
        this.clipMap.set(ActionType.RifleIdle, asset.GetAnimationClip(Ani.RifleIdle))
        this.clipMap.set(ActionType.RifleAimIdle, asset.GetAnimationClip(Ani.RifleAimIdle))
        this.clipMap.set(ActionType.RifleRun, asset.GetAnimationClip(Ani.RifleRun))
        
        this.changeAnimate(this.clipMap.get(this.currentActionType))

        const box = asset.GetBox(this.meshs)
        const center = box.getCenter(new THREE.Vector3())
        this.effector.Enable(EffectType.BloodExplosion, center)


        this.meshs.visible = false
    }

    private initializeAimPitchBones() {
        this.spineAimBones = []
        this.currentAimPitch = 0

        // 1. 실제 추출된 Mixamo 본 이름 중 상체 굽힘에 가장 적합한 본들 선택
        // Spine (하단) -> Spine1 (중간) -> Spine2 (상단/가슴)
        // 하단 Spine은 골반과 붙어있어 움직이면 하체가 어색해지므로 Spine1, Spine2를 주로 사용합니다.
        const targetNames = [
            "mixamorigSpine1", 
            "mixamorigSpine2",
            "mixamorig:Spine1",
            "mixamorig:Spine2"
        ]

        for (const name of targetNames) {
            const bone = this.meshs.getObjectByName(name)
            if (bone instanceof THREE.Bone) {
                this.spineAimBones.push(bone)
            }
        }

        // 2. 만약 찾지 못했다면 범용 키워드로 탐색 (Fallback)
        if (this.spineAimBones.length == 0) {
            this.meshs.traverse(obj => {
                if (obj instanceof THREE.Bone) {
                    const lowerName = obj.name.toLowerCase()
                    if (lowerName.includes("spine") && !lowerName.includes("hair") && !lowerName.includes("head")) {
                        this.spineAimBones.push(obj)
                    }
                }
            })
            // 정렬 및 핵심 본(상단 2개) 선택
            this.spineAimBones.sort((a, b) => {
                let depthA = 0, depthB = 0
                a.traverseAncestors(() => depthA++)
                b.traverseAncestors(() => depthB++)
                return depthA - depthB
            })
            if (this.spineAimBones.length > 2) {
                this.spineAimBones = this.spineAimBones.slice(-2)
            }
        }

        console.log(`[Player] Corrected Aim Bones:`, this.spineAimBones.map(b => b.name))
    }

    EnableAimPitch(enable: boolean) {
        this.aimPitchEnabled = enable
    }

    SetAimTarget(target: THREE.Vector3) {
        if (!this.aimPitchTarget) this.aimPitchTarget = new THREE.Vector3()
        this.aimPitchTarget.copy(target)
    }

    private resetAimPitch() {
        this.currentAimPitch = 0
    }

    private updateAimPitch(delta: number) {
        if (!this.aimPitchEnabled || !this.aimPitchTarget || this.spineAimBones.length == 0) {
            return
        }

        // 1. 타겟으로의 방향 벡터 계산
        const referenceBone = this.spineAimBones[Math.min(this.spineAimBones.length - 1, 1)]
        const fromPos = new THREE.Vector3()
        referenceBone.getWorldPosition(fromPos)

        const toTarget = new THREE.Vector3().subVectors(this.aimPitchTarget, fromPos).normalize()
        
        // 2. 상하 각도(Pitch) 계산
        // 수평 거리 대비 높이 차이를 이용
        const horizontalDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z)
        let targetPitch = Math.atan2(toTarget.y, horizontalDist)
        
        // 각도 제한 (라디안)
        targetPitch = THREE.MathUtils.clamp(targetPitch, -this.spineAimPitchMaxDown, this.spineAimPitchMaxUp)

        // 3. 부드러운 보간
        this.currentAimPitch = THREE.MathUtils.lerp(
            this.currentAimPitch,
            targetPitch,
            Math.min(1, delta * this.spineAimLerpSpeed)
        )

        // 4. 각 본에 회전 적용
        const count = this.spineAimBones.length
        const pitchPerBone = this.currentAimPitch / count

        const _boneWorldQuat = new THREE.Quaternion()
        for (const bone of this.spineAimBones) {
            // 월드 X축(pitch 회전축)을 본의 로컬 공간으로 변환한다.
            // 본의 로컬 좌표계는 바인드 포즈에 따라 월드와 다를 수 있으므로
            // 고정된 (1,0,0)을 쓰면 엉뚱한 방향으로 회전한다.
            bone.getWorldQuaternion(_boneWorldQuat)
            const localAxis = new THREE.Vector3(1, 0, 0)
                .applyQuaternion(_boneWorldQuat.invert())
                .normalize()

            // Mixamo FBX: 로컬 X 양방향 = 앞으로 꺾임(pitch down)
            // 위를 조준(양수 pitch)할 때는 반대 부호를 적용해야 뒤로 젖혀진다.
            const q = new THREE.Quaternion().setFromAxisAngle(localAxis, -pitchPerBone)
            bone.quaternion.multiply(q)
        }
    }
    changeAnimate(animate: THREE.AnimationClip | undefined, speed?: number) {
        if (animate == undefined || this.currentClip == animate) return
        
        let fadeTime = 0.2
        this.currentAni?.fadeOut(0.2)
        const currentAction = this.mixer?.clipAction(animate)
        if (currentAction == undefined) return

        if (animate == this.clipMap.get(ActionType.Jump) || 
            animate == this.clipMap.get(ActionType.Dying)
        ) {
            fadeTime = 0
            currentAction.clampWhenFinished = true
            currentAction.setLoop(THREE.LoopOnce, 1)
        } else {
            currentAction.setLoop(THREE.LoopRepeat, Infinity)
        }
        if(speed != undefined) {
            currentAction.timeScale = animate.duration / speed
        }
        currentAction.reset().fadeIn(fadeTime).play()

        this.currentAni = currentAction
        this.currentClip = animate
    }

    clock = new THREE.Clock()

    ChangeAction(action: ActionType, speed?: number) {
        const clip = this.clipMap.get(action)
        this.currentActionType = action
        this.changeAnimate(clip, speed)
        return clip?.duration
    }

 /**
 * 사정거리 표시용 점선 원 생성
 * @param radius 사정거리 (원 반지름)
 * @param segments 원의 부드러움 (기본: 64)
 */
    line?: THREE.Line
    radius = 0
    createDashedCircle(
        radius: number,
        segments: number = 32
    ): THREE.Line {
        if(this.radius == radius && this.line) {
            this.game.add(this.line)
            return this.line
        } else {
            this.releaseDashsedCircle()
        }
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            positions.push(x, 0.1, z); // Y = 0 평면에 생성
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeBoundingSphere();

        const material = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 0.5,
            gapSize: 0.3,
        });

        const line = new THREE.Line(geometry, material);
        line.computeLineDistances(); // 점선 설정 필수
        this.game.add(line);
        this.line = line
        this.radius = radius
        return line;
    }
    releaseDashsedCircle() {
        if (this.line) this.game.remove(this.line)
    }
    DamageEffect(damage: number) {
        this.effector.StartEffector(EffectType.BloodExplosion, this.CenterPos)
        this.effector.StartEffector(EffectType.Status, damage.toString(), "#fff")
    }
    HealEffect(heal: number) {
        this.effector.StartEffector(EffectType.Status, "+" + heal, "#fff")
    }
    Update(delta: number) {
        this.effector.Update(delta)
        this.mixer?.update(delta)
        this.updateAimPitch(delta)
        this.CBoxUpdate()
        if (this.line) this.line.position.copy(this.Pos)
    }
}
