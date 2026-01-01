import { actionDefs } from "@Glibs/types/actiontypes";


export const skillDefs = {
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
        bufflevel: 1,
        actions: [actionDefs.DarkParticle],
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
        bufflevel: 1,
        actions: [actionDefs.StunStars],
    },
}

export type Skilldefs = typeof skillDefs
export type SkillId = keyof Skilldefs
export type SkillProperty = Skilldefs[SkillId] // 공통 타입