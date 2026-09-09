# 아군 밀리 이동 불량 / 몬스터 부분 정지 — 진단 및 구현 계획

> 관련 문서: [Yuka 기반 길찾기 및 AI 이동 시스템 설계](./yuka-navmesh-integration-design.md),
> [단일 지점 스폰 설계](./single-point-spawn-design.md)

## 1. 개요 (증상)

`yuka-navmesh-integration-design.md`의 A*/NavGrid 길찾기를 "아군이 적을 공격"하는 로직에도
적용했다고 알고 있었으나, 실제 전투 테스트에서 다음이 관찰된다.

| 대상 | 증상 |
| --- | --- |
| 아군 밀리 (Warrior) | 목표로 **전혀 이동하지 않음**. 장애물이 없어도 몇 미터 앞에서 정지 |
| 아군 원거리 (Archer / Mage) | 정상적으로 이동·교전 |
| 몬스터 | 타입에 따라 **이분법적으로** 이동 / 정지 |

코드 탐색 결과, 서로 독립적인 **원인 3가지**가 확정됐다.

1. **원인 1** — 아군은 Yuka/NavGrid로 마이그레이션된 적이 없고, "시야 차단 시 정지" 게이트가
   살아 있어 건물이 낀 밀리 아군이 얼어붙는다. → §2
2. **원인 2** — 몬스터 `vehicle.maxSpeed = Spec.Speed`인데 일부 프리셋에 `speed` 스탯이 없어
   `maxSpeed = 0`으로 고정, 해당 타입은 영구 정지. → §3
3. **원인 3** — 접근·사거리 판정이 히트박스(`MonsterBox`/`AllyBox`)가 아니라 네임플레이트·이펙터가
   포함된 비주얼 모델 그룹의 per-frame AABB를 쓴다. 밀리 아군이 개활지에서도 "이미 사거리 안"으로
   오판해 정지하고, 피격자는 실제 히트박스로 재검증해 데미지를 거부한다. → §4

> **구현 상태 (2026-09-09)**: §6 구현안 전체(6.1-B / 6.2 / 6.3 / 6.4)가 코드에 반영됐다.
> 실제 반영 내역·계획 대비 차이·잔여 작업은 **§8**에 정리했다. 런타임 검증(§7)은 미완.

---

## 2. 원인 1 — 아군은 Yuka/NavGrid로 마이그레이션된 적이 없다

### 2.1 사실 관계

`src/gsdk/src/actors/allies/` 디렉토리 전체에 `Yuka`, `Vehicle`, `FollowPathBehavior`,
`SeparationBehavior`, `NavGridService`, `findPath` 참조가 **0건**이다. 마이그레이션된 것은
몬스터 측(`MonsterCtrl` + `RunZState`)뿐이며, 아군은 Yuka 도입 이전의
**직선 이동 + "시야 차단 시 정지"** 알고리즘을 그대로 사용한다.

### 2.2 정지가 발생하는 코드

`src/gsdk/src/actors/allies/allyctrl.ts` `AllyCtrl.update` (약 231–278행):

```ts
this.dir.subVectors(target.CenterPos, this.allyModel.CenterPos)
if (this.isTargetLineOfSightBlocked(this.currentTarget, "ally:update")) {
    this.moveDirection.set(0, 0, 0)          // ← 시야 차단 시 이동 방향을 0으로
} else {
    this.moveDirection.copy(this.dir.normalize())
}
...
this.currentState = this.currentState.Update(delta, this.moveDirection, target)
```

- `moveDirection`이 `(0,0,0)`이면 `AllyState.CheckRun` (`ally/allystate.ts` 74–80행)이
  실패한다 → 아군은 `IdleAllyState`에서 벗어나지 못하고 **그 자리에 정지**한다.
- LoS 차단 판정 경로: `AllyCtrl.isTargetLineOfSightBlocked` (allyctrl.ts 380–393행) →
  `src/gsdk/src/actors/battle/lineofsight.ts` `isBlocked` (25–62행) →
  `src/gsdk/src/actors/battle/combatobstacle.ts` `isCombatObstacle` (17–30행).
  **오직 도시 건물(`StaticColliderKind.CityBuilding`)만** 시야 차단 장애물로 취급한다.

### 2.3 왜 밀리만, 원거리는 안 그런가

- 밀리 아군 (Warrior): 공격 사거리 = `DEFAULT_MELEE_ATTACK_RANGE = 3.5`
  (`src/gsdk/src/actors/battle/meleecombat.ts` 6행; `allydb.ts`의 Warrior 프리셋에는
  `attackRange` 스탯이 없다). 적에게 **약 3.5 유닛까지 바짝 붙어야** 하므로, 도시 방어전/
  공격전 맵에서 아군과 적 사이에 건물이 끼는 경우가 매우 잦다 → 거의 항상 LoS 차단 → 정지.
- 원거리 아군 (Archer 사거리 18, Mage 사거리 22, `allydb.ts` 16–37행): 멀리서 트인 시야로
  교전하므로 LoS가 뚫려 있는 경우가 대부분 → `moveDirection`이 정상적으로 설정 → 이동/공격.

### 2.4 몬스터는 이미 이 로직이 제거되어 있음 (대조)

`MonsterCtrl`은 `isTargetLineOfSightBlocked`를 **공격 검증에만** 사용한다:
`ValidateMeleeAttackTarget` (`src/gsdk/src/actors/monsters/monctrl.ts` 471행),
`ValidateRangedAttackTarget` (483행). 이동을 막는 데는 쓰지 않는다.
설계 문서 §2.1·§4.3이 "기존 이동 중 LoS 차단 시 정지 로직은 제거하고 공격 검증 LoS는 유지"라고
명시한 대로다. **아군만 이 정지 게이트가 남아 있다.**

