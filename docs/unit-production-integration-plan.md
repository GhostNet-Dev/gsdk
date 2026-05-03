# 유닛 생산 시스템 연동 설계 (비용, 턴/시간 소모, UI 연동)

## 1. 개요
본 설계는 병영, 궁술 훈련장, 여관 등의 유닛 생산 건물이 Squad 시스템과 연동될 때의 상세 파이프라인을 정의합니다.

핵심 요구사항은 다음과 같습니다.
1. **자원 및 인구수 소모**: 유닛 생산 시 자원과 인구수(People)가 즉시 소모됩니다. 인구수는 영구 점유되는 서플라이가 아니라, 소모 후 턴/시간이 지나면 회복되는 자원(Resource)으로 취급합니다.
2. **생산 시간/턴 소모**: 유닛을 생산하는 데는 즉시 완료되지 않고 일정 턴 또는 시간이 소모됩니다.
3. **UI 피드백**: 생산이 진행 중일 때, 해당 건물의 생산 버튼은 비활성화(Disable)되며, 남은 시간 또는 턴이 표시되어야 합니다.

### 현재 구현 상태 (기존 코드 활용)
다음 항목은 이미 구현되어 있으므로 신규 구현 대상이 아닙니다.
- `isProducing`, `currentUnit`, `unitProductionTimer` 상태 관리 (`unitproduction.ts`)
- `EventTypes.UnitProduced` 이벤트 및 `UnitProducedPayload` 타입 (`globaltypes.ts`)
- UnitProduced 수신 → `SquadManager.addReserve()` → Reserve 편입 파이프라인 (`squadmanager.ts`)
- SelectionPanel 진행 바 (`getSpecificProgress()`) 및 StatusText (`getStatusText()`) 렌더링 (`selectionpanel.ts`)
- 커맨드 버튼 비활성화 메커니즘 (`ICommand.isDisabled()`) (`ibuildingobj.ts`)

다음 항목은 설계 반영 시 함께 구현 또는 조정해야 합니다.
- `UnitProduction`에서 `WalletManager`에 접근하는 경로
- `People` 회복 및 회복 상한 계산
- 턴제 생산 진행 로직

---

## 2. 데이터 아키텍처 확장
`src/gsdk/src/interactives/building/buildingdefs.ts`의 `ProduceCommandTemplate`를 확장하여, 요구 자원, 생산 소요 턴/시간을 정의합니다.

```typescript
import { CostVector } from "@Glibs/inventory/wallet";

export type ProduceCommandTemplate = BaseCommandTemplate & {
    type: "produce";
    targetId: AllyId;
    cost?: CostVector;           // 예: { [CurrencyType.Gold]: 50, [CurrencyType.People]: 1 }
    productionTime?: number;     // 실시간 모드(Timer)에서 소모되는 시간(초). 미지정 시 기존 5.0초 기본값 사용
    productionTurns?: number;    // 턴제 모드(Turn)에서 소모되는 턴 수. 미지정 시 1턴 기본값 사용
};
```

> **`requires` 필드 제외 이유**: 선행 조건 검증은 건물 배치 시에 `BuildRequirementValidator`가 처리하는 별도 책임입니다. 유닛 생산 커맨드는 해당 건물이 이미 배치된 상태에서만 호출되므로, 커맨드 템플릿에 `requires`를 중복 정의할 필요가 없습니다.

---

## 3. 인구 수용량 및 회복 모델
`People`은 `CurrencyType.People`로 표현되는 **현재 사용 가능한 인구 자원**입니다. 유닛 생산 비용에 `People`이 포함되어 있으면 생산 시작 시 즉시 차감됩니다.

인구 회복 상한은 활성 건물의 `providesPeople` 합계로 계산합니다.

```typescript
peopleCapacity = activeBuildings
    .map(building => building.property.providesPeople ?? 0)
    .reduce((sum, value) => sum + value, 0);
```

회복 규칙은 다음과 같습니다.
- `People`은 턴 또는 시간 흐름에 따라 회복됩니다.
- 회복 후 값은 항상 `peopleCapacity`를 넘지 않도록 clamp 처리합니다.
- 주택(Home)과 보급고는 사용 가능한 `People`을 영구 증가시키는 것이 아니라, 회복 가능한 최대 수용량을 제공합니다.
- 주택 완성, 파괴, 제거, 로드 복원 시 활성 건물 목록 기준으로 `peopleCapacity`를 다시 계산해야 합니다.

현재 건물 완성 시 `providesPeople`을 바로 지갑에 더하는 로직은 회복형 인구 모델에 맞게 조정이 필요합니다. 초기 주택 완성 보상으로 현재 `People`을 증가시키더라도, 최종 값은 `peopleCapacity`를 넘지 않아야 합니다.

