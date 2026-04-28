import { CurrencyType } from "@Glibs/inventory/wallet";
import { MonsterId } from "@Glibs/types/monstertypes";
import { RivalCityDef, RivalCityDefId, RivalPolicyDef, RivalSpecialResourceType } from "./rivalcitytypes";

// ─── 도시 정의 ────────────────────────────────────────────────────────────────

export const rivalCityDefs: Record<RivalCityDefId, RivalCityDef> = {
  forest_guild: {
    id: RivalCityDefId.ForestGuild,
    name: "Forest Guild",
    desc: "숲과 목재 생산에 강한 경쟁 도시입니다.",
    archetype: "forest",
    startingResources: {
      [CurrencyType.Wood]: 120,
      [CurrencyType.Food]: 60,
      [CurrencyType.Gold]: 120,
    },
    startingSpecialResources: { rareWood: 2 },
    armyDeck: [
      [MonsterId.Snake, MonsterId.Bilby, MonsterId.Crab],
      [MonsterId.Birdmon, MonsterId.Snake, MonsterId.Bilby],
    ],
    startingBuildings: ["cc", "lumbermill"],
    openingBuildOrder: ["lumbermill", "supply", "watermill", "market"],
    preferredBuildings: ["lumbermill", "watermill", "supply", "home_b"],
    avoidedBuildings: ["blacksmith"],
    resourceBias: {
      [CurrencyType.Wood]: 1.35,
      [CurrencyType.Food]: 1.15,
      [CurrencyType.Gold]: 0.85,
    },
    specialResourceBias: { rareWood: 1.5 },
    policyWeights: {
      resourceExpansion: 8,
      housingBoom: 4,
      marketDominance: 2,
      researchInvestment: 1,
    },
    scoreWeights: {
      production: 1.4,
      economy: 0.9,
      population: 1.1,
      research: 0.7,
      prestige: 1.0,
    },
  },

  mountain_syndicate: {
    id: RivalCityDefId.MountainSyndicate,
    name: "Mountain Syndicate",
    desc: "자재와 보석 생산이 강하고 고가치 건물을 선호하는 경쟁 도시입니다.",
    archetype: "mountain",
    startingResources: {
      [CurrencyType.Materials]: 100,
      [CurrencyType.Gems]: 40,
      [CurrencyType.Gold]: 160,
    },
    startingSpecialResources: { crystal: 1 },
    armyDeck: [
      [MonsterId.Viking, MonsterId.Golem, MonsterId.Viking],
      [MonsterId.Golem, MonsterId.Viking, MonsterId.Minotaur],
    ],
    startingBuildings: ["cc", "mine"],
    openingBuildOrder: ["mine", "blacksmith", "mine", "market"],
    preferredBuildings: ["mine", "blacksmith", "home_b", "tower_a"],
    avoidedBuildings: ["watermill", "supply"],
    resourceBias: {
      [CurrencyType.Materials]: 1.4,
      [CurrencyType.Gems]: 1.25,
      [CurrencyType.Food]: 0.8,
    },
    specialResourceBias: { crystal: 1.6 },
    policyWeights: {
      industrialFocus: 9,
      landmarkRace: 5,
      resourceExpansion: 3,
      marketDominance: 2,
      defensiveFortification: 6,
    },
    scoreWeights: {
      production: 1.2,
      economy: 1.0,
      population: 0.8,
      research: 0.9,
      prestige: 1.5,
    },
  },

  harbor_league: {
    id: RivalCityDefId.HarborLeague,
    name: "Harbor League",
    desc: "식량과 골드 흐름이 안정적인 교역 도시입니다.",
    archetype: "harbor",
    startingResources: {
      [CurrencyType.Gold]: 260,
      [CurrencyType.Food]: 80,
      [CurrencyType.Water]: 60,
    },
    startingSpecialResources: { tradeInfluence: 2 },
    armyDeck: [
      [MonsterId.DashZombie, MonsterId.Crab, MonsterId.DashZombie],
      [MonsterId.Crab, MonsterId.DashZombie, MonsterId.Zombie],
    ],
    startingBuildings: ["cc", "market"],
    openingBuildOrder: ["market", "watermill", "home_b", "market"],
    preferredBuildings: ["market", "watermill", "home_b"],
    avoidedBuildings: ["blacksmith"],
    resourceBias: {
      [CurrencyType.Gold]: 1.35,
      [CurrencyType.Food]: 1.2,
      [CurrencyType.Materials]: 0.8,
    },
    specialResourceBias: { tradeInfluence: 1.5 },
    policyWeights: {
      marketDominance: 9,
      housingBoom: 5,
      resourceExpansion: 3,
      researchInvestment: 2,
    },
    scoreWeights: {
      production: 0.9,
      economy: 1.5,
      population: 1.2,
      research: 0.8,
      prestige: 1.1,
    },
  },

  scholar_enclave: {
    id: RivalCityDefId.ScholarEnclave,
    name: "Scholar Enclave",
    desc: "원자재 생산은 약하지만 연구와 효율 보너스가 높은 도시입니다.",
    archetype: "scholar",
    startingResources: {
      [CurrencyType.Gold]: 70,
      [CurrencyType.Food]: 50,
      [CurrencyType.Materials]: 40,
    },
    startingSpecialResources: { knowledge: 2 },
    armyDeck: [
      [MonsterId.ToadMage, MonsterId.Skeleton, MonsterId.ToadMage],
      [MonsterId.Skeleton, MonsterId.ToadMage, MonsterId.Builder],
    ],
    startingBuildings: ["cc", "blacksmith"],
    openingBuildOrder: ["blacksmith", "home_b", "blacksmith", "market"],
    preferredBuildings: ["blacksmith", "home_b"],
    avoidedBuildings: ["lumbermill"],
    resourceBias: {
      [CurrencyType.Gold]: 1.1,
      [CurrencyType.Food]: 1.0,
      [CurrencyType.Wood]: 0.85,
    },
    specialResourceBias: { knowledge: 1.8 },
    policyWeights: {
      researchInvestment: 10,
      housingBoom: 4,
      marketDominance: 3,
      industrialFocus: 1,
    },
    scoreWeights: {
      production: 0.7,
      economy: 1.0,
      population: 0.9,
      research: 1.8,
      prestige: 1.2,
    },
  },

  frontier_commune: {
    id: RivalCityDefId.FrontierCommune,
    name: "Frontier Commune",
    desc: "성장 속도는 빠르지만 장기 점수 효율은 낮은 도시입니다.",
    archetype: "frontier",
    startingResources: {
      [CurrencyType.Wood]: 80,
      [CurrencyType.Food]: 90,
      [CurrencyType.Gold]: 20,
    },
    startingSpecialResources: { civicTrust: 1 },
    armyDeck: [
      [MonsterId.Zombie, MonsterId.Viking, MonsterId.Skeleton],
      [MonsterId.Viking, MonsterId.Zombie, MonsterId.DashZombie],
    ],
    startingBuildings: ["cc", "supply"],
    openingBuildOrder: ["supply", "home_b", "lumbermill", "supply"],
    preferredBuildings: ["supply", "home_b", "lumbermill"],
    resourceBias: {
      [CurrencyType.Food]: 1.3,
      [CurrencyType.Wood]: 1.1,
      [CurrencyType.Gold]: 0.9,
    },
    specialResourceBias: { civicTrust: 1.4 },
    policyWeights: {
      housingBoom: 8,
      resourceExpansion: 7,
      marketDominance: 2,
      industrialFocus: 1,
      defensiveFortification: 3,
    },
    scoreWeights: {
      production: 1.1,
      economy: 0.9,
      population: 1.4,
      research: 0.6,
      prestige: 0.8,
    },
  },

  native_enclave: {
    id: RivalCityDefId.NativeEnclave,
    name: "원주민 구역",
    desc: "외부 진영에 속하지 않은 에덴의 원주민 자치 구역입니다.",
    archetype: "native",
    startingResources: {
      [CurrencyType.Food]: 70,
      [CurrencyType.Water]: 70,
      [CurrencyType.Wood]: 40,
    },
    startingSpecialResources: { civicTrust: 2 },
    armyDeck: [
      [MonsterId.Bilby, MonsterId.WereWolf, MonsterId.Snake],
      [MonsterId.WereWolf, MonsterId.Bilby, MonsterId.Minotaur],
    ],
    startingBuildings: ["cc", "supply"],
    openingBuildOrder: ["supply", "home_b", "watermill"],
    preferredBuildings: ["supply", "home_b", "watermill"],
    avoidedBuildings: ["blacksmith", "market"],
    resourceBias: {
      [CurrencyType.Food]: 1.2,
      [CurrencyType.Water]: 1.2,
      [CurrencyType.Gold]: 0.7,
    },
    specialResourceBias: { civicTrust: 1.6 },
    policyWeights: {
      housingBoom: 6,
      resourceExpansion: 5,
      marketDominance: 1,
      industrialFocus: 1,
    },
    scoreWeights: {
      production: 0.9,
      economy: 0.7,
      population: 1.3,
      research: 0.5,
      prestige: 0.8,
    },
  },
};

