# 부대 및 유닛 관리 시스템 설계 (Squad & Troop Management System)

## 1. 개요

본 문서는 플레이어가 생산한 지상 유닛을 대기 병력(Reserve)으로 보관하고, 선택한 부대(Squad)에 편성한 뒤 전투 진입 시 `AllySpawnSpec[]`로 변환하는 시스템을 정의합니다.

핵심 흐름은 다음과 같습니다.

```text
유닛 생산 건물 -> UnitProduced 이벤트 -> SquadManager reserve -> Squad 편성 -> CityCombatContextStore.allies
```

함대/함선 정비는 `fleet-management-system-design.md`의 `FleetManagementState`가 담당합니다. v1에서 Squad 시스템은 지상 부대 편성만 다루며, Fleet UI와 병합하지 않습니다. 이후 수송선이나 상륙전이 필요하면 Fleet의 cargo 또는 attachment 모델에서 `Squad`를 참조하는 방식으로 확장합니다.

## 2. 데이터 아키텍처

부대 데이터의 Source of Truth는 신규 `SquadManager`가 담당합니다.

- **경로:** `src/gsdk/src/actors/allies/ally/squadmanager.ts`
- **역할:** 플레이어의 대기 병력, 부대 편성, 선택 부대를 관리합니다.
- **전투 연동:** 선택된 부대를 `AllySpawnSpec[]`로 변환하여 `CityCombatContextStore`에 전달합니다.

### 2.1 타입 정의

`AllyId`는 `src/gsdk/src/actors/allies/allytypes.ts`에 정의된 enum입니다. v1 부대 시스템은 현재 존재하는 `Warrior`, `Archer`, `Mage`만 생산/편성 대상으로 사용합니다.

```typescript
export enum AllyId {
    Warrior = "Warrior",
    Archer = "Archer",
    Mage = "Mage",
}

export interface SquadMember {
    allyId: AllyId;
    deckLevel: number;
}

export interface Squad {
    id: string;
    name: string;
    maxSize: number;
    members: SquadMember[];
}
```

신규 유닛을 추가할 때는 문자열만 추가하지 말고 `AllyId`, `AllyDb`, 생산 명령 정의를 함께 확장해야 합니다. 현재 `buildingDefs`에 남아 있는 `marine`, `hero` 같은 문자열은 `AllyId`에 등록되기 전까지 Squad 생산 대상으로 사용하지 않습니다.

### 2.2 SquadManager 최소 API

```typescript
export class SquadManager {
    private reserveUnits = new Map<AllyId, number>();
    private squads: Squad[] = [];
    private selectedSquadId: string | null = null;

    getReserveSnapshot(): ReadonlyMap<AllyId, number>;
    getSquadSnapshot(): readonly Squad[];
    getSelectedSquad(): Squad | undefined;

    addReserve(allyId: AllyId, count: number): void;
    assignMember(squadId: string, allyId: AllyId, deckLevel: number): boolean;
    unassignMember(squadId: string, memberIndex: number): boolean;
    selectSquad(squadId: string | null): void;
    toAllySpawnSpecs(squadId?: string): AllySpawnSpec[] | undefined;
}
```

동작 규칙은 다음과 같습니다.

- `assignMember()`는 reserve 수량이 1 이상이고 `members.length < maxSize`일 때만 성공합니다.
- `unassignMember()`는 제거한 멤버의 `allyId`를 reserve에 1개 돌려놓습니다.
- `selectSquad(null)`은 선택을 해제합니다.
- `toAllySpawnSpecs()`는 선택 부대가 없거나 멤버가 비어 있으면 `undefined`를 반환합니다. 이 값은 기본 아군 폴백을 의도적으로 사용하게 합니다.

## 3. 유닛 생산 연동

기존 `UnitProduction`은 생산 완료 시 `EventTypes.SpawnProjectile`을 보내고 있습니다. Squad 시스템에서는 월드에 즉시 소환하지 않고, 생산 결과를 대기 병력으로 편입합니다.

