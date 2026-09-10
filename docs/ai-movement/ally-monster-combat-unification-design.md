# 아군/몬스터 전투 컨트롤러 통일 + 주입형 타겟 선택 정책 — 설계

> 관련 문서: [아군 밀리 이동 불량 / 몬스터 부분 정지 — 진단 및 구현 계획](./ally-melee-movement-diagnosis.md),
> [Yuka 기반 길찾기 및 AI 이동 시스템 설계](./yuka-navmesh-integration-design.md),
> [유닛 간 사거리 유지 문제 해결](../combat/unit-attack-distance-fix.md)

## 1. 개요

`ally-melee-movement-diagnosis.md` §8 작업으로 아군을 몬스터의 Yuka/NavGrid 이동 구조에 이식했다.
그 결과 이동·길찾기 **코어는 사실상 동일**해졌으나 다음이 남아 있다.

- `MonsterCtrl` + `zombie/monstate.ts` 와 `AllyCtrl` + `ally/allystate.ts` 가 ~90% 중복 코드다.
  한쪽만 고치면 다른 쪽이 어긋난다 (진단 문서가 반복해서 지적한 패턴).
- "정지 거리"와 "공격 트리거 거리"가 서로 다른 값을 참조해, 몬스터가 사거리 밖에서 얼거나
  근접까지 파고든다.
- `AttackState` 의 재추적 분기가 죽은 코드라, 타겟이 빠지면 "허공 스윙 → 정지 → 튐" 스터터가 난다.
- 정지 게이트가 LoS 를 안 봐서 건물 뒤 원거리 몬스터가 굳는다 (§6.4 D-4 "폐쇄 대응" 미구현).
- 타겟 선택이 `findNearestHostile`(최근접) 고정이라, "나를 공격하는 터렛/적 캐릭터로 전환" 같은
  정책을 **주입할 지점이 없다**.

이 문서는 위를 한 번에 해소하는 리팩토링/기능 추가 설계를 정의한다.
**호환 진입점(`findNearestHostile`, `NewDefaultMonsterState`, `NewDefaultAllyState`)은 유지**하지만,
내부 구조와 일부 API는 바뀐다 — 구체적으로 FSM 클래스 병합(기존 state 파일은 shim 화),
`ReceiveDemage` 시그니처에 옵셔널 인자 추가, `TargetRegistrySystem` 생성자에 옵셔널 인자 추가,
`AttackOption` 에 `attackerTargetId` 필드 추가. 순수 additive 가 아니므로 구현 시 §11 리스크 표를 참고한다.

---

## 2. 현재 문제 (근거 코드)

### 2.1 사거리 값 이원화

| 용도 | 참조 값 | 위치 |
| --- | --- | --- |
| 네비게이션 조기 정지 게이트 | `this.Spec.AttackRange * 0.92` | `monctrl.ts:390-392`, `allyctrl.ts:421-423` |
| NavGrid 경로 요청 인자 | `this.Spec.AttackRange` | `monctrl.ts:420`, `allyctrl.ts:451` |
| FSM 공격 전이 트리거 | `GetAttackDistance()` = `projectileDef.range ?? GetMeleeAttackDistance(spec)` | `monstate.ts:70-73/137`, `allystate.ts:64-66/128` |

- `BaseSpec.AttackRange` (`basespec.ts:51-54`) = `(item.Stats.attackRange ?? getStat("attackRange")) + 0.5`.
- `GetMeleeAttackDistance(spec)` (`meleecombat.ts:59-62`) = `getBaseStat("attackRange") > 0` 이면
  `spec.AttackRange`, 아니면 상수 `DEFAULT_MELEE_ATTACK_RANGE = 3.5`.
- **근접 `attackRange` 스탯이 없는 액터**(Warrior 아군, Zombie/Golem 등 대부분 근접 몬스터):
  네비 게이트는 `(0 + 0.5) * 0.92 ≈ 0.46` 에서 멈추려 하고 FSM 은 `3.5` 에서 공격을 시도한다.
  실전에서는 FSM 이 먼저 `AttackState` 로 전이해 네비를 suspend 시키므로 대략 3.5 에서 서지만,
  두 값이 별개라는 사실 자체가 향후 회귀의 씨앗이다.
- **원거리 몬스터**: `GetAttackDistance()` 는 `projectileDef.range` 를, 네비 게이트는
  `attackRange` 스탯(+0.5)을 쓴다. 두 값이 다르면 사거리 밖에서 멈춰 발사를 안 하거나
  발사 사거리보다 훨씬 앞까지 들어간다.

### 2.2 `AttackState` 재추적 불가 (죽은 `CheckRun`)

`AttackZState.Update` (`monstate.ts:355-359`) / `AttackAllyState.Update` (`allystate.ts:348-352`):

```ts
if (dist > attackDistance) {
    const checkRun = this.CheckRun(v)   // v(=moveDirection)는 공격 중 항상 (0,0,0)
    if (checkRun != undefined) return checkRun
}
```

`AttackState` 진입 시 `isNavigationSuspended()` 가 참이 되어 `updateNavigation` 과
`applyVehiclePosition` 이 매 프레임 `moveDirection` 을 0으로 만든다(`monctrl.ts:385-388`,
`monctrl.ts:344-346`). 따라서 `CheckRun(v)` 는 **절대 성립하지 않는다.**
Attack 을 벗어나는 경로는 `CheckHit` / `CheckDying` / 다음 스윙 틱에서 `CanScheduleAttack` 실패뿐이고,
후자는 `IdleSt` 로 보낸다(`monstate.ts:373-377`). 결과: 타겟이 근접에서 빠지면
스윙 타이머가 끝날 때까지 헛스윙 → `IdleSt` 1~2프레임 → 다시 Run. 시각적으로 "스윙/정지/튐" 스터터.

### 2.3 정지 게이트가 LoS 를 무시

`updateNavigation` (`monctrl.ts:390-397`, `allyctrl.ts:421-428`):

```ts
if (targetDistance <= attackRange * 0.92) {
    follow.active = false
    vehicle.velocity.set(0, 0, 0)
    this.moveDirection.set(0, 0, 0)
    return
}
```

