# 조작/명령 가능 Actor 확장 가이드 (수동 + AI 동시 지원)

요구사항이 "Ship + Squad 통합"이면서 동시에

1. 사람이 직접 조작(수동 control)
2. AI/알고리즘이 조작(자동 control)

두 가지를 모두 지원해야 한다면,
핵심은 **입력 장치가 아니라 `명령(Command)`을 표준화**하는 것입니다.

---

## 1) 권장 아키텍처 한 줄 요약

- `Model`(표현)
- `Ctrl`(실행기)
- `State`(행동)
- `Policy`(명령 생성기: Human/AI)

즉, 컨트롤러는 "명령을 받아 실행"만 하고,
명령을 "누가 만들었는지"(사람/AI)는 Policy 계층으로 분리합니다.

---

## 2) monsters 패턴과 결합 포인트

기존 `actors/monsters`는 이미 아래 구조를 갖고 있습니다.

- `MonsterDb`: 정의/메타데이터
- `CreateMon`: 정의 기반 생성
- `MonsterCtrl`: 공통 update/전투 실행
- `idleStates`: 타입별 행동 전략

컨트롤 가능한 아군도 동일하게 가되,
`Policy`를 하나 추가해서 "명령 생성" 책임을 외부로 분리하면 됩니다.

---

## 3) 통합 구조 (Ship/Squad 공통)

```text
src/actors/controllable/
  controllabletypes.ts
  controllabledb.ts
  createcontrollable.ts
  controllable.ts
  controllablectrl.ts
  controllables.ts            // 선택/그룹 명령 매니저
  policy/
    controlpolicy.ts          // 공통 인터페이스
    humanpolicy.ts            // 입력/클릭 -> Command
    aipolicy.ts               // BT/GOAP/RL -> Command
  states/
    controllablestate.ts
    defaultstate.ts
    shipstate.ts
    allystate.ts
```

Ship/Squad를 나누는 기준은 클래스가 아니라 `define(role, stateFactory, policyHint)`입니다.

---

## 4) 핵심 타입 설계

### A. 명령 타입 (공통 언어)

```ts
export type CommandType =
  | "move"
  | "attack"
  | "hold"
  | "follow"
  | "patrol"
  | "useSkill";

export type Command = {
  type: CommandType;
  actorId: string;
  targetId?: string;
  point?: THREE.Vector3;
  issuedAt: number;
  issuer: "human" | "ai" | "script";
  priority?: number;
};
```

### B. 제어 소스 타입

```ts
export type ControlSource = "manual" | "ai" | "hybrid";
```

### C. Policy 인터페이스 (명령 생성기)

```ts
export interface IControlPolicy {
  source: ControlSource;
  tick(delta: number, ctx: PolicyContext): Command[];
  onEvent?(event: unknown, ctx: PolicyContext): void;
}
```

- `HumanPolicy`: 키/마우스/UI 이벤트를 Command로 변환
- `AiPolicy`: 센서 정보(적 거리, hp, 쿨다운)를 보고 Command 생성

---

## 5) Controller 책임 최소화

`ControllableCtrl`은 아래만 담당해야 합니다.

1. Policy가 만든 Command를 큐에 적재
2. 우선순위/쿨다운/자원 조건 검증
3. State 전환 (`Idle -> Move -> Attack ...`)
4. `BaseSpec`, `IActionUser`로 전투/버프 처리

즉 컨트롤러는 **결정(decision)**이 아니라 **실행(execution)** 엔진입니다.

---

## 6) 수동 + AI 동시 지원 방식 (중요)

### 권장: Hybrid 모드 + 우선순위 규칙

`ControlSource = "hybrid"`일 때 다음 룰을 권장합니다.

- 최근 N초 내 human 입력이 있으면 human 우선
- human 입력이 없으면 ai 명령 활성화
- 같은 틱에 충돌 시 `priority` 높은 명령 채택
- 이동과 공격처럼 병행 가능한 명령은 병렬 허용

예:
- 플레이어가 이동을 찍으면 즉시 수동 명령 우선
- 입력이 끊기면 AI가 자동 추적/호위 재개

이 구조가 "직접 조작 ↔ 자동 전투" 전환 UX를 가장 자연스럽게 만듭니다.

---

## 7) Event 버스 설계

기존 이벤트 시스템을 재사용하면서 아래만 추가하세요.

- `SetControlSource(actorId, source)`
- `IssueControllableCommand(command)`
- `IssueControllableGroupCommand(commands[])`

UI는 이벤트 발행만 하고,
`HumanPolicy`는 UI 이벤트를 Command로 변환,
`AiPolicy`는 월드 상태를 읽어 Command를 생성합니다.

---

## 8) 상태(State) 설계 팁

State는 "누가 명령했는지"를 몰라도 되게 유지하세요.

- State 입력은 Command/Context만 받기
- 출처(human/ai)는 Ctrl 또는 Policy 계층에서 해석

이렇게 하면 Ship/Ally 상태를 재사용하기 쉽고,
AI 모델을 바꿔도 State 코드는 거의 건드리지 않습니다.

---

## 9) 단계별 적용 순서

1. `Command`와 `IControlPolicy` 먼저 고정
2. `ControllableCtrl`을 command-driven으로 변경
3. `HumanPolicy` 연결 (기존 입력 이식)
4. `AiPolicy` 연결 (간단 규칙 기반부터 시작)
5. `hybrid` arbitration 룰 추가
6. 마지막에 Ship/Ally stateFactory 분기 최적화

---

## 10) 결론

질문하신 요구사항에는
**"통합 컨트롤러 + 이원화된 Policy(Human/AI) + 공통 Command 버스"** 구조가 가장 적합합니다.

- Ship/Squad 중복 코드 최소화
- 수동/자동 전환 비용 최소화
- AI 알고리즘 교체(규칙 기반 → BT/GOAP/RL)에도 안전

원하시면 다음 단계로 `controlpolicy.ts`, `humanpolicy.ts`, `aipolicy.ts`, `controllablectrl.ts` 최소 템플릿을 실제 코드로 바로 추가해드릴게요.
