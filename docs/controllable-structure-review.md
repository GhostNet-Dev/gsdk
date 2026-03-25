# Controllable 구조 개선 리뷰 (최종 점검)

현재 `src/actors/controllable` 스캐폴딩은 시작점으로 충분하지만,
실전 투입 전에는 아래 개선을 우선순위대로 진행하는 것을 권장합니다.

---

## P0 (먼저 해야 하는 항목)

## 1) Command/State 타입 안정성 강화
- 현재 `payload?: unknown`, `stateFactory(...params: unknown[])` 형태라 런타임 캐스팅이 필요합니다.
- 개선안:
  - `Command`를 discriminated union으로 분리 (`MoveCommand`, `AttackCommand` ...)
  - `stateFactory(runtime: IControllableRuntime, ctx: BuildContext)`처럼 시그니처 고정
- 기대효과: `as` 캐스팅 감소, IDE 자동완성 개선, 명령 처리 버그 감소.

## 2) Arbiter를 클래스화 + 충돌정책 표준화
- 현재 기본 arbiter는 priority 정렬만 수행합니다.
- 개선안:
  - `ICommandArbiter` 인터페이스 도입
  - 정책 분리: `humanOverrideWindow`, `dropConflicts`, `mergeParallelizable`
- 기대효과: hybrid 정책 실험/튜닝 용이.

## 3) Command Queue 보호장치
- 큐 길이 제한/TTL/중복 제거가 아직 없습니다.
- 개선안:
  - `maxQueueSize`
  - 오래된 명령 폐기(`issuedAt + ttl`)
  - 동일 command coalesce(예: 연속 move)
- 기대효과: 프레임 저하/메모리 증가 방지.

---

## P1 (다음 스프린트 권장)

## 4) 이벤트 브리지 레이어 추가
- `EventTypes`는 추가했지만 실제 브리지(`IssueControllableCommand` -> `Controllables.issue`)가 없습니다.
- 개선안:
  - `ControllableEventBridge` 추가
  - 입력/UI/AI 모두 이벤트 발행만 하도록 통일
- 기대효과: 시스템 결합도 감소, 테스트 용이.

## 5) 선택/그룹 명령 API 정리
- 현재 `issueGroup(commands[])`는 호출자가 actorId를 모두 채워야 합니다.
- 개선안:
  - `issueSelected(templateCommand)` 추가
  - 내부에서 selected actorId에 맞춰 명령 fan-out
- 기대효과: UI 코드 단순화.

## 6) 샘플 정의를 실사용 팩토리로 연결
- 샘플(`samples/controllabledefs.ts`)은 존재하지만 bootstrapping 코드가 없습니다.
- 개선안:
  - `registerSampleDefinitions()`를 게임 초기화에 연결
  - `PolicyRegistry`에 `human`, `ship-default-ai`, `ally-escort-ai` 등록
- 기대효과: 데모 가능한 최소 end-to-end 동작 확보.

---

## P2 (운영 전 품질 강화)

## 7) 테스트 추가
- 단위 테스트:
  - `ControllableCtrl.resolveSources()`
  - arbiter 충돌 해결
  - `HumanPolicy` enqueue/tick 동작
- 통합 테스트:
  - hybrid 모드에서 human 입력 후 AI 복귀 시나리오
  - group command fan-out 시나리오

## 8) 관측성(Observability)
- 개선안:
  - command trace 로그(issuer, source, latency)
  - dropped command 카운터
  - state transition 로그
- 기대효과: 디버깅 시간 단축.

## 9) 네트워크/리플레이 대비
- 개선안:
  - `ActorCommand` 직렬화 스키마(version 포함)
  - 결정적 시뮬레이션을 위한 timestamp 정책 확정
- 기대효과: 멀티플레이/리플레이 확장 준비.

---

## 추천 실행 순서
1. P0-1, P0-2, P0-3
2. P1-4, P1-5
3. P1-6 (샘플 실연결)
4. P2 테스트/관측성

위 순서대로 진행하면 현재 구조를 크게 깨지 않으면서,
"수동 + AI 하이브리드 제어"를 안정적으로 운영 가능한 수준까지 올릴 수 있습니다.
