import { Modifier } from "./modifier";
import { StatKey } from "./stattypes";

export class StatSystem {
  private baseStats: Record<StatKey, number> = {} as any;
  private modifiers: Modifier[] = [];

  private cachedStats: Map<StatKey, number> = new Map();
  private isDirty = true;

  constructor(base: Partial<Record<StatKey, number>>) {
    if(!base) return;

    Object.keys(base).forEach(k => {
      this.baseStats[k as StatKey] = base[k as StatKey]!;
    });
  }

  getStat(stat: StatKey): number {
    if (this.isDirty) {
      this.recalculateAll();
    }
    return this.cachedStats.get(stat) ?? (this.baseStats[stat] || 0);
  }

  addModifier(mod: Modifier) {
    this.modifiers.push(mod);
    this.markDirty();
  }

  removeModifier(mod: Modifier) {
    this.modifiers = this.modifiers.filter(m => m !== mod);
    this.markDirty();
  }

  removeModifierBySource(source: string) {
    this.modifiers = this.modifiers.filter(m => m.source !== source);
    this.markDirty();
  }

  private markDirty() {
    this.isDirty = true;
  }

  private recalculateAll() {
    this.cachedStats.clear();

    for (const stat of Object.keys(this.baseStats) as StatKey[]) {
      this.cachedStats.set(stat, this.baseStats[stat]);
    }

    for (const mod of this.modifiers) {
      const current = this.cachedStats.get(mod.stat) ?? 0;
      const updated = mod.apply(current);
      this.cachedStats.set(mod.stat, updated);
    }

    this.isDirty = false;
  }
}
