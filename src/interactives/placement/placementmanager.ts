import * as THREE from 'three';
import { PlacementFootprint, PlacementSource, PlacementValidationResult } from './placementtypes';

export class PlacementManager {
  private static _instance: PlacementManager | null = null;
  public static get Instance(): PlacementManager {
    if (!this._instance) this._instance = new PlacementManager();
    return this._instance;
  }

  private footprints: Map<string, PlacementFootprint> = new Map();
  private gridSize = 4.0;

  registerFootprint(item: PlacementFootprint): void {
    this.footprints.set(item.id, {
      ...item,
      pos: item.pos.clone(),
    });
  }

  unregisterFootprint(id: string): void {
    this.footprints.delete(id);
  }

  getFootprints(source?: PlacementSource): PlacementFootprint[] {
    const items = Array.from(this.footprints.values());
    return source ? items.filter(item => item.source === source) : items;
  }

  getBuildRanges(): Array<{ pos: THREE.Vector3, buildRange: number }> {
    return this.getFootprints('building')
      .filter(item => item.buildRange && item.buildRange > 0)
      .map(item => ({ pos: item.pos.clone(), buildRange: item.buildRange! }));
  }

  isFootprintOccupied(pos: THREE.Vector3, width: number, depth: number, ignoreId?: string): boolean {
    const halfW = (width * this.gridSize) * 0.5;
    const halfD = (depth * this.gridSize) * 0.5;

    const minX = pos.x - halfW + 0.1;
    const maxX = pos.x + halfW - 0.1;
    const minZ = pos.z - halfD + 0.1;
    const maxZ = pos.z + halfD - 0.1;

    for (const item of this.footprints.values()) {
      if (ignoreId && item.id === ignoreId) continue;

      const itemHalfW = (item.width * this.gridSize) * 0.5;
      const itemHalfD = (item.depth * this.gridSize) * 0.5;
      const itemMinX = item.pos.x - itemHalfW;
      const itemMaxX = item.pos.x + itemHalfW;
      const itemMinZ = item.pos.z - itemHalfD;
      const itemMaxZ = item.pos.z + itemHalfD;

      if (minX < itemMaxX && maxX > itemMinX && minZ < itemMaxZ && maxZ > itemMinZ) {
        return true;
      }
    }

    return false;
  }

  isInBuildRange(pos: THREE.Vector3): boolean {
    const buildingFootprints = this.getFootprints('building');
    const rangeProviders = buildingFootprints.filter(item => item.buildRange && item.buildRange > 0);
    if (rangeProviders.length === 0) return true;

    for (const item of rangeProviders) {
      const dist = pos.distanceTo(item.pos);
      if (dist <= item.buildRange! * this.gridSize) return true;
    }

    return false;
  }

  validatePlacement(pos: THREE.Vector3, width: number, depth: number, isBaseBuilding = false): PlacementValidationResult {
    const occupied = this.isFootprintOccupied(pos, width, depth);
    const inBuildRange = isBaseBuilding || this.isInBuildRange(pos);

    if (occupied) return { ok: false, occupied, inBuildRange, reason: 'occupied' };
    if (!inBuildRange) return { ok: false, occupied, inBuildRange, reason: 'out_of_range' };

    return { ok: true, occupied, inBuildRange };
  }
}
