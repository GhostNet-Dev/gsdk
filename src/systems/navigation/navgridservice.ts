import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { BuildingDestroyedPayload, EventTypes } from "@Glibs/types/globaltypes";
import { TargetRecord } from "@Glibs/systems/targeting/targettypes";
import { GetHorizontalDistanceToBoxSurface } from "@Glibs/actors/battle/meleecombat";
import {
  INavGridService,
  NavGridBuildOptions,
  NavGridCell,
  NavGridObstacle,
  NavObstacleSource,
  NavPathRequest,
  NavPathResult,
  NavPathStatus,
} from "./navtypes";

type CellKey = string;

type AStarNode = {
  cell: NavGridCell;
  key: CellKey;
  g: number;
  f: number;
};

const DEFAULT_INFLATE_WORLD = 1.2;
const WALKABLE_SEARCH_RING = 12;
const SURFACE_EPSILON = 0.001;

export class NavGridService implements INavGridService {
  private version = 0;
  private ready = false;
  private gridSize = 4;
  private minX = 0;
  private maxX = 0;
  private minZ = 0;
  private maxZ = 0;
  private center = new THREE.Vector3();
  private radius = 0;
  private inflateWorld = DEFAULT_INFLATE_WORLD;
  private readonly blocked = new Set<CellKey>();
  private heightProvider?: { getHeightAt(worldX: number, worldZ: number): number };

