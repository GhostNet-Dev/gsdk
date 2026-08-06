# Yuka 기반 길찾기 및 AI 이동 시스템 설계 문서

## 1. 개요 (Background)
현재 몬스터 이동은 `MonsterCtrl`(`actors/monsters/monctrl.ts`)이 타겟 방향 벡터를 계산하고, 실제 이동은 상태머신의 `RunZState.Update`(`actors/monsters/zombie/monstate.ts`)가 그 방향으로 delta·speed 만큼 직선 전진하는 구조입니다. 장애물 처리는 두 가지뿐입니다.

*   시야 차단 감지(`CheckVisibleMeshs`) 시 `moveDirection`을 0으로 만들어 **정지** (monctrl.ts)
*   물리 충돌(`IGPhysic.CheckDirection`) 시 이동 취소 (monstate.ts)

즉 "피해서 돌아가는" 능력이 없어, 건물이나 지형지물에 가로막히면 제자리에 멈추거나 비벼집니다. 본 문서는 `Yuka` 엔진을 도입하여 길찾기(Pathfinding) 및 조향(Steering) 시스템을 구축하기 위한 설계 방안을 제시합니다.

## 2. 주요 설계 목표
*   **동적 환경 대응**: 전투 진입 시점의 완성 건물 상태를 기준으로 이동 가능 영역을 만들고, 전투 중 건물 파괴에 따라 실시간으로 갱신합니다. 전투 중 신규 건설/완공은 지원하지 않습니다.
*   **길찾기 자동화**: 장애물을 피해 타겟까지의 최단 경로를 스스로 찾아 이동합니다.
*   **자연스러운 움직임**: 경로점(Waypoints) 추종에 조향 행동(Steering Behaviors)을 결합해 부드러운 회전과 몬스터 간 분리(Separation)를 구현합니다.

## 2.1. 구현 상태 (2026-07-16 기준)

본 설계는 단계적으로 코드에 반영 중입니다. 현재 반영 범위는 **1차 통합 완료 + 수동 플레이 검증 대기** 상태입니다.

### 완료된 항목
*   **의존성 도입**: root 및 `src/gsdk` 패키지에 `yuka@0.7.8`, `@types/yuka@0.7.4` 추가 완료.
*   **이벤트/타입 추가**: `BuildingDestroyed`, `RequestNavGridService`, `RegisterNavGridService`, `RequestYukaEntityManager`, `RegisterYukaEntityManager` 및 관련 payload 타입 추가 완료.
*   **건물 파괴 정리**: `BaseBuilding.destroy()`가 footprint 포함 `BuildingDestroyed` 이벤트를 발행하고, `BuildingManager`가 `buildingObjects`, `PlacementManager`, `StaticColliderRegistry`, `TargetRegistry`를 같은 건물 ID 기준으로 정리하도록 반영 완료.
*   **지형 API**: `CustomGround.GridSize`, `CustomGround.getHeightAt(worldX, worldZ)` 추가 완료.
*   **NavGridService**: `systems/navigation/navgridservice.ts` 추가 완료. 전투 시작 시 structure target bounds 기반으로 blocked cell을 생성하고, 건물 파괴 이벤트 수신 시 해당 footprint를 unblock합니다.
*   **경로 탐색**: 자체 typed A* 구현 완료. 8방향 이동, corner cutting 방지, obstacle inflate, 구조물 표면 근처 goal cell 선택을 반영했습니다.
*   **전투 연동**: `BaseCityCombat.buildCombatNavGrid()` 추가, `PlayerDefenseState`/`RivalAssaultState` 첫 웨이브 전 호출, `spawnCombatWave()`에서 `NavGridService.snapToWalkable()` 보정 반영 완료.
*   **Yuka 루프 연동**: `YukaEntityManager` 추가 및 `PlayFactory`에서 몬스터 생성 전 등록 완료.
*   **몬스터 이동 전환**: `MonsterCtrl`이 `Vehicle`, `FollowPathBehavior`, `SeparationBehavior`를 소유하고, target/grid version 변경 시 재경로를 요청하도록 반영 완료. 기존 이동 중 LoS 차단 시 정지 로직은 제거하고 공격 검증 LoS는 유지했습니다.
*   **상태머신 역할 조정**: `RunZState`의 직접 위치 이동 제거 완료. 공격/점프/피격/사망 상태에서는 Vehicle 위치를 메쉬 위치에 재동기화하도록 반영했습니다.
*   **빌드 검증**: `npm run build`, `cd src/gsdk && npm run build` 통과 확인.

