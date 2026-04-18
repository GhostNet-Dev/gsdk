# 🏗️ Building 모듈 (건설 및 건물 관리 시스템)

이 모듈은 심시티나 RTS(실시간 전략) 게임처럼 **건물을 맵에 배치하고, 건설 과정을 거쳐, 완성된 건물이 고유한 기능(자원 생산, 유닛 생산, 방어 등)을 수행하도록 관리하는 핵심 시스템**입니다. 실시간(Timer)과 턴제(Turn) 모드를 모두 지원하도록 유연하게 설계되어 있습니다.

---

## 1. 핵심 구성 요소 (Core Components)

### 🧠 `BuildingManager` (건설 및 관리의 중앙 통제소)
건물 시스템의 두뇌 역할을 합니다.
* **건설 관리 (Construction Lifecycle):** 플레이어의 건설 요청 시 자원을 확인하고, 그리드 스냅 가이드 모델을 띄워 위치를 확정한 뒤, 건설 진행률(Progress)을 관리합니다.
* **하이브리드 시간 관리:** 실시간 모드일 때는 `update(delta)`를 통해 건설 진행도와 각 건물을 업데이트하고, 턴제 모드일 때는 `TurnManager`와 연동되어 `advanceTurn()`으로 턴 단위 처리를 수행합니다.
* **상호작용 (Interaction):** 화면 클릭(Raycasting)을 통해 지어진 건물을 선택(Select)하고, 건물 정보와 사용 가능한 명령(Command)을 UI에 전달합니다.

### 🧬 `BuildingProperty` & `buildingDefs` (건물의 데이터 정의)
건물의 데이터(유전자)를 담당합니다.
* 하드코딩을 피하기 위해 모든 건물의 스펙(HP, 건설 시간/턴 수, 크기, 제공 인구수, 모델링 에셋 키, 생산 자원량 등)이 `buildingDefs.ts`에 정의되어 있습니다.
* 새로운 건물을 추가할 때 로직을 건드리지 않고 이 정의 파일만 수정/추가하면 됩니다. (Data-Driven Design)

### 🦴 `IBuildingObject` & `BaseBuilding` (건물의 공통 뼈대)
모든 완성된 건물이 상속받는 기본 뼈대입니다.
* **상태 관리:** 현재 레벨, 체력(HP), 업그레이드 진행 상태 등을 관리합니다.
* **자동 자원 생산 (Auto Production):** `property.production` 데이터가 있으면, 타이머나 턴에 맞춰 주기적으로 글로벌 이벤트를 통해 자원을 지급합니다.
* **UI 데이터 제공:** `getSelectionData()` 메서드를 통해 건물의 상태 텍스트, 진행률, 플레이어가 누를 수 있는 버튼(업그레이드 등 공통 명령 + 특수 명령) 목록을 UI 패널로 전달합니다.

---

## 2. 세부 건물 구현체 (Concrete Building Types)

`BaseBuilding`을 상속받아 각 건물별 특수한 역할을 수행하는 클래스들입니다.

* **`ResourceProduction` (자원 생산):** 제재소, 광산 등. 기본 생산량에 더해 주변 환경(나무 등)을 탐색해 보너스 자원을 채집하는 로직을 포함합니다.
* **`UnitProduction` (유닛 생산):** 병영, 지휘 본부 등. 명령(Command)을 받으면 타이머를 거쳐 월드에 실제 유닛을 스폰합니다.
* **`TechResearch` (기술 연구):** 대장간, 성당 등. 연구 명령을 받으면 특정 시간 후 전역 테크트리(`TechTreeService`)에 업그레이드 이벤트를 보냅니다.
* **`DefenseTurret` (방어 포탑):** 주기적으로 적을 찾아 바라보고(`lookAt`) 공격(Shoot)을 수행합니다.
* **`Wall` / `Bunker` / `PilotableBuilding`:** 성벽 수리, 벙커 유닛 탑승, 조종석 탑승 등 특수한 상호작용 명령들을 구현합니다.