### 2.5 부수 사항

- `RunAllyState` (`ally/allystate.ts` 651–706행)는 `RunZState`와 달리 직접 위치 이동
  (`this.allyModel.Pos.add(...)`, 697–702행)을 **제거하지 않았다**. 아군에는 Vehicle이 없어
  현재 구조상 유일한 이동 수단이므로 그대로 두어야 하지만, 설계 목표(건물 우회 길찾기)와는
  다르다.
- 아군 프리셋(`allydb.ts`)은 Warrior/Archer/Mage 모두 `speed: 2`를 보유한다. 따라서
  아래 §3의 "maxSpeed = 0" 문제는 아군에는 해당하지 않는다.

---

## 3. 원인 2 — 몬스터 `vehicle.maxSpeed`가 0으로 고정되는 타입이 있다

### 3.1 코드

`src/gsdk/src/actors/monsters/monctrl.ts` `ensureVehicle()` 296–297행:

```ts
vehicle.maxSpeed = this.Spec.Speed
vehicle.maxForce = Math.max(20, this.Spec.Speed * 12)
```

이 값은 Vehicle 생성 시 **한 번만** 설정되며 이후 갱신되지 않는다.

### 3.2 `Spec.Speed`가 0이 되는 경로

- `BaseSpec.Speed` (`src/gsdk/src/actors/battle/basespec.ts` 55행) → `stats.getStat("speed")`
- `StatSystem.getStat` (`src/gsdk/src/inventory/stat/statsystem.ts` 23행):
  `return this.baseStats[stat] || 0` — **전역 기본값이 없다.**
- `src/gsdk/src/actors/battle/stats.ts`의 `baseStatPresets` 중 `speed` 키가 **없는** 프리셋:
  - `MonsterId.Crab` (58–63행)
  - `MonsterId.Builder` (64–69행)
  - `MonsterId.KittenMonk`
  - `MonsterId.ToadMage` (163행~)

  → 이 타입들은 `Spec.Speed === 0` → `vehicle.maxSpeed = 0`.

### 3.3 결과

Yuka는 Vehicle의 velocity 크기를 `maxSpeed`로 clamp하므로, `maxSpeed = 0`이면 Vehicle이
속도를 전혀 축적하지 못하고 `vehicle.position`이 절대 변하지 않는다. 이후:

- `applyVehiclePosition()` (monctrl.ts 323–361행)에서 실제 이동량이 ~0 →
  `moveDirection`이 `(0,0,0)`으로 설정됨 (355–359행).
- `RunZState.Update` (`monsters/zombie/monstate.ts` 670–673행): `v.x == 0 && v.z == 0` →
  `IdleSt`로 복귀.
- `MonState.CheckRun` (88–94행): `if (v.x || v.z)` → 발동 안 됨.

→ **speed 스탯이 없는 몬스터 타입은 영구히 `IdleZState`에 고정된다.**
`speed` 값이 있는 타입(Zombie 0.6, Minotaur 0.9, Batpig 1.8 …)은 정상 이동한다.
이것이 "일부는 움직이고 일부는 안 움직이는" 이분 현상의 직접 원인이다.
런타임 속도 버프로도 고칠 수 없다 (`maxSpeed`를 다시 읽지 않으므로).

---

## 4. 원인 3 — 공격자와 피격자가 서로 다른 히트박스를 본다 (장애물이 없어도 정지)

LoS 게이트(원인 1)를 제거해도, **개활지에서 밀리 아군이 목표 몇 미터 앞에 서서
헛스윙만 하고 접근하지 않는** 현상이 남는다. 원인은 거리 판정에 쓰는 박스가
피격 판정에 쓰는 박스와 다르기 때문이다.

### 4.1 두 개의 박스

| 용도 | 사용하는 박스 |
| --- | --- |
| 피격 / 데미지 판정 | `MonsterBox` / `AllyBox` (실제 히트박스 콜라이더) |
| 접근 · 정지 · 공격 스케줄 판정 | `monModel.Meshs` / `allyModel.Meshs` (비주얼 모델 그룹)의 per-frame AABB |

- **피격 측**: `monsters.ts:128-131 getMeleeDefenderBounds() = new THREE.Box3().setFromObject(MonsterBox)`,
  `ApplyAttack`(l.170) → `ValidateReceivedMeleeAttack(opt, …, defenderBounds)`. 아군도 동일
  (`allies.ts:166-169`, l.205).
- **접근 측**: `EventTypes.RegisterTarget` payload의 `object`가 `monModel.Meshs` / `allyModel.Meshs`
  (`monsters.ts:346`, `allies.ts:120`). 이 그룹에는 네임플레이트 `text`와 `effector.meshs`가
  자식으로 붙어 있다(`allymodel.ts:63-64`). `MonsterTargetAdapter` / `AllyTargetAdapter`가
  매 프레임 `this.box.setFromObject(target.object)`로 이 그룹 전체의 월드 AABB를 다시 계산한다
  (`monctrl.ts:100`, `allyctrl.ts:95`).

### 4.2 레지스트리가 유닛 `bounds`를 버린다