회복 로직이 아직 없다면 별도 구현 대상입니다. 예를 들어 턴제 모드에서는 턴 종료 또는 건물 턴 처리 시 `CurrencyType.People`을 일정량 회복하고, 실시간 모드에서는 일정 간격마다 회복하도록 구현할 수 있습니다.

---

## 4. 건물 정의(Building Defs) 업데이트
병영 등 생산 건물의 `commands` 배열에 생산 비용과 소요 턴/시간을 명시합니다.

```typescript
// 예시: 병영(Barracks)
commands: [
    { 
        id: "spawn_warrior", 
        name: "전사 훈련", 
        icon: "⚔️", 
        type: "produce", 
        targetId: AllyId.Warrior, 
        shortcut: "W",
        cost: { [CurrencyType.Gold]: 50, [CurrencyType.People]: 1 },
        productionTime: 10,  // 10초 소요 (Timer 모드)
        productionTurns: 2   // 2턴 소요 (Turn 모드)
    }
]
```

위 예시에서 `CurrencyType.People`은 생산 시작 시 즉시 차감됩니다. 차감된 `People`은 이후 회복 로직에 의해 활성 주택/건물의 `providesPeople` 합계까지만 회복됩니다.

---

## 5. 생산 로직 (UnitProduction) 연동
`src/gsdk/src/interactives/building/buildingobjs/unitproduction.ts`를 업데이트합니다.

### 5-1. WalletManager 접근 방식
`UnitProduction`은 비용 검증과 차감을 위해 `WalletManager`가 필요합니다. 구현은 **생성자 주입 방식**을 사용합니다.

- `UnitProduction` 생성자에 `wallet: WalletManager`를 추가합니다.
- `BuildingManager`가 `new UnitProduction(...)`을 호출할 때 `this.service.ctx.wallet`을 전달합니다.
- 비용 검증은 `wallet.hasEnough(cost)`, 차감은 `wallet.subtractMany(cost)`를 사용합니다.
- 자원 부족 알림은 기존 UI 이벤트와 맞춰 `EventTypes.AlarmNormal` 또는 `EventTypes.Toast` 중 하나로 통일합니다. 본 설계에서는 Selection/건설 알림과 같은 `EventTypes.AlarmNormal`을 사용합니다.

### 5-2. 하드코딩 값 교체
현재 `unitProductionTime = 5.0`이 하드코딩되어 있습니다. 커맨드 정의에서 값을 읽도록 교체합니다.

```typescript
// 변경 전
private readonly unitProductionTime = 5.0;

// 변경 후: startProduction() 에서 커맨드 데이터 기반으로 설정
const cmd = this.property.commands?.find(c => c.type === "produce" && c.targetId === allyId);
this.unitProductionTime = cmd?.productionTime ?? 5.0;
this.unitProductionTurnsRemaining = cmd?.productionTurns ?? 1;
```

`unitProductionTime`은 커맨드별로 변경될 수 있으므로 `readonly`를 제거하거나, `activeProductionTime` 같은 런타임 필드로 분리합니다.

### 5-3. 생산 시작 — 검증 및 자원 차감
```
startProduction(allyId):
  1. if (isProducing || isUpgrading) → return  [기존 가드 유지]
  2. cost = commands에서 allyId에 해당하는 cost 조회
  3. if cost 존재 && !wallet.hasEnough(cost):
       → EventTypes.AlarmNormal 이벤트로 "자원 부족" 알림 표시 후 return
  4. wallet.subtractMany(cost)  → Gold/People 등 비용 즉시 차감
  5. unitProductionTime / unitProductionTurnsRemaining 설정  [5-2 참고]
  6. isProducing = true, currentUnit = allyId  [기존 로직 유지]
```

`subtractMany()`는 내부적으로 한 번 더 `hasEnough()`를 확인하므로, 차감 실패 시에도 생산 상태를 시작하지 않아야 합니다.

### 5-4. Timer 모드 진행
`onUpdate(delta)`는 `currentMode === BuildingMode.Timer`일 때만 생산 타이머를 누적합니다. `unitProductionTimer`가 `unitProductionTime`에 도달하면 `spawnUnit()`을 호출합니다.

`getSpecificProgress()`는 `unitProductionTimer / unitProductionTime`을 반환하며 SelectionPanel이 폴링합니다.

### 5-5. Turn 모드 진행
턴제 생산은 `BaseBuilding.advanceTurn()`에 생산 전용 상태를 직접 추가하지 않고, `UnitProduction.onAdvanceTurn()`에서 처리합니다. `BaseBuilding.advanceTurn()`은 이미 자식 훅인 `onAdvanceTurn()`을 호출합니다.

```typescript
protected onAdvanceTurn(): void {
    if (this.currentMode !== BuildingMode.Turn || !this.isProducing) return;

    this.unitProductionTurnsRemaining--;
    if (this.unitProductionTurnsRemaining <= 0) {
        this.spawnUnit();
    }
}
```

