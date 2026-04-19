import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionDef } from "./factiontypes";

export const factionDefs: Record<string, FactionDef> = {
  alliance: {
    id: "alliance",
    name: "Alliance",
    desc: "균형 성장과 상호 지원을 중시하는 연합입니다.",
    governance: "federation",
    doctrine: "stabilityAndRecovery",
    resourceBias: {
      [CurrencyType.Food]: 1.1,
      [CurrencyType.Water]: 1.1,
    },
    policyBias: {
      reconstruction: 1.3,
      mutualAid: 1.25,
    },
    cityPolicyBias: {
      housingBoom: 1.15,
      researchInvestment: 1.05,
    },
    scoreBias: {
      economy: 1.0,
      industry: 0.9,
      research: 1.05,
      diplomacy: 1.1,
      military: 0.9,
      influence: 1.0,
    },
    sharedResourcePolicy: "aidWeakCities",
    expansionPolicy: "balanced",
    cooperationLevel: 0.8,
    defaultRelations: {
      empire: "rival",
      guild: "friendly",
      neutral: "neutral",
    },
  },

  empire: {
    id: "empire",
    name: "Empire",
    desc: "산업 집중과 거점 장악을 중시하는 제국입니다.",
    governance: "empire",
    doctrine: "industrialCommand",
    resourceBias: {
      [CurrencyType.Materials]: 1.2,
      [CurrencyType.Gems]: 1.1,
    },
    policyBias: {
      imperialMandate: 1.35,
      strategicFortification: 1.2,
      industrialLevy: 1.2,
    },
    cityPolicyBias: {
      industrialFocus: 1.3,
      landmarkRace: 1.1,
    },
    scoreBias: {
      economy: 1.0,
      industry: 1.2,
      research: 0.9,
      diplomacy: 0.8,
      military: 1.2,
      influence: 1.15,
    },
    sharedResourcePolicy: "tribute",
    expansionPolicy: "strategicHub",
    cooperationLevel: 0.55,
    defaultRelations: {
      alliance: "rival",
      guild: "neutral",
      neutral: "rival",
    },
  },

  guild: {
    id: "guild",
    name: "Guild",
    desc: "교역망과 시장 영향력을 우선하는 상인 연합입니다.",
    governance: "guild",
    doctrine: "tradeNetwork",
    resourceBias: {
      [CurrencyType.Gold]: 1.25,
      [CurrencyType.Food]: 1.05,
    },
    policyBias: {
      tradeCompact: 1.4,
      gateControl: 1.3,
    },
    cityPolicyBias: {
      marketDominance: 1.3,
      resourceExpansion: 1.1,
    },
    scoreBias: {
      economy: 1.25,
      industry: 0.95,
      research: 1.0,
      diplomacy: 1.1,
      military: 0.85,
      influence: 1.15,
    },
    sharedResourcePolicy: "centralPool",
    expansionPolicy: "wide",
    cooperationLevel: 0.7,
    defaultRelations: {
      alliance: "friendly",
      empire: "neutral",
      neutral: "friendly",
    },
  },

  neutral: {
    id: "neutral",
    name: "Neutral",
    desc: "특정 진영에 속하지 않는 독립 세력입니다.",
    governance: "neutralBloc",
    doctrine: "isolatedNeutrality",
    resourceBias: {},
    policyBias: {
      neutralMediation: 1.2,
    },
    cityPolicyBias: {
      researchInvestment: 1.05,
    },
    scoreBias: {
      economy: 1.0,
      industry: 1.0,
      research: 1.05,
      diplomacy: 1.15,
      military: 0.9,
      influence: 0.95,
    },
    sharedResourcePolicy: "none",
    expansionPolicy: "balanced",
    cooperationLevel: 0.4,
    defaultRelations: {
      alliance: "neutral",
      empire: "neutral",
      guild: "neutral",
    },
  },
};