건물 뒤 원거리 몬스터: `targetDistance <= attackRange*0.92` 를 만족해 정지하지만
`ValidateRangedAttackTarget` 이 LoS 차단으로 실패 → FSM 이 공격 못 함 → `IdleSt` → 다음 프레임
`updateNavigation` 이 다시 "이미 사거리 안"으로 판정 → **재탐색 없이 영구 정지.**
NavGrid `resolveGoalCells` 는 유닛 타겟에 대해 위치 셀 1개만 목표로 삼으므로(`navgridservice.ts:201-244`)
정지만 안 하면 A* 가 건물을 우회한다.

### 2.4 타겟 선택 정책 부재

- `MonsterCtrl.findRegistryTarget` / `AllyCtrl.findRegistryTarget` 은
  `registry.findNearestHostile(targetId, aggroRange, { kinds: ["unit","structure"], ... })` 고정
  (`monctrl.ts:540-558`, `allyctrl.ts:562-580`).
- `findNearestHostile` (`targetregistrysystem.ts:176-194`)은 정렬 없는 순수 최근접 min-scan.
  scoring / weight / threat / exclude 개념이 전무하다.
- `TargetRecord` (`targettypes.ts:19-35`)에 hp·threat·priority·lastAttacker 필드 없음.
  `threatLevel` 스탯은 존재하나 타겟팅에서 안 읽힌다.
- **"마지막 공격자" 추격 로직 없음.** 단, 공격 이벤트에는 이미 공격자 단서가 실려 있다
  (§2.5). 컨트롤러까지 전달만 안 될 뿐이다.
- 참고: `TargetRegistrySystem` 은 이미 `RelationResolver` 인터페이스를 **주입형 정책 패턴**으로
  쓰고 있다(`relationresolver.ts`, 생성자 2번째 인자). 타겟 선택 정책도 같은 방식으로 만든다.

### 2.5 공격자 신원 전달 누락

- `AttackOption` (`playertypes.ts:87-101`): `spec?: BaseSpec`, `attackerObjectId?: string`(mesh uuid),
  `obj?: THREE.Object3D`. **전용 공격자 id 필드는 없다.**
- `Monsters.ApplyAttack` (`monsters.ts:167-209`) / `Allies.ApplyAttack` (`allies.ts:203-245`) 에서
  `opt.spec` · `opt.attackerObjectId` · `opt.obj` 가 보이지만, 이후
  `Monsters.ReceiveDemage` → `MonsterCtrl.ReceiveDemage(damage, effect, attackRange, knockbackDist)`
  로 넘어갈 때 **버려진다**. 사망 이벤트에도 killer 정보가 없다.
- **`opt.obj` 의 의미가 송신자마다 다르다** (중요):
  - 몬스터/아군 근접·대시 (`monstate.ts:523`, `allystate.ts:533`, `dashmonst.ts:206`): `obj` = **공격자** mesh.
  - 플레이어 단순 근접 (`meleeattackst.ts`), **모든 투사체** (`projectilectrl.ts:260`, `:297` — `obj: obj.target`/`hit.target`): `obj` = **피격자** mesh.
  - 따라서 `opt.obj` 를 무조건 "공격자"로 해석하면 투사체/터렛 피격 시 자기 자신으로 역참조되어 폐기된다.
- `opt.spec?.Owner?.objs` 는 **일관되게 공격자(owner)** 다. 투사체는 fusion actor 가 owner 를 보존한다
  (`VirtualActorFactory.createFusionActor`, `virtualactorfab.ts:75`). `ProjectileCtrl` 도 이 경로를 쓴다
  (`projectilectrl.ts:703-704`, `754-755`).
- `attackerObjectId`(mesh uuid)로는 레지스트리 조회 불가 (uuid 인덱스 없음).
- **결론**: `opt.spec.Owner.objs` 를 1순위로, `opt.obj`(수신자 id 와 같으면 skip)를 2순위로 쓰고,
  더 견고하게는 `AttackOption.attackerTargetId?: string` 전용 필드를 추가해 송신 시점에 채운다 (§7).
- **터렛**: `DefenseTurret` 은 `EventTypes.Attack` 을 직접 안 쏘고 `SpawnProjectile`(`ownerSpec: this.baseSpec`)
  만 한다. 명중 시 `ProjectileCtrl` 이 `Attack` 발행, `spec` 은 fusion actor(owner = 터렛).
  터렛은 `RegisterTarget`(`kind:"structure"`, `teamId:"player"`, id=`buildingObj.id`)로 등록됨
  (`buildingmanager.ts:211-247`). 즉 터렛 투사체 피격 →
  `opt.spec.Owner.objs`(터렛 mesh) → `getByObject` → 터렛 구조물 레코드 id 로 귀결.
- **건물은 이미 공격자를 보존**한다: `basebuilding.ts:233-257` `onAttacked` 가
  `DamagePacket { sourceSpec: opt.spec, sourceId: opt.obj?.name, ... }` 로 전달. 참고 구현.

---

## 3. 설계 결정 사항

| # | 항목 | 결정 |
| --- | --- | --- |
| 1 | 통일 범위 | **공용 베이스 컨트롤러 추출.** `AllyCtrl`/`MonsterCtrl` 공통부를 `ActorCombatController` 추상 베이스로 뽑고, 두 컨트롤러는 훅 오버라이드만. FSM 도 `ActorCombatState` 로 병합 |
| 2 | 정책 주입 경로 | **3중.** ① 레지스트리 전역 기본값, ② 프리셋 데이터 필드 `property.targetPolicy?`, ③ 런타임 세터 `setTargetPolicy()` / 일괄 주입 이벤트 |
| 3 | 위협 전환 공격성 | **마진 + 스티키니스.** 현재 타겟이 유효하고 도달 가능하면 유지, 위협이 마진배 초과하거나 현재 타겟이 도달 불가일 때만 전환 |
| 4 | 아군 타겟팅 | **순수 최근접 유지.** 아군 기본 정책 = `NearestHostilePolicy`. 위협 인프라는 베이스에 두되 아군 정책이 `threats` 를 안 읽어 무동작(나중에 정책 한 줄 교체로 opt-in) |

---

## 4. 아키텍처 개요

세 갈래.

- **A. `ActorCombatController` 베이스 + FSM 통일** — 중복 제거 + §2.1~§2.3 버그 수정.
- **B. 주입형 `TargetSelectionPolicy`** — `RelationResolver` 패턴 복제. 3중 주입.
- **C. `ThreatBook` + 공격자 신원 배선** — 몬스터에서 활성, 아군은 무동작.

