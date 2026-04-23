import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise";
import { FactionId } from "@Glibs/gameobjects/turntypes";
import { RivalCityManager } from "@Glibs/gameobjects/rivalcity/rivalcitymanager";
import {
  RivalArchetypeId,
  RivalBuildingState,
  RivalCityState,
} from "@Glibs/gameobjects/rivalcity/rivalcitytypes";
import { rivalCityDefs } from "@Glibs/gameobjects/rivalcity/rivalcitydefs";
import { StrategicGalaxyManager } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxymanager";
import {
  StrategicPlanetDef,
  StrategicPlanetProfileId,
} from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";
import { buildingDefs, BuildingProperty } from "@Glibs/interactives/building/buildingdefs";
import { EnvironmentType, environmentDefs } from "@Glibs/interactives/environment/environmentdefs";
import { createRadialEnvironmentPattern } from "@Glibs/interactives/environment/radialenvironmentpattern";
import { getFootprintGridCellKeys, hasGridCellOverlap } from "@Glibs/interactives/placement/gridrangeutils";
import { Char } from "@Glibs/loader/assettypes";
import { CurrencyType } from "@Glibs/inventory/wallet";
import { CitySceneSelection } from "@Glibs/systems/gamecenter/cityscenesessionstore";
import { mulberry32, seedFromCityId } from "@Glibs/helper/seededrandom";
import {
  CityGroundTheme,
  NpcEnvironmentNodeId,
  NpcEnvironmentObjectSnapshot,
  ReadonlyCityLayoutSnapshot,
  ReadonlyCityObjectKind,
  ReadonlyCityObjectSnapshot,
} from "./cityviewtypes";

const GRID_SIZE = 4.0;
const RESOURCE_TREE_CLUSTER_COUNT = 10;
const RESOURCE_GOLD_CLUSTER_COUNT = 4;
const AMBIENT_ENVIRONMENT_CLUSTER_COUNT = 5;
const NATURAL_FOREST_HALF_EXTENT = 250;
const NATURAL_FOREST_CLEARING_RADIUS = 100;
const NATURAL_FOREST_ROAD_COUNT = 5;
const NATURAL_FOREST_ROAD_WIDTH = 12;
const NATURAL_FOREST_ROAD_ANGLE_OFFSET = -Math.PI / 2;
const NATURAL_FOREST_DENSITY = 0.6;
const NATURAL_FOREST_NOISE_SCALE = 40;
const NATURAL_FOREST_NOISE_THRESHOLD = 0.5;
const NATURAL_FOREST_MIN_DENSITY = 0.15;
const NATURAL_FOREST_MAX_DENSITY = 0.85;
const CORE_ANCHOR = { x: -1, z: -1 };
const TOWN_CENTER = { x: 0, z: 0 };
const FOREST_POCKET_CENTER = { x: -10, z: 6 };
const MINE_POCKET_CENTER = { x: 10, z: -6 };
const GENERIC_SLOT_SPACING = 4;
const POCKET_SLOT_SPACING = 3;
const TOWN_SLOT_RINGS = 6;
const POCKET_SLOT_RINGS = 3;
const FACTION_LABELS: Record<FactionId, string> = {
  [FactionId.Alliance]: "Alliance",
  [FactionId.Empire]: "Empire",
  [FactionId.Guild]: "Guild",
  [FactionId.Neutral]: "Neutral",
};

const PROFILE_THEME_COLORS: Record<StrategicPlanetProfileId, number> = {
  [StrategicPlanetProfileId.Gateworld]: 0xb8cda1,
  [StrategicPlanetProfileId.Industrial]: 0x7b7f85,
  [StrategicPlanetProfileId.IceMoon]: 0xd7e7f4,
  [StrategicPlanetProfileId.Biosphere]: 0x97c26b,
  [StrategicPlanetProfileId.Frontier]: 0xc0a26d,
  [StrategicPlanetProfileId.GasFrontier]: 0xd1b16d,
  [StrategicPlanetProfileId.Trade]: 0xc7b377,
  [StrategicPlanetProfileId.ResearchHub]: 0x8ebbc4,
  [StrategicPlanetProfileId.Fortress]: 0x6f7277,
  [StrategicPlanetProfileId.DarkMatter]: 0x4c4b63,
};

