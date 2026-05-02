import { Char } from "@Glibs/types/assettypes";
import { BuildingType, BuildingMode } from "./ibuildingobj";
import { CostVector, CurrencyType } from "@Glibs/inventory/wallet";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ProjectileWeaponDef } from "@Glibs/actors/controllable/controllabletypes";
import { shipWeaponDefs } from "@Glibs/actors/controllable/samples/shipweapondefs";
import { TargetKind } from "@Glibs/systems/targeting/targettypes";
import { StatKey } from "@Glibs/inventory/stat/stattypes";
import { AllyId } from "@Glibs/actors/allies/allytypes";

export type BaseCommandTemplate = {
    id: string;
    name: string;
    icon: string;
    shortcut?: string;
};

export type ProduceCommandTemplate = BaseCommandTemplate & {
    type: "produce";
    targetId: AllyId;
};

export type ResearchCommandTemplate = BaseCommandTemplate & {
    type: "research";
    targetId: string;
};

export type ActionCommandTemplate = BaseCommandTemplate & {
    type: "action";
    targetId?: string;
};

export type CustomCommandTemplate = BaseCommandTemplate & {
    type: "custom";
    targetId?: string;
};

export type CommandTemplate =
    | ProduceCommandTemplate
    | ResearchCommandTemplate
    | ActionCommandTemplate
    | CustomCommandTemplate;

/**
 * [신규] 자원 생산 상세 정의
 */
export interface ProductionProperty {
    interval: number;                    // 시간제 모드일 때 생산 주기 (초)
    turns: number;                       // 턴제 모드일 때 생산 주기 (턴 수)
    resources: Partial<Record<CurrencyType, number>>; // 생산할 자원 종류와 기본 양
    collectionRange?: number;            // 주변 환경 자원 수집 반경 (월드 단위)
    collectionEfficiency?: number;       // 주변 환경 자원 채집 효율
}

export interface NearbyResourceRequirement {
    range: number;                       // 건설 위치 기준 탐색 반경
    environmentIds?: string[];           // 예: pine_tree, gold_node
    resourceTypes?: EventTypes[];        // 예: EventTypes.Wood, EventTypes.Gold
    minAmount?: number;                  // 고갈 직전 자원을 제외하고 싶을 때 사용
    message?: string;                    // 조건 실패 시 UI에 보여줄 메시지
}

export interface BuildRequirements {
    cost?: CostVector;
    nearbyResources?: NearbyResourceRequirement[];
}

export interface BuildingCombatProperty {
    stats?: Partial<Record<StatKey, number>>;
    weapons?: ProjectileWeaponDef[];
    targetKinds?: TargetKind[];
    autoAttack?: boolean;
}

export interface BuildingProperty {
    id: string;
    name: string;
    type: BuildingType;
    isUnique?: boolean;
    assetKey: Char;
    hp: number;
    scale: number;
    buildTime: number; // seconds
    buildTurns: number; // number of turns
    size: { width: number; depth: number };
    providesPeople?: number; // 제공하는 인구수 (서플라이)
    buildRange?: number; // 파일런처럼 건물을 지을 수 있는 범위를 제공 (그리드 단위)
    provides?: string[];
    desc?: string;
    commands?: CommandTemplate[];
    buildRequirements?: BuildRequirements;
    production?: ProductionProperty; // [수정] 상세 생산 정보
    combat?: BuildingCombatProperty;
}

const BASIC_TURN = 1
const MEDIUM_TURN = 2
const LONG_TURN = 3


