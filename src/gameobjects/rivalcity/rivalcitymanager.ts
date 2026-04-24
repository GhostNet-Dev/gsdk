import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { FactionId, ITurnParticipant, TurnContext, CityTurnOutput, parseFactionId } from "@Glibs/gameobjects/turntypes";
import { buildingDefs } from "@Glibs/interactives/building/buildingdefs";
import { FactionManager } from "@Glibs/gameobjects/faction/factionmanager";
import {
  RivalCityState,
  RivalCitySeed,
  RivalCityDef,
  RivalBuildTask,
  RivalScore,
  parseRivalCityDefId,
} from "./rivalcitytypes";
import { rivalCityDefs } from "./rivalcitydefs";
import { computeBaseProduction, applyBiases, computeSpecialResourceProduction } from "./rivalcityeconomy";
import { advanceBuildQueue, applyCompletedBuildings, addResources, canAfford, deductCost } from "./rivalcityrules";
import { scoreCandidates, choosePlan, buildingCost } from "./rivalcityplanner";
import { parseStrategicPlanetId } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";

type GalaxyManagerLike = {
  getPlanetBonus(planetId: string): Record<string, number>;
};

export class RivalCityManager implements ITurnParticipant {
  readonly turnId = "rival-city";
  readonly turnOrder = 150;

  private cities: RivalCityState[] = [];
  private defMap = new Map<string, RivalCityDef>();
  private buildingDefMap = new Map(Object.values(buildingDefs).map((def) => [def.id, def]));
  private allBuildingIds = Object.values(buildingDefs).map((def) => def.id);

  constructor(
    private eventCtrl: IEventController,
    private galaxyManager: GalaxyManagerLike,
    private factionManager: FactionManager,
  ) {}

  initialize(seeds: RivalCitySeed[]): void {
    this.cities = [];

    for (const seed of seeds) {
      const def = rivalCityDefs[seed.cityDefId];
      if (!def) {
        console.warn(`[RivalCityManager] Unknown cityDefId: ${seed.cityDefId}`);
        continue;
      }
      this.defMap.set(seed.id, def);

      const state: RivalCityState = {
        id: seed.id,
        name: seed.name ?? def.name,
        status: "active",
        cityDefId: seed.cityDefId,
        planetId: seed.planetId,
        factionId: seed.factionId,
        originalFactionId: seed.factionId,
        archetypeId: def.archetype,
        strategy: "expand",
        turn: 0,
        resources: { ...def.startingResources },
        specialResources: { ...(def.startingSpecialResources ?? {}) },
        allocatedPlanetSpecialResources: {},
        buildings: def.startingBuildings.map((bid, i) => ({
          id: `${seed.id}-init-${i}`,
          buildingId: bid,
          level: 1,
          builtTurn: 0,
        })),
        buildQueue: [],
        policies: [],
        score: { total: 0, economy: 0, production: 0, population: 0, research: 0, prestige: 0, localInfluence: 0, galacticInfluence: 0 },
        traits: [],
        localInfluence: seed.startingInfluence ?? 10,
        galacticInfluence: 0,
        discoveredByPlayer: false,
      };

      this.enqueueOpeningBuild(state, def);
      this.cities.push(state);
    }
  }

  advanceTurn(ctx: TurnContext): void {
    for (const city of this.cities) {
      if (city.status !== "active") continue;

      const def = this.defMap.get(city.id);
      if (!def) continue;

      const factionModifier = this.factionManager.getModifier(city.factionId);
      const planetBonus = this.galaxyManager.getPlanetBonus(city.planetId);

      // 1. 자원 생산
      const baseProduction = computeBaseProduction(city.buildings, this.buildingDefMap);
      const production = applyBiases(baseProduction, def, factionModifier, planetBonus);
      city.resources = addResources(city.resources, production);

      // 2. 특수 자원 생산
      const specialProduction = computeSpecialResourceProduction(city, def);
      for (const [k, v] of Object.entries(specialProduction)) {
        const key = k as keyof typeof city.specialResources;
        city.specialResources[key] = (city.specialResources[key] ?? 0) + (v ?? 0);
      }

      // 3. 건설 큐 진행
      const { updated, completed } = advanceBuildQueue(city.buildQueue);
      city.buildQueue = updated;

      if (completed.length > 0) {
        city.buildings = applyCompletedBuildings(city.buildings, completed, ctx.turn);
        for (const task of completed) {
          const bDef = this.buildingDefMap.get(task.buildingId);
          ctx.log.add({
            source: "rival",
            kind: "rival",
            message: `[${city.name}] ${bDef?.name ?? task.buildingId} 건설 완료`,
          });
        }
      }

      // 4. 다음 건설 계획 선택
      if (city.buildQueue.length === 0) {
        const candidates = scoreCandidates(city, def, factionModifier, planetBonus, this.buildingDefMap, this.allBuildingIds);
        const chosen = choosePlan(candidates);
        if (chosen) {
          const bDef = this.buildingDefMap.get(chosen);
          const cost = bDef ? buildingCost(bDef) : undefined;
          if (!bDef || !cost) {
            console.warn(`[RivalCityManager] Building cost is missing, skipped: ${chosen}`);
          } else if (canAfford(city.resources, cost)) {
            const buildTurns = bDef.buildTurns ?? 3;
            city.resources = deductCost(city.resources, cost);
            const task: RivalBuildTask = {
              id: `${city.id}-${ctx.turn}-${chosen}`,
              buildingId: chosen,
              remainingTurns: buildTurns,
              source: "planned",
            };
            city.buildQueue.push(task);
            ctx.log.add({
              source: "rival",
              kind: "rival",
              message: `[${city.name}] ${bDef.name ?? chosen} 건설 시작 (${buildTurns}턴)`,
            });
          }
        }
      } else {
        const current = city.buildQueue[0];
        const bDef = this.buildingDefMap.get(current.buildingId);
        ctx.log.add({
          source: "rival",
          kind: "rival",
          message: `[${city.name}] ${bDef?.name ?? current.buildingId} 건설 중 (${current.remainingTurns}턴 남음)`,
        });
      }

      // 5. 점수 갱신
      city.score = this.computeScore(city, production);
      city.turn = ctx.turn;

      // 6. shared.cityOutputs 기록
      const output: CityTurnOutput = {
        cityId: city.id,
        planetId: city.planetId,
        factionId: city.factionId,
        isPlayer: false,
        score: {
          total: city.score.total,
          economy: city.score.economy,
          production: city.score.production,
          population: city.score.population,
          research: city.score.research,
          prestige: city.score.prestige,
        },
        resourceOutput: production,
        specialResourceOutput: specialProduction,
        activePolicies: city.policies.map((p) => p.policyId),
      };
      ctx.shared.cityOutputs[city.id] = output;
    }

    this.eventCtrl.SendEventMessage(EventTypes.RivalCityStateChanged, this.exportState());
  }

