# Fleet Design Notes

이 폴더는 함대 전투 시뮬레이션의 전술 런타임을 담당합니다.

`fleet`은 은하 전략 상태의 원천이 아니라, 실제 전투가 발생했을 때 전략 함대 상태를 받아 전투 장면으로 실행하는 모듈입니다. 행성 위치, 항로 이동, 진영 임무, 전쟁 상태, 준비도 같은 장기 상태는 `strategicgalaxy`와 `faction`이 소유하고, `fleet`은 그 상태를 전술 전투용 `FleetWorldOptions`로 투영한 뒤 함선 생성, 명령 실행, 전투 AI, 승패 판정을 처리합니다.

## 배치 기준

함대 시스템은 전략 레벨과 전술 레벨을 분리합니다.

```txt
gameobjects/strategicgalaxy
- 전략 함대 위치
- 현재 행성, 목표 행성
- 항로 이동, 임무, 준비도
- 전략 전력 평가
- 전투 발생 조건

gameobjects/faction
- 진영별 군사 목표
- 함대 배치 의사결정
- 공격/방어/봉쇄 같은 전략 임무 선택
- 진영 관계와 전쟁 상태

gameobjects/fleet
- 전술 전투 월드
- 함대 편대와 함선 명령 변환
- 함선 런타임 조립
- 계획/실행 전투 페이즈
- 반응형 전투 AI
- 전투 중 조준, 선택, 상태 표시

ux/fleet
- 함대 명령 패널
- 함선 상세 패널
- 전투 결과 UI
```

`gameobjects/fleet`는 Three.js 객체, 입력, hitbox, 카메라 focus, status ring 같은 전투 런타임 객체를 다룹니다. 따라서 이 폴더의 런타임 상태를 그대로 세이브 데이터로 사용하지 않습니다. 저장 가능한 canonical 상태는 전략 레벨 타입으로 별도 관리하고, 전투 진입 시에만 전술 런타임으로 변환합니다.

## 핵심 방향

함대 전투는 다음 흐름을 따릅니다.

```txt
StrategicFleetState
-> FleetWorldFleetOptions
-> FleetWorld.init()
-> spawnShip()
-> FighterShipRuntime 생성
-> Controllable 등록
-> FleetManager.createFleet()
-> FleetPanel / AimingController / AI가 FleetOrder 생성
-> Fleet.toCommands()
-> Controllables.issue()
-> FighterShipRuntime update
-> FleetBattleSnapshot 갱신
-> 승패 판정
-> 전략 결과로 환산
```

전투 중 명령 단위는 `FleetOrder`입니다. `FleetOrder`는 사람이 내릴 수도 있고, AI나 script가 낼 수도 있습니다. `Fleet`은 이 함대 단위 명령을 개별 함선의 `ActorCommand`로 변환합니다.

## 파일 구조

```txt
gameobjects/fleet/
  fleet.ts                   // 함대 도메인 객체, 함대 명령 타입, ActorCommand 변환
  fleetmanager.ts            // 여러 함대 registry, 선택 함대, 명령 발행
  fleetworld.ts              // 전술 전투 월드 조립, 함선 spawn, runtime/status/input 연결
  formation.ts               // line/column/wedge/circle 편대 좌표 계산
  battlephasecontroller.ts   // planning/executing 전투 페이즈와 pending order 관리
  fleetreactiveai.ts         // 전장 snapshot 기반 반응형 함대 AI
  sphereaimingctrl.ts        // 선택 함선 주변 3D 방향 조준 컨트롤러

ux/fleet/
  fleetpanel.ts              // 함대 명령 패널
  fleetpaneltypes.ts         // UI가 요구하는 controller 계약과 panel state
  shipdetailpanel.ts         // 함선 상세, 에너지 집중, 무기 선택
  battleresult.ts            // 전투 결과 표시
```

## 주요 구성 요소

### Fleet

`Fleet`은 함대 하나의 전술 명령 변환기입니다.

