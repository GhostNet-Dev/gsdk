import { StatKey } from "@Glibs/types/stattypes";
import { MonsterGrade, baseStatPresets } from "./stats";

export class StatFactory {
    static getDefaultStats(monId: string): Partial<Record<StatKey, number>> {
        return baseStatPresets[monId]
    }
    static getScaledStats(
        base: Partial<Record<StatKey, number>>,
        level: number = 1,
        grade: MonsterGrade = 'normal'
    ): Partial<Record<StatKey, number>> {
        const scaled: Partial<Record<StatKey, number>> = {};

        for (const key in base) {
            const value = base[key as StatKey]!;
            let result = value;

            // Apply level scaling
            if (['hp', 'attack', 'defense', 'magicAttack'].includes(key)) {
                result += level * (value * 0.1);
            }

            // Apply grade bonus
            if (grade === 'elite') {
                result *= 1.5;
            } else if (grade === 'boss') {
                result *= 3.0;
            }

            scaled[key as StatKey] = Math.round(result * 100) / 100;
        }

        return scaled;
    };

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

    static getPowerRating(stats: Partial<Record<StatKey, number>>): number {
        // 단순 예시: 가중치 없는 합산
        const importantStats: StatKey[] = ['hp', 'attack', 'defense', 'magicAttack', 'speed'];
        let total = 0;

        for (const key of importantStats) {
            const value = stats[key];
            if (value) total += value;
        }

        return Math.round(total);
    }
}