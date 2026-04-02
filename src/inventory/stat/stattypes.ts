export type StatKey =
  // 전투 기본 스탯
  | 'attackMelee' | 'attackRanged' | 'magicAttack' | 'defense' | 'magicDefense'
  | 'attackRange' 
  | 'speed' | 'attackSpeedMelee' | 'attackSpeedRanged'
  | 'criticalRate' | 'criticalDamage'
  | 'accuracy' | 'evasion' | 'penetration' | 'block'

  // 생명력/자원 관련
  | 'hp' | 'hpRegen' | 'mp' | 'mpRegen'
  | 'stamina' | 'staminaRegen'

  // 보조 스탯
  | 'movementSpeed' | 'castingSpeed'
  | 'projectileSpeed' | 'turnSpeed'
  | 'goldBonus' | 'expBonus' | 'itemDropRate'
  | 'threatLevel' | 'stealth'

  // 기본 속성 스탯
  | 'strength' | 'dexterity' | 'constitution'
  | 'intelligence' | 'wisdom' | 'agility' | 'luck'
  | 'vitality' | 'faith'

  // 경험치 보너스 
  | 'expBonus'

  // 상태이상 저항
  | 'fireResistance' | 'iceResistance' | 'poisonResistance'
  | 'stunResistance' | 'slowResistance' | 'electricResistance'
  | 'debuffResistance' | 'knockbackResistance'

  // 부가 효과
  | 'lifeSteal' | 'reflectDamage' | 'cooldownReduction'
  | 'buffOnHit' | 'debuffOnHit' | 'procEffect' | 'thorns'

  // 확장 스탯 (숫자형만 포함)
  | 'enchantments' | 'sockets' | 'setBonus';

export const StatDescriptions: Record<StatKey, string> = {
  // ⚔️ 전투 스탯
  attackMelee: '근접 공격력: 적에게 주는 물리 근접 피해량',
  attackRanged: '원거리 공격력: 적에게 주는 물리 원거리 피해량',
  magicAttack: '마법 공격력: 마법 피해량 증가',
  defense: '방어력: 물리 피해 감소',
  magicDefense: '마법 방어력: 마법 피해 감소',
  attackRange: '공격 사거리: 타격 가능한 거리',
  speed: '속도: 이동 및 공격 판정 속도',
  attackSpeedMelee: '근접 공격 속도',
  attackSpeedRanged: '원거리 공격 속도',
  criticalRate: '치명타 확률: 공격 시 치명타 발생 확률',
  criticalDamage: '치명타 피해 배율',
  accuracy: '명중률: 공격 적중 가능성',
  evasion: '회피율: 피해 회피 확률',
  penetration: '방어 관통력',
  block: '피해 차단 확률',

  // 💓 생명/자원
  hp: '최대 체력',
  hpRegen: '초당 체력 회복량',
  mp: '최대 마나',
  mpRegen: '초당 마나 회복량',
  stamina: '스태미나: 행동/회피 소모 자원',
  staminaRegen: '스태미나 회복 속도',

  // 🧠 보조 스탯
  movementSpeed: '이동 속도',
  castingSpeed: '시전 속도',
  projectileSpeed: '투사체 속도 배율',
  turnSpeed: '선회 속도: 초당 회전 가능한 라디안',
  goldBonus: '골드 획득량 증가율',
  expBonus: '경험치 획득량 증가율',
  itemDropRate: '아이템 드랍 확률 증가',
  threatLevel: '적개심 수치',
  stealth: '은신 수치',

  // 🧬 기본 속성 스탯
  strength: '힘: 근접 공격력 및 장비 요구치',
  dexterity: '민첩성: 회피, 원거리 정확도',
  constitution: '체질: 체력 증가 및 회복',
  intelligence: '지능: 마법 피해량 증가',
  wisdom: '지혜: 마나 재생, 마법 저항',
  agility: '기민함: 공격 속도, 회피',
  luck: '운: 치명타 및 드랍율 향상',
  faith: '신성한 힘',
  vitality: '육체적인 맷집과 생존 능력',

  // 🛡️ 저항 스탯
  fireResistance: '화염 저항',
  iceResistance: '냉기 저항',
  poisonResistance: '독 저항',
  stunResistance: '기절 저항',
  slowResistance: '감속 저항',
  debuffResistance: '디버프 저항',
  knockbackResistance: '넉백 저항',
  electricResistance: '전기 저항',

  // ✨ 부가 효과
  lifeSteal: '생명력 흡수',
  reflectDamage: '피해 반사',
  cooldownReduction: '스킬 쿨타임 감소',
  buffOnHit: '타격 시 버프 발생',
  debuffOnHit: '타격 시 디버프 적용',
  procEffect: '특수 효과 발동 확률',
  thorns: '공격자에게 반사 피해',

  // 🔧 확장 스탯
  enchantments: '강화 수치',
  sockets: '소켓 수',
  setBonus: '세트 효과',
};