---

## 3. 주요 작동 흐름 (Workflows)

1. **건설 지시 및 가이드 표시:**
   * UI에서 건설 버튼 클릭 시 `HighlightGrid` 이벤트 발생.
   * `BuildingManager`가 반투명한 가이드 모델을 생성하고 마우스/그리드 위치에 따라 이동.
2. **건설 착수 (`startBuild`):**
   * 위치 확정 시 `PlacementManager`에 점유 영역 등록 및 자원(지갑) 차감.
   * 바닥에 진행률을 표시하는 링(Progress Mesh) 생성.
3. **건설 완료 (`finishBuild`):**
   * 타이머 또는 턴 조건 충족 시 진행률 메시를 지우고, 정의된 `BuildingType`에 맞는 실제 건물 객체를 생성하여 월드에 배치.
   * 인구수 증가 등의 추가 혜택 적용.
4. **명령 수행 (Commands):**
   * 건물을 클릭하면 하단 UI 패널 출력.
   * 표시된 특수 명령(예: 유닛 생산, 기술 연구) 버튼 클릭 시 건물의 고유 로직 실행.

---

## 4. 아키텍처의 장점 (Strengths of this Design)

* **완벽한 이벤트 기반 (Event-Driven) 결합도 분리:**
  * 매니저가 직접 UI를 그리거나 자원을 수정하지 않습니다. `IEventController`를 통해 메시지만 전달하므로 타 시스템과의 결합도가 낮아 확장이 쉽습니다.
* **데이터 드리븐 (Data-Driven) 디자인:**
  * 기획적인 수치나 명령 템플릿을 코드 외부(`buildingDefs`)로 분리하여, 새로운 콘텐츠 추가나 밸런싱 수정이 매우 용이합니다.
* **시간 시스템의 추상화:**
  * `BuildingMode.Timer`와 `BuildingMode.Turn` 모드를 두어, 실시간 모드와 턴제 보드게임 모드를 언제든 자유롭게 전환할 수 있는 뛰어난 유연성을 제공합니다.

---

## 5. 주요 사용 이벤트 (EventTypes)

Building 모듈은 타 시스템(UI, 자원 관리, 유닛 등)과의 결합도를 낮추기 위해 전역 `IEventController`를 통한 메시징 패턴을 적극 활용합니다.

* **`HighlightGrid`**: UI 패널에서 특정 건물 건설 버튼을 클릭했을 때 발생합니다. `BuildingManager`가 이를 수신하여 맵 위에 반투명한 배치 가이드 모델을 생성합니다.
* **`Currency` / `ResourceChangeRequested`**: 건물 건설 비용을 지불하거나, `ResourceProduction` 건물이 주기적으로 자원을 생산했을 때 지갑(재화/자원) 시스템에 증감을 요청합니다.
* **`People`**: 건물이 완성되었을 때 총 인구수(시민 수)를 증가시키기 위해 발생합니다.
* **`Projectile` / `SpawnUnit`**: `UnitProduction` 건물(예: 병영)이 유닛 훈련 명령을 완료했을 때, 실제 유닛(보병, 차량 등)을 맵에 스폰하도록 월드/유닛 매니저에 요청합니다.
* **`TechUpgrade` (테크트리 연동)**: `TechResearch` 건물에서 기술 연구가 완료되었을 때, 전역 테크트리 서비스에 특정 연구 항목의 해금을 알립니다.

---

## 6. 매니저와 건물 객체의 관계 (BuildingManager & buildingobjs)

`BuildingManager`와 `buildingobjs` 하위 클래스들은 **"건축가(생성 및 통제)"와 "완성된 건물(실행)"**의 명확한 역할 분담 구조를 가집니다.