`TargetRegistrySystem.register`는 `bounds`를 **`kind === "structure"`일 때만** 보관하고
유닛은 강제로 `undefined` 처리한다(`targetregistrysystem.ts:52-54`).
`monsters.ts:353`이 이미 `bounds: monBox`를 넘기지만 레지스트리가 폐기한다.
그 결과 레지스트리 거리 계산(`getDistanceBounds()`, `targetregistrysystem.ts:186-193`)과
어댑터 모두 유닛에 대해서는 `setFromObject(target.object)`로 되돌아간다.

### 4.3 그래서 교착이 생긴다

- **공격자(아군)**: 네임플레이트·이펙터로 부푼 모델-그룹 AABB로 거리를 재니
  `GetHorizontalDistanceToBoxSurface`의 `clampPoint`가 실제보다 훨씬 작은 `dist`를 돌려줌 →
  `dist < 3.5` 오판 → `RunAllyState.CheckAttack`이 `AttackSt`로 전이 → **이동 중단**
  (`allystate.ts:679-681`, `126-134`).
- **피격자(몬스터)**: 같은 공격 이벤트를 타이트한 `MonsterBox`로 재검증 → 사거리 밖 →
  `[CombatDebug] ReceiveRejected` 로그, 데미지 무시(`monsters.ts:178-184`).
- `AttackAllyState`는 `dist > attackDistance`일 때만 Run으로 복귀하는데(`allystate.ts:349-352`),
  부푼 박스 때문에 `dist`가 계속 3.5 미만 → **복귀도 못 하고 영구 헛스윙**.
- 밀리 임계값 3.5는 이 오차에 그대로 노출된다. 원거리 18/22는 오차가 묻히고 투사체가
  `target.CenterPos`로 날아가 명중하므로 이 교착이 안 생긴다 → "원거리만 정상"으로 보임.
- 몬스터 측 `MonsterTargetAdapter`도 동일 패턴이라(`monctrl.ts:97-100`) 몬스터끼리·몬스터↔코어
  전투에서도 조기 정지가 나타난다 (원인 2의 `maxSpeed=0`과는 별개 축).

### 4.4 `MonsterBox` / `AllyBox` 성질 (참고)

- 지오메트리 = `BoxGeometry(modelSize.x * 2, modelSize.y, modelSize.z)` — **폭이 모델의 2배**
  (`monctrl.ts:188-189`, `allyctrl.ts:164-165`). 이는 피격 관대함을 위한 **의도된 설계**이므로
  유지한다. 통일 후 밀리 접근 정지 거리가 측면에서 모델폭 절반만큼 넓어지는 것은 수용한다.
- `visible = false`, scene에 추가되어 월드매트릭스는 갱신됨, 매 프레임 위치·회전 동기화
  (`+size.y/2` y오프셋). 애니메이션 포즈 변화에는 불변, 대각선 yaw에는 AABB가 커진다.
- `.name = "mon" / "ally"`, `userData.targetMeta` 없음, 레지스트리 `idByObject` 미인덱스
  (`AddInteractive`로 `PlayerCtrl.targets`에만 등록됨).

---

## 5. 부수 요인 (몬스터, 상황적 정지)

원인 2·3만큼 결정적이진 않지만, "특정 상황에서 멈춤"을 유발하는 요소들:

1. **조기 정지**: `monctrl.ts updateNavigation` 371–378행 —
   `if (targetDistance <= attackRange * 0.92) { follow.active = false; vehicle.velocity.set(0,0,0); ... }`.
   `attackRange`는 `Spec.AttackRange`(스탯 + 0.5)이므로, 스탯이 큰 원거리 몬스터는 스폰 직후부터
   사거리 안이라 거의 움직이지 않는다 (의도된 동작이나 "안 움직임"으로 보일 수 있음).
2. **aggroRange 밖 스폰**: `currentTarget`은
   `TargetRegistrySystem.findNearestHostile(targetId, aggroRange = 60, …)` (532–538행)로 얻는다.
   스폰 링 반지름은 `35 + wave * 8` (`basecitycombat.ts` 524행)이라 고웨이브에서 60을 초과 →
   갓 스폰된 먼 몬스터는 `currentTarget === undefined` → A* 없이 플레이어 방향 직선 fallback만
   탄다.
3. **직선 fallback 그라인딩**: `resolveWaypoints` (396–415행)가 `NoPath`면
   `[Pos, CenterPos]` 직선 경로로 폴백하고 `follow.active = true`가 되면 재탐색이 걸리지 않는다.
   이후 `applyVehiclePosition` (341–348행)에서 `gphysic.CheckDirection`이 건물/타 몬스터 충돌을
   보고하면 `syncVehicleFromMesh()`로 매 프레임 정지 → 건물 뒤 몬스터가 벽에 비빈다
   (설계 §2.1이 언급한 미구현 "폐쇄 대응").
4. **NavGrid 센터/범위**: `basecitycombat.ts resolveNavGridCenter` (557–560행)가 그리드를
   **마지막 웨이브 스폰 중심**에만 맞춘다. 방어 코어/주요 구조물이 스폰 중심에서 멀면 목표가
   그리드 밖에 놓이고, `NavGridService.findPath`는 `NoPath` + `waypoints: []`를 **로그 없이**
   반환한다 (navgridservice.ts 전체에 path 실패 로그 없음).
5. **액터 타겟은 attackRange 무시**: `resolveGoalCells` (navgridservice.ts 193–196행) —
   비(非)구조물 타겟은 타겟 위치 셀 1개만 목표로 삼는다 (`attackRange` 미사용). 적이
   inflate(`DEFAULT_INFLATE_WORLD = 1.2`)된 건물 차단 밴드에 붙어 서 있으면 목표 셀 스냅이
   실패할 수 있다.
