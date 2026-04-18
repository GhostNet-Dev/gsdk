import * as THREE from "three";

const EDGE_EPSILON = 1e-6;

export interface GridCell {
  x: number;
  z: number;
}

export function gridCellKey(cell: GridCell): string {
  return `${cell.x},${cell.z}`;
}

export function gridCellCenter(cell: GridCell, gridSize: number): THREE.Vector3 {
  return new THREE.Vector3(
    cell.x * gridSize + gridSize * 0.5,
    0,
    cell.z * gridSize + gridSize * 0.5,
  );
}

export function collectCircularGridCells(center: THREE.Vector3, radiusWorld: number, gridSize: number): GridCell[] {
  if (!Number.isFinite(radiusWorld) || radiusWorld <= 0) return [];

  const baseX = Math.floor(center.x / gridSize);
  const baseZ = Math.floor(center.z / gridSize);
  const cellRadius = Math.ceil(radiusWorld / gridSize);
  const radiusSq = radiusWorld * radiusWorld;
  const cells: GridCell[] = [];

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      const cell = { x: baseX + dx, z: baseZ + dz };
      const cellCenter = gridCellCenter(cell, gridSize);
      const distX = cellCenter.x - center.x;
      const distZ = cellCenter.z - center.z;
      if (distX * distX + distZ * distZ <= radiusSq) cells.push(cell);
    }
  }

  return cells;
}

export function collectCircularGridCellKeys(center: THREE.Vector3, radiusWorld: number, gridSize: number): Set<string> {
  return new Set(collectCircularGridCells(center, radiusWorld, gridSize).map(gridCellKey));
}

export function getFootprintGridCells(
  center: THREE.Vector3,
  width: number,
  depth: number,
  gridSize: number,
): GridCell[] {
  const halfWidth = width * gridSize * 0.5;
  const halfDepth = depth * gridSize * 0.5;
  const minX = center.x - halfWidth;
  const maxX = center.x + halfWidth;
  const minZ = center.z - halfDepth;
  const maxZ = center.z + halfDepth;

  const startX = Math.floor((minX + EDGE_EPSILON) / gridSize);
  const endX = Math.ceil((maxX - EDGE_EPSILON) / gridSize) - 1;
  const startZ = Math.floor((minZ + EDGE_EPSILON) / gridSize);
  const endZ = Math.ceil((maxZ - EDGE_EPSILON) / gridSize) - 1;
  const cells: GridCell[] = [];

  for (let x = startX; x <= endX; x++) {
    for (let z = startZ; z <= endZ; z++) {
      cells.push({ x, z });
    }
  }

  return cells;
}

export function getFootprintGridCellKeys(
  center: THREE.Vector3,
  width: number,
  depth: number,
  gridSize: number,
): Set<string> {
  return new Set(getFootprintGridCells(center, width, depth, gridSize).map(gridCellKey));
}

export function hasGridCellOverlap(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const key of b) {
    if (a.has(key)) return true;
  }
  return false;
}
