import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ITurnParticipant, TurnContext } from "@Glibs/gameobjects/turntypes";
import { StrategicPlanetState, StrategicRouteState } from "./strategicgalaxytypes";
import {
  StrategicFleetMaintenanceKind,
  StrategicFleetMission,
  StrategicFleetOrder,
  StrategicFleetOrderType,
  StrategicFleetState,
} from "./strategicfleetstate";

export interface StrategicFleetHost {
  getPlanetStateMap(): Map<string, StrategicPlanetState>;
  getRouteStateMap(): Map<string, StrategicRouteState>;
  getFleetStateMap(): Map<string, StrategicFleetState>;
}

export class StrategicFleetManager implements ITurnParticipant {
  readonly turnId = "strategic-fleet";
  readonly turnOrder = 220;

  private pendingOrders: StrategicFleetOrder[] = [];

  constructor(
    private eventCtrl: IEventController,
    private host: StrategicFleetHost,
  ) {
    this.eventCtrl.RegisterEventListener(EventTypes.StrategicFleetOrderRequested, this.handleFleetOrder);
  }

  advanceTurn(ctx: TurnContext): void {
    this.applyPendingOrders(ctx);
    this.advanceFleetMovement(ctx);
    this.refreshStationedFleetIds();
    this.applyRouteBlockades(ctx);

    this.eventCtrl.SendEventMessage(
      EventTypes.StrategicFleetStateChanged,
      [...this.host.getFleetStateMap().values()],
    );
  }

  private handleFleetOrder = (order: StrategicFleetOrder) => {
    if (!order?.fleetId) return;
    this.pendingOrders.push(order);
  };

  private applyPendingOrders(ctx: TurnContext): void {
    const fleets = this.host.getFleetStateMap();
    const planets = this.host.getPlanetStateMap();
    const routes = this.host.getRouteStateMap();

    for (const order of this.pendingOrders.splice(0)) {
      const fleet = fleets.get(order.fleetId);
      if (!fleet) {
        console.warn(`[StrategicFleetManager] Unknown fleet order skipped: ${order.fleetId}`);
        continue;
      }

      switch (order.type) {
        case StrategicFleetOrderType.Move:
          if (!planets.has(order.fromPlanetId) || !planets.has(order.toPlanetId)) {
            console.warn(`[StrategicFleetManager] Move order has invalid endpoint: ${order.fleetId}`);
            continue;
          }
          if (fleet.currentPlanetId !== order.fromPlanetId) {
            console.warn(`[StrategicFleetManager] Move order source mismatch: ${order.fleetId}`);
            continue;
          }
          if (order.routeIds.some((routeId) => !routes.has(routeId))) {
            console.warn(`[StrategicFleetManager] Move order has invalid route: ${order.fleetId}`);
            continue;
          }
          fleet.targetPlanetId = order.toPlanetId;
          fleet.routeId = order.routeIds[order.routeIds.length - 1];
          fleet.etaTurns = Math.max(1, order.etaTurns);
          fleet.mission = StrategicFleetMission.Reinforce;
          ctx.log.add({
            source: "fleet",
            kind: "system",
            message: `함대 [${fleet.name ?? fleet.id}]가 ${order.toPlanetId}로 이동을 시작했습니다.`,
          });
          break;

        case StrategicFleetOrderType.Attack:
          fleet.mission = StrategicFleetMission.Attack;
          fleet.targetPlanetId = order.targetPlanetId;
          ctx.log.add({
            source: "fleet",
            kind: "system",
            message: `함대 [${fleet.name ?? fleet.id}]가 공격 임무를 준비합니다.`,
            data: order,
          });
          break;

        case StrategicFleetOrderType.Maintenance:
          if (!planets.has(order.planetId) || fleet.currentPlanetId !== order.planetId) {
            console.warn(`[StrategicFleetManager] Maintenance order location mismatch: ${order.fleetId}`);
            continue;
          }
          this.applyMaintenance(fleet, order.kind);
          ctx.log.add({
            source: "fleet",
            kind: "system",
            message: `함대 [${fleet.name ?? fleet.id}]가 정비를 수행했습니다.`,
            data: order,
          });
          break;

        case StrategicFleetOrderType.Mission:
          fleet.mission = order.mission;
          fleet.targetPlanetId = order.planetId;
          fleet.routeId = order.routeId;
          ctx.log.add({
            source: "fleet",
            kind: "system",
            message: `함대 [${fleet.name ?? fleet.id}] 임무가 ${order.mission}로 변경되었습니다.`,
          });
          break;
      }
    }
  }

