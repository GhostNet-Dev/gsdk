# 전투 디버그 모드 시스템 설계 (Combat Debug Mode Design)

## 1. 개요 (Overview)

본 문서는 `CityCombatState`가 라우팅하는 `BaseCityCombat` 하위 전투 상태(라이벌 도시 공방전, 플레이어 방어전 등)의 내부 상태를 시각적으로 확인하기 위한 **컴뱃 디버그 모드(Combat Debug Mode)** 구현 설계를 정의합니다.

디버그 대상 범위는 유닛(Monster, Ally)뿐 아니라 공격 가능한 방어 건물(`BuildingType.DefenseTurret`)까지 포함합니다. `Wall`, `Bunker` 등 공격 기능이 없는 건물은 시각화 의미가 없으므로 제외합니다.

### 핵심 요구사항
*   **비활성화 시 렌더링/순회 오버헤드 없음:** 디버그 모드가 꺼져 있을 때는 유닛 순회, Three.js Helper 갱신, Geometry 갱신을 수행하지 않습니다. 단, 시스템 인스턴스와 이벤트 리스너 수준의 최소 비용은 존재할 수 있습니다.
*   **쉬운 온/오프 (Toggle):** `F9` 단축키로 런타임에 즉시 켜고 끌 수 있어야 합니다.
*   **아군/적군 색상 구분:** 아군(Ally)은 초록색(`0x00FF00`), 적군(Monster)은 붉은색(`0xFF0000`)으로 통일합니다.
*   **가시성 제공 항목:**
    *   유닛 및 공격 가능한 방어 건물의 데미지 판정/디버그 박스 (Hitbox)
    *   이동 방향 벡터 (Arrow)
    *   공격 사거리 (원)
    *   현재 조준/공격 중인 타겟 위치 (점선)

---

## 2. 아키텍처 및 통합 (Architecture & Integration)

### 2.1. 컴포넌트: `CombatDebugSystem`
디버그 관련 로직을 기존 Actor나 State에 하드코딩하지 않고, 독립된 시스템 클래스로 분리합니다.

*   **경로:** `src/gsdk/src/systems/debugger/combatdebugsystem.ts`
    *   기존 `src/gsdk/src/systems/debugger/debugdiv.ts`와 같은 디렉토리에 위치
*   **역할:** 활성화 상태에서만 유닛(Ally, Monster)과 방어 건물(DefenseTurret)의 물리/전투 상태를 읽어와 Three.js Helper 및 선(Line) 객체들을 갱신합니다.
*   **루프 등록:** `ILoop`을 구현하고 `EventTypes.RegisterLoop`으로 등록합니다. 시스템 루프에 올릴 경우 `LoopType`은 `@Glibs/systems/event/canvas`에서 import해야 합니다.
*   **현재 상태:** `CombatDebugSystem`은 이미 유닛(Ally, Monster)을 대상으로 존재합니다. 방어 건물 확장은 기존 시스템 생성자와 `update()` 순회에 `BuildingManager`를 추가하는 형태로 진행합니다.

```typescript
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { LoopType } from "@Glibs/systems/event/canvas";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Monsters } from "@Glibs/actors/monsters/monsters";
import { Allies } from "@Glibs/actors/allies/allies";
import { BuildingManager } from "@Glibs/interactives/building/buildingmanager";

export class CombatDebugSystem implements ILoop {
    LoopId = 0;
    private isDebugMode = false;

    constructor(
        private readonly scene: THREE.Scene,
        private readonly eventCtrl: IEventController,
        private readonly monsters: Monsters,
        private readonly allies: Allies,
        private readonly buildingManager: BuildingManager,
    ) {
        this.eventCtrl.RegisterEventListener(EventTypes.ToggleCombatDebug, this.onToggleCombatDebug);
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems);
    }

    update(_delta: number): void {
        if (!this.isDebugMode) return;
        // 활성화 상태에서만 유닛·건물 순회 및 visual 갱신
    }

    dispose(): void {
        this.eventCtrl.DeregisterEventListener(EventTypes.ToggleCombatDebug, this.onToggleCombatDebug);
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
        this.clearVisuals();
    }
}
```

