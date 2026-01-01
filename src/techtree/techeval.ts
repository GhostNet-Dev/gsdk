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
  describe?(req: Requirement): string;
}

export class RequirementEvaluator implements IRequirementEvaluator {
  eval(req: Requirement, env: TechEvalEnv): boolean {
    switch (req.type) {
      case "has": {
        const cur = env.levels[req.id] ?? 0;
        return cur >= (req.minLv ?? 1);
      }
      case "skill": {
        // [수정된 로직] 
        // 1. req.id가 테크 노드 ID인 경우를 먼저 확인
        let targetId = String(req.id);
        
        // 2. 만약 해당 ID가 테크 노드 ID가 아니라면, techId(ActionId) 매핑에서 실제 노드 ID를 찾음
        if (!env.index.byId.has(targetId)) {
          const mappedId = env.index.byTechId.get(targetId);
          if (mappedId) targetId = mappedId;
        }

        const cur = env.levels[targetId] ?? 0;
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