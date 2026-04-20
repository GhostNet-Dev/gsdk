import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionId, ITurnParticipant, TurnContext, PlanetTurnOutput, parseFactionId } from "@Glibs/gameobjects/turntypes";
import { RivalCitySeed } from "@Glibs/gameobjects/rivalcity/rivalcitytypes";
import {
  StrategicPlanetDef,
  StrategicPlanetState,
  StrategicRouteState,
  StrategicRouteDef,
  GalaxyPlanetViewModel,
  GalaxyPlanetVisualDef,
  StrategicGalaxyMapDef,
  parseStrategicPlanetId,
  parseStrategicRouteId,
} from "./strategicgalaxytypes";
import { StrategicFleetState, parseStrategicFleetMission } from "./strategicfleetstate";
import { buildPlanetViewModel } from "./galaxyviewmodel";
import { computeLocalInfluences, computeFactionInfluence, resolveControl } from "./influencecalculator";
import { updateMarketFromCityOutputs } from "./trademarket";
import { initialRivalCitySeeds, strategicRouteDefs } from "./strategicgalaxydefs";
import { DefaultStrategicGalaxySelectedPlanetId, galaxyPlanetVisualDefs } from "./strategicgalaxymapdefs";
import { GalaxyPlanetAssetKey } from "@Glibs/world/galaxy/galaxytypes";

export class StrategicGalaxyManager implements ITurnParticipant {
  readonly turnId = "strategic-galaxy";
  readonly turnOrder = 200;

  private planetDefs = new Map<string, StrategicPlanetDef>();
  private planetStates = new Map<string, StrategicPlanetState>();
  private routeStates = new Map<string, StrategicRouteState>();
  private fleetStates = new Map<string, StrategicFleetState>();
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
  }

  advanceTurn(ctx: TurnContext): void {
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
      state.cityIds = citiesOnPlanet.map((c) => c.cityId);

      // 6. shared.planetOutputs 채우기
      const planetOutput: PlanetTurnOutput = {
        planetId,
        factionInfluence: { ...state.factionInfluence },
        controllingFactionId,
        contested,
        resourceBonus: buildResourceBonus(def, state),
        marketPressure: { ...state.market.pricePressure },
        allocatedSpecialResources: allocateSpecialResources(state, citiesOnPlanet.length),
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
    return initialRivalCitySeeds;
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

      result.push(buildPlanetViewModel(def, state, visual, fleetStrength));
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
        radius: vm.visual.radius,
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
        cityCount: vm.cityCount,
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
