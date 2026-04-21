import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionId, ITurnParticipant, TurnContext, PlanetTurnOutput, parseFactionId, CityTurnOutput } from "@Glibs/gameobjects/turntypes";
import { RivalCityDefId, RivalCitySeed, RivalCityState, parseRivalCityDefId } from "@Glibs/gameobjects/rivalcity/rivalcitytypes";
import { rivalCityDefs } from "@Glibs/gameobjects/rivalcity/rivalcitydefs";
import {
  StrategicPlanetDef,
  StrategicPlanetState,
  StrategicRouteState,
  StrategicRouteDef,
  GalaxyPlanetViewModel,
  GalaxyPlanetVisualDef,
  StrategicGalaxyMapDef,
  StrategicPlanetId,
  StrategicPlanetCityKind,
  StrategicPlanetCityPlacement,
  parseStrategicPlanetId,
  parseStrategicRouteId,
} from "./strategicgalaxytypes";
import { StrategicFleetState, parseStrategicFleetMission } from "./strategicfleetstate";
import { buildPlanetViewModel } from "./galaxyviewmodel";
import { computeLocalInfluences, computeFactionInfluence, resolveControl } from "./influencecalculator";
import { updateMarketFromCityOutputs } from "./trademarket";
import { strategicRouteDefs } from "./strategicgalaxydefs";
import { DefaultStrategicGalaxySelectedPlanetId, galaxyPlanetVisualDefs } from "./strategicgalaxymapdefs";
import { GalaxyCityKind, GalaxyCityViewModel, GalaxyPlanetAssetKey } from "@Glibs/world/galaxy/galaxytypes";

interface StrategicCityPlacement {
  id: string;
  name: string;
  planetId: string;
  factionId: FactionId;
  kind: GalaxyCityKind;
  kindLabel: string;
  factionLabel: string;
  cityDefId?: RivalCityDefId;
  score?: number;
  description?: string;
}

export interface StrategicPlayerCityPlacement {
  id: string;
  name: string;
  planetId: StrategicPlanetId;
  factionId: FactionId;
}

const FACTION_LABELS: Record<FactionId, string> = {
  [FactionId.Alliance]: "Alliance",
  [FactionId.Empire]: "Empire",
  [FactionId.Guild]: "Guild",
  [FactionId.Neutral]: "Neutral",
};

const CITY_KIND_LABELS: Record<GalaxyCityKind, string> = {
  [GalaxyCityKind.Player]: "플레이어",
  [GalaxyCityKind.Rival]: "경쟁 도시",
  [GalaxyCityKind.Native]: "원주민 구역",
};

const CITY_KIND_ORDER: Record<GalaxyCityKind, number> = {
  [GalaxyCityKind.Player]: 0,
  [GalaxyCityKind.Rival]: 1,
  [GalaxyCityKind.Native]: 2,
};

const STRATEGIC_CITY_KIND_TO_GALAXY: Record<StrategicPlanetCityKind, GalaxyCityKind> = {
  [StrategicPlanetCityKind.Player]: GalaxyCityKind.Player,
  [StrategicPlanetCityKind.Rival]: GalaxyCityKind.Rival,
  [StrategicPlanetCityKind.Native]: GalaxyCityKind.Native,
};

export class StrategicGalaxyManager implements ITurnParticipant {
  readonly turnId = "strategic-galaxy";
  readonly turnOrder = 200;

  private planetDefs = new Map<string, StrategicPlanetDef>();
  private planetStates = new Map<string, StrategicPlanetState>();
  private routeStates = new Map<string, StrategicRouteState>();
  private fleetStates = new Map<string, StrategicFleetState>();
  private cityPlacements = new Map<string, StrategicCityPlacement>();
  private latestCityOutputs: Record<string, CityTurnOutput> = {};
  private visualDefs: Partial<Record<string, GalaxyPlanetVisualDef>> = galaxyPlanetVisualDefs;

