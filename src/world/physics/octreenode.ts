import * as THREE from "three";

export interface SpatialObject {
  id: string;
  object3d: THREE.Object3D;
  box: THREE.Box3;   // object3d에 대한 AABB
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
 /** 객체 삽입 (AABB 교차 검사) */
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
    // 모두 실패 시 이 노드에 남김
    this.objects.push(obj);
    return true;
  }

  /** 객체 제거 */
  remove(obj: SpatialObject): boolean {
    // 1) 이 노드에 직접 있으면 제거
    const idx = this.objects.findIndex(o => o.id === obj.id);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      this._tryMerge();
      return true;
    }
    // 2) 자식이 있으면 재귀 제거
    if (this.children) {
      for (const child of this.children) {
        if (child.remove(obj)) {
          this._tryMerge();
          return true;
        }
      }
    }
    return false;
  }

  /** 자식 8개로 분할 */
  private subdivide() {
    this.children = [];
    const { min, max } = this.boundary;
    const center = this.boundary.getCenter(new THREE.Vector3());

    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 0; iy < 2; iy++) {
        for (let iz = 0; iz < 2; iz++) {
          const boxMin = new THREE.Vector3(
            ix === 0 ? min.x : center.x,
            iy === 0 ? min.y : center.y,
            iz === 0 ? min.z : center.z
          );
          const boxMax = new THREE.Vector3(
            ix === 0 ? center.x : max.x,
            iy === 0 ? center.y : max.y,
            iz === 0 ? center.z : max.z
          );
          this.children.push(
            new OctreeNode(new THREE.Box3(boxMin, boxMax), this.capacity)
          );
        }
      }
    }

    // 기존 객체 재분배
    const old = this.objects;
    this.objects = [];
    for (const o of old) this.insert(o);
  }

  /** 자식 노드 병합 시도 */
  private _tryMerge() {
    if (!this.children) return;
    // 자식 중 하나라도 객체나 자식 노드를 갖고 있으면 병합 불가
    const anyNonEmpty = this.children.some(c =>
      c.objects.length > 0 || c.children !== null
    );
    if (!anyNonEmpty) {
      this.children = null;
    }
  }

  /**
   * 범위(Box3)에 겹치는 모든 객체 수집 (AABB VS AABB)
   */
  queryRange(range: THREE.Box3, found: SpatialObject[] = []): SpatialObject[] {
    if (!this.boundary.intersectsBox(range)) return found;
    for (const obj of this.objects) {
      if (obj.box.intersectsBox(range)) {
        found.push(obj);
      }
    }
    if (this.children) {
      for (const child of this.children) {
        child.queryRange(range, found);
      }
    }
    return found;
  }
}