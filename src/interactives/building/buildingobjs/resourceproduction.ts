import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType, BuildingMode } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';
import { CurrencyType } from '@Glibs/inventory/wallet';
import { EnvironmentManager } from '../../environment/environmentmanager';

export class ResourceProduction extends BaseBuilding {
    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.ResourceProduction, property, position, mesh, eventCtrl);
    }

    /**
     * 자원 생산 로직 커스터마이징 (주변 환경 자원 수집)
     */
    protected produceResources() {
        const prod = this.property.production;
        if (!prod) return;

        // 1. 기본 생산량 (건물 자체 생산)
        super.produceResources();

        // 2. 추가 생산량 (주변 환경 자원 수집)
        // 예: Sawmill(제재소) 근처에 나무(pine_tree)가 있으면 추가 자원 획득
        const collectionRange = prod.collectionRange || 20.0; // 기본 범위 20
        const collectionEfficiency = prod.collectionEfficiency || 0.5; // 기본 효율 50%

        for (const [resType, baseAmount] of Object.entries(prod.resources)) {
            // 해당 자원을 제공하는 환경 객체들을 검색
            // (여기서는 단순화를 위해 resourceType 매칭 로직은 생략하고 거리만 체크)
            const nearbyResources = EnvironmentManager.Instance.getObjectsInRange(this.position, collectionRange);
            
            let extraHarvest = 0;
            for (const envObj of nearbyResources) {
                // 자원 타입이 일치하는지 확인 (EventTypes 비교)
                if (envObj.property.resourceType === resType) {
                    // 환경 객체로부터 자원 채집 시도
                    const harvested = envObj.harvest((baseAmount as number) * collectionEfficiency * this.level);
                    extraHarvest += harvested;
                }
            }

            if (extraHarvest > 0) {
                console.log(`[${this.property.name}] 주변에서 ${resType} ${extraHarvest} 추가 수집!`);
                this.eventCtrl.SendEventMessage(resType, extraHarvest);
            }
        }
    }

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).filter(t => t.id !== "collect").map(t => ({
            ...t,
            onClick: () => {
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isUpgrading
        }));
    }

    protected getStatusText(): string {
        return "자원 생산 중";
    }

    protected getSpecificProgress(): number | undefined {
        if (!this.property.production) return undefined;

        if (this.currentMode === BuildingMode.Timer) {
            return this.resourceProductionTimer / this.property.production.interval;
        } else {
            return this.resourceProductionTurnCount / this.property.production.turns;
        }
    }
}