### 2.2. 토글 이벤트와 입력 바인딩
*   **이벤트 정의:** `src/gsdk/src/types/globaltypes.ts`의 `EventTypes`에 `ToggleCombatDebug = "togglecombatdebug"`를 추가합니다.
*   **단축키:** `src/gsdk/src/systems/inputs/input.ts`에서 `F9`를 권장 단축키로 사용합니다.
*   **입력 구현 방향:** `ActionType` 문자열 유니언에 디버그 액션을 억지로 추가하지 않습니다. `keydown` 처리에서 `e.code === "F9"`인 경우 `EventTypes.ToggleCombatDebug`를 직접 발행하는 디버그 전용 분기를 둡니다.

```typescript
window.addEventListener("keydown", (e) => {
    if (e.code === "F9") {
        this.eventCtrl.SendEventMessage(EventTypes.ToggleCombatDebug);
        return;
    }

    const action = keyMap[e.code];
    // 기존 입력 처리 유지
});
```

### 2.3. `BaseCityCombat` 통합
`CombatDebugSystem`은 `BaseCityCombat`에서 생성하고 전투 종료 시 해제합니다.

*   `Init()` 흐름에서 `Monsters`, `Allies`, `BuildingManager` 참조를 전달해 인스턴스를 생성합니다. `BaseCityCombat`은 이미 세 참조를 모두 보유합니다.
    *   `TargetRegistrySystem`은 별도로 전달하지 않습니다. 공격 대상 정보는 각 actor의 `GetDebugInfo()` 반환값(`currentTargetBounds`, `currentTargetCenter`)에 이미 담겨 있으므로 `CombatDebugSystem`이 외부에서 재조회할 필요가 없습니다.
*   `BaseCityCombat.update(delta)`는 이미 concrete 메서드이므로 별도 호출 훅이 필요하다면 이 위치에서 연결합니다. `updateMode()`는 abstract이므로 디버그 공통 로직을 넣지 않습니다.
*   `Uninit()`에서 `combatDebugSystem.dispose()`를 호출해 루프 등록과 씬 리소스를 함께 정리합니다.
*   `BaseCityCombat` 로딩 완료 콜백에서 자동으로 `EventTypes.ToggleCombatDebug`를 발행하는 코드는 디버그 임시 코드로 봅니다. 기본 요구사항은 F9/DBG 버튼을 통한 명시적 토글이므로, 자동 토글은 제거하거나 개발 전용 플래그 뒤로 이동합니다.

---

## 3. 타입 및 데이터 추출 (Types & Data Extraction)

### 3.1. strict type 권장
팀, 시각화 종류, 토글 상태는 문자열 리터럴을 직접 흩뿌리지 않고 enum 또는 `as const` 기반 strict type으로 정의합니다.

`CombatDebugVisualKind`는 개별 visual on/off 토글이나 UI 필터를 추가할 계획이 있을 때만 유지합니다. 현재처럼 모든 visual을 한 번에 켜고 끄는 구조라면 사용되지 않는 enum으로 남기지 말고 제거해도 됩니다.

```typescript
export enum CombatDebugTeam {
    Ally = "ally",
    Monster = "monster",
}
```

### 3.2. `IDebuggableActor` 인터페이스
캡슐화를 깨지 않기 위해 유닛 및 방어 건물 클래스에 `GetDebugInfo()` 메서드를 추가합니다.

*   `IMonsterCtrl`, `IAllyCtrl`에는 필수 메서드로 선언합니다.
*   `IBuildingObject`에는 **optional**(`?`)로 선언합니다. 공격 기능이 없는 건물(`Wall`, `Bunker` 등)은 구현하지 않아도 되며, `CombatDebugSystem`은 메서드가 없거나 반환값이 `undefined`이면 해당 건물을 자동으로 스킵합니다.

```typescript
export interface CombatDebugInfo {
    team: CombatDebugTeam;
    targetId: string;
    damageBox: THREE.Mesh;                // material 접근이 필요하므로 THREE.Mesh 유지
    box: THREE.Box3;                      // geometry 계산 결과 (Hitbox 렌더링용)
    centerPos: THREE.Vector3;             // 발사체 발사 원점 또는 객체 중심
    moveDirection: THREE.Vector3;         // 유닛: 이동 벡터, 건물: Vector3(0,0,0)
    attackRange: number;                  // 실제 공격 사거리
    currentTargetId?: string;
    currentTargetBounds?: THREE.Box3;
    currentTargetCenter?: THREE.Vector3;
}

export interface IDebuggableActor {
    GetDebugInfo(): CombatDebugInfo;
}

export interface IBuildingObject {
    // 기존 필드/메서드 생략
    GetDebugInfo?(): CombatDebugInfo | undefined;
}
```

