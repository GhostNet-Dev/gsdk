# 건물 충돌/시야 차폐 구현 후 회귀 원인 분석

> **작성일**: 2026-05-21  
> **관련 설계**: `building-collision-fix-design.md`  
> **문서 목적**: 건물 LOS 및 projectile 충돌 개선 적용 후 발견된 회귀 증상의 원인, 로그 근거, 후속 수정 방향을 정리한다.
(제보: 두가지 버그가 있는 것 같습니다. 근접 공격형 케릭터는 적을 봐도 움직이지 않습니다. 그리고 원거리 공격 케릭터는 투사체가 발사하자마자 앞에서 터집니다. 원인 분석이 필요합니다.)

## 1. 개요

`building-collision-fix-design.md`의 설계에 따라 다음 개선을 적용했다.

- 일반 projectile도 `physicList`를 검사하도록 변경
- 몬스터 LOS를 Box3 기반 판정으로 교체
- 아군에도 LOS 판정 추가
- 이동뿐 아니라 근접/원거리 공격 검증 경로에도 LOS 판정 추가

그 결과 기존 문제였던 "건물을 무시하는 전투"는 해결 방향으로 이동했지만, 새로운 회귀 증상이 발생했다.

1. 근접 공격형 캐릭터가 적을 보고도 움직이지 않음
2. 원거리 공격형 캐릭터의 projectile이 발사 직후 바로 앞에서 폭발함

이 문서는 해당 회귀가 단순 구현 실수인지, 후보 객체 분류 문제인지, 충돌 반경 의미 혼용 문제인지 확인하기 위해 추가한 진단 로그와 코드 흐름을 연결해 원인을 분석한다.

## 2. 관측된 증상

### 2.1 근접 캐릭터 이동 정지

근접 캐릭터는 타겟을 정상적으로 획득하지만, `update()`에서 `moveDirection`이 `0, 0, 0`으로 유지된다.

수집된 로그 예:

```text
[CombatDebug] LOSBlocked {
  label: 'ally:update',
  reason: 'containsPoint',
  blocker: { ... },
  p1: [...],
  p2: [...],
  ...
}

[CombatDebug] LOSBlocked {
  label: 'monster:update',
  reason: 'intersectBox',
  blocker: { ... },
  p1: [...],
  p2: [...],
  ...
}
```

중요한 점은 `ally:update`에서 `reason: 'containsPoint'`가 반복된다는 것이다. 이는 "시야 선분이 어떤 객체를 지나가서 막혔다"라기보다, LOS 시작점인 캐릭터 중심점이 이미 확장된 blocker Box 안에 들어가 있다는 뜻이다.

### 2.2 원거리 projectile 즉시 폭발

원거리 공격은 정상적으로 스케줄링되지만, projectile이 첫 attack tick에서 바로 `physicList` 대상과 충돌한다.

수집된 로그 예:

```text
[CombatDebug] AttackScheduled {
  actor: 'ally',
  targetId: 'mon:Crab:0',
  currentTargetId: 'mon:Crab:0',
  ...
}

[CombatDebug] ProjectilePhysicsHit {
  projectileId: 'EnergyHoming',
  target: { ... },
  hitPoint: [...],
  distance: 0,
  ...
}

[CombatDebug] ProjectilePhysicsHit {
  projectileId: 'DefaultBullet',
  target: { ... },
  hitPoint: [...],
  distance: 0,
  ...
}
```

`distance: 0`은 projectile의 이전 위치 `p1`이 이미 충돌 대상으로 확장된 Box 내부에 있음을 의미한다. 따라서 이 증상도 "날아가다 충돌"이 아니라 "발사 원점이 obstacle 내부로 판정"되는 문제에 가깝다.

## 3. 코드 흐름 근거

### 3.1 Projectile이 너무 넓은 physics 후보를 수집함

`Projectile`은 `RegisterLandPhysic`와 `RegisterPhysic` 이벤트로 들어온 객체를 모두 `physicList`에 저장한다.

