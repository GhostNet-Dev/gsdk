import { MonsterId } from "@Glibs/types/monstertypes"
import { DeckId, DeckType } from "../inventypes"

/*
추가 Effect
- card의 spec을 상향시킨다.
- random하게 추가 카드를 사용할 수 있다. 
- 일꾼으로 활용가능하다.
- Player에게 debuff를 한다. 
*/
export class Deck {
    static DeckDb = new Map<DeckId, DeckType>()
    static Zombie: DeckType = {
        id: DeckId.Zombie,
        title: "전염된 좀비들",
        contents:` 이 카드는 최대 30마리의 좀비를 소환할 수 있습니다.`,
        maxLv: 5,
        minTime: 0,
        maxTime: 10,
        maxSpawn: 30,
        uniq: false,
        monId: MonsterId.Zombie,
    }
    static Minotaur: DeckType = {
        id: DeckId.Minotaur,
        title: "미노타우르스의 자식들",
        contents:`이 카드는 최대 10마리의 미노타우르스의 자식을 소환할 수 있습니다.`,
        maxLv: 5,
        minTime: 0,
        maxTime: 15,
        maxSpawn: 5,
        uniq: false,
        monId: MonsterId.Minotaur,
    }
    static BatPig: DeckType = {
        id: DeckId.Batpig,
        title: "이상한 박쥐",
        contents:`높은 곳도 추적할 수 있습니다.
        이 카드는 최대 30마리를 소환할 수 있습니다.`,
        maxLv: 5,
        minTime: 0,
        maxTime: 15,
        maxSpawn: 30,
        uniq: false,
        monId: MonsterId.Batpig,
    }
    
