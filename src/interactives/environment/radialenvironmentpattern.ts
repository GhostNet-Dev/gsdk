import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise";
import { getFootprintGridCellKeys, hasGridCellOverlap } from "@Glibs/interactives/placement/gridrangeutils";
import { CityRoadLayoutDef } from "@Glibs/world/cityroad/cityroadtypes";
import { isInsideRoadLayoutOpening } from "@Glibs/world/cityroad/cityroadgeometry";

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
  /** 빈터와 도로 레이아웃. 도로 중심은 centerX/centerZ다. */
  roadLayout: CityRoadLayoutDef;
  /** 배치 오브젝트의 점유 반경. 도로·빈터 경계에서 이만큼 더 떨어뜨린다. */
  clearanceRadius?: number;
  noise?: ImprovedNoise;
  random?: () => number;
  occupied?: ReadonlySet<string>;
  maxCount?: number;
  selectionMode?: "scan" | "shuffle";
}

const defaultNoise = new ImprovedNoise();

export function createRadialEnvironmentPattern(
  options: RadialEnvironmentPatternOptions,
): RadialEnvironmentPatternCell[] {
  const noise = options.noise ?? defaultNoise;
  const random = options.random ?? Math.random;
  const roadCenter = new THREE.Vector3(options.centerX, 0, options.centerZ);
  const clearanceRadius = options.clearanceRadius ?? 0;
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

      if (isInsideRoadLayoutOpening(position, options.roadLayout, roadCenter, clearanceRadius)) {
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
