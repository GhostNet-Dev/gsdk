import * as THREE from "three";
import { BrickShapeType } from "./legos";
import { GhostObject } from "@Glibs/interface/iobject";

export enum BrickGuideType {
    Lego,
    NonLego,
    Delete,
    Event
}

export class BrickGuide extends GhostObject {
    ShapeType = BrickShapeType.Rectangle
    deleteMode = false

    get Creation() { return this.creationFlag }
    set Creation(flag: boolean) {
        if (flag) {
            (this.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00)
        } else {
            (this.material as THREE.MeshBasicMaterial).color.setHex(0xff0000)
        }
        if (this.deleteMode) this.Visible = flag
        this.creationFlag = flag
    }
    private contollerEnable: boolean = true
    private creationFlag = false

    get BoxPos() { return this.position }

    set ControllerEnable(flag: boolean) { this.contollerEnable = flag }
    get ControllerEnable(): boolean { return this.contollerEnable }

    constructor(pos: THREE.Vector3, size: THREE.Vector3, _type: BrickGuideType) {
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(0, 255, 0),
            transparent: true,
            opacity: 0.5,
            
        })
        super(geometry, material)
        this.castShadow = true
        this.size = size
        this.scale.copy(size)

        this.Init(pos)
    }

    Init(pos: THREE.Vector3) { 
        const x = pos.x - pos.x % this.Size.x
        const z = pos.z - pos.z % this.Size.z
        this.position.set(x, pos.y, z)
        this.position.y = this.CenterPos.y
    }
    DeleteMode(mode: boolean) {
        if(mode) this.scale.set(1, 1, 1)
        this.deleteMode = mode
    }
}