> **`damageBox` 타입 주의:** 현재 `CombatDebugSystem`은 별도의 `THREE.Box3Helper`를 생성하지 않고, `damageBox.material`에 접근해 팀 색상을 오버라이드한 뒤 `damageBox` 기준으로 `THREE.Box3`를 계산합니다. 따라서 `damageBox`는 실제 material이 있는 `THREE.Mesh`여야 합니다.
>
> 건물(`DefenseTurret`)의 root `mesh`가 `THREE.Group` 또는 일반 `THREE.Object3D`인 경우, 색상 변경 대상 mesh와 건물 전체 bounds 기준을 혼동하지 않아야 합니다. 단순히 "첫 번째 Mesh 자식"만 반환하면 공격 범위 원과 박스가 건물 일부에 맞춰질 수 있습니다. 구현 시에는 다음 중 하나를 선택합니다.
> *   현재 `CombatDebugInfo` 유지: 건물 전체를 대표할 수 있는 debug mesh를 명확히 선택하고, `box`는 root object 전체 bounds로 계산해 반환합니다. 단, 현재 시스템이 `damageBox`로 box를 재계산한다면 시스템도 `info.box`를 존중하도록 수정해야 합니다.
> *   타입 확장: `damageBox: THREE.Mesh`는 material 색상 변경 대상, `boundsObject: THREE.Object3D` 또는 `debugBounds: THREE.Box3`는 박스/공격 범위 계산 대상으로 분리합니다.
>
> ```typescript
> // DefenseTurret.GetDebugInfo() 내부 예시
> const debugMesh = this.findDebugMesh(this.mesh);
> if (!debugMesh) return undefined;
> ```

`GetDebugInfo()` 구현 기준:

**유닛 (Monster / Ally) 공통:**
*   `attackRange`는 `pendingAttackRange`가 아니라 반드시 `this.Spec.AttackRange`를 사용합니다. `pendingAttackRange`는 knock-back 계산용 컨텍스트입니다.
*   `moveDirection`은 기존 public vector를 `clone()`해서 반환합니다. 원본 vector가 외부에서 수정되지 않도록 합니다.
*   `currentTarget`은 controller 내부 private 필드이므로 `GetDebugInfo()` 안에서만 읽습니다.
*   `currentTargetBounds`는 `target.kind === "structure"`이고 `target.bounds`가 유효하면 이를 복사하고, 그 외에는 `new THREE.Box3().setFromObject(target.object)`로 계산합니다.

**방어 건물 (DefenseTurret) 전용:**
*   `GetDebugInfo()` 반환 타입은 `CombatDebugInfo | undefined`로 둡니다.
*   다음 경우에는 `undefined`를 반환해 `CombatDebugSystem`이 해당 visual bundle을 제거하게 합니다.
    *   건물이 파괴되었거나 `mesh.parent`가 없어 scene에서 제거된 경우
    *   공격 기능 또는 유효한 weapon 정의가 없는 경우
    *   material 색상을 변경할 수 있는 유효한 `THREE.Mesh`를 찾지 못한 경우
*   `team`: 플레이어 소유이므로 `CombatDebugTeam.Ally`를 사용합니다. 별도 `Structure` enum 값은 불필요합니다.
*   `attackRange`: `this.baseSpec.AttackRange`는 초기 스펙값으로 weapon 유효 사거리와 다를 수 있습니다. `GetDebugInfo()` 내부에서는 같은 클래스의 `private this.getAttackRange()`에 접근 가능하므로 이를 사용합니다.
*   `centerPos`: 실제 터렛/발사 기준점이 별도로 없다면 `this.mesh.position.clone()`을 사용합니다.
*   `rangeCenter`: 별도 필드를 추가하지 않는 경우 공격 범위 원의 중심은 `centerPos` 또는 root object 전체 bounds 중심을 기준으로 해야 합니다. "첫 번째 Mesh 자식"의 위치를 범위 원 중심으로 삼지 않습니다.
*   `moveDirection`: `new THREE.Vector3(0, 0, 0)` — 건물은 이동하지 않으므로 화살표가 자동으로 숨겨집니다.
*   `currentTargetBounds` / `currentTargetCenter`: private `this.target`(TargetRecord)에서 직접 읽습니다. `this.target`이 없으면 두 필드 모두 undefined를 반환합니다.

