import * as THREE from "three";
import { GhostModel } from "../models/ghostmodel";
import { IAsset } from "../../loader/assetmodel";
import { IPhysicsObject } from "../models/iobject";
import { IFurnMotions } from "./furnctrl";
import { FloatingName } from "../../common/floatingtxt";

export class FurnModel extends GhostModel implements IPhysicsObject, IFurnMotions {
    get BoxPos() { return this.asset.GetBoxPos(this.meshs) }
    constructor(asset: IAsset, private name: string) {
        super(asset)
        this.text = new FloatingName("제작을 시작해주세요")
    }
    async Init() { }
    Building(): void { }

    Done(): void {
        this.meshs.traverse(child => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = false;
                material.depthWrite = true;
                material.opacity = 1;
            }
        })
        if (this.text != undefined) {
            this.text.visible = false
        }
    }
    SetText(text: string) {
        this.text?.SetText(text)
    }
    Create() {
        if (this.text != undefined) {
            this.text.position.y = 4
            this.meshs.add(this.text)
        }
    }
    async MassLoader(position: THREE.Vector3, rotation?: THREE.Euler, id?: string) {
        if (id) {
            const [_meshs, _exist] = await this.asset.UniqModel(this.name + id)
            this.meshs = _meshs
        } else {
            this.meshs = await this.asset.CloneModel()
        }
        this.meshs.position.set(position.x, position.y, position.z)
        if (rotation) this.meshs.rotation.copy(rotation)
        this.meshs.castShadow = true
        this.meshs.receiveShadow = true
        this.meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
            if ('material' in child) {
                (child.material as THREE.MeshStandardMaterial).transparent = true;
                (child.material as THREE.MeshStandardMaterial).depthWrite = false;
                (child.material as THREE.MeshStandardMaterial).opacity = 0.3;
            }
        })
    }
}