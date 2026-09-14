# 피격 시 이동 정지 수정 계획

> 관련 문서: [아군/몬스터 전투 컨트롤러 통일 설계](./ally-monster-combat-unification-design.md)

## 1. 문제

밀리 캐릭터(몬스터/아군)가 **원거리 공격(투사체, 터렛)을 받으면 0.5초간 타겟 추적이 멈춘다.**

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
    ↓ (hurtDuration = 0.5초)
HurtState 종료 → v = (0,0,0) 이므로 → IdleSt
    ↓ (1프레임 후)
IdleSt → CheckRun(v) → RunSt 복귀
```

### 1.2 원인

원거리 공격은 `attackRange=undefined`, `knockbackDist=undefined` 로 전달된다
(`monsters.ts:208-209`, `allies.ts:243-244`).

- `pendingAttackRange = 0`, `pendingKnockbackDist = 0`
- `BuildKnockbackVector(pos, pos, 0, 0)` → `attackRange ≤ 0` → `undefined` 반환
- 결과: **넉백 없음**. 그러나 `HurtActorState` 는 진입하고 navigation 을 0.5초 차단한다.

### 1.3 2차 문제 — HurtState 종료 후 Idle 낙하

`HurtActorState.Update` 종료 분기 (`actorcombatstates.ts:257-264`):

```ts
if (this.hurtTime >= this.hurtDuration) {
    this.Uninit()
    if (v.x || v.z) { ... RunSt }
    else             { ... IdleSt }   // 넉백 있을 때 v=0 이라 항상 여기
}
```

넉백이 있어 navigation 이 정지된 경우 `v = (0,0,0)` → 항상 `IdleSt` 로 낙하 →
다음 프레임에야 `RunSt` 복귀. 타겟이 있어도 1프레임 공백이 발생한다.

---

## 2. 수정 방침

> 넉백이 실제로 있을 때만 네비게이션을 정지시킨다.
> 넉백 없는 피격(원거리)은 hurt 애니메이션을 재생하되 이동은 유지한다.

| 피격 유형 | 넉백 | 네비게이션 | hurt 애니 |
|---|---|---|---|
| 원거리 (투사체/터렛) | 없음 | **유지** (이동 계속) | 재생 |
| 근접 (melee) | 있음 | **정지** (기존과 동일) | 재생 + 넉백 |

---

## 3. 변경 파일 및 구체적 수정

### 3.1 `src/gsdk/src/actors/battle/actorcombatstates.ts`

#### 변경 A — `HurtActorState` 에 `hasKnockback` getter 추가

`maxPushDistance` 는 이미 `private` 필드로 존재 (`Init` 에서 설정). getter 만 노출한다.

```ts
// HurtActorState 클래스 (hurtDuration 필드 선언 근처에 추가)
get hasKnockback(): boolean { return this.maxPushDistance > 0 }
```

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
        this.states.RunSt.Init()
        return this.states.RunSt
    }
    this.states.IdleSt.Init()
    return this.states.IdleSt
}
```

`HasActorAttackTarget` 은 같은 파일 내 이미 존재 (라인 63, 파일 수준 함수).

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
        return this.currentState.hasKnockback   // 넉백 있을 때만 정지
    }
    return this.currentState instanceof AttackActorState
        || this.currentState instanceof JumpActorState
        || this.currentState instanceof DyingActorState
        || this.Spec.Health <= 0
}
```

---

## 4. 동작 원리 (수정 후)

### 원거리 피격 (넉백 없음)

- `hasKnockback = false` → `isNavigationSuspended() = false`
- `applyVehiclePosition` 정상 실행 → Vehicle 이 타겟 방향으로 이동
- `updateNavigation` 정상 실행 → `moveDirection` 이 방향 벡터 유지
- `HurtActorState.Update` 수신 `v` 가 비-zero → 종료 시 즉시 `RunSt`
- 결과: **hurt 애니메이션 재생 + 이동 유지**

### 근접 피격 (넉백 있음)

- `hasKnockback = true` → `isNavigationSuspended() = true` (기존과 동일)
- Vehicle 고정, `moveDirection = 0`
- `HurtActorState.Update` 가 `model.Pos` 에 직접 넉백 이동 적용
- 종료 시 `v = 0` 이지만 `HasActorAttackTarget(target) = true` → 즉시 `RunSt`
- 결과: **넉백 + hurt 애니메이션 + 타겟으로 즉시 복귀**

---

## 5. 검증

```bash
cd src/gsdk && npx tsc --noEmit    # 타입 오류 0 확인
npm run build                       # 빌드 성공 확인
```

수동 확인:

1. **원거리 피격** — 터렛 사격 또는 투사체에 맞은 몬스터/아군이 hurt 애니메이션을 재생하면서 타겟 방향 이동을 유지하는지
2. **근접 피격** — 플레이어 근접 공격에 맞은 몬스터가 짧게 멈추며 넉백되는 기존 동작 유지 여부
3. **넉백 종료 후 복귀** — 넉백이 있는 경우 HurtState 종료 시 Idle 경유 없이 바로 타겟을 향해 Run 으로 전환하는지
