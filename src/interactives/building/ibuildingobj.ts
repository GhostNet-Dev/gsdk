import * as THREE from 'three';
import { BuildingProperty } from './buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';

/**
 * 건물의 성격을 정의하는 Enum
 */
export enum BuildingType {
    DefenseTurret = "DefenseTurret",        // 방어용 터렛
    Pilotable = "Pilotable",                // 파일럿이 탑승하여 제어하는 건물
    UnitProduction = "UnitProduction",      // 유닛 생산 건물
    TechResearch = "TechResearch",          // 기술 연구 건물
    ResourceProduction = "ResourceProduction", // 자원 생산 건물
    Wall = "Wall",                          // 성벽
    Bunker = "Bunker"                       // 벙커
}

/**
 * 모든 건물 오브젝트가 구현해야 하는 공통 인터페이스
 */
export interface IBuildingObject {
    readonly id: string;
    readonly type: BuildingType;
    readonly property: BuildingProperty;
    readonly position: THREE.Vector3;
    readonly eventCtrl: IEventController;
    level: number;
    
    /**
     * 월드에 배치된 실제 메쉬/오브젝트
     */
    readonly mesh?: THREE.Object3D;

    /**
     * 매 프레임 업데이트 로직 (공격, 생산 진행 등)
     */
    update(delta: number): void;

    /**
     * 턴 진행 로직
     */
    advanceTurn(): void;

    /**
     * 상호작용 (탑승, 생산 메뉴 열기 등)
     */
    onInteract?(): void;

    /**
     * 건물 파괴/제거 시 정리 로직
     */
    destroy(): void;

    /**
     * 하단 UI에 표시할 데이터 제공
     */
    getSelectionData(): ISelectionData;
}
