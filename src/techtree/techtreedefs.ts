import { BuffProperty, buffDefs } from "@Glibs/magical/buff/buffdefs";
import { ActionId, ActionProperty, actionDefs } from "@Glibs/types/actiontypes";

export type TechId = string;
export type Tag = string;
export type TechTreeKind = "skill" | "trait" | "buff" | "building" | "action";
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RarityConfig: Record<Rarity, { rank: number; color: string; label: string }> = {
    common:    { rank: 1, color: '#b0b0b0', label: '일반' },
    uncommon:  { rank: 2, color: '#5e98d9', label: '고급' },
    rare:      { rank: 3, color: '#4b69ff', label: '희귀' },
    epic:      { rank: 4, color: '#d32ce6', label: '영웅' },
    legendary: { rank: 5, color: '#ff8000', label: '전설' },
};

export interface LevelCost {
    lv: number;
    cost?: Partial<Record<"points" | "gold" | "materials", number>>;
}

export type TechTreeTypes = BuffProperty | ActionProperty;
export type Requirement =
    | { type: "has"; id: TechId; minLv?: number }
    | { type: "tag"; tag: Tag }
    | { type: "playerLv"; atLeast: number }
    | { type: "points"; atLeast: number }
    | { type: "quest"; id: string; status: "done" | "in-progress" }
    | { type: "stat"; key: string; atLeast: number }
    | { type: "skill"; id: ActionId; atLeast: number }
    | { type: "not"; of: Requirement }
    | { type: "all"; of: Requirement[] }
    | { type: "any"; of: Requirement[] };

export interface TechTreeDefBase {
    id: TechId;
    // 동작 정책을 분기하는 상위 분류.
    // 예) buff는 지속시간/스택 정책을 가질 수 있고, skill은 쿨다운/액티브 트리거를 가질 수 있음. trait는 주로 패시브 스탯 보정.
    kind: TechTreeKind;
    name: string;
    desc?: string;
    rarity?: Rarity;
    // 검색/필터/시너지/추천(예: “얼음”, “근접”, “보스전”)에 사용.
    // 레벨업 UI에서 카테고리 탭, 빌드 플래너의 자동 추천, 밸런싱 리포트(태그별 분포) 등에 유용.
    tags?: Tag[];
    // 레벨별 ‘성능+비용’의 단일 진실 소스(SSOT).
    // 각 항목은 lv(1-base), cost(points/gold 등)를 포함.
    // 해금 가능 여부(포인트 충족), 미리보기(다음 레벨 성능), 환급/재분배(respec) 계산이 모두 여기에서 파생.
    cost?: LevelCost[];
    // levels가 비어 있거나 일부만 제공될 때 쓰는 백업 규칙(보간/산식).
    // 실전에서는 “툴팁/표시”는 가급적 levels를 우선하고, 비정의 레벨에 한해 커브로 채우는 방식이 관리가 쉬움.
    // 밸런싱 안정화를 위해 초기 설계나 프로토타이핑 단계에서 특히 유용.
    curve?: {
        /** e.g., { base: 10, perLv: 5 } or your own formula tokens */
        formula: Record<string, number>;
    };
    // 레벨 1을 해금하기 위한 절대 조건. 선행 스킬/특성(has), 플레이어 레벨, 퀘스트 상태, 태그 보유, 스탯 하한 등을 조합(AND/OR/NOT).
    // 의존성 그래프(DAG) 구축 시 여기의 has(id)가 간선으로 추출되어 사이클 검증/정렬에 사용됨.
    requires?: Requirement[];
    // 현재 레벨에서 다음 레벨로 올릴 때 매번 검사하는 상대 조건.
    // 예) “3레벨 이상부터는 플레이어 레벨 20 필요”, “매 레벨업마다 포인트 외에 힘(STR)≥X”.
    requiresPerLevel?: Requirement[];
    tech: TechTreeTypes
}

export const DefaultTechTreeDefs: TechTreeDefBase[] = [
    {
        id: "fireball",
        kind: "skill",
        name: "fireball",
        desc: "화염구를 발사합니다.",
        cost: [1, 2, 3, 4, 5].map(lv => ({ lv, cost: { points: lv } })),
        tech: actionDefs.FireBall,
    },
    {
        id: "fireDefence",
        kind: "skill",
        name: "fireDefence",
        desc: "화염이 시전자를 보호합니다.",
        cost: [
            { lv: 1, cost: { points: 10 } },
        ],
        requires: [
            { type: "skill", id: actionDefs.FireBall.id as ActionId, atLeast: 2 }
        ],
        tech: actionDefs.FireDefence
    },
    {
        id: "darkside",
        kind: "buff",
        name: "dark side",
        desc: "암흑 저항이 증가합니다",
        cost: [
            { lv: 1, cost: { points: 1 } },
        ],
        requires: [
            { type: "playerLv", atLeast: 2 }
        ],
        tech: buffDefs.DarkSide
    },
    {
        id: "hpboost",
        kind: "buff",
        name: "HP Boost",
        desc: "boost hp",
        cost: [
            { lv: 1, cost: { points: 1 } },
        ],
        requires: [
            { type: "playerLv", atLeast: 2 }
        ],
        tech: buffDefs.HpBoost
    }
]