업그레이드 턴 처리는 현재 `upgradeTimer / upgradeTime`을 사용하므로, 문서나 코드에서 존재하지 않는 `upgradeTurnsRemaining` 필드를 전제로 구현하지 않습니다.

### 5-6. 생산 완료
`spawnUnit()`이 `EventTypes.UnitProduced` 이벤트를 발생시키면 `SquadManager`가 Reserve에 유닛을 추가합니다. 별도 구현 불필요.

---

## 6. UI 피드백
`SelectionPanel`은 이미 `getSelectionData()`를 통해 빌딩 상태를 폴링합니다. 다음 두 가지만 연동하면 됩니다.

### 6-1. 버튼 비활성화
`getSelectionData()`에서 반환하는 `ICommand` 객체의 `isDisabled()` 함수를 수정합니다.

```typescript
// unitproduction.ts의 getSelectionData() 내 커맨드 생성 부분
{
    id: cmd.id,
    name: cmd.name,
    icon: cmd.icon,
    isDisabled: () => this.isProducing,   // 생산 중일 때 전체 커맨드 비활성화
    onClick: () => this.startProduction(cmd.targetId),
}
```

### 6-2. 남은 시간/턴 텍스트
`getStatusText()`가 이미 SelectionPanel의 **상태 텍스트 영역**에 표시됩니다. 남은 수치를 포함하도록 반환값을 수정합니다.

```typescript
// Timer 모드
getStatusText(): string {
    if (this.isProducing) {
        const remaining = Math.ceil(this.unitProductionTime - this.unitProductionTimer);
        return `${this.currentUnit} 생산 중... (${remaining}초)`;
    }
    return "대기 중";
}
```

턴 모드의 경우 `"${this.currentUnit} 생산 중... (${this.unitProductionTurnsRemaining}턴)"` 형태로 표시합니다.

> **주의**: 남은 시간 표시는 각 커맨드 버튼의 뱃지가 아닌 SelectionPanel 하단의 **statusText 영역**에 표시됩니다. 현재 UI 구조상 버튼별 개별 뱃지는 지원되지 않습니다.

---

## 7. 구현 순서
1. `buildingdefs.ts`: `ProduceCommandTemplate`에 `cost`, `productionTime`, `productionTurns` 속성 추가.
2. `buildingdefs.ts`: 각 생산 건물 커맨드 데이터에 비용과 소요 시간/턴 값 기입.
3. `unitproduction.ts`: 생성자에 `WalletManager`를 주입받도록 추가.
4. `buildingmanager.ts`: `new UnitProduction(...)` 호출 시 `this.service.ctx.wallet` 전달.
5. `unitproduction.ts`: 하드코딩된 `unitProductionTime = 5.0`을 커맨드 데이터 기반 런타임 필드로 교체.
6. `unitproduction.ts`: `startProduction()`에 `hasEnough()` 검증, `subtractMany()` 차감, AlarmNormal 실패 알림 추가.
7. `unitproduction.ts`: Timer 모드에서는 `onUpdate()`, Turn 모드에서는 `onAdvanceTurn()`만 생산을 진행하도록 모드 가드 추가.
8. `unitproduction.ts`: `getSelectionData()`의 `isDisabled()` 및 `getStatusText()`를 생산 진행 상태 반영하도록 수정.
9. 인구 회복 시스템: 활성 건물의 `providesPeople` 합계를 `peopleCapacity`로 계산하고, 턴/시간 회복 시 `CurrencyType.People`을 `peopleCapacity` 이하로 clamp.
10. 건물 완성/파괴/제거/로드 복원 경로에서 `peopleCapacity` 재계산 및 현재 `People` clamp 처리.
11. 구현 후 `npm run build`로 빌드를 확인.

---

## 8. 테스트 및 검증 시나리오
- 비용이 충분하면 유닛 생산 시작 시 `Gold`, `People`이 즉시 차감된다.
- 비용이 부족하면 생산 상태가 시작되지 않고, `UnitProduced` 이벤트가 발생하지 않는다.
- Timer 모드에서는 프레임 업데이트로 생산이 완료되고, Turn 모드에서는 턴 진행으로만 생산이 완료된다.
- 생산 중에는 생산 커맨드가 비활성화되고, 남은 시간/턴 텍스트가 표시된다.
- 생산 완료 시 `EventTypes.UnitProduced`가 발행되고 `SquadManager` reserve 수량이 증가한다.
- `People` 회복은 활성 건물의 `providesPeople` 합계를 넘지 않는다.
- 주택 완성, 파괴, 제거, 세이브 로드 후 `peopleCapacity`와 현재 `People` 값이 일관되게 유지된다.