const PROFILE_AMBIENT_ENVIRONMENT: Record<StrategicPlanetProfileId, readonly NpcEnvironmentNodeId[]> = {
  [StrategicPlanetProfileId.Gateworld]: ["pine_tree"],
  [StrategicPlanetProfileId.Industrial]: ["gold_node"],
  [StrategicPlanetProfileId.IceMoon]: ["gold_node"],
  [StrategicPlanetProfileId.Biosphere]: ["pine_tree"],
  [StrategicPlanetProfileId.Frontier]: ["pine_tree"],
  [StrategicPlanetProfileId.GasFrontier]: ["gold_node"],
  [StrategicPlanetProfileId.Trade]: ["pine_tree"],
  [StrategicPlanetProfileId.ResearchHub]: ["pine_tree"],
  [StrategicPlanetProfileId.Fortress]: ["gold_node"],
  [StrategicPlanetProfileId.DarkMatter]: ["gold_node"],
};

const PROFILE_NATURAL_FOREST_COUNTS: Record<StrategicPlanetProfileId, number> = {
  [StrategicPlanetProfileId.Gateworld]: 360,
  [StrategicPlanetProfileId.Industrial]: 0,
  [StrategicPlanetProfileId.IceMoon]: 0,
  [StrategicPlanetProfileId.Biosphere]: 700,
  [StrategicPlanetProfileId.Frontier]: 500,
  [StrategicPlanetProfileId.GasFrontier]: 0,
  [StrategicPlanetProfileId.Trade]: 420,
  [StrategicPlanetProfileId.ResearchHub]: 360,
  [StrategicPlanetProfileId.Fortress]: 0,
  [StrategicPlanetProfileId.DarkMatter]: 0,
};
const PROFILE_NATURAL_FOREST_ENABLED = PROFILE_NATURAL_FOREST_COUNTS;
const NATURAL_FOREST_PROFILE_DENSITY_MULTIPLIERS: Record<StrategicPlanetProfileId, number> = {
  [StrategicPlanetProfileId.Gateworld]: 0.85,
  [StrategicPlanetProfileId.Industrial]: 1,
  [StrategicPlanetProfileId.IceMoon]: 1,
  [StrategicPlanetProfileId.Biosphere]: 1.15,
  [StrategicPlanetProfileId.Frontier]: 0.95,
  [StrategicPlanetProfileId.GasFrontier]: 1,
  [StrategicPlanetProfileId.Trade]: 0.8,
  [StrategicPlanetProfileId.ResearchHub]: 0.75,
  [StrategicPlanetProfileId.Fortress]: 1,
  [StrategicPlanetProfileId.DarkMatter]: 1,
};
const NATURAL_FOREST_ARCHETYPE_DENSITY_MULTIPLIERS: Record<RivalArchetypeId, number> = {
  forest: 1.2,
  mountain: 0.65,
  harbor: 0.85,
  scholar: 0.75,
  frontier: 1.05,
  native: 1.1,
};

type BuildingEntry = {
  key: string;
  nodeId: string;
  prop: BuildingProperty;
  level: number;
  kind: ReadonlyCityObjectKind;
  buildProgress?: number;
};

type SlotAnchor = {
  x: number;
  z: number;
};

type CellOccupancy = Set<string>;

export interface CitySceneServiceDependencies {
  rivalCityManager: RivalCityManager;
  galaxyManager: StrategicGalaxyManager;
}

export class CitySceneService {
  private readonly buildingDefMap = new Map(
    Object.values(buildingDefs).map((def) => [def.id, def]),
  );
  private readonly forestNoise = new ImprovedNoise();

  constructor(private readonly deps: CitySceneServiceDependencies) {}

  buildNpcCityScene(selection: CitySceneSelection): ReadonlyCityLayoutSnapshot | undefined {
    const placement = this.deps.galaxyManager.getCityPlacement(selection.cityId);
    const cityState = this.deps.rivalCityManager.getCityState(selection.cityId);
    if (!placement || !cityState || placement.kind === "player") {
      return undefined;
    }

    const planetDef = this.deps.galaxyManager.getPlanetDef(selection.planetId);
    if (!planetDef) {
      return undefined;
    }

    const cityOutput = this.deps.galaxyManager.getLatestCityOutput(selection.cityId);
    const ground = this.buildGroundTheme(planetDef);
    const objects = this.buildLayoutSnapshot(selection, cityState);
    const environment = this.buildNpcEnvironmentSnapshot(selection, planetDef, cityState, objects);
    const cameraTarget = objects.find((object) => object.kind === ReadonlyCityObjectKind.CivicCore)?.position
      ?? objects[0]?.position
      ?? new THREE.Vector3();

    return {
      selection,
      ground,
      cameraTarget: cameraTarget.clone(),
      objects,
      environment,
      summary: {
        cityId: cityState.id,
        name: cityState.name,
        planetId: cityState.planetId,
        profileId: planetDef.profileId,
        factionId: cityState.factionId,
        factionLabel: FACTION_LABELS[cityState.factionId],
        kindLabel: placement.kindLabel,
        cityDefId: cityState.cityDefId,
        status: cityState.status,
        turn: cityState.turn,
        score: cityState.score,
        policies: cityState.policies,
        specialResources: cityState.specialResources,
        resourceOutput: cityOutput?.resourceOutput ?? {},
      },
    };
  }

