import { BaseSpec } from "./basespec";
import { StatKey } from "@Glibs/types/stattypes";

// 스탯 합산 규칙 정의
type MergeRule = 'sum' | 'avg' | 'max' | 'leader';

const StatMergeRules: Partial<Record<StatKey, MergeRule>> = {
    // ⚔️ [합산] 힘을 합치는 스탯 (공격력, 체력 등)
    attack: 'sum',
    magicAttack: 'sum',
    hp: 'sum',
    mp: 'sum',
    strength: 'sum',
    intelligence: 'sum',
    
    // ⚖️ [평균] 효율/확률 스탯 (치명타, 속도 등은 너무 높아지면 안 됨)
    criticalRate: 'avg', 
    criticalDamage: 'avg',
    accuracy: 'avg',
    evasion: 'avg',
    speed: 'avg', // 이동 속도는 평균으로 맞춤

    // 👑 [리더 기준] 사거리나 이동 타입 등은 리더를 따름
    attackRange: 'leader',
};

export class VirtualActorFactory {

    /**
     * 여러 캐릭터의 스탯을 합쳐 '가상의 공격자'를 생성합니다.
     * @param leader 공격을 주도하는 캐릭터 (이팩트, 콜백 등의 주체)
     * @param supporters 도움을 주는 캐릭터들
     */
    static createFusionActor(leader: BaseSpec, supporters: BaseSpec[]): BaseSpec {
        const participants = [leader, ...supporters];
        
        // 1. 합산된 스탯 계산
        const mergedStats: Partial<Record<StatKey, number>> = {};
        
        // 모든 스탯 키 순회 (성능을 위해 필요한 키만 지정 가능)
        const allStatKeys = [
            'attack', 'magicAttack', 'strength', 'intelligence', // 공격
            'criticalRate', 'criticalDamage', 'accuracy',        // 효율
            'hp', 'mp'                                           // 자원
        ] as StatKey[];

        allStatKeys.forEach(key => {
            const rule = StatMergeRules[key] || 'sum'; // 기본값은 합산
            
            let value = 0;
            
            switch (rule) {
                case 'sum':
                    value = participants.reduce((acc, p) => acc + p.stats.getStat(key), 0);
                    break;
                case 'avg':
                    const total = participants.reduce((acc, p) => acc + p.stats.getStat(key), 0);
                    value = total / participants.length;
                    break;
                case 'max':
                    value = Math.max(...participants.map(p => p.stats.getStat(key)));
                    break;
                case 'leader':
                    value = leader.stats.getStat(key);
                    break;
            }
            
            mergedStats[key] = Math.floor(value);
        });

        // 2. 가상 BaseSpec 생성
        // 주의: owner는 이 공격의 '보상'이나 '어그로'를 가져갈 주체(Leader)로 설정
        // StatSystem은 새로 만든 mergedStats로 초기화
        const virtualActor = new BaseSpec(mergedStats, leader.Owner); 
        
        // *중요*: 리더의 스킬 계수 등 일시적 속성 복사
        virtualActor.skillMultiplier = leader.skillMultiplier;

        return virtualActor;
    }
}