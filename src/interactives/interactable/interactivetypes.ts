import { InteractableObject } from "@Glibs/interactives/interactable/interactable";
import { itemDefs } from "@Glibs/inventory/items/itemdefs";
import { ActionDefs } from "@Glibs/types/actiontypes";
import { Char } from "@Glibs/types/assettypes";

export type InteractiveType =
    "none" | "tree" | "ore" | "trap" | "chest" | "switch"; // 오브젝트 분류

export type ComponentType = "cooldown" | "durability" | "trap" | "reward" | "respawn";

export type ComponentRecord = {
  [name: string]:
    | { type: "cooldown"; cooldownTime: number }
    | { type: "durability"; durability: number }
    | { type: "switch"; targets: InteractableObject[] }
    | { type: "trap"; damage: number }
    | { type: "reward"; reward: string }
    | { type: "respawn"; respawnTime: number };
};

type InteractableObjectDefinition = {
  type: "tree" | "ore" | "trap" | "chest" | "switch"; // 오브젝트 분류
  components: ComponentRecord;
};
type InteractableObjectDefinitions = Record<string, ComponentRecord>;

export const interactableDefs = {
  Tree: {
    id: "tree",
    type: "tree",
    level: "common",
    assetKey: Char.Tree,
    name: "tree",
    stats: { "hp": 10 },
    actions: [ActionDefs.Shaker, ActionDefs.Fluffy],
    drop: [
      { itemId: itemDefs.Logs.id, ratio: 1 }
    ]
  },
  Obstacle: {
    id: "obstacle",
    type: "obstacle",
    level: "common",
    assetKey: Char.UltimateCubeBricks,
    name: "obstacle",
    stats: { },
  }
} as const

export type InteractableDefs = typeof interactableDefs
export type InterId = keyof InteractableDefs
export type InteractableProperty = InteractableDefs[InterId]