### 3.3. 객체 순회 패턴
`CombatDebugSystem`은 `Monsters`, `Allies`, `BuildingManager` 인스턴스를 받아 순회합니다. 반드시 `live` 체크(또는 건설 완료 여부)를 통해 유효한 객체만 처리하고, 이번 프레임에 관측되지 않은 객체의 visual은 제거합니다.

```typescript
const visibleActorIds = new Set<string>();

// 1. 몬스터 순회
for (const sets of monsters.monsters.values()) {
    for (const set of sets) {
        if (!set.live) continue;
        const info = set.monCtrl.GetDebugInfo();
        visibleActorIds.add(info.targetId);
        this.updateActorVisual(info);
    }
}

// 2. 아군 순회
for (const sets of allies.allies.values()) {
    for (const set of sets) {
        if (!set.live) continue;
        const info = set.allyCtrl.GetDebugInfo();
        visibleActorIds.add(info.targetId);
        this.updateActorVisual(info);
    }
}

// 3. 방어 건물 순회 — IBuildingObject.GetDebugInfo?()가 구현된 경우만 처리
for (const building of buildingManager.getBuildings()) {
    const info = building.GetDebugInfo?.();
    if (!info) continue;
    visibleActorIds.add(info.targetId);
    this.updateActorVisual(info);
}

this.removeMissingActorVisuals(visibleActorIds);
```

### 3.4. 타겟 정보 캡슐화
`CombatDebugSystem`은 `TargetRegistrySystem`을 직접 조회하지 않습니다. 공격 대상 정보는 각 actor의 `GetDebugInfo()` 반환값에 이미 포함되어 있습니다.

*   `currentTargetBounds`: 타겟의 `THREE.Box3` (structure면 stored bounds, unit이면 `setFromObject` 계산값)
*   `currentTargetCenter`: 타겟의 중심 좌표

`TargetRecord` 접근은 각 controller / building 클래스의 `GetDebugInfo()` 내부에서만 이루어집니다. 이 구조는 `CombatDebugSystem`이 내부 targeting API에 결합되지 않도록 격리합니다.

---

## 4. 시각화 세부 구현 (Visualization Details)

디버깅 요소는 material 색상 변경 대상 mesh, 내부 `THREE.Box3`, `THREE.ArrowHelper`, 커스텀 Line을 조합하여 그립니다. 매 프레임 새 helper를 생성하지 않고, `targetId` 기준의 visual bundle을 재사용합니다.

### 4.1. visual bundle 재사용
actor별로 hitbox, 이동 화살표, 공격 범위, 타겟 점선을 묶어 관리합니다.

```typescript
type CombatDebugVisualBundle = {
    team: CombatDebugTeam;
    box: THREE.Box3;
    damageBox: THREE.Mesh;
    previousDamageBoxVisible: boolean;
    previousDamageBoxColors: (THREE.Color | undefined)[];
    moveArrow: THREE.ArrowHelper;
    attackRange: THREE.Line;
    targetLine: THREE.Line;
};

private readonly visuals = new Map<string, CombatDebugVisualBundle>();
```

*   `targetId`가 처음 등장할 때만 bundle을 생성합니다.
*   이후 프레임에서는 geometry position attribute, 내부 box, arrow direction/length만 갱신합니다.
*   `set.live === false`, actor release, 전투 종료 등으로 더 이상 관측되지 않는 `targetId`는 해당 bundle만 제거합니다.
*   `targetId`가 같더라도 `damageBox` 참조가 바뀌면 이전 mesh의 visible/color 상태를 복구한 뒤 새 mesh 상태를 저장합니다.

### 4.2. 데미지 판정 박스 (Hitbox)
*   **현재 구현:** `THREE.Box3Helper`가 아니라 `damageBox` mesh 자체를 표시하고 material 색상을 팀 색으로 임시 변경합니다.
*   **동작:** `damageBox.updateWorldMatrix(true, false)` 후 `THREE.Box3().setFromObject(damageBox)` 또는 `CombatDebugInfo.box`를 사용해 box를 갱신합니다. 방어 건물은 root object bounds와 색상 변경 대상 mesh가 다를 수 있으므로, 시스템이 `info.box`를 존중하도록 수정하거나 타입을 분리합니다.
*   **색상:** Ally (`0x00FF00`), Monster (`0xFF0000`)
*   **복구:** 토글 Off, actor 제거, 전투 종료 시 `damageBox.visible`과 material color를 원래 값으로 되돌립니다.