    static BirdMon: DeckType = {
        id: DeckId.Birdmon,
        title: "탈출한 타조",
        contents:`탈출에 5분의 시간이 필요합니다. 5분 이후 사용가능합니다.
        이 카드는 최대 3마리를 소환할 수 있습니다.`,
        maxLv: 5,
        minTime: 5,
        maxTime: 15,
        maxSpawn: 3,
        uniq: false,
        monId: MonsterId.Birdmon,
    }
    static Crap: DeckType = {
        id: DeckId.Crab,
        title: "영혼의 게",
        contents:`맛있는 요리에 필요한 재료를 얻을 수 있습니다.
        이 카드는 최대 10마리를 소환할 수 있습니다.`,
        maxLv: 5,
        minTime: 5,
        maxTime: 15,
        maxSpawn: 10,
        uniq: false,
        monId: MonsterId.Crab,
    }
    static Builder: DeckType = {
        id: DeckId.Builder,
        title: "노동자",
        contents:`
        이 카드는 한번만 사용할 수 있습니다.`,
        maxLv: 5,
        minTime: 5,
        maxTime: 15,
        maxSpawn: 1,
        uniq: true,
        monId: MonsterId.Builder,
    }
    static Golem: DeckType = {
        id: DeckId.Golem,
        title: "골렘",
        contents:`뛰어난 방어력으로 주변 데미지를 흡수합니다.
        `,
        maxLv: 5,
        minTime: 5,
        maxTime: 15,
        maxSpawn: 20,
        uniq: false,
        monId: MonsterId.Golem,
    }
    static BigGolem: DeckType = {
        id: DeckId.BigGolem,
        title: "골렘의왕",
        contents:`소환된 모든 카드에 뛰어난 방어력을 선사합니다.
        `,
        maxLv: 5,
        minTime: 10,
        maxTime: 15,
        maxSpawn: 1,
        uniq: true,
        monId: MonsterId.BigGolem,
    }
    static KittenMonk: DeckType = {
        id: DeckId.KittenMonk,
        title: "고양이전사",
        contents:`너무 귀여워 이동속도를 느리게 만듭니다.
        `,
        maxLv: 10,
        minTime: 5,
        maxTime: 15,
        maxSpawn: 1,
        uniq: true,
        monId: MonsterId.KittenMonk,
    }
    static Skeleton: DeckType = {
        id: DeckId.Skeleton,
        title: "말단 해골전사",
        contents:`죽지 않고 끊임없이 부활합니다.
        `,
        maxLv: 5,
        minTime: 0,
        maxTime: 15,
        maxSpawn: 30,
        uniq: false,
        monId: MonsterId.Skeleton,
    }
    static Snake: DeckType = {
        id: DeckId.Snake,
        title: "뱀의 왕",
        contents:`플레이어의 체력을 지속적으로 감소 시킵니다.
        `,
        maxLv: 5,
        minTime: 10,
        maxTime: 15,
        maxSpawn: 1,
        uniq: true,
        monId: MonsterId.Snake,
    }
    static ToadMage: DeckType = {
        id: DeckId.ToadMage,
        title: "개구리전사",
        contents:`
        `,
        maxLv: 5,
        minTime: 0,
        maxTime: 15,
        maxSpawn: 15,
        uniq: false,
        monId: MonsterId.ToadMage,
    }
    static Viking: DeckType = {
        id: DeckId.Viking,
        title: "바이킹전사",
        contents:`
        `,
        maxLv: 5,
        minTime: 0,
        maxTime: 15,
        maxSpawn: 15,
        uniq: false,
        monId: MonsterId.Viking,
    }
    static WereWolf: DeckType = {
        id: DeckId.WereWolf,
        title: "늑대인간",
        contents:`빠르고 강력합니다.
        `,
        maxLv: 5,
        minTime: 5,
        maxTime: 15,
        maxSpawn: 3,
        uniq: false,
        monId: MonsterId.WereWolf,
    }
    constructor() {
        Deck.DeckDb.set(Deck.Zombie.id, Deck.Zombie)
        Deck.DeckDb.set(Deck.Minotaur.id, Deck.Minotaur)
        Deck.DeckDb.set(Deck.BatPig.id, Deck.BatPig)
        Deck.DeckDb.set(Deck.BirdMon.id, Deck.BirdMon)
        Deck.DeckDb.set(Deck.Crap.id, Deck.Crap)
        Deck.DeckDb.set(Deck.Builder.id, Deck.Builder)
        Deck.DeckDb.set(Deck.Golem.id, Deck.Golem)
        Deck.DeckDb.set(Deck.BigGolem.id, Deck.BigGolem)
        Deck.DeckDb.set(Deck.KittenMonk.id, Deck.KittenMonk)
        Deck.DeckDb.set(Deck.Skeleton.id, Deck.Skeleton)
        Deck.DeckDb.set(Deck.Snake.id, Deck.Snake)
        Deck.DeckDb.set(Deck.ToadMage.id, Deck.ToadMage)
        Deck.DeckDb.set(Deck.Viking.id, Deck.Viking)
        Deck.DeckDb.set(Deck.WereWolf.id, Deck.WereWolf)
    }
}
/*
좀비군의 리더 - 어둠의 대가

카드 이름: 좀비군의 리더 - 어둠의 대가
카드 종류: 몬스터
속성: 어둠
레벨: 7
공격력: 2500
수비력: 2000

이 카드는 묘지에서만 소환할 수 있습니다. 
어둠의 대가는 좀비들의 지배자로, 어둠의 힘을 이용해 무덤 속에서 새로운 생명을 부여합니다. 
그의 출현은 모든 좀비들에게 희망을 주고, 적에게는 공포를 안겨 죽음을 예고합니다.

이 카드가 전투에 참여할 때, 상대 필드의 몬스터 1장을 파괴할 수 있습니다. 
이는 어둠의 대가가 좀비들을 이끌고 전쟁터로 나서 상대를 무찌르는 모습을 상징합니다. 
또한, 이 카드가 전투로 파괴될 경우, 묘지로부터 좀비 속성 몬스터 1장을 선택하여 소환할 수 있습니다. 
이는 어둠의 대가가 묘지에서 새로운 생명을 불어넣어 좀비들을 부활시키는 능력을 나타냅니다.
*/
