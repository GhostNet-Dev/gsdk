# 근접/원거리 유닛 타겟 거리 유지 문제 해결 설계서

## 목표
아군 유닛(Ally)과 몬스터(Monster)가 전투 중 적의 중심 좌표가 아니라 실제 외곽 기준 사거리를 사용하도록 수정합니다. 이를 통해 큰 건물/구조물을 공격할 때 근접 유닛이 공격 상태에 진입하지 못하거나, 원거리 유닛이 구조물에 과도하게 붙는 문제를 해결합니다.

## 핵심 수정 파일
- `src/gsdk/src/actors/battle/meleecombat.ts`
- `src/gsdk/src/systems/targeting/targettypes.ts`
- `src/gsdk/src/systems/targeting/targetregistrysystem.ts`
- `src/gsdk/src/actors/allies/allyctrl.ts`
- `src/gsdk/src/actors/monsters/monctrl.ts`
- `src/gsdk/src/actors/allies/ally/allystate.ts`
- `src/gsdk/src/actors/monsters/zombie/monstate.ts`
- `src/gsdk/src/actors/projectile/projectilectrl.ts`
- `src/gsdk/src/actors/allies/allies.ts`
- `src/gsdk/src/actors/monsters/monsters.ts`

## 배경 및 원인 분석
`TargetRegistrySystem`은 타겟 등록 시 `TargetRecord.bounds`를 보관하고, bounds가 있으면 `object.userData.bounds`에도 같은 값을 넣습니다. 또한 `AllyTargetAdapter`와 `MonsterTargetAdapter`의 `Meshs` getter는 타겟 객체가 `THREE.Group` 또는 `THREE.Mesh`이면 원본 객체를 반환합니다.

하지만 유닛 상태 머신의 `GetTargetDistance()`는 `target.Meshs.userData?.bounds`에만 의존하고, bounds를 찾지 못하면 `target.Pos` 중심 좌표 거리로 fallback합니다. 이 경로는 `IPhysicsObject.Box`와 `TargetRecord.bounds`가 이미 올바른 외곽 정보를 가지고 있어도 사용하지 못할 수 있습니다.

큰 구조물에서는 중심 좌표와 외곽 사이의 차이가 큽니다.

- 근접 유닛은 구조물 콜라이더 외곽에서 막혀도 중심까지의 거리가 사거리 안으로 들어오지 않아 `RunSt`에 머물 수 있습니다.
- 원거리 유닛은 중심 기준 사거리에서 멈추므로 구조물 외곽과는 지나치게 가까운 위치에 설 수 있습니다.
- 타겟 탐색도 중심 거리만 쓰면 구조물 외곽은 가까운데 중심이 `aggroRange` 밖인 타겟을 놓칠 수 있습니다.
- AI 거리 판정만 외곽 기준으로 바꾸면, 원거리 발사체가 여전히 타겟 중심 기준으로 충돌 후보를 제외하여 실제 데미지가 누락될 수 있습니다.

## 해결 방안

### 1. 공통 외곽 거리 헬퍼 추가
`GetHorizontalDistanceToBoxSurface(origin, box, fallback)`를 추가합니다.

- `box`가 있고 `!box.isEmpty()`이면 `box.clampPoint(origin)`으로 가장 가까운 외곽 지점을 구한 뒤 수평 거리만 계산합니다.
- `box`가 없거나 비어 있으면 기존처럼 fallback 위치(`target.Pos` 또는 `target.object.position`)까지의 수평 거리를 사용합니다.
- ally/monster 상태 전환과 공격 검증이 같은 거리 규칙을 사용하게 합니다.

### 2. 타겟 어댑터의 구조물 bounds 캐시 보정
`AllyTargetAdapter`와 `MonsterTargetAdapter`의 `updateCache()`에서 구조물(`kind === "structure"`)이고 `TargetRecord.bounds`가 유효하면 이를 우선 복사합니다. 그 외 타겟은 기존처럼 `setFromObject(object)`로 현재 객체 bounds를 계산합니다.

캐시 갱신 후에는 항상 `size`와 `centerPos`를 갱신하고, empty box면 기본 크기와 object position으로 fallback합니다.

### 3. 상태 전환 및 공격 검증 일관화
`AllyState.GetTargetDistance()`와 `MonState.GetTargetDistance()`는 `target.Meshs.userData.bounds` 대신 `target.Box`를 사용합니다. melee/ranged validator도 같은 헬퍼로 `TargetRecord.bounds`를 우선 사용해, 공격 상태 진입과 실제 타격 검증의 기준을 맞춥니다.

### 4. 타겟 탐색 거리 모드 추가
`TargetDistanceMode` enum을 추가합니다.

- `Center`: 기존 중심 거리 기준. 기본값으로 유지합니다.
- `BoundsSurface`: bounds가 있으면 외곽 기준, 없으면 중심 fallback.

기존 터렛/도시 방어 등은 기본 `Center`를 유지하고, ally/monster의 `findNearestHostile()` 호출에만 `BoundsSurface`를 지정합니다.

### 5. 발사체 충돌 및 최종 피격 검증 보강
`ProjectileCtrl`은 `TargetRegistrySystem`의 `TargetRecord.bounds`를 우선 사용하고, 없으면 `object.userData.bounds`, 마지막으로 `setFromObject()` bounds를 사용합니다.

- Homing 타겟 선택은 중심 거리 대신 외곽 기준 거리로 후보를 고릅니다.
- 발사체 충돌 후보 prefilter는 중심 거리 대신 외곽 기준 거리로 검사합니다.
- 실제 hit 판정은 기존 segment-to-center + bounding sphere 판정을 유지하되, bounds가 있으면 확장된 box와 segment 교차를 먼저 검사합니다.
- `ValidateReceivedMeleeAttack()`은 선택적으로 defender bounds를 받아 큰 유닛 간 근접 피격도 외곽 기준으로 검증할 수 있게 합니다.

## 검증 및 테스트 방법
- 코드 수정 후 `npm run build`를 실행합니다.
- 근접 공격 유닛이 큰 구조물 외곽 사거리 이내에서 공격 상태로 전환하는지 확인합니다.
- 원거리 공격 유닛이 구조물 중심이 아니라 외곽 기준 사거리를 유지하는지 확인합니다.
- 몬스터가 플레이어 건물/라이벌 건물을 공격할 때도 같은 기준으로 동작하는지 확인합니다.
- 원거리 유닛의 발사체가 큰 구조물에 실제 데미지를 적용하는지 확인합니다.
- Homing 발사체가 큰 구조물 외곽이 사거리 안일 때 타겟을 잡는지 확인합니다.
- 일반 유닛 대 유닛 전투에서 기존 접근/공격 동작이 유지되는지 확인합니다.
- 타겟이 없거나 bounds가 비어 있어도 `Infinity`/`NaN` 거리로 상태가 깨지지 않는지 확인합니다.
