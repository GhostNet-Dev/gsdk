# Game Objects Design Notes

이 폴더는 게임 전체의 상태 진행을 조율하는 상위 게임 오브젝트를 둔다.
현재 설계의 중심은 턴 진행, 자원 반영, 턴 로그 표시 흐름이다.

## 목표

- 턴제와 실시간 모드를 함께 지원할 수 있도록 턴 처리를 독립된 흐름으로 둔다.
- 각 기능 모듈은 필요한 경우 턴 참여자로 등록하고, 한 턴에 해야 할 일을 직접 처리한다.
- 자원 증감은 `WalletManager`를 직접 호출하기보다 `ResourceManager`를 거쳐 일관되게 처리한다.
- 턴 중 발생한 일은 `TurnReport`에 모으고, UI는 이 보고서를 구독해서 표시한다.

## 주요 구성 요소

### GameManager

`GameManager`는 게임 상태 흐름의 조립 지점이다.

- `ResourceManager`를 생성한다.
- `TurnManager`를 생성한다.
- `TurnLogPanel`을 생성한다.
- `BuildingManager` 같은 게임 기능 매니저를 생성한다.
- 다음 턴 요청이 들어오면 `EventTypes.TurnNext` 이벤트를 보낸다.

`GameManager`는 가능하면 자원 계산이나 턴 처리의 세부 로직을 직접 들고 있지 않는다.
대신 이벤트를 통해 각 책임자에게 일을 넘긴다.

### TurnManager

`TurnManager`는 턴 진행의 실행자다.

- `RegisterTurnParticipant` 이벤트로 턴 참여자를 등록한다.
- `DeregisterTurnParticipant` 이벤트로 턴 참여자를 해제한다.
- `TurnNext` 이벤트를 받으면 다음 턴을 실행한다.
- 턴마다 `TurnReport`를 새로 만들고, 모든 턴 참여자에게 `TurnContext`를 전달한다.
- 턴 중 발생한 자원 변경 이벤트를 보고서 로그로 변환한다.
- 턴 종료 시 `TurnEnded` 이벤트를 보낸다.

턴 참여자는 `turnOrder`와 `turnId`를 가진다.
`TurnManager`는 `turnOrder` 기준으로 실행 순서를 정하고, 값이 같으면 `turnId`로 정렬한다.

### TurnContext

`TurnContext`는 턴 참여자에게 전달되는 실행 컨텍스트다.

```ts
interface TurnContext {
  turn: number;
  eventCtrl: IEventController;
  report: TurnReport;
  log: TurnLogger;
}
```

턴 참여자는 `ctx.log.add(...)`를 통해 자신이 처리한 일을 보고서에 남길 수 있다.

예:

```ts
ctx.log.add({
  source: "building",
  kind: "construction",
  message: "목재소 건설이 완료되었습니다.",
});
```

### ITurnParticipant

턴이 필요한 모듈은 별도 processor를 두지 않고 이 인터페이스를 구현한다.

```ts
interface ITurnParticipant {
  readonly turnId: string;
  readonly turnOrder: number;
  advanceTurn(ctx: TurnContext): void | Promise<void>;
}
```

예를 들어 `BuildingManager`는 턴제 건설 진행을 위해 `ITurnParticipant`를 구현한다.
생산, 적 성장, 시민 생성, 병사 생성 같은 모듈도 같은 방식으로 등록할 수 있다.

### ResourceManager

`ResourceManager`는 게임 자원 변경의 단일 입구다.

- `ResourceChangeRequested` 이벤트를 받는다.
- 기존 wallet key 이벤트도 받아서 호환한다.
- `WalletManager`에 실제 증감을 반영한다.
- 반영 결과를 `ResourceAmountChanged` 이벤트로 다시 알린다.

자원을 얻거나 사용하는 모듈은 직접 `wallet.add(...)`, `wallet.subtract(...)`를 호출하기보다 다음 이벤트를 보내는 것을 권장한다.

```ts
eventCtrl.SendEventMessage(EventTypes.ResourceChangeRequested, {
  type: CurrencyType.Wood,
  amount: 100,
  source: "building",
  reason: "production",
});
```

차감은 `amount`를 음수로 보낸다.

```ts
eventCtrl.SendEventMessage(EventTypes.ResourceChangeRequested, {
  type: CurrencyType.Wood,
  amount: -30,
  source: "building",
  reason: "cost",
});
```

### TurnReport

`TurnReport`는 한 턴 동안 발생한 일을 모은 결과물이다.

```ts
interface TurnReport {
  turn: number;
  entries: TurnLogEntry[];
  totals: {
    resources: Partial<Record<CurrencyType, number>>;
  };
}
```

