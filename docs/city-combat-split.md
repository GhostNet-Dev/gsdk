# CityCombatState 리팩토링 계획

## 1. 개요
`CityCombatState.ts`에 섞여 있는 라이벌 시티 공격(`RivalAssault`)과 플레이어 시티 방어(`PlayerDefense`) 로직을 분리하여 코드의 가독성과 유지보수성을 높입니다.

## 2. 수정 및 생성 대상 파일
- `src/gamestates/basecitycombat.ts` (신규): 공통 기반 로직
- `src/gamestates/rivalassaultstate.ts` (신규): 공격 모드 특화 로직
- `src/gamestates/playerdefensestate.ts` (신규): 방어 모드 특화 로직
- `src/gamestates/citycombatstate.ts` (수정): 컨텍스트 기반 라우터 역할

## 3. 상속 구조

```
AbstractState (IGameMode)
    └── BaseCityCombat implements ILoop   ← abstract
            ├── RivalAssaultState
            └── PlayerDefenseState

CityCombatState extends AbstractState    ← Router (ILoop 불필요)
```

## 4. 상세 구현 계획

### 4.1. BaseCityCombat (추상 클래스)

**Enum (basecitycombat.ts에서 export)**:
```typescript
export enum CityCombatRunState { Idle, Preparing, Active, Finished }
export enum CityCombatWaveSpawnResult { NoWave, Spawned, Failed }
```

**역할**:
- **UI 관리**: `RadialMenuUI`는 새로 생성하지 않고 Router 또는 공유 인스턴스에서 주입받아 사용한다. 공통 메뉴 항목(후퇴 등)만 Base에서 설정한다.
- **환경 설정**: `DeepSpaceMegaRingSystem`(스카이박스), `HorizonEnvironment` 생성 및 정리.
- **전투 시스템**: 몬스터 웨이브 스폰(`spawnCombatWave`), 아군 소환(`startAllies`), 전투 종료 처리(`finishCombat`).
- **상태 관리**: 플레이어 설정(`setupPlayer`), 웨이브 인덱스 및 딜레이 관리.

**Abstract 메서드 4개**:
```typescript
protected abstract initMode(ctx: CityCombatContext): Promise<boolean>;
protected abstract uninitMode(): void;
protected abstract updateMode(delta: number): void;
protected abstract resolveWaves(ctx: CityCombatContext): readonly (readonly MonsterId[])[];
```

`initMode()`는 모드별 초기화 성공 여부를 반환한다. selection 누락, snapshot 생성 실패 등으로 fallback이 발생하면 `false`를 반환하고, Base는 이후 `RegLoadingCompleteCommonItem`, `CombatEnter`, HUD 표시가 실행되지 않도록 초기화 흐름을 중단한다.

**`Init()` 공통 흐름**:
```
CityCombatContextStore.consume()  // ctx 소비
→ 상태 초기화 (waveIndex, waveDelay 등 리셋)
→ resolveWaves(ctx)
→ 이벤트 리스너 등록 (OpenCharacter, RequestTargetSystem)
→ initMode(ctx)  ← substate 진입점
→ initMode 실패 시 abortInit() 후 fallback, 이후 단계 중단
→ RegLoadingCompleteCommonItem: playmode(), ringMenu.mount(), HudCtrl visible, CombatEnter
```

**`update()` 공통 전제조건**:
```typescript
update(delta: number): void {
  if (this.runState !== Active || this.finished || !this.ctx) return;
  if (this.playerCtrl.Health <= 0) { this.finishCombat(Defeat); return; }
  this.updateMode(delta);  // 전투 로직 전체를 substate에 위임
}
```
플레이어 사망 체크는 두 모드 공통이므로 base에서 처리하고, 모드별 승리/패배 조건은 `updateMode()`에서 담당.

**`Uninit()` 공통 흐름**:
```
CombatLeave 이벤트
→ clearJoystick() → ringMenu.unmount() → 리스너 해제
→ playerCtrl.uninit() → allies/monsters 비활성화
→ clearCombatHorizon() → clearCombatSkybox()
→ uninitMode()  ← substate 정리
→ HudCtrl off → 상태 리셋
```

`TaskObj.length = 0`을 `Uninit()` 내부에서 즉시 수행하면 안 된다. `GameCenter.ChangeMode()`는 `Uninit()` 이후 현재 모드의 `TaskObj`를 순회하며 `DeregisterLoop`를 전송하므로, 배열을 먼저 비우면 substate loop가 남을 수 있다. 배열 정리가 필요하면 substate가 직접 `DeregisterLoop`를 전송한 뒤 비우거나, GameCenter의 deregister 흐름이 끝난 뒤 정리되도록 타이밍을 조정한다.

