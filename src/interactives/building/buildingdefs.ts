import { Char } from "@Glibs/types/assettypes";
import { BuildingType } from "./ibuildingobj";

export enum BuildingMode {
    Timer,
    Turn
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
}

export const buildingDefs: Record<string, BuildingProperty> = {
    CommandCenter: {
        id: "cc",
        name: "본부",
        type: BuildingType.UnitProduction,
        isUnique: true, // 본부는 하나만
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingCastleBlue,
        hp: 1500,
        scale: 10,
        buildTime: 10,
        buildTurns: 10,
        size: { width: 5, depth: 5 },
        provides: ["scv"],
        desc: "핵심 지휘 본부입니다."
    },
    SupplyDepot: {
        id: "supply",
        name: "보급고",
        type: BuildingType.ResourceProduction,
        isUnique: false, // 여러 개 지을 수 있음
        assetKey: Char.KaykitMedHexagonBuildingBulePackBuildingHomeABlue,
        hp: 500,
        scale: 10,
        buildTime: 10,
        buildTurns: 3,
        size: { width: 2, depth: 2 },
        desc: "인구수를 늘려주는 보급고입니다."
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
        desc: "보병 유닛을 생산하는 시설입니다."
    }
};
