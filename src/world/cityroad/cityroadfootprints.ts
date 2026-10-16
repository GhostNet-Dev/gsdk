import * as THREE from "three";
import { PlacementManager } from "@Glibs/interactives/placement/placementmanager";
import { gridCellCenter, gridCellKey, GridCell } from "@Glibs/interactives/placement/gridrangeutils";
import { CityRoadBounds, CityRoadLayoutDef } from "./cityroadtypes";
import { resolveEntryZoneCells, resolveRoadCells } from "./cityroadgeometry";

/**
 * 도로 건설 금지 셀을 PlacementManager에 'road' footprint로 등록한다.
 * 진입 구간은 항상, 나머지 도로는 layout.blockConstruction일 때 등록한다.
 * 이전 레이아웃의 'road' footprint는 먼저 모두 해제한다.
 */
export function applyCityRoadFootprints(
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  bounds: CityRoadBounds,
  gridSize: number,
): number {
  const placement = PlacementManager.Instance;
  placement.unregisterFootprintsBySource("road");

  const cells = new Map<string, GridCell>();
  for (const cell of resolveEntryZoneCells(layout, center, bounds, gridSize)) cells.set(gridCellKey(cell), cell);
  if (layout.blockConstruction) {
    for (const cell of resolveRoadCells(layout, center, bounds, gridSize)) cells.set(gridCellKey(cell), cell);
  }

  for (const cell of cells.values()) {
    placement.registerFootprint({
      id: `road:${layout.id}:${cell.x}:${cell.z}`,
      source: "road",
      state: "active",
      nodeId: `road:${layout.id}`,
      pos: gridCellCenter(cell, gridSize),
      width: 1,
      depth: 1,
    });
  }
  return cells.size;
}
