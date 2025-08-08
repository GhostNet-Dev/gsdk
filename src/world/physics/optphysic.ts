import * as THREE from "three";
import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { IGPhysic } from "./igphysics";
import { EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "@Glibs/interface/ievent";
import { PhysicBox } from "@Glibs/types/physicstypes";

export default class OptPhysics implements IGPhysic {
    player?: IPhysicsObject
    physicalObjs: IPhysicsObject[] = []
    targetObjs: THREE.Object3D[] = []

    timeScale = 1

    center = new THREE.Vector3()
    downDir = new THREE.Vector3(0, -1, 0)
    raycast = new THREE.Raycaster()
    planeHeightMap?: PlaneHeightMap

    constructor(private scene: THREE.Scene, eventCtrl: IEventController) {
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            this.timeScale = scale
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterLandPhysic, (obj: THREE.Mesh<THREE.PlaneGeometry>) => {
            this.planeHeightMap = new PlaneHeightMap(obj)
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
    GetObjects(): THREE.Object3D[] {
        return this.targetObjs
    }
    CheckDirection(obj: IPhysicsObject, dir: THREE.Vector3) {
        return {obj:undefined, ...this.planeHeightMap!.checkDirection(obj, dir)}
    }
    Check(obj: IPhysicsObject): boolean {
        if (this.CheckDown(obj) < 0) return true
        return this.CheckBoxs(obj)
    }
    CheckDown(obj: IPhysicsObject): number {
        // 중력 처리 전/후 등에 호출
        const x = obj.Pos.x;
        const z = obj.Pos.z;
        const terrainY = this.planeHeightMap!.getHeightAt(x, z);
        // console.log("Player:" + obj.Pos.y + " - " + terrainY + " = " + (obj.Pos.y - terrainY ))

        // 플레이어 발이 terrainY 위에 있어야 한다고 가정
        return  obj.Pos.y - terrainY
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

    CheckBox(pos: THREE.Vector3, box: THREE.Box3): boolean {
        return false
    }
    CheckBoxs(obj: IPhysicsObject): boolean {
        return false
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