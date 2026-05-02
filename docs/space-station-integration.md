# Space Station Integration Plan (Galaxy Map)

## 1. 개요

이 문서는 은하계 지도(`GalaxyMapState`)에서 특정 행성 주변에 배치되는 **우주정거장(Space Station)**의 데이터 정의, 렌더링, 상호작용 흐름을 정리합니다.

v1 목표는 정거장을 시각적으로 배치하고 클릭 가능한 대상으로 만드는 것입니다. 클릭 시에는 아직 별도 UI나 게임 모드로 이동하지 않고, 빈 콜백 placeholder만 연결합니다.

**데이터 흐름**

```text
strategicgalaxymapdefs.ts (GalaxyPlanetVisualDef.spaceStation)
  -> StrategicGalaxyManager.getGalaxyMapDef()
    -> PlanetDef.spaceStation
      -> GalaxyMapState.renderGalaxy()
        -> GalaxyPlanetNetwork.Create()
          -> buildSpaceStations()
```

---

## 2. 수정 및 추가 파일

### 2.1 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/gsdk/docs/space-station-integration.md` | 현재 설계 문서 업데이트 |
| `src/gsdk/src/gameobjects/strategicgalaxy/strategicgalaxytypes.ts` | `GalaxyPlanetVisualDef.spaceStation` 추가 |
| `src/gsdk/src/world/galaxy/galaxytypes.ts` | `PlanetDef.spaceStation` 및 정거장 strict 타입 추가 |
| `src/gsdk/src/gameobjects/strategicgalaxy/strategicgalaxymanager.ts` | `getGalaxyMapDef()`에서 visual 정거장 정의를 렌더러 map def로 전달 |
| `src/gsdk/src/gameobjects/strategicgalaxy/strategicgalaxymapdefs.ts` | 정거장 보유 행성 지정 |
| `src/gsdk/src/world/galaxy/galaxyplanetnetwork.ts` | 정거장 생성, 애니메이션, 투명도, 클릭 처리 추가 |
| `src/gamestates/galaxymapstate.ts` | `onSpaceStationActivated` 빈 handler 연결 |

### 2.2 추가 파일

추가 파일은 없습니다. v1은 기존 문서와 기존 렌더링/상태 파일 안에서 처리합니다.

---

## 3. 데이터 정의 및 설정

정거장 정의는 `boolean` 플래그가 아니라 확장 가능한 strict 타입으로 선언합니다. 새로운 정거장 종류나 상호작용 정책이 필요하면 string을 직접 쓰지 않고 const-object 기반 literal union을 확장합니다.

```ts
export const GalaxySpaceStationKind = {
  OrbitalHabitat: "orbital-habitat",
} as const;

export type GalaxySpaceStationKind =
  typeof GalaxySpaceStationKind[keyof typeof GalaxySpaceStationKind];

export const GalaxySpaceStationInteraction = {
  Placeholder: "placeholder",
} as const;

export type GalaxySpaceStationInteraction =
  typeof GalaxySpaceStationInteraction[keyof typeof GalaxySpaceStationInteraction];

export interface GalaxySpaceStationOrbitDef {
  radiusMultiplier?: number;
  speedRadPerSec?: number;
  phaseRad?: number;
  tiltRad?: number;
  yOffset?: number;
}

export interface GalaxySpaceStationDef {
  kind: GalaxySpaceStationKind;
  orbit?: GalaxySpaceStationOrbitDef;
  interaction?: GalaxySpaceStationInteraction;
}
```

`GalaxyPlanetVisualDef`는 전략층의 시각 정의이고, `PlanetDef`는 `GalaxyPlanetNetwork`가 실제로 소비하는 렌더링 입력입니다. 따라서 두 계층 모두 `spaceStation?: GalaxySpaceStationDef`를 가져야 합니다.

```ts
interface GalaxyPlanetVisualDef {
  planetId: StrategicPlanetId;
  radius: number;
  assetKey: GalaxyPlanetAssetKey;
  ring?: { textureKey: GalaxyRingTextureKey; tiltX?: number; tiltY?: number };
  spaceStation?: GalaxySpaceStationDef;
  position?: [number, number, number];
}

interface PlanetDef<TPlanetId extends string = string> {
  id: TPlanetId;
  radius: number;
  assetKey: GalaxyPlanetAssetKey;
  ring?: PlanetRingDef;
  spaceStation?: GalaxySpaceStationDef;
}
```

