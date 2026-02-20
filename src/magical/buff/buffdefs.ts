import { actionDefs } from "@Glibs/types/actiontypes";


export const buffDefs = {
    DarkSide: {
        id: "darkside",
        name: "Dark Side",
        nameKr: "다크사이드",
        descriptionKr: "어둠속성이 강화됩니다.",
        description: "",
        type: "attack",
        levelRequirement: 0,
        level: "common",
        stackable: false,
        binding: true,
        icon: "🌑",
        duration: 0,
        actions: [actionDefs.DarkParticle],
    },
    HpBoost: {
        id: "hpboost",
        name: "Hp Boost",
        nameKr: "Hp Boost",
        descriptionKr: "HP Max가 증가됩니다.",
        description: "",
        type: "buff",
        levelRequirement: 0,
        level: "common",
        stackable: false,
        binding: true,
        duration: 60,
        icon: "🩸", //"🌙",
        actions: [actionDefs.HpStatBoost],
    },
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
        duration: 0,
        actions: [actionDefs.StunStars],
    },

    CurseTorment: {
        id: "curse_torment",
        name: "Torment",
        nameKr: "고행",
        descriptionKr: "레벨이 오를수록 생존력이 감소하지만 보상이 증가합니다.",
        description: "High risk high reward curse scaling by tech level.",
        type: "curse",
        levelRequirement: 0,
        level: "epic",
        stackable: false,
        binding: true,
        icon: "☠️",
        duration: 0,
        actions: [actionDefs.CurseTorment],
    },
}

export type Buffdefs = typeof buffDefs
export type BuffId = keyof Buffdefs
export type BuffProperty = Buffdefs[BuffId] // 공통 타입