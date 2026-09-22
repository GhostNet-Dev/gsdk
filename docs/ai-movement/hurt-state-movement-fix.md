# 피격 시 이동 정지 수정 계획

> 관련 문서: [아군/몬스터 전투 컨트롤러 통일 설계](./ally-monster-combat-unification-design.md)

## 1. 문제

밀리 캐릭터(몬스터/아군)가 **원거리 공격(투사체, 터렛)을 받으면 Hurt 지속시간(hurt 클립 길이, 기본값 0.5초) 동안
타겟 추적이 멈추고, Hurt 종료 후에도 repath 지연으로 최대 0.35~0.5초 더 멈출 수 있다** (§1.3, §3.1.2).

현재 `HurtActorState` 가 `isNavigationSuspended()` 에 포함되어 있어,
**실제 넉백 여부와 무관하게** 피격 시 항상 Yuka 네비게이션을 정지시킨다.

### 1.1 흐름

```
ApplyAttack → ReceiveDemage → status.hit = true
    ↓ (다음 프레임)
CheckHit() → HurtActorState 진입
    ↓
isNavigationSuspended() = true
  → updateNavigation 이 early return (moveDirection = 0)
  → applyVehiclePosition 이 syncVehicleFromMesh() (Vehicle 고정)
    ↓ (hurtDuration = hurt 클립 길이, 기본값 0.5초)
HurtState 종료 → v = (0,0,0) 이므로 → IdleSt
    ↓ (repath 타이머 freeze 로 최대 0.35~0.5초 지연, §3.1.2)
IdleSt → CheckRun(v) → RunSt 복귀
```

### 1.2 원인

원거리 공격은 `attackRange=undefined`, `knockbackDist=undefined` 로 전달된다
(`monsters.ts:208-209`, `allies.ts:243-244`).

- `pendingAttackRange = 0`, `pendingKnockbackDist = 0`
- `BuildKnockbackVector(pos, pos, 0, 0)` → `attackRange ≤ 0` → `undefined` 반환
- 결과: **넉백 없음**. 그러나 `HurtActorState` 는 진입하고 navigation 을 Hurt 지속시간 동안 차단한다.

### 1.3 2차 문제 — HurtState 종료 후 Idle 낙하

`HurtActorState.Update` 종료 분기 (`actorcombatstates.ts:257-264`):

```ts
if (this.hurtTime >= this.hurtDuration) {
    this.Uninit()
    if (v.x || v.z) { ... RunSt }
    else             { ... IdleSt }   // navigation 이 정지되어 v=0 이라 항상 여기
}
```

navigation 이 정지된 Hurt 는 종료 시 `v = (0,0,0)` → 항상 `IdleSt` 로 낙하한다.
`IdleSt` 는 `v ≠ 0` 이 되어야 `RunSt` 로 복귀하는데, suspend 동안 repath 타이머가 얼어 있어 (§3.1.2)
타겟이 있어도 **1프레임이 아니라 최대 0.35~0.5초의 공백**이 발생한다.

### 1.4 주의점 — Hurt 중 추가 피격

현재 `HurtActorState.Update` 는 피격 동작 중 들어온 추가 `status.hit` 을 단순히 소모한다.

```ts
// 피격 동작 중에는 추가 피격 플래그를 계속 소모하여 무한 경직 방지
if (this.spec.Status.hit) {
    this.spec.Status.hit = false
}
```

따라서 **넉백 없는 원거리 Hurt 중 근접 피격을 받는 경우**,
새로 들어온 `pendingAttackRange` / `pendingKnockbackDist` 는 필드에 남을 수 있지만,
`status.hit` 플래그가 먼저 소모되어 `CheckHit()` 진입 조건이 사라진다.
즉 값이 즉시 clear 되는 것은 아니지만, 해당 피격의 넉백은 사실상 반영되지 않는다.
이후 새로운 `ReceiveDemage()` 가 들어오면 pending 값은 다시 덮어써진다.

`ReceiveDemage()` 는 hit 적용 여부와 무관하게 호출마다 pending 값을 덮어쓰므로, 오래된 pending 값이
이후의 다른 hit 에 재사용되는 일은 없다. 따라서 stale 상태로 소모해야 하는 것은 `status.hit` 뿐이고,
pending 값을 별도로 초기화할 필요는 없다 (변경 D-1 참조).

이번 수정의 기본 범위는 기존 정책을 유지한다.

- Hurt 중 추가 피격은 기존처럼 경직 시간을 갱신하지 않는다.
- 원거리 Hurt 중 근접 피격 넉백까지 반영하려면 별도 후속 수정이 필요하다.
- 단, 이 정책은 수동 검증 항목에 포함해 의도치 않은 체감 문제가 없는지 확인한다.

---

## 2. 수정 방침

> 넉백이 실제로 있을 때만 네비게이션을 정지시킨다. **판정 기준은 공격 유형이 아니라 넉백 유무다.**
> 넉백 없는 피격은 hurt 애니메이션을 재생하되 이동은 유지한다.

| 피격 | 넉백 | 네비게이션 | hurt 애니 |
|---|---|---|---|
| 원거리 (투사체/터렛 등 비-근접) | 항상 없음 (§2.3 불변식) | **유지** (이동 계속) | 재생 |
| 근접인데 밀림량이 0 (사거리 끝에서 맞은 경우 등) | 없음 | **유지** (기존에는 정지 → 의도된 변화) | 재생 |
| 근접이고 밀림량 > 0 | 있음 | **정지** (기존과 동일) | 재생 + 넉백 |

