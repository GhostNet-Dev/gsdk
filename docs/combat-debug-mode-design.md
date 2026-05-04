# 전투 디버그 모드 시스템 설계 (Combat Debug Mode Design)

## 1. 개요 (Overview)

본 문서는 `CityCombatState`가 라우팅하는 `BaseCityCombat` 하위 전투 상태(라이벌 도시 공방전, 플레이어 방어전 등)의 내부 상태를 시각적으로 확인하기 위한 **컴뱃 디버그 모드(Combat Debug Mode)** 구현 설계를 정의합니다.

### 핵심 요구사항
*   **비활성화 시 렌더링/순회 오버헤드 없음:** 디버그 모드가 꺼져 있을 때는 유닛 순회, Three.js Helper 갱신, Geometry 갱신을 수행하지 않습니다. 단, 시스템 인스턴스와 이벤트 리스너 수준의 최소 비용은 존재할 수 있습니다.
*   **쉬운 온/오프 (Toggle):** `F9` 단축키로 런타임에 즉시 켜고 끌 수 있어야 합니다.
*   **아군/적군 색상 구분:** 아군(Ally)은 초록색(`0x00FF00`), 적군(Monster)은 붉은색(`0xFF0000`)으로 통일합니다.
*   **가시성 제공 항목:**
    *   유닛의 데미지 판정 박스 (Hitbox)
    *   이동 방향 벡터 (Arrow)
    *   공격 사거리 (원)
    *   현재 조준/공격 중인 타겟 위치 (점선)

---

## 2. 아키텍처 및 통합 (Architecture & Integration)

### 2.1. 신규 컴포넌트: `CombatDebugSystem`
디버그 관련 로직을 기존 Actor나 State에 하드코딩하지 않고, 독립된 시스템 클래스로 분리합니다.

*   **경로:** `src/gsdk/src/systems/debugger/combatdebugsystem.ts`
    *   기존 `src/gsdk/src/systems/debugger/debugdiv.ts`와 같은 디렉토리에 위치
*   **역할:** 활성화 상태에서만 유닛(Ally, Monster)들의 물리/전투 상태를 읽어와 Three.js Helper 및 선(Line) 객체들을 갱신합니다.
*   **루프 등록:** `ILoop`을 구현하고 `EventTypes.RegisterLoop`으로 등록합니다. 시스템 루프에 올릴 경우 `LoopType`은 `@Glibs/systems/event/canvas`에서 import해야 합니다.

```typescript
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { LoopType } from "@Glibs/systems/event/canvas";
import { EventTypes } from "@Glibs/types/globaltypes";

export class CombatDebugSystem implements ILoop {
    LoopId = 0;
    private isDebugMode = false;

    constructor(
        private readonly scene: THREE.Scene,
        private readonly eventCtrl: IEventController,
    ) {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems);
    }

    update(_delta: number): void {
        if (!this.isDebugMode) return;
        // 활성화 상태에서만 유닛 순회 및 visual 갱신
    }

    dispose(): void {
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

*   `Init()` 흐름에서 `Monsters`, `Allies`, `TargetRegistrySystem` 참조를 전달할 수 있도록 초기화합니다.
*   `BaseCityCombat.update(delta)`는 이미 concrete 메서드이므로 별도 호출 훅이 필요하다면 이 위치에서 연결합니다. `updateMode()`는 abstract이므로 디버그 공통 로직을 넣지 않습니다.
*   `Uninit()`에서 `combatDebugSystem.dispose()`를 호출해 루프 등록과 씬 리소스를 함께 정리합니다.

---

## 3. 타입 및 데이터 추출 (Types & Data Extraction)

### 3.1. strict type 권장
팀, 시각화 종류, 토글 상태는 문자열 리터럴을 직접 흩뿌리지 않고 enum 또는 `as const` 기반 strict type으로 정의합니다.

```typescript
export enum CombatDebugTeam {
    Ally = "ally",
    Monster = "monster",
}

export enum CombatDebugVisualKind {
    Hitbox = "hitbox",
    MoveDirection = "move-direction",
    AttackRange = "attack-range",
    TargetLine = "target-line",
}
```

### 3.2. `IDebuggableActor` 인터페이스
캡슐화를 깨지 않기 위해 `MonsterCtrl` / `AllyCtrl`에 `GetDebugInfo()` 메서드를 추가합니다. 실제 public 타입인 `IMonsterCtrl`(`src/gsdk/src/actors/monsters/monsters.ts`)과 `IAllyCtrl`(`src/gsdk/src/actors/allies/allytypes.ts`)에도 이 메서드를 선언해 캐스팅 의존을 줄입니다.

```typescript
export interface CombatDebugInfo {
    team: CombatDebugTeam;
    targetId: string;
    box: THREE.Box3;                      // actor model Box 또는 controller box에서 계산한 Box3
    centerPos: THREE.Vector3;             // IPhysicsObject.CenterPos
    moveDirection: THREE.Vector3;         // 기존 public moveDirection 값
    attackRange: number;                  // Spec.AttackRange
    currentTargetId?: string;
    currentTargetBounds?: THREE.Box3;     // structure bounds 또는 unit object에서 계산한 Box3
    currentTargetCenter?: THREE.Vector3;
}

