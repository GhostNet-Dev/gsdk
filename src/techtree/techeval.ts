import { Wallet } from "@Glibs/inventory/wallet";
import { Requirement, Tag, TechId } from "./techtreedefs";
import { TechIndex } from "./techindex";

export type PlayerContext = {
  playerLv: number;
  wallet: Wallet;
  tags: Set<Tag>;
  quests: Map<string, "done" | "in-progress" | "not-started">;
  stats: Record<string, number>;
};
export type TechLevels = Record<TechId, number>;
export type TechEvalEnv = {
  levels: TechLevels;
  index: TechIndex;
  ctx: PlayerContext;
};

export interface IRequirementEvaluator {
  eval(req: Requirement, env: TechEvalEnv): boolean;
  describe?(req: Requirement): string; // UI 디버그용
}

export class RequirementEvaluator implements IRequirementEvaluator {
  eval(req: Requirement, env: TechEvalEnv): boolean {
    switch (req.type) {
      case "has": {
        const cur = env.levels[req.id] ?? 0;
        return cur >= (req.minLv ?? 1);
      }
      case "skill": {
        const nodeId = env.index.byTechId.get(String(req.id));
        const cur = nodeId ? (env.levels[nodeId] ?? 0) : 0;
        return cur >= (req.atLeast ?? 1);
      }
      case "tag":
        return env.ctx.tags.has(req.tag);
      case "playerLv":
        return env.ctx.playerLv >= req.atLeast;
      case "points":
        return env.ctx.wallet.points >= req.atLeast;
      case "quest":
        return (env.ctx.quests.get(req.id) ?? "not-started") === req.status;
      case "stat":
        return (env.ctx.stats[req.key] ?? 0) >= req.atLeast;
      case "not":
        return !this.eval(req.of, env);
      case "all":
        return req.of.every(r => this.eval(r, env));
      case "any":
        return req.of.some(r => this.eval(r, env));
    }
  }

  describe(req: Requirement): string {
    switch (req.type) {
      case "has": return `has(${req.id}${req.minLv ? `>=${req.minLv}` : ""})`;
      case "skill": return `skill(${String(req.id)}>=${req.atLeast ?? 1})`;
      case "tag": return `tag(${req.tag})`;
      case "playerLv": return `playerLv>=${req.atLeast}`;
      case "points": return `points>=${req.atLeast}`;
      case "quest": return `quest(${req.id})=${req.status}`;
      case "stat": return `stat(${req.key})>=${req.atLeast}`;
      case "not": return `NOT(${this.describe(req.of)})`;
      case "all": return `ALL(${req.of.map(r => this.describe(r)).join(", ")})`;
      case "any": return `ANY(${req.of.map(r => this.describe(r)).join(", ")})`;
    }
  }
}