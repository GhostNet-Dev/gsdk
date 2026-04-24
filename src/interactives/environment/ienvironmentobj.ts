import * as THREE from 'three';
import { EnvironmentProperty } from './environmentdefs';

export interface IEnvironmentObject {
    readonly id: string;
    readonly property: EnvironmentProperty;
    readonly position: THREE.Vector3;
    readonly mesh: THREE.Object3D | null;
    readonly collider: THREE.Object3D | null;
    
    // InstancedMesh 지원을 위한 속성
    instanceIndex?: number;
    instancedMeshParts?: THREE.InstancedMesh[];
    baseMatrix?: THREE.Matrix4; // 원본 변환 행렬 (컬링 계산용)

    currentAmount: number;
    isDepleted: boolean;

    update(delta: number): void;
    advanceTurn(): void;
    harvest(amount: number): number; // 실제로 채집된 양 반환
    dispose(): void;
}