예시 설정:

```ts
[StrategicPlanetId.Hephaestus]: {
  planetId: StrategicPlanetId.Hephaestus,
  radius: 1.12,
  assetKey: GalaxyPlanetAssetKey.AmberBands,
  spaceStation: {
    kind: GalaxySpaceStationKind.OrbitalHabitat,
    interaction: GalaxySpaceStationInteraction.Placeholder,
    orbit: {
      radiusMultiplier: 2.2,
      speedRadPerSec: 0.18,
      tiltRad: Math.PI / 6,
    },
  },
}
```

> Atlas처럼 행성 링이 있는 행성은 정거장 링과 z-fighting이 발생할 수 있습니다. 초기 배치는 링이 없는 행성에 적용하거나 `tiltRad`를 충분히 줘서 궤도면을 분리합니다.

---

## 4. 렌더링 및 상호작용

`GalaxyPlanetNetwork`는 `spaceStations` 컬렉션을 별도로 관리합니다. 정거장 그룹은 행성 `PlanetGroup`의 자식이 아니라 `this.root`의 직접 자식으로 둡니다. 행성 선택 시 `planet.scale.setScalar(1.07)`이 적용되므로, 정거장을 행성 자식으로 넣으면 궤도 반경과 정거장 크기가 함께 흔들릴 수 있습니다.

정거장 업데이트 규칙:

| 항목 | 기본값 |
|------|--------|
| 궤도 반경 | `planetRadius * 2.2` |
| 공전 속도 | `0.18 rad/s` |
| 궤도 기울기 | `orbit.tiltRad ?? 0` |
| 링 자전 속도 | `0.5 rad/s` |
| 투명도 | 행성 `targetAlpha`와 동일 |

정거장 mesh는 모두 `clickTargets`에 등록하고 `userData.spaceStation = true`, `userData.planetIndex = number`를 부여합니다. `pickGalaxyTarget()`의 분기 우선순위는 아래 순서를 유지합니다.

1. 우주정거장
2. 도시 마커
3. 행성 라벨/행성 mesh
4. fallback

클릭 결과 타입은 정거장 클릭을 표현할 수 있어야 합니다.

```ts
type PickResult = {
  planet: PlanetGroup;
  cityId?: string;
  spaceStationPlanetId?: string;
};
```

`handlePointerUp()`은 정거장 클릭 시 `onSpaceStationActivated?.(planetId)`만 호출하고 종료합니다. v1에서는 `GalaxyMapState`에서 빈 handler를 연결합니다.

```ts
this.galaxyNetwork.onSpaceStationActivated = (_planetId) => {
  // v1 placeholder: station-specific UI will be connected in a later pass.
};
```

---

## 5. 후속 확장

v1 범위에는 포함하지 않지만, 이후 다음 방향 중 하나로 확장할 수 있습니다.

| 확장 | 내용 |
|------|------|
| 정거장 패널 | 은하 모드 안에서 무역, 함대, 수리 탭을 가진 overlay를 연다 |
| 무역소 연동 | 기존 `TradeView`/`TradeService`를 정거장 클릭으로 재사용한다 |
| 별도 게임 모드 | `GameModeId.SpaceStationView`, `SpaceStationViewState`, `index.ts` 등록을 함께 추가한다 |

등록되지 않은 `GameModeId`로 `EventTypes.GameCenter`를 호출하면 `GameCenter.ChangeMode()`에서 에러가 발생하므로, 별도 모드는 타입 추가와 등록을 반드시 함께 처리해야 합니다.

---

## 6. 검증 항목

코드 구현 후 사용자 지침에 따라 `npm run build`를 실행합니다.

| 항목 | 검증 방법 |
|------|----------|
| 가시성 | 정거장이 지정 행성 주변에 표시되는지 확인 |
| 투명도 | focus/overview 전환 시 정거장 opacity가 행성과 함께 변하는지 확인 |
| 클릭 우선순위 | 정거장 mesh 클릭 시 행성 focus 대신 `onSpaceStationActivated`가 호출되는지 확인 |
| 스케일 독립성 | 정거장 행성 선택 시 행성 scale 변화가 정거장 궤도 반경을 흔들지 않는지 확인 |
| dispose | `GalaxyMapState` 전환 및 복귀 후 정거장 mesh/material이 정리되는지 확인 |
| z-fighting | 행성 링이 있는 행성에 배치할 경우 궤도 기울기로 겹침이 없는지 확인 |
