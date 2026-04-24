import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ITurnParticipant, TurnContext, FactionId, FactionTurnModifier, parseFactionId } from "@Glibs/gameobjects/turntypes";
import {
  FactionDef,
  FactionState,
  FactionScore,
  FactionPolicyId,
  REPUTATION_THRESHOLDS,
} from "./factiontypes";

function emptyScore(): FactionScore {
  return { total: 0, economy: 0, industry: 0, research: 0, diplomacy: 0, military: 0, influence: 0 };
}

function initState(def: FactionDef): FactionState {
  return {
    id: def.id,
    treasury: {},
    activePolicies: [],
    goals: [],
    relations: { ...def.defaultRelations },
    controlledPlanetIds: [],
    contestedPlanetIds: [],
    memberCityIds: [],
    fleetIds: [],
    score: emptyScore(),
    lastProcessedTurn: 0,
    playerReputation: 0,
  };
}

// ─── Pre-turn 참여자 (turnOrder: 50) ──────────────────────────────────────────

export class FactionPreTurnParticipant implements ITurnParticipant {
  readonly turnId = "faction-pre";
  readonly turnOrder = 50;

  constructor(private manager: FactionManager) {}

  advanceTurn(ctx: TurnContext): void {
    for (const [factionId, state] of this.manager.stateMap) {
      const def = this.manager.defMap.get(factionId);
      if (!def) continue;

      this.manager.tickPolicies(state, ctx.turn);

      const modifier = this.manager.buildModifier(factionId, state, def);
      ctx.shared.factionModifiers[factionId] = modifier;

      if (state.activePolicies.length > 0) {
        const policyNames = state.activePolicies.map((p) => p.policyId).join(", ");
        ctx.log.add({
          source: "faction",
          kind: "system",
          message: `[${def.name}] 이번 턴 활성 정책: ${policyNames}`,
        });
      }
    }
  }
}

// ─── Post-turn 참여자 (turnOrder: 250) ───────────────────────────────────────

export class FactionPostTurnParticipant implements ITurnParticipant {
  readonly turnId = "faction-post";
  readonly turnOrder = 250;

  constructor(private manager: FactionManager) {}

  advanceTurn(ctx: TurnContext): void {
    for (const [factionId, state] of this.manager.stateMap) {
      const def = this.manager.defMap.get(factionId);
      if (!def) continue;

      const newScore = emptyScore();

      for (const [, cityOutput] of Object.entries(ctx.shared.cityOutputs)) {
        if (cityOutput.factionId !== factionId) continue;
        newScore.economy   += cityOutput.score.economy;
        newScore.industry  += cityOutput.score.production;
        newScore.influence += cityOutput.score.prestige;
        if (cityOutput.isPlayer) {
          this.manager.updatePlayerReputation(state, cityOutput, ctx.turn);
        }
      }

      for (const [, planetOutput] of Object.entries(ctx.shared.planetOutputs)) {
        const fi = planetOutput.factionInfluence[factionId] ?? 0;
        newScore.influence += fi * 0.1;
        if (planetOutput.flagFactionId === factionId) {
          newScore.military += 10;
        }
      }

      newScore.total = Object.values(newScore).reduce((a, b) => a + b, 0) - newScore.total;
      state.score = newScore;
      state.lastProcessedTurn = ctx.turn;

      ctx.log.add({
        source: "faction",
        kind: "system",
        message: `[${def?.name ?? factionId}] 턴 종료 점수: ${Math.round(newScore.total)}`,
      });
    }

    this.manager.eventCtrl.SendEventMessage(EventTypes.FactionStateChanged, this.manager.exportState());
  }
}

// ─── FactionManager ───────────────────────────────────────────────────────────

export class FactionManager {
  readonly stateMap = new Map<FactionId, FactionState>();
  readonly defMap   = new Map<FactionId, FactionDef>();
  readonly eventCtrl: IEventController;

  private preTurn:  FactionPreTurnParticipant;
  private postTurn: FactionPostTurnParticipant;

  constructor(eventCtrl: IEventController, defs: FactionDef[]) {
    this.eventCtrl = eventCtrl;
    this.preTurn  = new FactionPreTurnParticipant(this);
    this.postTurn = new FactionPostTurnParticipant(this);

    for (const def of defs) {
      this.defMap.set(def.id, def);
      this.stateMap.set(def.id, initState(def));
    }
  }

  register(): void {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterTurnParticipant, this.preTurn);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterTurnParticipant, this.postTurn);
  }

  buildModifier(factionId: FactionId, state: FactionState, def: FactionDef): FactionTurnModifier {
    const repTier = this.reputationTier(state.playerReputation);
    const influenceMultiplier = 1 + (repTier?.influenceBonus ?? 0);

    const resourceBias = { ...def.resourceBias };

    for (const policy of state.activePolicies) {
      const bias = def.policyBias[policy.policyId as FactionPolicyId] ?? 1;
      for (const [k, v] of Object.entries(resourceBias)) {
        (resourceBias as Record<string, number>)[k] = (v ?? 1) * (bias - 1) * 0.1 + (v ?? 1);
      }
    }

    return {
      factionId,
      resourceBias,
      cityPolicyBias: { ...def.cityPolicyBias },
      influenceMultiplier,
    };
  }

  tickPolicies(state: FactionState, turn: number): void {
    state.activePolicies = state.activePolicies.filter(
      (p) => (turn - p.startTurn) < p.durationTurns,
    );
  }

  updatePlayerReputation(state: FactionState, cityOutput: { score: { total: number } }, turn: number): void {
    const delta = cityOutput.score.total > 100 ? 1 : 0;
    state.playerReputation = Math.min(100, Math.max(0, state.playerReputation + delta));
    void turn;
  }

  getModifier(factionId: FactionId): FactionTurnModifier | undefined {
    const state = this.stateMap.get(factionId);
    const def   = this.defMap.get(factionId);
    if (!state || !def) return undefined;
    return this.buildModifier(factionId, state, def);
  }

  exportState(): FactionState[] {
    return [...this.stateMap.values()];
  }

  importState(states: FactionState[]): void {
    for (const s of states) {
      const id = parseFactionId(s.id);
      if (!id || !this.defMap.has(id)) {
        console.warn(`[FactionManager] Invalid saved faction skipped: ${s.id}`);
        continue;
      }
      this.stateMap.set(id, {
        ...s,
        id,
        relations: sanitizeRelations(s.relations),
      });
    }
  }

  private reputationTier(rep: number) {
    if (rep <= REPUTATION_THRESHOLDS.neutral.max) return null;
    if (rep <= REPUTATION_THRESHOLDS.friendly.max)    return REPUTATION_THRESHOLDS.friendly;
    if (rep <= REPUTATION_THRESHOLDS.cooperative.max) return REPUTATION_THRESHOLDS.cooperative;
    return REPUTATION_THRESHOLDS.core;
  }
}

function sanitizeRelations(
  relations: Partial<Record<FactionId, string>>,
): FactionState["relations"] {
  const result: FactionState["relations"] = {};
  for (const [rawFactionId, relation] of Object.entries(relations)) {
    const factionId = parseFactionId(rawFactionId);
    if (!factionId) {
      console.warn(`[FactionManager] Invalid saved relation skipped: ${rawFactionId}`);
      continue;
    }
    result[factionId] = relation as FactionState["relations"][FactionId];
  }
  return result;
}