### 3.1 신규 이벤트

`src/gsdk/src/types/globaltypes.ts`의 `EventTypes`에 다음 이벤트를 추가합니다.

```typescript
UnitProduced = "unitproduced",
```

payload는 `AllyId` 기반으로 통일합니다.

```typescript
export type UnitProducedPayload = {
    allyId: AllyId;
    count: number;
    buildingId: string;
};
```

### 3.2 생산 명령 타입 정리

현재 `CommandTemplate.targetId`는 `string`입니다. Squad 생산 경로에서는 `targetId`를 임의 문자열로 캐스팅하지 말고 `AllyId`가 되도록 타입을 좁힙니다.

권장 형태는 command type을 분리하는 것입니다.

```typescript
type ProduceCommandTemplate = {
    id: string;
    name: string;
    icon: string;
    shortcut?: string;
    type: "produce";
    targetId: AllyId;
};

type ResearchCommandTemplate = {
    id: string;
    name: string;
    icon: string;
    shortcut?: string;
    type: "research";
    targetId: string;
};

export type CommandTemplate =
    | ProduceCommandTemplate
    | ResearchCommandTemplate
    | ActionCommandTemplate
    | CustomCommandTemplate;
```

이후 `buildingDefs`의 생산 명령은 다음처럼 현재 존재하는 `AllyId`를 사용합니다.

```typescript
commands: [
    { id: "spawn_warrior", name: "전사 훈련", icon: "⚔️", type: "produce", targetId: AllyId.Warrior },
    { id: "spawn_archer", name: "궁수 훈련", icon: "🏹", type: "produce", targetId: AllyId.Archer },
    { id: "spawn_mage", name: "마법사 훈련", icon: "✨", type: "produce", targetId: AllyId.Mage },
]
```

### 3.3 UnitProduction 변경

`src/gsdk/src/interactives/building/buildingobjs/unitproduction.ts`의 `currentUnit`과 `startProduction()`은 `AllyId`를 사용합니다.

```typescript
private currentUnit: AllyId | null = null;

private startProduction(allyId: AllyId): void {
    if (this.isProducing || this.isUpgrading) return;
    this.isProducing = true;
    this.currentUnit = allyId;
    this.unitProductionTimer = 0;
}

private spawnUnit(): void {
    if (this.currentUnit) {
        this.eventCtrl.SendEventMessage(EventTypes.UnitProduced, {
            allyId: this.currentUnit,
            count: 1,
            buildingId: this.id,
        } satisfies UnitProducedPayload);
    }

    this.isProducing = false;
    this.currentUnit = null;
}
```

`SquadManager`는 `UnitProduced` 이벤트를 수신하여 `reserveUnits`를 증가시킵니다. `count`는 1 이상의 정수만 허용하고, 잘못된 값은 무시하거나 경고 로그를 남깁니다.

## 4. 부대 관리 UI

신규 다이얼로그 `SquadView`를 추가합니다.

- **경로:** `src/gsdk/src/ux/dialog/souldialog/views/squadview.ts`
- **좌측:** 부대 목록, 선택 상태, 편성 슬롯, 빈 슬롯
- **우측:** reserve 유닛 목록과 수량
- **상호작용:** reserve 유닛 클릭 또는 Drag & Drop으로 배치, 편성 슬롯 클릭으로 해제

기존 `inventoryview.ts`, `skillslotsview.ts`의 HTML5 Drag & Drop 패턴을 재사용합니다.

```typescript
dataTransfer.setData("text/plain", JSON.stringify({
    source: "reserve",
    allyId,
}));
```

### 4.1 DialogStore 확장 불필요

현재 `SoulDlgFactory`는 각 view에 props와 콜백을 주입하고, 변경 시 `DialogManager.updateWhere()`로 열린 다이얼로그를 갱신하는 패턴을 사용합니다. 따라서 v1에서는 `DialogStore`에 squad 상태를 추가하지 않습니다.

