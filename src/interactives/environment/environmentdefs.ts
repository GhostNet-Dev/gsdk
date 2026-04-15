import { EventTypes } from "@Glibs/types/globaltypes";
import { Char } from "@Glibs/types/assettypes";

export enum EnvironmentType {
    Tree = "tree",
    Rock = "rock",
    Mineral = "mineral",
}

export interface EnvironmentProperty {
    id: string;
    type: EnvironmentType;
    assetKey: Char;
    size: { width: number; depth: number };
    scale: number;
    resourceType: EventTypes.Wood | EventTypes.Gold | EventTypes.Stone | EventTypes.Food;
    initialAmount: number;
    regenerationRate?: number; // 턴당 회복량 (옵션)
    randomRotation?: boolean;
    randomScaleRange?: [number, number]; // [min, max]
}

export const environmentDefs: Record<string, EnvironmentProperty> = {
    'pine_tree': {
        id: 'pine_tree',
        type: EnvironmentType.Tree,
        assetKey: Char.QuaterniusNatureCommontree1,
        size: { width: 1, depth: 1 },
        scale: 1.0,
        resourceType: EventTypes.Wood,
        initialAmount: 100,
        regenerationRate: 5,
        randomRotation: true,
        randomScaleRange: [0.8, 1.2]
    },
    'gold_node': {
        id: 'gold_node',
        type: EnvironmentType.Mineral,
        assetKey: Char.KayKitResourceGoldNuggets,
        size: { width: 1, depth: 1 },
        scale: 1.0,
        resourceType: EventTypes.Gold,
        initialAmount: 500,
        randomRotation: true
    }
};