**Protected 공통 상태**:
- `ctx`, `spawnPos`, `waveIndex`, `waveDelay`, `currentWaves`
- `isSpawningWave`, `targetRegistry`, `activeMonsterTargetIds`
- `returnModeId`, `runState`, `finished`, `finishTimer`

substate가 접근해야 하는 위 상태는 `private`이 아니라 `protected`로 선언한다.

**Protected 헬퍼 목록**:
- `setupPlayer()`, `startAllies()`, `spawnCombatWave()`, `finishCombat()`
- `activateCombatAfterInitialSpawn()`, `isTargetDestroyed()`, `areActiveMonstersDefeated()`
- `createCombatSkybox()`, `clearCombatSkybox()`, `createCombatHorizon()`, `clearCombatHorizon()`
- `fallbackToGalaxy()`, `abortInit()`
- `resolveBaseGroundColor()` — PlayerDefense 기본 구현 (substate override 가능)
- `resolveWaveSpawnParams(spawnWaveNumber)` — `spawnCombatWave()` 내부 모드 분기 제거용 virtual 메서드

**`resolveWaveSpawnParams()` 역할** (`spawnCombatWave` 내부 분기 제거):
```typescript
export type CityCombatWaveSpawnParams = {
  radius: number;
  center: THREE.Vector3;
  teamId: TargetTeamId | FactionId;
};

// BaseCityCombat — PlayerDefense 기본값
protected resolveWaveSpawnParams(spawnWaveNumber: number): CityCombatWaveSpawnParams {
  return {
    radius: 35 + spawnWaveNumber * 8,
    center: this.spawnPos.clone(),
    teamId: TargetTeamId.Monster,
  };
}
// RivalAssaultState — override
protected resolveWaveSpawnParams(spawnWaveNumber: number): CityCombatWaveSpawnParams {
  return {
    radius: 8 + spawnWaveNumber * 4,
    center: this.snapshot?.cameraTarget.clone() ?? this.spawnPos.clone(),
    teamId: this.snapshot?.summary.factionId ?? TargetTeamId.Monster,
  };
}
```

`spawnWaveNumber`는 1-based 값이다. 기존 동작을 유지하면 첫 웨이브 반경은 RivalAssault `12`, PlayerDefense `43`이다.

### 4.2. RivalAssaultState

**전용 필드**: `runtime(ReadonlyCityRuntime)`, `environmentRenderer(NpcEnvironmentRenderer)`, `ground(CustomGround)`, `groundMesh`, `snapshot(ReadonlyCityLayoutSnapshot)`

**`initMode(ctx)`**: NPC 도시 레이아웃 스냅샷 생성, `ReadonlyCityRuntime`·`NpcEnvironmentRenderer`·`CustomGround` 초기화 및 씬 렌더링. selection 또는 snapshot이 없으면 `fallbackToGalaxy()` 후 `false`를 반환한다.

**`updateMode(delta)`**:
```typescript
this.environmentRenderer?.update(delta);
// 승리 조건: 적 도시 핵심 건물 파괴 감지
if (this.isTargetDestroyed(this.runtime?.getCoreTargetId())) {
  this.finishCombat(Victory); return;
}
// 방어군 웨이브 관리
if (!this.isSpawningWave && this.areActiveMonstersDefeated()
    && this.waveIndex < this.currentWaves.length) {
  this.waveDelay -= delta;
  if (this.waveDelay <= 0) void this.spawnCombatWave();
}
```

**`uninitMode()`**: `CitySceneSessionStore.clearSelection()` + runtime/renderer/ground dispose.

**`resolveWaves(ctx)`**: `rivalCityManager.getArmyDeck(ctx.selection?.cityId)` → `FallbackWaves`.

**`resolveBaseGroundColor()` override**: `snapshot.ground.color` 우선.

**`resolveWaveSpawnParams()` override**: 반경·중심·teamId를 RivalAssault 값으로 반환.

**전용 Private 헬퍼**: `resolveRivalCityEntrySpawnPos(snapshot)`.

### 4.3. PlayerDefenseState

**전용 필드**: `defenseCoreTargetId?: string`

**`initMode(ctx)`**: 기존 플레이어 도시의 지형·건물 콜라이더 갱신, 핵심 건물 ID(`defenseCoreTargetId`) 결정. 정상 초기화가 완료되면 `true`를 반환한다.

**`updateMode(delta)`**:
```typescript
if (this.isSpawningWave) return;
// 패배 조건: 플레이어 핵심 건물 파괴
if (this.isTargetDestroyed(this.defenseCoreTargetId)) {
  this.finishCombat(Defeat); return;
}
// 승리 조건: 모든 웨이브 클리어
if (!this.areActiveMonstersDefeated()) return;
if (this.waveIndex >= this.currentWaves.length) { this.finishCombat(Victory); return; }
this.waveDelay -= delta;
if (this.waveDelay <= 0) void this.spawnCombatWave();
```

