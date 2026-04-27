# [PROMPT] 대형 건물 타격 데미지 판정 개선

**목표**: 기존 전투 로직은 대상의 중심점(`position`)을 기준으로 거리를 계산하여, 크기가 큰 건물은 겉면에 밀착해도 공격 사거리 밖에 있는 것으로 판정되는 문제가 있습니다. 타겟의 AABB(`THREE.Box3`)를 이용해 가장 가까운 겉면과의 최단 거리를 기준으로 데미지 판정을 하도록 로직을 개선해 주세요. 일반 몬스터의 경우 기존 로직(중심점 기준)을 그대로 따르도록 Fallback 처리하여 밸런스 영향을 없애야 합니다.

**수정 대상 파일 및 세부 지시사항**:

1. **`src/gsdk/src/systems/targeting/targettypes.ts` & `targetregistrysystem.ts`**
   - `TargetRecord` 및 `RegisterTargetMsg` 인터페이스에 선택적 속성 `bounds?: THREE.Box3`를 추가하세요.
   - `TargetRegistrySystem.register()` 내에서 `msg.bounds`를 `TargetRecord`에 저장하도록 매핑을 업데이트하세요.

2. **`src/gsdk/src/interactives/building/buildingmanager.ts`**
   - `registerBuildingTargetAndCollider()` 함수에서 이미 `THREE.Box3` 객체를 생성하고 있습니다. `EventTypes.RegisterTarget` 이벤트를 전송할 때 해당 Box3 객체를 `bounds` 속성으로 함께 넘겨주세요.

3. **`src/gsdk/src/world/cityview/readonlycityruntime.ts`**
   - 동적으로 생성되는 구조물들에 대해 `EventTypes.RegisterTarget`을 호출하는 부분에서, `new THREE.Box3().setFromObject(model)`를 계산하여 `bounds`에 할당해 주세요.

4. **`src/gsdk/src/actors/player/states/attackstate.ts`**
   - `getTargetsInCone(range, angleDegrees)` 함수 로직 수정: 
     - `this.playerCtrl.targets`를 순회할 때 대상이 TargetRegistrySystem에 등록된 `bounds`를 가지고 있는지 확인하세요 (또는 객체의 캐싱 속성 사용).
     - `bounds`가 있다면, `box.clampPoint(this.player.CenterPos, closestPoint)`를 이용해 플레이어와 가장 가까운 타겟 표면 지점을 구하세요.
     - 이 `closestPoint`와 플레이어 중심점(`this.player.CenterPos`) 사이의 최단 거리가 `range` 이하인지 확인하고, 방향 벡터가 `cone` 각도 내에 들어오는지 판정하도록 수학 공식을 적용하세요.
     - `bounds`가 없다면 기존 코드처럼 `target.position`을 기준으로 판단(Fallback)하여 기존 몬스터들의 전투에 영향이 없도록 하세요.
   - `autoDirection()` 함수 최적화:
     - 대상을 자동으로 바라보고 타겟팅할 때도 `bounds`가 존재한다면 가장 가까운 겉면 지점(`closestPoint`)을 기준으로 최단 거리를 산출하여 목표물을 찾도록 개선하세요.

