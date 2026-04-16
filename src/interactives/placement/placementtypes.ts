import * as THREE from 'three';

export type PlacementSource = 'building' | 'environment' | 'obstacle';
export type PlacementState = 'pending' | 'active';

export interface PlacementFootprint {
  id: string;
  source: PlacementSource;
  nodeId: string;
  pos: THREE.Vector3;
  width: number;
  depth: number;
  buildRange?: number;
  state?: PlacementState;
}

export interface PlacementValidationResult {
  ok: boolean;
  occupied: boolean;
  inBuildRange: boolean;
  reason?: 'occupied' | 'out_of_range';
}