  private buildGroundTheme(planetDef: StrategicPlanetDef): CityGroundTheme {
    return {
      color: new THREE.Color(PROFILE_THEME_COLORS[planetDef.profileId]),
    };
  }

  private buildLayoutSnapshot(
    selection: CitySceneSelection,
    cityState: RivalCityState,
  ): ReadonlyCityObjectSnapshot[] {
    const occupancy = new Set<string>();
    const objects: ReadonlyCityObjectSnapshot[] = [];
    const builtEntries = this.getBuiltEntries(cityState);
    const queueEntries = this.getQueueEntries(cityState);
    const slotAnchors = {
      town: createSpiralAnchors(TOWN_CENTER, GENERIC_SLOT_SPACING, TOWN_SLOT_RINGS),
      forest: createSpiralAnchors(FOREST_POCKET_CENTER, POCKET_SLOT_SPACING, POCKET_SLOT_RINGS),
      mine: createSpiralAnchors(MINE_POCKET_CENTER, POCKET_SLOT_SPACING, POCKET_SLOT_RINGS),
    };

    for (const entry of [...builtEntries, ...queueEntries]) {
      const position = this.claimObjectPosition(entry, occupancy, slotAnchors);
      if (!position) {
        console.warn(`[CitySceneService] Failed to place city object: ${selection.cityId}/${entry.key}`);
        continue;
      }

      objects.push({
        key: entry.key,
        kind: entry.kind,
        nodeId: entry.nodeId,
        assetKey: entry.kind === ReadonlyCityObjectKind.ConstructionSite
          ? Char.KaykitMedHexagonBuildingsNeutralPackBuildingScaffolding
          : entry.prop.assetKey,
        position,
        rotationY: this.resolveObjectRotation(selection.cityId, entry.key, entry.kind),
        scale: entry.kind === ReadonlyCityObjectKind.ConstructionSite
          ? Math.max(8, entry.prop.scale * 0.95)
          : entry.prop.scale,
        width: entry.prop.size.width,
        depth: entry.prop.size.depth,
        level: entry.level,
        buildProgress: entry.buildProgress,
      });
    }

    return objects;
  }

  private buildNpcEnvironmentSnapshot(
    selection: CitySceneSelection,
    planetDef: StrategicPlanetDef,
    cityState: RivalCityState,
    objects: ReadonlyCityObjectSnapshot[],
  ): NpcEnvironmentObjectSnapshot[] {
    const occupied = new Set<string>();
    for (const object of objects) {
      addOccupiedCells(occupied, object.position, object.width, object.depth);
    }

    const environment: NpcEnvironmentObjectSnapshot[] = [];
    const debugSources: string[] = [];
    const resourceObjects = objects.filter((object) => (
      object.nodeId === "lumbermill" || object.nodeId === "mine"
    ));

    for (const object of resourceObjects) {
      const nodeId = object.nodeId === "lumbermill" ? "pine_tree" : "gold_node";
      const cluster = this.placeEnvironmentCluster(
        selection.cityId,
        `${object.key}:${nodeId}`,
        nodeId,
        object.position,
        occupied,
      );
      environment.push(...cluster);
      debugSources.push(`resource:${object.nodeId}->${nodeId}:${cluster.length}`);
    }

    const ambientNodes = PROFILE_AMBIENT_ENVIRONMENT[planetDef.profileId];
    ambientNodes.forEach((nodeId) => {
      const prop = environmentDefs[nodeId];
      const ambientAnchors = prop.type === EnvironmentType.Tree
        ? [FOREST_POCKET_CENTER]
        : planetDef.profileId === StrategicPlanetProfileId.IceMoon
          ? [MINE_POCKET_CENTER]
          : [FOREST_POCKET_CENTER, MINE_POCKET_CENTER];
      ambientAnchors.forEach((anchor, anchorIndex) => {
        const ambientKey = `${selection.cityId}:ambient:${anchorIndex}:${nodeId}`;
        const center = createAlignedPosition(
          anchor.x + (anchorIndex * 4),
          anchor.z - (anchorIndex * 3),
          1,
          1,
        );
        const cluster = this.placeEnvironmentCluster(
          selection.cityId,
          ambientKey,
          nodeId,
          center,
          occupied,
          AMBIENT_ENVIRONMENT_CLUSTER_COUNT,
        );
        environment.push(...cluster);
        debugSources.push(`ambient:${nodeId}:anchor=${anchorIndex}:center=${formatDebugVector(center)}:count=${cluster.length}`);
      });
    });

    const naturalForestDensity = this.resolveNaturalForestDensity(planetDef, cityState);
    const naturalForest = this.placeNaturalRadialForest(selection.cityId, planetDef, cityState, occupied);
    environment.push(...naturalForest);
    debugSources.push(`natural:pine_tree:${naturalForest.length}:density=${naturalForestDensity.toFixed(3)}`);

    console.log(
      `[CitySceneService] npcEnv city=${selection.cityId} profile=${planetDef.profileId} ` +
      `objects=${objects.length} resourceObjects=${resourceObjects.length} total=${environment.length} ` +
      `counts=${formatEnvironmentCounts(environment)} bounds=${formatEnvironmentBounds(environment)} ` +
      `sources=${debugSources.join(",")}`,
    );

    return environment;
  }

