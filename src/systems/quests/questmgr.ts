import IEventController from "@Glibs/interface/ievent";
import { 
    questDefs, 
    Quest, 
    QuestId, 
    ActiveQuest, 
    QuestStatus 
} from "./questdef";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ItemId } from "@Glibs/inventory/items/itemdefs";
import { AttackOption, AttackType } from "@Glibs/types/playertypes";
import { MonsterId } from "@Glibs/types/monstertypes";

export class QuestManager {
    // 모든 퀘스트 '정의'를 저장 (Key: QuestId, Value: Quest)
    private questDefinitions: Map<QuestId, Quest>;

    // 플레이어가 '진행 중'인 퀘스트의 '상태'만 저장
    private activeQuests: Map<QuestId, ActiveQuest>;
    
    // 플레이어가 '완료'한 퀘스트 ID를 저장
    private completedQuests: Set<QuestId>;

    constructor(private eventCtrl: IEventController, newQuestDef?: Record<string, Quest>) {
        // 기본 퀘스트 데이터로 초기화
        this.questDefinitions = new Map(Object.entries(questDefs));
        this.activeQuests = new Map();
        this.completedQuests = new Set();
        if(newQuestDef) {
            this.addQuestDefinitions(newQuestDef);
        }

        // 게임 이벤트 구독 (예시: 실제 이벤트 이름으로 변경 필요)
        this.eventCtrl.RegisterEventListener(EventTypes.Pickup, (itemId: ItemId) => {
            this.handleGameEvent({ type: 'pickup', targetId: itemId });
        });
        this.eventCtrl.RegisterEventListener(EventTypes.Death, (id: string) => {
            this.handleGameEvent({ type: 'kill', targetId: id });
        });
        this.eventCtrl.RegisterEventListener(EventTypes.ActiveInteraction, (id: string) => {
            this.handleGameEvent({ type: 'interactive', targetId: id });
        });
        this.eventCtrl.RegisterEventListener(EventTypes.QuestComplete, (id: QuestId) => {
            this.completeQuest(id)
        })
    }

    /**
     * 게임 이벤트를 받아 퀘스트 진행도를 업데이트합니다.
     */
    public handleGameEvent(eventData: { type: string, targetId: string }) {
        for (const [questId, activeQuest] of this.activeQuests.entries()) {
            if (activeQuest.status !== 'ACTIVE') continue;

            const questDef = this.questDefinitions.get(questId);
            if (!questDef) continue;
            
            for (const objective of questDef.objectives) {
                if (objective.type === eventData.type && objective.targetId === eventData.targetId) {
                    const objectiveKey = `${objective.type}_${objective.targetId}`;
                    const requiredAmount = objective.amount ?? 1; // amount가 없으면 1로 간주
                    const currentProgress = activeQuest.progress[objectiveKey] || 0;

                    if (currentProgress < requiredAmount) {
                        activeQuest.progress[objectiveKey] = currentProgress + 1;
                        console.log(`[${questDef.title}] 진행도: ${objectiveKey} (${activeQuest.progress[objectiveKey]}/${requiredAmount})`);
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `[${questDef.title}] 진행도: (${activeQuest.progress[objectiveKey]}/${requiredAmount}`);
                    }
                    
                    this.checkQuestCompletion(questId);
                }
            }
        }
    }
    public getActiveQuests() {
        return this.activeQuests;
    }

    /**
     * 외부에서 새로운 퀘스트 정의를 추가합니다. (예: DLC, 지역 로딩)
     */
    public addQuestDefinitions(newDefs: Record<string, Quest>) {
        for (const questId in newDefs) {
            if (this.questDefinitions.has(questId)) {
                console.warn(`[QuestManager] 퀘스트 ID '${questId}'가 이미 존재하여 덮어씁니다.`);
            }
            this.questDefinitions.set(questId, newDefs[questId]);
        }
    }
    
    /**
     * 특정 퀘스트를 시작합니다.
     */
    public startQuest(questId: QuestId): boolean {
        if (!this.questDefinitions.has(questId)) {
            console.error(`[QuestManager] '${questId}'는 존재하지 않는 퀘스트입니다.`);
            return false;
        }
        if (this.activeQuests.has(questId) || this.completedQuests.has(questId)) {
            console.warn(`[QuestManager] '${questId}'는 이미 시작했거나 완료한 퀘스트입니다.`);
            return false;
        }

        const newActiveQuest: ActiveQuest = {
            questId: questId,
            status: 'ACTIVE',
            progress: {}
        };
        this.activeQuests.set(questId, newActiveQuest);

        const title = this.questDefinitions.get(questId)?.title;
        console.log(`퀘스트 시작: ${title}`);
        this.eventCtrl.SendEventMessage(EventTypes.QuestStateChanged, { questId, status: 'ACTIVE' });
        this.eventCtrl.SendEventMessage(EventTypes.AlarmBig, title)
        return true;
    }

    /**
     * 특정 퀘스트의 현재 상태를 반환합니다.
     */
    public getQuestStatus(questId: QuestId): QuestStatus {
        if (this.completedQuests.has(questId)) {
            return 'COMPLETED';
        }
        const activeQuest = this.activeQuests.get(questId);
        return activeQuest ? activeQuest.status : 'INACTIVE';
    }
    public getQuestInfo(questId: QuestId) {
        const r = this.questDefinitions.get(questId)
        return r
    }

    /**
     * 퀘스트를 최종 완료하고 보상을 지급합니다.
     */
    public completeQuest(questId: QuestId): boolean {
        const activeQuest = this.activeQuests.get(questId);
        const questDef = this.questDefinitions.get(questId);

        if (!activeQuest || !questDef) {
            console.error(`[QuestManager] 완료할 수 없는 퀘스트: ${questId}`);
            return false;
        }

        if (activeQuest.status !== 'COMPLETABLE') {
            console.warn(`[QuestManager] 아직 완료할 수 없는 퀘스트입니다: ${questId}`);
            return false;
        }

        console.log(`[${questDef.title}] 퀘스트 완료! 보상 지급:`, questDef.rewards);
        // 여기에 실제 보상 지급 로직을 구현합니다.
        // 예: player.addExperience(questDef.rewards.experience);

        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);

        this.eventCtrl.SendEventMessage(EventTypes.QuestStateChanged, { questId, status: 'COMPLETED' });
        return true;
    }

    /**
     * 특정 퀘스트의 모든 목표가 달성되었는지 확인하고 상태를 변경합니다.
     */
    private checkQuestCompletion(questId: QuestId) {
        const activeQuest = this.activeQuests.get(questId);
        const questDef = this.questDefinitions.get(questId);

        if (!activeQuest || !questDef || activeQuest.status !== 'ACTIVE') return;

        const allObjectivesMet = questDef.objectives.every(obj => {
            const objectiveKey = `${obj.type}_${obj.targetId}`;
            const currentProgress = activeQuest.progress[objectiveKey] || 0;
            const requiredAmount = obj.amount ?? 1;
            return currentProgress >= requiredAmount;
        });

        if (allObjectivesMet) {
            activeQuest.status = 'COMPLETABLE';
            console.log(`퀘스트 완료 가능: ${questDef.title}`);
            this.eventCtrl.SendEventMessage(EventTypes.QuestStateChanged, { questId, status: 'COMPLETABLE' });
        }
    }
}