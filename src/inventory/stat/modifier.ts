import { ModifierType, StatKey } from "./stattypes";

export class Modifier {
  constructor(
    public readonly stat: StatKey,
    public readonly value: number,
    public readonly type: ModifierType,
    public readonly source: string
  ) {}

  apply(base: number): number {
    return this.type === 'add' ? base + this.value : base * this.value;
  }
}
