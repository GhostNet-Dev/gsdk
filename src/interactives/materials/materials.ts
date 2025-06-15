import { IAsset } from "@Glibs/interface/iasset";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { Char } from "@Glibs/loader/assettypes";
import { Loader } from "@Glibs/loader/loader";
import { Effector } from "@Glibs/magical/effects/effector";
import { EffectType } from "@Glibs/types/effecttypes";
import { EventTypes, TargetBox } from "@Glibs/types/globaltypes";
import { MonsterDb } from "@Glibs/types/monsterdb";
import { MonsterId } from "@Glibs/types/monstertypes";
import { AttackOption } from "@Glibs/types/playertypes";
import * as THREE from "three";

export class Materials implements ILoop {
    LoopId = 0
    // TODO 
    // loading material
    // respawning
    // drop items
    // receive damage
    stones: THREE.Group[] = []
    trees: THREE.Group[] = []
    private stoneBoxes: TargetBox[] = []
    private treeBoxes: TargetBox[] = []
    dropPos = new THREE.Vector3()

    material = new THREE.MeshBasicMaterial({ 
            //color: 0xD9AB61,
            transparent: true,
            opacity: .5,
            color: 0xff0000,
        })
    constructor(
        private player: IPhysicsObject,
        private worldSize: number,
        private loader: Loader,
        private eventCtrl: IEventController,
        private effector: Effector,
        private game: THREE.Scene,
        private monDb: MonsterDb,
    ) {
        eventCtrl.RegisterEventListener(EventTypes.Attack + "stone", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                let obj = opt.obj as TargetBox
                if (obj == null) return
                this.effector.meshs.position.copy(obj.position)
                this.effector.StartEffector(EffectType.Damage)
                const r = Math.random()
                if (r < .7) return
                this.dropPos.copy(obj.position)
                this.dropPos.z += 2
                this.eventCtrl.SendEventMessage(EventTypes.Drop, this.dropPos, this.monDb.GetItem(MonsterId.Stone).drop)

            })
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "tree", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                let obj = opt.obj as TargetBox
                if (obj == null) return
                this.effector.meshs.position.copy(obj.position)
                this.effector.StartEffector(EffectType.Damage)
                const r = Math.random()
                if (r < .7) return
                this.dropPos.copy(obj.position)
                this.dropPos.y = this.player.CenterPos.y
                this.dropPos.z += 5
                this.eventCtrl.SendEventMessage(EventTypes.Drop, this.dropPos, this.monDb.GetItem(MonsterId.Tree).drop)
            })
        })
        this.effector.Enable(EffectType.Damage, 0, 0, 1)
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        this.game.add(this.effector.meshs)
    }
    update(delta: number): void {
        this.effector.Update(delta)
    }
    async MassLoader() {
        return await Promise.all([
            this.StoneLoader(),
            this.MassTreeLoad()
        ])
    }
    async StoneLoader() {
        const pos = new THREE.Vector3()
        
        const radius = this.worldSize / 2
        for (let i = 0; i < 10; i++) {
            const phi = Math.random() * Math.PI * 2
            const r = THREE.MathUtils.randFloat(radius * 0.5, radius * .8)
            pos.set(
                r * Math.cos(phi),
                2,
                r * Math.sin(phi)
            )
            const scale = THREE.MathUtils.randInt(9, 15)
            const meshs = await this.LoadMaterials(this.loader.GetAssets(Char.Stone), scale, pos)

            const size = this.loader.GetAssets(Char.Stone).GetSize(meshs)
            const box = new TargetBox(i, "stone", MonsterId.Stone, new THREE.BoxGeometry(), this.material)
            box.scale.copy(size)
            box.position.copy(pos)
            box.position.z += 2
            box.visible = false
            this.stoneBoxes.push(box)
            this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, box)
            this.game.add(box, meshs)
        }
    }

    async MassTreeLoad() {
        const meshs = await this.loader.GetAssets(Char.Tree).CloneModel()
        const pos = new THREE.Vector3()
        const radius = this.worldSize / 2
        for (let i = 0; i < 300; i++) {
            const phi = Math.random() * Math.PI * 2
            const r = THREE.MathUtils.randFloat(radius * 1, radius * 2.5)
            pos.set(
                r * Math.cos(phi),
                0,
                r * (-Math.abs(Math.sin(phi)))
            )
            
            const scale = THREE.MathUtils.randInt(15, 20)
            const meshs = await this.LoadMaterials(this.loader.GetAssets(Char.Tree), scale, pos)
            this.trees.push(meshs)

            const size = this.loader.GetAssets(Char.Tree).GetSize(meshs)
            const box = new TargetBox(i, "tree", MonsterId.Tree, new THREE.BoxGeometry(), this.material)
            box.scale.set(size.x / 2, size.y, size.z / 2)
            box.position.copy(pos)
            box.visible = false
            this.treeBoxes.push(box)
            this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, box)
            this.game.add(box, meshs)
        }
        console.log("trea load complete")
    }
    async LoadMaterials(asset:IAsset, scale: number, position: THREE.Vector3) {
        const rotate = THREE.MathUtils.randFloat(0, 1)
        const meshs = await asset.CloneModel()
        meshs.scale.set(scale, scale, scale)
        meshs.position.set(position.x, position.y, position.z)
        meshs.rotateX(rotate)
        meshs.rotateZ(rotate)
        meshs.castShadow = true
        meshs.receiveShadow = true
        meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
        })
        return meshs
    }
}
