import { StatKey } from "@Glibs/types/stattypes";
import { BaseSpec } from "./basespec";

// 데미지 속성 정의
export type DamageType = 'physical' | 'magic';

export class DamageFormula {
    
    // ==========================================
    // 📊 1. 순수 공격력 계산 (UI 표시 및 기본 데미지용)
    // ==========================================
    
    /**
     * 물리 공격력 계산
     * 공식: (기본 공격력 + 무기 공격력) + (힘 * 보정계수)
     */
    static getPhysicalAttack(spec: BaseSpec): number {
        const baseAtk = spec.Damage;
        const strength = spec.stats.getStat('strength');
        
        // 예: 힘 1당 공격력 0.5 증가 (기획에 따라 계수 조정)
        const strBonus = strength * 0.5; 
        
        return Math.floor(baseAtk + strBonus);
    }

    /**
     * 마법 공격력 계산
     * 공식: (마법 공격력) + (지능 * 보정계수)
     */
    static getMagicAttack(spec: BaseSpec): number {
        const magicAtk = spec.stats.getStat('magicAttack');
        const intelligence = spec.stats.getStat('intelligence');
        
        // 예: 지능 1당 마법 공격력 0.8 증가
        const intBonus = intelligence * 0.8;
        
        return Math.floor(magicAtk + intBonus);
    }

    /**
     * 치명타가 적용된 기대 데미지 배율 (DPS 계산용)
     * 예: 치명타율 50%, 치명타피해 200% -> 평균 1.5배 데미지
     */
    static getCritMultiplier(spec: BaseSpec): number {
        const rate = Math.min(spec.stats.getStat('criticalRate'), 100) / 100; // 0 ~ 1.0
        const damage = spec.stats.getStat('criticalDamage') / 100; // 1.5 (150%)
        
        // 치명타 안 터질 확률 * 1 + 치명타 터질 확률 * 데미지배율
        return (1 - rate) + (rate * damage);
    }

    // ==========================================
    // ⚡ 2. 종합 전투력 (Combat Power / DPS)
    // ==========================================
    
    /**
     * 초당 데미지(DPS) 기대값 계산 (평타 기준)
     * 용도: "이 무기가 더 쎈가?" 비교할 때 사용
     */
    static getDPS(spec: BaseSpec): { physical: number, magic: number } {
        const physAtk = this.getPhysicalAttack(spec);
        const magicAtk = this.getMagicAttack(spec);
        const atkSpeed = Math.max(0.1, spec.AttackSpeed); // 최소 공속 보정
        const critMult = this.getCritMultiplier(spec);

        return {
            physical: Math.floor(physAtk * atkSpeed * critMult),
            magic: Math.floor(magicAtk * atkSpeed * critMult)
        };
    }
}