  constructor(private eventCtrl: IEventController) {}

  initialize(planetDefs: StrategicPlanetDef[], routeDefs: StrategicRouteDef[]): void {
    for (const def of planetDefs) {
      this.planetDefs.set(def.id, def);
      this.planetStates.set(def.id, this.initPlanetState(def));
    }

    for (const routeDef of routeDefs) {
      if (!this.planetDefs.has(routeDef.fromPlanetId) || !this.planetDefs.has(routeDef.toPlanetId)) {
        console.warn(
          `[StrategicGalaxyManager] Route endpoint missing: ${routeDef.id} (${routeDef.fromPlanetId} -> ${routeDef.toPlanetId})`,
        );
        continue;
      }
      this.routeStates.set(routeDef.id, {
        id: routeDef.id,
        fromPlanetId: routeDef.fromPlanetId,
        toPlanetId: routeDef.toPlanetId,
        distance: routeDef.baseDistance,
        traffic: 10,
        security: 70,
        blockadeLevel: 0,
        tradeValue: 20,
      });
    }

    this.registerDefinedCityPlacements();
  }

  advanceTurn(ctx: TurnContext): void {
    this.latestCityOutputs = { ...ctx.shared.cityOutputs };

    for (const [planetId, def] of this.planetDefs) {
      const state = this.planetStates.get(planetId);
      if (!state) continue;

      const citiesOnPlanet = Object.values(ctx.shared.cityOutputs).filter(
        (c) => c.planetId === planetId,
      );

      // 1. 행성 내 localInfluence 계산
      const localInfluences = computeLocalInfluences(ctx.shared.cityOutputs, planetId, def);

      // 2. factionInfluence 갱신
      state.factionInfluence = computeFactionInfluence(localInfluences, state.factionInfluence);

      // 3. 장악/경합 상태 갱신
      const { controllingFactionId, contested } = resolveControl(state.factionInfluence);
      state.controllingFactionId = controllingFactionId;
      state.contested = contested;

      // 4. 시장 갱신
      state.market = updateMarketFromCityOutputs(state.market, citiesOnPlanet, def.baseStats.marketScale);

      // 5. 도시 ID 목록 동기화
      state.cityIds = this.getCityIdsForPlanet(planetId, citiesOnPlanet.map((c) => c.cityId));

      // 6. shared.planetOutputs 채우기
      const planetOutput: PlanetTurnOutput = {
        planetId,
        factionInfluence: { ...state.factionInfluence },
        controllingFactionId,
        contested,
        resourceBonus: buildResourceBonus(def, state),
        marketPressure: { ...state.market.pricePressure },
        allocatedSpecialResources: allocateSpecialResources(state, state.cityIds.length),
      };
      ctx.shared.planetOutputs[planetId] = planetOutput;

      state.lastProcessedTurn = ctx.turn;

      if (contested) {
        ctx.log.add({
          source: "rival",
          kind: "system",
          message: `[${def.name}] 행성 경합 상태: ${Object.entries(state.factionInfluence)
            .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
            .map(([f, v]) => `${f}(${Math.round(v ?? 0)})`)
            .join(" vs ")}`,
        });
      }

      this.eventCtrl.SendEventMessage(EventTypes.PlanetStateChanged, state);
    }

    // 7. 항로 갱신
    this.updateRoutes(ctx);

    const viewModel = this.getViewModel();
    this.eventCtrl.SendEventMessage(EventTypes.StrategicGalaxyUpdated, viewModel);
    this.eventCtrl.SendEventMessage(EventTypes.GalaxyViewModelUpdated, viewModel);
  }

  getCitySeed(): RivalCitySeed[] {
    return [...this.cityPlacements.values()]
      .filter((placement) => placement.kind !== GalaxyCityKind.Player && placement.cityDefId !== undefined)
      .map((placement) => ({
        id: placement.id,
        cityDefId: placement.cityDefId!,
        planetId: parseStrategicPlanetId(placement.planetId)!,
        factionId: placement.factionId,
        name: placement.name,
        startingInfluence: placement.score,
      }))
      .filter((seed) => seed.planetId !== undefined);
  }