  private placeNaturalRadialForest(
    cityId: string,
    planetDef: StrategicPlanetDef,
    cityState: RivalCityState,
    occupied: CellOccupancy,
  ): NpcEnvironmentObjectSnapshot[] {
    const profileId = planetDef.profileId;
    const naturalForestEnabled = PROFILE_NATURAL_FOREST_ENABLED[profileId] > 0;
    if (!naturalForestEnabled) {
      return [];
    }

    const nodeId: NpcEnvironmentNodeId = "pine_tree";
    const prop = environmentDefs[nodeId];
    const minGrid = Math.round(-NATURAL_FOREST_HALF_EXTENT / GRID_SIZE);
    const maxGrid = Math.round((NATURAL_FOREST_HALF_EXTENT - GRID_SIZE) / GRID_SIZE);
    const cells = createRadialEnvironmentPattern({
      centerX: TOWN_CENTER.x,
      centerZ: TOWN_CENTER.z,
      minGridX: minGrid,
      maxGridX: maxGrid,
      minGridZ: minGrid,
      maxGridZ: maxGrid,
      gridSize: GRID_SIZE,
      footprintWidth: prop.size.width,
      footprintDepth: prop.size.depth,
      density: this.resolveNaturalForestDensity(planetDef, cityState),
      threshold: NATURAL_FOREST_NOISE_THRESHOLD,
      noiseScale: NATURAL_FOREST_NOISE_SCALE,
      clearingRadius: NATURAL_FOREST_CLEARING_RADIUS,
      roadCount: NATURAL_FOREST_ROAD_COUNT,
      roadWidth: NATURAL_FOREST_ROAD_WIDTH,
      roadAngleOffset: NATURAL_FOREST_ROAD_ANGLE_OFFSET,
      noise: this.forestNoise,
      random: mulberry32(seedFromCityId(`${cityId}:natural-forest`)),
      occupied,
    });
    const results: NpcEnvironmentObjectSnapshot[] = [];

    for (const cell of cells) {
      mergeOccupiedCells(occupied, cell.cells);
      const key = `natural-forest:${cell.gridX}:${cell.gridZ}`;
      results.push({
        key,
        nodeId,
        position: cell.position,
        rotationY: this.resolveEnvironmentRotation(cityId, key, prop.randomRotation === true),
        scale: this.resolveEnvironmentScale(cityId, key, prop.scale, prop.randomScaleRange),
      });
    }

    return results;
  }

  private resolveNaturalForestDensity(
    planetDef: StrategicPlanetDef,
    cityState: RivalCityState,
  ): number {
    const cityDef = rivalCityDefs[cityState.cityDefId];
    const profileMultiplier = NATURAL_FOREST_PROFILE_DENSITY_MULTIPLIERS[planetDef.profileId];
    const planetWoodBias = planetDef.resourceBias[CurrencyType.Wood] ?? 1;
    const cityWoodBias = cityDef.resourceBias[CurrencyType.Wood] ?? 1;
    const archetypeMultiplier = NATURAL_FOREST_ARCHETYPE_DENSITY_MULTIPLIERS[cityState.archetypeId];
    const density = NATURAL_FOREST_DENSITY
      * profileMultiplier
      * planetWoodBias
      * cityWoodBias
      * archetypeMultiplier;

    return THREE.MathUtils.clamp(
      density,
      NATURAL_FOREST_MIN_DENSITY,
      NATURAL_FOREST_MAX_DENSITY,
    );
  }