6. **`RequestYukaEntityManager` 재시도 없음**: `MonsterCtrl` 생성자에서 1회만 발행(210행).
   정상 부트 순서에서는 문제없으나, 시티 전투 밖에서 스폰된 몬스터는 `yukaManager` 미할당 →
   Vehicle 자체가 생성되지 않아 영구 Idle.

---

## 6. 구현 계획

> 아래 6.1~6.4는 원래 계획안이다. **실제 반영 내역과 차이는 §8** 참고.

### 6.1 즉시 수정 — 증상 제거 (낮은 리스크)
> ✅ 반영됨 (6.1-A는 §8.2에, 6.1-B는 택1-a+택1-b 둘 다 §8.1에)

**(A) 아군 LoS 정지 게이트 제거** — `src/gsdk/src/actors/allies/allyctrl.ts` `update`

```ts
// 변경 전
if (this.isTargetLineOfSightBlocked(this.currentTarget, "ally:update")) {
    this.moveDirection.set(0, 0, 0)
} else {
    this.moveDirection.copy(this.dir.normalize())
}

// 변경 후
this.moveDirection.copy(this.dir.normalize())
```

`isTargetLineOfSightBlocked`는 `ValidateMeleeAttackTarget` / `ValidateRangedAttackTarget`
공격 검증에만 유지한다 (`MonsterCtrl`과 동일한 방침).
→ 밀리 아군이 최소한 직선으로는 접근·교전한다. 건물 우회는 아직 불가하며,
`RunAllyState`의 `gphysic.CheckDirection`이 관통만 방지한다.

**(B) 몬스터 maxSpeed = 0 수정** — 둘 중 택1

- **택1-a**: `src/gsdk/src/actors/battle/stats.ts` `baseStatPresets`의
  `Crab` / `Builder` / `KittenMonk` / `ToadMage` 등에 `speed` 값을 추가한다
  (게임 밸런스에 맞는 값 지정).
- **택1-b**: `monctrl.ts ensureVehicle`에서 하한을 둔다.
  ```ts
  const speed = Math.max(this.Spec.Speed, MIN_MOVE_SPEED)  // 상수 신설
  vehicle.maxSpeed = speed
  vehicle.maxForce = Math.max(20, speed * 12)
  ```
  이 경우 `applyVehiclePosition()`의 `gphysic.CheckDirection(..., this.Spec.Speed)`도 같은
  보정 속도를 쓰도록 `getMoveSpeed()` 같은 단일 helper로 묶는다. `vehicle.maxSpeed`만 하한을
  두고 충돌 체크는 `Spec.Speed === 0` 기준으로 남기면 이동/충돌 계산 기준이 어긋난다.

추천은 **택1-a**다. 이동 가능한 몬스터라면 프리셋에 명시적인 `speed`를 갖는 편이 밸런스와
디버깅 모두에서 낫다. 택1-b는 누락 스탯 방어용 fallback으로만 둔다.
추가로, 속도 버프가 이동에 반영되도록 스탯 변경 이벤트 수신 시 `maxSpeed` / `maxForce`를
재설정한다.

### 6.2 근본 수정 — 아군을 Yuka/NavGrid로 마이그레이션
> ✅ 반영됨 — §8.2

`MonsterCtrl` + `RunZState`가 그대로 참조 구현이다. `AllyCtrl` + `ally/allystate.ts`에
동일 패턴을 이식한다.

#### 6.2.1 `Vehicle`의 역할과 소유권

Yuka `Vehicle`은 Three.js mesh가 아니라 **이동 시뮬레이션 에이전트**다. `NavGridService`가
A*로 waypoint 배열을 만들고, `Vehicle`은 `FollowPathBehavior` / `SeparationBehavior`를 통해
다음 프레임의 `position` / `velocity`를 계산한다. 실제 모델 위치는 컨트롤러가
`applyVehiclePosition()`에서 `vehicle.position`을 읽어 `allyModel.Pos` 또는 `zombie.Pos`에
반영한다.

따라서 아군 마이그레이션 후 이동 책임은 다음처럼 나눈다.

| 책임 | 담당 |
| --- | --- |
| 타겟 선택 / 상태 전이 / 공격 검증 | `AllyCtrl` + `AllyState` |
| 경로 요청 | `AllyCtrl.updateNavigation()` |
| 경로 추종 / 분리 steering / 속도 clamp | `Yuka.Vehicle` |
| 실제 모델 위치 반영 / 물리 충돌 체크 | `AllyCtrl.applyVehiclePosition()` |
| 애니메이션 / 바라보는 방향 | `RunAllyState` |

`Vehicle` 생성·등록·해제의 단일 소유자는 `AllyCtrl`로 둔다. `ensureVehicle()` 안에서
`yukaManager.add(vehicle)`까지 수행하고, `Dispose()`에서 `yukaManager.remove(vehicle)`로
해제한다. `Allies.Summon` / `CreateAlly`는 Vehicle을 직접 등록하지 않고, 위치 초기화와
`Summoned()` 호출만 담당한다. 이렇게 하지 않으면 같은 Vehicle을 중복 등록하거나, 컨트롤러
해제 시 Yuka manager에 엔티티가 남는 문제가 생길 수 있다.

**`src/gsdk/src/actors/allies/allyctrl.ts`**
- 생성자에서 `RequestNavGridService` / `RequestYukaEntityManager` 발행 및 `Register*` 구독
  (monctrl.ts 206–210 대응).
- `ensureVehicle()` — `yuka.Vehicle` + `FollowPathBehavior` + `SeparationBehavior` 생성
  및 `yukaManager.add(vehicle)` 등록 (monctrl.ts 291–315).
