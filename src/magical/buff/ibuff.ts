import { PlayerStatus } from "@Glibs/types/playertypes"

export interface IBuffItem {
    name: string
    icon: string
    lv: number
    explain: string
    IncreaseLv(): number
    GetAttackSpeed(): number
    GetMoveSpeed(): number
    GetDamageMax(): number
    Update(delta: number, status: PlayerStatus): void
}