  private placeEnvironmentCluster(
    cityId: string,
    baseKey: string,
    nodeId: NpcEnvironmentNodeId,
    anchorPosition: THREE.Vector3,
    occupied: CellOccupancy,
    desiredCount = nodeId === "pine_tree" ? RESOURCE_TREE_CLUSTER_COUNT : RESOURCE_GOLD_CLUSTER_COUNT,
  ): NpcEnvironmentObjectSnapshot[] {
    const prop = environmentDefs[nodeId];
    const baseGridX = Math.floor(anchorPosition.x / GRID_SIZE);
    const baseGridZ = Math.floor(anchorPosition.z / GRID_SIZE);
    const offsets = shuffleAnchors(
      createSpiralAnchors({ x: baseGridX - 2, z: baseGridZ - 2 }, 2, 3),
      seedFromCityId(`${cityId}:${baseKey}`),
    );
    const results: NpcEnvironmentObjectSnapshot[] = [];

    for (const [index, offset] of offsets.entries()) {
      if (results.length >= desiredCount) break;
      const position = createAlignedPosition(offset.x, offset.z, prop.size.width, prop.size.depth);
      const cells = getFootprintGridCellKeys(position, prop.size.width, prop.size.depth, GRID_SIZE);
      if (hasGridCellOverlap(occupied, cells)) {
        continue;
      }

      mergeOccupiedCells(occupied, cells);
      const key = `${baseKey}:${index}`;
      results.push({
        key,
        nodeId,
        position,
        rotationY: this.resolveEnvironmentRotation(cityId, key, prop.randomRotation === true),
        scale: this.resolveEnvironmentScale(cityId, key, prop.scale, prop.randomScaleRange),
      });
    }

    return results;
  }

  private claimObjectPosition(
    entry: BuildingEntry,
    occupied: CellOccupancy,
    slotAnchors: Record<"town" | "forest" | "mine", SlotAnchor[]>,
  ): THREE.Vector3 | undefined {
    const anchors = entry.kind === ReadonlyCityObjectKind.CivicCore
      ? [CORE_ANCHOR]
      : entry.nodeId === "lumbermill"
        ? [...slotAnchors.forest, ...slotAnchors.town]
        : entry.nodeId === "mine"
          ? [...slotAnchors.mine, ...slotAnchors.town]
          : slotAnchors.town;

    for (const anchor of anchors) {
      const position = createAlignedPosition(anchor.x, anchor.z, entry.prop.size.width, entry.prop.size.depth);
      const cells = getFootprintGridCellKeys(position, entry.prop.size.width, entry.prop.size.depth, GRID_SIZE);
      if (hasGridCellOverlap(occupied, cells)) {
        continue;
      }

      mergeOccupiedCells(occupied, cells);
      return position;
    }

    return undefined;
  }

  private getBuiltEntries(cityState: RivalCityState): BuildingEntry[] {
    return [...cityState.buildings]
      .sort((left, right) => compareBuildingStates(left, right))
      .flatMap((building) => {
        const prop = this.buildingDefMap.get(building.buildingId);
        if (!prop) {
          return [];
        }
        return [{
          key: `building:${building.id}`,
          nodeId: building.buildingId,
          prop,
          level: building.level,
          kind: building.buildingId === "cc"
            ? ReadonlyCityObjectKind.CivicCore
            : ReadonlyCityObjectKind.Building,
        }];
      });
  }

  private getQueueEntries(cityState: RivalCityState): BuildingEntry[] {
    return [...cityState.buildQueue]
      .sort((left, right) => left.id.localeCompare(right.id))
      .flatMap((task) => {
        const prop = this.buildingDefMap.get(task.buildingId);
        if (!prop) {
          return [];
        }

        const buildTurns = Math.max(1, prop.buildTurns);
        return [{
          key: `queue:${task.id}`,
          nodeId: task.buildingId,
          prop,
          level: 0,
          kind: ReadonlyCityObjectKind.ConstructionSite,
          buildProgress: 1 - (task.remainingTurns / buildTurns),
        }];
      });
  }

