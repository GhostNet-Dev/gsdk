# 건물 충돌 및 시야 가림 문제 해결 설계 문서

> **갱신 이력**: 2026-05-18 — 실제 코드 분석 결과를 반영하여 원인 설명 수정, 현재 구현 현황 섹션 추가, 알고리즘 및 예외 처리 보강.

## 1. 개요
CityCombat 모드에서 캐릭터들이 건물을 무시하고 서로를 인지/공격하거나, 투사체가 건물을 통과하는 현상을 해결하기 위한 설계 문서입니다. 성능 최적화를 위해 무거운 `THREE.Raycaster` 대신 수학적인 선분-Box 교차 판정(`THREE.Ray.intersectBox`)을 도입합니다.

## 2. 문제 분석

### 2.1 시야(Line of Sight) 문제
- **현상**: 몬스터와 아군 사이에 건물이 있어도 서로를 인지하고 공격함.
- **원인 (monctrl.ts)**: `CheckVisibleMeshs`가 내부적으로 `getClosestHit`을 호출하는데, 이 함수는 오브젝트의 `position`(중심점)을 기준으로 거리만 비교하는 **구(Sphere) 근사** 방식을 사용함. 또한 현재 구현은 `projLen`을 선분 길이로 clamp하지 않으므로, 엄밀한 "선분 위 최근접점" 판정이 아니라 **무한 직선 투영 기반 중심점 거리 판정**에 가까움.
  ```typescript
  // monctrl.ts - 현재 구현 요약 (직선 투영 + 구 근사)
  const projLen = toCenter.dot(segDir);
  const closestPoint = this.tempV1.copy(p1).add(segDir.multiplyScalar(projLen));
  const distToCenter = closestPoint.distanceTo(center); // center = target.position
  if (distToCenter <= radius) return true
  ```
  건물의 실제 AABB(Bounding Box)를 사용하지 않아, 건물이 길쭉하거나 캐릭터와의 각도가 나쁜 경우 오차가 발생함. Box3 기반 교차 판정으로 교체할 때는 반드시 선분 길이 검사와 내부 점(`containsPoint`) 처리를 포함해야 함.
- **원인 (allyctrl.ts)**: `CheckVisibleMeshs`에 해당하는 LOS 검사 함수가 **완전히 없음**. `update()` 내부에서 타겟 방향을 바로 `moveDirection`으로 설정하여 건물 차폐 여부를 전혀 확인하지 않음.

### 2.2 투사체 관통 문제
- **현상**: 플레이어나 아군이 발사한 일반 투사체가 건물을 뚫고 지나가 적을 타격함.
- **원인**: 일반 projectile 루프는 `Projectile.attack()`에서 `getClosestHit(this.prevPosition, this.position, this.getCollisionTargets(), this.attackDist)`를 호출함. 이때 `projectilectrl.ts`의 `getClosestHit` 내부 `checkList` 분기 때문에 non-hitscan/non-raycast 경로에서는 `physicList`가 누락됨:
  ```typescript
  const checkList = (this.isHitscan || this.useRaycast) ? [...targets, ...this.physicList] : targets;
  ```
  `isHitscan = true` 또는 `useRaycast = true`인 경우에만 `physicList`(건물 등 환경 오브젝트)를 체크 목록에 포함함. 별도 `getRaycastHit()` 경로는 이미 `const checkList = [...this.getCollisionTargets(), ...this.physicList]`로 환경 충돌체를 항상 포함함. 문제가 되는 케이스는 `isHitscan = false && useRaycast = false`인 **일반 물리 투사체**로, 이 경우에만 `physicList`가 누락됨.

## 3. 현재 구현 현황

### 3.1 projectilectrl.ts — 부분 구현됨

| 투사체 케이스 | `physicList` 포함 여부 | 상태 |
|---|---|---|
| `isHitscan = true` | O | 정상 작동 |
| `useRaycast = true` | O | 정상 작동 |
| `isHitscan = false, useRaycast = false` | X | **미해결** |

`getSegmentBoxHit` 메서드는 **이미 구현 완료**됨. 이 함수가 핵심 알고리즘의 참조 구현임:
- `THREE.Box3`를 `radius`만큼 `expandByScalar`로 확장
- `containsPoint`로 내부 점(발사 원점이 박스 안에 있는 경우) 처리
- `THREE.Ray.intersectBox()`로 Slab Method 교차 판정
- 선분 길이(`segLength`) 초과 여부 확인
- 법선 벡터(`getBoxNormal`) 반환

→ **남은 작업**: 일반 projectile의 `getClosestHit`에서 `checkList` 조건을 수정하면 해결 가능.

### 3.2 monctrl.ts — 부분 구현됨 (업그레이드 필요)

`CheckVisibleMeshs`와 `getClosestHit`는 존재하나, 건물 감지에 **직선 투영 + 구 근사** 방식을 사용. `THREE.Box3` 기반 정밀 판정이 아님.

→ **남은 작업**: `getClosestHit`를 Box3 교차 판정으로 교체.

### 3.3 allyctrl.ts — 미구현

LOS 검사 함수가 **전혀 없음**.

