import { IShieldResourcePool } from "./shieldresource"

type ShipEnergyRuntime = {
  getEnergy(): number
  getMaxEnergy(): number
  consumeEnergyAmount(amount: number): number
}

export class ShipEnergyPool implements IShieldResourcePool {
  kind = "energy" as const

  constructor(private readonly runtime: ShipEnergyRuntime) {}

  getCurrent(): number {
    return this.runtime.getEnergy()
  }

  getMax(): number {
    return this.runtime.getMaxEnergy()
  }

  consume(amount: number): number {
    return this.runtime.consumeEnergyAmount(amount)
  }
}
