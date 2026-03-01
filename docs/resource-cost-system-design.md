# 범용 자원 소모(HP/MP/SP/탄약 등) 시스템 설계

## 1) 목표

공격/스킬 실행 시 고정된 자원(예: MP만)만 소모하는 구조가 아니라,
**하나의 액션이 여러 종류의 자원을 조합해서 소모**할 수 있도록 설계합니다.

예시:
- 근거리 공격: SP 10 소모(선택), 또는 SP 소모 없이 가능
- 원거리 공격: SP 5 + 화살 1 소모
- 총기 공격: MP 0 + SP 2 + 탄약(9mm) 1 소모
- 마법 공격: MP 20 소모, 부족 시 HP 대체 소모(옵션)

핵심 요구사항:
- 자원 종류를 하드코딩하지 않고 확장 가능해야 함
- 조건부/대체 소모(OR), 필수 동시 소모(AND)를 모두 지원
- 검증(사용 가능?)과 확정 소모(차감)를 분리하여 예측 가능한 동작 보장
- UI/로그/AI가 같은 판정 결과를 공유할 수 있어야 함

---

## 2) 핵심 개념

### 2.1 ResourceKey (자원 키)
문자열 기반 키로 모든 자원을 통합 관리합니다.

- 스탯형: `hp`, `mp`, `stamina`
- 인벤토리형: `ammo.9mm`, `ammo.arrow`, `item.mana_potion`
- 특수형: `heat`, `rage`, `durability.weapon.main`

> 포인트: **"어디에 저장되느냐"(status/inventory)는 내부 어댑터가 처리**하고,
> 상위 로직은 `ResourceKey`만 다루게 합니다.

### 2.2 ResourcePool (자원 조회/차감 인터페이스)
자원 저장소를 추상화한 인터페이스입니다.

- `get(key)` : 현재량 조회
- `canAfford(cost)` : 비용 지불 가능 여부
- `consume(cost)` : 실제 차감
- `refund(cost)` : 롤백/환불 (필요 시)

`hp/mp/stamina`는 상태값에서, 탄약은 인벤토리에서 읽어오더라도
호출부는 동일하게 사용합니다.

### 2.3 Cost Expression (비용 표현식)
단순 벡터(`{mp:10}`)를 넘어, 다음을 표현합니다.

- **ALL**: 모두 지불해야 함 (AND)
- **ANY**: 여러 대안 중 하나 지불하면 됨 (OR)
- **OPTIONAL**: 지불 가능하면 소모하고, 불가능해도 액션은 진행

이 3가지만 있어도 대부분의 설계를 커버할 수 있습니다.

---

## 3) 데이터 모델 제안

```ts
export type ResourceKey = string;

export type CostAtom = {
  key: ResourceKey;
  amount: number;         // 양수만 허용
  consumeOnSuccess?: boolean; // 기본 true: 액션 성공 시 소모
};

export type CostNode =
  | { type: 'all'; nodes: CostNode[] }   // AND
  | { type: 'any'; nodes: CostNode[] }   // OR
  | { type: 'optional'; node: CostNode } // 지불 가능하면 소모
  | { type: 'atom'; atom: CostAtom };

export type CostPolicy = {
  // 자원이 부족할 때 자동 대체 규칙 (선택)
  substitutions?: Record<ResourceKey, ResourceKey[]>;
  // 음수 허용 여부, 최소 잔량, 안전장치 등
  minRemain?: Partial<Record<ResourceKey, number>>;
};

export type ActionCostSpec = {
  id: string;             // action/skill id
  cost: CostNode;
  policy?: CostPolicy;
};
```

### 3.1 액션 예시

#### 근거리 기본 공격 (SP 소모는 선택)
```ts
const meleeBasic: ActionCostSpec = {
  id: 'melee.basic',
  cost: {
    type: 'optional',
    node: { type: 'atom', atom: { key: 'stamina', amount: 10 } }
  }
};
```

