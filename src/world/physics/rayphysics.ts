import * as THREE from "three";
import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { IGPhysic } from "./igphysics";
import { EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "@Glibs/interface/ievent";
import { PhysicBox } from "@Glibs/types/physicstypes";

export default class RayPhysics implements IGPhysic {
    player?: IPhysicsObject
    physicalObjs: IPhysicsObject[] = []
    targetObjs: THREE.Object3D[] = []

    timeScale = 1

    center = new THREE.Vector3()
    downDir = new THREE.Vector3(0, -1, 0)
    raycast = new THREE.Raycaster()

    constructor(private scene: THREE.Scene, eventCtrl: IEventController) {
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            this.timeScale = scale
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (obj: THREE.Object3D) => {
            this.targetObjs.push(obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.DeregisterPhysic, (obj: THREE.Object3D) => {
            this.targetObjs.splice(this.targetObjs.findIndex(o => o.uuid == obj.uuid), 1)
        })
    }
    addPlayer(model: IPhysicsObject): void {
        this.player = model
    }
    add(...models: IPhysicsObject[]): void {
        this.physicalObjs.push(...models)
        this.targetObjs.push(...models.map(obj => obj.Meshs))
    }
    CheckDirection(obj: IPhysicsObject, dir: THREE.Vector3) {
        obj.Box.getCenter(this.center)
        const height = (Math.floor(obj.Size.y * 100) / 100) / 2 - 0.2
        this.center.y -= height
        this.raycast.set(this.center, dir)
        this.raycast.far = 10
        const intersects = this.raycast.intersectObjects(this.targetObjs)
        let adjustedMoveVector
        if (intersects.length > 0) {
            const width = (Math.floor(obj.Size.z * 100) / 100) / 2
            const intersect = intersects[0];
            const ret = intersect.distance - width

            if(ret < width && intersect.face) {
                const normal = intersect.face.normal.clone().normalize(); // 충돌 면의 법선 벡터
                const slopeAngle = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0))) * (180 / Math.PI); // 경사 각도 계산

                console.log(`경사면 감지! 각도: ${slopeAngle.toFixed(2)}도`);

                // 가파른 경사(예: 45도 이상)에서는 이동 불가
                if (slopeAngle > 45) {
                    console.log("경사가 너무 가파름! 이동 제한");
                    return { obj: undefined, distance: -1}
                }

                // 경사면을 따라 이동하도록 벡터 조정
                adjustedMoveVector = dir.projectOnPlane(normal); // 경사면에 투영
            }
            console.log("move", ret, width, this.center)
            return { obj: intersects[0].object, distance: (ret < 0) ? -1 : ret, move: adjustedMoveVector }
        }
        return { obj: undefined, distance: 10 }
    }
    Check(obj: IPhysicsObject): boolean {
        if (this.CheckDown(obj) < 0) return true
        return this.CheckBoxs(obj)
    }
    CheckDown(obj: IPhysicsObject): number {
        obj.Box.getCenter(this.center)
        this.raycast.set(this.center, this.downDir)
        this.raycast.far = 10
        const landTouch = this.raycast.intersectObjects(this.targetObjs)
        if(landTouch.length > 0) {
            const height = obj.Size.y / 2
            const ret = landTouch[0].distance -  height
            //ret = Math.floor(ret * 100) / 100
            return ret //(ret < 0) ? -1 : ret
        }
        return this.raycast.far
    }
    CheckBox(pos: THREE.Vector3, box: THREE.Box3): boolean {
        return true
    }
    CheckBoxs(obj: IPhysicsObject): boolean {
        return true
    }
    addBuilding(model: IBuildingObject, pos: THREE.Vector3, size: THREE.Vector3, rotation?: THREE.Euler | undefined): void {
    }
    addLand(obj: THREE.Object3D): void {
        this.targetObjs.push(obj)
    }
    GetCollisionBox(pos: THREE.Vector3, target: THREE.Box3): [PhysicBox | undefined, string[]] {
        return [undefined, []]
    }
    DeleteBox(keys: string[], b: IBuildingObject): void {
        
    }
    clock = new THREE.Clock()
    update() {
        const delta = this.clock.getDelta() * this.timeScale
        this.physicalObjs.forEach(obj => {
            obj.update?.(delta)
        })
    }
}