→ **남은 작업**: monctrl.ts와 동일한 방식의 LOS 검사를 신규 추가.

### 3.4 GPhysics 공간 해싱 (최적화 참고)

`src/world/physics/gphysics.ts`는 건물 BoundingBox를 10×10×10 격자 기반 공간 해싱(`pboxs: Map<string, PhysicBox[]>`)으로 관리함. 다만 v1 설계에서는 `IGPhysic` 인터페이스를 확장하지 않고, 기존 `gphysic.GetObjects()` 기반으로 LOS 후보를 순회함. 건물 수가 많아져 병목이 확인될 때만 공간 해싱 연동을 후속 최적화로 진행함(섹션 4.5 참조).

## 4. 남은 작업 및 구현 방법

### 4.1 [최소 수정] projectilectrl.ts — non-hitscan 건물 충돌 활성화

일반 projectile의 `getClosestHit` 내 `checkList` 생성 조건을 수정:

```typescript
// 변경 전
const checkList = (this.isHitscan || this.useRaycast) ? [...targets, ...this.physicList] : targets;

// 변경 후
const checkList = [...targets, ...this.physicList];
```

**주의**: `physicList` 오브젝트는 `getCollisionTargets()`가 반환하는 유닛 타겟이 아니므로, `attack()` 내 피해 이벤트 발송 분기에서 자동으로 걸러짐. 건물에 맞으면 데미지 이벤트 없이 투사체만 소멸하는 동작이 의도적으로 유지됨.

### 4.2 [중간] monctrl.ts — getClosestHit를 Box3 기반으로 교체

직선 투영 + 구 근사 방식(`target.position` + `radius`)을 `THREE.Box3` 교차 판정으로 교체. 클래스에 `tempBox`, `tempExpandedBox`, `tempHitPoint` 필드를 추가하여 GC 압력 감소:

```typescript
// 필드 추가
private tempBox = new THREE.Box3();
private tempExpandedBox = new THREE.Box3();
private tempHitPoint = new THREE.Vector3();

// getClosestHit 교체안
getClosestHit(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    targets: THREE.Object3D[],
    radius = 1,
    ignore?: THREE.Object3D,
    ignoreStructureId?: string
): boolean {
    const seg = this.tempV1.subVectors(p2, p1);
    const segLength = seg.length();
    if (segLength <= 0.000001) return false;

    const ray = new THREE.Ray(p1, this.tempV2.copy(seg).divideScalar(segLength));

    for (const target of targets) {
        if (ignore && this.isObjectOrChild(target, ignore)) continue;
        if (ignoreStructureId && this.isSameStructureCollider(target, ignoreStructureId)) continue;

        const box = this.tempBox.setFromObject(target);
        if (box.isEmpty()) continue;

        this.tempExpandedBox.copy(box).expandByScalar(radius);

        // 내부 점 처리: p1이 이미 박스 안에 있으면 즉시 가림 판정
        if (this.tempExpandedBox.containsPoint(p1)) return true;

        if (!ray.intersectBox(this.tempExpandedBox, this.tempHitPoint)) continue;
        if (p1.distanceTo(this.tempHitPoint) <= segLength) return true;
    }
    return false;
}
```

`ignoreStructureId`와 `isSameStructureCollider`는 구조물 타겟을 공격하거나 추적할 때 자기 구조물의 collider가 LOS 차폐물로 잡히는 것을 방지하기 위한 예외 처리임. 구현 시 현재 타겟이 `kind: "structure"`일 때 `currentTarget.id`를 `ignoreStructureId`로 전달하고, 후보 객체의 다음 식별자와 비교함:
- `target.userData.staticColliderId`
- `target.userData.buildingId`
- `target.userData.targetMeta?.id`
- `TargetRegistrySystem.getByObject(target)?.id`

이 값 중 하나가 현재 타겟 구조물의 id와 같으면 LOS 차폐 후보에서 제외함. 단순 `ignore?: THREE.Object3D` 비교만으로는 collider 객체와 타겟 root 객체가 다를 때 오판할 수 있음.

### 4.3 [신규] allyctrl.ts — LOS 검사 추가

`update()` 내 `this.dir` 계산 직후, `moveDirection` 설정 전에 LOS 검사 삽입:

```typescript
// allyctrl.ts update() 내 추가 위치
if (this.currentTarget) {
    this.dir.subVectors(target.CenterPos, this.allyModel.CenterPos)
    this.moveDirection.copy(this.dir.normalize())

    // LOS 검사: 건물이 가로막으면 이동 중단
    const blocked = this.checkLOS(target, this.gphysic.GetObjects())
    if (blocked) this.moveDirection.set(0, 0, 0)
}
```

`checkLOS`는 4.2의 Box3 기반 `getClosestHit` 패턴을 동일하게 구현. allyctrl은 `raycast` 필드가 없으므로 Box3 방식을 바로 적용.