```
ActorCombatController (abstract)
├─ Yuka Vehicle / NavGrid 길찾기 / applyVehiclePosition / updateNavigation
├─ resolveTarget ──► targetPolicy.selectTarget(ctx)  ◄── B
├─ threatBook (decay/record)                         ◄── C
├─ ReceiveDemage(...attacker) ──► resolveAttackerId ──► threatBook.record
└─ 추상 훅: model / idPrefix / aggroRange / property / debugTeam /
            createPhybox / createDefaultTargetPolicy / getFallbackTarget
     ▲                                   ▲
 MonsterCtrl                          AllyCtrl
 (Zombie, player 폴백,                (AllyModel, 폴백 없음,
  ThreatAwareNearestPolicy)           NearestHostilePolicy)
```

---

## 5. A. `ActorCombatController` 베이스 + FSM 통일

### 5.1 A-0. 공통 모델 인터페이스 — `actors/battle/iactormodel.ts` (신규)

`Zombie` · `AllyModel` 이 컨트롤러에 노출하는 표면만 추린다. 둘 다 `PhysicsObject` 를 상속하므로
`IPhysicsObject` 멤버는 이미 충족.

```ts
export interface IActorModel extends IPhysicsObject {
    get Visible(): boolean
    update(delta: number): void
    SetOpacity(opacity: number): void
    DamageEffect(damage: number, effect?: EffectType): void
    ChangeAction(action: ActionType, speed?: number): number | undefined
}
```

`zombie.ts` / `allymodel.ts` 에 `implements IActorModel` 추가(드리프트 감지용). 구현 변경 없음.

### 5.2 A-1. `actors/battle/actorcombatcontroller.ts` (신규, abstract)

현재 두 컨트롤러의 중복 전부를 이동한다.

- **필드**: `baseSpec`, `currentState`/`idleState`, `moveDirection`, Yuka 일체
  (`vehicle`/`followPathBehavior`/`separationBehavior`/`currentPathTargetId`/`currentPathGridVersion`/
  `nextRepathElapsed`/`repathInterval`/`repathJitter`/스크래치 벡터), `targetRegistry`/`navGrid`/`yukaManager`,
  `targetAdapter`, `threatBook`, `targetPolicy`, `lineOfSight`, `_cp`/`targetBounds`,
  `currentTargetReachable`(연속 `NoPath` 카운터 기반), `lastSelectAt`.
- **이동/공통 메서드** (현재 `monctrl.ts` 구현을 그대로 이동):
  `ensureVehicle` / `applyVehicleSpeedFromSpec` / `getMoveSpeed` / `syncVehicleFromMesh` /
  `applyVehiclePosition` / `updateNavigation` / `resolveWaypoints` / `applyPath` /
  `applyStateNavigationMode` / `isNavigationSuspended` / `resolveTarget` / `findRegistryTarget` /
  `isValidTarget` / `targetGeomObject` / `getTargetBounds` / `isTargetLineOfSightBlocked` /
  `getDebugTargetBounds` / `getEffectiveAttackRange` / `ValidateMeleeAttackTarget` /
  `ValidateRangedAttackTarget` / `applyAction` / `removeAction` / `GetDebugInfo` /
  `ReceiveDemage`(공격자 인자 포함) / `update(delta)` 템플릿 / `resetForSpawn()` / `Dispose()`.
- **추상 훅** (사이드별 차이):

  | 훅 | Monster | Ally |
  | --- | --- | --- |
  | `get model(): IActorModel` | `this.zombie` | `this.allyModel` |
  | `get idPrefix(): string` | `"mon"` | `"ally"` |
  | `get aggroRange(): number` | `80` | `60` |
  | `get property(): ActorCombatProperty` | `MonsterProperty` | `AllyProperty` |
  | `get debugTeam(): CombatDebugTeam` | `Monster` | `Ally` |
  | `createPhybox(id, geo, mat): THREE.Mesh` | `new MonsterBox(...)` | `new AllyBox(...)` |
  | `createDefaultTargetPolicy(): TargetSelectionPolicy` | `new ThreatAwareNearestPolicy()` | `new NearestHostilePolicy()` |
  | `getFallbackTarget(): IPhysicsObject \| undefined` | `this.player` | `undefined` |

  `ActorCombatProperty` = `MonsterProperty`/`AllyProperty` 가 공통으로 갖는
  `{ id, idleStates, projectileDef?, attackAction?, targetPolicy? }` 유니온 타입.

- **`update(delta)` 템플릿** (두 사이드 통일):
  ```
  if (!model.Visible) return
  ensureVehicle()
  applyVehiclePosition(delta)
  threatBook.decay()
  targetAdapter.update()
  const target = resolveTarget()
  if (Spec.Health > 0 && targetAdapter.HasTarget) updateNavigation(delta, target)
  else { moveDirection.set(0,0,0); followPathBehavior.active = false }
  currentState = currentState.Update(delta, moveDirection, target)
  applyStateNavigationMode()
  model.update(delta)
  phybox 위치/회전 동기화
  ```
  현재 `MonsterCtrl.update` 의 미사용 `dir`/`raycast` per-frame 계산은 제거
  (`CheckVisible*` 레거시만 쓰던 값).

- **`MonsterCtrl` / `AllyCtrl` 축소**: 생성자 배선(모델·player·id·이벤트 등록) + 훅 impl +
  진짜 고유부만 남긴다.
  - `MonsterCtrl.Respawning()` / `AllyCtrl.Summoned()` → `resetForSpawn()` 를 부르는 얇은 별칭.
  - `MonsterCtrl` 은 `Drop` / `MonsterProperty` 게터, `AllyCtrl` 은 `DeckLevel` 게터 유지.
  - `IMonsterCtrl` / `IAllyCtrl` 인터페이스는 그대로 만족.

### 5.3 A-2. 통합 어댑터 — `actors/battle/actortargetadapter.ts` (신규)

`MonsterTargetAdapter` + `AllyTargetAdapter` 병합. 유일한 차이는 폴백 유무.

```ts
class ActorTargetAdapter implements IPhysicsObject {
    constructor(private readonly fallback?: IPhysicsObject) {}
    get HasTarget() { return this.target != undefined || this.fallback != undefined }
    // target 있으면 target 기준, 없고 fallback 있으면 fallback, 둘 다 없으면 ZERO/empty
    // bounds 는 target.colliderObject ?? target.object (양쪽 기존 동일)
}
```