- 함대 ID, 이름, 색상, teamId, controller type을 가집니다.
- 함대 소속 함선 ID 목록을 관리합니다.
- 현재 편대, 간격, 이동 모드를 저장합니다.
- `Move`, `Advance`, `Attack`, `Hold`, `Follow` 명령을 함선별 `ActorCommand`로 변환합니다.
- 명령 발행자는 `human`, `ai`, `script`로 구분합니다.

주요 타입:

```ts
export enum FleetOrderType {
  Move = "move",
  Advance = "advance",
  Attack = "attack",
  Hold = "hold",
  Follow = "follow"
}

export type FleetOrder = {
  type: FleetOrderType;
  issuedAt?: number;
  issuer?: FleetCommandIssuer;
  priority?: number;
  point?: THREE.Vector3;
  direction?: THREE.Vector3;
  targetId?: string;
  formation?: FleetFormation;
  spacing?: number;
  facing?: THREE.Vector3;
  moveMode?: FleetMoveMode;
  weaponDoctrine?: FleetWeaponDoctrine;
};
```

### FleetManager

`FleetManager`는 전투 월드 안의 함대 registry입니다.

- `createFleet`으로 함대를 등록합니다.
- `requireFleet`, `getFleetSummary`, `listFleetSummaries`로 함대 상태를 제공합니다.
- 선택된 함대 ID를 관리합니다.
- `setFormation`, `setSpacing`, `setMoveMode`로 함대 전술 설정을 바꿉니다.
- `issueOrder`에서 `Fleet.toCommands()`를 호출하고, 결과를 `Controllables.issue(...)`로 전달합니다.

`FleetManager`는 함선의 실제 이동, 공격, 피해 계산을 직접 처리하지 않습니다. 그 일은 `Controllable`과 `FighterShipRuntime`이 처리합니다.

### Formation

`Formation`은 함대 배치 좌표를 계산합니다.

지원 편대:

```txt
line
- 기준점을 중심으로 좌우 횡대 배치
- 기본 편대

column
- 진행 방향 뒤쪽으로 종대 배치
- 후퇴나 좁은 진입로에 적합

wedge
- 기함을 앞에 둔 쐐기 배치
- 접근과 돌파에 적합

circle
- 기준점 주변 원형 배치
- 방어, 호위, 포위 표현에 적합
```

`facing` 벡터가 있으면 이 방향을 forward로 삼아 right/up basis를 계산합니다. 따라서 같은 편대도 목표 방향에 맞춰 회전된 좌표를 얻을 수 있습니다.

### FleetWorld

`FleetWorld`는 전술 전투 런타임의 조립 지점입니다.

- 전투 scene root와 grid를 구성합니다.
- 함선 모델을 로드하고, 실패하면 fallback mesh를 생성합니다.
- `FighterShipRuntime`을 만들고 `Controllables`에 등록합니다.
- 함선 hitbox를 만들고 projectile target으로 등록합니다.
- 함선별 hull/energy status ring을 표시합니다.
- 함선 선택, 함대 선택, 카메라 focus, 조준 UI를 연결합니다.
- 함선 피해 이벤트를 받아 runtime에 damage를 적용합니다.
- 함선 전멸 상태를 감시해 전투 승패를 알립니다.

`FleetWorld`는 UI와 AI가 사용할 snapshot도 제공합니다.

```ts
export type FleetBattleSnapshot = {
  fleets: FleetBattleFleetSnapshot[];
  ships: FleetBattleShipSnapshot[];
};
```

이 snapshot은 전투 의사결정과 표시를 위한 읽기 모델입니다. 저장용 canonical state가 아닙니다.

### BattlePhaseController

`BattlePhaseController`는 전투를 계획 단계와 실행 단계로 나눕니다.

```txt
Planning
- 플레이어가 명령을 계획한다.
- pending order를 fleetId별로 저장한다.
- 조준 UI와 FleetPanel은 이 단계에서 명령을 queue한다.
- 실제 함선 런타임에는 아직 명령을 내리지 않는다.

Executing
- pending order를 FleetManager에 commit한다.
- 함선들이 이동, 공격, 대기 명령을 수행한다.
- executionWindowSec가 지나면 다시 Planning으로 돌아간다.
```