### 부분 완료 / 추후 보강 항목
*   **수동 전투 검증 대기**: 실제 방어전/공격전에서 우회 이동, 파괴 후 재전투, 구조물 표면 공격 위치, 점프/피격 후 드리프트 여부를 플레이로 확인해야 합니다.
*   **CellSpacePartitioning 미적용**: `SeparationBehavior`는 연결했지만, 몬스터 수 증가 시 이웃 탐색 최적화를 위한 `CellSpacePartitioning`은 아직 적용하지 않았습니다.
*   **폐쇄 대응 미구현**: 경로 부재 시 가장 가까운 벽/건물을 공격 타겟으로 전환하는 정책은 아직 구현하지 않았습니다. 현재는 경로 실패 시 direct fallback 경로를 사용합니다.
*   **단일 지점 스폰 연동 미반영**: [단일 지점 스폰 설계](./single-point-spawn-design.md)가 구현되면 NavGrid 범위 산정과 스폰 중심 계산을 해당 정책에 맞춰 다시 조정해야 합니다.
*   **전투 중 신규 건설/완공 미지원**: 설계 가정대로 전투 시작 시점의 완성 structure와 전투 중 파괴만 NavGrid에 반영합니다.

## 3. 기술 선택: NavMesh가 아닌 그리드 그래프

### 3.1. Yuka NavMesh를 채택하지 않는 이유
Yuka의 `NavMesh`는 **런타임 베이킹(baking) 기능이 없습니다.** glTF로 미리 제작한 내브메시를 `NavMeshLoader`로 로드하거나, 직접 만든 convex polygon 배열을 `fromPolygons()`로 넘기는 방법뿐이며, 지오메트리+장애물 박스에서 자동 생성하는 빌더가 없습니다. 또한 생성 후 폴리곤을 동적으로 차단/재연결(carving)하는 API도 없어, 전투마다 달라지는 도시 배치와 전투 중 건물 파괴를 반영해야 하는 본 게임의 요구와 맞지 않습니다.

런타임 베이킹이 가능한 대안으로 recast-navigation-js(동적 타일 재빌드 지원)가 있으나, 본 게임의 조건에서는 더 단순한 방식으로 충분합니다.

### 3.2. 그리드 기반 그래프 (채택)
전투 지역이 유한하고(스폰 링 반지름 35+8×wave, 방어 중심 기준) 장애물이 전부 **그리드에 배치되는 축정렬 직사각형 건물**이므로, 그리드 그래프가 가장 적합합니다.

*   **구성**: 전투 영역을 건물 배치 그리드에 정렬된 셀로 분할하고, Yuka의 `Graph` + `AStar`(또는 자체 A*)로 경로를 탐색합니다.
*   **동적 갱신**: 전투 시작 시 완성 건물 셀을 차단(blocked)하고, 전투 중 파괴된 건물 셀을 해제(walkable)하면 끝 — 리베이킹이 필요 없습니다.
*   **성능**: 셀 차단/해제는 O(건물이 차지하는 셀 수), A* 탐색은 영역이 제한적이라 저렴합니다.

### 3.3. 그리드 그래프 기본 파라미터
*   **셀 크기**: 기존 건물 배치 그리드와 같은 `4.0` 월드 유닛을 기본값으로 사용합니다(`CustomGround`의 `gridSize`와 정렬). 단, 이 필드는 현재 `private`이므로(customground.ts) NavGrid에서 참조하려면 getter 노출이 선행되어야 합니다.
*   **이동 연결**: 8방향 이동을 사용하되, 대각선 이동은 양쪽 인접 직교 셀이 모두 walkable일 때만 허용합니다. 이렇게 해야 건물 모서리를 대각선으로 뚫고 지나가는 corner cutting을 막을 수 있습니다.
*   **장애물 팽창(inflate)**: 건물 footprint는 몬스터 반경과 최소 안전 여유만큼 확장해서 차단합니다. A* 경로가 건물 외곽선 바로 위를 지나가면 조향/물리 보정 단계에서 모서리에 걸리기 쉽기 때문입니다.
*   **목표 셀 선택**: 타겟이 구조물(`kind === "structure"` — `TargetKind`는 enum이 아닌 문자열 유니언 타입, targettypes.ts)이면 건물 중심 셀이 아니라, 몬스터 공격 거리 안에 들어갈 수 있는 표면 근처 walkable 셀을 path end로 선택합니다.