  getPlayerCityPlacement(): StrategicPlayerCityPlacement | undefined {
    const player = [...this.cityPlacements.values()].find(
      (placement) => placement.kind === GalaxyCityKind.Player,
    );
    if (!player) return undefined;
    const planetId = parseStrategicPlanetId(player.planetId);
    if (!planetId) return undefined;
    return {
      id: player.id,
      name: player.name,
      planetId,
      factionId: player.factionId,
    };
  }

  registerPlayerCity(
    planetId: string,
    factionId: FactionId,
    name = "플레이어 도시",
  ): void {
    const parsedPlanetId = parseStrategicPlanetId(planetId);
    if (!parsedPlanetId || !this.planetDefs.has(parsedPlanetId)) {
      console.warn(`[StrategicGalaxyManager] Player city placement skipped: invalid planet ${planetId}`);
      return;
    }

    this.cityPlacements.set("player-city", {
      id: "player-city",
      name,
      planetId: parsedPlanetId,
      factionId,
      kind: GalaxyCityKind.Player,
      kindLabel: CITY_KIND_LABELS[GalaxyCityKind.Player],
      factionLabel: FACTION_LABELS[factionId],
      description: "플레이어가 직접 건설하고 운영하는 시작 도시입니다.",
    });
    this.syncCityIdsFromPlacements();
  }

  registerRivalCityStates(states: RivalCityState[]): void {
    this.clearNonPlayerCityPlacements();
    for (const state of states) {
      const cityDefId = parseRivalCityDefId(state.cityDefId);
      const planetId = parseStrategicPlanetId(state.planetId);
      const factionId = parseFactionId(state.factionId);
      if (!cityDefId || !planetId || !factionId || !this.planetDefs.has(planetId)) continue;

      this.cityPlacements.set(state.id, this.createRivalCityPlacement({
        id: state.id,
        cityDefId,
        planetId,
        factionId,
        name: state.name,
        startingInfluence: state.localInfluence,
      }, state.score.total));
    }
    this.syncCityIdsFromPlacements();
  }

  getPlanetBonus(planetId: string): Partial<Record<CurrencyType, number>> {
    const def = this.planetDefs.get(planetId);
    return def?.resourceBias ?? {};
  }

  getViewModel(): GalaxyPlanetViewModel[] {
    const result: GalaxyPlanetViewModel[] = [];

    for (const [planetId, def] of this.planetDefs) {
      const state = this.planetStates.get(planetId);
      if (!state) continue;

      const visual = this.visualDefs[planetId] ?? {
        planetId: def.id,
        radius: 1,
        assetKey: GalaxyPlanetAssetKey.AzureIce,
      };

      const fleetStrength = [...this.fleetStates.values()]
        .filter((f) => f.currentPlanetId === planetId)
        .reduce((sum, f) => sum + f.strength, 0);

      result.push(buildPlanetViewModel(def, state, visual, fleetStrength, this.buildCitiesForPlanet(planetId)));
    }

    return result;
  }

