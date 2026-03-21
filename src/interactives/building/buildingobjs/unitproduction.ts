import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class UnitProduction implements IBuildingObject {
    public readonly type = BuildingType.UnitProduction;
    public level: number = 1;
    private isProducing = false;
    private currentUnit: string | null = null;
    private productionTimer = 0;
    private readonly productionTime = 5.0;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (this.isProducing) {
            this.productionTimer += delta;
            if (this.productionTimer >= this.productionTime) {
                this.spawnUnit();
            }
        }
    }

    private startProduction(unitId: string) {
        if (this.isProducing) return;
        this.isProducing = true;
        this.currentUnit = unitId;
        this.productionTimer = 0;
        console.log(`[Production] Started: ${unitId}`);
    }

    private spawnUnit() {
        if (this.currentUnit) {
            this.eventCtrl.SendEventMessage(EventTypes.Projectile, { 
                type: "spawn", 
                unitId: this.currentUnit, 
                pos: this.position.clone().add(new THREE.Vector3(5, 0, 5)) 
            });
            console.log(`[Production] Spawned: ${this.currentUnit}`);
        }
        this.isProducing = false;
        this.currentUnit = null;
    }

    destroy(): void {
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc,
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: this.isProducing ? `${this.currentUnit} 생산 중...` : "대기 중",
            progress: this.isProducing ? (this.productionTimer / this.productionTime) : undefined,
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.type === "produce" && t.targetId) {
                        this.startProduction(t.targetId);
                    }
                    if (t.type === "research" && t.targetId) {
                        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                    }
                },
                isDisabled: () => this.isProducing
            }))
        };
    }
}
