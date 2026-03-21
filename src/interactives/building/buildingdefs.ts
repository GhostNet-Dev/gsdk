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
    type: BuildingType; // 건물 유형 추가
    isUnique?: boolean; // [추가] 고유 건물 여부 (기본값 false)
    assetKey: Char;
    hp: number;
    scale: number;
    buildTime: number; // seconds (for Timer mode)
    buildTurns: number; // number of turns (for Turn mode)
    size: { width: number; depth: number };
    provides?: string[];
    desc?: string;
    commands?: CommandTemplate[]; // [추가] 버튼 템플릿 정의
}

export const buildingDefs: Record<string, BuildingProperty> = {
    CommandCenter: {
        id: "cc",
        name: "본부",
        type: BuildingType.UnitProduction,
        isUnique: true,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingCastleBlue,
        hp: 1500,
        scale: 10,
        buildTime: 10,
        buildTurns: 10,
        size: { width: 5, depth: 5 },
        provides: ["scv"],
        desc: "핵심 지휘 본부입니다.",
        commands: [
            { id: "spawn_scv", name: "SCV 생산", icon: "🤖", type: "produce", targetId: "scv", shortcut: "S" }
        ]
    },
    SupplyDepot: {
        id: "supply",
        name: "보급고",
        type: BuildingType.ResourceProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingHomeABlue,
        hp: 500,
        scale: 10,
        buildTime: 10,
        buildTurns: 3,
        size: { width: 2, depth: 2 },
        desc: "인구수를 늘려주는 보급고입니다.",
        commands: [
            { id: "collect", name: "자원 수집", icon: "💰", type: "action", shortcut: "C" }
        ]
    },
    Barracks: {
        id: "barracks",
        name: "병영",
        type: BuildingType.UnitProduction,
        isUnique: false,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingBarracksBlue,
        hp: 1000,
        scale: 10,
        buildTime: 10,
        buildTurns: 5,
        size: { width: 3, depth: 3 },
        provides: ["marine", "firebat", "medic"],
        desc: "보병 유닛을 생산하는 시설입니다.",
        commands: [
            { id: "spawn_marine", name: "해병 생산", icon: "🔫", type: "produce", targetId: "marine", shortcut: "M" },
            { id: "spawn_medic", name: "의무병 생산", icon: "💉", type: "produce", targetId: "medic", shortcut: "E" }
        ]
    },
    EngineeringBay: {
        id: "ebay",
        name: "공학 연구소",
        type: BuildingType.TechResearch,
        isUnique: true,
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingHomeBBlue,
        hp: 800,
        scale: 10,
        buildTime: 15,
        buildTurns: 8,
        size: { width: 4, depth: 4 },
        desc: "보병의 공격력과 방어력을 연구합니다.",
        commands: [
            { id: "res_atk", name: "공격력 연구", icon: "⚔️", type: "research", targetId: "infantry_atk", shortcut: "A" },
            { id: "res_def", name: "방어력 연구", icon: "🛡️", type: "research", targetId: "infantry_def", shortcut: "D" }
        ]
    }
};