  getGalaxyMapDef(): StrategicGalaxyMapDef {
    const viewModel = this.getViewModel();
    const planetIds = new Set(viewModel.map((vm) => vm.id));
    const selectedPlanetId = planetIds.has(DefaultStrategicGalaxySelectedPlanetId)
      ? DefaultStrategicGalaxySelectedPlanetId
      : viewModel[0]?.id ?? DefaultStrategicGalaxySelectedPlanetId;

    return {
      selectedPlanetId,
      routes: strategicRouteDefs.map((route) => ({
        id: route.id,
        fromPlanetId: route.fromPlanetId,
        toPlanetId: route.toPlanetId,
      })),
      planets: viewModel.map((vm) => ({
        id: vm.id,
        name: vm.name,
        factionId: vm.factionId,
        radius: vm.visual.radius * 1.5,
        assetKey: vm.visual.assetKey,
        ring: vm.visual.ring,
        stats: {
          economy: vm.economy,
          industry: vm.industry,
          defense: vm.defense,
          stationedFleet: vm.fleetStrength,
          population: vm.population,
          resource: vm.resourceLabel || "none",
        },
        resourceBonuses: vm.resourceBonuses,
        specialResources: vm.specialResources,
        marketResources: vm.marketResources,
        cities: vm.cities,
        cityCount: vm.cities.length,
        stability: vm.stability,
        blockadeLevel: vm.blockadeLevel,
        description: `${vm.factionLabel} 영향권. ${vm.contested ? "경합 중인 전략 성계입니다." : "안정적인 전략 성계입니다."}`,
        position: vm.visual.position,
        manualPosition: vm.visual.position,
      })),
    };
  }

  getPlanetStates(): StrategicPlanetState[] {
    return [...this.planetStates.values()];
  }

  getPlanetStateMap(): Map<string, StrategicPlanetState> {
    return this.planetStates;
  }

  getRouteStateMap(): Map<string, StrategicRouteState> {
    return this.routeStates;
  }

  getFleetStateMap(): Map<string, StrategicFleetState> {
    return this.fleetStates;
  }

  exportState(): { planets: StrategicPlanetState[]; routes: StrategicRouteState[]; fleets: StrategicFleetState[] } {
    return {
      planets: [...this.planetStates.values()],
      routes:  [...this.routeStates.values()],
      fleets:  [...this.fleetStates.values()],
    };
  }

  importState(data: { planets: StrategicPlanetState[]; routes: StrategicRouteState[]; fleets: StrategicFleetState[] }): void {
    for (const p of data.planets) {
      const id = parseStrategicPlanetId(p.id);
      const controllingFactionId = parseFactionId(p.controllingFactionId);
      if (!id || !this.planetDefs.has(id)) {
        console.warn(`[StrategicGalaxyManager] Invalid saved planet skipped: ${p.id}`);
        continue;
      }
      this.planetStates.set(id, {
        ...p,
        id,
        controllingFactionId,
        factionInfluence: sanitizeFactionInfluence(p.factionInfluence),
      });
    }

    for (const r of data.routes) {
      const id = parseStrategicRouteId(r.id);
      const fromPlanetId = parseStrategicPlanetId(r.fromPlanetId);
      const toPlanetId = parseStrategicPlanetId(r.toPlanetId);
      const controllingFactionId = parseFactionId(r.controllingFactionId);
      if (!id || !fromPlanetId || !toPlanetId || !this.planetDefs.has(fromPlanetId) || !this.planetDefs.has(toPlanetId)) {
        console.warn(`[StrategicGalaxyManager] Invalid saved route skipped: ${r.id}`);
        continue;
      }
      this.routeStates.set(id, { ...r, id, fromPlanetId, toPlanetId, controllingFactionId });
    }

    for (const f of data.fleets) {
      const factionId = parseFactionId(f.factionId);
      const currentPlanetId = parseStrategicPlanetId(f.currentPlanetId);
      const targetPlanetId = parseStrategicPlanetId(f.targetPlanetId);
      const routeId = parseStrategicRouteId(f.routeId);
      const mission = parseStrategicFleetMission(f.mission);
      if (!factionId || !currentPlanetId || !mission || (!!f.targetPlanetId && !targetPlanetId) || (!!f.routeId && !routeId)) {
        console.warn(`[StrategicGalaxyManager] Invalid saved fleet skipped: ${f.id}`);
        continue;
      }
      this.fleetStates.set(f.id, {
        ...f,
        factionId,
        currentPlanetId,
        targetPlanetId,
        routeId,
        mission,
      });
    }
  }

