import { StatApplyMode, StatKey } from "@Glibs/types/stattypes";
import { BaseSpec } from "./basespec";

type ElementType = 'physical' | 'magic' | 'fire' | 'ice' | 'poison';

export interface DamageContext {
  source: BaseSpec[];
  destination: BaseSpec;
  element?: ElementType;
  skillMultiplier?: number;
}

function getStatFromSources(
  sources: BaseSpec[],
  key: StatKey
): number {
  const mode = StatApplyMode[key] || 'add';
  const values = sources.map(s => s.stats.getStat(key) || 0);

  switch (mode) {
    case 'add':
      return values.reduce((a, b) => a + b, 0);
    case 'mul':
      return values.reduce((a, b) => a * (b || 1), 1);
    case 'max':
      return Math.max(...values, 0);
    default:
      return 0;
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function calculateCompositeDamage(context: DamageContext): number {
  const {
    source,
    destination,
    element = 'physical',
    skillMultiplier = 1.0,
  } = context;

  const get = (key: StatKey) => getStatFromSources(source, key);
  const targetStat = (key: StatKey) => destination.stats.getStat(key) || 0;

  // 🧱 1. 기본 공격력 계산
  let base = get(element === 'magic' ? 'magicAttack' : 'attack');

  // 💪 능력치 계수 보정
  base += get('strength') * 0.5;
  base += get('intelligence') * 0.3;

  // 🔥 속성 보너스
//   if (['fire', 'ice', 'poison'].includes(element)) {
//     base += get('elementBonusDamage');
//   }

  let damage = base * skillMultiplier;

  // 🎯 2. 명중 / 회피
  const accuracy = get('accuracy');
  const evasion = targetStat('evasion');
    const hitChance = clamp(accuracy * (1 - evasion), 0, 1);
    if (Math.random() > hitChance) return 0; // Miss

  // 🛡 3. 방어력 / 관통력
  const defense = targetStat(element === 'magic' ? 'magicDefense' : 'defense');
  const penetration = get('penetration');
  const reducedDef = Math.max(0, defense - penetration);
  damage *= (100 / (100 + reducedDef));

  // 🧪 4. 속성 저항
  const resistMap: Record<string, StatKey> = {
    fire: 'fireResistance',
    ice: 'iceResistance',
    poison: 'poisonResistance'
  };
  const resistKey = resistMap[element];
  if (resistKey) {
    const resist = targetStat(resistKey);
    damage *= (100 - resist) / 100;
  }

  // 💥 5. 치명타
  const critChance = get('criticalRate');
  const critMult = get('criticalDamage') || 1.5;
  const isCrit = Math.random() < critChance;
  damage *= isCrit ? critMult : 1;

  // 🎲 6. 랜덤 변동
  const variance = 0.95 + Math.random() * 0.1;
  damage *= variance;

  return Math.floor(damage);
}
