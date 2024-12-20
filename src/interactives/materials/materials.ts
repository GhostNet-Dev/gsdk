import * as THREE from "three";
import { EventController, EventFlag } from "../event/eventctrl";
import { Game } from "./game";
import { Canvas } from "../common/canvas";
import { Tree } from "./plants/tree";
import { Stone } from "./models/stone";
import { AppMode } from "../app";
import { Loader } from "../loader/loader";
import { math } from "../../libs/math";
import { MonsterBox } from "./monsters/monsters";
import { AttackOption, PlayerCtrl } from "./player/playerctrl";
import { EffectType, Effector } from "../effects/effector";
import { Player } from "./player/player";
import { Drop } from "../inventory/drop";
import { MonsterDb } from "./monsters/monsterdb";
import { IViewer } from "./models/iviewer";
import { MonsterId } from "./monsters/monsterid";


export class Materials implements IViewer {
    // TODO 
    // loading material
    // respawning
    // drop items
    // receive damage
    stones: Stone[] = []
    trees: Tree[] = []
    private stoneBoxes: MonsterBox[] = []
    private treeBoxes: MonsterBox[] = []
    dropPos = new THREE.Vector3()
    effector = new Effector(this.game)

    material = new THREE.MeshBasicMaterial({ 
            //color: 0xD9AB61,
            transparent: true,
            opacity: .5,
            color: 0xff0000,
        })
    constructor(
        private player: Player,
        private playerCtrl: PlayerCtrl,
        private worldSize: number,
        private loader: Loader,
        eventCtrl: EventController,
        private game: Game,
        private canvas: Canvas,
        private drop: Drop,
        private monDb: MonsterDb,
    ) {
        eventCtrl.RegisterAppModeEvent((mode: AppMode, e: EventFlag) => {
            if (mode != AppMode.Play) return
            switch (e) {
                case EventFlag.Start:
                    break
                case EventFlag.End:
                    break
            }
        })
        eventCtrl.RegisterAttackEvent("stone", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                let obj = opt.obj as MonsterBox
                if (obj == null) return
                this.effector.meshs.position.copy(obj.position)
                this.effector.StartEffector(EffectType.Damage)
                const r = Math.random()
                if (r < .7) return
                this.dropPos.copy(obj.position)
                this.dropPos.z += 2
                this.drop.DropItem(this.dropPos, this.monDb.GetItem(MonsterId.Stone).drop)

            })
        })
        eventCtrl.RegisterAttackEvent("tree", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                let obj = opt.obj as MonsterBox
                if (obj == null) return
                this.effector.meshs.position.copy(obj.position)
                this.effector.StartEffector(EffectType.Damage)
                const r = Math.random()
                if (r < .7) return
                this.dropPos.copy(obj.position)
                this.dropPos.y = this.player.CenterPos.y
                this.dropPos.z += 5
                this.drop.DropItem(this.dropPos, this.monDb.GetItem(MonsterId.Tree).drop)
            })
        })
        this.effector.Enable(EffectType.Damage, 0, 0, 1)
        this.canvas.RegisterViewer(this)
        this.game.add(this.effector.meshs)
    }

    resize(): void { }
    update(delta: number): void {
        this.effector.Update(delta)
    }

    InitScene() {
    }
    async MassLoader() {
        return await Promise.all([
            this.StoneLoader(),
            this.MassTreeLoad()
        ])
    }

    async StoneLoader() {
        const meshs = await this.loader.StoneAsset.CloneModel()
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
            const stone = new Stone(this.loader.StoneAsset)
            const scale = math.rand_int(9, 15)
            await stone.MassLoader(meshs, scale, pos)

            const size = this.loader.StoneAsset.GetSize(stone.Meshs)
            const box = new MonsterBox(i, "stone", MonsterId.Stone, new THREE.BoxGeometry(), this.material)
            box.scale.copy(size)
            box.position.copy(pos)
            box.position.z += 2
            box.visible = false
            this.stoneBoxes.push(box)
            this.playerCtrl.add(box)
            this.game.add(box, stone.meshs)
        }
    }

    async MassTreeLoad() {
        const meshs = await this.loader.TreeAsset.CloneModel()
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
            
            const scale = math.rand_int(15, 20)
            const tree = new Tree(this.loader.TreeAsset)
            tree.MassLoad(meshs, scale, pos)
            this.trees.push(tree)

            const size = this.loader.TreeAsset.GetSize(tree.Meshs)
            const box = new MonsterBox(i, "tree", MonsterId.Tree, new THREE.BoxGeometry(), this.material)
            box.scale.set(size.x / 2, size.y, size.z / 2)
            box.position.copy(pos)
            box.visible = false
            this.treeBoxes.push(box)
            this.playerCtrl.add(box)
            this.game.add(box, tree.meshs)
        }
        console.log("trea load complete")
    }
}