import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionId } from "@Glibs/gameobjects/turntypes";
import { StrategicPlanetId, StrategicRouteId } from "./strategicgalaxytypes";

export const StrategicFleetMission = {
  Idle: "idle",
  Patrol: "patrol",
  Escort: "escort",
  Blockade: "blockade",
  Reinforce: "reinforce",
  Raid: "raid",
  Attack: "attack",
  Repair: "repair",
} as const;

export type StrategicFleetMission = typeof StrategicFleetMission[keyof typeof StrategicFleetMission];

export const StrategicFleetMissions: readonly StrategicFleetMission[] = Object.values(StrategicFleetMission);

export function parseStrategicFleetMission(value: unknown): StrategicFleetMission | undefined {
  return typeof value === "string" && StrategicFleetMissions.includes(value as StrategicFleetMission)
    ? value as StrategicFleetMission
    : undefined;
}

export const StrategicFleetOrderType = {
  Move: "move",
  Attack: "attack",
  Maintenance: "maintenance",
  Mission: "mission",
} as const;

export type StrategicFleetOrderType = typeof StrategicFleetOrderType[keyof typeof StrategicFleetOrderType];

export const StrategicFleetMaintenanceKind = {
  RepairHull: "repairHull",
  RestoreReadiness: "restoreReadiness",
  Resupply: "resupply",
  Refit: "refit",
  Merge: "merge",
  Split: "split",
} as const;

export type StrategicFleetMaintenanceKind =
  typeof StrategicFleetMaintenanceKind[keyof typeof StrategicFleetMaintenanceKind];

export interface StrategicFleetState {
  id: string;
  name?: string;
  factionId: FactionId;
  currentPlanetId: StrategicPlanetId;
  targetPlanetId?: StrategicPlanetId;
  routeId?: StrategicRouteId;
  mission: StrategicFleetMission;
  strength: number;
  readiness: number;
  hullRatio: number;
  supply: number;
  etaTurns?: number;
  linkedFleetWorldId?: string;
}

// ─── 전략 명령 ────────────────────────────────────────────────────────────────

export interface StrategicFleetMoveOrder {
  type: typeof StrategicFleetOrderType.Move;
  fleetId: string;
  fromPlanetId: StrategicPlanetId;
  toPlanetId: StrategicPlanetId;
  routeIds: StrategicRouteId[];
  etaTurns: number;
}

export interface StrategicFleetAttackOrder {
  type: typeof StrategicFleetOrderType.Attack;
  fleetId: string;
  targetPlanetId?: StrategicPlanetId;
  targetFleetId?: string;
  estimatedWinRate: number;
  riskLevel: number;
}

export interface StrategicFleetMaintenanceOrder {
  type: typeof StrategicFleetOrderType.Maintenance;
  fleetId: string;
  planetId: StrategicPlanetId;
  kind: StrategicFleetMaintenanceKind;
  cost: Partial<Record<CurrencyType, number>>;
  durationTurns: number;
}

export interface StrategicFleetMissionOrder {
  type: typeof StrategicFleetOrderType.Mission;
  fleetId: string;
  mission: StrategicFleetMission;
  planetId?: StrategicPlanetId;
  routeId?: StrategicRouteId;
}

export type StrategicFleetOrder =
  | StrategicFleetMoveOrder
  | StrategicFleetAttackOrder
  | StrategicFleetMaintenanceOrder
  | StrategicFleetMissionOrder;