#### 활 공격 (SP 5 + 화살 1 필수)
```ts
const bowShot: ActionCostSpec = {
  id: 'range.bow.shot',
  cost: {
    type: 'all',
    nodes: [
      { type: 'atom', atom: { key: 'stamina', amount: 5 } },
      { type: 'atom', atom: { key: 'ammo.arrow', amount: 1 } },
    ]
  }
};
```

#### 파이어볼 (MP 20 또는 MP 부족시 HP 30)
```ts
const fireball: ActionCostSpec = {
  id: 'magic.fireball',
  cost: {
    type: 'any',
    nodes: [
      { type: 'atom', atom: { key: 'mp', amount: 20 } },
      { type: 'atom', atom: { key: 'hp', amount: 30 } },
    ]
  }
};
```

#### 총기 사격 (탄약 필수 + SP는 옵션)
```ts
const pistolShot: ActionCostSpec = {
  id: 'range.gun.pistol.shot',
  cost: {
    type: 'all',
    nodes: [
      { type: 'atom', atom: { key: 'ammo.9mm', amount: 1 } },
      {
        type: 'optional',
        node: { type: 'atom', atom: { key: 'stamina', amount: 2 } }
      }
    ]
  }
};
```

---

## 4) 실행 파이프라인

### 단계 A: Resolve (검증/해결)
`ActionCostSpec` + `ResourcePool` → `CostResolution`

- 어떤 경로(ANY 중 무엇)를 선택할지 결정
- 실제 차감 목록(flat atom list) 생성
- 실패 시 부족한 자원 목록(`shortages`) 반환

### 단계 B: Commit (확정 소모)
Resolve 결과를 기반으로 실제 차감 실행

- 멀티 리소스 차감은 가능하면 **원자적(atomic)** 처리
- 부분 차감이 발생하면 `refund()`로 롤백

### 단계 C: Execute Action
소모 성공 후 공격/스킬 로직 실행

### 단계 D: Post Handling
- 공격이 취소/미발동된 경우 환불 정책 적용 여부 결정
- 쿨다운 시작 시점(캐스팅 시작/발사 성공 등)과 정합성 맞추기

> 실무 팁: `canAfford()`만 먼저 호출하고 나중에 consume하면 레이스가 생길 수 있으니,
> 가능하면 `reserve -> commit` 혹은 내부 락/틱 단위 처리로 일관성 확보를 권장합니다.

---

## 5) 컴포넌트 구조

```text
[Action/Skill Input]
      |
      v
[CostEngine]
  - resolve(spec, actor)
  - commit(plan, actor)
      |
      +--> [StatusResourceAdapter]    (hp/mp/stamina)
      +--> [InventoryResourceAdapter] (ammo/item)
      +--> [EtcAdapter]               (weapon durability, heat...)
```

### 5.1 ResourceAdapter 인터페이스

```ts
interface ResourceAdapter {
  supports(key: ResourceKey): boolean;
  get(actorId: string, key: ResourceKey): number;
  add(actorId: string, key: ResourceKey, delta: number): void; // delta<0 소모
}
```

`CostEngine`는 key별로 알맞은 adapter를 찾아 읽기/차감합니다.

---

## 6) UI/기획 친화 포인트

- 액션 툴팁에 `resolvedCostPreview` 노출
  - 예: "MP 20 (부족 시 HP 30)"
- 비활성 사유 표준화
  - `NOT_ENOUGH_RESOURCE`, `NO_AMMO`, `BLOCKED_BY_MIN_REMAIN`
- 옵션 소모 결과를 전투 로그에 명확히 표시
  - "강공격: 스태미나 보너스 적용" / "스태미나 부족으로 기본 공격"

---

## 7) 밸런싱/운영을 위한 확장

- `costMultiplier` 버프/디버프 (예: "소모량 -20%")
- 무기/스킬 레벨별 비용 커브
- 자원 타입 태그 기반 규칙
  - `resourceTag: physical/magical/ammo`에 따른 일괄 할인