  private readonly requestListener = () => {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterNavGridService, this);
  };

  private readonly buildingDestroyedListener = (payload: BuildingDestroyedPayload) => {
    this.unblockObstacle({
      id: payload.id,
      source: NavObstacleSource.BuildingDestroyed,
      position: payload.position,
      width: payload.width,
      depth: payload.depth,
      bounds: payload.bounds,
    });
  };

  constructor(private readonly eventCtrl: IEventController) {
    this.eventCtrl.RegisterEventListener(EventTypes.RequestNavGridService, this.requestListener);
    this.eventCtrl.RegisterEventListener(EventTypes.BuildingDestroyed, this.buildingDestroyedListener);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterNavGridService, this);
  }

  get Version() { return this.version; }
  get IsReady() { return this.ready; }

  build(options: NavGridBuildOptions): void {
    this.gridSize = options.gridSize;
    this.center.copy(options.center);
    this.radius = options.radius;
    this.inflateWorld = options.inflateWorld ?? DEFAULT_INFLATE_WORLD;
    this.heightProvider = options.heightProvider;
    this.minX = Math.floor((options.center.x - options.radius) / this.gridSize);
    this.maxX = Math.ceil((options.center.x + options.radius) / this.gridSize);
    this.minZ = Math.floor((options.center.z - options.radius) / this.gridSize);
    this.maxZ = Math.ceil((options.center.z + options.radius) / this.gridSize);
    this.blocked.clear();

    for (const obstacle of options.obstacles) {
      this.blockObstacle(obstacle);
    }

    this.ready = true;
    this.version++;
  }

  clear(): void {
    this.ready = false;
    this.blocked.clear();
    this.heightProvider = undefined;
    this.version++;
  }

  findPath(request: NavPathRequest): NavPathResult {
    if (!this.ready) {
      return {
        status: NavPathStatus.NoGrid,
        gridVersion: this.version,
        waypoints: [request.start.clone(), this.resolveTargetPoint(request.target).clone()],
      };
    }

    const start = this.snapCellToWalkable(this.worldToCell(request.start));
    if (!start) {
      return { status: NavPathStatus.NoPath, gridVersion: this.version, waypoints: [] };
    }
    const goals = this.resolveGoalCells(request.target, request.attackRange, start);
    if (goals.length === 0) {
      return { status: NavPathStatus.NoPath, gridVersion: this.version, waypoints: [] };
    }

    const goalKeys = new Set(goals.map((cell) => this.cellKey(cell)));
    const path = this.search(start, goals, goalKeys);
    if (path.length === 0) {
      return { status: NavPathStatus.NoPath, gridVersion: this.version, waypoints: [] };
    }

    return {
      status: NavPathStatus.Complete,
      gridVersion: this.version,
      waypoints: this.smoothCells(path).map((cell) => this.cellToWorld(cell)),
    };
  }

  snapToWalkable(pos: THREE.Vector3, maxRing = WALKABLE_SEARCH_RING): THREE.Vector3 {
    if (!this.ready) return pos.clone();
    const cell = this.snapCellToWalkable(this.worldToCell(pos), maxRing);
    return cell ? this.cellToWorld(cell) : pos.clone();
  }

  getHeightAt(worldX: number, worldZ: number, fallbackY = 0): number {
    return this.heightProvider?.getHeightAt(worldX, worldZ) ?? fallbackY;
  }

  private blockObstacle(obstacle: NavGridObstacle): void {
    for (const cell of this.getObstacleCells(obstacle)) {
      if (this.isInBounds(cell)) this.blocked.add(this.cellKey(cell));
    }
  }

  private unblockObstacle(obstacle: NavGridObstacle): void {
    if (!this.ready) return;
    let changed = false;
    for (const cell of this.getObstacleCells(obstacle)) {
      if (this.blocked.delete(this.cellKey(cell))) changed = true;
    }
    if (changed) this.version++;
  }

  private getObstacleCells(obstacle: NavGridObstacle): NavGridCell[] {
    const box = obstacle.bounds?.clone() ?? this.createFootprintBox(obstacle);
    box.min.x -= this.inflateWorld;
    box.min.z -= this.inflateWorld;
    box.max.x += this.inflateWorld;
    box.max.z += this.inflateWorld;

    const minCell = this.worldToCell(new THREE.Vector3(box.min.x, 0, box.min.z));
    const maxCell = this.worldToCell(new THREE.Vector3(box.max.x, 0, box.max.z));
    const cells: NavGridCell[] = [];

    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let z = minCell.z; z <= maxCell.z; z++) {
        const center = this.cellToWorld({ x, z });
        const half = this.gridSize * 0.5;
        const cellMinX = center.x - half;
        const cellMaxX = center.x + half;
        const cellMinZ = center.z - half;
        const cellMaxZ = center.z + half;
        if (
          cellMinX < box.max.x - SURFACE_EPSILON &&
          cellMaxX > box.min.x + SURFACE_EPSILON &&
          cellMinZ < box.max.z - SURFACE_EPSILON &&
          cellMaxZ > box.min.z + SURFACE_EPSILON
        ) {
          cells.push({ x, z });
        }
      }
    }

    return cells;
  }

  private createFootprintBox(obstacle: NavGridObstacle): THREE.Box3 {
    const halfW = obstacle.width * this.gridSize * 0.5;
    const halfD = obstacle.depth * this.gridSize * 0.5;
    return new THREE.Box3(
      new THREE.Vector3(obstacle.position.x - halfW, obstacle.position.y, obstacle.position.z - halfD),
      new THREE.Vector3(obstacle.position.x + halfW, obstacle.position.y, obstacle.position.z + halfD),
    );
  }

  private resolveGoalCells(target: TargetRecord, attackRange: number, start: NavGridCell): NavGridCell[] {
    if (target.kind !== "structure") {
      const cell = this.snapCellToWalkable(this.worldToCell(target.object.position));
      return cell ? [cell] : [];
    }

    const bounds = target.bounds && !target.bounds.isEmpty()
      ? target.bounds
      : new THREE.Box3().setFromObject(target.object);
    if (bounds.isEmpty()) {
      const cell = this.snapCellToWalkable(this.worldToCell(target.object.position));
      return cell ? [cell] : [];
    }

    const range = Math.max(attackRange, this.gridSize);
    const minCell = this.worldToCell(new THREE.Vector3(bounds.min.x - range, 0, bounds.min.z - range));
    const maxCell = this.worldToCell(new THREE.Vector3(bounds.max.x + range, 0, bounds.max.z + range));
    const candidates: Array<{ cell: NavGridCell; score: number }> = [];
    const closest = new THREE.Vector3();

    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let z = minCell.z; z <= maxCell.z; z++) {
        const cell = { x, z };
        if (!this.isWalkable(cell)) continue;
        const pos = this.cellToWorld(cell);
        const dist = GetHorizontalDistanceToBoxSurface(pos, bounds, target.object.position, closest);
        if (dist > range) continue;
        const score = this.heuristic(start, cell) + dist * 0.1;
        candidates.push({ cell, score });
      }
    }

    candidates.sort((a, b) => a.score - b.score);
    return candidates.slice(0, 24).map((candidate) => candidate.cell);
  }

  private resolveTargetPoint(target: TargetRecord): THREE.Vector3 {
    if (target.bounds && !target.bounds.isEmpty()) {
      return target.bounds.getCenter(new THREE.Vector3());
    }
    return target.object.position.clone();
  }

  private search(start: NavGridCell, goals: NavGridCell[], goalKeys: Set<CellKey>): NavGridCell[] {
    const open: AStarNode[] = [];
    const openKeys = new Set<CellKey>();
    const closed = new Set<CellKey>();
    const cameFrom = new Map<CellKey, CellKey>();
    const cells = new Map<CellKey, NavGridCell>();
    const gScore = new Map<CellKey, number>();
    const startKey = this.cellKey(start);

    cells.set(startKey, start);
    gScore.set(startKey, 0);
    open.push({ cell: start, key: startKey, g: 0, f: this.bestGoalHeuristic(start, goals) });
    openKeys.add(startKey);

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      openKeys.delete(current.key);

      if (goalKeys.has(current.key)) {
        return this.reconstructPath(current.key, cameFrom, cells);
      }

      closed.add(current.key);

      for (const neighbor of this.getNeighbors(current.cell)) {
        const key = this.cellKey(neighbor);
        if (closed.has(key)) continue;

        const tentativeG = (gScore.get(current.key) ?? Infinity) + this.moveCost(current.cell, neighbor);
        if (tentativeG >= (gScore.get(key) ?? Infinity)) continue;

        cameFrom.set(key, current.key);
        cells.set(key, neighbor);
        gScore.set(key, tentativeG);
        if (!openKeys.has(key)) {
          open.push({
            cell: neighbor,
            key,
            g: tentativeG,
            f: tentativeG + this.bestGoalHeuristic(neighbor, goals),
          });
          openKeys.add(key);
        }
      }
    }

    return [];
  }

  private reconstructPath(endKey: CellKey, cameFrom: Map<CellKey, CellKey>, cells: Map<CellKey, NavGridCell>): NavGridCell[] {
    const path: NavGridCell[] = [];
    let currentKey: string | undefined = endKey;
    while (currentKey) {
      const cell = cells.get(currentKey);
      if (cell) path.push(cell);
      currentKey = cameFrom.get(currentKey);
    }
    path.reverse();
    return path;
  }

  private smoothCells(path: NavGridCell[]): NavGridCell[] {
    if (path.length <= 2) return path;

    const result: NavGridCell[] = [path[0]];
    let prevDx = path[1].x - path[0].x;
    let prevDz = path[1].z - path[0].z;

    for (let i = 1; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dz = path[i + 1].z - path[i].z;
      if (dx !== prevDx || dz !== prevDz) {
        result.push(path[i]);
        prevDx = dx;
        prevDz = dz;
      }
    }
    result.push(path[path.length - 1]);
    return result;
  }

  private getNeighbors(cell: NavGridCell): NavGridCell[] {
    const neighbors: NavGridCell[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const next = { x: cell.x + dx, z: cell.z + dz };
        if (!this.isWalkable(next)) continue;
        if (dx !== 0 && dz !== 0) {
          if (!this.isWalkable({ x: cell.x + dx, z: cell.z })) continue;
          if (!this.isWalkable({ x: cell.x, z: cell.z + dz })) continue;
        }
        neighbors.push(next);
      }
    }
    return neighbors;
  }

  private snapCellToWalkable(cell: NavGridCell, maxRing = WALKABLE_SEARCH_RING): NavGridCell | undefined {
    if (this.isWalkable(cell)) return cell;

    for (let ring = 1; ring <= maxRing; ring++) {
      let best: NavGridCell | undefined;
      let bestDist = Infinity;
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
          const candidate = { x: cell.x + dx, z: cell.z + dz };
          if (!this.isWalkable(candidate)) continue;
          const dist = dx * dx + dz * dz;
          if (dist < bestDist) {
            bestDist = dist;
            best = candidate;
          }
        }
      }
      if (best) return best;
    }

    return undefined;
  }

  private isWalkable(cell: NavGridCell): boolean {
    return this.isInBounds(cell) && !this.blocked.has(this.cellKey(cell));
  }

  private isInBounds(cell: NavGridCell): boolean {
    return cell.x >= this.minX && cell.x <= this.maxX && cell.z >= this.minZ && cell.z <= this.maxZ;
  }

  private worldToCell(pos: THREE.Vector3): NavGridCell {
    return {
      x: Math.round(pos.x / this.gridSize),
      z: Math.round(pos.z / this.gridSize),
    };
  }

  private cellToWorld(cell: NavGridCell): THREE.Vector3 {
    const x = cell.x * this.gridSize;
    const z = cell.z * this.gridSize;
    return new THREE.Vector3(x, this.getHeightAt(x, z), z);
  }

  private cellKey(cell: NavGridCell): CellKey {
    return `${cell.x}:${cell.z}`;
  }

  private moveCost(a: NavGridCell, b: NavGridCell): number {
    return a.x !== b.x && a.z !== b.z ? Math.SQRT2 : 1;
  }

  private bestGoalHeuristic(cell: NavGridCell, goals: NavGridCell[]): number {
    let best = Infinity;
    for (const goal of goals) {
      best = Math.min(best, this.heuristic(cell, goal));
    }
    return best;
  }

  private heuristic(a: NavGridCell, b: NavGridCell): number {
    const dx = Math.abs(a.x - b.x);
    const dz = Math.abs(a.z - b.z);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  }
}