export interface IDebuggableActor {
    GetDebugInfo(): CombatDebugInfo;
}
```

`GetDebugInfo()` 구현 기준:
*   `attackRange`는 `pendingAttackRange`가 아니라 반드시 `this.Spec.AttackRange`를 사용합니다. `pendingAttackRange`는 마지막으로 받은 피격의 knock-back 계산용 컨텍스트입니다.
*   `moveDirection`은 `MonsterCtrl` / `AllyCtrl`의 기존 public vector를 clone해서 반환합니다. 외부에서 원본 vector를 직접 수정하지 않도록 합니다.
*   `currentTarget`은 controller 내부 private 필드이므로 `GetDebugInfo()` 안에서만 읽습니다.
*   `currentTargetBounds`는 `target.kind === "structure"`이고 `target.bounds`가 유효하면 이를 복사하고, 그 외에는 `new THREE.Box3().setFromObject(target.object)`로 계산합니다.

### 3.3. 유닛 순회 패턴
`CombatDebugSystem`은 `Monsters`와 `Allies` 인스턴스를 받아 순회합니다. 반드시 `set.live` 체크로 사망 유닛을 제외하고, 이번 프레임에 관측되지 않은 actor의 visual은 제거합니다.

```typescript
const visibleActorIds = new Set<string>();

for (const sets of monsters.monsters.values()) {
    for (const set of sets) {
        if (!set.live) continue;
        const info = set.monCtrl.GetDebugInfo();
        visibleActorIds.add(info.targetId);
        this.updateActorVisual(info);
    }
}

for (const sets of allies.allies.values()) {
    for (const set of sets) {
        if (!set.live) continue;
        const info = set.allyCtrl.GetDebugInfo();
        visibleActorIds.add(info.targetId);
        this.updateActorVisual(info);
    }
}

this.removeMissingActorVisuals(visibleActorIds);
```

### 3.4. 타겟 registry 조회
공격 대상의 `TargetRecord`는 `TargetRegistrySystem`의 실제 API인 `get(id)`로 조회합니다.

```typescript
const target = this.targetRegistry?.get(targetId);
const targetBounds = target?.bounds;
```

`TargetRecord.bounds`는 주로 structure에 명시적으로 유지됩니다. unit 타겟은 record의 `object`에서 `Box3`를 계산하는 fallback을 둡니다.

---

## 4. 시각화 세부 구현 (Visualization Details)

디버깅 요소는 Three.js의 기본 Helper와 커스텀 Line을 조합하여 그립니다. 매 프레임 새 helper를 생성하지 않고, `targetId` 기준의 visual bundle을 재사용합니다.

### 4.1. visual bundle 재사용
actor별로 hitbox, 이동 화살표, 공격 범위, 타겟 점선을 묶어 관리합니다.

```typescript
type CombatDebugVisualBundle = {
    team: CombatDebugTeam;
    hitbox: THREE.Box3Helper;
    moveArrow: THREE.ArrowHelper;
    attackRange: THREE.Line;
    targetLine: THREE.Line;
};