  private createRivalCityPlacement(seed: RivalCitySeed, score?: number): StrategicCityPlacement {
    const def = rivalCityDefs[seed.cityDefId];
    const kind = seed.cityDefId === RivalCityDefId.NativeEnclave
      ? GalaxyCityKind.Native
      : GalaxyCityKind.Rival;

    return {
      id: seed.id,
      name: seed.name ?? def.name,
      planetId: seed.planetId,
      factionId: seed.factionId,
      kind,
      kindLabel: CITY_KIND_LABELS[kind],
      factionLabel: FACTION_LABELS[seed.factionId],
      cityDefId: seed.cityDefId,
      score,
      description: def.desc,
    };
  }

  private registerDefinedCityPlacements(): void {
    this.cityPlacements.clear();

    for (const [planetId, def] of this.planetDefs) {
      for (const placement of def.cityPlacements ?? []) {
        this.registerDefinedCityPlacement(planetId, placement);
      }
    }

    this.syncCityIdsFromPlacements();
  }

  private registerDefinedCityPlacement(
    planetId: string,
    placement: StrategicPlanetCityPlacement,
  ): void {
    const parsedPlanetId = parseStrategicPlanetId(planetId);
    const factionId = parseFactionId(placement.factionId);
    if (!parsedPlanetId || !factionId || !this.planetDefs.has(parsedPlanetId)) {
      console.warn(`[StrategicGalaxyManager] City placement skipped: ${placement.id}`);
      return;
    }

    const kind = STRATEGIC_CITY_KIND_TO_GALAXY[placement.kind];
    if (kind === GalaxyCityKind.Player) {
      this.cityPlacements.set(placement.id, {
        id: placement.id,
        name: placement.name ?? "플레이어 도시",
        planetId: parsedPlanetId,
        factionId,
        kind,
        kindLabel: CITY_KIND_LABELS[kind],
        factionLabel: FACTION_LABELS[factionId],
        description: "플레이어가 직접 건설하고 운영하는 시작 도시입니다.",
      });
      return;
    }

    const cityDefId = parseRivalCityDefId(placement.cityDefId);
    if (!cityDefId || !rivalCityDefs[cityDefId]) {
      console.warn(`[StrategicGalaxyManager] City placement skipped due to invalid cityDefId: ${placement.id}`);
      return;
    }

    this.cityPlacements.set(placement.id, this.createRivalCityPlacement({
      id: placement.id,
      cityDefId,
      planetId: parsedPlanetId,
      factionId,
      name: placement.name,
      startingInfluence: placement.startingInfluence,
    }, placement.startingInfluence));
  }

  private clearNonPlayerCityPlacements(): void {
    for (const [id, placement] of this.cityPlacements) {
      if (placement.kind !== GalaxyCityKind.Player) {
        this.cityPlacements.delete(id);
      }
    }
  }

  private syncCityIdsFromPlacements(): void {
    for (const [planetId, state] of this.planetStates) {
      state.cityIds = this.getCityIdsForPlanet(planetId);
    }
  }

  private getCityIdsForPlanet(planetId: string, outputCityIds: string[] = []): string[] {
    const result = new Set<string>();
    for (const placement of this.cityPlacements.values()) {
      if (placement.planetId === planetId) result.add(placement.id);
    }
    for (const cityId of outputCityIds) {
      result.add(cityId);
    }
    return [...result];
  }

