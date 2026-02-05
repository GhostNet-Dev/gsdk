import { StatKey } from "@Glibs/types/stattypes";
import { BaseSpec } from "./basespec";
import { DamageFormula, DamageType } from "./damageformula"; // 위에서 만든 모듈 import

export interface DamageContext {
  attacker: BaseSpec;       // source -> attacker로 명칭 변경 제안
  defender: BaseSpec;       // destination -> defender로 명칭 변경 제안
  type?: DamageType;        // physical | magic
  skillMultiplier?: number; // 스킬 계수 (기본 1.0)
  isFixedDamage?: boolean;  // 방어 무시 여부 등
}

export interface DamageResult {
    finalDamage: number;
    isHit: boolean;
    isCritical: boolean;
    isBlocked: boolean;
    rawDamage: number;      // 방어 적용 전 데미지 (표기용)
}

export function calculateCompositeDamage(ctx: DamageContext): DamageResult {
  const { attacker, defender, type = 'physical', skillMultiplier = 1.0 } = ctx;

  const result: DamageResult = {
      finalDamage: 0,
      isHit: false,
      isCritical: false,
      isBlocked: false,
      rawDamage: 0
  };

  // 1. 명중 판정 (기존 로직 유지)
  const hitChance = Math.max(0, 0.95 + (attacker.stats.getStat('accuracy') - defender.stats.getStat('evasion')) / 100);
  if (Math.random() > hitChance) {
      return result; // Miss
  }
  result.isHit = true;

  // 2. 기본 공격력 가져오기 (DamageFormula 사용)
  let damage = type === 'physical' 
      ? DamageFormula.getPhysicalAttack(attacker) 
      : DamageFormula.getMagicAttack(attacker);

  // 스킬 계수 적용
  damage *= skillMultiplier;
  result.rawDamage = Math.floor(damage); // 방어 적용 전 데미지 기록

  // 3. 치명타 판정
  const critRate = attacker.stats.getStat('criticalRate');
  if (Math.random() * 100 < critRate) {
      result.isCritical = true;
      const critDmg = Math.max(100, attacker.stats.getStat('criticalDamage')) / 100;
      damage *= critDmg;
  }

  // 4. 방어력 적용 (물리/마법 분기)
  if (!ctx.isFixedDamage) {
      const defKey: StatKey = type === 'physical' ? 'defense' : 'magicDefense';
      const defense = defender.stats.getStat(defKey);
      const penetration = attacker.stats.getStat('penetration');
      
      const effectiveDefense = Math.max(0, defense - penetration);
      
      // 방어율 공식: 방어력 / (방어력 + 상수) -> 데미지 감소율
      // 상수 100 기준: 방어 100일 때 50% 감소
      const mitigation = 100 / (100 + effectiveDefense);
      damage *= mitigation;
  }

  // 5. 블록(Block) 판정
  const blockRate = defender.stats.getStat('block');
  if (Math.random() * 100 < blockRate) {
      result.isBlocked = true;
      damage *= 0.5; // 50% 데미지 감소
  }

  // 6. 속성 저항 등 기타 보정은 필요 시 여기에 추가 (기존 로직 참조)

  result.finalDamage = Math.max(1, Math.floor(damage));
  return result;
}