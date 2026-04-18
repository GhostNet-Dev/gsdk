import * as THREE from "three";
import { BuildingProperty } from "./buildingdefs";

export interface BuildRequirementResourceQuery {
  getResourceObjectsOverlappingGridRange(
    pos: THREE.Vector3,
    radius: number,
    query?: {
      environmentIds?: readonly string[];
      resourceTypes?: readonly string[];
      minAmount?: number;
    },
  ): readonly unknown[];
}

export interface BuildRequirementValidationResult {
  ok: boolean;
  reason?: string;
}

export class BuildRequirementValidator {
  constructor(private readonly resourceQuery: BuildRequirementResourceQuery) { }

  validate(prop: BuildingProperty | undefined, pos?: THREE.Vector3): BuildRequirementValidationResult {
    const nearbyRequirements = prop?.buildRequirements?.nearbyResources;
    if (!pos || !nearbyRequirements || nearbyRequirements.length === 0) return { ok: true };

    for (const req of nearbyRequirements) {
      const matches = this.resourceQuery.getResourceObjectsOverlappingGridRange(pos, req.range, {
        environmentIds: req.environmentIds,
        resourceTypes: req.resourceTypes,
        minAmount: req.minAmount,
      });

      if (matches.length === 0) {
        return {
          ok: false,
          reason: req.message ?? `${prop?.name ?? "건물"} 건설에는 반경 ${req.range} 안에 필요한 자원이 있어야 합니다.`,
        };
      }
    }

    return { ok: true };
  }
}

export function validateBuildRequirements(
  validator: BuildRequirementValidator | undefined,
  prop: BuildingProperty | undefined,
  pos?: THREE.Vector3,
): BuildRequirementValidationResult {
  const hasRequirements = !!prop?.buildRequirements?.nearbyResources?.length;
  if (!hasRequirements) return { ok: true };
  if (!validator) return { ok: false, reason: "건설 조건 검증기를 사용할 수 없습니다." };
  return validator.validate(prop, pos);
}