공격 유형과 넉백 유무는 연동되어 있다. 원거리 → 넉백 없음은 §2.3 이 보장하고, 근접은
`BuildKnockbackVector` 결과에 따라 넉백이 있을 수도 없을 수도 있다. 그래서 별도의 유형 플래그 없이
넉백 유무(`suspendsNavigation`)만으로 판정한다. 근접이어도 밀리지 않는 피격은 멈출 이유가 없으므로
이동을 유지하며, 이는 기존 동작과 다른 **의도된 변화**다 (§5.1 #2-1 에서 확인).

설계 원칙: **동작이 바뀌는 범위를 피격 관련 경로 — 피격 중 네비게이션, "피격 → 복귀", 대시 중 피격 반응(변경 D-1) — 로만 한정한다.**
일반 Run 의 zero-vector 처리, Attack/Jump 종료 후의 네비게이션 동작은 이번 수정에서 건드리지 않는다.

### 2.1 변경 요약 (파일별 체크리스트)

| 파일 | 변경 | 내용 |
|---|---|---|
| `actorcombatstates.ts` | A | `HurtActorState.suspendsNavigation` getter 추가 |
| | B | Hurt 종료 시 타겟이 있으면 `RunSt`(`HurtRecovery`) 로 복귀 |
| | B-1 | `ActorRunStartReason` / `ActorRunInitOptions` 타입 추가 |
| | B-2 | `RunActorState` 시간 기반 zero-vector grace, `HURT_RECOVERY_GRACE_SEC` 상수 추가 |
| | B-3 | `HasActorAttackTarget` 을 `export` 로 변경 (`dashmonst.ts` 에서 사용) |
| `actorcombatcontroller.ts` | C | `isNavigationSuspended` 에서 Hurt 조건을 `suspendsNavigation` 으로 분리 |
| | E | 넉백 Hurt 종료 시 repath 타이머 무효화 |
| `dashmonst.ts` | D | `DashRunState` 에 동일한 grace 반영 |
| | D-1 | `FastDashRunState` 에서 `CheckHit` 호출 삭제 (대시 중 Hurt 전환 안 함) + `status.hit` 직접 소모 |

> 변경 기호는 문서 내 상호 참조를 위해 유지한다 (E 는 컨트롤러 파일, D 는 dashmonst 파일에 속한다).

### 2.2 영향 범위

- `HurtActorState` / `isNavigationSuspended()` 는 몬스터(`MonsterCtrl`)와 아군(`AllyCtrl`) 이
  `ActorCombatController` 를 통해 공유한다. 두 유형 모두 동일하게 영향을 받는다.
- `isNavigationSuspended()` 를 override 하는 하위 클래스는 없다 (grep 확인).
- `BuildActorStateSet` 이 만든 `RunSt`(`RunActorState`) 를 교체하는 곳은 `dashmonst.ts` 의
  `DashRunState` 뿐이다. 그 외 몬스터/아군은 모두 `RunActorState` 를 사용하므로 변경 B-2 하나로 충분하다.
- `DashRunState` 는 Hurt 전환/복귀 경로에 포함되므로 `RunActorState` 와 같은 grace 처리가 필요하다.
- `DashRunState` 와 함께 쓰이는 `FastDashRunState` 는 **데미지는 받되 Hurt 상태로 전환하지 않는 대시 슈퍼아머 상태**로 한다.
  현재 `FastDashRunState.Update` 는 `CheckHit()` 을 호출해 피격 시 Hurt 로 전환하므로, 변경 D-1 에서 이 호출을 삭제한다
  (기존 동작 변경이며 의도된 결정이다). Hurt 로 전환되지 않으므로 Hurt 복귀 grace 적용 대상이 아니다.
  단, `CheckHit()` 이 소모하던 `status.hit` 은 직접 소모해, 대시 종료 후 오래된 hit 이 뒤늦게 Hurt 로 터지지 않도록 한다.
- `status.hit` 은 `basespec.ts:242` 에서 실제 피해가 적용되었을 때(`appliedAmount > 0`) 세팅된다.

### 2.3 불변식 — 원거리 피격은 넉백/네비게이션 정지를 유발하지 않는다

> **원거리(투사체/터렛/히트스캔 등 비-근접) 피격은 어떤 경우에도 넉백을 만들지 않으며,
> 따라서 `suspendsNavigation` 은 항상 `false` 여야 한다.**

넉백 Hurt 는 네비게이션을 정지시키고 `model.Pos` 를 직접 밀어낸다. 연사형 원거리 공격(터렛 등)에
넉백이 붙으면 유닛이 **밀려나기만 하고 영원히 타겟에 접근하지 못하는** 상태가 된다.
이 수정(변경 A/C)은 "넉백이 있을 때만 정지" 라는 조건에 의존하므로, 원거리에 넉백이 새어 들어오면
수정 효과가 통째로 무효화된다. 판정 기준은 넉백 유무이고(§2), 이 불변식이
"원거리 → 넉백 없음 → 이동 유지" 를 잇는 고리다.

**현재 보장 지점 (코드 변경 없음):**

| 위치 | 내용 |
|---|---|
| `monsters.ts:208-209` | `IsMeleeAttackType(opt.type)` 이 false 면 `attackRange`/`knockbackDist` 를 `undefined` 로 전달 |
| `allies.ts:243-244` | 동일 |
| `meleecombat.ts` `IsMeleeAttackType` | `NormalSwing`, `FullSwing` 만 true |
| `meleecombat.ts` `BuildKnockbackVector` | `explicitKbDist ≤ 0` 이고 `attackRange ≤ 0` 이면 `undefined` 반환 |
| `ReceiveDemage` | 호출마다 `pendingAttackRange`/`pendingKnockbackDist` 를 덮어쓰므로, 원거리 피격이 이전 근접 피격의 넉백 값을 이어받아 쓰지 않는다 |

**위험 지점:** 위 보장은 `BuildKnockbackVector` 가 아니라 **`monsters.ts` / `allies.ts` 두 곳의
`IsMeleeAttackType` 게이트** 에만 걸려 있다. `BuildKnockbackVector` 는 `attackRange > 0` 이기만 하면
넉백을 계산하므로, 다음 경우 원거리에 넉백이 새어 들어올 수 있다.

- `AttackType` 에 새 원거리/스킬 타입이 추가되었는데 게이트 판정(`IsMeleeAttackType`)이 갱신되지 않은 경우
- 두 파일 중 한쪽 게이트만 수정된 경우 (동일 로직이 복붙되어 있음)
- `ReceiveDemage` 를 게이트를 거치지 않고 `attackRange`/`knockbackDist` 와 함께 직접 호출하는 새 경로가 생긴 경우

**규칙 (구현/리뷰 시 준수):**

- 원거리 공격 경로는 `attackRange`/`knockbackDist` 를 절대 채우지 않는다.
- `ReceiveDemage` 에 `attackRange`/`knockbackDist` 를 넘기는 새 호출부를 추가할 때는 반드시
  `IsMeleeAttackType` 판정을 거친다.
- 이 수정이 `suspendsNavigation` 을 넉백 유무로 판정하는 이상, 원거리 경로에서 넉백 값이 0 임을
  §5.1 #13 / §5.2 #12 로 회귀 검증한다.

게이트 로직의 공용 함수화는 §6 의 후속 과제로 둔다.

---

## 3. 변경 파일 및 구체적 수정

### 3.1 `src/gsdk/src/actors/battle/actorcombatstates.ts`

#### 변경 A — `HurtActorState` 에 네비게이션 정지 여부 getter 추가

`maxPushDistance` 는 이미 `private` 필드로 존재 (`Init` 에서 설정). getter 만 노출한다.

이 값은 "현재 프레임에 실제로 밀리고 있는가" 가 아니라,
**이 Hurt 상태가 넉백을 동반하는 Hurt 로 시작했는가** 를 뜻한다.
충돌로 인해 실제 밀림이 조기 종료되어도 Hurt duration 동안은 기존처럼 navigation 을 정지한다.

의미를 명확히 하기 위해 `hasKnockback` 보다 `suspendsNavigation` 를 사용한다.

```ts
// HurtActorState 클래스 (hurtDuration 필드 선언 근처에 추가)
get suspendsNavigation(): boolean { return this.maxPushDistance > 0 }
```

`Uninit()` 이 `maxPushDistance` 를 0 으로 되돌리지만, `Uninit()` 은 상태 전환 직전에만 호출되고
전환 후에는 `currentState` 가 다른 상태이므로 컨트롤러가 이 getter 를 다시 읽지 않는다.
(한 프레임 안에서 호출 시점별 판정이 달라지는 부분은 변경 C 참조.)

#### 변경 B — HurtState 종료 시 타겟 존재 여부로 RunSt 복귀

기존:
```ts
if (this.hurtTime >= this.hurtDuration) {
    this.Uninit()
    if (v.x || v.z) {
        this.states.RunSt.Init()
        return this.states.RunSt
    }
    this.states.IdleSt.Init()
    return this.states.IdleSt
}
```

수정:
```ts
if (this.hurtTime >= this.hurtDuration) {
    this.Uninit()
    if (v.x || v.z || HasActorAttackTarget(target)) {
        const runInitOptions: ActorRunInitOptions = { reason: ActorRunStartReason.HurtRecovery }
        this.states.RunSt.Init(runInitOptions)
        return this.states.RunSt
    }
    this.states.IdleSt.Init()
    return this.states.IdleSt
}
```

`HasActorAttackTarget` 의 의미 (`actorcombatstates.ts:63`):

```ts
return (target as ActorAttackTarget | undefined)?.HasTarget !== false
```

- `ActorTargetAdapter.HasTarget` 은 `target != undefined || fallback != undefined` 이다.
  즉 **fallback 이 설정된 유닛은 레지스트리 타겟이 없어도 항상 true** 다.
  "타겟 상실 → Idle" 이 실제로 재현되는 것은 fallback 이 없는 유닛뿐이다 (검증 항목 7 참조).
- 컨트롤러도 `Health > 0 && targetAdapter.HasTarget` 일 때만 `updateNavigation` 을 호출하므로,
  이 조건은 "네비게이션이 동작할 수 있는 상태" 와 일치한다.

컨트롤러의 업데이트 순서는 다음과 같다.

```
applyVehiclePosition → updateNavigation → currentState.Update → applyStateNavigationMode
```

Hurt 종료 분기에서 `RunSt` 로 전환해도, 다음 프레임에 아직 `moveDirection = 0` 이면
`RunActorState.Update` 가 다시 `IdleSt` 로 떨어질 가능성이 있다 (상세 근거는 변경 B-2 참조).

다만 `RunActorState` 의 zero-vector 처리를 단순히 아래처럼 바꾸면 범위가 너무 넓다.

```ts
if (v.x == 0 && v.z == 0 && !HasActorAttackTarget(target)) {
    this.states.IdleSt.Init()
    return this.states.IdleSt
}
```

이렇게 하면 Hurt 복귀 직후뿐 아니라, 타겟은 있지만 경로가 없거나 네비게이션이 막혀
`moveDirection = 0` 이 되는 모든 일반 Run 상황에서도 계속 `RunSt` 에 남을 수 있다.
따라서 zero-vector 예외는 **HurtState 에서 RunSt 로 복귀한 직후의 짧은 grace** 로만 제한한다.

#### 변경 B-1 — Run 초기화 사유를 strict 타입으로 전달

`RunSt.Init()` 에 임의 boolean 을 넘기지 않고, 의미가 드러나는 enum 옵션을 사용한다.
(`IActorState.Init(param?: any)` 이므로 시그니처 충돌은 없다.)

```ts
export enum ActorRunStartReason {
    Normal = "normal",
    HurtRecovery = "hurt_recovery",
}

export type ActorRunInitOptions = {
    reason?: ActorRunStartReason
}
```

`HurtActorState.Update` 에서는 `RunSt` 복귀 시에만 `HurtRecovery` 를 전달한다.
일반 `IdleSt → RunSt`, `AttackSt → RunSt` 전환은 기존처럼 `Init()` 만 호출한다.

#### 변경 B-2 — `RunActorState` zero-vector grace 를 Hurt 복귀 직후로 제한 (시간 기반)

grace 는 **프레임 수가 아니라 시간(초)** 으로 관리한다. 프레임 수 기반은 프레임레이트/루프 호출 순서에
따라 필요한 프레임이 달라지고, 아래 §3.1.1 의 타임라인처럼 여유가 0 이 되기 때문이다.

```ts
/**
 * Hurt 복귀 직후 RunSt 가 moveDirection=0 을 받아도 IdleSt 로 떨어지지 않고 버티는 시간(초).
 * 경로 재계산(변경 E) + Yuka velocity 반영에 필요한 최대 2프레임을 저프레임(≈15fps)에서도 덮도록 0.15초로 둔다.
 */
export const HURT_RECOVERY_GRACE_SEC = 0.15

export class RunActorState extends ActorCombatState implements IActorState {
    private zeroVectorGraceTime = 0

    Init(options?: ActorRunInitOptions): void {
        this.model.ChangeAction(ActionType.Run)
        this.zeroVectorGraceTime =
            options?.reason === ActorRunStartReason.HurtRecovery ? HURT_RECOVERY_GRACE_SEC : 0
    }

    // ...

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        // CheckHit / CheckGravity / CheckDying / StandDown / CheckAttack 는 기존 순서 유지

        if (v.x == 0 && v.z == 0) {
            if (this.zeroVectorGraceTime > 0 && HasActorAttackTarget(target)) {
                this.zeroVectorGraceTime -= delta
                return this
            }
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        this.zeroVectorGraceTime = 0
        // 기존 Run 처리 계속
    }
}
```

동작 규칙:

- grace 는 **zero-vector 프레임에서만** 소모된다. 이동이 한 번이라도 재개되면(`v ≠ 0`) 즉시 0 으로 리셋되어
  이후 일반 Run 처럼 동작한다.
- grace 중 `CheckHit` / `CheckAttack` / `StandDown` 은 기존 순서대로 grace 검사보다 먼저 실행되므로,
  공격 사거리 진입·재피격·타겟 상실은 grace 와 무관하게 정상 처리된다.
- grace 중에는 이동 없이 Run 애니메이션만 재생된다 (최대 0.15초).
- `Init()` 에서 항상 값을 다시 세팅하므로, 일반 전환(`Normal`)에서는 grace 가 0 이다.

##### 3.1.1 왜 grace 가 필요한가 — 프레임 타임라인

`moveDirection` 은 `applyVehiclePosition` (프레임 시작) 에서 **Vehicle 속도로만** 채워진다.
`updateNavigation` 은 repath 를 하더라도 `moveDirection` 을 갱신하지 않는다.
또한 Yuka 는 `YukaEntityManager`(별도 `ILoop`) 에서 갱신되어 컨트롤러 호출 순서와 독립적이다.

`applyStateNavigationMode` (`actorcombatcontroller.ts:520-525`) 는 `isNavigationSuspended()` 가
`true` 인 동안 매 프레임 `followPathBehavior.active` 를 강제로 `false` 로 만들고 Vehicle 속도를 0 으로 동기화한다.

```ts
if (this.followPathBehavior) this.followPathBehavior.active = !suspended && this.followPathBehavior.active
```

넉백 Hurt 종료 후 (변경 E 적용 가정) 의 타임라인:

| 프레임 | 일어나는 일 | `RunSt.Update` 가 받는 `v` |
|---|---|---|
| N | Hurt 종료 → `RunSt` 전환. `applyStateNavigationMode` 가 suspend 해제 감지, repath 타이머 무효화 | (Hurt 가 받은 v=0) |
| N+1 | `applyVehiclePosition`: velocity=0 → `moveDirection=0`. `updateNavigation`: repath 실행, follow 활성화 | **0** |
| N+2 | Yuka 가 follow 를 반영해 velocity 갱신 → `moveDirection ≠ 0` | 비-zero |

즉 변경 E 를 적용해도 **최소 1프레임(N+1)은 v=0 이 들어온다.** grace 없이는 그 프레임에 `IdleSt` 로 낙하하고,
다음 프레임에 `CheckRun` 으로 되돌아오는 §1.3 의 문제가 형태만 바뀐 채 재발한다.
프레임 수 grace(1) 는 N+2 에서 Yuka 갱신이 정확히 한 번 반영된다는 가정에 의존하므로 여유가 없다.
시간 기반 grace 는 프레임레이트·루프 순서와 무관하게 이 지연을 흡수한다.

> ⚠️ 대시 몬스터(`dashmonst.ts`)는 `RunSt` 를 `RunActorState` 가 아닌 별도 클래스 `DashRunState` 로 교체해
> 사용한다. `DashRunState` 에도 동일한 zero-vector 패턴이 있으므로, 이 보완을 놓치면 대시 몬스터는
> 여전히 버그가 남는다. 자세한 내용은 §3.3 참조.

##### 3.1.2 grace 만으로는 부족한 이유 — repath 타이머 freeze

grace 가 필요한 이유와 별개로, **grace 시간 안에 이동이 재개되어야** 의미가 있다.
그런데 넉백 Hurt 복귀 직후에는 repath 가 지연될 수 있다 (`actorcombatcontroller.ts`).

```ts
private updateNavigation(delta: number, target: IPhysicsObject) {
    const vehicle = this.vehicle
    const follow = this.followPathBehavior
    if (!vehicle || !follow || this.isNavigationSuspended()) {
        this.moveDirection.set(0, 0, 0)
        return   // ← Hurt 동안 매 프레임 여기서 return, nextRepathElapsed 감소 안 됨
    }
    ...
    this.nextRepathElapsed -= delta
    ...
    const needsPath = !follow.active || forceRepath || this.nextRepathElapsed <= 0
    if (!needsPath || (!forceRepath && this.nextRepathElapsed > 0)) return
    ...
}
```

넉백 Hurt 동안 `isNavigationSuspended() = true` 이므로 `updateNavigation` 은 맨 위에서 즉시 return 하고,
`nextRepathElapsed -= delta` 줄에 도달하지 못한다. Hurt 시작 시점의 `nextRepathElapsed` 가 그대로 **얼어붙는다**
(리셋되는 게 아니다). Hurt 가 끝나 suspend 가 해제되면 이 타이머는 얼어있던 값에서 다시 감소하기 시작하고,
값이 아직 0 보다 크면 `needsPath = true` (follow 가 비활성이므로) 임에도
`(!forceRepath && nextRepathElapsed > 0)` 조건 때문에 repath 없이 return 한다.
`followPathBehavior.active` 도 계속 false 로 남아 Vehicle 이 움직이지 않는다.

최악의 경우(Hurt 직전에 repath 가 갱신되어 타이머가 가득 찬 경우) 최대
`repathInterval + repathJitter` (0.35~0.5초) 동안 `moveDirection = 0` 이 유지되어,
0.15초 grace 로도 부족하다. **따라서 grace(B-2) 와 repath 타이머 무효화(변경 E) 는 반드시 함께 적용한다.**
E 가 "이동 재개까지의 지연" 을 수 프레임으로 줄이고, B-2 가 그 수 프레임 동안 Idle 낙하를 막는다.

넉백 없는 Hurt 자체는 이 freeze 를 만들지 않는다. `suspendsNavigation = false` 라 Hurt 동안
`isNavigationSuspended()` 가 true 가 되지 않으므로 `nextRepathElapsed` 가 계속 정상적으로 흐른다.

단, **Attack/Jump 중에 넉백 없는 Hurt 로 진입한 경우**는 예외다. 그 상태에서 이미 타이머가 얼어 있고
`followPathBehavior.active` 도 false 이므로, Hurt 진입으로 suspend 가 풀려도 얼어 있던 값에서부터 감소해
이동 재개가 최대 0.35~0.5초 지연될 수 있다. 이는 §6 의 "Attack/Jump 종료 후 이동 재개 지연" 과 같은 원인이며
이번 범위에서는 다루지 않는다 (§5.1 #14 에서 발생 빈도만 확인).

#### 변경 B-3 — `HasActorAttackTarget` export

`HasActorAttackTarget` 은 현재 `actorcombatstates.ts` 내부의 비-export 함수(라인 63)다.
`dashmonst.ts` (변경 D) 에서 사용하므로 `export function HasActorAttackTarget(...)` 로 노출한다.

---

### 3.2 `src/gsdk/src/actors/battle/actorcombatcontroller.ts`

#### 변경 C — `isNavigationSuspended` 에서 HurtState 조건 분리

기존 (`라인 528-534`):
```ts
protected isNavigationSuspended(): boolean {
    return this.currentState instanceof AttackActorState
        || this.currentState instanceof JumpActorState
        || this.currentState instanceof HurtActorState   // 항상 정지
        || this.currentState instanceof DyingActorState
        || this.Spec.Health <= 0
}
```

수정:
```ts
protected isNavigationSuspended(): boolean {
    if (this.currentState instanceof HurtActorState) {
        return this.currentState.suspendsNavigation   // 넉백 Hurt 일 때만 정지
    }
    return this.currentState instanceof AttackActorState
        || this.currentState instanceof JumpActorState
        || this.currentState instanceof DyingActorState
        || this.Spec.Health <= 0
}
```

`isNavigationSuspended()` 는 한 프레임에 3회 호출된다 (`applyVehiclePosition`, `updateNavigation`,
`applyStateNavigationMode`). `currentState.Update` 는 앞의 두 호출 뒤, 마지막 호출 앞에서 상태를 바꿀 수 있으므로
**상태 전환 프레임에서는 앞의 두 호출은 전환 전 상태로, 마지막 호출은 전환 후 상태로 판정한다.**
(§3.1.1 타임라인의 N 행이 이 전제다.)

- 진입 프레임 (`CheckHit` 으로 Hurt 진입): `Init` 이 `maxPushDistance` 를 설정한 뒤 마지막 호출이 실행된다.
  앞의 두 호출은 이전 상태(예: Run) 기준이라 정상 이동하고, 넉백 Hurt 라면 마지막 호출이 Vehicle 을 mesh 위치로 동기화한다.
- 종료 프레임: 앞의 두 호출은 Hurt(넉백이면 suspended) 기준이라 `v = 0` 이 되고, 마지막 호출이 전환 후 상태로 판정한다.

이는 기존 Attack/Jump 전환과 동일한 구조이며, 이번 수정으로 새로 생기는 어긋남이 아니다.

#### 변경 E — 넉백 Hurt 종료 시 repath 타이머 즉시 무효화

§3.1.2 에서 설명한 대로, suspend 가 걸려 있던 동안 `nextRepathElapsed` 가 얼어붙어 이동 재개가
최대 0.35~0.5초 지연될 수 있다. 넉백 Hurt 가 끝나는 프레임에 타이머를 무효화해 다음 `updateNavigation` 에서
즉시 repath 가 일어나도록 한다.

**범위는 "넉백 Hurt 종료" 로만 한정한다.** 처음에는 `isNavigationSuspended()` 의 `true → false` 전환 전체
(Attack/Jump/Dying 종료 포함) 에 적용하는 안이 있었으나, 다음 이유로 채택하지 않는다.

- 공격 사이클(Attack → Run)마다 강제 repath 가 발생해, 다수 몬스터가 동시에 공격할 때 경로 계산
  비용이 늘어난다.
- B-2 의 "일반 Run/일반 전환의 동작은 바꾸지 않는다" 원칙과 어긋난다.
- Attack/Jump 종료 후 이동 재개 지연은 이번 버그의 범위가 아니다 (후속 과제, §6).

```ts
// 필드 추가 (nextRepathElapsed 선언 근처)
private wasKnockbackHurt = false

private applyStateNavigationMode() {
    const suspended = this.isNavigationSuspended()

    const inKnockbackHurt = this.currentState instanceof HurtActorState
        && this.currentState.suspendsNavigation
    if (this.wasKnockbackHurt && !inKnockbackHurt) {
        // 넉백 Hurt 종료 프레임: 얼어있던 repath 타이머를 무효화해 다음 updateNavigation 에서
        // 즉시 재경로 탐색이 일어나도록 한다.
        this.nextRepathElapsed = 0
    }
    this.wasKnockbackHurt = inKnockbackHurt

    if (this.followPathBehavior) this.followPathBehavior.active = !suspended && this.followPathBehavior.active
    if (this.separationBehavior) this.separationBehavior.active = !suspended
    if (suspended) this.syncVehicleFromMesh()
}
```

`nextRepathElapsed = 0` 이 되면 다음 `updateNavigation` 호출에서 `needsPath` 판정과
`if (!needsPath || (!forceRepath && this.nextRepathElapsed > 0)) return` 가드를 모두 통과해
repath 가 즉시 실행되고 `followPathBehavior.active` 가 다시 켜진다.
Vehicle 이 속도를 갖는 것은 그다음 프레임이므로(§3.1.1 타임라인) 변경 B-2 의 grace 는 그대로 필요하다.
E 는 grace 를 대체하는 것이 아니라, grace 가 실제로 유효한 범위(수 프레임 이내) 안에 들어오도록 만드는
전제 조건이다.

엣지 케이스:

- 넉백 Hurt → Dying 전환: 타이머가 0 이 되지만 Dying 은 suspend 상태이고 `Spec.Health <= 0` 이므로 영향 없다.
- 넉백 Hurt 재진입(Hurt 종료 직후 곧바로 재피격): `wasKnockbackHurt` 가 다시 true 가 되므로 정상 동작한다.
- `Reset()` (`actorcombatcontroller.ts:245` 부근) 으로 상태가 초기화되는 경우: `wasKnockbackHurt` 도
  `false` 로 함께 초기화한다.

---

### 3.3 `src/gsdk/src/actors/monsters/zombie/dashmonst.ts`

#### 변경 D — `DashRunState` 에도 Hurt 복귀 grace 반영

`NewDashMonsterState` 는 공용 `HurtSt` 는 그대로 재사용하면서 `RunSt` 만
`DashRunState` 로 교체한다 (`defSt["RunSt"] = new DashRunState(...)`, 라인 39).
따라서 대시 몬스터가 넉백을 동반한 근접 Hurt 를 마치면, `HurtActorState.Update` 가 호출하는
`this.states.RunSt.Init(runInitOptions)` 은 실제로 `DashRunState.Init(runInitOptions)` 이다.

`DashRunState.Update` 도 `RunActorState` 와 동일한 zero-vector 패턴을 갖고 있으므로,
변경 B-2 와 같은 시간 기반 grace 를 반영한다. 여기서도 단순히
`v == 0 && !HasActorAttackTarget(target)` 조건으로 바꾸면 일반 대시 Run 상황의 의미까지 바뀌므로 피한다.

```ts
export class DashRunState extends ActorCombatState implements IActorState {
    private zeroVectorGraceTime = 0

    Init(options?: ActorRunInitOptions): void {
        this.model.ChangeAction(ActionType.Run)
        this.zeroVectorGraceTime =
            options?.reason === ActorRunStartReason.HurtRecovery ? HURT_RECOVERY_GRACE_SEC : 0
    }

    // ...

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        // CheckHit / CheckGravity / CheckDying 는 기존 순서 유지

        if (v.x == 0 && v.z == 0) {
            if (this.zeroVectorGraceTime > 0 && HasActorAttackTarget(target)) {
                this.zeroVectorGraceTime -= delta
                return this
            }
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        this.zeroVectorGraceTime = 0
        // 기존 DashRun 처리 계속
    }
}
```

`dashmonst.ts` 에서 `HasActorAttackTarget`(변경 B-3), `ActorRunInitOptions`, `ActorRunStartReason`,
`HURT_RECOVERY_GRACE_SEC` 를 `@Glibs/actors/battle/actorcombatstates` 에서 import 한다.

참고: `DashRunState` 는 Vehicle 이동과 별개로 `model.Pos` 를 직접 이동시키는 코드도 갖고 있다
(`CheckDirection` 기반). 이번 수정 범위는 아니지만, Hurt 종료 후 `DashRunState` 로 복귀하는 구간 및
일반 DashRun 이동에서 Vehicle 이동과 직접 이동이 겹쳐 속도가 튀지 않는지 함께 확인한다.

#### 변경 D-1 — `FastDashRunState` 에서 `CheckHit` 삭제 (대시 중 Hurt 무시)

**결정:** `FastDashRunState` 는 대시 중 피격되어도 대시를 끊지 않고 **데미지만 받는 상태**로 한다.
데미지는 `ReceiveDemage` 에서 이미 적용되므로, 이 상태에서 `HurtSt` 로 전환하지 않으면 된다.

현재 `FastDashRunState.Update` 는 첫 줄에서 `CheckHit(target)` 을 호출한다 (`dashmonst.ts:166`).
이 호출은 단순 플래그 확인이 아니라 `states.HurtSt.Init(...)` 후 `HurtSt` 로 전환하는 동작이므로
**호출을 삭제**한다. 이는 기존 동작 변경이다 (대시 중 피격 시 대시가 끊기고 Hurt 로 전환되던 것이 사라진다).

호출만 삭제하면 `status.hit` 이 true 로 남아, 대시가 끝난 뒤 다음 상태(`AttackSt` / `DashAgonizingSt` /
`IdleSt` / `RunSt`)의 `CheckHit` 이 오래된 hit 으로 뒤늦게 Hurt 를 일으킨다. 따라서 삭제와 함께
`status.hit` 을 직접 소모한다.

```ts
Update(delta: number, _: THREE.Vector3, target: IPhysicsObject): IActorState {
    // 대시 중에는 피격으로 Hurt 전환하지 않는다. 데미지는 ReceiveDemage 에서 이미 적용됨.
    // 남겨두면 대시 종료 후 다음 상태의 CheckHit 이 뒤늦게 Hurt 를 일으키므로 여기서 소모한다.
    this.spec.Status.hit = false

    const dist = this.GetTargetDistance(target)
    // ... 이하 기존 그대로 (CheckAttack, 대시 시간 검사, 이동 처리)
}
```

- `pendingAttackRange` / `pendingKnockbackDist` 는 소모하지 않아도 된다. `ReceiveDemage` 가 호출마다 덮어쓰므로
  이후 hit 에 재사용되지 않는다 (§1.4).
- `FastDashRunState` 는 Hurt 로 전환되지 않으므로 Hurt 복귀 grace(변경 B-2 / D)의 대상이 아니다.
- `DashAgonizingState`(대시 후 5초 스턴)의 `CheckHit` 은 이번 범위에서 유지한다. 스턴 중 피격으로 Hurt 전환되는
  기존 동작은 바꾸지 않는다.
- 이 변경은 §2 설계 원칙에서 명시적으로 허용한 예외(대시 중 피격 반응)다.

---

## 4. 동작 원리 (수정 후)

### 넉백 없는 피격 (원거리 전부 + 밀림량 0 인 근접)

- `suspendsNavigation = false` → `isNavigationSuspended() = false`
- `applyVehiclePosition` 정상 실행 → Vehicle 이 타겟 방향으로 이동
- `updateNavigation` 정상 실행 → `moveDirection` 이 방향 벡터 유지
- 종료 시 `RunSt` 로 복귀 (`HurtRecovery`):
  - 이동 중이면 `v ≠ 0` → 즉시 Run 처리
  - **공격 사거리 안이라 `updateNavigation` 이 `moveDirection = 0` 으로 만든 경우**에도
    `HasActorAttackTarget` 로 `RunSt` 에 진입하고, `CheckAttack` 이 바로 공격으로 전환한다.
    (기존에는 `IdleSt` 로 낙하했다. `IdleSt` 는 `CheckAttack` 을 하지 않고 `v ≠ 0` 이 될 때만 Run 으로 복귀하는데,
    `0.92 × 사거리` 이내에서는 `updateNavigation` 이 `v = 0` 을 유지하므로 공격 전환이 지연되거나 막힐 수 있었다.)
- 결과: **hurt 애니메이션 재생 + 이동 유지**

넉백 없는 Hurt 중 알려진 특성 (이번 범위에서 허용, §5 에서 체감 확인):

- **연속 피격**: 터렛 연사처럼 Hurt 지속시간보다 짧은 간격으로 맞으면 Hurt 종료 직후 `RunSt` 의
  `CheckHit` 이 곧바로 Hurt 를 다시 시작한다. 이동은 유지되지만 hurt 애니가 계속 재시작되어 Run 애니가
  거의 보이지 않을 수 있다 (시각적 스턴락처럼 보임).
- **몸 방향**: `HurtActorState` 는 `v` 로 mesh 회전을 하지 않는다. Hurt 중 Vehicle 이 경로를 따라 꺾여도
  몸은 피격 직전 방향을 유지한다.
- **중력 체크**: `HurtActorState` 는 `CheckGravity` 를 호출하지 않는다. 이동 중 지형 낙차가 있어도
  `JumpSt` 전환은 Hurt 종료 후로 미뤄진다 (`applyVehiclePosition` 이 navGrid 높이로 y 를 맞추므로 위험은 낮음).
- **Attack/Jump 중 진입**: 이미 얼어 있던 repath 타이머가 남아 이동 재개가 지연될 수 있다 (§3.1.2, §6).
- **근접인데 밀림량 0**: 위와 같이 처리된다. 기존에는 멈췄으나 이번 수정으로 이동이 유지된다 (§2).

### 넉백 있는 피격 (근접, 밀림량 > 0)

- `suspendsNavigation = true` → `isNavigationSuspended() = true` (기존과 동일)
- Vehicle 고정, `moveDirection = 0`
- `HurtActorState.Update` 가 `model.Pos` 에 직접 넉백 이동 적용
- 종료 시 `v = 0` 이지만 `HasActorAttackTarget(target) = true` → `HurtRecovery` 사유로 즉시 `RunSt`
- 같은 프레임 `applyStateNavigationMode` 가 넉백 Hurt 종료를 감지해 `nextRepathElapsed = 0` 으로
  무효화 (변경 E) → 다음 프레임 즉시 repath, `followPathBehavior` 재활성화
- 그 프레임(N+1)과 그 직후 `moveDirection = 0` 이 들어와도 **`HURT_RECOVERY_GRACE_SEC` (0.15초)** 동안
  `IdleSt` 재낙하를 방지. Yuka 가 velocity 를 반영해 `v ≠ 0` 이 되면 grace 는 리셋된다.
- 결과: **넉백 + hurt 애니메이션 + 타겟으로 즉시 복귀**
- 대시 몬스터는 이때 `RunSt` 가 `DashRunState` 로 교체되어 있으므로, §3.3 의 변경 D 를
  함께 적용해야 동일한 결과를 얻는다. 적용하지 않으면 대시 몬스터만 Idle 재낙하가 재발한다.

### Hurt 중 추가 피격

- 기존처럼 `status.hit` 만 소모한다.
- 추가 피격으로 Hurt duration 을 늘리거나 넉백을 덮어쓰지 않는다.
- 원거리 Hurt 중 근접 피격이 체감상 반드시 넉백되어야 한다면 후속 설계에서 별도 처리한다.

---

## 5. 검증

```bash
cd src/gsdk && npx tsc --noEmit    # 타입 오류 0 확인 (gsdk 기준)
cd src/gsdk && npm run build        # gsdk 빌드 성공 확인
npm run build                       # (루트) 게임 빌드. bundle.js 가 갱신되므로 커밋 범위에 주의
```

### 5.1 수동 확인

1. **원거리 피격** — 터렛 사격 또는 투사체에 맞은 몬스터/아군이 hurt 애니메이션을 재생하면서 타겟 방향 이동을 유지하는지
2. **근접 피격** — 플레이어 근접 공격에 맞아 넉백이 발생한 몬스터가 짧게 멈추며 넉백되는 기존 동작 유지 여부
   2-1. **밀림량 0 인 근접 피격** — 사거리 끝에서 맞아 `BuildKnockbackVector` 가 `undefined` 를 반환하는 경우,
        hurt 애니만 재생되고 이동이 유지되는지 (기존에는 정지하던 것이 바뀌는 의도된 변화)
3. **넉백 종료 후 복귀** — 넉백이 있는 경우 HurtState 종료 시 Idle 경유 없이 바로 타겟을 향해 Run 으로 전환하는지
4. **Hurt 복귀 grace** — HurtState 가 RunSt 로 전환된 직후 `moveDirection = 0` 이 들어와도
   `HURT_RECOVERY_GRACE_SEC` 이내에는 IdleSt 로 재낙하하지 않는지. 프레임레이트를 낮춘 상태(예: 15~30fps)에서도 확인한다.
   4-1. **repath 재개 지연** (변경 E) — 넉백이 있는 근접 Hurt 복귀 직후 실제로 이동이 재개되기까지의
        시간/프레임 수를 측정한다. 변경 E 적용 전에는 최악의 경우 수백 ms (최대 `repathInterval + jitter`) 까지
        걸릴 수 있었던 것이 적용 후 수 프레임(grace 이내)으로 줄어드는지 비교한다. 측정 방법은 §5.3 참조.
        **수정 전 코드에서 baseline 을 먼저 측정한다** (§1.3 에서 정정한 대로, 실제 공백이 1프레임이 아닌지 확인).
5. **일반 Run zero-vector 유지** — Hurt 복귀가 아닌 일반 Run 상태에서 경로 실패 등으로 `moveDirection = 0` 이면 기존처럼 IdleSt 로 전환되는지
6. **Hurt 중 추가 피격** — 원거리 Hurt 중 근접 피격을 받아도 기존 정책대로 추가 경직/넉백 없이 진행되는지, 체감상 문제가 없는지
7. **타겟 상실** — Hurt 종료 시점에 타겟이 사라진 경우 IdleSt 로 자연스럽게 전환되는지.
   단, fallback 이 설정된 유닛은 `HasTarget` 이 항상 true 이므로 이 검증은 **fallback 이 없는 유닛**으로 수행한다.
   fallback 유닛은 "타겟 없음에서도 RunSt 에 머무르지 않는지(경로 없음 → grace 소진 후 Idle)" 를 대신 확인한다.
8. **대시 몬스터 (`dashmonst.ts`)** — 위 1~5 번을 대시 몬스터 대상으로 별도 반복 확인. `RunSt` 가
   `DashRunState` 로 교체되어 있어 §3.1/§3.3 변경이 모두 반영되지 않으면 재낙하가 재발할 수 있다.
   Hurt 종료 후 `DashRunState` 로 복귀하는 구간 및 일반 DashRun 이동에서 직접 이동과 Vehicle 이동이 겹쳐
   속도가 튀지 않는지도 본다.
   8-1. **FastDashRunState Hurt 무시** (변경 D-1) — 대시 중 피격 시 데미지는 적용되지만 Hurt 상태로 전환되지 않고,
        대시 종료 후 오래된 `status.hit` 때문에 뒤늦게 Hurt 로 전환되지 않는지 확인한다.
9. **공격 사거리 안 원거리 피격** — 타겟이 공격 사거리 안에 있을 때 원거리 피격을 받으면
   Hurt 종료 후 Idle 을 거치지 않고 바로 Attack 으로 전환되는지
10. **연속 원거리 피격** — 터렛 연사처럼 Hurt 지속시간보다 짧은 간격으로 계속 맞을 때
    이동이 유지되는지, hurt 애니 재시작이 시각적으로 과도하지 않은지 (§4 "연속 피격")
11. **Hurt 중 이동 부작용** — 원거리 Hurt 중 몸 방향(회전 미갱신)과 지형 낙차 구간에서 이상 동작이 없는지
12. **공격 사이클 회귀** — 변경 E 를 넉백 Hurt 로 한정했으므로, Attack → Run 전환 시 repath 빈도가
    수정 전과 동일한지 (강제 repath 가 늘지 않았는지)
13. **원거리 넉백 차단 (§2.3 불변식)** — 터렛/투사체/히트스캔/원거리 몬스터·아군 공격으로 피격된 뒤
    `pendingAttackRange`/`pendingKnockbackDist` 가 0 이고, 위치가 밀리지 않으며, Hurt 중에도
    `suspendsNavigation === false` 로 이동이 유지되는지. 연사 상태에서도 타겟과의 거리가 줄어드는지
    (밀려나기만 하며 접근하지 못하는 현상이 없는지) 확인한다. 몬스터/아군 양쪽, 원거리 타입별로 반복한다.
14. **Attack/Jump 중 넉백 없는 Hurt 진입** (§3.1.2) — 공격 중 원거리 피격 후 이동 재개까지의 지연이
    체감될 정도인지 §5.3 방식으로 측정해 기록한다 (이번 범위에서는 수정하지 않고, §6 후속 과제 판단 자료로 쓴다).

### 5.2 자동 테스트 (테스트 인프라 도입 시)

현재 저장소에는 jest 등 테스트 하네스가 구성되어 있지 않아 (`jest.config.*` 없음)
아래 항목을 실행하려면 테스트 인프라 도입이 선행되어야 한다. 도입한다면 다음 조합을 우선한다.

1. `HurtActorState.Init(undefined)` 후 `suspendsNavigation === false`
2. `HurtActorState.Init(knockbackVector)` 후 `suspendsNavigation === true`
3. `isNavigationSuspended()` 가 넉백 없는 Hurt 에서는 `false`, 넉백 Hurt 에서는 `true`
4. 타겟이 있는 Hurt 종료 분기에서 `RunSt` 선택 및 `ActorRunStartReason.HurtRecovery` 전달 (`RunActorState`, `DashRunState` 양쪽)
5. 타겟이 없는 Hurt 종료 분기에서 `IdleSt` 선택
6. `RunActorState`/`DashRunState` 가 `HurtRecovery` 로 Init 된 직후, zero-vector 프레임의 누적 `delta` 가
   `HURT_RECOVERY_GRACE_SEC` 미만인 동안은 `IdleSt` 로 떨어지지 않고, 초과하면 `IdleSt` 로 떨어지는지
7. grace 중 `v ≠ 0` 프레임이 한 번 들어오면 grace 가 0 으로 리셋되고, 이후 zero-vector 는 즉시 `IdleSt` 로 떨어지는지
8. grace 중 `HasActorAttackTarget` 이 false 가 되면 즉시 `IdleSt` 로 떨어지는지
9. `RunActorState`/`DashRunState` 가 일반 `Init()` 상태에서 zero-vector 를 받으면 기존처럼 `IdleSt` 로 떨어지는지
10. (변경 E) 넉백 Hurt → 다른 상태 전환 프레임에 `nextRepathElapsed` 가 0 으로 무효화되는지,
    그리고 넉백 없는 Hurt, Attack/Jump 종료, 넉백 Hurt 유지 중에는 무효화되지 않는지
11. `FastDashRunState` 에서 hit 이 들어오면 데미지 적용 후 `HurtSt` 로 전환하지 않고,
    `status.hit` 이 소모되어 다음 상태에서 stale Hurt 가 발생하지 않는지
12. (§2.3 불변식) 비-근접 `AttackType` 으로 `Attack` 이벤트를 받으면 `ReceiveDemage` 에
    `attackRange`/`knockbackDist` 가 `undefined` 로 전달되고, 이후 `CheckHit` 이 만든 Hurt 의
    `suspendsNavigation` 이 `false` 인지. 근접 피격 직후 원거리 피격이 들어와도 이전 근접 넉백 값이
    남지 않는지 (`pending*` 덮어쓰기)

### 5.3 이동 재개 지연 측정 방법 (항목 4-1)

하네스 없이 확인할 수 있도록, 임시 로그를 컨트롤러에 넣어 측정하고 확인 후 제거한다 (커밋하지 않는다).
기존 `verboseTargetLogs` / `[CombatDebug]` 로그 체계와 같은 형식을 사용한다.

- 넉백 Hurt 종료 프레임(`wasKnockbackHurt` true → false) 에 시각(`performance.now()`)과 프레임 카운터를 기록
- 이후 처음 `moveDirection ≠ 0` 이 되는 프레임에서 경과 시간/프레임 수를 출력
- 같은 구간에서 `RunSt` → `IdleSt` 낙하가 있었는지 함께 출력

기대값: 경과 프레임 ≤ 2 (변경 E 적용), grace(0.15초) 이내, Idle 낙하 없음.

---

## 6. 범위 밖 / 후속 과제

이번 수정에서 의도적으로 다루지 않으며, 필요하면 별도 설계로 분리한다.

- **Hurt 중 추가 피격 정책** (§1.4): 원거리 Hurt 중 근접 피격의 넉백 반영, 경직 시간 갱신
- **Attack/Jump 종료 후 이동 재개 지연**: 동일한 repath 타이머 freeze 가 Attack/Jump 종료 → Run 에서도
  발생할 수 있으나, 공격 사이클마다 강제 repath 하는 비용 문제가 있어 이번에는 넉백 Hurt 로 한정했다.
  필요하면 repath 호출 빈도를 측정한 뒤 별도로 적용한다. Attack/Jump 중 넉백 없는 Hurt 로 진입하는 경우(§3.1.2)도
  같은 원인이다. 대안으로 suspend 중에도 `nextRepathElapsed` 를 계속 감소시키는 방식(강제 repath 없이 정상 주기 유지)을
  함께 검토할 수 있다.
- **원거리 넉백 게이트 공용화** (§2.3): `monsters.ts` / `allies.ts` 에 복붙된
  `IsMeleeAttackType(opt.type) ? … : undefined` 두 줄을 공용 함수(예: 근접 피격 인자 빌더)로 추출해
  게이트를 한 곳에서 관리한다. 이번 수정은 동작 변경이 없으므로 규칙 문서화와 검증만 하고, 리팩터링은 분리한다.
- **넉백 방향 계산**: `CheckHit` 은 넉백 방향을 `target.Pos`(현재 추적 타겟)로 계산하므로,
  현재 타겟이 아닌 대상에게 맞은 경우 방향이 실제 공격자와 다를 수 있다 (기존 동작).
- **원거리 Hurt 중 몸 방향/중력 체크**: 문제가 확인되면 `HurtActorState` 에서 처리한다 (§4).