**`uninitMode()`**: `defenseCoreTargetId = undefined` (기존 씬 유지, 추가 dispose 없음).

**`resolveWaves(ctx)`**: `attackerCityId` armyDeck → `planetId` combatWaves → `FallbackWaves`.

**전용 Private 헬퍼**: `resolvePlayerCcSpawnPos()`, `resolvePlayerDefenseHorizonPlane()`, `resolvePlayerDefenseCoreTargetId()`.

### 4.4. CityCombatState (Router)

**위임 패턴 + 배열 레퍼런스 공유**:

Router는 `AbstractState`만 상속(ILoop 불필요). GameCenter에 등록된 `Objects/TaskObj/Physics` 배열의 **동일 레퍼런스**를 substate 생성자에 전달하여 substate가 배열을 채우면 GameCenter가 자동으로 인식하도록 한다.

Router는 `RadialMenuUI`를 1회 생성해 substate에 주입한다. 이렇게 하면 전투 모드 진입마다 `RadialMenuUI` 생성자가 전역 키보드 리스너와 loop를 반복 등록하는 문제를 피할 수 있다.

```typescript
async Init(): Promise<void> {
  const ctx = CityCombatContextStore.peek();   // peek() — 소비 안 함
  if (!ctx) { this.fallbackToGalaxy(); return; }
  const SubClass = ctx.mode === CityCombatMode.RivalAssault
    ? RivalAssaultState : PlayerDefenseState;
  this.subState = new SubClass(
    ...allParams,
    this.ringMenu,
    this.Objects, this.TaskObj, this.Physics  // 배열 레퍼런스 전달
  );
  await this.subState.Init();  // 여기서 consume() 발생
}
Uninit(): void { this.subState?.Uninit(); this.subState = undefined; }
```

**배열 공유 동작**:
```
GameCenter.ChangeMode("city-combat"):
  1. router.Init() 호출
     → subState 생성 시 router의 배열 레퍼런스 전달
     → BaseCityCombat 생성자: this.TaskObj.push(this) → router.TaskObj[0] = subState
  2. router.Objects → scene에 추가
  3. router.TaskObj → 게임루프 등록 (subState.update 포함)
```

**peek() vs consume() 역할 분리**: Router는 `peek()`으로 모드만 확인하고, `consume()`은 `BaseCityCombat.Init()` 안에서 실행된다. substate가 ctx의 완전한 소유권을 가진다.

**호환성**: 기존 생성자 파라미터를 그대로 유지하여 `src/index.ts` 코드 수정 불필요.

## 5. 구현 단계

1. `basecitycombat.ts` 생성 — enum export, abstract class, 공통 필드·메서드 (`citycombatstate.ts` 내용의 ~65% 이동)
2. `rivalassaultstate.ts` 생성 — 4개 abstract 구현 + private 헬퍼
3. `playerdefensestate.ts` 생성 — 4개 abstract 구현 + private 헬퍼
4. `citycombatstate.ts` 수정 — Router로 전면 교체 (기존 내용 제거, ~20줄)
5. TypeScript 컴파일 확인: `npx tsc --noEmit`
6. 최종 빌드 확인: `npm run build`

## 6. 검증 항목

**타입 확인**: `npx tsc --noEmit` — abstract 미구현, 타입 불일치, private/protected 접근 위반 검출.

**최종 빌드**: `npm run build` — 사용자 지침에 따라 코드 구현 후 반드시 실행.

**런타임 시나리오**:
- 라이벌 시티 공격 진입 및 승리(코어 파괴)/패배(플레이어 사망)/후퇴 시나리오 확인.
- 플레이어 시티 방어 진입 및 웨이브 클리어(승리)/코어 파괴(패배)/플레이어 사망(패배) 시나리오 확인.
- ctx 없는 상태에서 `GameCenter.ChangeMode("city-combat")` 호출 시 `fallbackToGalaxy` 동작 확인.
- fallback 발생 시 `RegLoadingCompleteCommonItem`, `CombatEnter`, HUD 표시가 이어서 실행되지 않는지 확인.
- Uninit 후 loop 중복 등록/잔존 여부 확인.
- 전투 진입/퇴장 시 메모리 자원(runtime, renderer, ground) 정리 확인 (`undefined` 처리 확인).
- `Objects`/`TaskObj` 정리 시 GameCenter의 scene remove 및 loop deregister 흐름이 깨지지 않는지 확인.
