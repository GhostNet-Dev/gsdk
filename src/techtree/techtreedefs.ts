import { CostVector, CurrencyType } from "@Glibs/inventory/wallet";
import { BuffProperty, buffDefs } from "@Glibs/magical/buff/buffdefs";
import { ActionId, ActionProperty, actionDefs } from "@Glibs/types/actiontypes";
import { BuildingProperty, buildingDefs } from "@Glibs/interactives/building/buildingdefs";

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
    cost?: CostVector;
}

export type TechTreeTypes = BuffProperty | ActionProperty | BuildingProperty;
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
    // 예) buff는 지속시간/스택 정책을 가질 수 있고, skill은 쿨다운/액티브 트리거를 가질 수 있음. 
    // trait는 주로 패시브 스탯 보정.
    kind: TechTreeKind;
    name: string;
    desc?: string;
    icon?: string; // [추가] 이모지("⚔️") 또는 이미지 경로("assets/icon.png")
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

// =========================================================
// [설정] 공통 상수 (Placeholder)
// =========================================================
const MOCK_TECH = buffDefs.DarkSide; // 실제 기능은 이걸로 통일

// 모든 레벨 비용 1 골드
const COST_0: LevelCost[] = [{ lv: 1 }];
const COST_1: LevelCost[] = COST_0
const COST_3: LevelCost[] = COST_0;
const COST_5: LevelCost[] = COST_0;
// const COST_1: LevelCost[] = [{ lv: 1, cost: { gold: 1 } }];
// const COST_3: LevelCost[] = [
//     { lv: 1, cost: { gold: 1 } }, { lv: 2, cost: { gold: 1 } }, { lv: 3, cost: { gold: 1 } }
// ];
// const COST_5: LevelCost[] = [
//     { lv: 1, cost: { gold: 1 } }, { lv: 2, cost: { gold: 1 } }, { lv: 3, cost: { gold: 1 } },
//     { lv: 4, cost: { gold: 1 } }, { lv: 5, cost: { gold: 1 } }
// ];