- `updateNavigation()` — 리패스 주기 / 타겟 · 그리드 버전 변경 시
  `navGrid.findPath({ start, target: this.currentTarget, attackRange: this.Spec.AttackRange })`
  (monctrl.ts 363–394).
- `resolveWaypoints()` / `applyPath()` / `applyVehiclePosition()` 이식
  (monctrl.ts 396–430, 323–361). Y 높이는 `CustomGround.getHeightAt`.
- `isNavigationSuspended()` — Attack/Jump/Hurt/Dying 상태에서 Vehicle 정지
  (monctrl.ts 439–445).
- `update`의 LoS 정지 게이트 제거(6.1-A와 동일).

**`src/gsdk/src/actors/allies/ally/allystate.ts`**
- `RunAllyState.Update` (697–702행)의 `this.allyModel.Pos.add(...)` 직접 이동 제거 →
  Vehicle velocity 기반 애니메이션 재생·`lookAt`만 담당 (`RunZState` 676–687행 참고).
- `JumpSt` / `HurtSt` 종료 시 Vehicle position을 실제 메쉬 위치에 재동기화.

**`src/gsdk/src/actors/allies/createally.ts` / `allies.ts` `Allies.Summon`**
- Vehicle을 직접 생성·등록하지 않는다. 스폰 위치를 확정한 뒤 `allyCtrl.Summoned()`에서
  컨트롤러 내부 Vehicle이 실제 메쉬 위치로 동기화되도록 한다.

### 6.3 히트박스 통일 — `TargetRecord`에 `colliderObject` 필드 추가 (원인 3 해결)
> ✅ 반영됨 — §8.3 (단 6.3-5의 "유닛 사거리-밴드 후보 셀"은 미채택, 사유는 §8.3)

`object`(비주얼 모델)는 그대로 두고 히트박스 참조를 별도 필드로 등록한다. **거리·기하
판정만** `colliderObject ?? object`로 전환하고, 아이덴티티/메타/가시성 소비자
(`set Visible`, `get Meshs`, `targetMeta`, LoS `ignoreObjects`)는
`object`를 유지한다. (`object` 자체를 교체하는 안은 위 소비자들이 깨지므로 채택하지 않음.)

#### 6.3.1 타겟 기하 기준 정책

`TargetRecord.object`는 렌더링/가시성/아이덴티티용 대표 object이고, `colliderObject`는
전투·이동 기하용 대표 object다. 각 시스템이 임의로 `target.object.position` 또는
`setFromObject(target.object)`를 고르지 않도록 레지스트리에 공통 helper를 둔다.

```ts
getTargetBounds(record: TargetRecord): THREE.Box3 | undefined
getTargetCenter(record: TargetRecord): THREE.Vector3
getTargetDistanceFallback(record: TargetRecord): THREE.Vector3
```

권장 기준:

| 용도 | 기준 |
| --- | --- |
| visibility, `Meshs`, object UUID, targetMeta | `object` |
| 근접/원거리 공격 사거리, aggro 거리 | `colliderObject ?? object`의 bounds |
| 투사체 ray-box 명중 | `colliderObject ?? object`의 bounds |
| 디버그 hitbox / target line | `colliderObject` bounds center, 없으면 `object.position` |
| NavGrid 유닛 목표점 | `colliderObject` bounds center 또는 collider 위치, 없으면 `object.position` |
| 구조물 목표점 | 기존 `bounds` |

핵심은 "보이는 물체"와 "맞고 접근해야 하는 물체"를 분리하되, 전투/이동/디버그가 같은
기하 기준을 공유하게 만드는 것이다. 일부 호출이 계속 `target.object.position`을 fallback으로
넘기면 히트박스 통일 후에도 작은 거리 오차와 조기 정지가 남을 수 있다.

변경 지점:

1. **타입** — `systems/targeting/targettypes.ts`: `TargetRecord` / `RegisterTargetMsg`에
   `colliderObject?: THREE.Object3D` 추가.
2. **레지스트리** — `targetregistrysystem.ts`:
   - `register()`에서 `colliderObject`를 kind 무관하게 보관.
   - `record.object`와 `record.colliderObject`를 모두 `indexObject()`에 등록하고,
     `deregister()` / `updateObject()` / 재등록 시 둘 다 `unindexObject()`로 해제한다.
   - `colliderObject.userData.targetMeta`에도 `id`, `teamId`, `kind`를 부여해
     투사체·raycast가 히트박스 child를 맞춰도 `getByObject()`가 같은 레코드를 찾게 한다.
   - `getTargetBounds()` / `getTargetCenter()` / `getTargetDistanceFallback()` helper를 만들고,
     기존 `getDistanceBounds()` / `getDistance()` (186–193행)는 이 helper를 사용한다.
3. **어댑터** — `MonsterTargetAdapter.updateCache` (`monctrl.ts:89-110`),
   `AllyTargetAdapter.updateCache` (`allyctrl.ts:82-105`):
   레지스트리 helper 또는 `const src = target.colliderObject ?? target.object` 로 `box.setFromObject(src)`.
   `get Meshs()` / `set Visible` / `get UUID`는 `object` 유지.
4. **컨트롤러 거리 계산**:
   - `monctrl.ts`: `getTargetBounds`(547–554), `ValidateMeleeAttackTarget`(169),
     `ValidateRangedAttackTarget`(480), `isValidTarget`(543).
   - `allyctrl.ts`: 대응 지점(295, 306, 367–378).
   모두 레지스트리 helper 또는 `colliderObject ?? object` bounds 기준으로.
