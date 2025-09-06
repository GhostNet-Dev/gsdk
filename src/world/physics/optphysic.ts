import * as THREE from "three";
import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { IGPhysic } from "./igphysics";
import { EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "@Glibs/interface/ievent";
import { PhysicBox } from "@Glibs/types/physicstypes";
import { OctreeNode, SpatialObject } from "./octreenode";

export default class OptPhysics implements IGPhysic {
    player?: IPhysicsObject
    physicalObjs: IPhysicsObject[] = []
    targetObjs: THREE.Object3D[] = []

    timeScale = 1

    center = new THREE.Vector3()
    downDir = new THREE.Vector3(0, -1, 0)
    raycast = new THREE.Raycaster()
    planeHeightMap?: PlaneHeightMap
    octreenode?: OctreeNode
    marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );

    constructor(private scene: THREE.Scene, eventCtrl: IEventController) {
        this.raycast.far = 2
        this.scene.add(this.marker)
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            this.timeScale = scale
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterLandPhysic, (obj: THREE.Mesh<THREE.PlaneGeometry>) => {
            this.planeHeightMap = new PlaneHeightMap(obj)
            this.octreenode = new OctreeNode(OctreeNode.computeWorldBounds(obj, 100))
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (obj: THREE.Object3D, raycastOn = false) => {
            this.targetObjs.push(obj)
            const spatialObj: SpatialObject = {
                id: obj.uuid, object3d:obj, box: new THREE.Box3().setFromObject(obj), raycastOn
            }
            this.visualizeBox3(spatialObj.box)
            this.octreenode!.insert(spatialObj)
            obj.userData.spatialObj = spatialObj
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysicBox, (obj: THREE.Box3, uuid:string, raycastOn = false) => {
        })
        eventCtrl.RegisterEventListener(EventTypes.DeregisterPhysic, (obj: THREE.Object3D) => {
            const spatialObj = obj.userData.spatialObj
            this.octreenode!.remove(spatialObj)
            this.targetObjs.splice(this.targetObjs.findIndex(o => o.uuid == obj.uuid), 1)
        })
    }
    visualizeBox3(box: THREE.Box3, color: number = 0xff0000) {
        // three/examples/jsm/helpers/Box3Helper 사용
        const helper = new THREE.Box3Helper(box, color);
        this.scene.add(helper);
        return helper;
    }

    addPlayer(model: IPhysicsObject): void {
        this.player = model
    }
    add(...models: IPhysicsObject[]): void {
        this.physicalObjs.push(...models)
        this.targetObjs.push(...models.map(obj => obj.Meshs))
    }
    GetObjects(): THREE.Object3D[] {
        return this.targetObjs
    }
    CheckDirection(obj: IPhysicsObject, dir: THREE.Vector3) {
        const ret = this.checkRayBox(obj, obj.Meshs.getWorldDirection(new THREE.Vector3()))
        if(ret.obj) return ret
        return {obj:undefined, ...this.planeHeightMap!.checkDirection(obj, dir)}
    }
    Check(obj: IPhysicsObject): boolean {
        if (this.CheckDown(obj) < 0) return true
        return this.CheckBoxs(obj)
    }
    CheckDown(obj: IPhysicsObject): number {
        const ret = this.checkRayBox(obj, this.downDir)
        if(ret.distance < 0) return 0
        // 중력 처리 전/후 등에 호출
        const x = obj.Pos.x;
        const z = obj.Pos.z;
        const terrainY = this.planeHeightMap!.getHeightAt(x, z);
        // console.log("Player:" + obj.Pos.y + " - " + terrainY + " = " + (obj.Pos.y - terrainY ))
        const dis = obj.Pos.y - terrainY - 0.01
        if(!ret.obj) {
            return dis
        }
        // 플레이어 발이 terrainY 위에 있어야 한다고 가정
        return  (dis > ret.distance) ? ret.distance : dis
    }

    CheckDownAABB(obj: IPhysicsObject): number {
        const objBox = obj.Box.clone(); // AABB: THREE.Box3
        const objBottomY = objBox.min.y;

        let minDist = Infinity;

        for (const target of this.targetObjs) {
            const targetBox = new THREE.Box3().setFromObject(target);
            const targetTopY = targetBox.max.y;

            const horizontalOverlap =
                objBox.max.x > targetBox.min.x &&
                objBox.min.x < targetBox.max.x &&
                objBox.max.z > targetBox.min.z &&
                objBox.min.z < targetBox.max.z;

            if (horizontalOverlap && objBottomY >= targetTopY) {
                const dist = objBottomY - targetTopY;
                if (dist < minDist) {
                    minDist = dist;
                }
            }
        }

        return (minDist < Infinity) ? minDist : 5; // 5는 raycast.far과 동일한 fallback
    }
    checkRayBox(obj: IPhysicsObject, dir: THREE.Vector3) {
        obj.Box.getCenter(this.center)
        // 3) 브로드페이즈: AABB 교차로 후보 수집
        const candidates = this.octreenode!.getCandidatesInBox(obj.Box, { 
            origin: this.center, dir: dir, maxDist: 8
        });

        if(candidates.length == 0) return { obj: undefined, distance: this.raycast.far }

        const rayObj = candidates.filter(o => o.raycastOn).map(o => o.object3d)
        if(rayObj.length == 0) {
            if(candidates.length > 0) {
                return { obj: candidates[0].object3d, distance: 0 }
            }
            return { obj: undefined, distance: this.raycast.far }
        }

        // 4) 내로페이즈: Raycaster로 정밀 충돌
        const height = (Math.floor(obj.Size.y * 100) / 100) / 2 - 0.2
        this.center.y -= height
        this.raycast.set(this.center, dir)
        const intersects = this.raycast.intersectObjects( rayObj, true); 
        let adjustedMoveVector

        const candidatePoint = obj.Pos.clone().add(dir.clone().multiplyScalar(2));
        this.marker.position.copy(candidatePoint);

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
                    return { obj: intersects[0].object, distance: -1}
                }

                // 경사면을 따라 이동하도록 벡터 조정
                adjustedMoveVector = dir.clone().projectOnPlane(normal); // 경사면에 투영
            }
            console.log("move", ret, width, this.center)
            return { obj: intersects[0].object, distance: (ret < 0) ? -1 : ret, move: adjustedMoveVector }
        }
        return { obj: undefined, distance: this.raycast.far }
    }

    CheckBox(pos: THREE.Vector3, box: THREE.Box3): boolean {
        return false
    }
    CheckBoxs(obj: IPhysicsObject): boolean {
        const ret = this.checkRayBox(obj, obj.Meshs.getWorldDirection(new THREE.Vector3()))
        return ret.obj ? true : false
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

class PlaneHeightMap {
  
  private heights: number[][];
  private mesh: THREE.Mesh<THREE.PlaneGeometry>;
  private width: number;
  private depth: number;
  private segX: number;
  private segY: number;

  constructor(mesh: THREE.Mesh<THREE.PlaneGeometry>) {
    this.mesh = mesh;
    const geom = mesh.geometry;
    const p = (geom as any).parameters;
    this.width = p.width;
    this.depth = p.height;
    this.segX = p.widthSegments;
    this.segY = p.heightSegments;

    this.heights = [];
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j <= this.segY; j++) {
      this.heights[j] = [];
      for (let i = 0; i <= this.segX; i++) {
        const idx = j * (this.segX + 1) + i;
        this.heights[j][i] = posAttr.getY(idx);
      }
    }
  }

  getHeightAt(worldX: number, worldZ: number): number {
    const local = new THREE.Vector3(worldX, 0, worldZ);
    this.mesh.worldToLocal(local);

    const fx = (local.x + this.width * 0.5) / this.width * this.segX;
    const fz = (local.z + this.depth * 0.5) / this.depth * this.segY;
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;

    const i0 = THREE.MathUtils.clamp(i, 0, this.segX);
    const j0 = THREE.MathUtils.clamp(j, 0, this.segY);
    const i1 = THREE.MathUtils.clamp(i + 1, 0, this.segX);
    const j1 = THREE.MathUtils.clamp(j + 1, 0, this.segY);

    const h00 = this.heights[j0][i0];
    const h10 = this.heights[j0][i1];
    const h01 = this.heights[j1][i0];
    const h11 = this.heights[j1][i1];

    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    const localY = h0 * (1 - tz) + h1 * tz;

    return this.mesh.position.y + localY * this.mesh.scale.y;
  }

  checkDirection(
    obj: { Box: THREE.Box3; Size: THREE.Vector3 },
    dir: THREE.Vector3,
    maxDist = 2,
    slopeLimit = 45
  ): { distance: number; move?: THREE.Vector3 } {
    const center = new THREE.Vector3();
    obj.Box.getCenter(center);
    center.y -= obj.Size.y / 2 - 0.2;

    const fdir = dir.clone().setY(0);
    if (fdir.lengthSq() === 0) return { distance: maxDist };
    fdir.normalize();

    const h1 = this.getHeightAt(center.x, center.z);
    const p2 = center.clone().add(fdir.multiplyScalar(maxDist));
    const h2 = this.getHeightAt(p2.x, p2.z);

    const dh = h2 - h1;
    const angle = Math.atan2(dh, maxDist) * THREE.MathUtils.RAD2DEG;
    if (Math.abs(angle) > slopeLimit) return { distance: -1 };

    const grad = dh / maxDist;
    const normal = new THREE.Vector3(-fdir.x * grad, 1, -fdir.z * grad).normalize();
    const move = dir.clone().projectOnPlane(normal).normalize();

    const dist = maxDist - obj.Size.z / 2;
    return { distance: dist, move };
  }
}