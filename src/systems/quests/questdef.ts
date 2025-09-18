// 1. 목표(Objective)의 구조를 정의합니다.
export interface Objective {
    type: string;
    targetId: string;
    amount?: number; // 'talk' 같이 amount가 없는 경우를 위해 '?'를 붙여 optional로 만듭니다.
}

// 2. 모든 퀘스트가 가져야 할 공통 구조(Shape)를 interface로 정의합니다.
export interface Quest {
    title: string;
    description: string;
    startNpc: string;
    endNpc: string;
    preconditions?: {
        level?: number;
        quests?: string[];
    };
    objectives: Objective[];
    rewards: {
        experience?: number;
        gold?: number;
        items?: { itemId: string; amount: number }[];
    };
}

// 3. QuestId 타입을 일반 string으로 정의하여 외부에서 ID를 자유롭게 추가할 수 있도록 합니다.
export type QuestId = string;

// 4. 플레이어의 퀘스트 상태를 추적하기 위한 타입들을 정의합니다.
export type QuestStatus = 'INACTIVE' | 'ACTIVE' | 'COMPLETABLE' | 'COMPLETED';

export interface ActiveQuest {
    questId: QuestId;
    status: QuestStatus;
    progress: { [objectiveKey: string]: number };
}


// 5. 기본 퀘스트 데이터 (초기 퀘스트 목록)
// Record<string, Quest> 타입을 사용해 어떤 문자열 ID든 키로 사용할 수 있음을 명시합니다.
export const questDefs: Record<string, Quest> = {
    "Q001_SLIME_HUNT": {
        "title": "마을 근처의 슬라임",
        "description": "마을 주민들이 슬라임 때문에 골치를 앓고 있습니다. 슬라임 5마리를 처치해주세요.",
        "startNpc": "npc_guard",
        "endNpc": "npc_guard",
        "preconditions": {
            "level": 1
        },
        "objectives": [
            { "type": "kill", "targetId": "slime", "amount": 5 }
        ],
        "rewards": {
            "experience": 100,
            "gold": 50,
            "items": [{ "itemId": "potion_hp", "amount": 3 }]
        }
    },
    "Q002_DELIVER_LETTER": {
        "title": "촌장의 편지",
        "description": "촌장의 편지를 대장장이에게 전달해주세요.",
        "startNpc": "npc_chief",
        "endNpc": "npc_smith",
        "objectives": [
            { "type": "talk", "targetId": "npc_smith", "amount": 1 }
        ],
        "rewards": {
            "experience": 80
        }
    }
};