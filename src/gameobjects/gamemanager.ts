import IEventController from "@Glibs/interface/ievent";
import { TechNode } from "@Glibs/techtree/technode";
import { TechTreeService } from "@Glibs/techtree/techtreeservice";
import { BuffProperty } from "@Glibs/magical/buff/buffdefs";
import { EventTypes } from "@Glibs/types/globaltypes";
import { TechTreeKind } from "@Glibs/techtree/techtreedefs";

export default class GameManager {
    // 활성화된 버프 객체들을 추적하기 위한 Map (key: nodeId, value: Buff Object)
    private activeBuffs = new Map<string, BuffProperty>();

    constructor(
        private eventCtrl: IEventController,
        private service: TechTreeService,
    ) { 
        this.eventCtrl.RegisterEventListener(EventTypes.LevelUp, () => {
            this.addResource(1)
        })
        this.eventCtrl.RegisterEventListener(EventTypes.AddSkillPoint, (point: number) => {
            this.addPoints(point)
        })
    }
    public addPoints(amount: number) {
        // 1. 직접 지갑의 포인트를 증가시킵니다.
        // Wallet 인터페이스 구조에 따라 ctx.wallet.points를 수정합니다.
        this.service.ctx.wallet.points += amount;
    
        console.log(`포인트가 추가되었습니다. 현재 포인트: ${this.service.ctx.wallet.points}`);
    }

    // =========================================================================
    // ✨ [New Feature 1] 현재 배울 수 있는 테크 리스트 조회
    // =========================================================================
    /**
     * 현재 상태(비용, 선행조건 등)에서 배울 수 있거나 레벨업 가능한 테크 목록을 반환합니다.
     * @param filterKind (선택) 특정 종류(skill, buff, trait 등)만 필터링하고 싶을 때 사용
     */
    getAvailableTechs(filterKind?: TechTreeKind) {
        return this.service.listAvailableNext()
            .filter(item => !filterKind || item.kind === filterKind) // 필터링
            .map(item => {
                // 2. ID로 Node 찾기
                const node = this.service.index.byId.get(item.id);

                // 3. Node의 속성 직접 매핑 (Clean & Type-safe)
                return {
                    ...item,
                    // node가 있으면 그 값을, 없으면(예외상황) 기본값 사용
                    description: node?.desc ?? "",
                    rarity: node?.rarity ?? "common"
                };
            });
    }
    /**
     * [New] 재화(포인트, 골드 등)를 추가합니다.
     * @param amount 추가할 양
     * @param type 재화 타입 (기본값: 'points')
     */
    addResource(amount: number, type: "points" | "gold" = "points") {
        const wallet = this.service.ctx.wallet;
        
        // 기존 값이 없으면 0으로 초기화 후 더하기
        const current = wallet[type] ?? 0;
        wallet[type] = current + amount;

        console.log(`[Resource] ${type} +${amount} (Total: ${wallet[type]})`);
        
        // (선택) UI 갱신을 위한 이벤트 발송
        // this.eventCtrl.SendEventMessage(EventTypes.UpdateResource, wallet);
    }

    // =========================================================================
    // ✨ [New Feature 2] 특정 테크 레벨업 (Public API)
    // =========================================================================
    /**
     * 특정 테크(nodeId)의 레벨을 1 올리고 효과를 적용합니다.
     * UI 버튼 등에서 호출하는 진입점입니다.
     */
    upgradeTech(nodeId: string): boolean {
        return this.applyLevelUp(nodeId);
    }

    /**
     * 내부 로직: 테크 트리의 특정 노드를 레벨업하고, 이벤트를 통해 효과를 적용합니다.
     */
    private applyLevelUp(nodeId: string): boolean {
        // 1. 테크 트리 로직 (비용 차감, 레벨 증가)
        const success = this.service.levelUp(nodeId);
        if (!success) return false;

        // 2. 정보 조회
        const level = this.service.levels[nodeId];
        const node = this.service.index.byId.get(nodeId);
        
        if (!node) return false;

        // 3. 효과 적용 분기
        this.applyEffect(node, level);
        return true;
    }

    /**
     * TechTreeKind에 따라 적절한 적용 로직 수행
     */
    private applyEffect(node: TechNode, level: number) {
        // 레벨 변동 시 기존 효과 제거 (갱신 로직)
        this.removeEffect(node.id);

        console.log(`Applying Tech: ${node.name} (Lv.${level}) - Kind: ${node.kind}`);

        switch (node.kind) {
            case "skill": // 액티브 스킬 해금
                this.unlockSkill(node, level);
                break;

            case "buff":   // 지속 효과 (메시지 기반)
            case "action": // 액션 컴포넌트 (메시지 기반)
                this.applyBuffByEvent(node, level);
                break;
            
            case "building": // 건물 해금 (예시: 이벤트 전송)
                console.log("Building unlock event sent for:", node.name);
                break;
        }
    }

    /**
     * [Message Based] 버프/액션 적용
     * ActionRegistry로 컴포넌트를 생성하고, Buff 객체로 래핑하여 이벤트 메시지를 보냅니다.
     */
    private applyBuffByEvent(node: TechNode, level: number) {
        // ⚠️ 중요: 원본 객체 오염 방지를 위해 얕은 복사(...)를 사용합니다.
        const def = { ...node.tech } as BuffProperty; 

        // 3. 추적을 위해 저장 (activeBuffs)
        this.activeBuffs.set(node.id, def);

        // 4. [핵심] 메시지 기반 등록
        // "UpdateBuff" + "player" 채널로 버프 객체 전송
        this.eventCtrl.SendEventMessage(EventTypes.UpdateBuff + "player", def, level);
    }

    /**
     * [Message Based] 버프 제거
     */
    private removeBuffByEvent(nodeId: string) {
        const buff = this.activeBuffs.get(nodeId);
        if (!buff) return;

        // 1. 제거 이벤트 전송
        this.eventCtrl.SendEventMessage(EventTypes.RemoveBuff + "player", buff);

        this.activeBuffs.delete(nodeId);
    }

    /**
     * [Skill] 스킬 해금
     */
    private unlockSkill(node: TechNode, level: number) {
        const skillId = node.techId;

        // (선택) 스킬 습득 알림 이벤트 전송
        this.eventCtrl.SendEventMessage(EventTypes.SkillLearned + "player", skillId);

        console.log(`Skill unlocked: ${skillId} (Lv.${level})`);
    }

    /**
     * 효과 제거 (Respec/Re-apply용)
     */
    private removeEffect(nodeId: string) {
        // 2. Buff/Action 제거 (메시지 또는 직접 호출)
        this.removeBuffByEvent(nodeId);
    }

    /**
     * 초기화 (Respec)
     */
    respec(nodeId: string, targetLv: number) {
        const currentLv = this.service.levels[nodeId] || 0;
        if (targetLv >= currentLv) return;

        this.service.refundDownTo(nodeId, targetLv);
        this.removeEffect(nodeId);

        if (targetLv > 0) {
            const node = this.service.index.byId.get(nodeId);
            if (node) this.applyEffect(node, targetLv);
        }
    }
}