export const DefaultTechTreeDefs: TechTreeDefBase[] = [
    {
        id: "cc",
        kind: "building",
        name: "지휘 본부",
        desc: "핵심 지휘 본부입니다.",
        icon: "🏰",
        rarity: "common",
        tags: ["base"],
        cost: [{ lv: 1, cost: { gold: 100 } }],
        tech: buildingDefs.CommandCenter
    },
    {
        id: "well",
        kind: "building",
        name: "우물",
        desc: "청결한 물을 공급하며 주변에 건물을 지을 수 있는 건설 영역을 제공합니다.",
        icon: "💧",
        rarity: "common",
        tags: ["resource"],
        requires: [{ type: "has", id: "cc", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 30 } }],
        tech: buildingDefs.Well
    },
    {
        id: "lumbermill",
        kind: "building",
        name: "제재소",
        desc: "나무 자원을 가공하여 생산합니다.",
        icon: "🪵",
        rarity: "common",
        tags: ["resource"],
        requires: [{ type: "has", id: "cc", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 80 } }],
        tech: buildingDefs.LumberMill
    },
    {
        id: "mine",
        kind: "building",
        name: "광산",
        desc: "광물 자원을 채굴합니다.",
        icon: "💎",
        rarity: "common",
        tags: ["resource"],
        requires: [{ type: "has", id: "cc", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 120 } }],
        tech: buildingDefs.Mine
    },
    {
        id: "supply",
        kind: "building",
        name: "보급고",
        desc: "인구수를 늘려주는 보급고입니다.",
        icon: "🏠",
        rarity: "common",
        tags: ["supply"],
        requires: [{ type: "has", id: "cc", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 50 } }],
        tech: buildingDefs.HomeA
    },
    {
        id: "home_b",
        kind: "building",
        name: "고급 주택",
        desc: "더 많은 인구를 수용하는 주택입니다.",
        icon: "🏡",
        rarity: "uncommon",
        tags: ["supply"],
        requires: [{ type: "has", id: "supply", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 150 } }],
        tech: buildingDefs.HomeB
    },
    {
        id: "watermill",
        kind: "building",
        name: "물레방아",
        desc: "식량 생산 효율을 높여줍니다.",
        icon: "⚙️",
        rarity: "uncommon",
        tags: ["resource"],
        requires: [{ type: "has", id: "well", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 100 } }],
        tech: buildingDefs.Watermill
    },
    {
        id: "windmill",
        kind: "building",
        name: "풍차",
        desc: "곡물을 가공하여 자원을 생산합니다.",
        icon: "🥨",
        rarity: "uncommon",
        tags: ["resource"],
        requires: [{ type: "has", id: "watermill", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 180 } }],
        tech: buildingDefs.Windmill
    },
    {
        id: "market",
        kind: "building",
        name: "시장",
        desc: "골드 자원을 생산하는 상업 중심지입니다.",
        icon: "💰",
        rarity: "uncommon",
        tags: ["economy"],
        requires: [{ type: "has", id: "mine", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 200 } }],
        tech: buildingDefs.Market
    },
    {
        id: "barracks",
        kind: "building",
        name: "병영",
        desc: "보병 유닛을 생산하는 시설입니다.",
        icon: "⚔️",
        rarity: "common",
        tags: ["production"],
        requires: [{ type: "has", id: "supply", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 150 } }],
        tech: buildingDefs.Barracks
    },
    {
        id: "archery",
        kind: "building",
        name: "궁술 훈련장",
        desc: "원거리 유닛을 훈련합니다.",
        icon: "🏹",
        rarity: "uncommon",
        tags: ["production"],
        requires: [{ type: "has", id: "barracks", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 180 } }],
        tech: buildingDefs.ArcheryRange
    },
    {
        id: "ebay",
        kind: "building",
        name: "공학 연구소",
        desc: "보병의 공격력과 방어력을 연구합니다.",
        icon: "🔬",
        rarity: "common",
        tags: ["research"],
        requires: [{ type: "has", id: "barracks", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 200 } }],
        tech: buildingDefs.Blacksmith
    },
    {
        id: "church",
        kind: "building",
        name: "성당",
        desc: "성스러운 기술을 연구합니다.",
        icon: "⛪",
        rarity: "rare",
        tags: ["research"],
        requires: [{ type: "has", id: "ebay", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 300 } }],
        tech: buildingDefs.Church
    },
    {
        id: "tavern",
        kind: "building",
        name: "여관",
        desc: "영웅이나 특수 유닛을 고용합니다.",
        icon: "🍺",
        rarity: "rare",
        tags: ["production"],
        requires: [{ type: "has", id: "ebay", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 250 } }],
        tech: buildingDefs.Tavern
    },
    {
        id: "tower_a",
        kind: "building",
        name: "경비탑",
        desc: "화살로 적을 공격하는 방어 시설입니다.",
        icon: "🏹",
        rarity: "common",
        tags: ["defense"],
        requires: [{ type: "has", id: "barracks", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 120 } }],
        tech: buildingDefs.TowerA
    },
    {
        id: "tower_b",
        kind: "building",
        name: "파수탑",
        desc: "더 높은 체력을 가진 방어 탑입니다.",
        icon: "🛡️",
        rarity: "uncommon",
        tags: ["defense"],
        requires: [{ type: "has", id: "tower_a", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 200 } }],
        tech: buildingDefs.TowerB
    },
    {
        id: "tower_catapult",
        kind: "building",
        name: "투석기 탑",
        desc: "강력한 바위를 던져 광역 피해를 줍니다.",
        icon: "☄️",
        rarity: "rare",
        tags: ["defense"],
        requires: [{ type: "has", id: "tower_b", minLv: 1 }],
        cost: [{ lv: 1, cost: { gold: 350 } }],
        tech: buildingDefs.TowerCatapult
    },
    {
        id: "infantry_atk",
        kind: "trait",
        name: "보병 공격력 강화",
        desc: "보병의 공격력을 레벨당 10% 증가시킵니다.",
        icon: "⚔️",
        rarity: "uncommon",
        tags: ["research", "attack"],
        requires: [{ type: "has", id: "ebay", minLv: 1 }],
        cost: [
            { lv: 1, cost: { gold: 100 } },
            { lv: 2, cost: { gold: 200 } },
            { lv: 3, cost: { gold: 300 } }
        ],
        tech: MOCK_TECH
    },
    {
        id: "infantry_def",
        kind: "trait",
        name: "보병 방어력 강화",
        desc: "보병의 방어력을 레벨당 1 증가시킵니다.",
        icon: "🛡️",
        rarity: "uncommon",
        tags: ["research", "defense"],
        requires: [{ type: "has", id: "ebay", minLv: 1 }],
        cost: [
            { lv: 1, cost: { gold: 100 } },
            { lv: 2, cost: { gold: 200 } },
            { lv: 3, cost: { gold: 300 } }
        ],
        tech: MOCK_TECH
    },
    // =================================================================
    // [TEST] 콤보 근접 스킬 (comboMelee)
    // =================================================================
    {
        id: "test_blade_storm",
        kind: "skill",
        name: "블레이드 스톰",
        desc: "5연속 칼날 콤보를 퍼붓습니다. 마지막 타격은 강력한 피니셔입니다.",
        icon: "🌪️",
        rarity: "rare",
        tags: ["melee", "combo"],
requires: [{ type: "has", id: "root_license" }],
        cost: [{ lv: 1, cost: { points: 1 } }],
        tech: actionDefs.BladeStorm,
    },
    {
        id: "test_double_slash",
        kind: "skill",
        name: "더블 슬래시",
        desc: "강력한 2연타로 적을 베어 넘깁니다.",
        icon: "⚔️",
        rarity: "uncommon",
        tags: ["melee", "combo"],
requires: [{ type: "has", id: "root_license" }],
        cost: [{ lv: 1, cost: { points: 1 } }],
        tech: actionDefs.DoubleSlash,
    },
    {
        id: "fireball",
        kind: "skill",
        name: "Fireball",
        desc: "화염구를 발사합니다.",
        icon: "🔥",
requires: [{ type: "has", id: "root_license" }],
        cost: [1, 2, 3, 4, 5].map(lv => ({ lv, cost: { points: lv } })),
        tech: actionDefs.FireBall,
    },
    {
        id: "testMeteor",
        kind: "skill",
        name: "Meteor",
        desc: "화염구를 발사합니다.",
        icon: "🔥",
requires: [{ type: "has", id: "root_license" }],
        cost: [1, 2, 3, 4, 5].map(lv => ({ lv, cost: { points: lv } })),
        tech: actionDefs.Meteor,
    },
    {
        id: "fireDefence",
        kind: "trait",
        name: "Fire Defence",
        desc: "화염이 시전자를 보호합니다.",
        icon: "🛡️",
        cost: [
            { lv: 1, cost: { points: 10 } },
        ],
        requires: [
            { type: "has", id: "fireball", minLv: 2 }
        ],
        tech: actionDefs.FireDefence
    },
    {
        id: "KnifeThrow",
        kind: "skill",
        name: "Knife Throw",
        desc: "암흑 저항이 증가합니다",
        icon: "🗡️",
        cost: [
            { lv: 1, cost: { points: 1 } },
        ],
        requires: [{ type: "playerLv", atLeast: 1 }],
        tech: actionDefs.KnifeThrow
    },
    {
        id: "hpboost",
        kind: "buff",
        name: "HP Boost",
        desc: "boost hp",
        icon: "❤️",
        cost: [
            { lv: 1, cost: { points: 1 } },
        ],
        requires: [{ type: "playerLv", atLeast: 2 }],
        tech: buffDefs.HpBoost
    },
    // =================================================================
    // [ROOT] 시작점
    // =================================================================
    {
        id: "root_license",
        kind: "trait",
        name: "모험가 자격증",
        desc: "거대한 테크트리의 시작점입니다.",
        icon: "📜",
        rarity: "common",
        tags: ["base"],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // =================================================================
    // 1. [공용 스탯 - 공격] (이전 VS 트리 통합)
    // =================================================================
    {
        id: "stat_might",
        kind: "trait",
        name: "근력 (Might)",
        desc: "모든 피해량이 증가합니다. (기본 공격 스탯)",
        icon: "💪",
        rarity: "common",
        tags: ["stat", "attack"],
        requires: [{ type: "has", id: "root_license" }],
        cost: COST_0,
        tech: actionDefs.AttackStatBoost
    },
    {
        id: "stat_proj_speed",
        kind: "trait",
        name: "투사체 속도",
        desc: "투사체가 더 빠르게 날아갑니다.",
        icon: "🏹",
        rarity: "common",
        tags: ["stat", "attack"],
        requires: [{ type: "has", id: "stat_might", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.ProjectileSpeedStatBoost
    },
    {
        id: "stat_area",
        kind: "trait",
        name: "범위 (Area)",
        desc: "공격 범위가 증가합니다. (광역 마법 선행)",
        icon: "🌐",
        rarity: "uncommon",
        tags: ["stat", "aoe"],
        requires: [{ type: "has", id: "stat_proj_speed", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.AreaStatBoost
    },
    {
        id: "stat_cooldown",
        kind: "trait",
        name: "재사용 대기시간 (Cooldown)",
        desc: "스킬을 더 자주 사용합니다. (마법 계열 필수)",
        icon: "⏳",
        rarity: "uncommon",
        tags: ["stat", "magic"],
        requires: [{ type: "has", id: "stat_area", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.CooldownStatBoost
    },
    {
        id: "stat_crit_rate",
        kind: "trait",
        name: "치명타 확률",
        desc: "치명타가 발생할 확률이 증가합니다.",
        icon: "🎯",
        rarity: "rare",
        tags: ["stat", "crit"],
        requires: [{ type: "has", id: "stat_speed", minLv: 3 }],
        cost: COST_0,
        tech: actionDefs.CritRateStatBoost
    },

    // =================================================================
    // 2. [공용 스탯 - 생존] (이전 VS 트리 통합)
    // =================================================================
    {
        id: "stat_maxhp",
        kind: "trait",
        name: "최대 체력 (Max HP)",
        desc: "생존을 위한 기본 체력입니다.",
        icon: "➕",
        rarity: "common",
        tags: ["stat", "defense"],
        requires: [{ type: "has", id: "root_license" }],
        cost: COST_0,
        tech: actionDefs.MaxHpStatBoost
    },
    {
        id: "stat_recovery",
        kind: "trait",
        name: "회복력 (Recovery)",
        desc: "체력이 서서히 회복됩니다.",
        icon: "🧪",
        rarity: "common",
        tags: ["stat", "defense"],
        requires: [{ type: "has", id: "stat_maxhp", minLv: 2 }],
        cost: COST_0,
        tech: actionDefs.RecoveryStatBoost
    },
    {
        id: "stat_armor",
        kind: "trait",
        name: "방어력 (Armor)",
        desc: "받는 피해를 줄여줍니다. (전사/성기사 선행)",
        icon: "🛡️",
        rarity: "uncommon",
        tags: ["stat", "defense"],
        requires: [{ type: "has", id: "stat_maxhp", minLv: 3 }],
        cost: COST_0,
        tech: actionDefs.ArmorStatBoost
    },

    // =================================================================
    // 3. [공용 스탯 - 유틸리티/경제]
    // =================================================================
    {
        id: "stat_speed",
        kind: "trait",
        name: "이동 속도",
        desc: "캐릭터의 이동 속도가 증가합니다. (도적 선행)",
        icon: "👟",
        rarity: "common",
        tags: ["stat", "utility"],
        requires: [{ type: "has", id: "stat_might", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.SpeedStatBoost
    },
    {
        id: "stat_greed",
        kind: "trait",
        name: "탐욕 (Greed)",
        desc: "골드 획득량이 증가합니다.",
        icon: "💰",
        rarity: "common",
        tags: ["stat", "economy"],
        requires: [{ type: "has", id: "stat_recovery", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.GreedStatBoost
    },
    {
        id: "stat_luck",
        kind: "trait",
        name: "행운 (Luck)",
        desc: "좋은 일이 일어날 확률이 증가합니다.",
        icon: "🍀",
        rarity: "uncommon",
        tags: ["stat", "utility"],
        requires: [{ type: "has", id: "stat_greed", minLv: 2 }],
        cost: COST_0,
        tech: actionDefs.LuckStatBoost
    },
    {
        id: "stat_magnet",
        kind: "trait",
        name: "자석 (Magnet)",
        desc: "아이템 획득 범위가 증가합니다.",
        icon: "🧲",
        rarity: "uncommon",
        tags: ["stat", "utility"],
        requires: [{ type: "has", id: "stat_speed", minLv: 2 }],
        cost: COST_0,
        tech: actionDefs.MagnetStatBoost
    },

    // =================================================================
    // 4. [RPG 클래스 - 전사/성기사] (Armor, Might 기반)
    // =================================================================
    {
        id: "class_warrior",
        kind: "trait",
        name: "[전사] 숙련",
        desc: "근접 공격력이 강화됩니다.",
        icon: "⚔️",
        rarity: "rare",
        tags: ["class", "melee"],
        requires: [{ type: "has", id: "stat_armor", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_whirlwind",
        kind: "skill",
        name: "휠윈드",
        desc: "주변 적들을 회전하며 공격합니다.",
        icon: "🌪️",
        rarity: "rare",
        tags: ["melee", "aoe"],
        requires: [{ type: "has", id: "class_warrior", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "class_paladin",
        kind: "trait",
        name: "[성기사] 서약",
        desc: "방어력과 신성력이 강화됩니다.",
        icon: "⛪",
        rarity: "rare",
        tags: ["class", "holy"],
        requires: [{ type: "has", id: "stat_armor", minLv: 3 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_hammer",
        kind: "skill",
        name: "축복받은 망치",
        desc: "캐릭터 주변을 도는 망치를 소환합니다.",
        icon: "🔨",
        rarity: "uncommon",
        tags: ["holy", "projectile"],
        requires: [{ type: "has", id: "class_paladin", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "trait_thorns",
        kind: "trait",
        name: "가시 오라 (Thorns)",
        desc: "피격 시 적에게 피해를 돌려줍니다.",
        icon: "🌵",
        rarity: "epic",
        tags: ["defense", "holy"],
        requires: [{ type: "has", id: "skill_hammer", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // =================================================================
    // 5. [RPG 클래스 - 도적/암살자] (Speed, Crit 기반)
    // =================================================================
    {
        id: "class_rogue",
        kind: "trait",
        name: "[도적] 그림자",
        desc: "이동속도와 치명타 피해가 증가합니다.",
        icon: "👤",
        rarity: "rare",
        tags: ["class", "rogue"],
        requires: [{ type: "has", id: "stat_crit_rate", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_knife",
        kind: "skill",
        name: "단검 투척",
        desc: "전방으로 빠르게 단검을 던집니다.",
        icon: "🗡️",
        rarity: "common",
        tags: ["rogue", "projectile"],
        requires: [{ type: "has", id: "class_rogue", minLv: 1 }],
        cost: COST_1,
        tech: actionDefs.KnifeThrow
    },
    {
        id: "skill_fan_of_knives",
        kind: "skill",
        name: "칼날 부채",
        desc: "주변으로 수많은 칼날을 뿌립니다.",
        icon: "🪭",
        rarity: "rare",
        tags: ["rogue", "aoe"],
        requires: [{ type: "has", id: "skill_knife", minLv: 1 }],
        cost: COST_1,
        tech: actionDefs.FanOfKnives
    },

    // =================================================================
    // 6. [원소 마법 - 화염/냉기/번개/대지] (Cooldown, Area 기반)
    // =================================================================
    
    // --- 화염 (Fire) ---
    {
        id: "elem_fire",
        kind: "trait",
        name: "[화염] 마스터리",
        desc: "화염 데미지가 증가합니다.",
        icon: "🔥",
        rarity: "uncommon",
        tags: ["element", "fire"],
        requires: [{ type: "has", id: "stat_area", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_fireball",
        kind: "skill",
        name: "화염구",
        desc: "폭발하는 불덩이를 발사합니다.",
        icon: "☄️",
        rarity: "common",
        tags: ["fire", "projectile"],
        requires: [{ type: "has", id: "elem_fire", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.FireBall
    },
    {
        id: "skill_meteor",
        kind: "skill",
        name: "메테오",
        desc: "하늘에서 운석을 떨어뜨립니다.",
        icon: "🌠",
        rarity: "epic",
        tags: ["fire", "aoe"],
        requires: [{ type: "has", id: "skill_fireball", minLv: 1 }],
        cost: COST_0,
        tech: actionDefs.Meteor
    },

    // --- 냉기 (Ice) ---
    {
        id: "elem_ice",
        kind: "trait",
        name: "[냉기] 마스터리",
        desc: "적을 느리게 만드는 능력이 강화됩니다.",
        icon: "❄️",
        rarity: "uncommon",
        tags: ["element", "ice"],
        requires: [{ type: "has", id: "stat_cooldown", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_frost_nova",
        kind: "skill",
        name: "프로스트 노바",
        desc: "주변 적을 얼립니다.",
        icon: "🧊",
        rarity: "uncommon",
        tags: ["ice", "aoe"],
        requires: [{ type: "has", id: "elem_ice", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_blizzard",
        kind: "skill",
        name: "눈보라",
        desc: "지속적인 광역 냉기 피해를 줍니다.",
        icon: "🌨️",
        rarity: "epic",
        tags: ["ice", "aoe"],
        requires: [{ type: "has", id: "skill_frost_nova", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // --- 번개 (Lightning) ---
    {
        id: "elem_lightning",
        kind: "trait",
        name: "[번개] 마스터리",
        desc: "번개 피해와 시전 속도가 증가합니다.",
        icon: "⚡",
        rarity: "uncommon",
        tags: ["element", "lightning"],
        requires: [{ type: "has", id: "stat_cooldown", minLv: 2 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_lightning_bolt",
        kind: "skill",
        name: "번개 화살",
        desc: "가장 가까운 적에게 벼락을 내립니다.",
        icon: "☇",
        rarity: "common",
        tags: ["lightning", "single"],
        requires: [{ type: "has", id: "elem_lightning", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_chain_lightning",
        kind: "skill",
        name: "체인 라이트닝",
        desc: "적들을 타고 흐르는 전격을 발사합니다.",
        icon: "⛓️",
        rarity: "rare",
        tags: ["lightning", "multi"],
        requires: [{ type: "has", id: "skill_lightning_bolt", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // --- 대지/독 (Earth/Poison) ---
    {
        id: "elem_earth",
        kind: "trait",
        name: "[대지] 마스터리",
        desc: "지속 피해와 체력이 증가합니다.",
        icon: "🌍",
        rarity: "uncommon",
        tags: ["element", "earth"],
        requires: [{ type: "has", id: "class_paladin", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_garlic",
        kind: "skill",
        name: "마늘 (Garlic)",
        desc: "주변 적에게 지속 피해를 입히고 저항력을 낮춥니다.",
        icon: "🧄",
        rarity: "common",
        tags: ["earth", "aoe"],
        requires: [{ type: "has", id: "elem_earth", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_earthquake",
        kind: "skill",
        name: "지진",
        desc: "화면 전체를 흔들어 적을 밀어냅니다.",
        icon: "🌋",
        rarity: "epic",
        tags: ["earth", "aoe"],
        requires: [{ type: "has", id: "skill_garlic", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // =================================================================
    // 7. [특수 직업 - 네크로맨서/비전] (상위 조건)
    // =================================================================
    {
        id: "class_necro",
        kind: "trait",
        name: "[강령술사] 금기",
        desc: "소환수 공격력과 생명력 흡수가 증가합니다.",
        icon: "💀",
        rarity: "epic",
        tags: ["class", "dark"],
        requires: [{ type: "has", id: "elem_earth", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_skeleton",
        kind: "skill",
        name: "해골 소환",
        desc: "아군으로 싸우는 해골을 소환합니다.",
        icon: "🧟",
        rarity: "uncommon",
        tags: ["dark", "summon"],
        requires: [{ type: "has", id: "class_necro", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "class_arcane",
        kind: "trait",
        name: "[비전] 대마법사",
        desc: "모든 마법의 효율이 극대화됩니다.",
        icon: "🔮",
        rarity: "legendary",
        tags: ["class", "arcane"],
        requires: [{ type: "has", id: "elem_ice", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "skill_magic_missile",
        kind: "skill",
        name: "매직 미사일",
        desc: "가장 가까운 적을 추적하는 마법탄",
        icon: "✨",
        rarity: "common",
        tags: ["arcane", "projectile"],
        requires: [{ type: "has", id: "class_arcane", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // =================================================================
    // 8. [시스템/메타] (Reroll, Skip, Banish)
    // =================================================================
    {
        id: "meta_reroll",
        kind: "trait",
        name: "운명 조작 (Reroll)",
        desc: "레벨업 선택지를 변경할 수 있습니다.",
        icon: "🎲",
        rarity: "rare",
        tags: ["meta"],
        requires: [{ type: "has", id: "stat_luck", minLv: 2 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "meta_skip",
        kind: "trait",
        name: "회피 (Skip)",
        desc: "선택지를 건너뛰고 경험치를 얻습니다.",
        icon: "🏃",
        rarity: "rare",
        tags: ["meta"],
        requires: [{ type: "has", id: "meta_reroll", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "meta_banish",
        kind: "trait",
        name: "봉인 (Banish)",
        desc: "원하지 않는 아이템을 영구히 제외합니다.",
        icon: "🚫",
        rarity: "epic",
        tags: ["meta"],
        requires: [{ type: "has", id: "meta_reroll", minLv: 2 }],
        cost: COST_0,
        tech: MOCK_TECH
    },

    // =================================================================
    // 9. [궁극/저주] (End Game)
    // =================================================================
    {
        id: "ultimate_amount",
        kind: "trait",
        name: "복제 (Duplicator)",
        desc: "모든 무기의 투사체가 증가합니다. (최강 패시브)",
        icon: "👯",
        rarity: "legendary",
        tags: ["ultimate"],
        requires: [{ type: "has", id: "stat_proj_speed", minLv: 3 }],
        cost: COST_0, // 3단계까지
        tech: MOCK_TECH
    },
    {
        id: "ultimate_revival",
        kind: "trait",
        name: "불사조 (Revival)",
        desc: "사망 시 부활합니다.",
        icon: "🐦",
        rarity: "legendary",
        tags: ["ultimate"],
        requires: [{ type: "has", id: "stat_recovery", minLv: 5 }],
        cost: COST_0,
        tech: MOCK_TECH
    },
    {
        id: "curse_torment",
        kind: "trait",
        name: "고행 (Curse)",
        desc: "레벨이 오를수록 생존력이 감소하지만 보상이 증가합니다.",
        icon: "👿",
        rarity: "epic",
        tags: ["curse"],
        requires: [{ type: "has", id: "stat_greed", minLv: 5 }],
        cost: COST_0,
        tech: buffDefs.CurseTorment
    },
    {
        id: "wpn_pentagram",
        kind: "skill",
        name: "오망성",
        desc: "화면의 모든 적을 삭제합니다.",
        icon: "🔯",
        rarity: "legendary",
        tags: ["weapon", "curse"],
        requires: [{ type: "has", id: "curse_torment", minLv: 1 }],
        cost: COST_0,
        tech: MOCK_TECH
    }
]

