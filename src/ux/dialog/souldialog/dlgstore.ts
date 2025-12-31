// ============================================================================
// dlgstore.ts — UI 상태 저장소 (Game Logic -> UI Data Proxy)
// ============================================================================

import { IItem } from "@Glibs/interface/iinven";
import { InventorySlot } from "@Glibs/types/inventypes";
// [변경] 퀘스트 시스템의 타입들을 임포트 (경로는 프로젝트 구조에 맞춰 조정)
import type { Quest as QuestDef, ActiveQuest, QuestStatus } from "@Glibs/systems/quests/questdef";

// [변경] UI에서 사용할 통합 퀘스트 타입 정의
// 정적인 'QuestDef'(제목, 설명, 목표 등)와 동적인 '상태'(진행도, 완료여부)를 합칩니다.
export interface UIQuest extends QuestDef {
    id: string;                      // 퀘스트 ID
    status: QuestStatus;             // 현재 상태 (ACTIVE, COMPLETED 등)
    progress: Record<string, number>; // 목표별 진행도 { "kill_slime": 3 }
}

// 장비 슬롯 타입 정의
export type EquipSlots = {
    head?: IItem | null;
    chest?: IItem | null;
    hands?: IItem | null;
    legs?: IItem | null;
    weapon?: IItem | null;
    offhand?: IItem | null;
    ring1?: IItem | null;
    ring2?: IItem | null;
    amulet?: IItem | null;
    [key: string]: IItem | null | undefined;
};

type Subscriber = () => void;

export class DialogStore {
    // [변경] 퀘스트 리스트 (UIQuest 타입 사용)
    quests: UIQuest[] = [];
    trackedQuestId: string | null = null;

    // 인벤토리 데이터 (InventorySlot 구조 사용)
    bag: InventorySlot[] = [];
    
    // 선택된 아이템 인덱스 (UI 인터랙션용)
    selectedIndex = 0;

    // 장비 데이터
    equip: EquipSlots = {};

    // 캐릭터 기본 스탯 (View 표시용 캐시)
    baseStats = { STR: 14, DEX: 12, INT: 9, FAI: 8, VIT: 15 };
    resistBase = { fire: 10, elec: 8, ice: 12 };

    private subs: Subscriber[] = [];

    subscribe(fn: Subscriber) { this.subs.push(fn); return () => this.unsubscribe(fn); }
    unsubscribe(fn: Subscriber) { this.subs = this.subs.filter(s => s !== fn); }
    private emit() { this.subs.forEach(fn => fn()); }

    /* -------------------------------------------------------------------------- */
    /* Setters (Game Logic으로부터 데이터를 받아 동기화)                           */
    /* -------------------------------------------------------------------------- */

    /**
     * [추가] QuestManager의 데이터를 받아 UI용 데이터로 변환하여 저장합니다.
     * @param defs 전체 퀘스트 정의 Map
     * @param active 진행 중인 퀘스트 Map
     * @param completed 완료된 퀘스트 ID Set
     */
    public syncQuests(
        defs: Map<string, QuestDef>, 
        active: Map<string, ActiveQuest>, 
        completed: Set<string>
    ) {
        const uiQuests: UIQuest[] = [];

        // 1. 진행 중인 퀘스트(Active) 추가
        active.forEach((aq, id) => {
            const def = defs.get(id);
            if (def) {
                uiQuests.push({
                    ...def,
                    id: id,
                    status: aq.status,
                    progress: aq.progress
                });
            }
        });

        // 2. 완료된 퀘스트(Completed) 추가
        completed.forEach((id) => {
            const def = defs.get(id);
            if (def) {
                uiQuests.push({
                    ...def,
                    id: id,
                    status: 'COMPLETED',
                    progress: {} // 완료됨 (필요하다면 목표치 Max값으로 채울 수 있음)
                });
            }
        });

        // (선택 사항) 정렬: 진행 중인 것을 먼저, 그 다음 완료된 것
        uiQuests.sort((a, b) => {
            if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
            if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
            return 0;
        });

        this.quests = uiQuests;
        this.emit();
    }

    setTracked(id: string | null) { 
        this.trackedQuestId = id; 
        this.emit(); 
    }

    // 인벤토리 동기화
    setBag(slots: InventorySlot[]) {
        this.bag = slots;
        this.emit();
    }

    // UI 상호작용 상태 (선택된 슬롯 인덱스)
    setSelected(i: number) { 
        this.selectedIndex = i; 
        this.emit(); 
    }

    // 장비 동기화
    setEquip(equipData: EquipSlots) {
        this.equip = equipData;
        this.emit();
    }

    // 스탯 동기화
    setBaseStats(stats: typeof this.baseStats) {
        this.baseStats = stats;
        this.emit();
    }
}