  exportState(): RivalCityState[] {
    return this.cities.map((c) => ({ ...c }));
  }

  getCityState(cityId: string): RivalCityState | undefined {
    const city = this.cities.find((candidate) => candidate.id === cityId);
    return city ? { ...city } : undefined;
  }

  setCityFaction(cityId: string, factionId: FactionId): boolean {
    const city = this.cities.find((candidate) => candidate.id === cityId);
    if (!city) return false;

    city.originalFactionId ??= city.factionId;
    city.factionId = factionId;
    this.eventCtrl.SendEventMessage(EventTypes.RivalCityStateChanged, this.exportState());
    return true;
  }

  importState(states: RivalCityState[]): void {
    this.cities = states.flatMap((s) => {
      const factionId = parseFactionId(s.factionId);
      const originalFactionId = parseFactionId(s.originalFactionId);
      const planetId = parseStrategicPlanetId(s.planetId);
      const cityDefId = parseRivalCityDefId(s.cityDefId);
      const def = cityDefId ? rivalCityDefs[cityDefId] : undefined;
      if (!factionId || !planetId || !cityDefId || !def) {
        console.warn(`[RivalCityManager] Invalid saved city skipped: ${s.id}`);
        return [];
      }

      const buildings = s.buildings.filter((b) => {
        const ok = this.buildingDefMap.has(b.buildingId);
        if (!ok) console.warn(`[RivalCityManager] Unknown saved building skipped: ${b.buildingId}`);
        return ok;
      });
      const buildQueue = s.buildQueue.filter((task) => {
        const ok = this.buildingDefMap.has(task.buildingId);
        if (!ok) console.warn(`[RivalCityManager] Unknown saved build task skipped: ${task.buildingId}`);
        return ok;
      });
      return [{
        ...s,
        cityDefId,
        factionId,
        originalFactionId: originalFactionId ?? factionId,
        planetId,
        buildings,
        buildQueue,
      }];
    });
    for (const city of this.cities) {
      const def = rivalCityDefs[city.cityDefId];
      if (def) this.defMap.set(city.id, def);
    }
  }

  private enqueueOpeningBuild(city: RivalCityState, def: RivalCityDef): void {
    const buildingId = def.openingBuildOrder?.[0];
    if (!buildingId) return;

    const bDef = this.buildingDefMap.get(buildingId);
    const cost = bDef ? buildingCost(bDef) : undefined;
    if (!bDef || !cost) {
      console.warn(`[RivalCityManager] Opening build skipped due to missing cost: ${buildingId}`);
      return;
    }
    if (!canAfford(city.resources, cost)) {
      console.warn(`[RivalCityManager] Opening build skipped due to insufficient resources: ${city.id}/${buildingId}`);
      return;
    }

    city.resources = deductCost(city.resources, cost);
    city.buildQueue.push({
      id: `init-${city.id}-${buildingId}`,
      buildingId,
      remainingTurns: bDef.buildTurns,
      source: "planned",
    });
  }

  private computeScore(city: RivalCityState, production: Partial<Record<string, number>>): RivalScore {
    const def = this.defMap.get(city.id);
    const weights = def?.scoreWeights ?? { production: 1, economy: 1, population: 1, research: 1, prestige: 1 };

    const economy    = (production["gold"]      ?? 0) * weights.economy;
    const production2 = (production["wood"]     ?? 0) + (production["materials"] ?? 0) + (production["food"] ?? 0);
    const prodScore  = production2 * weights.production;
    const population = city.buildings.reduce((sum, building) => {
      const bDef = this.buildingDefMap.get(building.buildingId);
      return sum + (bDef?.providesPeople ?? 0) * building.level;
    }, 0) * weights.population;
    const research   = (city.specialResources.knowledge ?? 0) * 15 * weights.research;
    const prestige   = (city.specialResources.crystal ?? 0) * 20 * weights.prestige;

    const total = economy + prodScore + population + research + prestige;
    return {
      total: Math.round(total),
      economy: Math.round(economy),
      production: Math.round(prodScore),
      population: Math.round(population),
      research: Math.round(research),
      prestige: Math.round(prestige),
      localInfluence: city.localInfluence,
      galacticInfluence: city.galacticInfluence,
    };
  }
}
