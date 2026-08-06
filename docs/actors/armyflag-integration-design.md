# ArmyFlag 연동 설계 문서 (ArmyFlag Integration Design)

## 1. 개요 (Overview)

본 문서는 도시 전투(`CityCombatState`) 모드에서 아군 유닛이 소환되는 위치를 결정하는 기준점으로 `ArmyFlag`(군대 깃발)를 활용하기 위한 설계 가이드입니다.

플레이어는 도시 건설 모드에서 `ArmyFlag`를 배치할 수 있으며, 실제 전투가 발생했을 때 아군 유닛은 기본 스폰 지점이 아닌 깃발이 위치한 곳을 중심으로 소환되어 전략적인 전진 기지 역할을 수행하게 됩니다.

---

## 2. 현재 코드 상태 (Current State)

아래 항목은 이미 구현 완료되어 있습니다. 일부 항목은 실제 연동 전에 정리 또는 추가 등록이 필요합니다.

| 항목 | 파일 | 상태 |
|------|------|------|
| `BuildingType.Flag` Enum | `src/gsdk/src/interactives/building/ibuildingobj.ts` | ✓ 완료 |
| `ArmyFlag` 건물 정의 | `src/gsdk/src/interactives/building/buildingdefs.ts` | ✓ 완료 (`isUnique: true`) |
| `BuildingManager.getBuildings()` | `src/gsdk/src/interactives/building/buildingmanager.ts` | ✓ 완료 |
| `BuildingType.Flag` 주석 | `src/gsdk/src/interactives/building/ibuildingobj.ts` | 정리 필요: 현재 주석이 `벙커`로 되어 있음 |
| `ArmyFlag` 테크트리 노드 | `src/gsdk/src/techtree/techtreedefs.ts` | 추가 필요: `DefaultTechTreeDefs`에 `armyflag` 등록 |

---

## 3. 핵심 요구사항 (Key Requirements)

- **스폰 지점 동적 결정**: 전투 진입 시(`PlayerDefenseState.initMode`) `BuildingManager`에 등록된 건물 중 `ArmyFlag`를 찾아 해당 좌표를 `spawnPos`로 설정합니다. 적 도시 공격(`RivalAssaultState`)에는 적용하지 않습니다.
- **건물 인스턴스화**: `BuildingManager`는 `BuildingType.Flag`를 인식하고 `FlagBuilding` 객체로 생성해야 합니다. (`BaseBuilding` 직접 인스턴스화 불가 — 추상 메서드 존재)
- **테크트리 등록**: `ArmyFlag`는 `DefaultTechTreeDefs`에 `armyflag` 빌딩 노드로 등록되어야 합니다. `BuildingView` 표시만으로는 부족하며, `TechTreeService.canLevelUp()`과 `BuildingManager.startBuild()`가 모두 `TechTreeService.index`를 기준으로 동작합니다.
- **테스트 자동 배치**: `TestSimcityState`에서 건물을 자동 배치할 때, 깃발은 도시의 가장 외곽 그리드에 우선적으로 배치되어야 합니다.
- **UI 노출**: `BuildingView` 다이얼로그에서 `ArmyFlag`를 선택하고 건설할 수 있어야 합니다.

---

## 4. 세부 구현 가이드 (Implementation Details)

### 4.1 FlagBuilding 클래스 신설

`BaseBuilding`은 `getSpecificCommands()`, `getStatusText()`, `getSpecificProgress()` 등의 추상 메서드를 갖고 있으므로 직접 인스턴스화가 불가능합니다. `BaseBuilding`을 상속하는 `FlagBuilding` 클래스를 신설합니다.

```typescript
// src/gsdk/src/interactives/building/buildingobjs/flagbuilding.ts

import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { ICommand } from "@Glibs/ux/selectionpanel/selectionpanel";
import { BuildingProperty } from "../buildingdefs";
import { BuildingType } from "../ibuildingobj";
import { BaseBuilding } from "./basebuilding";

export class FlagBuilding extends BaseBuilding {
    constructor(
        id: string,
        property: BuildingProperty,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: IEventController,
    ) {
        super(id, BuildingType.Flag, property, position, mesh, eventCtrl);
    }

    protected getSpecificCommands(): ICommand[] { return []; }
    protected getStatusText(): string { return "집결 지점"; }
    protected getSpecificProgress(): number | undefined { return undefined; }
}
```

### 4.2 BuildingManager (건물 생성)

`BuildingManager.finishBuild()` 내부의 switch 문에 `Flag` case를 추가합니다.

```typescript
// src/gsdk/src/interactives/building/buildingmanager.ts

import { FlagBuilding } from "./buildingobjs/flagbuilding";

// ...

case BuildingType.Flag:
    buildingObj = new FlagBuilding(id, task.prop, task.pos, model, this.eventCtrl);
    break;
```