## 4. 시스템 아키텍처

### 4.1. Yuka 엔진 연동 (`YukaEntityManager`)
*   Yuka의 `EntityManager.update(delta)`를 게임 루프에 통합합니다.
*   **연동 방식**: `EventTypes.RegisterLoop`로 `ILoop`를 구현해 GamePlay 루프(`systems/event/canvas.ts`)에 등록합니다. 이렇게 하면 기존 timeScale(배속/일시정지)이 몬스터 AI에도 일관되게 적용됩니다. Yuka 자체 `Time` 대신 canvas가 전달하는 delta를 그대로 사용합니다.
*   몬스터 수가 많아지면 `SeparationBehavior`의 이웃 탐색 비용을 줄이기 위해 `CellSpacePartitioning`을 `EntityManager`에 연결합니다.

### 4.2. 경로 그래프 서비스 (`NavGridService`, gsdk 내)
지형과 건물 정보를 바탕으로 몬스터의 이동 가능 영역 그래프를 관리합니다. **서비스 자체는 gsdk에 두고, 초기화 트리거는 게임 레이어에서 호출**하여 SDK 경계를 지킵니다.

*   **최초 생성**:
    *   게임 레이어의 전투 상태(`BaseCityCombat`/`PlayerDefenseState`, `src/libgamestates/warstates/`) 진입 시 호출됩니다.
    *   전투 영역(스폰 링을 포함하는 범위)을 그리드로 분할합니다.
    *   `BuildingManager`(`interactives/building/buildingmanager.ts`)의 현재 **완성 건물** 목록에서 각 건물의 `position` + `property.size.width/depth`로 점유 셀을 차단합니다. (타겟 등록 시 계산되는 `Box3` 재활용 가능)
    *   전투 중 신규 건설/완공은 지원하지 않으므로, pending 건설 작업은 NavGrid 차단 대상으로 보지 않습니다.
*   **실시간 갱신**:
    *   **파괴(권장)**: `EventTypes.BuildingDestroyed` 또는 `EventTypes.BuildingFootprintChanged` 전용 이벤트를 신설해 건물 ID, position, width/depth, bounds를 함께 전달합니다. 이 이벤트를 기준으로 `NavGridService`가 해당 셀을 해제합니다.
    *   **파괴(보조안)**: 코드 변경을 최소화하려면 현재 `BaseBuilding.destroy()`가 방출하는 `EventTypes.UpdateTargetState { alive: false }`를 구독할 수 있습니다. 다만 이 payload에는 footprint 정보가 없으므로 `TargetRegistrySystem` 또는 `BuildingManager`에서 같은 ID의 건물 정보를 다시 조회해야 합니다.
    *   **정리 책임 (선결 과제)**: 파괴 처리 시 `TargetRegistry`, `StaticColliderRegistry`, `PlacementManager`/건물 footprint, `NavGridService` unblock이 모두 같은 건물 ID를 기준으로 정리되어야 합니다. **현재 코드는 이 정리가 전혀 이루어지지 않습니다** — `BaseBuilding.destroy()`는 `UpdateTargetState{alive:false}`와 `DeregisterPhysic`만 방출하며, ①TargetRegistry 레코드(`DeregisterTarget` 미발송, 플래그만 갱신), ②StaticColliderRegistry 엔트리, ③PlacementManager footprint, ④`BuildingManager.buildingObjects` 맵이 모두 stale로 남습니다. 특히 ④가 남으면 재전투 시 `NavGridService.build()`가 파괴된 건물을 다시 차단하게 되므로, 이 정리 체계 정비는 NavGrid 도입의 **선행 작업**입니다.
    *   그래프 변경 시 영향권 내 몬스터에게 재탐색 신호를 보내되, **한 프레임에 몰리지 않도록 스태거링**합니다(§6 참조).

### 4.3. 몬스터 컨트롤러 개편 (`MonsterCtrl` + 상태머신)
직선 이동을 Yuka의 `Vehicle`로 대체하되, **기존 상태머신(Idle/Run/Attack/Jump)과의 역할을 명확히 재분담**합니다. 현재 이동 코드가 `MonsterCtrl`이 아니라 `RunZState.Update`(monstate.ts)에 있다는 점에 유의합니다.

