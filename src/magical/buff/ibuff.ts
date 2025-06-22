import { BaseSpec } from "@Glibs/actors/battle/basespec"

export interface IBuffItem {
    name: string
    icon: string
    lv: number
    explain: string
    IncreaseLv(): number
    GetAttackSpeed(): number
    GetMoveSpeed(): number
    GetDamageMax(): number
    Update(delta: number, status: BaseSpec): void
}