private readonly visuals = new Map<string, CombatDebugVisualBundle>();
```

*   `targetId`가 처음 등장할 때만 bundle을 생성합니다.
*   이후 프레임에서는 geometry position attribute, helper box, arrow direction/length만 갱신합니다.
*   `set.live === false`, actor release, 전투 종료 등으로 더 이상 관측되지 않는 `targetId`는 해당 bundle만 제거합니다.

### 4.2. 데미지 판정 박스 (Hitbox)
*   **구현:** `THREE.Box3Helper`를 사용합니다.
*   **동작:** `CombatDebugInfo.box`를 helper의 box에 copy한 뒤 `updateMatrixWorld(true)`가 호출될 수 있게 합니다.
*   **색상:** Ally (`0x00FF00`), Monster (`0xFF0000`)

### 4.3. 이동 방향 (Movement Direction)
*   **구현:** 유닛의 `centerPos`에서 `moveDirection` 방향으로 `THREE.ArrowHelper`를 그립니다.
*   **길이:** 방향 벡터가 거의 0이면 화살표를 숨기거나 길이를 0으로 둡니다. 표시 길이는 실제 속도가 아니라 디버그 가시성을 위한 고정 길이(예: 2~3m)를 사용합니다.
*   **참고:** 이동 "목표 지점"이 아닌 이동 "방향 벡터"입니다. 목표점 표시가 필요하면 `CombatDebugInfo`에 `moveTarget?: THREE.Vector3`를 별도 추가합니다.

### 4.4. 공격 범위 (Attack Range)
*   **구현:** 유닛의 발 밑에 원형 `THREE.Line`을 그립니다. 반지름은 `GetDebugInfo().attackRange`를 사용합니다.
*   **갱신:** actor별 line geometry를 재사용하되, attackRange가 바뀌면 원 좌표를 다시 씁니다.
*   **머티리얼:** 면이 채워지지 않은 `THREE.LineBasicMaterial`을 사용하여 시야를 가리지 않도록 합니다.

### 4.5. 공격 타겟 (Attack Target)
*   **구현:** `currentTargetBounds` 또는 `currentTargetCenter`가 있으면 유닛의 `centerPos`에서 타겟 중심 또는 bounds 표면의 최단 지점까지 점선을 그립니다.
*   **머티리얼:** `THREE.LineDashedMaterial`을 사용합니다. 점선 효과 적용을 위해 geometry 갱신 후 `geometry.computeLineDistances()`를 반드시 호출합니다.
*   **구분:** 이동 방향 화살표와 헷갈리지 않도록 dashSize/gapSize를 명확히 두고, 필요하면 색상을 팀 색보다 밝게 보정합니다.

---

## 5. 리소스 해제 및 수명 관리 (Resource Lifetime)

토글 Off 또는 전투 상태 종료 시 모든 visual bundle을 정리합니다.

*   `Box3Helper`: `helper.dispose()` 호출 후 `removeFromParent()`
*   `ArrowHelper`: `arrow.dispose()` 호출 후 `removeFromParent()`
*   `Line`: `line.geometry.dispose()`, material dispose 후 `removeFromParent()`
*   `LineDashedMaterial`: 공유하지 않는 actor별 material이면 각 bundle 제거 시 dispose합니다. 공유 material을 사용한다면 전체 `CombatDebugSystem.dispose()`에서 한 번만 dispose합니다.

```typescript
private disposeBundle(bundle: CombatDebugVisualBundle): void {
    bundle.hitbox.dispose();
    bundle.hitbox.removeFromParent();

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

1.  **이벤트 및 단축키 등록**
    *   `src/gsdk/src/types/globaltypes.ts`에 `ToggleCombatDebug = "togglecombatdebug"` 이벤트 추가.
    *   `src/gsdk/src/systems/inputs/input.ts`의 `keydown` 처리에 `F9` 전용 분기 추가.

2.  **타입 추가**
    *   `CombatDebugInfo`, `IDebuggableActor`, `CombatDebugTeam`, `CombatDebugVisualKind` 정의.
    *   가능하면 `src/gsdk/src/systems/debugger/combatdebugtypes.ts`처럼 디버그 전용 타입 파일로 분리.

3.  **데이터 노출**
    *   `IMonsterCtrl` / `IAllyCtrl`에 `GetDebugInfo()` 선언 추가.
    *   `MonsterCtrl` / `AllyCtrl`에서 `Spec.AttackRange`, `moveDirection.clone()`, private `currentTarget` 기반 정보를 반환.

4.  **`CombatDebugSystem` 클래스 작성**
    *   `ILoop` 구현 및 `EventTypes.RegisterLoop` 등록.
    *   `EventTypes.ToggleCombatDebug` 리스너 등록/해제.
    *   actor `targetId` 기준 visual bundle 생성, 재사용, 제거 구현.
    *   `dispose()`에서 루프, 이벤트 리스너, 모든 geometry/material 정리.

5.  **`BaseCityCombat` 통합**
    *   `Init()`에서 `CombatDebugSystem` 인스턴스화.
    *   `Uninit()`에서 `combatDebugSystem.dispose()` 호출.
    *   `updateMode()`가 아니라 `BaseCityCombat` 공통 흐름에 붙여 모든 전투 모드에서 동일하게 동작하도록 유지.

---

## 7. 검증 계획 (Test Plan)

문서만 수정한 경우:
*   Markdown 구조와 코드블록 fence가 깨지지 않았는지 확인합니다.
*   코드 변경이 없으므로 빌드는 필수로 실행하지 않습니다.

실제 구현을 진행한 경우:
*   코드 수정 후 `npm run build`를 실행합니다.
*   전투 진입 후 `F9`로 디버그 visual이 켜지고 꺼지는지 확인합니다.
*   Ally/Monster 사망 또는 release 시 해당 actor visual만 제거되는지 확인합니다.
*   전투 종료 시 `CombatDebugSystem.dispose()`가 호출되어 scene object와 GPU 리소스가 남지 않는지 확인합니다.
*   비활성 상태에서 유닛 순회와 Three.js visual 갱신이 발생하지 않는지 확인합니다.