- Monster: `new ActorTargetAdapter(this.player)`
- Ally: `new ActorTargetAdapter()` — 타겟 없으면 `HasTarget === false` → 제자리 대기

### 5.4 A-3. 통합 FSM — `actors/battle/actorcombatstates.ts` (신규)

`MonState` + `AllyState` 추상 클래스를 `ActorCombatState` 하나로 병합. 구체 상태
(`IdleActorState` / `RunActorState` / `AttackActorState` / `JumpActorState` / `HurtActorState` /
`DyingActorState`) 1세트. 생성 시 `cfg: ActorStateConfig` 주입:

```ts
interface ActorStateConfig {
    projectileRange?: number         // property.projectileDef?.range
    attackAction?: ActionType
    muzzleOffset?: { x: number; y: number; z: number }
    attackAnimScale?: number         // 몬스터 = raw duration, 아군 = duration * 0.8
    standDownWithoutTarget: boolean   // 아군 true (현 HasAllyAttackTarget 가드), 몬스터 false
    onDeathInit?: () => void          // 몬스터 = Exp 이벤트 발행, 아군 = noop
}
```

**여기서 §2.1 / §2.2 수정을 흡수한다:**

- `GetAttackDistance()` → `GetEffectiveAttackRange(spec, cfg.projectileRange)` (A-1 helper).
- `AttackActorState.Update`:
  - 죽은 `if (dist > attackDistance) CheckRun(v)` 제거 →
    `if (!attackProcess && dist > attackDistance * ATTACK_EXIT_HYSTERESIS) { Uninit(); RunSt.Init(); return RunSt }`
    (`ATTACK_EXIT_HYSTERESIS = 1.2`, Attack↔Run 플랩 방지).
  - `!CanScheduleAttack` 분기: 유효 타겟이 아직 있으면 `IdleSt` 대신 `RunSt` 로.
- `standDownWithoutTarget` 가 현재 아군 전용 `HasAllyAttackTarget` 가드를 대체
  (`Idle`/`Run`/`Attack` 상태에서 타겟 없으면 Idle).

`NewDefaultMonsterState` / `NewDefaultAllyState` 는 올바른 `cfg` 로 상태 세트를 만드는 얇은 래퍼로
축소한다. **`monstate.ts` / `allystate.ts` 는 호환 re-export 심(shim)** 으로 남겨 import 경로와
`NewDefault*State` 시그니처를 유지한다.

- `zombie/dashmonst.ts` 는 `AttackZState` 를 상속 → 통합 `AttackActorState` 상속으로 전환.
  통합 클래스의 protected 표면(`attackProcess` / `scheduledTarget` / `scheduledAttackRange` /
  `GetTargetDistance` / `ChangeAttackAction` 등)을 깨지 않게 유지한다.

### 5.5 A-4. 정지 게이트에 LoS 반영 (베이스 `updateNavigation`)

```ts
if (targetDistance <= attackRange * 0.92 && this.canAttackFrom(target)) {
    follow.active = false
    vehicle.velocity.set(0, 0, 0)
    this.moveDirection.set(0, 0, 0)
    return
}
// canAttackFrom = !currentTarget || !isTargetLineOfSightBlocked(currentTarget, "actor:nav-gate")
```

LoS 가 막혀 있으면 정지하지 않고 경로 추종을 지속 → A* 가 유닛 셀로 향하며 건물 우회.
구조물 타겟은 이미 standoff 링으로 우회하므로 영향 없음.

### 5.7 A-5. `currentTargetReachable` 산출 계약 (정책이 소비)

현재 `resolveWaypoints` (`monctrl.ts:415-434`)는 `findPath` 가 `Complete` 가 아니면 **즉시**
직선 fallback `[Pos, CenterPos]` 를 만들고 `applyPath` 가 `follow.active = true` 로 둔다. 즉 컨트롤러가
"도달 불가"를 밖으로 알리지 않는다. §6.3 정책의 sticky 해제가 실제로 동작하려면 다음을 명시한다.

- 베이스 필드: `lastPathStatus: NavPathStatus`, `noPathStreak: number` (기본 0),
  `currentTargetReachable: boolean` (기본 `true`).
- `updateNavigation` 에서 `resolveWaypoints` 가 실제 `navGrid.findPath` 를 호출한 경우
  (`this.currentTarget && navGrid.IsReady`):
  - `path.status === Complete` → `noPathStreak = 0`, `lastPathStatus = Complete`.
  - `path.status === NoPath` → `noPathStreak++`, `lastPathStatus = NoPath`.
  - `path.status === NoGrid` → **카운트하지 않음** (그리드 빌드 전 정상 상태). `lastPathStatus = NoGrid`.
- `currentTargetReachable = noPathStreak < REACHABLE_NOPATH_THRESHOLD` (기본 `3`;
  `repathInterval 0.35s` 기준 약 1초 연속 실패).
- **직선 fallback 은 유지한다** (그리드 재빌드 중 순간 정지 방지). `noPathStreak` 카운터 +
  정책의 타겟 전환이 교착 탈출 경로다.
- reset 조건: `currentPathTargetId` 변경(= 타겟 교체) 시, `resetForSpawn()` 시 →
  `noPathStreak = 0`, `currentTargetReachable = true`.
- `TargetSelectionContext.currentTargetReachable` 에 이 값을 그대로 넣는다.

### 5.6 A 신규 helper — `actors/battle/combatrange.ts` (신규)

```ts
export const ATTACK_EXIT_HYSTERESIS = 1.2

export function GetEffectiveAttackRange(spec: BaseSpec, projectileRange?: number): number {
    if (projectileRange != undefined) return projectileRange
    return GetMeleeAttackDistance(spec)   // 기존: getBaseStat("attackRange")>0 ? Spec.AttackRange : 3.5
}
```

`updateNavigation` / `findPath` 인자 / `GetDebugInfo().attackRange` 전부 베이스의
`getEffectiveAttackRange()` (= `GetEffectiveAttackRange(this.Spec, this.property.projectileDef?.range)`) 사용.

---

## 6. B. 주입형 `TargetSelectionPolicy`

### 6.1 인터페이스 — `systems/targeting/targetselectionpolicy.ts` (신규)