  private buildCitiesForPlanet(planetId: string): GalaxyCityViewModel[] {
    const cities = new Map<string, GalaxyCityViewModel>();

    for (const placement of this.cityPlacements.values()) {
      if (placement.planetId !== planetId) continue;
      const output = this.latestCityOutputs[placement.id];
      cities.set(placement.id, {
        id: placement.id,
        name: placement.name,
        kind: placement.kind,
        kindLabel: placement.kindLabel,
        factionId: placement.factionId,
        factionLabel: placement.factionLabel,
        cityDefId: placement.cityDefId,
        score: output?.score.total ?? placement.score,
        description: placement.description,
      });
    }

    for (const output of Object.values(this.latestCityOutputs)) {
      if (output.planetId !== planetId || cities.has(output.cityId)) continue;
      cities.set(output.cityId, {
        id: output.cityId,
        name: output.isPlayer ? "플레이어 도시" : output.cityId,
        kind: output.isPlayer ? GalaxyCityKind.Player : GalaxyCityKind.Rival,
        kindLabel: output.isPlayer ? CITY_KIND_LABELS[GalaxyCityKind.Player] : CITY_KIND_LABELS[GalaxyCityKind.Rival],
        factionId: output.factionId,
        factionLabel: FACTION_LABELS[output.factionId],
        score: output.score.total,
      });
    }

    return [...cities.values()].sort((a, b) => (
      CITY_KIND_ORDER[a.kind] - CITY_KIND_ORDER[b.kind] || a.name.localeCompare(b.name)
    ));
  }

  private initPlanetState(def: StrategicPlanetDef): StrategicPlanetState {
    return {
      id: def.id,
      factionInfluence: { [def.defaultFactionId]: 50 },
      controllingFactionId: def.defaultFactionId,
      contested: false,
      cityIds: [],
      stationedFleetIds: [],
      specialResources: {},
      market: { demand: {}, supply: {}, saturation: {}, pricePressure: {} },
      stability: 80,
      blockadeLevel: 0,
      lastProcessedTurn: 0,
    };
  }

  private updateRoutes(ctx: TurnContext): void {
    for (const route of this.routeStates.values()) {
      const fromState = this.planetStates.get(route.fromPlanetId);
      const toState   = this.planetStates.get(route.toPlanetId);
      const fromDef   = this.planetDefs.get(route.fromPlanetId);
      const toDef     = this.planetDefs.get(route.toPlanetId);

      if (!fromState || !toState || !fromDef || !toDef) {
        console.warn(`[StrategicGalaxyManager] Route state skipped due to missing endpoint: ${route.id}`);
        continue;
      }

      const economyAvg = ((fromDef.baseStats.economy + toDef.baseStats.economy) / 2) / 100;
      route.traffic   = Math.round(10 + economyAvg * 40);
      route.tradeValue = Math.round(15 + economyAvg * 50 - route.blockadeLevel * 5);
      route.security  = Math.max(0, route.security - route.blockadeLevel * 5);
      this.eventCtrl.SendEventMessage(EventTypes.RouteStateChanged, route);
    }
    void ctx;
  }
}

function sanitizeFactionInfluence(
  influence: Partial<Record<string, number>>,
): Partial<Record<FactionId, number>> {
  const result: Partial<Record<FactionId, number>> = {};
  for (const [rawFactionId, amount] of Object.entries(influence)) {
    const factionId = parseFactionId(rawFactionId);
    if (!factionId) {
      console.warn(`[StrategicGalaxyManager] Invalid saved faction influence skipped: ${rawFactionId}`);
      continue;
    }
    result[factionId] = amount ?? 0;
  }
  return result;
}

function buildResourceBonus(
  def: StrategicPlanetDef,
  _state: StrategicPlanetState,
): Partial<Record<CurrencyType, number>> {
  return { ...def.resourceBias };
}

function allocateSpecialResources(
  state: StrategicPlanetState,
  cityCount: number,
): Record<string, Record<string, number>> {
  if (cityCount === 0) return {};
  const share = 1 / cityCount;
  const result: Record<string, Record<string, number>> = {};

  for (const [res, amount] of Object.entries(state.specialResources)) {
    result[res] = {};
    for (let i = 0; i < cityCount; i++) {
      result[res][`slot-${i}`] = (amount ?? 0) * share;
    }
  }

  return result;
}

export { strategicRouteDefs };