  private advanceFleetMovement(ctx: TurnContext): void {
    for (const fleet of this.host.getFleetStateMap().values()) {
      if (!fleet.targetPlanetId || fleet.mission === StrategicFleetMission.Idle) continue;

      if ((fleet.etaTurns ?? 0) <= 1) {
        fleet.currentPlanetId = fleet.targetPlanetId;
        fleet.targetPlanetId = undefined;
        fleet.routeId = undefined;
        fleet.etaTurns = undefined;
        fleet.mission = StrategicFleetMission.Idle;

        ctx.log.add({
          source: "fleet",
          kind: "system",
          message: `함대 [${fleet.name ?? fleet.id}]가 ${fleet.currentPlanetId}에 도착했습니다.`,
        });
      } else {
        fleet.etaTurns = (fleet.etaTurns ?? 1) - 1;
      }
    }
  }

  private refreshStationedFleetIds(): void {
    const planets = this.host.getPlanetStateMap();
    for (const planet of planets.values()) {
      planet.stationedFleetIds = [];
    }

    for (const fleet of this.host.getFleetStateMap().values()) {
      if (fleet.targetPlanetId) continue;
      const planet = planets.get(fleet.currentPlanetId);
      if (planet && !planet.stationedFleetIds.includes(fleet.id)) {
        planet.stationedFleetIds.push(fleet.id);
      }
    }
  }

  private applyRouteBlockades(ctx: TurnContext): void {
    const routes = this.host.getRouteStateMap();
    for (const route of routes.values()) {
      route.blockadeLevel = 0;
    }

    for (const fleet of this.host.getFleetStateMap().values()) {
      if (fleet.mission !== StrategicFleetMission.Blockade || !fleet.routeId) continue;
      const route = routes.get(fleet.routeId);
      if (!route) continue;

      const pressure = Math.max(1, Math.ceil(fleet.strength / 50));
      route.blockadeLevel += pressure;
      route.security = Math.max(0, route.security - pressure * 3);
      route.tradeValue = Math.max(0, route.tradeValue - pressure * 5);

      ctx.log.add({
        source: "fleet",
        kind: "system",
        message: `함대 [${fleet.name ?? fleet.id}]가 ${route.id} 항로를 봉쇄 중입니다.`,
      });
      this.eventCtrl.SendEventMessage(EventTypes.RouteStateChanged, route);
    }
  }

  private applyMaintenance(fleet: StrategicFleetState, kind: StrategicFleetMaintenanceKind): void {
    fleet.mission = StrategicFleetMission.Repair;

    switch (kind) {
      case StrategicFleetMaintenanceKind.RepairHull:
        fleet.hullRatio = Math.min(1, fleet.hullRatio + 0.15);
        break;
      case StrategicFleetMaintenanceKind.RestoreReadiness:
        fleet.readiness = Math.min(100, fleet.readiness + 20);
        break;
      case StrategicFleetMaintenanceKind.Resupply:
        fleet.supply = Math.min(100, fleet.supply + 20);
        break;
      case StrategicFleetMaintenanceKind.Refit:
        fleet.readiness = Math.max(0, fleet.readiness - 10);
        fleet.strength = Math.round(fleet.strength * 1.05);
        break;
      case StrategicFleetMaintenanceKind.Merge:
      case StrategicFleetMaintenanceKind.Split:
        break;
    }
  }
}
