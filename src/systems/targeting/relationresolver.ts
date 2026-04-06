import { Relation } from "./targettypes"

export interface RelationResolver {
  getRelation(fromTeamId?: string, toTeamId?: string): Relation
}

export class DefaultRelationResolver implements RelationResolver {
  getRelation(fromTeamId?: string, toTeamId?: string): Relation {
    if (!fromTeamId || !toTeamId) return "neutral"
    if (fromTeamId === toTeamId) return "ally"
    return "enemy"
  }
}

export class TableRelationResolver implements RelationResolver {
  private readonly relations = new Map<string, Relation>()

  getRelation(fromTeamId?: string, toTeamId?: string): Relation {
    if (!fromTeamId || !toTeamId) return "neutral"
    if (fromTeamId === toTeamId) return "ally"
    return this.relations.get(this.toKey(fromTeamId, toTeamId)) ?? "enemy"
  }

  setRelation(fromTeamId: string, toTeamId: string, relation: Relation) {
    this.relations.set(this.toKey(fromTeamId, toTeamId), relation)
  }

  private toKey(fromTeamId: string, toTeamId: string) {
    return `${fromTeamId}=>${toTeamId}`
  }
}
