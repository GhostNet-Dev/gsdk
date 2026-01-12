import { StatKey } from "@Glibs/types/stattypes";
import { MonsterGrade, baseStatPresets } from "./stats";

export class StatFactory {
    // 몬스터 ID로 기본 스탯 가져오기
    static getDefaultStats(monId: string): Partial<Record<StatKey, number>> {
        return baseStatPresets[monId] || {};
    }

    /**
     * 레벨과 등급에 따라 스탯을 성장시킵니다.
     * @param base 태생(1레벨) 스탯
     * @param level 현재 레벨
     * @param grade 몬스터 등급 (보너스 배율)
     */
    static getScaledStats(
        base: Partial<Record<StatKey, number>>,
        level: number = 1,
        grade: MonsterGrade = 'normal'
    ): Partial<Record<StatKey, number>> {
        const scaled: Partial<Record<StatKey, number>> = {};
        
        // 등급별 보너스 배율 설정
        let gradeMultiplier = 1.0;
        if (grade === 'elite') gradeMultiplier = 1.5;
        else if (grade === 'boss') gradeMultiplier = 3.0;

        for (const key in base) {
            const statKey = key as StatKey;
            const baseValue = base[statKey]!;
            let result = baseValue;

            // 1. 레벨 성장 로직 (성장형 스탯만 적용)
            // 공식: 기본값 + (기본값의 10% * (레벨 - 1))
            // 예: 공격력 10, 2레벨 -> 10 + (1) = 11
            if (['hp', 'mp', 'attack', 'defense', 'magicAttack', 'strength', 'intelligence'].includes(statKey)) {
                // 성장 계수 (0.1 = 레벨당 10% 증가)
                const growthRate = 0.1; 
                result = baseValue + (baseValue * growthRate * (level - 1));
            }

            // 2. 등급 보너스 적용
            result *= gradeMultiplier;

            // 소수점 2자리에서 반올림
            scaled[statKey] = Math.round(result * 100) / 100;
        }

        return scaled;
    }

    /**
     * 다음 레벨업에 필요한 경험치를 계산합니다.
     * @param level 현재 레벨
     */
    static getRequiredExp(level: number): number {
        // 공식: 레벨 * 100 (필요에 따라 지수 함수로 변경 가능)
        // 예: 1lv -> 100, 2lv -> 200, 10lv -> 1000
        return level * 100;
    }

    // 스탯 비교 (장비 교체 시 UI 표시에 사용)
    static compareStats(
        base: Partial<Record<StatKey, number>>,
        scaled: Partial<Record<StatKey, number>>
    ): { stat: StatKey; base?: number; scaled: number; diff?: number }[] {
        const keys = new Set([
            ...Object.keys(base) as StatKey[],
            ...Object.keys(scaled) as StatKey[],
        ]);

        const result: {
            stat: StatKey;
            base?: number;
            scaled: number;
            diff?: number;
        }[] = [];

        for (const key of keys) {
            const baseVal = base[key];
            const scaledVal = scaled[key]!;
            const diff = baseVal !== undefined ? +(scaledVal - baseVal).toFixed(2) : undefined;

            result.push({
                stat: key,
                base: baseVal,
                scaled: scaledVal,
                diff,
            });
        }

        return result.sort((a, b) => (a.stat > b.stat ? 1 : -1));
    }

    // 전투력(Combat Power) 측정
    static getPowerRating(stats: Partial<Record<StatKey, number>>): number {
        // 가중치: 공격력과 체력은 1점, 방어력은 1.5점, 속도는 10점 등
        let total = 0;
        total += (stats.hp || 0) * 0.1;
        total += (stats.attack || 0) * 1.0;
        total += (stats.magicAttack || 0) * 1.0;
        total += (stats.defense || 0) * 1.5;
        total += (stats.speed || 0) * 10.0;
        total += (stats.criticalRate || 0) * 0.5;

        return Math.floor(total);
    }
}