import { InteractableObject } from "@Glibs/interactives/interactable/interactable";

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

export const interactableDefs: InteractableObjectDefinitions = {
  tree: {
      reward: { type: "reward", reward: "wood" },
      durability: { type: "durability", durability: 3 },
      cooldown: { type: "cooldown", cooldownTime: 2000 },
    }
}