* **공장(Factory) 역할과 생명주기 관리:**
  * `BuildingManager`는 건물이 지어지기 전의 모든 과정(자원 차감, 그리드 스냅 가이드, 공사 진행률 표시 등)을 책임집니다.
  * 건설이 100% 완료되면 매니저가 데이터(`BuildingType`)를 확인하여 알맞은 `buildingobjs` 클래스(예: `UnitProduction`, `DefenseTurret` 등)를 인스턴스화하고 월드에 배치합니다.
  * `buildRequirements.nearbyResources`가 있는 건물은 `BuildRequirementValidator`를 통해 건설 위치 주변의 환경 자원을 검사합니다. 조건을 만족하지 않으면 건설 비용을 차감하거나 작업을 만들지 않습니다.

* **위임(Delegation)을 통한 로직 분리:**
  * 매니저는 직접 포탑의 총을 쏘게 하거나 자원을 캐지 않습니다. 자신이 관리하는 건물 객체 목록을 순회하며 `building.update(delta)` 또는 `building.advanceTurn()`을 호출하여 **각 객체에 고유 행동 로직을 위임**합니다.
  * 이로 인해 새로운 행동 패턴을 가진 건물이 추가되어도 매니저의 핵심 코드는 수정할 필요가 없습니다.

* **UI 통신망 역할:**
  * 플레이어가 화면에서 건물을 클릭하면 매니저가 Raycast로 이를 감지하고, 선택된 건물 객체에게 `getSelectionData()`를 요청합니다.
  * 건물 객체가 자신의 현재 상태(HP, 생산 진행률 등)와 플레이어가 누를 수 있는 명령 버튼 목록을 반환하면, 매니저는 이를 UI 패널(`SelectionPanel`)에 전달하여 화면에 출력합니다.

## 7. 배치 요구사항 (Build Requirements)

특정 건물은 건설 위치 주변에 필요한 환경 자원이 있어야 착공할 수 있습니다.
조건 판정은 `BuildRequirementValidator`가 담당하고, `EnvironmentManager`는 주변 환경 자원 검색만 제공합니다.
`CustomGround`는 같은 검증기를 미리보기 색상과 클릭 차단에 쓰고, `BuildingManager`는 착공 직전 최종 검증에 씁니다.

```ts
buildRequirements: {
  nearbyResources: [
    {
      range: 20,
      environmentIds: ["pine_tree"],
      resourceTypes: [EventTypes.Wood],
      message: "제재소는 반경 20 안에 나무가 있어야 건설할 수 있습니다."
    }
  ]
}
```

`environmentIds`와 `resourceTypes`를 함께 지정하면 두 조건을 모두 만족하는 환경 자원만 인정합니다.

### 그리드 범위 표시

건설 배치 중에는 두 종류의 범위가 그리드 위에 함께 표시됩니다.

* `buildRange`: 건물을 지을 수 있게 해주는 지원 범위입니다. 기존 건물과 현재 배치 미리보기 모두 청록색 계열로 표시됩니다.
* `production.collectionRange` / `buildRequirements.nearbyResources[].range`: 제재소나 광산처럼 주변 자원이 필요한 건물의 자원 수집/요구 범위입니다. 기존 완성 건물과 현재 배치 미리보기 모두 연두색 계열로 표시됩니다.

자원 범위는 `production.collectionRange`와 `nearbyResources` 조건 중 가장 큰 `range` 값을 사용합니다. 실제 건설 가능 여부는 자원 오브젝트의 그리드 footprint와 자원 범위 그리드 셀이 하나라도 겹치는지로 판정합니다. 클릭 차단과 미리보기 색상은 같은 `BuildRequirementValidator` 결과를 사용하므로 최종 착공 판정과 같은 기준으로 동작합니다.

현재 적용된 조건은 다음과 같습니다.

* `LumberMill`: 반경 20 안에 목재 자원인 `pine_tree`가 있어야 건설 가능
* `Mine`: 반경 24 안에 골드 자원인 `gold_node`가 있어야 건설 가능