**추가 검증 필요**: `moveDirection`을 0으로 만드는 것만으로 상태 머신의 공격 전환을 완전히 막는지 확인해야 함. `ValidateMeleeAttackTarget` / `ValidateRangedAttackTarget` 또는 공격 상태 진입 조건에서 차폐된 타겟을 공격 가능으로 판단한다면, 동일한 LOS 검사를 공격 검증 경로에도 반영해야 함.

### 4.4 [주의] 구조물 자기 collider 예외 처리

현재 건물/도시 구조물은 `TargetRegistrySystem`에 `kind: "structure"`와 `bounds`로 등록되고, 동시에 `StaticColliderRegistry.registerObjectCollider()`를 통해 `RegisterPhysic`에도 등록될 수 있음. LOS 후보로 순회하는 `gphysic.GetObjects()` 또는 `physicList`의 객체가 타겟 root와 같은 객체이거나 같은 구조물 id를 공유하면, "타겟 구조물 자신"을 엄폐물로 오판할 수 있음.

구현 규칙:
- 캐릭터 LOS에서는 현재 타겟 구조물과 같은 `buildingId`, `staticColliderId`, `targetMeta.id`, registry id를 가진 후보를 제외함.
- projectile 충돌에서는 구조물 자체에 맞아야 하므로 이 예외를 LOS 전용으로 제한함.
- 예외 처리에 새 타입이 필요하면 string literal을 늘리기보다 기존 `StaticColliderKind` 같은 enum/strict 타입을 우선 사용함.

### 4.5 [후속 옵션] GPhysics 공간 해싱 연동 (성능 최적화)

v1에서는 `IGPhysic` 인터페이스 변경 없이 `GetObjects()` 기반으로 구현함. LOS 체크 성능이 병목으로 확인될 경우에만:
- `IGPhysic` 인터페이스에 `GetObjectsNearSegment(p1: THREE.Vector3, p2: THREE.Vector3): THREE.Object3D[]` 추가 검토
- 내부 구현은 선분의 AABB 범위에 해당하는 해시 셀만 조회
- `src/world/physics/gphysics.ts`의 `makeHash`, `CheckBox` 패턴을 참고
- 새 식별자/분류 타입이 필요하면 string보다 enum 등 strict 타입을 우선 사용

## 5. 알고리즘 (Segment-Box Intersection)

### 5.1 참조 구현 — projectilectrl.ts의 getSegmentBoxHit (완성됨)

`projectilectrl.ts`에 이미 완성된 구현이 있음. monctrl/allyctrl 개선 시 이 구현을 참조할 것:

```typescript
// 핵심 흐름 (projectilectrl.ts getSegmentBoxHit 요약)
const bounds = this.getTargetBounds(target);               // Box3 획득
const expandedBox = tmpExpandedBox.copy(bounds).expandByScalar(radius);

// 1) 내부 점 처리
if (expandedBox.containsPoint(p1)) {
    return { hitPoint: p1.clone(), distance: 0, normal: getBoxNormal(bounds, p1) };
}

// 2) Ray-Box 교차
const seg = new THREE.Vector3().subVectors(p2, p1);
const segLength = seg.length();
const ray = new THREE.Ray(p1, seg.clone().divideScalar(segLength));
const hitPoint = new THREE.Vector3();
if (!ray.intersectBox(expandedBox, hitPoint)) return null;

// 3) 선분 범위 초과 여부 확인
const distance = p1.distanceTo(hitPoint);
if (distance > segLength || distance > this.range) return null;

return { target, hitPoint, distance, normal: getBoxNormal(bounds, hitPoint) };
```

### 5.2 monctrl/allyctrl용 단순화 버전 (boolean 반환)

캐릭터 LOS 검사는 충돌 지점/법선이 불필요하고 boolean 값만 필요함. `ignore` 파라미터(타겟 자신의 메시 제외), 구조물 자기 collider 예외 처리, 내부 점 처리는 반드시 포함해야 함. 구체적 구현은 섹션 4.2와 4.4 참조.

## 6. 검증 계획

- 문서 수정 후 repo root(`/home/ghost/develop/ghostnet-dev/threejs-war`)에서 `npm run build`를 실행함.
- 실제 구현 단계에서는 다음 수동 시나리오를 확인함:
  - 건물 사이에 몬스터/아군이 있을 때 서로 타겟팅하거나 공격하지 않는지 확인
  - 일반 projectile이 건물에 닿으면 타겟 데미지 이벤트 없이 소멸하는지 확인
  - hitscan/useRaycast projectile 기존 동작이 유지되는지 확인
  - 구조물 자체를 공격할 때 자기 collider 때문에 공격이 막히지 않는지 확인

## 7. 기대 효과

- 캐릭터들이 건물을 엄폐물로 인식하여 전략적인 움직임이 가능해짐.
- 투사체가 건물에 막힘으로써 시각적 및 논리적 정합성이 확보됨.
- 수학적 최적화를 통해 프레임 드랍 없이 안정적인 전투 구현 가능.

**구현 우선순위**: 4.1(일반 projectile 충돌 활성화) → 4.2(monctrl 정밀도 향상) → 4.3(allyctrl 신규 LOS) → 4.4(구조물 자기 collider 예외 처리) → 4.5(성능 최적화, 필요 시).
