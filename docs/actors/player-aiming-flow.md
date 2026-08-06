# 플레이어 원거리 조준 및 십자선 동기화 흐름 (Player Aiming Flow)

## 1. 개요
이 문서는 원거리 공격 시 플레이어의 조준(Aim), 십자선(Crosshair) 활성화 및 실제 월드 좌표와의 동기화, 그리고 이동 시 조준 모드에서 해제되는 일련의 과정에 대한 설계와 흐름을 정리합니다.

관련 핵심 파일:
- `src/gsdk/src/actors/player/states/playerstate.ts`
- `src/gsdk/src/actors/player/states/rangeaimst.ts`
- `src/gsdk/src/actors/player/states/aimrangeattackst.ts`

## 2. 상태 전환 흐름

원거리 공격 조준 및 발사는 기본적으로 다음 상태를 오가며 처리됩니다.

`[Idle/Run 상태]` 
  → (Action1 키 입력) → `[RangeAimState (조준 상태)]`
  → (Action1 유지/재입력) → `[AimRangeAttackState (발사 상태)]`
  → (이동 키 입력) → `[RunState (이동 상태)]`

## 3. 단계별 상세 동작

### 3.1. 조준 시작 (RangeAimState.Init)
플레이어가 원거리 무기를 장착하고 `Action1` 키를 누르면 `CheckAttack()` 함수를 타고 조준 상태로 진입합니다.

- **카메라 전환:** `EventTypes.CameraMode` 이벤트를 발생시켜 어깨 너머 조준 카메라 뷰(`CameraMode.AimThirdPerson`)로 전환합니다.
- **UI 십자선 활성화:** `EventTypes.AimOverlay` 이벤트를 발생시켜 화면 중앙에 십자선 UI를 노출합니다.
- **캐릭터 조준 동기화:** `player.EnableAimPitch(true)`를 호출하여 캐릭터의 상체가 카메라의 상하 각도를 따라가도록 설정합니다.
- **사거리 표시:** 바닥에 사거리 점선을 그립니다 (`createDashedCircle`).

### 3.2. 조준점 동기화 및 유지 (RangeAimState.Update)
조준 상태가 유지되는 매 프레임(`Update`)마다 십자선과 실제 3D 월드의 캐릭터 시선을 일치시킵니다.

1. **월드 타겟팅 좌표 계산:** 카메라 중앙의 레티클(Reticle)에서 레이캐스트를 쏴 월드 상의 타겟 좌표를 구합니다 (`getReticleWorldTarget`).
2. **캐릭터 시선 동기화:** 캐릭터 Mesh가 해당 좌표를 바라보도록 `lookAt`을 수행합니다. 이때 캐릭터가 젖혀지지 않게 y축은 캐릭터 높이로 고정합니다.
3. **십자선 UI 보정 (Parallax 수정):** 카메라 회전에 따라 십자선 UI가 실제 월드 좌표를 가리키도록 위치를 동기화합니다 (`camera.setCrosshairWorldPosition`).
4. **발사 전환:** `Action1` 키 입력 시 발사 상태(`AimRangeAttackState`)로 넘어갑니다.

### 3.3. 이동 시 조준 취소 및 뷰 복귀 (DefaultCheck & Uninit)
조준 중 방향키(이동) 입력이 발생하면 조준을 즉시 해제하고 원래 뷰로 돌아와야 합니다.

- **이동 키 감지:** `Update` 함수 내에서 매 프레임 `this.DefaultCheck({ attack: false })`를 호출해 이동 입력이 있는지 확인합니다. 이동 입력이 감지되면 `RunState`로 상태 전환을 예약합니다.
- **상태 종료 및 복구 (Uninit):** 상태를 빠져나가기 전 `Uninit()`이 호출되며 롤백을 수행합니다.
  - `player.EnableAimPitch(false)`로 상체 조준 움직임을 끕니다.
  - `EventTypes.AimOverlay, false`로 십자선 UI를 비활성화합니다.
  - `EventTypes.CameraMode, CameraMode.ThirdFollowPerson` 이벤트로 기본 3인칭 카메라로 복귀시킵니다.

### 3.4. 발사 처리 (AimRangeAttackState)
발사 상태로 진입하면 애니메이션을 실행하고 투사체를 생성합니다.
- 발사 중에도 십자선 및 시선 동기화(Parallax 수정) 로직이 동일하게 수행되어 정확한 위치를 타겟팅합니다.
- 가늠자 기준의 조준 타겟 좌표(`aimTarget`)를 계산해 해당 방향으로 발사체(`EventTypes.SpawnProjectile`)를 생성합니다.
- 발사가 완료된 후 공격 버튼을 떼면 조준 상태로 복귀하거나, 계속 누르고 있으면 재발사를 수행합니다.
