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
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (obj: THREE.Object3D, raycastOn = false, box3: THREE.Box3) => {
            if (this.targetObjs.findIndex(o => o.uuid == obj.uuid) < 0) this.targetObjs.push(obj)
            const spatialObj: SpatialObject = {
                id: obj.uuid, object3d: obj, box: box3 ?? new THREE.Box3().setFromObject(obj), raycastOn
            }
            // this.visualizeBox3(spatialObj.box)
            this.octreenode!.insert(spatialObj)
            obj.userData.spatialObj = spatialObj
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysicBox, (obj: THREE.Box3, uuid: string, raycastOn = false) => {
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
    CheckDirection(obj: IPhysicsObject, dir: THREE.Vector3, speed: number = 0) {
        // ✅ 반드시 외부에서 받은 dir 사용
        const ret = this.checkRayBox(obj, dir, speed);
        if (ret.obj) return ret;
        // 지형 샘플링 쪽도 같은 dir을 넘김
        return { obj: undefined, ...this.planeHeightMap!.checkDirection(obj, dir) };
    }

    Check(obj: IPhysicsObject): boolean {
        if (this.CheckDown(obj) < 0) return true
        return this.CheckBoxs(obj)
    }
    CheckDown(obj: IPhysicsObject): number {
        const ret = this.checkRayBox(obj, this.downDir)
        if (ret.distance < 0) return 0
        // 중력 처리 전/후 등에 호출
        const x = obj.Pos.x;
        const z = obj.Pos.z;
        const terrainY = this.planeHeightMap!.getHeightAt(x, z);
        // console.log("Player:" + obj.Pos.y + " - " + terrainY + " = " + (obj.Pos.y - terrainY ))
        const dis = obj.Pos.y - terrainY - 0.01
        if (!ret.obj) {
            return dis
        }
        // 플레이어 발이 terrainY 위에 있어야 한다고 가정
        return (dis > ret.distance) ? ret.distance : dis
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
    checkRayBox(obj: IPhysicsObject, dir: THREE.Vector3, speed: number = 0) {
        // ✅ 이동 방향은 반드시 외부에서 받은 dir을 사용
        const rayDir = dir.clone().normalize();
        if (rayDir.lengthSq() === 0) return { obj: undefined, distance: this.raycast.far, debug: "lengthSq" };

        // ✅ 레이 시작점은 "복사본"에서 보정 (누적 금지)
        const tmpCenter = new THREE.Vector3();
        obj.Box.getCenter(tmpCenter);

        // 플레이어 캡슐/실린더의 절반높이(발 위치 근사). 누적 금지!
        const halfHeight = Math.max(obj.Size.y * 0.5 - 0.2, 0);
        const origin = tmpCenter.clone();
        origin.y -= halfHeight;

        // ✅ 이동 1프레임 거리 + 여유 거리만큼 ray 길이 동적 설정(터널링 방지)
        const moveStep = (this.timeScale || 1) * (speed ?? 0);  // obj.Speed가 없다면 외부 주입
        const radius = Math.max(obj.Size.x, obj.Size.z) * 0.5;      // 방향 무관 최소 반경
        const margin = 0.1;
        const dynamicFar = Math.max(this.raycast.far, moveStep + radius + 0.5);
        this.raycast.far = dynamicFar;

        // ✅ 브로드페이즈: AABB 후보만 (raycastOn 우선)
        const candidates = this.octreenode!.getCandidatesInBox(obj.Box, { origin, dir: rayDir, maxDist: dynamicFar + radius });
        if (candidates.length === 0) return { obj: undefined, distance: this.raycast.far, debug: "candidates.length 0" };

        const rayObjs = candidates.filter(c => c.raycastOn).map(c => c.object3d);

        // raycastOn이 하나도 없으면 AABB 근사 거리로 반환(끼임 방지)
        if (rayObjs.length === 0) {
            let minPen = Infinity;
            let hitObj: THREE.Object3D | undefined;
            // 이동방향으로 obj.Box를 약간 확장한 뒤 후보와의 겹침 체크
            const swept = obj.Box.clone().expandByVector(new THREE.Vector3(radius, 0, radius));
            for (const c of candidates) {
                const box = c.box; // 등록 시 저장해둔 Box3
                if (swept.intersectsBox(box)) {
                    // 간단한 거리: 레이 시작점에서 상자까지의 최근접 거리 근사
                    const closest = new THREE.Vector3(
                        THREE.MathUtils.clamp(origin.x, box.min.x, box.max.x),
                        THREE.MathUtils.clamp(origin.y, box.min.y, box.max.y),
                        THREE.MathUtils.clamp(origin.z, box.min.z, box.max.z),
                    );
                    const d = origin.distanceTo(closest) - radius;
                    if (d < minPen) { minPen = d; hitObj = c.object3d; }
                }
            }
            if (hitObj) return { obj: hitObj, distance: Math.max(minPen, -1), debug: "AABB hit" };
            return { obj: undefined, distance: this.raycast.far, debug: "AABB no hit" };
        }

        // ✅ 내로페이즈: Raycast
        this.raycast.set(origin, rayDir);
        const hits = this.raycast.intersectObjects(rayObjs, true);
        if (hits.length === 0) return { obj: undefined, distance: this.raycast.far, debug: "ray no hit" };

        // 가장 가까운 히트
        const hit = hits[0];

        // ✅ 월드 법선으로 변환(경사 각 계산 정확화)
        let n = hit.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        n.applyNormalMatrix(normalMatrix).normalize();

        // ✅ 충돌 여유: 중심→히트까지 거리 - 캐릭터 반경
        const raw = hit.distance - (radius + margin);

        // ✅ 경사면/수직면 처리: 너무 가파르면 정지, 아니면 "세로 보정만" 반환
        let adjustedMove: THREE.Vector3 | undefined;
        const up = new THREE.Vector3(0, 1, 0);
        const slopeAngleDeg = Math.acos(THREE.MathUtils.clamp(n.dot(up), -1, 1)) * 180 / Math.PI;
        const maxSlope = 45; // 필요시 옵션화

        if (slopeAngleDeg > maxSlope && raw <= 0) {
            // 벽에 가까운 면(가파른 각도)이고 파고들었다면 이동 불가
            return { obj: hit.object, distance: -1, debug: "slope" };
        } else {
            // 1) 원래는 면에 "미끄러지는" 방향: t
            const t = rayDir.clone().projectOnPlane(n);
            if (t.lengthSq() > 1e-8) t.normalize();

            // 2) 하지만 옆(XZ)으로는 이동 원하지 않으므로 '세로 성분'만 취함
            //    - 일반 경사면: t.y 를 사용 (경사에 따른 오르/내리막)
            //    - 수직/수평 특이면 폴백도 제공
            let yOnly = new THREE.Vector3(0, t.y, 0);

            // 폴백 A: 수평면(바닥/천장)에서 t.y≈0 이면 입력된 ray의 y 성분을 사용
            if (yOnly.lengthSq() < 1e-8) {
                yOnly.set(0, rayDir.y, 0);
            }

            // 폴백 B: 거의 수직 벽(n.y≈0)에서는 y 보정이 사실상 0 → 그대로 0 유지
            // (원치 않는 옆 미끄러짐을 막기 위해 XZ는 끝까지 0을 유지)

            // 정규화(상위 코드에서 delta*speed로 스케일링하므로 방향만 넘김)
            if (yOnly.lengthSq() > 1e-8) yOnly.normalize();
            adjustedMove = yOnly;
        }

        return { obj: hit.object, distance: raw < 0 ? -1 : raw, move: adjustedMove, debug: "ray hit" };
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
        const delta = Math.min(this.clock.getDelta() * this.timeScale, 1)
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
    ): { distance: number; move?: THREE.Vector3; debug?: string } {
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
        if (Math.abs(angle) > slopeLimit) return { distance: -1 , debug: "dir-slopelimit"};

        const grad = dh / maxDist;
        const normal = new THREE.Vector3(-fdir.x * grad, 1, -fdir.z * grad).normalize();
        const move = dir.clone().projectOnPlane(normal).normalize();

        const dist = maxDist - obj.Size.z / 2;
        return { distance: dist, move, debug: "dir-move" };
    }
}