  private resolveObjectRotation(cityId: string, key: string, kind: ReadonlyCityObjectKind): number {
    if (kind === ReadonlyCityObjectKind.CivicCore) {
      return 0;
    }

    const prng = mulberry32(seedFromCityId(`${cityId}:${key}:rotation`));
    return Math.floor(prng() * 4) * (Math.PI * 0.5);
  }

  private resolveEnvironmentRotation(cityId: string, key: string, randomRotation: boolean): number {
    if (!randomRotation) {
      return 0;
    }

    const prng = mulberry32(seedFromCityId(`${cityId}:${key}:rotation`));
    return prng() * Math.PI * 2;
  }

  private resolveEnvironmentScale(
    cityId: string,
    key: string,
    baseScale: number,
    range?: readonly [number, number],
  ): number {
    if (!range) {
      return baseScale;
    }

    const prng = mulberry32(seedFromCityId(`${cityId}:${key}:scale`));
    return baseScale * THREE.MathUtils.lerp(range[0], range[1], prng());
  }
}

function compareBuildingStates(left: RivalBuildingState, right: RivalBuildingState): number {
  if (left.buildingId === "cc" && right.buildingId !== "cc") return -1;
  if (left.buildingId !== "cc" && right.buildingId === "cc") return 1;
  return left.builtTurn - right.builtTurn || left.id.localeCompare(right.id);
}

function createSpiralAnchors(center: SlotAnchor, spacing: number, rings: number): SlotAnchor[] {
  const anchors: SlotAnchor[] = [{ ...center }];

  for (let ring = 1; ring <= rings; ring++) {
    const min = -ring;
    const max = ring;
    for (let x = min; x <= max; x++) {
      anchors.push({ x: center.x + (x * spacing), z: center.z + (min * spacing) });
      anchors.push({ x: center.x + (x * spacing), z: center.z + (max * spacing) });
    }
    for (let z = min + 1; z <= max - 1; z++) {
      anchors.push({ x: center.x + (min * spacing), z: center.z + (z * spacing) });
      anchors.push({ x: center.x + (max * spacing), z: center.z + (z * spacing) });
    }
  }

  return uniqAnchors(anchors);
}

function shuffleAnchors(anchors: SlotAnchor[], seed: number): SlotAnchor[] {
  const prng = mulberry32(seed);
  const result = [...anchors];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(prng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function uniqAnchors(anchors: SlotAnchor[]): SlotAnchor[] {
  const seen = new Set<string>();
  const result: SlotAnchor[] = [];
  for (const anchor of anchors) {
    const key = `${anchor.x},${anchor.z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(anchor);
  }
  return result;
}

function createAlignedPosition(gridX: number, gridZ: number, width: number, depth: number): THREE.Vector3 {
  const offsetX = (width % 2 !== 0) ? GRID_SIZE * 0.5 : 0;
  const offsetZ = (depth % 2 !== 0) ? GRID_SIZE * 0.5 : 0;
  return new THREE.Vector3(gridX * GRID_SIZE + offsetX, 0, gridZ * GRID_SIZE + offsetZ);
}

function addOccupiedCells(occupied: CellOccupancy, position: THREE.Vector3, width: number, depth: number): void {
  mergeOccupiedCells(occupied, getFootprintGridCellKeys(position, width, depth, GRID_SIZE));
}

function mergeOccupiedCells(occupied: CellOccupancy, cells: ReadonlySet<string>): void {
  for (const cell of cells) {
    occupied.add(cell);
  }
}

function formatDebugVector(position: THREE.Vector3): string {
  return `(${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z.toFixed(1)})`;
}

function formatEnvironmentCounts(environment: readonly NpcEnvironmentObjectSnapshot[]): string {
  const counts = new Map<NpcEnvironmentNodeId, number>();
  for (const object of environment) {
    counts.set(object.nodeId, (counts.get(object.nodeId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([nodeId, count]) => `${nodeId}:${count}`)
    .join("|") || "none";
}

function formatEnvironmentBounds(environment: readonly NpcEnvironmentObjectSnapshot[]): string {
  if (environment.length === 0) return "empty";

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const object of environment) {
    minX = Math.min(minX, object.position.x);
    maxX = Math.max(maxX, object.position.x);
    minZ = Math.min(minZ, object.position.z);
    maxZ = Math.max(maxZ, object.position.z);
  }

  return `x=${minX.toFixed(1)}..${maxX.toFixed(1)} z=${minZ.toFixed(1)}..${maxZ.toFixed(1)}`;
}