```ts
export interface TargetSelectionContext {
    selfId: string
    selfTeamId?: string
    selfPos: THREE.Vector3
    maxDistance: number                   // aggroRange
    currentTargetId?: string
    currentTargetReachable?: boolean       // 연속 NoPath면 false (스티키 해제 신호)
    fallbackTargetId?: string              // 몬스터 = 플레이어 id, 아군 = undefined
    threats: ReadonlyArray<ThreatEntry>    // ThreatBook.list(), threat desc 정렬
    registry: ITargetRegistryQuery
    query?: TargetQueryOptions
}

export interface TargetSelectionPolicy {
    /** 고른 타겟 레코드, 없으면 undefined(대기) */
    selectTarget(ctx: TargetSelectionContext): TargetRecord | undefined
}
```

`ITargetRegistryQuery` — `TargetRegistrySystem` 이 **이미 구현 중인** 것 중 정책에 필요한 것만
노출하는 좁은 인터페이스:

```ts
export interface ITargetRegistryQuery {
    get(id: string): TargetRecord | undefined
    getByObject(o?: THREE.Object3D | null): TargetRecord | undefined
    getTargetsForTeam(teamId: string, relation?: Relation, options?: TargetQueryOptions): TargetRecord[]
    findNearestHostile(sourceId: string, maxDistance: number, options?: TargetQueryOptions): TargetRecord | undefined
    isHostile(sourceId: string, targetId: string): boolean
    /** 신규 public helper. private getDistance 를 감싸 number 만 반환 — mutable Box3 노출 안 함 */
    getDistanceToTarget(sourcePos: THREE.Vector3, target: TargetRecord, mode?: TargetDistanceMode): number
}
```

- `get` / `getByObject` / `getTargetsForTeam` / `findNearestHostile` / `isHostile` 은 기존 public 그대로.
- `getDistanceToTarget` 만 신규 추가 — 현재 `private getDistance` (`targetregistrysystem.ts:218`)를 감싸는
  얇은 public 래퍼. `getTargetBounds` 는 **공유 재사용 `distanceBox`** 를 반환하므로
  (`targetregistrysystem.ts:225-232`) 정책에는 노출하지 않는다 (정책이 bounds 를 보관하면 다음 호출에서
  깨진다). 정책은 거리 비교만 필요하므로 numeric helper 로 충분하다.
- 인터페이스 추출 + `getDistanceToTarget` 1개 추가 외 구현 로직 변경 없음.

`ThreatEntry` 는 `threatbook.ts` 가 소유하고 이 파일이 re-export 한다.

### 6.2 정책 구현 — `systems/targeting/policies/*.ts` (신규)

| 정책 | 동작 |
| --- | --- |
| `NearestHostilePolicy` | `registry.findNearestHostile` 그대로. **아군 기본값** |
| `ThreatAwareNearestPolicy(cfg)` | 마진 + 스티키니스. §6.3 알고리즘. **몬스터 기본값** |
| `StructureFirstPolicy(inner)` | 범위 내 `kind:"structure"` 우선, 없으면 `inner` 위임. 공성 몬스터 예시 |
| `CompositeTargetPolicy([...])` | 앞에서부터 첫 non-undefined 채택. "위협 → 구조물우선 → 최근접" 조립 |
| `ScoredTargetSelectionPolicy(weights)` | 대안 스타일. `score = wDist·(1-d/maxD) + wThreat·norm(threat) + wStick·(id==current) + wKind·kindWeight[kind]`. 데이터 튜닝용 (기본 아님) |

정책 객체는 **무상태** 로 설계한다. per-actor 값(`fallbackTargetId`, `currentTargetReachable` 등)은
전부 `ctx` 로만 전달하므로 한 인스턴스를 여러 액터가 공유해도 안전하다.

**단, 프리셋(데이터)에는 인스턴스가 아니라 enum id + config 를 넣는다** (§6.4-2). 데이터 타입
(`MonsterProperty`/`AllyProperty`)에 클래스 인스턴스를 담으면 데이터/코드 경계가 흐려지고
직렬화·선언적 정의가 막히기 때문이다.

```ts
export enum TargetPolicyId {
    NearestHostile = "nearest-hostile",
    ThreatAwareNearest = "threat-aware-nearest",
    StructureFirst = "structure-first",
    Scored = "scored",
}

// 판별 유니온 — id 별 config
export type TargetPolicyConfig =
    | { id: TargetPolicyId.NearestHostile }
    | { id: TargetPolicyId.ThreatAwareNearest; switchMargin?: number; threatLeash?: number }
    | { id: TargetPolicyId.StructureFirst; inner?: TargetPolicyConfig }
    | { id: TargetPolicyId.Scored; weights?: ScoredWeights; kindWeight?: Partial<Record<TargetKind, number>> }

// systems/targeting/policies/targetpolicyfactory.ts
export function createTargetPolicy(config: TargetPolicyConfig): TargetSelectionPolicy
```

`CompositeTargetPolicy` 는 config 레벨에서 `StructureFirst.inner` 중첩 또는 별도 배열 config 로 표현.

### 6.3 `ThreatAwareNearestPolicy` 알고리즘

`cfg = { switchMargin: 1.5, threatLeash: 1.4 }` 기본.

1. `current = ctx.registry.get(ctx.currentTargetId)`;
   `currentValid = current && matchesQuery(current) && isHostile(selfId, current.id)
   && dist(selfPos, current) <= maxDistance * threatLeash`.
2. `topThreat = ctx.threats[0]` → 레코드 해석 + 유효성 검사.
3. **현재 유지** 조건: `currentValid` **AND** `ctx.currentTargetReachable !== false` **AND**
   NOT(`topThreat` 유효 && `topThreat.threat >= threatOf(current) * switchMargin`)
   → `current` 반환. *(스티키니스)*
4. 아니고 `topThreat` 유효 → `topThreat` 레코드 반환. **← 터렛/적 캐릭터 전환 지점**
5. 아니면 `registry.findNearestHostile(selfId, maxDistance, query)`.
6. 아니면 `ctx.fallbackTargetId` → `registry.get(fallbackTargetId)` (몬스터 → 플레이어).
7. 아니면 `undefined`.

`NearestHostilePolicy` = 5 → 7 만 (아군은 `fallbackTargetId` 없음 → 타겟 없으면 대기).

