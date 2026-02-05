import { actionDefs } from "@Glibs/types/actiontypes";


export const traitDefs = {
    HpBoost: {
        id: "hpboost",
        name: "Hp Boost",
        nameKr: "Hp Boost",
        descriptionKr: "HP Max가 증가됩니다.",
        description: "",
        type: "trait",
        levelRequirement: 0,
        level: "common",
        icon: "🩸", //"🌙",
        actions: [actionDefs.HpStatBoost],
    },
}

export type Traitdefs = typeof traitDefs
export type TraitId = keyof Traitdefs
export type TraitProperty = Traitdefs[TraitId] // 공통 타입