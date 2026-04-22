import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise";
import { getFootprintGridCellKeys, hasGridCellOverlap } from "@Glibs/interactives/placement/gridrangeutils";

export interface RadialEnvironmentPatternCell {
  gridX: number;
  gridZ: number;
  position: THREE.Vector3;
  cells: ReadonlySet<string>;
}

export interface RadialEnvironmentPatternOptions {
  centerX: number;
  centerZ: number;
  minGridX: number;
  maxGridX: number;
  minGridZ: number;
  maxGridZ: number;
  gridSize: number;
  footprintWidth: number;
  footprintDepth: number;
  density: number;
  threshold: number;
  noiseScale: number;
  clearingRadius: number;
  roadCount: number;
  roadWidth: number;
  roadAngleOffset?: number;
  noise?: ImprovedNoise;
  random?: () => number;
  occupied?: ReadonlySet<string>;
  maxCount?: number;
  selectionMode?: "scan" | "shuffle";
}

export interface RadialPathOpeningOptions {
  centerX: number;
  centerZ: number;
  clearingRadius: number;
  roadCount: number;
  roadWidth: number;
  roadAngleOffset?: number;
}

const defaultNoise = new ImprovedNoise();

export function createRadialEnvironmentPattern(
  options: RadialEnvironmentPatternOptions,
): RadialEnvironmentPatternCell[] {
  const noise = options.noise ?? defaultNoise;
  const random = options.random ?? Math.random;
  const roadAngleOffset = options.roadAngleOffset ?? -Math.PI / 2;
  const results: RadialEnvironmentPatternCell[] = [];

  for (let gridX = options.minGridX; gridX <= options.maxGridX; gridX++) {
    for (let gridZ = options.minGridZ; gridZ <= options.maxGridZ; gridZ++) {
      const position = createAlignedPatternPosition(
        gridX,
        gridZ,
        options.footprintWidth,
        options.footprintDepth,
        options.gridSize,
      );

      if (isInsideRadialPathOpening(position, {
        centerX: options.centerX,
        centerZ: options.centerZ,
        clearingRadius: options.clearingRadius,
        roadCount: options.roadCount,
        roadWidth: options.roadWidth,
        roadAngleOffset,
      })) {
        continue;
      }

      const noiseValue = (noise.noise(position.x / options.noiseScale, position.z / options.noiseScale, 0) + 1) / 2;
      if (noiseValue <= options.threshold || random() >= options.density) {
        continue;
      }

      const cells = getFootprintGridCellKeys(
        position,
        options.footprintWidth,
        options.footprintDepth,
        options.gridSize,
      );
      if (options.occupied && hasGridCellOverlap(options.occupied, cells)) {
        continue;
      }

      results.push({ gridX, gridZ, position, cells });
      if (
        options.selectionMode !== "shuffle"
        && options.maxCount !== undefined
        && results.length >= options.maxCount
      ) {
        return results;
      }
    }
  }

  if (options.selectionMode === "shuffle" && options.maxCount !== undefined && results.length > options.maxCount) {
    shuffleCells(results, random);
    return results.slice(0, options.maxCount);
  }

  return results;
}

function shuffleCells(cells: RadialEnvironmentPatternCell[], random: () => number): void {
  for (let index = cells.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }
}

export function isInsideRadialPathOpening(
  position: THREE.Vector3,
  options: RadialPathOpeningOptions,
): boolean {
  const dx = position.x - options.centerX;
  const dz = position.z - options.centerZ;
  const distSq = (dx * dx) + (dz * dz);

  if (distSq <= options.clearingRadius * options.clearingRadius) {
    return true;
  }

  if (options.roadCount <= 0 || options.roadWidth <= 0) {
    return false;
  }

  const halfRoadWidth = options.roadWidth * 0.5;
  const angleStep = Math.PI * 2 / options.roadCount;
  const roadAngleOffset = options.roadAngleOffset ?? -Math.PI / 2;

  for (let index = 0; index < options.roadCount; index++) {
    const angle = roadAngleOffset + (angleStep * index);
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const forward = (dx * dirX) + (dz * dirZ);

    if (forward < options.clearingRadius) {
      continue;
    }

    const side = Math.abs((dx * dirZ) - (dz * dirX));
    if (side <= halfRoadWidth) {
      return true;
    }
  }

  return false;
}

export function createAlignedPatternPosition(
  gridX: number,
  gridZ: number,
  width: number,
  depth: number,
  gridSize: number,
): THREE.Vector3 {
  const offsetX = (width % 2 !== 0) ? gridSize * 0.5 : 0;
  const offsetZ = (depth % 2 !== 0) ? gridSize * 0.5 : 0;
  return new THREE.Vector3((gridX * gridSize) + offsetX, 0, (gridZ * gridSize) + offsetZ);
}