*   **역할 분담**:
    *   **Yuka `Vehicle`**: XZ 평면상의 위치·속도 계산 (경로 추종 + 조향). 이동의 주체.
    *   **`RunZState`**: 이동 주체에서 물러나, Vehicle의 velocity를 받아 **애니메이션 재생·메쉬 회전(lookAt)만** 담당. 직선 전진 코드(`Pos.add(moveAmount)`) 제거.
    *   **`MonsterCtrl`**: 타겟 인식 시 `NavGridService.findPath()`로 경로를 얻어 Vehicle의 `FollowPathBehavior`에 설정. **기존 "시야 차단 시 정지" 로직(`CheckVisibleMeshs` → `moveDirection.set(0,0,0)`)은 제거** — 유지하면 길찾기를 도입해도 여전히 벽 앞에서 얼어붙습니다. 공격 검증용 시야 판정(`isTargetLineOfSightBlocked`)은 이미 별도 메서드로 분리되어 근접·원거리 공격 검증(`ValidateMeleeAttackTarget`/`ValidateRangedAttackTarget`) 양쪽에서 사용 중이므로, 이동 정지 로직만 제거하면 되고 공격 판정에는 영향이 없습니다.
*   **상태별 Vehicle 제어**:
    *   `IdleZState`/`RunZState`에서는 Vehicle steering을 활성화하고, 상태 전환은 Vehicle velocity 유무로 판단합니다.
    *   `AttackZState` 진입 중에는 Vehicle steering을 일시 정지해 공격 애니메이션 중 밀려 움직이지 않게 합니다. 타겟이 사거리 밖으로 벗어나면 기존 공격 검증이 실패하고 Run으로 복귀하면서 재경로를 요청합니다.
    *   `JumpZState`와 `HurtZState`처럼 직접 위치를 조작하는 상태에서는 Vehicle steering을 일시 정지하고, 상태 종료 시 Vehicle position을 실제 메쉬 위치에 재동기화합니다.
*   **Y좌표(지형 높이) 동기화**: Yuka Vehicle은 평면 이동만 하므로 높이는 별도 처리합니다.
    *   `CustomGround`(`world/ground/customground.ts`)는 PlaneGeometry 정점에 높이를 직접 굽는 방식이고 현재 높이 조회 API가 없습니다. 규칙 격자이므로 **정점 보간 방식의 `getHeight(x, z)` 헬퍼를 신설**합니다(레이캐스트보다 훨씬 저렴).
    *   `getHeight(x, z)`의 입력은 월드 XZ 좌표입니다. 내부에서 ground object의 local 좌표로 변환하고, `PlaneGeometry`의 position buffer에서 주변 정점을 보간한 뒤 월드 Y를 반환합니다.
    *   매 프레임 Vehicle의 XZ를 메쉬에 반영한 뒤 `getHeight`로 Y를 스냅합니다. 낙하/점프(`CheckGravity` → `JumpZState`)는 기존 방식을 유지하되, Jump 종료 시 Vehicle 위치를 메쉬 위치에 맞춥니다.
*   **조향 행동 (Steering Behaviors)**:
    *   `FollowPathBehavior`: 그래프에서 얻은 경로를 부드럽게 추종.
    *   `SeparationBehavior`: 몬스터 간 겹침 방지 (현재 몬스터끼리는 충돌 판정이 없어 서로 통과함).
    *   ~~`ObstacleAvoidanceBehavior`~~: **채택하지 않음.** Yuka의 이 행동은 구형(boundingRadius) 장애물을 전제하므로 직사각형 건물 근사가 부정확하고, 정적 장애물은 그래프가 이미 회피하므로 불필요합니다.
*   **물리 동기화**: Yuka를 주 이동 엔진으로 사용하고, `IGPhysic.CheckDirection`은 최종 위치 보정(관통 방지) 시에만 적용합니다. 보정으로 메쉬 위치가 밀린 경우에는 Vehicle position을 메쉬 위치에 재동기화해야 드리프트가 누적되지 않습니다(Jump/Hurt 종료 시 재동기화와 동일 원칙).

