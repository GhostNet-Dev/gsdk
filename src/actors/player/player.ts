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
        this.eventCtrl.RegisterEventListener(EventTypes.Equipment, (id: ItemId) => {
            const slot = this.inventory.GetItem(id)
            if(slot == undefined) throw new Error("item is undefined")
            // right hand
            this.ReloadBindingItem(slot.item)
        })
    }
    GetItemPosition(target: THREE.Vector3) {
        const rightId = this.asset.GetBodyMeshId(Bind.Hands_R)
        if (rightId == undefined) return
        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        mesh.getWorldPosition(target)
    }
    GetMuzzlePosition(target: THREE.Vector3) {
        const mesh = this.meshs.getObjectByName("muzzlePoint")
        if (!mesh) return
        mesh.getWorldPosition(target)
    }
    ReloadBindingItem(item: IItem) {
        if(item.Bind == undefined) throw new Error("item bind is undefined")

        const rightId = this.asset.GetBodyMeshId(item.Bind)
        if (rightId == undefined) return

        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        const prev = this.bindMesh[item.Bind]

        if (prev) {
            //mesh.remove(prev)
            prev.visible = false
            delete this.bindMesh[item.Bind]
        }

        if (item && item.Mesh != undefined) {
            const find = mesh.getObjectById(item.Mesh.id)
            if(find) {
                find.visible = true
            } else {
                mesh.add(item.Mesh)
            }
            this.bindMesh[item.Bind] = item.Mesh
        }
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

        if(this.audioListener) this.meshs.add(this.audioListener)

        this.mixer = asset.GetMixer(name)

        this.clipMap.set(ActionType.Idle, asset.GetAnimationClip(Ani.Idle))
        this.clipMap.set(ActionType.TreeIdle, asset.GetAnimationClip(Ani.FightIdle))
        this.clipMap.set(ActionType.Run, asset.GetAnimationClip(Ani.Run))
        this.clipMap.set(ActionType.Jump, asset.GetAnimationClip(Ani.Jump))
        this.clipMap.set(ActionType.Punch, asset.GetAnimationClip(Ani.Punch))
        this.clipMap.set(ActionType.Sword, asset.GetAnimationClip(Ani.Sword))
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
        
        this.changeAnimate(this.clipMap.get(this.currentActionType))

        const box = asset.GetBox(this.meshs)
        const center = box.getCenter(new THREE.Vector3())
        this.effector.Enable(EffectType.BloodExplosion, center)


        this.meshs.visible = false
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
        let clip: THREE.AnimationClip | undefined
        this.currentActionType = action
        this.changeAnimate(this.clipMap.get(action), speed)
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
            positions.push(x, 0, z); // Y = 0 평면에 생성
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
        this.CBoxUpdate()
        if (this.line) this.line.position.copy(this.Pos)
    }
}
