import * as THREE from "three";

export interface SpatialObject {
  id: string;
  object3d: THREE.Object3D;
  box: THREE.Box3;   // object3d에 대한 AABB
  raycastOn: boolean
}

export class OctreeNode {
  boundary: THREE.Box3;
  capacity: number;
  objects: SpatialObject[] = [];
  children: OctreeNode[] | null = null;

  /**
   * @param boundary 이 노드가 담당할 3D AABB 영역
   * @param capacity 한 노드에 저장할 오브젝트 최대 개수
   */
  constructor(boundary: THREE.Box3, capacity: number = 8) {
    this.boundary = boundary.clone()
    this.capacity = capacity;
  }
  static computeWorldBounds(
    planeMesh: THREE.Mesh<THREE.PlaneGeometry>,
    extrudeHeight: number
  ): THREE.Box3 {
    // 1) 메시로부터 최소/최대 AABB를 계산
    const bounds = new THREE.Box3().setFromObject(planeMesh);

    // 2) 원래의 min.y 에서 extrudeHeight 만큼 더한 두 점을 범위에 포함시켜 확장
    const topMin = new THREE.Vector3(bounds.min.x, bounds.min.y + extrudeHeight, bounds.min.z);
    const topMax = new THREE.Vector3(bounds.max.x, bounds.min.y + extrudeHeight, bounds.max.z);
    bounds.expandByPoint(topMin);
    bounds.expandByPoint(topMax);

    return bounds;
  }

  insert(obj: SpatialObject): boolean {
    if (!this.boundary.intersectsBox(obj.box)) return false;
    if (this.objects.length < this.capacity) {
      this.objects.push(obj);
      return true;
    }
    if (!this.children) this.subdivide();
    for (const child of this.children!) {
      if (child.insert(obj)) return true;
    }
    this.objects.push(obj);
    return true;
  }

  remove(obj: SpatialObject): boolean {
    const idx = this.objects.findIndex(o => o.id === obj.id);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      this.tryMerge();
      return true;
    }
    if (this.children) {
      for (const c of this.children) {
        if (c.remove(obj)) {
          this.tryMerge();
          return true;
        }
      }
    }
    return false;
  }

  private subdivide() {
    this.children = [];
    const { min, max } = this.boundary;
    const c = this.boundary.getCenter(new THREE.Vector3());
    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 0; iy < 2; iy++) {
        for (let iz = 0; iz < 2; iz++) {
          const bmin = new THREE.Vector3(ix === 0 ? min.x : c.x, iy === 0 ? min.y : c.y, iz === 0 ? min.z : c.z);
          const bmax = new THREE.Vector3(ix === 0 ? c.x : max.x, iy === 0 ? c.y : max.y, iz === 0 ? c.z : max.z);
          this.children.push(new OctreeNode(new THREE.Box3(bmin, bmax), this.capacity));
        }
      }
    }
    const old = this.objects; this.objects = [];
    for (const o of old) this.insert(o);
  }

  private tryMerge() {
    if (!this.children) return;
    const anyNonEmpty = this.children.some(ch => ch.objects.length > 0 || ch.children !== null);
    if (!anyNonEmpty) this.children = null;
  }

  queryRange(range: THREE.Box3, out: SpatialObject[] = []): SpatialObject[] {
    if (!this.boundary.intersectsBox(range)) return out;
    for (const o of this.objects) {
      if (o.box.intersectsBox(range)) out.push(o);
    }
    if (this.children) for (const c of this.children) c.queryRange(range, out);
    return out;
  }

  /**
   * 방향을 고려한 브로드페이즈:
   * - origin에서 dir로 maxDist 이동하는 "회랑 AABB"를 만들고
   * - 그 안의 객체만 후보로 수집
   * - (옵션) FOV 각도 필터
   * - Ray vs AABB 슬랩 테스트로 실제 레이 경로와 교차하는 것만 반환
   *
   * @param origin 레이 시작점(플레이어 위치/눈높이)
   * @param dir    정규화된 진행 방향
   * @param maxDist 검사 최대 거리
   * @param halfThickness 회랑의 반두께(측면 여유; 기본 0.5~1 정도 추천)
   * @param fovDeg   시야 반각(옵션; null이면 생략)
   */
  getCandidatesAlongDirection(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    halfThickness: number = 0.75,
    fovDeg: number | null = 60
  ): SpatialObject[] {
    // 1) 이동 회랑 AABB 구성
    const end = origin.clone().add(dir.clone().multiplyScalar(maxDist));
    const min = origin.clone().min(end).addScalar(-halfThickness);
    const max = origin.clone().max(end).addScalar(+halfThickness);
    const corridor = new THREE.Box3(min, max);

    // 2) 회랑과 교차하는 후보 수집
    const broad = this.queryRange(corridor);

    // 3) (옵션) FOV 필터
    let filtered = broad;
    if (typeof fovDeg === 'number') {
      const cosLimit = Math.cos(THREE.MathUtils.degToRad(fovDeg));
      filtered = broad.filter(o => {
        const to = o.object3d.getWorldPosition(new THREE.Vector3()).sub(origin);
        if (to.lengthSq() === 0) return true;
        to.normalize();
        return to.dot(dir) >= cosLimit;
      });
    }

    // 4) Ray vs AABB 슬랩 테스트로 최종 필터
    return filtered.filter(o => {
      const t = rayAabbHitT(origin, dir, o.box, 0, maxDist);
      return t !== null; // 교차하면 후보 유지
    });
  }
  getCandidatesInBox(
    corridor: THREE.Box3,
    ray?: { origin: THREE.Vector3; dir: THREE.Vector3; maxDist?: number }
  ): SpatialObject[] {
    // 1) 브로드페이즈: 박스와 교차하는 객체만 수집
    const broad = this.queryRange(corridor);

    // 2) ray가 주어지면 Ray vs AABB 슬랩 테스트로 최종 필터링
    if (!ray) return broad;

    const origin = ray.origin;
    const dir = ray.dir.clone().normalize();
    const maxD = ray.maxDist ?? Number.POSITIVE_INFINITY;

    return broad.filter(o => rayAabbHitT(origin, dir, o.box, 0, maxD) !== null);
  }
}

/** Ray vs AABB 슬랩 테스트: 교차 시 [tmin..tmax] 중 시작 t 반환, 없으면 null */
function rayAabbHitT(
  origin: THREE.Vector3,
  dir: THREE.Vector3,      // normalized
  box: THREE.Box3,
  tMinLimit = 0,
  tMaxLimit = Number.POSITIVE_INFINITY
): number | null {
  let tmin = tMinLimit;
  let tmax = tMaxLimit;

  // 각 축에 대한 slab
  for (const axis of ['x', 'y', 'z'] as const) {
    const o = origin[axis];
    const d = dir[axis];
    const min = box.min[axis];
    const max = box.max[axis];

    if (Math.abs(d) < 1e-8) {
      // 레이가 이 축으로 평행 → 박스 범위 밖이면 교차 없음
      if (o < min || o > max) return null;
    } else {
      let t1 = (min - o) / d;
      let t2 = (max - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin >= tMinLimit && tmin <= tMaxLimit ? tmin : null;
}