### 6.4 주입 (3중)

1. **전역 기본값** — `TargetRegistrySystem` 생성자에
   `defaultSelectionPolicy: TargetSelectionPolicy = new NearestHostilePolicy()` 추가
   (`RelationResolver` 와 동형, 옵셔널 인자). `playfab.ts:24` 에서 선택 지정. 얇은 위임 메서드
   `selectTarget(ctx, policy?)` 추가.
2. **프리셋 데이터 (enum id + config)** — `MonsterProperty.targetPolicy?: TargetPolicyConfig` /
   `AllyProperty.targetPolicy?: TargetPolicyConfig` (`monstertypes.ts` / `allytypes.ts`).
   값은 `monsterdb.ts` / `allydb.ts` 에서 `{ id: TargetPolicyId.StructureFirst }` 처럼 **데이터로만** 지정.
   베이스가 `createTargetPolicy(config)` 팩토리로 인스턴스화.
3. **런타임 세터** — `ActorCombatController.setTargetPolicy(policyOrConfig: TargetSelectionPolicy | TargetPolicyConfig)`.
   런타임 코드는 인스턴스를 직접 넘겨도 되고 config 를 넘기면 팩토리 경유. 선택적 이벤트
   `EventTypes.SetActorTargetPolicy`(대상 필터 + config)로 게임스테이트가 방어전/공격전 진입 시
   일괄 주입 (`basecitycombat.ts`).

베이스 생성자:
`this.targetPolicy = property.targetPolicy ? createTargetPolicy(property.targetPolicy) : this.createDefaultTargetPolicy()`.
`createDefaultTargetPolicy()` 는 코드 경로이므로 인스턴스를 직접 반환(몬스터 = `ThreatAwareNearestPolicy`,
아군 = `NearestHostilePolicy`).
`findRegistryTarget()` 가 `TargetSelectionContext` 조립 → `this.targetPolicy.selectTarget(ctx)`.
`searchInterval`(500ms) 스로틀은 유지하되 `threatBook.hasNewSince(this.lastSelectAt)` 면
즉시 재선택 허용(스로틀 우회).

---

## 7. C. `ThreatBook` + 공격자 신원 배선

### 7.1 `actors/battle/threatbook.ts` (신규)

```ts
export interface ThreatEntry {
    targetId: string
    threat: number        // 누적 피해 기반, 지수 감쇠
    lastHitAt: number     // ms
}

export class ThreatBook {
    constructor(opts?: Partial<{ decayPerSec: number; maxAgeMs: number; maxEntries: number }>)
    record(attackerId: string, amount: number, now?: number): void
    decay(now?: number): void          // 지수 감쇠 + stale/미미(<0.5) 제거 + maxEntries 초과분 최저부터 제거
    list(now?: number): ThreatEntry[]  // threat desc 정렬 사본
    top(now?: number): ThreatEntry | undefined
    get(attackerId: string): ThreatEntry | undefined
    hasNewSince(ms: number): boolean
    clear(): void
}
```

기본값: `decayPerSec 0.25`, `maxAgeMs 8000`, `maxEntries 8`.

- 베이스 `ActorCombatController` 가 1개 소유. `update()` 마다 `decay()`, `resetForSpawn()` 에서 `clear()`.
- 아군도 소유하지만(비용 미미) `NearestHostilePolicy` 가 `ctx.threats` 를 안 읽어 무동작.

### 7.2 `AttackOption.attackerTargetId` 전용 필드 (신규)

`playertypes.ts:87-101` `AttackOption` 에 `attackerTargetId?: string` (등록 타겟 id) 추가.
공격을 **송신하는 쪽**이 자기 등록 id 를 채운다 — `obj` 의 의미가 송신자마다 다르고
`attackerObjectId` 는 uuid 라 조회 불가하기 때문(§2.5).

| 송신 지점 | `attackerTargetId` 채우는 법 |
| --- | --- |
| `AttackActorState.attack` / `rangedAttack` (`actorcombatstates.ts`) | `(this.spec.Owner as { TargetId?: string }).TargetId` |
| `dashmonst.ts` 공격 송신 | 동일 |
| `ProjectileCtrl.attack` / `doHitscanAttackOnce` / `getLineHit` (`projectilectrl.ts:255,292,~405`) | `this.targetRegistry.getByObject(this.creatorSpec?.Owner?.objs)?.id ?? (this.creatorSpec?.Owner as { TargetId?: string })?.TargetId` |
| 플레이어 근접/콤보 (`meleeattackst.ts`, `combomeleeattackst.ts`) | `this.player... ` 의 등록 id (플레이어는 `playerctrl.ts:399` 에서 `id: this.targetId` 로 등록) |

기존 근접 송신부의 `obj`/`spec`/`attackerObjectId` 는 그대로 두고 필드만 **추가**한다.

### 7.3 `actors/battle/combatattribution.ts` (신규)

```ts
export type AttackerRef = {
    attackerTargetId?: string    // §7.2, 최우선
    spec?: BaseSpec
    obj?: THREE.Object3D
    objectId?: string            // mesh uuid — 조회 불가, 로깅용
}

export function resolveAttackerId(
    attacker: AttackerRef | undefined,
    registry: { getByObject(o?: THREE.Object3D | null): { id: string } | undefined } | undefined,
    receiverId?: string,         // self 로 역참조되는 후보를 건너뛰기 위함
): string | undefined {
    // 후보를 순서대로 시도하되, receiverId 와 같은 값은 skip:
    // 1) attacker.attackerTargetId                       (송신자가 명시)
    // 2) attacker.spec?.Owner?.objs → registry.getByObject(...)?.id   (일관되게 owner, 투사체·터렛 포함)
    // 3) attacker.obj → registry.getByObject(...)?.id    (근접만 공격자, 투사체는 피격자이므로 receiverId 필터로 걸러짐)
    // 4) attacker.obj?.userData?.targetMeta?.id
    // 5) undefined
}
```

### 7.4 배선

- `IMonsterCtrl.ReceiveDemage` / `IAllyCtrl` 시그니처 말미에 옵셔널 인자:
  `ReceiveDemage(damage, effect?, attackRange?, knockbackDist?, attacker?: AttackerRef)`.
  (`monstertypes.ts` / `allytypes.ts` + `Monsters`/`Allies` 래퍼 + 베이스 구현.)
