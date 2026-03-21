import { Char } from "@Glibs/types/assettypes";
import { BuildingType } from "./ibuildingobj";

export enum BuildingMode {
    Timer,
    Turn
}

export interface CommandTemplate {
    id: string;
    name: string;
    icon: string;
    shortcut?: string;
    type: "produce" | "research" | "action" | "custom";
    targetId?: string; // 유닛 ID 또는 테크 ID
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
    buildRange?: number; // 파일런처럼 건물을 지을 수 있는 범위를 제공 (그리드 단위)
    provides?: string[];
    desc?: string;
    commands?: CommandTemplate[];
}

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
        buildTurns: 10,
        size: { width: 5, depth: 5 },
        buildRange: 15, // 15칸 범위 제공
        provides: ["scv"],
        desc: "진영의 핵심 거점입니다.",
        commands: [
            { id: "spawn_scv", name: "SCV 생산", icon: "🤖", type: "produce", targetId: "scv", shortcut: "S" }
        ]
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
        buildTurns: 3,
        size: { width: 2, depth: 2 },
        desc: "인구수를 늘려주는 주거 시설입니다.",
        commands: [
            { id: "collect", name: "세금 징수", icon: "💰", type: "action", shortcut: "C" }
        ]
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
        buildTurns: 4,
        size: { width: 3, depth: 3 },
        desc: "더 많은 인구를 수용하는 주택입니다.",
        commands: [
            { id: "collect", name: "세금 징수", icon: "💰", type: "action", shortcut: "C" }
        ]
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
        buildTurns: 5,
        size: { width: 3, depth: 3 },
        provides: ["marine", "firebat"],
        desc: "지상 보병 유닛을 훈련합니다.",
        commands: [
            { id: "spawn_marine", name: "해병 훈련", icon: "🔫", type: "produce", targetId: "marine", shortcut: "M" }
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
        buildTurns: 5,
        size: { width: 3, depth: 3 },
        provides: ["archer"],
        desc: "원거리 유닛을 훈련합니다.",
        commands: [
            { id: "spawn_archer", name: "궁수 훈련", icon: "🏹", type: "produce", targetId: "archer", shortcut: "A" }
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
        buildTurns: 6,
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
        buildTurns: 10,
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
        buildTurns: 4,
        size: { width: 3, depth: 3 },
        desc: "나무 자원을 가공하여 생산합니다.",
        commands: [
            { id: "collect", name: "목재 수집", icon: "🪵", type: "action", shortcut: "C" }
        ]
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
        buildTurns: 5,
        size: { width: 3, depth: 3 },
        desc: "골드 자원을 생산하는 상업 중심지입니다.",
        commands: [
            { id: "collect", name: "골드 수집", icon: "💰", type: "action", shortcut: "G" }
        ]
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
        buildTurns: 6,
        size: { width: 3, depth: 3 },
        desc: "광물 자원을 채굴합니다.",
        commands: [
            { id: "collect", name: "광물 채굴", icon: "💎", type: "action", shortcut: "M" }
        ]
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
        buildTurns: 5,
        size: { width: 3, depth: 3 },
        desc: "영웅이나 특수 유닛을 고용합니다.",
        commands: [
            { id: "spawn_hero", name: "영웅 고용", icon: "👑", type: "produce", targetId: "hero", shortcut: "H" }
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
        buildTurns: 5,
        size: { width: 2, depth: 2 },
        desc: "화살로 적을 공격하는 방어 시설입니다.",
        commands: [
            { id: "stop", name: "정지", icon: "🛑", type: "action", shortcut: "S" },
            { id: "attack", name: "공격", icon: "⚔️", type: "action", shortcut: "A" }
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
        buildTurns: 6,
        size: { width: 2, depth: 2 },
        desc: "더 높은 체력을 가진 방어 탑입니다.",
        commands: [
            { id: "stop", name: "정지", icon: "🛑", type: "action", shortcut: "S" },
            { id: "attack", name: "공격", icon: "⚔️", type: "action", shortcut: "A" }
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
        buildTurns: 8,
        size: { width: 3, depth: 3 },
        desc: "강력한 바위를 던져 광역 피해를 줍니다.",
        commands: [
            { id: "stop", name: "정지", icon: "🛑", type: "action", shortcut: "S" },
            { id: "attack", name: "공격", icon: "⚔️", type: "action", shortcut: "A" }
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
        buildTurns: 5,
        size: { width: 3, depth: 3 },
        desc: "식량 생산 효율을 높여줍니다.",
        commands: [
            { id: "collect", name: "식량 생산", icon: "🌾", type: "action", shortcut: "F" }
        ]
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
        buildTurns: 2,
        size: { width: 1, depth: 1 },
        desc: "청결한 물을 공급합니다.",
        commands: [
            { id: "collect", name: "수급", icon: "💧", type: "action", shortcut: "W" }
        ]
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
        buildTurns: 6,
        size: { width: 3, depth: 3 },
        desc: "곡물을 가공하여 자원을 생산합니다.",
        commands: [
            { id: "collect", name: "곡물 생산", icon: "🥨", type: "action", shortcut: "G" }
        ]
    }
};
