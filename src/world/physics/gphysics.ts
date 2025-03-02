import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { IGPhysic } from "./igphysics";
import { PhysicBox } from "./physicstypes";


type MovingBox = {
    model: IPhysicsObject,
    box: THREE.Mesh | undefined
}

export class GPhysics implements IGPhysic {
    movingBoxs: MovingBox[] = []
    player?: IPhysicsObject
    landPos = new THREE.Vector3()
    lands: THREE.Object3D[] = []

    objs: IGPhysic[] = []
    physicalObjs: IPhysicsObject[] = []
    pboxs = new Map<string, PhysicBox[]>()
    debugBoxMat = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true})
    /*
    debugBoxMat = new THREE.MeshBasicMaterial({ 
            transparent: true,
            opacity: .5,
            color: 0xff0000,
            //depthWrite: false,
        })
        */

    debugBox: THREE.Mesh[] = []
    get LandY() { return this.landPos.y }

    timeScale = 1

    constructor(private scene: THREE.Scene, eventCtrl: IEventController) {
        eventCtrl.RegisterEventListener(EventTypes.SceneClear, () => {
            this.PBoxDispose()
        })
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            this.timeScale = scale
        })
    }

    Register(obj: IGPhysic) {
        this.objs.push(obj)
    }
    Deregister(obj: IGPhysic) {
        this.objs.splice(this.objs.indexOf(obj), 1)
    }

    DebugMode(flag: boolean) {
        console.log("movingBox: ", this.movingBoxs.length)
        console.log("buildingBox: ", this.debugBox.length)
        console.log("pbox: ", this.pboxs.size)
        /*
        this.pboxs.forEach((vs, k) => {
            vs.forEach((v) => {
                console.log(k, v.pos)
            })
        })
        */
        if(flag) {
            this.movingBoxs.forEach((box) => {
                if (!box.box) return
                this.scene.remove(box.box)
            })
            this.debugBox.forEach((box) => {
                this.scene.remove(box)
            })
        } else {
            this.movingBoxs.forEach((box) => {
                if (!box.box) return
                this.scene.add(box.box)
            })
            this.debugBox.forEach((box) => {
                this.scene.add(box)
            })
        }
    }

    PBoxDispose() {
        console.log("Physical Box Clear")
        this.pboxs.clear()
        this.debugBox.forEach((box) => {
            this.scene.remove(box)
        })
        this.debugBox.length = 0
    }

    addPlayer(model: IPhysicsObject) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(model.Size.x, model.Size.y, model.Size.z), this.debugBoxMat)

        this.player = model
        this.physicalObjs.push(model)
        this.movingBoxs.push({ model: model, box: box })
    }

    add(...models: IPhysicsObject[]) {
        models.forEach((model) => {
            // for debugggin
            const box = new THREE.Mesh(new THREE.BoxGeometry(model.Size.x, model.Size.y, model.Size.z), this.debugBoxMat)
            this.movingBoxs.push({ model: model, box: box })
            this.physicalObjs.push(model)
        })
    }
    addMeshBuilding(...models: IBuildingObject[]) {
        models.forEach((model) => {
            // for debugggin
            const box = new THREE.Mesh(new THREE.BoxGeometry(model.Size.x, model.Size.y, model.Size.z), this.debugBoxMat)
            const p = model.BoxPos
            box.position.set(p.x, p.y, p.z)
            this.debugBox.push(box)

            this.addBoxs({
                pos: p,
                box: new THREE.Box3().setFromObject(box),
                model: model,
            })
        })
    }
    addBuilding(model: IBuildingObject, pos: THREE.Vector3, size: THREE.Vector3, rotation?: THREE.Euler) {
        // for debugggin
        const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.debugBoxMat)
        pos.y += size.y / 2
        box.position.copy(pos)
        box.scale.copy(size)
        this.scene.add(box)
        //box.scale.set(size.x * 1.1, size.y * 1.1, size.z * 1.1)
        if (rotation) box.rotation.copy(rotation)

        this.debugBox.push(box)

        this.addBoxs({ 
            pos: pos, 
            box: new THREE.Box3().setFromObject(box),
            model: model
        })
    }
    addLand(obj: THREE.Object3D) {
        this.lands.push(obj)
        this.landPos.y = 0
        console.log("Land: " , this.landPos, obj)
    }
    optx = 10
    opty = 10
    optz = 10
    makeHash(pos: THREE.Vector3, size: THREE.Vector3) {
        const sx = Math.floor(Math.floor(pos.x)/ this.optx)
        const sy = Math.floor(Math.floor(pos.y)/ this.opty)
        const sz = Math.floor(Math.floor(pos.z)/ this.optz)

        const ex = Math.ceil(Math.ceil(pos.x + size.x) / this.optx)
        const ey = Math.ceil(Math.ceil(pos.y + size.y) / this.opty)
        const ez = Math.ceil(Math.ceil(pos.z + size.z) / this.optz)
        const ret: string[] = []
        for (let x = sx; x <= ex; x++)
            for (let y = sy; y <= ey; y++)
                for (let z = sz; z <= ez; z++) {
                    ret.push(x + "." + y + "." + z)
                }
        return ret
    }
    addBoxs(box: PhysicBox) {
        const p = box.pos
        const keys = this.makeHash(p, box.box.getSize(new THREE.Vector3))
        keys.forEach((key) => {
            const boxs = this.pboxs.get(key)
            if (boxs == undefined) {
                this.pboxs.set(key, [box])
            } else {
                boxs.push(box)
            }
        })
        box.model.Key = keys
    }
    CheckDown(obj: IPhysicsObject): number {
        return this.checkDown(obj)
    }
    CheckBoxs(obj: IPhysicsObject): boolean {
        const pos = obj.BoxPos
        const keys = this.makeHash(pos, obj.Size)
        const ret = keys.some((key) => {
            const boxs = this.pboxs.get(key)
            if (boxs == undefined) return false

            const objBox = obj.Box
            return boxs.some(box => {
                if (objBox.intersectsBox(box.box)) {
                    box.model.Collision(obj)
                    //console.log("Collision!!!!", objBox, box.box, key)
                    return true
                }
                return false
            });
        })
        return ret
    }
    CheckDirection(obj: IPhysicsObject, dir: THREE.Vector3) {
        return { obj: undefined, distance: (this.Check(obj)) ? 0 : -1 }
    }
    Check(obj: IPhysicsObject): boolean {
        const pos = obj.BoxPos
        // if (pos.y < -10) return true
        if (this.checkDown(obj) < 0) return true
        return this.CheckBoxs(obj)
    }
    CheckBox(pos: THREE.Vector3, box: THREE.Box3) {
        const keys = this.makeHash(pos, box.getSize(new THREE.Vector3))
        const ret = keys.some((key) => {
            const boxs = this.pboxs.get(key)
            if (boxs == undefined) return false

            const objBox = box
            return boxs.some(box => {
                if (objBox.intersectsBox(box.box)) {
                    //console.log("Collision!!!!", key)
                    return true
                }
                return false
            });
        })
        return ret
    }
    DeleteBox(keys: string[], b: IBuildingObject) {
        keys.forEach((key) => {
            const boxs = this.pboxs.get(key)
            if (boxs == undefined) return false
            for (let i = boxs.length - 1; i >= 0; i--) {
                if (boxs[i].model == b) {
                    boxs.splice(i, 1)
                }
            }
            /*
            for (let i = 0; i < boxs.length; i++) {
                if (boxs[i].model == b) {
                    boxs.splice(i, 1)
                    i--
                }
            }*/
        })
    }
    GetCollisionBox(pos: THREE.Vector3, target: THREE.Box3): [PhysicBox | undefined, string[]]{
        const keys = this.makeHash(pos, target.getSize(new THREE.Vector3))
        let retObj: PhysicBox | undefined
        const retKey: string[] = []
        keys.some((key) => {
            const boxs = this.pboxs.get(key)
            if (boxs == undefined) return false

            const objBox = target
            boxs.some(box => {
                if (objBox.intersectsBox(box.box)) {
                    //console.log("Collision!!!!", key)
                    retObj = box
                    retKey.push(key)
                }
            });
        })
        return [retObj, retKey]
    }
    center = new THREE.Vector3()
    downDir = new THREE.Vector3(0, -1, 0)
    downcast = new THREE.Raycaster()
    checkDown(obj: IPhysicsObject) {
        obj.Box.getCenter(this.center)
        this.center.y -= obj.Size.y / 2
        this.downcast.set(this.center, this.downDir)
        this.downcast.far = 10
        const landTouch = this.downcast.intersectObjects(this.lands)
        if(landTouch.length > 0) {
            return landTouch[0].distance
        }
        return -1

    }
    // checkGravity(delta: number) {
    //     if (this.player == undefined) return
    //     if (this.player.Velocity != 0) {
    //         // const movY = this.player.Velocity * delta
    //         // this.player.Meshs.position.y -= movY
    //         if (this.Check(this.player) || this.checkDown()) {
    //             // this.player.Meshs.position.y += movY
    //             // this.player.Velocity = 0
    //             return true
    //         }
    //         this.player.Velocity -= 9.8 * 2 * delta
    //         console.log(this.player.Velocity)
    //     }
    // }

    clock = new THREE.Clock()
    update() {
        const delta = this.clock.getDelta() * this.timeScale
        this.physicalObjs.forEach(obj => {
            obj.update?.(delta)
        })
        this.movingBoxs.forEach((phy) => {
            const v = phy.model.BoxPos
            if(phy.box != undefined) {
                phy.box.position.copy(v)
            }
        })
        //this.checkGravity(delta)
        //if ( this.player == undefined) return 
        //this.Check(this.player)
    }
}