5. **NavGrid** — `navgridservice.ts`: `resolveGoalCells`(193–227),
   `resolveTargetPoint`(229–234) 비구조물 경로에서 `colliderObject ?? object`.
   가능하면 유닛도 단일 위치 셀만 목표로 삼지 말고, collider bounds와 `attackRange`를 이용해
   구조물과 같은 "사거리 안 walkable 후보 셀"을 만든다.
6. **투사체** — `projectilectrl.ts`: `getTargetBounds`(601–613) 유닛 경로 —
   `colliderObject ?? object` (레이-박스 명중도 히트박스로 통일).
7. **등록 사이트**:
   - `actors/monsters/monsters.ts` RegisterTarget에 `colliderObject: monSet.monCtrl.MonsterBox`.
   - `actors/allies/allies.ts` RegisterTarget에 `colliderObject: allySet.allyCtrl.AllyBox`.
   - 필요 시 `playerctrl.ts`, `interactives/building/buildingobjs/defenseturret.ts`,
     `world/cityview/readonlycityruntime.ts`, `fleetworld.ts`.
8. **디버그** — `GetDebugInfo()`의 `currentTargetBounds` / `currentTargetCenter`도 같은 helper를
   사용한다. 디버그 오버레이가 비주얼 모델 AABB를 계속 보여주면 실제 수정 여부를 오판하기 쉽다.

주의: `MonsterBox`/`AllyBox` 폭 2배(`x * 2`)는 의도된 설계이므로 유지한다. 통일 후 밀리 접근
정지 거리가 측면에서 모델폭 절반만큼 넓어지는 것은 수용한다.

### 6.4 공통 보강 (별도 작업으로 분리 가능)
> ✅ 반영됨 — §8.4 (D-4 폐쇄 대응은 미구현, 별도 티켓)

- **길찾기 실패 로깅**: `navgridservice.ts findPath`가 `NoPath` / `NoGrid` / 빈 goals /
  스냅 실패 시 `console.warn`으로 타겟 ID · start/goal 셀 · 그리드 bounds를 남긴다.
  현재 완전 무로그라 디버깅이 불가능하다.
- **NavGrid 범위**: `resolveNavGridCenter` / `resolveNavGridRadius`
  (`basecitycombat.ts` 557–568행)를 스폰 중심 단독이 아니라 **스폰 중심 + 방어 코어/주요
  구조물 bounds 포함**으로 확장한다 (셀 데이터는 저렴 — 설계 §6).
- **aggroRange**: 60을 고웨이브 스폰 반지름(`35 + wave * 8`) 이상으로 조정하거나,
  `currentTarget`이 없을 때도 스폰 중심 방향으로 최소한의 경로를 요청하도록 한다.
- **폐쇄 대응** (설계 §2.1): 경로 부재 시 가장 가까운 벽/건물을 공격 타겟으로 전환하는
  정책을 아군·몬스터 공통으로 도입한다.

---

## 7. 검증 방법

1. `npm run build` 및 `cd src/gsdk && npm run build` 통과 확인.
2. 도시 방어전(`playerdefensestate`) / 공격전(`rivalassaultstate`) 진입 후:
   - 아군 Warrior가 건물 뒤 적을 향해 접근해 근접 교전하는지 (6.1 적용) →
     건물을 우회 이동하는지 (6.2 적용).
   - **개활지에서** 아군 Warrior가 몬스터에 바짝 붙어 실제로 데미지를 주는지
     (6.3 적용). `[CombatDebug] AttackScheduled`의 `distance`가 `actorPos`↔`targetPos`
     실제 간격과 일치하고, `[CombatDebug] ReceiveRejected`가 사라지는지.
   - 아군 Archer / Mage가 기존과 동일하게 교전하는지 (회귀 없음).
   - Crab / Builder / KittenMonk / ToadMage 몬스터가 목표로 이동하는지.
   - 건물 파괴 후 재전투 시 경로가 다시 열리는지, 점프 / 피격 후 위치 드리프트가 없는지.
3. `allyctrl.ts`에 이미 있는 `[CombatDebug]` 로깅(`ally:update` 태그 등)으로 LoS 차단 발생
   여부를 확인한다. 디버그 박스 오버레이(`GetDebugInfo`)로 몬스터 주변 박스가
   히트박스와 일치하는지 확인한다.
4. 투사체가 히트박스 기준으로 명중 판정되는지 (6.3-6·8 적용 시), 원거리 아군/몬스터
   명중률 회귀가 없는지 확인한다.
5. 6.4 적용 시 `NavGridService` 경고 로그가 정상 상황에서 과도하게 찍히지 않는지 확인한다.

---

## 8. 구현 결과 (2026-09-09 반영)

§6 구현안을 코드에 반영했다. 빌드는 통과했고 **런타임 검증(§7)은 아직 수행하지 않았다**.

### 8.1 작업 A — 몬스터 `maxSpeed=0` 수정 + 버프 반영 (§6.1-B, 택1-a + 택1-b 둘 다)

| 파일 | 변경 |
| --- | --- |
| `src/gsdk/src/actors/battle/stats.ts` | `Crab` `speed: 0.35`, `Builder` `0.5`, `KittenMonk` `0.7`, `ToadMage` `0.45` 추가 (택1-a) |
| `src/gsdk/src/actors/monsters/monctrl.ts` | 모듈 상수 `MIN_MOVE_SPEED = 0.3` 신설. `getMoveSpeed() = Math.max(Spec.Speed, MIN_MOVE_SPEED)` helper (택1-b). `ensureVehicle()`·`applyVehiclePosition()`의 `CheckDirection` 모두 `getMoveSpeed()` 기준으로 통일. `applyVehicleSpeedFromSpec()` helper를 `onUpdateBuff`/`onRemoveBuff`에서 호출해 속도 버프가 `vehicle.maxSpeed`/`maxForce`에 반영되도록 함 |

