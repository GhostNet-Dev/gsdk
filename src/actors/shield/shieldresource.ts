export type ShieldResourceKind = "energy" | "mana" | "stamina" | "custom"

export interface IShieldResourcePool {
  kind: ShieldResourceKind
  getCurrent(): number
  getMax(): number
  consume(amount: number): number
}