- `Monsters.ApplyAttack` (`monsters.ts:167-209`) / `Allies.ApplyAttack` (`allies.ts:203-245`):
  `ReceiveDemage(...)` 호출 시
  `{ attackerTargetId: opt.attackerTargetId, spec: opt.spec, obj: opt.obj, objectId: opt.attackerObjectId }` 전달.
- 베이스 `ReceiveDemage`: `const id = resolveAttackerId(attacker, this.targetRegistry, this.targetId);
  if (id && id !== this.targetId) this.threatBook.record(id, damage)`.

### 7.5 결과 흐름

```
터렛/적 캐릭터가 몬스터 공격
  → ProjectileCtrl/근접 Attack 이벤트 (attackerTargetId 채워짐, spec.Owner = 공격자)
  → Monsters.ApplyAttack → MonsterCtrl.ReceiveDemage(..., { attackerTargetId, spec, obj, objectId })
  → resolveAttackerId(_, _, receiverId=self) → 등록 id (터렛=구조물 id, 캐릭터=unit id)
  → threatBook.record(id, damage)
  → 다음 resolveTarget: ThreatAwareNearestPolicy step 4 가 위협 대상 반환 (마진 초과 시)
  → updateNavigation/findPath: 구조물이면 standoff 링, 유닛이면 위치 셀로 경로
  → 파괴/이탈 후 threatBook.decay 로 위협 소멸 → 스티키니스 풀리며 플레이어로 복귀
```

정책 교체(`NearestHostilePolicy`)만으로 전체 기능 on/off.

---

## 8. 신규 / 수정 파일

### 신규

| 파일 | 내용 |
| --- | --- |
| `src/gsdk/src/actors/battle/iactormodel.ts` | `IActorModel` |
| `src/gsdk/src/actors/battle/combatrange.ts` | `GetEffectiveAttackRange`, `ATTACK_EXIT_HYSTERESIS` |
| `src/gsdk/src/actors/battle/combatattribution.ts` | `resolveAttackerId`, `AttackerRef` |
| `src/gsdk/src/actors/battle/threatbook.ts` | `ThreatBook`, `ThreatEntry` |
| `src/gsdk/src/actors/battle/actortargetadapter.ts` | 통합 `ActorTargetAdapter` |
| `src/gsdk/src/actors/battle/actorcombatstates.ts` | 통합 FSM + `NewDefault*State` 래퍼 |
| `src/gsdk/src/actors/battle/actorcombatcontroller.ts` | abstract 베이스 |
| `src/gsdk/src/systems/targeting/targetselectionpolicy.ts` | 인터페이스 + `ITargetRegistryQuery` + `TargetPolicyId`/`TargetPolicyConfig` |
| `src/gsdk/src/systems/targeting/policies/targetpolicyfactory.ts` | `createTargetPolicy(config)` |
| `src/gsdk/src/systems/targeting/policies/nearesthostilepolicy.ts` | |
| `src/gsdk/src/systems/targeting/policies/threatawarenearestpolicy.ts` | |
| `src/gsdk/src/systems/targeting/policies/structurefirstpolicy.ts` | |
| `src/gsdk/src/systems/targeting/policies/compositetargetpolicy.ts` | |
| `src/gsdk/src/systems/targeting/policies/scoredtargetselectionpolicy.ts` | |

### 수정 (대표 경로)

| 파일 | 변경 |
| --- | --- |
| `src/gsdk/src/actors/monsters/monctrl.ts` | `extends ActorCombatController`, 훅 impl 만 남기고 축소 |
| `src/gsdk/src/actors/allies/allyctrl.ts` | 동일 |
| `src/gsdk/src/actors/monsters/zombie/monstate.ts` | `actorcombatstates.ts` 재노출 심 (`NewDefaultMonsterState` 유지) |
| `src/gsdk/src/actors/allies/ally/allystate.ts` | 동일 (`NewDefaultAllyState` 유지) |
| `src/gsdk/src/actors/monsters/zombie/dashmonst.ts` | 통합 `AttackActorState` 상속으로 전환 |
| `src/gsdk/src/actors/monsters/monsters.ts` / `src/gsdk/src/actors/allies/allies.ts` | `ApplyAttack` → `ReceiveDemage` 공격자(`attackerTargetId`/`spec`/`obj`) 전달 |
| `src/gsdk/src/actors/monsters/monstertypes.ts` / `src/gsdk/src/actors/allies/allytypes.ts` | `targetPolicy?: TargetPolicyConfig`, `ReceiveDemage` 시그니처 |
| `src/gsdk/src/actors/monsters/monsterdb.ts` / `src/gsdk/src/actors/allies/allydb.ts` | (선택) 프리셋별 `targetPolicy` (enum id + config) |
| `src/gsdk/src/actors/monsters/zombie.ts` / `src/gsdk/src/actors/allies/allymodel.ts` | `implements IActorModel` |
| `src/gsdk/src/types/playertypes.ts` | `AttackOption.attackerTargetId?: string` 추가 |
| `src/gsdk/src/actors/projectile/projectilectrl.ts` | Attack 송신 `v` 에 `attackerTargetId` 채움 (`attack`/`doHitscanAttackOnce`/`getLineHit`) |
| `src/gsdk/src/actors/player/states/meleeattackst.ts` / `combomeleeattackst.ts` | Attack 송신에 `attackerTargetId` 채움 |
| `src/gsdk/src/systems/targeting/targetregistrysystem.ts` | `defaultSelectionPolicy` 생성자 인자, `selectTarget()` 위임, `getDistanceToTarget()` public helper, `ITargetRegistryQuery` 충족 |
| `src/gsdk/src/types/globaltypes.ts` | (선택) `EventTypes.SetActorTargetPolicy` |
| `src/gamefab/playfab.ts` | (선택) 전역 기본 정책 지정 |
| `src/libgamestates/warstates/basecitycombat.ts` | (선택) 모드별 정책 일괄 주입 |

---

## 9. 구현 순서

각 단계 후 `cd src/gsdk && npx tsc --noEmit` + 루트 `npm run build`.

1. `iactormodel.ts` + `combatrange.ts` + `threatbook.ts` (순수 유닛, 의존 없음).
2. `actortargetadapter.ts` + `actorcombatstates.ts` — 기존 `monstate`/`allystate` 동작 1:1 재현,
   §2.1/§2.2 수정(A-1/A-3)만 반영. `[CombatDebug]` 로그를 변경 전후 대조.
