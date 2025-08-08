import { StatKey } from "@Glibs/types/stattypes"

export const StatNamesKr: { [key: string]: string } = {
  speed: "속도",
  attackRange: "공격 범위",
  attack: "공격력",
  magicAttack: "마법 공격력",
  attackSpeed: "공격 속도",
};

export type CharacterStatus = {
/*
| 스탯              | 설명             |
| --------------- | -------------- |
| `HP (Health)`   | 생명력 (0이 되면 사망) |
| `HP Regen`      | 초당 생명력 회복량     |
| `MP (Mana)`     | 마법 사용 자원       |
| `MP Regen`      | 초당 마나 회복량      |
| `Stamina`       | 행동력, 대시/회피에 소비 |
| `Stamina Regen` | 초당 스태미나 회복량    |
*/
    level: number
    health: number
    mana: number
    stamina: number
    maxExp: number
    exp: number
    immortal: boolean
/*
기타 특수 스탯 
| 스탯                   | 설명               |
| -------------------- | ---------------- |
| `Movement Speed`     | 이동 속도            |
| `Casting Speed`      | 스킬 시전 속도         |
| `Cooldown Reduction` | 스킬 쿨타임 감소율       |
| `Gold Bonus`         | 골드 획득량 증가        |
| `EXP Bonus`          | 경험치 획득량 증가       |
| `Item Drop Rate`     | 드랍률 증가           |
| `Threat Level`       | 몬스터가 유발하는 적개심 수치 |
| `Stealth`            | 은신 효과            |
기본 능력치 
| 스탯                  | 설명                      |
| ------------------- | ----------------------- |
| `Strength (힘)`      | 물리 공격력, 장비 무게, 근접 피해 증가 |
| `Dexterity (민첩)`    | 명중률, 회피율, 속도, 원거리 피해    |
| `Constitution (체력)` | 최대 HP, 회복력              |
| `Intelligence (지능)` | 마법 공격력, 마법 방어력          |
| `Wisdom (지혜)`       | 마법 회복, 마나 재생 속도         |
| `Agility (민첩/기민함)`  | 이동속도, 회피, 공격 속도         |
| `Luck (운)`          | 치명타 확률, 아이템 드랍률         |
전투 관련 능력치 
| 스탯                | 설명               |
| ----------------- | ---------------- |
| `Attack`          | 기본 공격력           |
| `Magic Attack`    | 마법 공격력           |
| `Defense`         | 물리 방어력           |
| `Magic Defense`   | 마법 방어력           |
| `Critical Rate`   | 치명타 확률 (%)       |
| `Critical Damage` | 치명타 배율 (기본 150%) |
| `Accuracy`        | 명중률              |
| `Evasion`         | 회피율              |
| `Attack Speed`    | 공격 속도 (초당 공격 횟수) |
| `Penetration`     | 방어 무시 수치         |
| `Block`           | 피해 무효화 확률        |
| `Reflect Damage`  | 받은 피해의 일부를 반사    |
상태이상/저항 스탯
| 스탯                     | 설명         |
| ---------------------- | ---------- |
| `Fire Resistance`      | 화염 피해 저항   |
| `Ice Resistance`       | 냉기 피해 저항   |
| `Poison Resistance`    | 중독 저항      |
| `Stun Resistance`      | 기절 저항      |
| `Slow Resistance`      | 둔화 저항      |
| `Debuff Resistance`    | 전체 디버프 저항률 |
| `Knockback Resistance` | 넉백 저항      |
*/
    stats: Partial<Record<StatKey, number>>
}