```typescript
eventCtrl.RegisterEventListener(EventTypes.RegisterLandPhysic, (obj: THREE.Object3D) => {
  if (!this.physicList.includes(obj)) this.physicList.push(obj);
});
eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (obj: THREE.Object3D) => {
  if (!this.physicList.includes(obj)) this.physicList.push(obj);
});
```

이 목록에는 건물 collider만 들어가는 것이 아니다. 현재 코드베이스에서 다음 계열 객체도 후보가 될 수 있다.

- `RegisterLandPhysic`로 들어오는 ground/terrain
- `RegisterPhysic`로 들어오는 일반 physics mesh
- 물리 구현체가 `add(...models)`로 넣는 unit mesh
- grid/ground/map object
- static collider registry가 등록한 city building/environment collider

따라서 `physicList` 전체를 projectile obstacle로 보는 것은 "건물에 막히게 한다"보다 훨씬 넓은 의미가 된다.

### 3.2 ProjectileCtrl이 targets + physicList 전체를 검사함

일반 projectile 관통 문제를 해결하기 위해 `getClosestHit()`에서 검사 목록을 다음처럼 확장했다.

```typescript
const checkList = [...targets, ...this.physicList];
```

이 변경 자체는 건물을 맞추기 위해 필요했지만, `physicList`가 정적 전투 차폐물로 필터링되어 있지 않으면 ground나 일반 physics object까지 충돌 후보가 된다.

현재 흐름은 모든 후보에 대해 다음을 수행한다.

1. `getHorizontalDistanceToTargetSurface(p1, target)`로 사거리 밖 후보 제외
2. owner/self 제외
3. `getSegmentBoxHit(p1, p2, target, radius)` 호출
4. Box hit가 없으면 sphere fallback 판정

문제는 `physicList`에 들어온 ground/terrain 같은 큰 객체가 `getSegmentBoxHit()`에서 `containsPoint(p1)`에 걸릴 수 있다는 점이다.

```typescript
const expandedBox = this.tmpExpandedBox.copy(bounds).expandByScalar(radius);
if (expandedBox.containsPoint(p1)) {
  return {
    target,
    hitPoint: p1.clone(),
    distance: 0,
    normal: this.getBoxNormal(bounds, p1),
  };
}
```

로그의 `ProjectilePhysicsHit.distance = 0`은 이 경로와 부합한다.

### 3.3 LOS도 GetObjects 전체를 blocker로 사용함

몬스터와 아군 LOS는 `gphysic.GetObjects()`를 blocker 후보로 넘긴다.

```typescript
this.lineOfSight.isBlocked(
  this.allyModel.CenterPos,
  this.targetAdapter.CenterPos,
  this.gphysic.GetObjects(),
  this.allyModel.Size.x,
  ...
)
```

`LineOfSightTester`는 후보 객체가 실제 전투 차폐물인지 확인하지 않고 모든 후보에 대해 Box3 교차를 수행한다.

```typescript
const box = this.getTargetBounds(blocker, options.targetRegistry);
if (box.isEmpty()) continue;

this.tempExpandedBox.copy(box).expandByScalar(radius);
if (this.tempExpandedBox.containsPoint(p1)) return true;

if (!ray.intersectBox(this.tempExpandedBox, this.tempHitPoint)) continue;
if (p1.distanceTo(this.tempHitPoint) <= segLength) return true;
```

`GetObjects()` 역시 구현체별로 의미가 다르다.

- `GPhysics.GetObjects()`는 `lands + debugBox`를 반환한다.
- `OptPhysics.GetObjects()`는 `targetObjs`를 반환하며, 여기에 `RegisterPhysic` 및 `add(...models)`로 들어온 객체가 포함될 수 있다.
- `RayPhysics.GetObjects()`도 `targetObjs` 기반이며 일반 physics mesh와 unit mesh가 섞일 수 있다.

따라서 LOS에서 모든 `GetObjects()` 후보를 blocker로 쓰면 지형, 유닛, 일반 physics mesh가 시야를 막는 오검출이 발생할 수 있다.

