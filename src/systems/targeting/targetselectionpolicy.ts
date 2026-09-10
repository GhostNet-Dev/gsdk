import * as THREE from "three"
import { ThreatEntry } from "@Glibs/actors/battle/threatbook"
import {
    Relation,
    TargetDistanceMode,
    TargetKind,
    TargetQueryOptions,
    TargetRecord,
} from "./targettypes"

export { ThreatEntry }

export interface ITargetRegistryQuery {
    get(id: string): TargetRecord | undefined
    getByObject(o?: THREE.Object3D | null): TargetRecord | undefined
    getTargetsForTeam(teamId: string, relation?: Relation, options?: TargetQueryOptions): TargetRecord[]
    findNearestHostile(sourceId: string, maxDistance: number, options?: TargetQueryOptions): TargetRecord | undefined
    isHostile(sourceId: string, targetId: string): boolean
    getDistanceToTarget(sourcePos: THREE.Vector3, target: TargetRecord, mode?: TargetDistanceMode): number
}

export interface TargetSelectionContext {
    selfId: string
    selfTeamId?: string
    selfPos: THREE.Vector3
    maxDistance: number
    currentTargetId?: string
    currentTargetReachable?: boolean
    fallbackTargetId?: string
    threats: ReadonlyArray<ThreatEntry>
    registry: ITargetRegistryQuery
    query?: TargetQueryOptions
}

export interface TargetSelectionPolicy {
    selectTarget(ctx: TargetSelectionContext): TargetRecord | undefined
}

export enum TargetPolicyId {
    NearestHostile = "nearest-hostile",
    ThreatAwareNearest = "threat-aware-nearest",
    StructureFirst = "structure-first",
    Scored = "scored",
}

export type ScoredWeights = {
    distance?: number
    threat?: number
    stickiness?: number
    kind?: number
}

export type TargetPolicyConfig =
    | { id: TargetPolicyId.NearestHostile }
    | { id: TargetPolicyId.ThreatAwareNearest; switchMargin?: number; threatLeash?: number }
    | { id: TargetPolicyId.StructureFirst; inner?: TargetPolicyConfig }
    | {
        id: TargetPolicyId.Scored
        weights?: ScoredWeights
        kindWeight?: Partial<Record<TargetKind, number>>
    }