/*
| 분류      | `'add'` (정수/수치 누적) | `'mul'` (퍼센트/비율 효과)            |
| ------- | ------------------ | ------------------------------ |
| 전투 스탯   | 대부분                | `criticalRate`, `attackSpeed`  |
| 자원/회복   | 대부분 `add`          | 회복률은 `add` 기준                  |
| 속도/보조효과 | 대부분 `mul`          | `goldBonus`, `movementSpeed` 등 |
| 상태이상 저항 | `add`              | 일반적으로 수치 누적                    |
| 부가 효과   | `mul`              | 확률, 배율 기반 효과                   |
| 확장      | `add`              | 강화 수치/슬롯 등                     |

*/
export type ModifierType = 'add' | 'mul' | 'max';

export const StatApplyMode: Record<StatKey, ModifierType> = {
  // ⚔️ 전투 기본 스탯
  attackMelee: 'add',
  attackRanged: 'add',
  magicAttack: 'add',
  defense: 'add',
  magicDefense: 'add',
  attackRange: 'add',
  speed: 'mul',               // 퍼센트 증가가 일반적
  attackSpeedMelee: 'mul',
  attackSpeedRanged: 'mul',
  criticalRate: 'mul',
  criticalDamage: 'mul',
  accuracy: 'add',
  evasion: 'add',
  penetration: 'add',
  block: 'add',

  // 💓 생명력/자원
  hp: 'add',
  hpRegen: 'add',
  mp: 'add',
  mpRegen: 'add',
  stamina: 'add',
  staminaRegen: 'add',

  // 🎲 보조 스탯
  movementSpeed: 'mul',
  castingSpeed: 'mul',
  projectileSpeed: 'add',
  turnSpeed: 'mul',
  goldBonus: 'mul',
  expBonus: 'mul',
  itemDropRate: 'mul',
  threatLevel: 'add',
  stealth: 'add',

  // 🧬 기본 속성
  strength: 'add',
  dexterity: 'add',
  constitution: 'add',
  intelligence: 'add',
  wisdom: 'add',
  agility: 'add',
  luck: 'add',
  vitality: 'add',
  faith: 'add',

  // 🛡️ 저항 스탯
  fireResistance: 'add',
  iceResistance: 'add',
  poisonResistance: 'add',
  stunResistance: 'add',
  slowResistance: 'add',
  debuffResistance: 'add',
  knockbackResistance: 'add',
  electricResistance: 'add',

  // ✨ 부가 효과
  lifeSteal: 'mul',            // 비율이 일반적
  reflectDamage: 'mul',
  cooldownReduction: 'mul',
  buffOnHit: 'mul',            // 확률형
  debuffOnHit: 'mul',
  procEffect: 'mul',
  thorns: 'mul',

  // 🧩 확장 스탯
  enchantments: 'add',
  sockets: 'add',
  setBonus: 'add',
};