export const buildingDefs: Record<string, BuildingProperty> = {
    CommandCenter: {
        id: "cc",
        name: "지휘 본부",
        type: BuildingType.UnitProduction,
        isUnique: true,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingCastleBlue,
        hp: 2000,
        scale: 10,
        buildTime: 10,
        buildTurns: BASIC_TURN,
        size: { width: 5, depth: 5 },
        providesPeople: 15,
        buildRange: 15,
        provides: ["scv"],
        desc: "진영의 핵심 거점입니다.",
        commands: [
            // { id: "spawn_scv", name: "SCV 생산", icon: "🤖", type: "produce", targetId: "scv", shortcut: "S" }
        ],
        production: { 
            interval: 10, 
            turns: 1, 
            resources: { [CurrencyType.Gold]: 10 } 
        }
    },
    HomeA: {
        id: "supply",
        name: "보급고",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingHomeABlue,
        hp: 500,
        scale: 10,
        buildTime: 15,
        buildTurns: BASIC_TURN,
        size: { width: 2, depth: 2 },
        providesPeople: 8,
        desc: "인구수를 늘려주는 주거 시설입니다.",
        commands: []
    },
    HomeB: {
        id: "home_b",
        name: "고급 주택",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingHomeBBlue,
        hp: 700,
        scale: 10,
        buildTime: 20,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        providesPeople: 12,
        desc: "더 많은 인구를 수용하는 주택입니다.",
        commands: []
    },
    Barracks: {
        id: "barracks",
        name: "병영",
        type: BuildingType.UnitProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingBarracksBlue,
        hp: 1200,
        scale: 10,
        buildTime: 25,
        buildTurns: BASIC_TURN,
        size: { width: 3, depth: 3 },
        provides: [AllyId.Warrior],
        desc: "지상 보병 유닛을 훈련합니다.",
        commands: [
            { id: "spawn_warrior", name: "전사 훈련", icon: "⚔️", type: "produce", targetId: AllyId.Warrior, shortcut: "W" }
        ]
    },
    ArcheryRange: {
        id: "archery",
        name: "궁술 훈련장",
        type: BuildingType.UnitProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingArcheryrangeBlue,
        hp: 1000,
        scale: 10,
        buildTime: 20,
        buildTurns: BASIC_TURN,
        size: { width: 3, depth: 3 },
        provides: [AllyId.Archer],
        desc: "원거리 유닛을 훈련합니다.",
        commands: [
            { id: "spawn_archer", name: "궁수 훈련", icon: "🏹", type: "produce", targetId: AllyId.Archer, shortcut: "A" }
        ]
    },
    Blacksmith: {
        id: "blacksmith",
        name: "대장간",
        type: BuildingType.TechResearch,
        isUnique: true,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingBlacksmithBlue,
        hp: 800,
        scale: 10,
        buildTime: 25,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "무기와 방어력을 업그레이드합니다.",
        commands: [
            { id: "res_atk", name: "공격 강화", icon: "⚔️", type: "research", targetId: "infantry_atk", shortcut: "W" },
            { id: "res_def", name: "방어 강화", icon: "🛡️", type: "research", targetId: "infantry_def", shortcut: "A" }
        ]
    },
    Church: {
        id: "church",
        name: "성당",
        type: BuildingType.TechResearch,
        isUnique: true,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingChurchBlue,
        hp: 1500,
        scale: 10,
        buildTime: 40,
        buildTurns: LONG_TURN,
        size: { width: 4, depth: 4 },
        desc: "성스러운 기술을 연구합니다.",
        commands: [
            { id: "res_heal", name: "회복 연구", icon: "✨", type: "research", targetId: "holy_heal", shortcut: "H" }
        ]
    },
    LumberMill: {
        id: "lumbermill",
        name: "제재소",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingLumbermillBlue,
        hp: 600,
        scale: 10,
        buildTime: 15,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "나무 자원을 가공하여 생산합니다.",
        commands: [
            { id: "collect", name: "목재 수집", icon: "🪵", type: "action", shortcut: "C" }
        ],
        buildRequirements: {
            nearbyResources: [
                {
                    range: 20,
                    environmentIds: ["pine_tree"],
                    resourceTypes: [EventTypes.Wood],
                    message: "제재소는 반경 20 안에 나무가 있어야 건설할 수 있습니다."
                }
            ]
        },
        production: { 
            interval: 5, 
            turns: 1, 
            collectionRange: 20,
            collectionEfficiency: 0.5,
            resources: { [CurrencyType.Wood]: 20 } 
        }
    },
    Market: {
        id: "market",
        name: "시장",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingMarketBlue,
        hp: 800,
        scale: 10,
        buildTime: 20,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "골드 자원을 생산하는 상업 중심지입니다.",
        commands: [
            { id: "collect", name: "골드 수집", icon: "💰", type: "action", shortcut: "G" }
        ],
        production: { 
            interval: 5, 
            turns: 1, 
            resources: { [CurrencyType.Gold]: 30 } 
        }
    },
    Mine: {
        id: "mine",
        name: "광산",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingMineBlue,
        hp: 1000,
        scale: 10,
        buildTime: 25,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "광물 자원을 채굴합니다.",
        commands: [
            { id: "collect", name: "광물 채굴", icon: "💎", type: "action", shortcut: "M" }
        ],
        buildRequirements: {
            nearbyResources: [
                {
                    range: 24,
                    environmentIds: ["gold_node"],
                    resourceTypes: [EventTypes.Gold],
                    message: "광산은 반경 24 안에 광물 자원이 있어야 건설할 수 있습니다."
                }
            ]
        },
        production: { 
            interval: 8, 
            turns: 2, 
            collectionRange: 24,
            collectionEfficiency: 0.5,
            resources: { [CurrencyType.Gems]: 1, [CurrencyType.Materials]: 15 } 
        }
    },
    Tavern: {
        id: "tavern",
        name: "여관",
        type: BuildingType.UnitProduction,
        isUnique: true,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingTavernBlue,
        hp: 800,
        scale: 10,
        buildTime: 20,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "마법 유닛을 고용합니다.",
        commands: [
            { id: "spawn_mage", name: "마법사 고용", icon: "✨", type: "produce", targetId: AllyId.Mage, shortcut: "M" }
        ]
    },
    TowerA: {
        id: "tower_a",
        name: "경비탑",
        type: BuildingType.DefenseTurret,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingTowerABlue,
        hp: 1000,
        scale: 10,
        buildTime: 20,
        buildTurns: BASIC_TURN,
        size: { width: 2, depth: 2 },
        desc: "화살로 적을 공격하는 방어 시설입니다.",
        combat: {
            autoAttack: true,
            targetKinds: ["ship", "unit"],
            stats: { attackRanged: 14, attackRange: 90, defense: 8 },
            weapons: [shipWeaponDefs.AllySupportGun]
        },
        commands: [
            // { id: "stop", name: "정지", icon: "🛑", type: "action", shortcut: "S" },
            // { id: "attack", name: "공격", icon: "⚔️", type: "action", shortcut: "A" }
        ]
    },
    TowerB: {
        id: "tower_b",
        name: "파수탑",
        type: BuildingType.DefenseTurret,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingTowerBBlue,
        hp: 1200,
        scale: 10,
        buildTime: 25,
        buildTurns: MEDIUM_TURN,
        size: { width: 2, depth: 2 },
        desc: "더 높은 체력을 가진 방어 탑입니다.",
        combat: {
            autoAttack: true,
            targetKinds: ["ship", "unit"],
            stats: { attackRanged: 18, attackRange: 130, defense: 12 },
            weapons: [shipWeaponDefs.ScoutLaser]
        },
        commands: [
            // { id: "stop", name: "정지", icon: "🛑", type: "action", shortcut: "S" },
            // { id: "attack", name: "공격", icon: "⚔️", type: "action", shortcut: "A" }
        ]
    },
    TowerCatapult: {
        id: "tower_catapult",
        name: "투석기 탑",
        type: BuildingType.DefenseTurret,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingTowerCatapultBlue,
        hp: 1500,
        scale: 10,
        buildTime: 35,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "강력한 바위를 던져 광역 피해를 줍니다.",
        combat: {
            autoAttack: true,
            targetKinds: ["ship", "unit"],
            stats: { attackRanged: 32, attackRange: 180, defense: 16 },
            weapons: [shipWeaponDefs.FighterAutocannon]
        },
        commands: [
            // { id: "stop", name: "정지", icon: "🛑", type: "action", shortcut: "S" },
            // { id: "attack", name: "공격", icon: "⚔️", type: "action", shortcut: "A" }
        ]
    },
    Watermill: {
        id: "watermill",
        name: "물레방아",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingWatermillBlue,
        hp: 700,
        scale: 10,
        buildTime: 20,
        buildTurns: LONG_TURN,
        size: { width: 3, depth: 3 },
        desc: "식량 생산 효율을 높여줍니다.",
        commands: [],
        production: { 
            interval: 5, 
            turns: 1, 
            resources: { [CurrencyType.Food]: 25 } 
        }
    },
    Well: {
        id: "well",
        name: "우물",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingWellBlue,
        hp: 300,
        scale: 10,
        buildTime: 10,
        buildTurns: BASIC_TURN,
        size: { width: 1, depth: 1 },
        buildRange: 8,
        desc: "청결한 물을 공급하며 주변에 건물을 지을 수 있는 영역을 제공합니다.",
        commands: [],
        production: { 
            interval: 10, 
            turns: 1, 
            resources: { [CurrencyType.Water]: 15 } 
        }
    },
    Windmill: {
        id: "windmill",
        name: "풍차",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingWindmillBlue,
        hp: 800,
        scale: 10,
        buildTime: 25,
        buildTurns: MEDIUM_TURN,
        size: { width: 3, depth: 3 },
        desc: "곡물을 가공하여 자원을 생산합니다.",
        commands: [],
        production: { 
            interval: 7, 
            turns: 1, 
            resources: { [CurrencyType.Electric]: 10, [CurrencyType.Food]: 10 } 
        }
    }
};