`task.pos`는 `if (task.pos) { ... }` 블록 내부에서 사용되므로 `THREE.Vector3`로 안전하게 다룰 수 있습니다.

### 4.3 TechTreeDefs (테크트리 등록)

`BuildingView.prepareDisplayNodes()`는 `allBuildingDefs`에 있는 건물을 표시 목록에 추가할 수 있지만, 실제 활성화와 건설은 `TechTreeService.index`에 등록된 노드를 기준으로 수행됩니다.

따라서 `src/gsdk/src/techtree/techtreedefs.ts`의 `DefaultTechTreeDefs`에 `armyflag` 노드를 추가합니다. 최소 구현 기준으로는 `cc` 보유 후 건설 가능하게 두는 것을 권장합니다. 비용과 밸런스는 별도 조정 대상으로 둡니다.

```typescript
{
    id: "armyflag",
    kind: "building",
    name: "군대 깃발",
    desc: "아군 유닛의 전투 진입 집결 지점을 지정합니다.",
    icon: "🚩",
    rarity: "common",
    tags: ["combat", "utility"],
    requires: [{ type: "has", id: "cc", minLv: 1 }],
    cost: [{ lv: 1 }],
    tech: buildingDefs.ArmyFlag,
}
```

> 대안: 초기부터 무료로 항상 노출해야 한다면 `requires`를 두지 않고 `cost: [{ lv: 1 }]`만 둘 수 있습니다.

### 4.4 PlayerDefenseState (스폰 로직)

스폰 위치 결정과 소환 실행의 책임을 분리하는 기존 아키텍처를 따릅니다. `startAllies()` 내부를 수정하는 대신, `initMode()`의 `spawnPos` 결정 단계에서 ArmyFlag를 조회합니다.

1차 구현에서는 `ArmyFlag` 위치를 그대로 사용합니다. 기존 `findSafeSpawnPos()`는 `IPhysicsObject` probe 인자가 필요하지만, 현재 설계에는 어떤 객체를 probe로 사용할지 정의되어 있지 않습니다. 충돌 보정은 별도 설계 후 적용합니다.

```typescript
// src/gamestates/playerdefensestate.ts

protected async initMode(ctx: CityCombatContext): Promise<boolean> {
    // 1. ArmyFlag 위치 조회 (없으면 CC 기준 폴백)
    const armyFlag = this.buildingManager.getBuildings()
        .find(b => b.property.id === "armyflag");
    const rawSpawnPos = armyFlag
        ? armyFlag.position.clone()
        : this.resolvePlayerCcSpawnPos() ?? new THREE.Vector3(5, 0, 5);

    // 2. 1차 구현: 별도 probe 설계 전까지는 좌표를 그대로 사용
    this.spawnPos = rawSpawnPos;

    // 3. 아군 소환
    await this.startAllies(ctx.allies ?? [], this.spawnPos);
    // ...
}
```

> **범위**: `RivalAssaultState`(적 도시 공격)에서는 ArmyFlag를 사용하지 않습니다. 해당 모드는 `resolveRivalCityEntrySpawnPos()`로 독립적으로 위치를 결정합니다.
>
> **충돌 보정 주의**: 현재 `Allies.Summon()`은 충돌이 감지되면 유닛의 y축 위치를 올리는 방식으로 보정합니다. `ArmyFlag` 주변의 수평 위치까지 안전하게 보정하려면 `findSafeSpawnPos()`에 전달할 별도 probe `IPhysicsObject` 또는 스폰 전용 충돌 검사 유틸을 설계해야 합니다.

### 4.5 TestSimcityState (테스트 배치)

깃발을 도시 가장 바깥쪽에 배치하기 위해 `ArmyFlag`를 일반 건물 목록에서 제외하고, 일반 건물과 방어 건물 배치가 끝난 뒤 별도 단계에서 외곽부터 탐색합니다. `findValidPos`에는 탐색 방향을 제어할 수 있는 파라미터를 도입합니다. `null` 반환 시(배치 불가) 깃발 배치를 건너뜁니다.

```typescript
// src/gamestates/testsimcitystate.ts

const allDefs = Object.values(buildingDefs);
const flagDef = buildingDefs.ArmyFlag;
const normalBuildings = allDefs.filter(d =>
    d.type !== BuildingType.DefenseTurret && d.id !== flagDef.id
);
const defenseBuildings = allDefs.filter(d => d.type === BuildingType.DefenseTurret);

// 1. 일반 건물 배치
// 2. 방어 건물 배치

// 3. 깃발 배치: reverseSearch를 true로 설정하여 외곽부터 탐색
const flagPos = this.findValidPos(flagDef, true);
if (flagPos) {
    const taskId = await this.buildingManager.startBuild(flagDef.id, flagPos);
    if (taskId) {
        await (this.buildingManager as any).finishBuild(taskId);
    }
}

private findValidPos(def: BuildingProperty, reverseSearch: boolean = false): THREE.Vector3 | null {
    const startR = reverseSearch ? maxRadius - 1 : 0;
    const endR = reverseSearch ? -1 : maxRadius;
    const step = reverseSearch ? -1 : 1;

    for (let r = startR; r !== endR; r += step) {
        // ... 나선형 탐색 수행
    }
    return null;
}
```