### 4.3. 이동 방향 (Movement Direction)
*   **구현:** 유닛의 `centerPos`에서 `moveDirection` 방향으로 `THREE.ArrowHelper`를 그립니다.
*   **길이:** 방향 벡터가 거의 0이면 화살표를 숨기거나 길이를 0으로 둡니다. 표시 길이는 실제 속도가 아니라 디버그 가시성을 위한 고정 길이(예: 2~3m)를 사용합니다.
*   **참고:** 이동 "목표 지점"이 아닌 이동 "방향 벡터"입니다. 목표점 표시가 필요하면 `CombatDebugInfo`에 `moveTarget?: THREE.Vector3`를 별도 추가합니다.

### 4.4. 공격 범위 (Attack Range)
*   **구현:** 유닛/방어 건물의 발 밑 또는 기준점 주변에 원형 `THREE.Line`을 그립니다. 반지름은 `GetDebugInfo().attackRange`를 사용합니다.
*   **중심:** 유닛은 damage box 중심 또는 `centerPos`를 사용할 수 있습니다. `DefenseTurret`은 실제 전투 기준점인 root `mesh.position` 또는 root object 전체 bounds 중심을 사용해야 하며, material 색상 변경용 첫 mesh 자식의 위치를 중심으로 사용하지 않습니다.
*   **갱신:** actor별 line geometry를 재사용하되, attackRange가 바뀌면 원 좌표를 다시 씁니다.
*   **머티리얼:** 면이 채워지지 않은 `THREE.LineBasicMaterial`을 사용하여 시야를 가리지 않도록 합니다.

### 4.5. 공격 타겟 (Attack Target)
*   **구현:** `currentTargetBounds` 또는 `currentTargetCenter`가 있으면 유닛의 `centerPos`에서 타겟 중심 또는 bounds 표면의 최단 지점까지 점선을 그립니다.
*   **머티리얼:** `THREE.LineDashedMaterial`을 사용합니다. 점선 효과 적용을 위해 geometry 갱신 후 `geometry.computeLineDistances()`를 반드시 호출합니다.
*   **구분:** 이동 방향 화살표와 헷갈리지 않도록 dashSize/gapSize를 명확히 두고, 필요하면 색상을 팀 색보다 밝게 보정합니다.

---

## 5. 리소스 해제 및 수명 관리 (Resource Lifetime)

토글 Off 또는 전투 상태 종료 시 모든 visual bundle을 정리합니다.

*   `damageBox`: visual bundle 생성 시 저장한 visible/color 상태를 복구합니다. `damageBox` 자체는 actor/building 소유이므로 dispose하지 않습니다.
*   `ArrowHelper`: `arrow.dispose()` 호출 후 `removeFromParent()`
*   `Line`: `line.geometry.dispose()`, material dispose 후 `removeFromParent()`
*   `LineDashedMaterial`: 공유하지 않는 actor별 material이면 각 bundle 제거 시 dispose합니다. 공유 material을 사용한다면 전체 `CombatDebugSystem.dispose()`에서 한 번만 dispose합니다.

```typescript
private disposeBundle(bundle: CombatDebugVisualBundle): void {
    this.restoreDamageBox(bundle);

    bundle.moveArrow.dispose();
    bundle.moveArrow.removeFromParent();

    bundle.attackRange.geometry.dispose();
    disposeMaterial(bundle.attackRange.material);
    bundle.attackRange.removeFromParent();

    bundle.targetLine.geometry.dispose();
    disposeMaterial(bundle.targetLine.material);
    bundle.targetLine.removeFromParent();
}
```

토글 Off에서는 `clearVisuals()`를 호출해 화면과 GPU 리소스를 즉시 정리합니다. 다시 On이 되면 다음 update에서 필요한 bundle을 새로 생성합니다.

---

## 6. 적용 및 구현 단계 (Implementation Steps)

