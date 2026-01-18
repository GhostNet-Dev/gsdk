import { actionDefs } from "@Glibs/types/actiontypes";


export const skillDefs = {
    StunStar: {
        id: "stunstar",
        name: "Stun",
        nameKr: "기절",
        descriptionKr: "일정확률로 기절시킵니다.",
        description: "",
        type: "stun",
        levelRequirement: 0,
        level: "common",
        stackable: false,
        binding: true,
        icon: "💫",
        actions: [actionDefs.StunStars],
    },
}

export type Skilldefs = typeof skillDefs
export type SkillId = keyof Skilldefs
export type SkillProperty = Skilldefs[SkillId] // 공통 타입