- §3.2에서 지목한 `statsystem.ts:23`의 실제 코드는 `return this.cachedStats.get(stat) ?? (this.baseStats[stat] || 0)`
  이지만(문서 인용은 `getBaseStat` 쪽), 전역 speed 기본값이 없다는 결론은 유효.
- §3.2가 `ToadMage`를 "163행~"으로 인용했으나 실제는 106–116행. `KittenMonk`는 84–90행.

### 8.2 작업 B — 아군 Yuka/NavGrid 마이그레이션 (§6.2 + §6.1-A)

`MonsterCtrl` + `RunZState` 참조 구현을 `AllyCtrl` + `ally/allystate.ts`에 이식.

**`src/gsdk/src/actors/allies/allyctrl.ts`**
- `yuka`(`FollowPathBehavior`/`Path`/`SeparationBehavior`/`Vehicle`/`Vector3 as YukaVector3`),
  `INavGridService`/`NavPathStatus`, `IYukaEntityManager` import 추가. 모듈 상수 `MIN_MOVE_SPEED = 0.3`.
- 필드: `navGrid` / `yukaManager` / `vehicle` / `followPathBehavior` / `separationBehavior` /
  `currentPathTargetId` / `currentPathGridVersion` / `nextRepathElapsed` / `repathInterval=0.35` /
  `repathJitter` / `vehicleVelocityDir` / `desiredVehiclePos` / `actualMove` / `directPathTarget`.
- 콜백 `setNavGrid`, `setYukaManager`(→ `ensureVehicle()`). `onUpdateBuff`/`onRemoveBuff`에서
  `applyVehicleSpeedFromSpec()` 호출.
- 생성자: `RegisterEventListener(RegisterNavGridService/RegisterYukaEntityManager)` +
  `SendEventMessage(RequestNavGridService/RequestYukaEntityManager)`.
- `Dispose()`: 두 리스너 해제 + `yukaManager?.remove(vehicle)`.
- `Summoned()`: `currentPathTargetId`/`currentPathGridVersion` 리셋 + `syncVehicleFromMesh()`.
- 신규 메서드(monctrl 대응 포팅): `getMoveSpeed`, `applyVehicleSpeedFromSpec`, `ensureVehicle`,
  `syncVehicleFromMesh`, `applyVehiclePosition`, `updateNavigation`, `resolveWaypoints`,
  `applyPath`, `applyStateNavigationMode`, `isNavigationSuspended`
  (`AttackAllyState`/`JumpAllyState`/`HurtAllyState`/`DyingAllyState` + `Health<=0`).
  Y 높이는 `navGrid?.getHeightAt(x, z, allyModel.Pos.y) ?? allyModel.Pos.y` (문서 §6.2의
  "`CustomGround.getHeightAt`"은 몬스터와 동일하게 `navGrid.getHeightAt` 경유로 처리).
- `update()` 재작성: `ensureVehicle()` → `applyVehiclePosition()` → `resolveTarget()` →
  `Health>0 && currentTarget`이면 `updateNavigation()`, 아니면 `moveDirection=0` +
  `followPathBehavior.active=false`(타겟 없으면 제자리 대기) → 상태 `Update` →
  `applyStateNavigationMode()`. **LoS 정지 게이트(구 241–245행) 삭제** — `isTargetLineOfSightBlocked`는
  `ValidateMeleeAttackTarget`/`ValidateRangedAttackTarget` 공격 검증에만 존치.

**`src/gsdk/src/actors/allies/ally/allystate.ts`**
- `RunAllyState.Update`의 `gphysic.CheckDirection` + `this.allyModel.Pos.add(...)` 직접 이동
  블록 삭제. `lookAt` 회전·애니메이션만 담당(`RunZState`와 동일). `v.x==0&&v.z==0` → `IdleSt` 분기 유지.
- Jump/Hurt 종료 시 재동기화는 별도 콜백 없이 `applyStateNavigationMode()` +
  `isNavigationSuspended()`가 Jump/Hurt 동안 매 프레임 `syncVehicleFromMesh()`를 호출하는
  방식으로 커버(몬스터와 동일).

**`createally.ts` / `allies.ts`**: 코드 변경 없음. `Summon`은 위치 확정 후 `Summoned()` 호출만,
Vehicle 해제는 `Release()` → `allyCtrl.Dispose()` 경로로 이뤄짐 (설계대로 이미 만족).

### 8.3 작업 C — 히트박스 통일 `colliderObject` (§6.3)