### 6.1. 이미 적용됨
*   `src/gsdk/src/types/globaltypes.ts`에 `ToggleCombatDebug = "togglecombatdebug"` 이벤트가 정의되어 있습니다.
*   `src/gsdk/src/systems/inputs/input.ts`의 `keydown` 처리에 `F9` 전용 토글 분기가 있습니다.
*   `src/gsdk/src/systems/debugger/combatdebugtypes.ts`에 `CombatDebugInfo`, `IDebuggableActor`, `CombatDebugTeam`이 정의되어 있습니다.
*   `IMonsterCtrl` / `IAllyCtrl`과 `MonsterCtrl` / `AllyCtrl`은 `GetDebugInfo(): CombatDebugInfo`를 통해 `Spec.AttackRange`, `moveDirection.clone()`, private `currentTarget` 기반 정보를 반환합니다.
*   `BaseCityCombat`은 `CombatDebugSystem`을 생성하고 `Uninit()`에서 dispose합니다.

### 6.2. 방어 건물 확장 잔여 작업
1.  **건물 인터페이스 확장**
    *   `src/gsdk/src/interactives/building/ibuildingobj.ts`의 `IBuildingObject`에 `GetDebugInfo?(): CombatDebugInfo | undefined`를 추가합니다.
    *   optional 메서드와 `undefined` 반환을 모두 허용해 비전투 건물과 파괴/제거된 건물을 스킵할 수 있게 합니다.

2.  **`DefenseTurret.GetDebugInfo()` 구현**
    *   `team: CombatDebugTeam.Ally`
    *   `damageBox`: material 색상을 변경할 수 있는 대표 `THREE.Mesh`
    *   `box`: root `mesh`/object 전체 bounds 기준
    *   `centerPos`: 실제 발사/전투 기준점, 기본값은 `this.mesh.position.clone()`
    *   `moveDirection`: `new THREE.Vector3(0, 0, 0)`
    *   `attackRange`: `this.getAttackRange()` (weapon 유효 사거리 반영)
    *   `currentTargetBounds` / `currentTargetCenter`: private `this.target`에서 직접 읽기
    *   파괴됨, scene에서 제거됨, 유효한 weapon 없음, debug mesh 없음이면 `undefined` 반환

3.  **`CombatDebugSystem` 확장**
    *   생성자에 `BuildingManager` 파라미터를 추가합니다.
    *   `update()`에서 `buildingManager.getBuildings()`를 순회하고 `building.GetDebugInfo?.()`가 반환한 info만 visual로 갱신합니다.
    *   `damageBox`와 전체 bounds가 다른 건물을 지원하려면 `updateDamageBox()`가 `info.box`를 덮어쓰지 않도록 수정하거나, `CombatDebugInfo`에 bounds 전용 필드를 추가합니다.
    *   공격 범위 원 중심은 `centerPos` 또는 root object bounds 중심을 사용하고, 첫 mesh 자식 위치에 의존하지 않습니다.

4.  **`BaseCityCombat` 정리**
    *   `new CombatDebugSystem(this.scene, this.eventCtrl, this.monsters, this.allies, this.buildingManager)` 형태로 `BuildingManager`를 전달합니다.
    *   로딩 완료 콜백의 자동 `ToggleCombatDebug` 발행은 제거하거나 개발 플래그 조건으로 감쌉니다.
    *   `updateMode()`가 아니라 `BaseCityCombat` 공통 흐름에서 모든 전투 모드에 동일하게 적용되는 구조는 유지합니다.

---

## 7. 검증 계획 (Test Plan)

문서만 수정한 경우:
*   Markdown 구조와 코드블록 fence가 깨지지 않았는지 확인합니다.
*   코드 변경이 없으므로 빌드는 실행하지 않습니다.

실제 구현을 진행한 경우:
*   코드 수정 후 `npm run build`를 실행합니다.
*   전투 진입 후 `F9`로 디버그 visual이 켜지고 꺼지는지 확인합니다.
*   Ally/Monster 사망 또는 release 시 해당 actor visual만 제거되는지 확인합니다.
*   전투 종료 시 `CombatDebugSystem.dispose()`가 호출되어 scene object와 GPU 리소스가 남지 않는지 확인합니다.
*   비활성 상태에서 유닛 순회와 Three.js visual 갱신이 발생하지 않는지 확인합니다.
*   방어전 진입 후 `F9` → `DefenseTurret`에 공격 범위 원(초록)과 타겟 점선이 표시되는지 확인합니다.
*   `DefenseTurret`이 파괴되면 해당 visual bundle만 제거되는지 확인합니다.
*   `Wall`, `Bunker` 등 비전투 건물에는 visual이 표시되지 않는지 확인합니다.