이 구조는 완전 실시간 RTS보다 “계획 후 짧게 실행하는 전술 턴”에 가깝습니다.

### FleetReactiveAiController

`FleetReactiveAiController`는 AI 함대가 전장 상태에 반응하도록 합니다.

- 일정 간격마다 `FleetWorld.getBattleSnapshot()`을 읽습니다.
- controller가 `ai`인 함대만 처리합니다.
- planner가 `FleetOrder`를 반환하면 `FleetWorld.manager.issueOrder(...)`로 발행합니다.
- 직전 order key와 같으면 중복 발행하지 않습니다.

기본 planner는 다음 기준으로 행동합니다.

```txt
- 적이 없거나 작전 가능한 함선이 없으면 Hold
- 가장 가까운 적 함대를 primary target으로 선택
- 적 함대 안에서 hullRatio가 낮은 함선을 우선 공격
- 평균 energy가 너무 낮으면 Hold
- 평균 hull이 낮고 적이 가까우면 후퇴
- 적이 멀면 접근
- 사거리 안에 들어오면 Attack
```

`FleetWeaponDoctrine`은 AI가 무기 운용 성향을 전달하기 위한 힌트입니다.

```ts
export type FleetWeaponDoctrine =
  | "balanced"
  | "long-range"
  | "close-assault";
```

### SphereAimingController

`SphereAimingController`는 선택된 함선 주변에 3D 조준 구체를 띄우는 입력 컨트롤러입니다.

- 조준 구체는 선택된 함선 위치를 따라갑니다.
- handle을 드래그해 방향을 지정합니다.
- 드래그 중에는 OrbitControls를 잠시 비활성화합니다.
- 방향이 바뀌면 callback을 통해 planned order를 갱신할 수 있습니다.
- 조준이 끝나면 `Advance` 명령으로 변환할 수 있습니다.

`FleetWorld`는 선택 함선과 함대가 플레이어 제어 대상일 때만 조준 UI를 활성화합니다.

## 명령 모델

### Move

`Move`는 특정 지점으로 이동하는 명령입니다.

```txt
Formation 모드
- 함대 전체가 목표 anchor 주변의 편대 위치로 이동한다.

FlagshipFollow 모드
- 기함만 목표 지점으로 이동한다.
- 나머지 함선은 기함을 follow한다.

FlagshipFormation 모드
- 기함은 목표 지점으로 이동한다.
- 나머지 함선은 기함 기준 편대 offset을 유지하며 follow한다.
```

### Advance

`Advance`는 목표 지점보다 방향이 중요한 명령입니다.

- 조준 UI에서 주로 생성합니다.
- 각 함선에 같은 direction payload를 전달합니다.
- `facing`도 같은 방향으로 두어 편대 방향을 일관되게 유지할 수 있습니다.

### Attack

`Attack`은 targetId를 대상으로 공격 명령을 발행합니다.

- 사람이 내린 공격 명령은 각 함선에 단순 attack command로 전달합니다.
- AI 공격 명령은 기함과 호위 함선의 engagement payload를 함께 전달합니다.
- 기함은 `pursue-target`, 나머지는 `follow-ship` 방식으로 움직일 수 있습니다.
- 편대 이동 모드에 따라 offset과 stopDistance가 달라집니다.

### Hold

`Hold`는 현재 위치를 유지하는 명령입니다.

- planning 단계에서 계획 취소나 대기 명령으로 사용할 수 있습니다.
- energy가 부족하거나 적이 없을 때 AI 기본 행동으로도 사용합니다.

### Follow

`Follow`는 각 함선이 지정 targetId를 따라가는 명령입니다.

- 일반적으로 함대 내부에서 기함 추종을 구현할 때 사용합니다.
- 필요하면 별도 escort/guard 명령의 기반으로 확장할 수 있습니다.

## 이동 모드

```ts
export enum FleetMoveMode {
  Formation = "formation",
  FlagshipFollow = "flagship-follow",
  FlagshipFormation = "flagship-formation"
}
```