현재는 로그 목록과 자원 증감 합계를 가진다.
이후에는 유닛 생산, 적 성장, 연구 완료 같은 요약도 `totals` 또는 별도 필드로 확장할 수 있다.

### TurnLogPanel

`TurnLogPanel`은 턴 진행 중 메시지 창을 띄우는 UI다.

- `TurnReportUpdated` 이벤트를 받으면 패널을 열고 로그를 갱신한다.
- `TurnEnded` 이벤트를 받으면 완료 상태로 전환한다.
- 턴이 끝나기 전에는 닫기 버튼을 비활성화한다.

UI는 자원 변경이나 건물 처리 로직을 직접 알 필요가 없다.
오직 `TurnReport`만 표시한다.

## 이벤트 흐름

### 다음 턴 실행

1. UI 또는 게임 로직이 `GameManager.nextTurn()`을 호출한다.
2. `GameManager`가 `EventTypes.TurnNext` 이벤트를 보낸다.
3. `TurnManager`가 새 턴 번호를 만들고 `TurnReport`를 초기화한다.
4. `TurnManager`가 `TurnReportUpdated` 이벤트를 보내 메시지 창을 연다.
5. 등록된 `ITurnParticipant`들이 순서대로 `advanceTurn(ctx)`를 실행한다.
6. 각 참여자는 필요한 일을 처리하고 `ctx.log.add(...)`로 로그를 남긴다.
7. 모든 참여자가 끝나면 `TurnManager`가 `TurnEnded` 이벤트를 보낸다.
8. `TurnLogPanel`은 완료 상태로 바뀌고 사용자가 닫을 수 있다.

### 자원 획득 또는 사용

1. 생산, 보상, 비용 처리 모듈이 `ResourceChangeRequested` 이벤트를 보낸다.
2. `ResourceManager`가 요청을 검증한다.
3. `ResourceManager`가 `WalletManager`에 실제 자원 증감을 반영한다.
4. 성공하면 `ResourceAmountChanged` 이벤트를 보낸다.
5. 턴 진행 중이면 `TurnManager`가 이 이벤트를 받아 `TurnReport`에 자원 로그를 추가한다.
6. `TurnManager`가 `TurnReportUpdated` 이벤트를 보낸다.
7. `TurnLogPanel`이 갱신된 로그를 표시한다.

## 현재 BuildingManager 흐름

`BuildingManager`는 현재 턴 참여자로 등록된다.

- `BuildingMode.Turn`일 때만 `advanceTurn(ctx)`에서 건설 턴을 진행한다.
- 건설 중인 작업의 `remainingTurns`를 줄인다.
- 남은 턴이 있으면 건설 진행 로그를 남긴다.
- 완료되면 `finishBuild(...)`를 실행하고 건설 완료 로그를 남긴다.
- 건물이 시민 수를 제공하면 기존 `EventTypes.People` 이벤트를 보낸다.
- `ResourceManager`가 해당 이벤트를 받아 wallet 반영과 자원 변경 이벤트 발행을 처리한다.

## 이벤트 타입

현재 턴과 자원 흐름에 사용하는 주요 이벤트는 다음과 같다.

- `TurnNext`: 다음 턴 실행 요청
- `TurnEnded`: 턴 실행 완료 알림
- `TurnReportUpdated`: 턴 보고서 갱신 알림
- `RegisterTurnParticipant`: 턴 참여자 등록
- `DeregisterTurnParticipant`: 턴 참여자 해제
- `ResourceChangeRequested`: 자원 변경 요청
- `ResourceAmountChanged`: 자원 변경 완료 알림

## 설계 원칙

- 턴 참여자는 자기 도메인의 처리만 담당한다.
- `TurnManager`는 실행 순서와 보고서 생성을 담당한다.
- `ResourceManager`는 자원 변경의 단일 입구 역할을 한다.
- `WalletManager`는 실제 보유량 저장소로 남긴다.
- UI는 도메인 로직을 직접 호출하지 않고 보고서 이벤트만 구독한다.
- 로그 생성은 실제 처리와 분리한다. 실제 변경은 먼저 수행하고, 성공한 결과만 로그로 남긴다.

## 앞으로 정리할 부분

- 업그레이드 비용 차감도 `ResourceChangeRequested`를 통해 처리하도록 통일한다.
- 생산 건물, 병사 생성, 시민 성장, 적 성장 모듈을 각각 `ITurnParticipant`로 등록한다.
- 턴 로그의 `kind`별 아이콘이나 색상을 UI에 추가한다.
- `TurnReport.totals`에 자원 외 요약 정보를 추가한다.
- 턴 실행 중 오류가 발생했을 때 계속 진행할지 중단할지 정책을 정한다.