### 3.4 기존 enum은 후보 필터링 기준으로 사용할 수 있음

`StaticColliderRegistry`는 정적 collider에 이미 명시적인 종류를 붙인다.

```typescript
export enum StaticColliderKind {
  Environment = "environment",
  CityBuilding = "city-building",
}
```

등록 시에도 `userData.staticColliderKind`와 `userData.staticColliderId`가 설정된다.

```typescript
collider.userData.staticColliderKind = options.kind;
collider.userData.staticColliderId = options.id;
```

즉, 후속 수정에서 새 string literal을 추가하지 않고도 다음 객체를 전투 차폐물로 분류할 수 있다.

- `StaticColliderKind.CityBuilding`
- 필요 시 `StaticColliderKind.Environment`
- `TargetRegistrySystem.getByObject(obj)?.kind === "structure"`

반대로 다음 객체는 LOS/projectile obstacle 후보에서 제외해야 한다.

- `RegisterLandPhysic` ground/terrain
- `targetMeta.kind === "unit"` 유닛 mesh
- 일반 physics mesh
- grid/ground/map object

## 4. 추가 원인: projectile 충돌 반경 의미 혼용

`ProjectileCtrl.start()`는 projectile 충돌 반경으로 `attackDist`를 설정한다.

```typescript
this.attackDist = Math.max(0.5, this.baseSpec.AttackRange);
```

하지만 `BaseSpec.AttackRange`는 원래 전투 사거리/공격 판정 계열 의미다. projectile의 물리적 반경이나 obstacle padding과는 다르다.

특히 `getSegmentBoxHit()`은 이 값을 Box 확장 반경으로 사용한다.

```typescript
const expandedBox = this.tmpExpandedBox.copy(bounds).expandByScalar(radius);
```

따라서 radius가 실제 projectile 크기보다 크면 다음 문제가 생긴다.

- ground/terrain 같은 큰 Box가 더 쉽게 `containsPoint(p1)`에 걸림
- 캐릭터 주변의 정적 collider도 시작점 내부로 오검출될 수 있음
- obstacle 충돌과 unit target hit가 같은 반경 정책을 공유해 튜닝이 어려움

정리하면 projectile에는 최소 두 종류의 반경이 필요하다.

| 용도 | 현재 값 | 문제 | 권장 |
|---|---:|---|---|
| 유닛 타격 판정 | `attackDist` | 기존 gameplay hit 보정으로는 유효 | 유지 |
| 정적 obstacle 충돌 padding | `attackDist` | Box를 과도하게 확장할 수 있음 | 작은 상수 또는 projectile별 물리 반경 |

## 5. 확정된 사실과 추정

### 5.1 확정된 사실

- projectile은 `physicList` 대상과 충돌하고 있다.
- projectile 충돌 로그의 `distance`는 `0`이다.
- LOS는 `ally:update`와 `monster:update` 경로에서 차폐 판정을 내리고 있다.
- LOS 로그에 `containsPoint`가 포함되어 있다.
- `physicList`와 `GetObjects()`는 건물 collider 전용 목록이 아니다.
- 현재 Box3 판정은 후보 필터 없이 모든 physics object를 검사한다.

### 5.2 강한 추정

- projectile 즉시 폭발은 발사 원점이 ground/일반 physics object/비전투 collider의 확장 Box 내부로 판정되어 발생한다.
- 근접 캐릭터 이동 정지는 unit mesh, ground, 일반 physics object, 혹은 과도하게 확장된 collider가 LOS blocker로 잡혀 발생한다.
- `attackDist`를 obstacle Box 확장 반경으로 쓰는 것이 오검출 빈도를 키운다.

### 5.3 추가 확인이 있으면 더 좋은 정보

콘솔 객체가 접힌 상태라 실제 `blocker.userData`와 `target.userData` 값이 완전히 보이지 않았다. 다음 필드를 펼쳐 보면 원인 객체를 더 직접적으로 확정할 수 있다.

