import { ActionDefs } from "@Glibs/types/actiontypes";


export const buffDefs = {
    DarkSide: {
        id: "darkside",
        name: "Dark Side",
        nameKr: "다크사이드",
        descriptionKr: "",
        description: "",
        type: "attack",
        levelRequirement: 0,
        level: "common",
        stackable: false,
        binding: true,
        actions: [ActionDefs.DarkParticle],
    },
    StunStar: {
        id: "stunstar",
        name: "Stun",
        nameKr: "기절",
        descriptionKr: "",
        description: "",
        type: "stun",
        levelRequirement: 0,
        level: "common",
        stackable: false,
        binding: true,
        actions: [ActionDefs.StunStars],
    },
}

export type Buffdefs = typeof buffDefs
export type BuffId = keyof Buffdefs
export type BuffProperty = Buffdefs[BuffId] // 공통 타입