- 서버 authoritative 구조에서
  - 클라: 예측(프리뷰)
  - 서버: 최종 resolve/commit

---

## 8) 현재 코드베이스 적용 시 권장 순서

1. **공통 ResourceKey 네이밍 규칙** 먼저 확정 (`hp/mp/stamina/ammo.*`).
2. `status` + `inventory`를 감싸는 `ResourceAdapter` 2종 구현.
3. 단순 비용(`all + atom`)부터 기존 액션에 연결.
4. 이후 `any/optional`을 점진 도입.
5. 마지막에 대체 소모 정책(`substitutions`)과 환불 정책 추가.

---

## 9) 최소 구현(MVP) 경계

MVP에서는 아래만 먼저 구현해도 충분합니다.

- `atom`, `all`, `optional`
- `hp/mp/stamina/ammo.*`
- resolve + commit 분리
- 실패 사유 코드화

그 다음 릴리즈에서 `any`, `substitutions`, `reserve/commit` 원자성 강화로 확장하면
안전하게 범용 시스템으로 발전시킬 수 있습니다.

---

## 10) Cost Engine 상세 설계 (확장성 + 효율성)

아래는 엔진 구현 시 실제로 도움이 되는 내부 설계 제안입니다.

### 10.1 모듈 분리

- `CostParser`: 기획 데이터(JSON) → `CostNode` 검증/정규화
- `CostResolver`: 런타임 현재 자원 상태에서 실행 가능한 경로 계산
- `CostPlanner`: 최종 차감 계획(`ConsumePlan`) 생성
- `CostCommitter`: 원자적 차감/롤백 책임
- `CostTelemetry`: 실패율, 자원 병목, 평균 소모량 집계

이렇게 나누면, 규칙 추가(`any` 우선순위, 대체 규칙 등) 시에도
커밋 로직 안정성을 건드리지 않고 확장 가능합니다.

### 10.2 정규화(Normalization) 단계

`CostNode`를 실행 전에 정규화하면 런타임 비용을 크게 줄일 수 있습니다.

정규화 예시:
- 중첩 `all` 평탄화: `all([all([a,b]),c]) -> all([a,b,c])`
- 중첩 `optional` 단순화
- `amount <= 0` atom 제거 또는 검증 에러
- 중복 key 병합(가능한 경우): `all([mp:10, mp:5]) -> mp:15`

> 권장: 스킬 로딩 시 1회 정규화하고, 전투 중에는 정규화된 AST만 사용.

### 10.3 Resolve 전략(ANY 선택 정책)

`any` 노드가 여러 경로를 가질 때 "무엇을 선택할지"가 핵심입니다.

추천 정책(기본값):
1. **가치 보존 우선**: 희소 자원(탄약, HP)보다 재생 자원(MP/SP) 우선 소모
2. **비용 최소화**: 환산 점수(`weight`)가 가장 낮은 경로 선택
3. **상태 안정화**: 위험 임계치(예: HP 30% 이하) 아래로 내려가는 선택 금지

```ts
type ResolverPolicy = {
  resourceWeight: Partial<Record<ResourceKey, number>>; // 낮을수록 우선 소모
  protectThreshold?: Partial<Record<ResourceKey, number>>; // ex) hp: 0.3
  tieBreaker?: 'left-first' | 'random-seeded' | 'min-total-amount';
};
```

이 정책을 분리하면 밸런싱팀이 코드 변경 없이 테이블로 조정 가능합니다.

### 10.4 ConsumePlan (2단계 커밋용 실행 계획)

```ts
type ConsumeOp = { key: ResourceKey; amount: number; adapterId: string };

type ConsumePlan = {
  actorId: string;
  ops: ConsumeOp[]; // 확정 차감 목록
  optionalOps: ConsumeOp[]; // 가능할 때만 적용
  chosenBranches: string[]; // any에서 선택된 분기 ID
  shortages: Array<{ key: ResourceKey; need: number; have: number }>;
};
```

