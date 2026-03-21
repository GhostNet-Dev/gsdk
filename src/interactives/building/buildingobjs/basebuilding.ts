import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData, ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

/**
 * 모든 건물의 공통 로직을 처리하는 추상 클래스
 */
export abstract class BaseBuilding implements IBuildingObject {
    public level: number = 1;
    protected isUpgrading: boolean = false;
    protected upgradeTimer: number = 0;
    protected upgradeTime: number = 0;
    protected currentHp: number;

    constructor(
        public readonly id: string,
        public readonly type: BuildingType,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        if (this.mesh) this.mesh.position.copy(position);
        this.currentHp = this.property.hp;
    }

    /**
     * 공통 업데이트 로직 (업그레이드 타이머 등)
     */
    update(delta: number): void {
        if (this.isUpgrading) {
            this.upgradeTimer += delta;
            if (this.upgradeTimer >= this.upgradeTime) {
                this.completeUpgrade();
            }
        }
        this.onUpdate(delta);
    }

    /**
     * 자식 클래스에서 구현할 개별 업데이트 로직
     */
    protected abstract onUpdate(delta: number): void;

    /**
     * 업그레이드 시작 (비용은 테크트리 서비스와 연계 필요)
     */
    protected startUpgrade() {
        if (this.isUpgrading) return;
        
        // 레벨업 시간 계산: 기본 건설 시간 * 현재 레벨
        this.upgradeTime = this.property.buildTime * this.level;
        this.upgradeTimer = 0;
        this.isUpgrading = true;
        
        console.log(`[${this.property.name}] Upgrade started. Time: ${this.upgradeTime}s`);
        
        // 전역 테크트리 레벨업 요청 (비용 차감 및 데이터 동기화)
        this.eventCtrl.SendEventMessage(EventTypes.LevelUp, this.property.id);
    }

    protected completeUpgrade() {
        this.level++;
        this.isUpgrading = false;
        console.log(`[${this.property.name}] Upgrade complete! New Level: ${this.level}`);
        
        // HP 회복 또는 능력치 상승 로직 추가 가능
        this.currentHp = this.property.hp; 
    }

    destroy(): void {
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    /**
     * 하단 UI 데이터 구성 (공통 + 자식 특수 명령)
     */
    getSelectionData(): ISelectionData {
        const commonCommands: ICommand[] = [
            {
                id: "common_upgrade",
                name: "업그레이드",
                icon: "🔼",
                shortcut: "U",
                onClick: () => this.startUpgrade(),
                isDisabled: () => this.isUpgrading || this.level >= 10 // 최대 레벨 제한 예시
            }
        ];

        const specificCommands = this.getSpecificCommands();
        
        return {
            title: this.property.name,
            description: this.property.desc,
            level: this.level,
            hp: { current: this.currentHp, max: this.property.hp },
            status: this.isUpgrading ? "업그레이드 중..." : this.getStatusText(),
            progress: this.isUpgrading ? (this.upgradeTimer / this.upgradeTime) : this.getSpecificProgress(),
            commands: [...specificCommands, ...commonCommands] // 특수 명령 먼저, 업그레이드는 뒤에
        };
    }

    /**
     * 자식 클래스에서 구현할 개별 커맨드 목록
     */
    protected abstract getSpecificCommands(): ICommand[];

    /**
     * 자식 클래스에서 구현할 상태 텍스트
     */
    protected abstract getStatusText(): string;

    /**
     * 자식 클래스에서 구현할 진행률 (생산 중 등)
     */
    protected getSpecificProgress(): number | undefined {
        return undefined;
    }
}
