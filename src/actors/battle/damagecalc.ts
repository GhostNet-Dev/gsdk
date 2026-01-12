import { StatApplyMode, StatKey } from "@Glibs/types/stattypes";
import { BaseSpec } from "./basespec";

type ElementType = 'physical' | 'magic' | 'fire' | 'ice' | 'poison';

export interface DamageContext {
  source: BaseSpec[];
  destination: BaseSpec;
  element?: ElementType;
  skillMultiplier?: number;
}

// 💥 데미지 계산 결과 상세 정보 (UI 표시 및 로직 분기용)
export interface DamageResult {
    finalDamage: number;
    isHit: boolean;      // 명중 여부 (회피됨: false)
    isCritical: boolean; // 치명타 여부
    isBlocked: boolean;  // 방어(Block) 성공 여부
}

// 여러 소스(버프, 오라 등)에서 스탯 합산
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

export function calculateCompositeDamage(context: DamageContext): DamageResult {
  const {
    source,
    destination,
    element = 'physical',
    skillMultiplier = 1.0,
  } = context;

  // 결과 초기화
  const result: DamageResult = {
      finalDamage: 0,
      isHit: true,
      isCritical: false,
      isBlocked: false
  };

  const get = (key: StatKey) => getStatFromSources(source, key);
  const targetStat = (key: StatKey) => destination.stats.getStat(key) || 0;

  // ==========================================
  // 🎯 1. 명중 / 회피 (Accuracy vs Evasion)
  // ==========================================
  const accuracy = get('accuracy');
  const evasion = targetStat('evasion');
  
  // 기본 명중률 95% + (명중 - 회피)%
  // 예: 명중 10, 회피 5 -> 100% 명중
  // 예: 명중 0, 회피 50 -> 45% 명중
  const hitChance = clamp(0.95 + (accuracy - evasion) / 100, 0, 1.0);
  
  if (Math.random() > hitChance) {
      result.isHit = false;
      return result; // Miss 발생 시 0 데미지 리턴
  }

  // ==========================================
  // ⚔️ 2. 기본 공격력 계산 (Base Damage)
  // ==========================================
  let baseDamage = get(element === 'magic' ? 'magicAttack' : 'attack');

  // 스탯 보정 (힘은 물리뎀, 지능은 마법뎀 보너스)
  if (element === 'magic') {
      baseDamage += get('intelligence') * 0.5;
  } else {
      baseDamage += get('strength') * 0.5;
  }

  let damage = baseDamage * skillMultiplier;

  // ==========================================
  // 🛡 3. 방어력 (Defense & Penetration)
  // ==========================================
  // LoL/워크래프트 스타일 방어 공식: 데미지 = 원래데미지 * (상수 / (상수 + 방어력))
  // 방어력이 높을수록 효율이 점감됨.
  const defenseStat = element === 'magic' ? 'magicDefense' : 'defense';
  const rawDefense = targetStat(defenseStat);
  const penetration = get('penetration'); // 방어 관통
  
  // 관통력 적용 (방어력은 0 밑으로 내려가지 않음)
  const effectiveDefense = Math.max(0, rawDefense - penetration);
  
  // 방어 상수 100: 방어력 100일 때 데미지 50% 감소
  const mitigationMultiplier = 100 / (100 + effectiveDefense);
  
  damage *= mitigationMultiplier;

  // ==========================================
  // 🧪 4. 속성 저항 (Elemental Resistance)
  // ==========================================
  const resistMap: Record<string, StatKey> = {
    fire: 'fireResistance',
    ice: 'iceResistance',
    poison: 'poisonResistance'
  };
  const resistKey = resistMap[element];
  if (resistKey) {
    const resist = targetStat(resistKey); // 저항 수치 (예: 20 -> 20% 감소)
    damage *= (100 - clamp(resist, -100, 100)) / 100;
  }

  // ==========================================
  // 💥 5. 치명타 (Critical)
  // ==========================================
  const critRate = get('criticalRate');
  // 치명타율은 최대 100%
  const critChance = clamp(critRate / 100, 0, 1.0);
  
  if (Math.random() < critChance) {
      result.isCritical = true;
      // 기본 치명타 배율 1.5배 (150%) + 추가 치명타 피해량
      const critDamageStats = get('criticalDamage'); 
      const critMultiplier = critDamageStats > 0 ? (critDamageStats / 100) : 1.5;
      
      damage *= critMultiplier;
  }

  // ==========================================
  // 🛡 6. 블록 (Block - 완전 방어 or 데미지 감소)
  // ==========================================
  const blockRate = targetStat('block');
  const blockChance = clamp(blockRate / 100, 0, 0.75); // 블록 확률 최대 75% 제한

  if (Math.random() < blockChance) {
      result.isBlocked = true;
      damage *= 0.5; // 블록 성공 시 데미지 50% 감소 (게임 기획에 따라 0으로 설정 가능)
  }

  // ==========================================
  // 🎲 7. 랜덤 변동 (Variance) - ±5%
  // ==========================================
  const variance = 0.95 + Math.random() * 0.1;
  damage *= variance;

  // 최종값 정수 처리 (최소 1 데미지 보장)
  result.finalDamage = Math.max(1, Math.floor(damage));
  
  return result;
}