```txt
Formation
- 모든 함선이 계산된 편대 slot으로 직접 이동한다.
- 편대 모양이 가장 명확하다.
- 각 함선이 독립적으로 slot을 찾아가므로 산개된 움직임이 생길 수 있다.

FlagshipFollow
- 기함만 명시적 이동 목표를 가진다.
- 나머지는 기함을 따라간다.
- 간단하고 안정적이지만 편대 모양은 덜 엄격하다.

FlagshipFormation
- 기함은 이동 목표를 가진다.
- 나머지는 기함 기준 offset을 따라간다.
- 기함 중심의 전술 이동과 편대 유지 사이의 절충안이다.
```

## 전투 월드 옵션

`FleetWorldOptions`는 전술 전투 장면의 설정입니다.

```ts
export type FleetWorldOptions = {
  backgroundColor: THREE.ColorRepresentation;
  grid: FleetWorldGridOptions;
  camera: FleetWorldCameraOptions;
  debug: FleetWorldDebugOptions;
  statusRings: FleetWorldStatusRingOptions;
  spacingMultiplier: number;
  minSpacing: number;
  fleets: FleetWorldFleetOptions[];
};
```

`FleetWorldFleetOptions`는 전략 함대 하나를 전술 함대로 투영한 값입니다.

```ts
export type FleetWorldFleetOptions = {
  id: string;
  name?: string;
  teamId?: string;
  controller?: FleetControllerType;
  shipPrefix?: string;
  shipCount: number;
  controllableId: string;
  formation: FleetFormation;
  anchor: Vector3Like;
  facing: Vector3Like;
  color?: THREE.ColorRepresentation;
  speed?: number;
  spacing?: number;
};
```

전략 시스템은 전투 진입 시 다음 식으로 변환할 수 있습니다.

```txt
StrategicFleetState.id
-> FleetWorldFleetOptions.id

StrategicFleetState.factionId / owner
-> teamId, color, controller

StrategicFleetState.shipClassCounts
-> shipCount, controllableId 또는 여러 FleetWorldFleetOptions

전투 시작 위치
-> anchor, facing

전략 교리
-> formation, spacing, moveMode, weaponDoctrine
```

## UI 연결

`ux/fleet`는 `FleetPanelController` 계약만 보고 동작합니다.

```ts
export type FleetPanelController = {
  listFleetSummaries(): FleetSummary[];
  getFleetSummary(fleetId: string): FleetSummary | undefined;
  getSelectedFleetSummary(): FleetSummary | undefined;
  canControlFleet(fleetId: string): boolean;
  getFleetShips(fleetId: string): FleetShipPanelState[];
  getBattlePhaseSnapshot(): BattlePhaseSnapshot;
  getPlannedOrder(fleetId: string): FleetOrder | undefined;
  selectFleet(fleetId: string): FleetSummary | undefined;
  focusFleet(fleetId: string): void;
  focusShip(shipId: string): void;
  setFormation(fleetId: string, formation: FleetFormation): void;
  setSpacing(fleetId: string, spacing: number): void;
  setMoveMode(fleetId: string, moveMode: FleetMoveMode): void;
  setShipEnergyFocus(shipId: string, focus: FleetShipEnergyFocus): void;
  setShipWeapon(shipId: string, weaponId: string): void;
  planHold(fleetId: string): boolean;
  commitPlans(): boolean;
  stopExecution(): boolean;
  clearPlans(): void;
};
```

권장 구조는 scene/controller 계층에서 `FleetWorld`, `BattlePhaseController`, `FleetPanel`을 조립하고, UI에는 이 계약을 만족하는 adapter를 넘기는 방식입니다.

```txt
BattleSceneController
- FleetWorld 생성
- BattlePhaseController 생성
- FleetPanelController adapter 생성
- FleetPanel 생성
- FleetReactiveAiController 등록
- event loop에 runtime task 등록
```

## 전투 결과

현재 `FleetWorld`는 status ring 업데이트 중 생존 함선 수를 확인합니다.