### 4.6 BuildingView (UI 연동)

`buildingDefs`에 정의된 `ArmyFlag`가 건설 목록에 나타나는 것만으로는 충분하지 않습니다. `BuildingView.prepareDisplayNodes()`는 `allBuildingDefs`에 있는 건물을 목록에 추가하지만, 슬롯 활성화는 `props.canLevelUp(node.id)`에 의존합니다. 실제 건설도 `BuildingManager.startBuild()`에서 `TechTreeService.index.byId.get(nodeId)`를 통과해야 합니다.

따라서 `DefaultTechTreeDefs`에 `armyflag` 노드를 등록하고, 실제 플레이에서 어떤 조건으로 해금할지 정해야 합니다. 권장 기본값은 `cc` 보유 후 무료 건설 가능입니다.

```typescript
// 실패하는 경로 예시
// DefaultTechTreeDefs에 armyflag가 없으면:
// - BuildingView: canLevelUp("armyflag")가 "Tech node 'armyflag' not found"로 실패
// - BuildingManager.startBuild("armyflag"): "invalid building type"으로 실패
```

`TestSimcityState.Init()`에서는 모든 `buildingDefs`의 레벨을 1로 설정하지만, 이 값만으로는 `TechTreeService.index`에 없는 노드를 만들 수 없습니다. 테스트와 실제 플레이 모두에서 `DefaultTechTreeDefs` 등록이 필요합니다.

---

## 5. 검증 계획 (Validation Plan)

1. **문서 구조 확인**: Markdown 제목 계층과 TypeScript 코드 블록이 현재 코드 타입(`ICommand`, `number | undefined`, `FlagBuilding` 생성자)과 맞는지 확인합니다.
2. **빌드 확인**: 이후 코드 구현 단계에서는 사용자 지침에 따라 `npm run build` 또는 repo의 실제 빌드 명령을 실행합니다.
3. **테크트리 등록 확인**: `DefaultTechTreeDefs`에 `armyflag` 노드가 존재하는지 확인합니다.
4. **UI 활성화 확인**: `BuildingView`에서 `ArmyFlag`가 표시되고 enabled 상태인지 확인합니다.
5. **건설 시작 확인**: `BuildingManager.startBuild("armyflag")`가 `invalid building type` 없이 통과하는지 확인합니다.
6. **건물 생성 확인**: `finishBuild` 후 `FlagBuilding` 인스턴스가 `buildingObjects`에 등록되는지 확인합니다.
7. **건설 확인**: `SimcityState`에서 `ArmyFlag`를 건설할 수 있는지 확인합니다.
8. **중복 건설 방지**: `isUnique: true` 설정에 따라 두 번째 건설 시도가 UI 또는 `BuildingManager.canBuild()`에서 막히는지 확인합니다.
9. **테스트 배치 확인**: `TestSimcityState` 실행 시 깃발이 도시 중앙(`cc`)에서 먼 외곽에 배치되는지 확인합니다.
10. **스폰 지점 확인**: `PlayerDefense` 진입 시 아군 유닛이 `ArmyFlag` 주변에서 소환되는지 확인합니다.
11. **폴백 확인**: `ArmyFlag`가 없을 경우 기본 스폰 위치(`resolvePlayerCcSpawnPos` 결과)에서 소환되는지 확인합니다.
12. **전투 중 파괴 동작 확인**: 전투 시작 시 스폰 위치는 1회 결정되므로, 전투 중 ArmyFlag가 파괴되어도 해당 전투의 스폰 위치는 변경되지 않음을 확인합니다.
13. **RivalAssault 미적용 확인**: 적 도시 공격 시 아군이 ArmyFlag 위치가 아닌 `resolveRivalCityEntrySpawnPos()` 결과 위치에서 소환되는지 확인합니다.

---

## 6. 구현 범위 및 보류 사항 (Scope & Deferred Items)

- 이 문서는 설계 보강만 다룹니다. 실제 구현 시에는 `FlagBuilding`, `BuildingManager`, `DefaultTechTreeDefs`, `PlayerDefenseState`, `TestSimcityState`, `BuildingType.Flag` 주석 정리를 각각 반영합니다.
- `ArmyFlag`의 비용과 해금 조건은 최소 구현 기준으로 `cc` 보유 후 무료 건설 가능을 권장합니다. 최종 밸런스 수치는 별도 조정합니다.
- `findSafeSpawnPos()` 기반 수평 충돌 보정은 후속 과제로 둡니다. 적용하려면 스폰 위치 검사 전용 `IPhysicsObject` probe 또는 유닛별 충돌 크기를 대표하는 헬퍼가 필요합니다.