## 5. 데이터 흐름 (Data Flow)
1.  **전투 시작**: `BaseCityCombat` 진입 → `NavGridService.build()` 호출 (`BuildingManager`의 완성 건물 목록으로 셀 차단).
2.  **몬스터 생성**: `MonsterCtrl` 생성 시 `yuka.Vehicle`을 `EntityManager`에 등록.
3.  **타겟 설정**: 타겟 인식(TargetRegistrySystem) 시 `NavGridService.findPath()`로 경로 생성 → `FollowPathBehavior`에 설정.
4.  **이동**: GamePlay 루프에서 `EntityManager.update(delta)` → Vehicle 위치 계산 → 메쉬 XZ 반영 + `getHeight`로 Y 스냅 → 상태머신은 velocity 기반으로 애니메이션 갱신.
5.  **건물 파괴**: `BuildingDestroyed`/`BuildingFootprintChanged` 수신(권장) 또는 `UpdateTargetState{alive:false}` 수신 후 건물 정보 조회(보조안) → `NavGridService`가 셀 해제.
6.  **경로 재탐색**: 그래프 변경 시 자동 재탐색은 없으므로, 서비스가 영향권 몬스터에 재계획을 **명시적으로** 요청 (스태거링 적용).

## 6. 구현 시 고려사항 및 제약
*   **의존성 도입**: `yuka`는 현재 미도입 상태이므로 root `package.json`에 추가해야 합니다. 루트 webpack이 `@Glibs`를 `src/gsdk/src`로 직접 alias하므로, 실제 애플리케이션 빌드 기준 의존성은 root 패키지입니다. 마지막 릴리스가 2023년경(v0.7.x)으로 유지보수가 정체된 점은 리스크이나, 의존성이 없는 단일 라이브러리이고 사용 범위가 `Vehicle`/`Graph`/steering으로 한정적이라 수용 가능합니다. 향후 런타임 내브메시가 필요해지면 recast-navigation-js로의 교체를 검토합니다.
*   **재탐색 폭주 방지**: 건물 하나가 파괴되면 다수 몬스터가 동시에 경로를 재계산하려 합니다. 몬스터별 재탐색 쿨다운 + 프레임당 재탐색 횟수 상한(스태거링)으로 스파이크를 방지합니다. 건물 파괴는 경로를 "열기만" 하므로 기존 경로도 여전히 유효합니다(최적이 아닐 뿐) — 즉 재탐색은 필수가 아닌 최적화이며, 스태거링을 공격적으로 적용해도 안전합니다.
*   **그리드 범위 산정**: 스폰 링 반지름이 wave마다 8씩 증가하므로, 최초 `build()` 시 예상 최대 wave 기준으로 범위를 확보하거나(권장 — 셀 데이터는 저렴), wave 진행에 따라 그리드를 확장하는 정책을 정해야 합니다.
*   **스폰 위치와 폐쇄 대응**: 웨이브 스폰은 맵 가장자리가 아니라 **방어 중심(spawnPos) 주위 링 배치**(`BaseCityCombat.spawnCombatWave`, 반지름 35+8×wave)입니다. 단, 같은 디렉토리의 [단일 지점 스폰 설계](./single-point-spawn-design.md)(한 방향 40~50m 오프셋 + 반경 8~10 군집)가 구현되면 이 전제와 그리드 범위 산정이 바뀌므로 함께 갱신해야 합니다. 플레이어가 성벽으로 코어를 완전히 둘러싸 경로가 존재하지 않는 경우를 대비해, ①경로 부재 시 가장 가까운 벽 건물을 공격 타겟으로 전환하거나 ②최소 진입로를 보장하는 규칙이 필요합니다. (①이 공성전 재미 측면에서 권장)
*   **기존 스폰 보정과의 조합**: 스폰 지점이 차단 셀 위이면 기존 `findSafeSpawnPos()`(basecitycombat.ts) 결과를 그래프 상 walkable 셀로 보정합니다.

## 7. 결론
Yuka의 조향 시스템과 그리드 그래프 길찾기의 조합으로 몬스터 AI의 지능을 높이고 더욱 박진감 넘치는 공성/수성 전투 경험을 제공할 수 있습니다. 전투 시작 시 도시 배치를 길찾기 그래프에 반영하고, 전투 중 건물 파괴에 맞춰 경로를 다시 여는 방식은 복잡한 런타임 내브메시 없이도 공성/수성 전투의 전략성을 강화합니다.