```txt
player team 함선이 모두 파괴됨
-> onBattleEnd("loss")

enemy team 함선이 모두 파괴됨
-> onBattleEnd("win")
```

장기적으로는 단순 승패 외에도 다음 정보를 전략 결과로 환산할 수 있습니다.

```txt
- 격침된 함선 수
- 생존 함선 hull/energy
- 전투 지속 시간
- 퇴각 여부
- 목표 함선 파괴 여부
- 항로 봉쇄 성공 여부
- 행성 방어전 승패
```

이 결과는 `StrategicFleetState`, 행성 influence, faction score에 반영하는 것이 좋습니다.

## 저장 정책

저장할 수 있는 전략 상태:

- 전략 함대 ID
- 소속 진영
- 현재 행성, 목표 행성
- 임무
- 함선 구성
- 준비도, 보급, 손상률
- 마지막 전투 결과

전술 런타임에서 저장하지 않을 대상:

- Three.js mesh
- hitbox mesh
- status ring geometry
- `FighterShipRuntime` 인스턴스
- `Controllables` 내부 command queue
- `SphereAimingController` 드래그 상태
- UI 패널 open/close 상태
- 카메라 tween 상태

전투 중 세이브가 필요해질 경우에도 저장용 snapshot 타입을 별도로 정의하고, Three.js 객체나 runtime class를 직접 직렬화하지 않습니다.

## 의존 방향

권장 의존 방향:

```txt
faction
-> strategicgalaxy
-> battle scene adapter
-> fleet
-> actors/controllable
-> ux/fleet
```

주의할 점:

- `FactionManager`가 `FleetWorld`를 직접 생성하거나 조작하지 않습니다.
- `StrategicGalaxyManager`는 전투 필요성을 판단하고 전투 입력 데이터를 만들 수 있지만, 전투 scene의 입력/UI/camera를 직접 소유하지 않습니다.
- `FleetWorld`는 전략 상태를 직접 변경하지 않고, 전투 결과 callback이나 별도 result object를 통해 상위 계층에 결과를 알립니다.
- UI는 `FleetPanelController` 계약을 통해서만 함대 명령을 요청합니다.

## 프롬프트용 요약

`src/gsdk/src/gameobjects/fleet`는 함대 전투 시뮬레이션의 전술 런타임 모듈이다. 전략 은하의 장기 상태를 소유하지 않고, 전투가 발생했을 때 `StrategicFleetState` 같은 전략 상태를 `FleetWorldOptions`와 `FleetWorldFleetOptions`로 투영해 전투를 실행한다. 핵심 객체는 함대 명령을 개별 함선 명령으로 변환하는 `Fleet`, 여러 함대를 관리하고 `Controllables`에 명령을 발행하는 `FleetManager`, line/column/wedge/circle 편대 좌표를 계산하는 `Formation`, 전투 scene과 함선 runtime을 조립하는 `FleetWorld`, planning/executing 페이즈를 관리하는 `BattlePhaseController`, 전장 snapshot 기반으로 AI 명령을 생성하는 `FleetReactiveAiController`, 선택 함선 주변 3D 방향 조준을 담당하는 `SphereAimingController`다. 이 모듈은 tactical runtime, command conversion, formation, ship runtime wiring, battle AI, status visualization, input/camera integration을 담당하며, 저장 가능한 전략 상태는 `strategicgalaxy`와 `faction` 계층에 둔다.

## 앞으로 정리할 부분

- 전략 함대 상태를 `FleetWorldFleetOptions`로 바꾸는 adapter를 별도 파일로 분리한다.
- 전투 결과 타입을 정의해 전략 은하와 진영 점수에 반영할 수 있게 한다.
- `FleetPanelController` adapter의 표준 구현 위치를 정한다.
- AI planner를 진영 doctrine, 함선 role, 무기 range와 연결한다.
- 전술 전투 중 퇴각, 목표 방어, 봉쇄, 호위 같은 mission objective를 추가한다.
- 전투 snapshot과 저장 snapshot의 경계를 별도 타입으로 명확히 한다.