| 항목 | 파일 | 변경 |
| --- | --- | --- |
| C-1 타입 | `systems/targeting/targettypes.ts` | `TargetRecord` / `RegisterTargetMsg`에 `colliderObject?: THREE.Object3D` |
| C-2 레지스트리 | `systems/targeting/targetregistrysystem.ts` | `register()`가 `colliderObject`를 kind 무관 보관 + `indexObject()` 등록 + `colliderObject.userData.targetMeta = {id, teamId, kind}` 부여. `deregister()`도 `unindexObject`. helper 신설: `getColliderObject()` / `getTargetBounds()` / `getTargetCenter()` / `getTargetDistanceFallback()`. `getDistanceBounds()` / `getDistance()`가 `getColliderObject()` 기준으로 전환 → `findNearestHostile` 거리도 히트박스 기준 |
| C-3 어댑터 | `monctrl.ts` / `allyctrl.ts` | `*TargetAdapter.updateCache` 비구조물 경로 `box.setFromObject(target.colliderObject ?? object)`. `get Meshs`/`set Visible`/`get UUID`/`get Pos`는 `object` 유지 |
| C-4 컨트롤러 | `monctrl.ts` / `allyctrl.ts` | `targetGeomObject(target) = target.colliderObject ?? target.object` helper 신설. `getTargetBounds` / `ValidateMeleeAttackTarget` / `ValidateRangedAttackTarget` / `isValidTarget` / `getDebugTargetBounds` / `GetDebugInfo`의 targetCenter가 이 helper 기준. (문서 §6.3-4의 monctrl "169"는 오기 — 실제 `ValidateMeleeAttackTarget` 거리 계산은 469행) |
| C-5 NavGrid | `systems/navigation/navgridservice.ts` | `resolveGoalCells` / `resolveTargetPoint` 비구조물 경로가 `colliderObject ?? object` 위치 사용. **단, 문서 §6.3-5의 "유닛도 사거리-밴드 후보 셀" 권장안은 채택하지 않음** — `Spec.AttackRange`가 밀리 아군 기준 0.5로 해석되어 `Math.max(_, gridSize=4)`가 밀리 아군을 목표 4유닛 앞에서 멈추게 만든다. 유닛은 몬스터 참조 구현대로 **위치 셀 1개만** 목표로 두고, 최종 접근·정지는 `updateNavigation` 조기 정지 / 상태머신 `CheckAttack`(3.5)이 처리 |
| C-6 투사체 | `actors/projectile/projectilectrl.ts` | `getTargetBounds` 유닛 폴백이 `record?.colliderObject ?? target` |
| C-7 등록 사이트 | `actors/monsters/monsters.ts` / `actors/allies/allies.ts` | `RegisterTarget`에 `colliderObject: MonsterBox` / `AllyBox` 추가 |

- `object` 자체 교체안은 채택하지 않음(설계대로). `MonsterBox`/`AllyBox` 폭 2배는 유지.
- 문서 §6.3-7의 등록 후보 중 `defenseturret.ts`는 타겟을 소비만 하므로 대상 아님(건물 등록은
  `interactives/building/buildingmanager.ts`). player/turret/fleet/building 등록 사이트는
  이번 범위에서 손대지 않음(구조물은 이미 tight `bounds` 보유, 함대는 이미 히트박스를 `object`로 등록).

### 8.4 작업 D — 공통 보강 (§6.4)

| 항목 | 파일 | 변경 |
| --- | --- | --- |
| D-1 길찾기 실패 로깅 | `systems/navigation/navgridservice.ts` | `findPath` 실패 시 `warnPathFailure(reason, target, cell)` — `no-grid` / `start-unsnappable` / `no-goal-cells` / `no-route`. `console.warn`에 targetId·kind·gridVersion·cell·gridBounds 기록. **(targetId + gridVersion + reason)당 1회만** warn(스팸 억제), `build()`/`clear()`에서 `warnedFailures` 초기화 |
| D-2 NavGrid 범위 | `libgamestates/warstates/basecitycombat.ts` | `resolveNavGridCenter` / `resolveNavGridRadius` 삭제, `resolveNavGridArea(): {center, radius}` 신설 — 모든 웨이브 스폰 링 + `targetRegistry`의 구조물 타겟 bounds를 `Box3`로 합쳐 center/radius 산출(최소 radius 80). `buildCombatNavGrid`가 이를 사용. **경로 주의**: 이 파일은 `src/gsdk/` 아래가 아니라 `src/libgamestates/warstates/basecitycombat.ts` |
| D-3 aggroRange | `actors/monsters/monctrl.ts` | 몬스터 `aggroRange` 60 → 80 (고웨이브 스폰 링 `35 + wave*8` 대응). 아군은 60 유지 |
| D-4 폐쇄 대응 | — | **미구현.** 범위가 커서 별도 티켓으로 분리 |

### 8.5 빌드 상태

- 루트 `npm run build` (webpack): **성공**.
- `cd src/gsdk && npx tsc --noEmit`: 수정 파일 **오류 0**.
- `cd src/gsdk && npm run build` (독립 빌드): 16개 오류가 남으나 **전부 기존 문제** —
  `src/actors/agent/*`(`@tensorflow/tfjs` 미설치), `src/systems/qr/qr.ts`(`qrcode` / `@zxing/browser`
  미설치). 이번 변경과 무관.

### 8.6 잔여 작업

1. **런타임 검증(§7)** — 도시 방어전/공격전 진입 후 밀리 아군 접근·교전, `[CombatDebug]`
   로그(`AttackScheduled` distance 일치 / `ReceiveRejected` 소멸), 원거리 아군 회귀,
   Crab/Builder/KittenMonk/ToadMage 이동, 점프/피격 후 드리프트, 건물 파괴 후 경로 재개.
2. **D-4 폐쇄 대응** — 경로 부재 지속 시 최근접 벽/건물을 임시 공격 타겟으로 전환(아군·몬스터 공통).
3. **선택적 `colliderObject` 등록 확대** — `playerctrl.ts` 등(플레이어 히트박스가 있을 경우).
4. `AllyCtrl`의 `dir` 필드는 LoS 게이트 제거 후 미사용 상태로 남아 있음(무해, `RunZState`도 동일).
