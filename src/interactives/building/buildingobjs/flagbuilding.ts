import * as THREE from 'three';
import IEventController from '@Glibs/interface/ievent';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { BuildingProperty } from '../buildingdefs';
import { BuildingType } from '../ibuildingobj';
import { BaseBuilding } from './basebuilding';

export class FlagBuilding extends BaseBuilding {
    constructor(
        id: string,
        property: BuildingProperty,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: IEventController
    ) {
        super(id, BuildingType.Flag, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void { }

    protected getSpecificCommands(): ICommand[] {
        return [];
    }

    protected getStatusText(): string {
        return "집결 지점";
    }

    protected getSpecificProgress(): number | undefined {
        return undefined;
    }
}