// ─── 특수 자원 정의 ───────────────────────────────────────────────────────────

export const rivalSpecialResourceDefs: Record<RivalSpecialResourceType, { id: string; name: string; desc: string }> = {
  rareWood: {
    id: "rareWood",
    name: "희귀 목재",
    desc: "목재 계열 건물의 가치와 생산량을 높입니다.",
  },
  crystal: {
    id: "crystal",
    name: "수정",
    desc: "고급 건물과 연구 점수를 높입니다.",
  },
  tradeInfluence: {
    id: "tradeInfluence",
    name: "무역 영향력",
    desc: "골드 생산과 시장 점수에 영향을 줍니다.",
  },
  knowledge: {
    id: "knowledge",
    name: "지식",
    desc: "생산 효율 상승, 정책 해금, 후반 점수 배율 증가.",
  },
  civicTrust: {
    id: "civicTrust",
    name: "시민 결속",
    desc: "시민 수 점수 증가, 건설 큐 안정성 증가.",
  },
};

// ─── 정책 정의 ────────────────────────────────────────────────────────────────

export const rivalPolicyDefs: Record<string, RivalPolicyDef> = {
  resourceExpansion: {
    id: "resourceExpansion",
    name: "자원 확장",
    durationTurns: 6,
    effects: [
      { kind: "buildPreference", target: "lumbermill", value: 1.5 },
      { kind: "buildPreference", target: "mine", value: 1.5 },
      { kind: "resourceMultiplier", target: "wood", value: 1.2 },
      { kind: "resourceMultiplier", target: "materials", value: 1.2 },
    ],
  },
  housingBoom: {
    id: "housingBoom",
    name: "주거 붐",
    durationTurns: 5,
    effects: [
      { kind: "buildPreference", target: "home_b", value: 2.0 },
      { kind: "buildPreference", target: "supply", value: 1.5 },
      { kind: "scoreWeight", target: "population", value: 1.3 },
    ],
  },
  industrialFocus: {
    id: "industrialFocus",
    name: "산업 집중",
    durationTurns: 6,
    requirements: { minBuildings: { mine: 1 } },
    effects: [
      { kind: "buildPreference", target: "mine", value: 1.8 },
      { kind: "buildPreference", target: "blacksmith", value: 1.8 },
      { kind: "scoreWeight", target: "prestige", value: 1.3 },
    ],
  },
  marketDominance: {
    id: "marketDominance",
    name: "시장 지배",
    durationTurns: 5,
    effects: [
      { kind: "buildPreference", target: "market", value: 2.0 },
      { kind: "resourceMultiplier", target: "gold", value: 1.25 },
      { kind: "specialResourceBonus", target: "tradeInfluence", value: 1 },
    ],
  },
  researchInvestment: {
    id: "researchInvestment",
    name: "연구 투자",
    durationTurns: 8,
    effects: [
      { kind: "buildPreference", target: "blacksmith", value: 1.5 },
      { kind: "specialResourceBonus", target: "knowledge", value: 1 },
      { kind: "scoreWeight", target: "research", value: 1.5 },
    ],
  },
  landmarkRace: {
    id: "landmarkRace",
    name: "랜드마크 경주",
    durationTurns: 10,
    requirements: { minTurn: 5 },
    effects: [
      { kind: "scoreWeight", target: "prestige", value: 2.0 },
    ],
  },
  defensiveFortification: {
    id: "defensiveFortification",
    name: "방어 요새화",
    durationTurns: 8,
    effects: [
      { kind: "buildPreference", target: "tower_a",        value: 2.0 },
      { kind: "buildPreference", target: "tower_b",        value: 1.8 },
      { kind: "buildPreference", target: "tower_catapult", value: 1.5 },
    ],
  },
};