3. `monstate.ts` / `allystate.ts` 를 심으로 축소, `dashmonst.ts` 전환, 빌드 통과.
4. `actorcombatcontroller.ts` 추출, `monctrl` / `allyctrl` 를 서브클래스로 축소.
   A-4 (LoS 게이트) + A-5 (`currentTargetReachable` 계약: `lastPathStatus`/`noPathStreak`) 반영. 빌드 통과.
5. `AttackOption.attackerTargetId` 필드 + 송신부(투사체/근접/플레이어) 채움 +
   `combatattribution.ts` (`resolveAttackerId(attacker, registry, receiverId)`).
6. `targetselectionpolicy.ts` (+ `TargetPolicyId`/`Config`) + `policies/*` + `targetpolicyfactory.ts` +
   레지스트리 `defaultSelectionPolicy` / `getDistanceToTarget()`.
7. `findRegistryTarget` 정책화 + `property.targetPolicy` (enum id+config) + `setTargetPolicy()` +
   `ReceiveDemage` 공격자 배선 + `ThreatBook` 연결.
8. (선택) 전역/모드별 주입, 프리셋 지정.

---

## 10. 검증 방법

1. **빌드** — `cd src/gsdk && npx tsc --noEmit` 수정 파일 오류 0
   (기존 tfjs/qr 미설치 16건은 무관), 루트 `npm run build` 성공.
2. **회귀 (베이스 추출)** — 도시 방어전(`playerdefensestate`) / 공격전(`rivalassaultstate`) 진입:
   - 몬스터·아군 스폰/이동/근접·원거리 교전이 변경 전과 동일. `dashmonst` 대시 공격 정상.
   - Crab / Builder / KittenMonk / ToadMage 이동 정상.
3. **A-1 / A-4** — 근접 액터가 목표 표면 ~3.5에서 멈춰 실제 타격
   (`[CombatDebug] AttackScheduled` `distance` == 실측, `ReceiveRejected` 소멸).
   원거리는 `projectileDef.range` 근처 발사. 건물 뒤 원거리 몬스터가 얼지 않고 우회.
4. **A-3** — 근접 타겟이 빠질 때 "허공 스윙 → 정지 → 튐" 없이 매끄럽게 Run 복귀.
5. **B + C (핵심 요청)** — 몬스터가 플레이어 추격 중 터렛 사거리 진입 → 터렛 사격 시작 →
   몬스터가 터렛으로 전환(마진 초과), 파괴 후 스티키니스 + 감쇠로 플레이어 복귀.
   적 캐릭터가 몬스터를 때려도 동일 전환.
   - **투사체 피격 threat 기록 확인**: 터렛 투사체 1발 맞은 직후 `threatBook.list()` 에 터렛 id 항목이
     생기는지 (`obj` 가 피격자여도 `attackerTargetId`/owner 경로로 해석돼야 함).
   - **도달 불가 전환 확인**: 벽으로 완전히 막힌 타겟을 겨냥한 몬스터가 `noPathStreak` 누적 후
     `currentTargetReachable=false` 로 위협/최근접 타겟으로 전환하는지.
6. **정책 3중 주입 스모크** — (a) 프리셋 `targetPolicy: { id: TargetPolicyId.StructureFirst }` → 구조물 우선,
   (b) `ctrl.setTargetPolicy({ id: ... })` / 인스턴스 런타임 교체 반영,
   (c) 레지스트리 기본값만으로 현행 동작 유지.
7. **아군 무회귀** — 아군은 `NearestHostilePolicy` 유지, 위협받아도 타겟 안 바뀜.
8. **`resolveAttackerId` 단위** — `attackerTargetId` 명시 / owner-spec 경로(투사체·터렛) /
   근접 `obj` 경로 각각 올바른 등록 id 반환. `obj` 가 피격자(self)인 투사체 케이스에서
   `receiverId` 필터로 self 가 아닌 owner id 를 돌려주는지. 미등록 케이스는 `undefined`.

---

## 11. 리스크와 완화

| 리스크 | 완화 |
| --- | --- |
| **FSM 병합이 최대 리스크** — 상태 전이/애니메이션 미묘한 차이 | `monstate`/`allystate` 를 호환 심으로 남기고 `NewDefault*State` 팩토리 시그니처 유지. 2단계에서 `[CombatDebug]` 로그를 변경 전후 대조 |
| `dashmonst.ts` 가 `AttackZState` 내부 멤버에 의존 | 통합 `AttackActorState` 의 protected 표면을 깨지지 않게 유지, 4단계 후 대시 공격 수동 검증 |
| **투사체/터렛 공격자 역참조** — `opt.obj` 가 피격자라 self 로 resolve → threat 미기록 | `AttackOption.attackerTargetId` 전용 필드 + `spec.Owner.objs` 우선 + `resolveAttackerId(_, _, receiverId)` 로 self 후보 skip (§7.2/§7.3) |
| **`currentTargetReachable` 미산출** — `resolveWaypoints` 가 `NoPath` 에 즉시 직선 fallback → sticky 해제 안 됨 | `lastPathStatus`/`noPathStreak`/`REACHABLE_NOPATH_THRESHOLD` 계약 명시, 직선 fallback 유지하되 카운터로 정책 전환 트리거 (§5.7) |
| 프리셋에 정책 인스턴스를 넣으면 데이터/코드 경계가 흐려짐 | `TargetPolicyId` enum + `TargetPolicyConfig` + `createTargetPolicy` 팩토리. 프리셋은 데이터만, 런타임 세터만 인스턴스 허용 (§6.2/§6.4) |
| `getTargetBounds` 가 공유 mutable `distanceBox` 반환 → 정책이 보관하면 깨짐 | `ITargetRegistryQuery` 에 bounds 노출 안 함. `getDistanceToTarget(): number` public helper 만 추가 (§6.1) |
| "additive" 과장 — 시그니처/생성자 변경 포함 | §1 문구 하향. 호환 진입점만 보장, 내부/일부 API 변경 명시 |
| 베이스 추출 중 `MonsterCtrl` 고유 게터/이벤트명(`"mon"+id`) 누락 | `idPrefix` 훅으로 일원화, 4단계에서 버프/이벤트 등록 해제까지 확인 |