- `resolve()`는 오직 `ConsumePlan`을 만듭니다.
- `commit()`은 `ops`를 트랜잭션처럼 처리합니다.
- 이 분리 덕분에 UI 프리뷰/AI 시뮬레이션/서버 검증을 동일 코드로 재사용할 수 있습니다.

### 10.5 원자성(Atomicity) 구현 옵션

- 단일 프로세스: actor 단위 뮤텍스 + 실패 시 역순 롤백
- 멀티 서버: reserve token(짧은 TTL) 발급 후 commit
- DB 사용 시: `SELECT ... FOR UPDATE` 또는 버전(optimistic lock) 비교

중요 포인트:
- `get -> canAfford -> consume`를 분리 호출하면 경쟁 상태가 생김
- 반드시 `resolve+commit` 사이 동시성 제어를 두어야 함

---

## 11) 성능 최적화 체크리스트

### 11.1 캐시 전략

- `ActionCostSpec` 정규화 결과 캐시 (`actionId + level + runeSet` 키)
- `supports(key)` 라우팅 캐시 (`key -> adapter`)
- 틱 내 반복 조회 캐시 (`actorId + key -> value`) 후 커밋 시 무효화

### 11.2 계산량 절감

- `any`는 조기 종료(short-circuit): 실행 가능 경로 찾으면 종료
- `optional`은 실패를 에러로 취급하지 않으므로 빠른 스킵
- `shortages`는 상위 N개만 수집(디버그 모드 제외)

### 11.3 메모리/GC 관리

- 전투 루프에서 임시 객체 생성 최소화(오브젝트 풀)
- `ConsumeOp[]` 재사용 버퍼 사용
- 문자열 key 비교가 많으면 내부적으로 정수 ID 매핑 가능

---

## 12) 운영/디버깅 가시성 (Telemetry)

엔진이 복잡해질수록 "왜 스킬이 안 나갔는지"를 빠르게 파악해야 합니다.

추천 메트릭:
- `cost.resolve.fail.rate{actionId, reason}`
- `cost.commit.rollback.count{actionId}`
- `resource.shortage.count{key}`
- `any.branch.pick.rate{actionId, branchId}`

추천 로그(샘플링):
- actorId, actionId, chosenBranches, finalOps, shortages, latency(ms)

이 데이터가 쌓이면 밸런스 조정 포인트(탄약 부족 과다, MP 과소비 등)를
정량적으로 찾을 수 있습니다.

---

## 13) 실전 적용 예시: 총기 + 스킬 시너지

요구:
- 기본 사격: `ammo.9mm` 1 필수
- 집중 사격 버프 상태면 `stamina` 5 추가 소모 시 치명타 보너스
- stamina 부족해도 기본 사격은 가능

표현:

```ts
const focusedShot: ActionCostSpec = {
  id: 'range.gun.focused-shot',
  cost: {
    type: 'all',
    nodes: [
      { type: 'atom', atom: { key: 'ammo.9mm', amount: 1 } },
      { type: 'optional', node: { type: 'atom', atom: { key: 'stamina', amount: 5 } } }
    ]
  }
};
```

실행 결과:
- 탄약이 없으면 발사 불가(`NO_AMMO`)
- 탄약 있고 stamina 충분하면 보너스 발동
- 탄약 있고 stamina 부족하면 보너스 없이 기본 발사

즉, "행동 가능 여부"와 "추가 효과 여부"를 같은 엔진에서 일관 처리할 수 있습니다.

---

## 14) 다음 구현 단계 제안

1. `CostNode` + 정규화기 구현
2. `resolve()`에서 `ConsumePlan` 생성
3. `commit()` 원자성/롤백 구현
4. 액션 3종(근접/활/총기) 파일럿 적용
5. 텔레메트리 붙여서 실제 병목 확인

이 순서로 가면 기능 확장과 안정성 확보를 동시에 달성할 수 있습니다.