- `ProjectilePhysicsHit.target.userData.staticColliderKind`
- `ProjectilePhysicsHit.target.userData.targetMeta`
- `ProjectilePhysicsHit.target.registryRecord`
- `LOSBlocked.blocker.staticColliderKind`
- `LOSBlocked.blocker.targetMeta`
- `LOSBlocked.blocker.registryRecord`

다만 `distance: 0`과 `containsPoint`만으로도 "후보 범위가 넓고 시작점 내부 판정이 발생한다"는 원인은 충분히 확인되었다.

## 6. 후속 수정안 요약

### 6.1 전투 차폐물 후보 필터 추가

LOS와 projectile obstacle에서 다음 조건을 통과한 객체만 blocker로 사용한다.

- `userData.staticColliderKind === StaticColliderKind.CityBuilding`
- `userData.staticColliderKind === StaticColliderKind.Environment`
- `TargetRegistrySystem.getByObject(obj)?.kind === "structure"`

단, `StaticColliderKind.Environment`는 나무/자원 등 환경물도 전투 엄폐물로 쓸지에 대한 정책 선택이다. 환경물까지 너무 강하게 막으면 v1에서는 `CityBuilding`만 허용하는 편이 안전하다.

### 6.2 ground/land/unit/general physics 제외

다음 객체는 전투 차폐물 후보에서 제외한다.

- `RegisterLandPhysic`로 들어온 terrain/ground
- `targetMeta.kind === "unit"` 객체
- registry record가 `kind === "unit"`인 객체
- `staticColliderKind`가 없는 일반 physics mesh
- grid helper/map mesh 등 전투 차폐물이 아닌 월드 보조 객체

### 6.3 projectile obstacle 반경 분리

projectile 충돌을 두 경로로 분리한다.

- 전투 타겟 hit: 기존 `attackDist` 유지
- 정적 obstacle hit: 작은 padding 상수 사용

예시 정책:

```typescript
const PROJECTILE_OBSTACLE_PADDING = 0.2;
```

이 값은 projectile이 벽을 완전히 통과하지 않도록 보정하는 용도이지, 유닛 타격 판정을 넓히는 용도가 아니다.

### 6.4 physicList 후보 처리 분리

`getClosestHit()`에서 단순히 `targets + physicList`를 하나의 목록으로 합치지 않는다.

권장 흐름:

1. `targets`는 unit/structure damage target으로 검사
2. `physicList`는 static obstacle filter를 통과한 객체만 검사
3. obstacle hit는 damage event 없이 projectile 소멸만 수행
4. target과 obstacle이 모두 맞으면 더 가까운 hit를 선택

### 6.5 임시 로그 정리

현재 진단 로그는 원인 확인용이다. 후속 수정 이후에는 다음 중 하나로 정리한다.

- 완전히 제거
- `CombatDebug` 또는 별도 debug flag가 켜진 경우에만 출력
- `console.info/warn` 대신 전투 디버그 시스템의 structured debug channel로 이동

## 7. 결론

이번 회귀의 핵심은 Box3 교차 알고리즘 자체가 아니라 **후보 객체의 의미가 정제되지 않은 상태에서 정밀 판정을 적용한 것**이다.

기존 구 근사 방식은 부정확했지만, 오히려 많은 비전투 physics object를 지나치게 민감하게 감지하지는 않았다. Box3 기반 판정은 더 정확하기 때문에, 후보 목록이 잘못되면 그 잘못도 더 정확하게 드러난다.

따라서 후속 구현은 다음 원칙을 따라야 한다.

- LOS blocker와 projectile obstacle은 "모든 physics object"가 아니라 "전투 차폐물"이어야 한다.
- `StaticColliderKind`와 target registry kind를 기준으로 후보를 엄격히 필터링한다.
- projectile의 obstacle padding은 유닛 타격 반경과 분리한다.
- 구조물 자기 collider 예외 처리는 유지한다.

이 방향으로 수정하면 기존 목표였던 건물 엄폐/투사체 차단은 유지하면서, 근접 캐릭터 정지와 projectile 즉시 폭발 회귀를 해결할 수 있다.