`SoulDlgFactory`에 `openSquad()`를 추가하고, `SquadManager`의 스냅샷과 콜백을 `SquadView` props로 전달합니다.

```typescript
type SquadViewProps = {
    squads: readonly Squad[];
    reserveUnits: ReadonlyMap<AllyId, number>;
    selectedSquadId: string | null;
    onSelectSquad: (squadId: string | null) => void;
    onAssign: (squadId: string, allyId: AllyId, deckLevel: number) => void;
    onUnassign: (squadId: string, memberIndex: number) => void;
};
```

변경 후에는 최신 스냅샷으로 `manager.updateWhere("squad", nextProps)`를 호출합니다.

### 4.2 등록 지점

- `src/gsdk/src/ux/dialog/souldialog/souldlgtypes.ts`: `DialogType`에 `'squad'` 추가
- `src/gamefab/souldlgfab.ts`: `SquadView` import, `manager.registry.register('squad', () => new SquadView())`, `openSquad()` 추가
- `src/gsdk/src/ux/dialog/souldialog/dlgmanager.ts`: `titleFor()`에 `'squad'` 제목 추가
- `src/gamestates/simcitystate.ts`: radial menu 또는 지휘 본부 상호작용에서 `soulDlg.openSquad()` 호출

## 5. 전투 연동

전투 진입 경로는 두 가지이며, 모두 `BaseCityCombat.startAllies()`를 통해 아군을 소환합니다.

1. **방어 전투:** `src/gamestates/simcitystate.ts`의 `enterCityDefense()`에서 `CityCombatContextStore.set({ mode: CityCombatMode.PlayerDefense, allies })` 호출
2. **공격 전투:** `src/gamestates/rivalcityviewstate.ts`의 공격 메뉴에서 `CityCombatContextStore.set({ mode: CityCombatMode.RivalAssault, allies })` 호출

`SquadManager.toAllySpawnSpecs()`가 `AllySpawnSpec[] | undefined`를 반환하게 하고, 전투 컨텍스트에는 그 값을 그대로 전달합니다.

```typescript
const allies = squadManager.toAllySpawnSpecs();

CityCombatContextStore.set({
    mode: CityCombatMode.PlayerDefense,
    returnModeId: GameModeId.Simcity,
    planetId: placement?.planetId,
    attackerCityId,
    allies,
});
```

`CityCombatContextStore`는 `allies`가 `undefined`일 때만 `DefaultCityCombatAllies`를 사용합니다. 따라서 선택 부대가 없거나 비어 있으면 `allies: undefined`가 되어 기본 아군(Warrior, Archer, Mage 각 deckLevel 1)이 사용됩니다.

빈 배열 `[]`을 넘기면 기본 아군이 적용되지 않으므로, Squad 시스템은 빈 부대를 `[]`로 반환하지 않습니다.

## 6. 구현 순서

1. `EventTypes.UnitProduced`와 `UnitProducedPayload`를 추가합니다.
2. `CommandTemplate`의 `produce` 명령을 `targetId: AllyId`로 좁히고, `buildingDefs`의 생산 명령을 `AllyId.Warrior`, `AllyId.Archer`, `AllyId.Mage` 기준으로 정리합니다.
3. `UnitProduction`의 `currentUnit`, `startProduction()`, `spawnUnit()`을 `AllyId` 기반으로 변경합니다.
4. `SquadManager`를 생성하고 `UnitProduced` 이벤트 수신, reserve 증감, squad 편성, 선택 부대 변환 API를 구현합니다.
5. `SquadView`와 `SoulDlgFactory.openSquad()`를 추가하고, `DialogType`, registry, title 등록을 연결합니다.
6. `simcitystate.ts`와 `rivalcityviewstate.ts`의 전투 진입 시점에서 `SquadManager.toAllySpawnSpecs()`를 `CityCombatContextStore`에 전달합니다.
7. 문서/코드 변경 후 `cd src/gsdk && npm run build`로 빌드를 확인합니다.
