import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { EventTypes } from "@Glibs/types/globaltypes";
import { EnvironmentProperty, environmentDefs } from "./environmentdefs";
import { IEnvironmentObject } from "./ienvironmentobj";
import { Tree } from "./environmentobjs/tree";
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import { PlacementManager } from "@Glibs/interactives/placement/placementmanager";
import { collectCircularGridCellKeys, getFootprintGridCellKeys, hasGridCellOverlap } from "@Glibs/interactives/placement/gridrangeutils";
import { createRadialEnvironmentPattern } from "./radialenvironmentpattern";
import { packVisibleInstances } from "./instancecullingutils";
import {
    getEnvironmentCollisionCenter,
    getEnvironmentCollisionSize,
    isEnvironmentCollisionEnabled,
    StaticColliderKind,
    StaticColliderRegistry,
} from "./staticcolliderregistry";

export type EnvironmentResourceQuery = {
    environmentIds?: readonly string[];
    resourceTypes?: readonly string[];
    minAmount?: number;
};

type RadialPathPopulateOptions = {
    centerX: number,
    centerZ: number,
    width: number,
    depth: number,
    density: number,
    threshold: number,
    noiseScale: number,
    clearingRadius: number,
    roadCount: number,
    roadWidth: number,
    roadAngleOffset?: number,
}

type GroundRadialPathPopulateOptions = Omit<RadialPathPopulateOptions, 'centerX' | 'centerZ' | 'width' | 'depth'>;

export class EnvironmentManager implements ILoop {
    private static _instance: EnvironmentManager | null = null;
    public static get Instance(): EnvironmentManager {
        if (!this._instance) throw new Error("EnvironmentManager not initialized");
        return this._instance;
    }

    LoopId: number = 0;
    private envObjects: Map<string, IEnvironmentObject> = new Map();
    private envObjectsArray: IEnvironmentObject[] = [];

    // InstancedMesh 관련
    private instancedMeshes: Map<string, THREE.InstancedMesh[]> = new Map();
    private baseMatrices: Map<string, Float32Array> = new Map();
    private nextInstanceIndex: Map<string, number> = new Map();
    private instanceIndexMap: Map<string, Map<number, IEnvironmentObject>> = new Map();
    private instanceCullRadius: Map<string, number> = new Map();

    private loader = new Loader();
    private noise = new ImprovedNoise();
    private colliderRegistry: StaticColliderRegistry;
    private gridSize = 4.0;
    private readonly MAX_INSTANCES = 10000;

    // 클러스터 컬링
    private clusters: Map<string, { center: THREE.Vector3, radius: number, indices: number[] }[]> = new Map();
    private readonly CLUSTER_SIZE = 16;

    // 매 프레임 재사용 객체 (GC 방지)
    private _frustum = new THREE.Frustum();
    private _projScreenMatrix = new THREE.Matrix4();
    private _zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    private _tempMatrix = new THREE.Matrix4();
    private _cullSphere = new THREE.Sphere();

    // 카메라 변경 감지
    private _lastCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    private _lastCamQuat = new THREE.Quaternion(0, 0, 0, 0);
    private _dirtyNodes = new Set<string>();

    // 클러스터 가시성 캐시: 변경된 클러스터만 GPU 업데이트
    private _clusterVisibility: Map<string, number[]> = new Map();

    // GPU: 가시 인스턴스만 [0, visibleCount) 슬롯에 팩킹 → inst.count = visibleCount
    // baseMatrices[logicalIdx] → 팩킹 시 renderSlot에 복사
    private _renderSlotToLogical: Map<string, Int32Array> = new Map();
    private _logicalToRenderSlot: Map<string, Int32Array> = new Map();
    private _visibleCount: Map<string, number> = new Map();

    // 공간 해시 그리드: getObjectsInRange O(n) → O(1)
    private _spatialGrid: Map<string, IEnvironmentObject[]> = new Map();
    private readonly SPATIAL_CELL_SIZE = 10;

    // spawn 임시 객체 재사용 (초기화 GC 감소)
    private _spawnEuler = new THREE.Euler();
    private _spawnQuat = new THREE.Quaternion();
    private _spawnScale = new THREE.Vector3();
    private _spawnMatrix = new THREE.Matrix4();
    private _colliderScale = new THREE.Vector3();
    private _colliderQuat = new THREE.Quaternion();
    private _colliderPos = new THREE.Vector3();

    // 고유 ID 카운터
    private static _idCounter = 0;
    private static _nextId(): string { return `env_${++EnvironmentManager._idCounter}`; }

    constructor(
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
        private camera: THREE.Camera
    ) {
        EnvironmentManager._instance = this;
        this.colliderRegistry = new StaticColliderRegistry(this.eventCtrl);
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);

        this.eventCtrl.RegisterEventListener(EventTypes.ResponseBuilding, (_data: any) => { });
    }

    async populateWithNoise(nodeId: string, options: {
        centerX: number,
        centerZ: number,
        width: number,
        depth: number,
        density: number,
        threshold: number,
        noiseScale: number
    }) {
        const { centerX, centerZ, width, depth, density, threshold, noiseScale } = options;
        const startX = centerX - width / 2;
        const startZ = centerZ - depth / 2;

        console.log(`[EnvironmentManager] Populating ${nodeId} with noise...`);

        await this._ensureInstancedMesh(nodeId);

        const occupiedKeys = new Set<string>();
        const pos = new THREE.Vector3();
        const prop = environmentDefs[nodeId];
        if (!prop) throw new Error(`Unknown nodeId: ${nodeId}`);

        for (let x = 0; x < width; x += this.gridSize) {
            for (let z = 0; z < depth; z += this.gridSize) {
                const worldX = startX + x;
                const worldZ = startZ + z;
                const nv = (this.noise.noise(worldX / noiseScale, worldZ / noiseScale, 0) + 1) / 2;

                if (nv > threshold && Math.random() < density) {
                    const gridX = Math.round(worldX / this.gridSize);
                    const gridZ = Math.round(worldZ / this.gridSize);
                    const key = `${gridX},${gridZ}`;

                    if (!occupiedKeys.has(key)) {
                        occupiedKeys.add(key);
                        this._setPlacementAlignedPosition(pos, gridX, gridZ, prop);
                        this._spawnInstanced(nodeId, pos);
                    }
                }
            }
        }

        this.rebuildClusters(nodeId);
        // 초기 팩킹: 전체 인스턴스가 visible로 시작
        this._initRenderSlots(nodeId);
        this.sendEnvironmentStatus();
    }

    async populateGroundWithRadialPaths(
        nodeId: string,
        ground: THREE.Object3D,
        options: GroundRadialPathPopulateOptions
    ) {
        const prop = environmentDefs[nodeId];
        if (!prop) throw new Error(`Unknown nodeId: ${nodeId}`);

        ground.updateWorldMatrix(true, true);
        const bounds = new THREE.Box3().setFromObject(ground);
        if (bounds.isEmpty()) {
            console.warn(`[EnvironmentManager] Ground bounds are empty. Skip populating ${nodeId}.`);
            return;
        }

        const center = bounds.getCenter(new THREE.Vector3());
        const footprintHalfX = prop.size.width * this.gridSize * 0.5;
        const footprintHalfZ = prop.size.depth * this.gridSize * 0.5;
        const minX = bounds.min.x + footprintHalfX;
        const maxX = bounds.max.x - footprintHalfX;
        const minZ = bounds.min.z + footprintHalfZ;
        const maxZ = bounds.max.z - footprintHalfZ;

        if (minX > maxX || minZ > maxZ) {
            console.warn(`[EnvironmentManager] Ground is too small for ${nodeId} footprints.`);
            return;
        }

        console.log(`[EnvironmentManager] Populating ${nodeId} inside ground bounds...`);

        await this._ensureInstancedMesh(nodeId);

        const occupiedKeys = new Set<string>();
        const offsetX = (prop.size.width % 2 !== 0) ? this.gridSize * 0.5 : 0;
        const offsetZ = (prop.size.depth % 2 !== 0) ? this.gridSize * 0.5 : 0;
        const minGridX = Math.ceil((minX - offsetX) / this.gridSize);
        const maxGridX = Math.floor((maxX - offsetX) / this.gridSize);
        const minGridZ = Math.ceil((minZ - offsetZ) / this.gridSize);
        const maxGridZ = Math.floor((maxZ - offsetZ) / this.gridSize);

        const cells = createRadialEnvironmentPattern({
            centerX: center.x,
            centerZ: center.z,
            minGridX,
            maxGridX,
            minGridZ,
            maxGridZ,
            gridSize: this.gridSize,
            footprintWidth: prop.size.width,
            footprintDepth: prop.size.depth,
            density: options.density,
            threshold: options.threshold,
            noiseScale: options.noiseScale,
            clearingRadius: options.clearingRadius,
            roadCount: options.roadCount,
            roadWidth: options.roadWidth,
            roadAngleOffset: options.roadAngleOffset,
            noise: this.noise,
            occupied: occupiedKeys,
        });

        for (const cell of cells) {
            for (const key of cell.cells) occupiedKeys.add(key);
            this._spawnInstanced(nodeId, cell.position);
        }

        this.rebuildClusters(nodeId);
        this._initRenderSlots(nodeId);
        this.sendEnvironmentStatus();
    }

    async populateWithRadialPaths(nodeId: string, options: RadialPathPopulateOptions) {
        const {
            centerX,
            centerZ,
            width,
            depth,
            density,
            threshold,
            noiseScale,
            clearingRadius,
            roadCount,
            roadWidth,
            roadAngleOffset = -Math.PI / 2,
        } = options;
        const startX = centerX - width / 2;
        const startZ = centerZ - depth / 2;

        console.log(`[EnvironmentManager] Populating ${nodeId} with radial paths...`);

        await this._ensureInstancedMesh(nodeId);

        const occupiedKeys = new Set<string>();
        const prop = environmentDefs[nodeId];
        if (!prop) throw new Error(`Unknown nodeId: ${nodeId}`);

        const minGridX = Math.round(startX / this.gridSize);
        const maxGridX = Math.round((startX + width - this.gridSize) / this.gridSize);
        const minGridZ = Math.round(startZ / this.gridSize);
        const maxGridZ = Math.round((startZ + depth - this.gridSize) / this.gridSize);
        const cells = createRadialEnvironmentPattern({
            centerX,
            centerZ,
            minGridX,
            maxGridX,
            minGridZ,
            maxGridZ,
            gridSize: this.gridSize,
            footprintWidth: prop.size.width,
            footprintDepth: prop.size.depth,
            density,
            threshold,
            noiseScale,
            clearingRadius,
            roadCount,
            roadWidth,
            roadAngleOffset,
            noise: this.noise,
            occupied: occupiedKeys,
        });

        for (const cell of cells) {
            for (const key of cell.cells) occupiedKeys.add(key);
            this._spawnInstanced(nodeId, cell.position);
        }

        this.rebuildClusters(nodeId);
        this._initRenderSlots(nodeId);
        this.sendEnvironmentStatus();
    }

    private async _ensureInstancedMesh(nodeId: string) {
        if (this.instancedMeshes.has(nodeId)) return;

        const prop = environmentDefs[nodeId];
        if (!prop) throw new Error(`Unknown nodeId: ${nodeId}`);

        const asset = await this.loader.GetAssets(prop.assetKey);
        const parts = this._createInstancedMeshParts(await asset.CloneModel(), this.MAX_INSTANCES);
        this.instancedMeshes.set(nodeId, parts);
        this.instanceCullRadius.set(nodeId, this._computeInstanceCullRadius(parts, prop));
        parts.forEach(p => this.scene.add(p));

        this.baseMatrices.set(nodeId, new Float32Array(this.MAX_INSTANCES * 16));
        this.nextInstanceIndex.set(nodeId, 0);
        this.instanceIndexMap.set(nodeId, new Map());
        this._renderSlotToLogical.set(nodeId, new Int32Array(this.MAX_INSTANCES).fill(-1));
        this._logicalToRenderSlot.set(nodeId, new Int32Array(this.MAX_INSTANCES).fill(-1));
        this._visibleCount.set(nodeId, 0);
    }

    private _spawnInstanced(nodeId: string, pos: THREE.Vector3): string | null {
        const prop = environmentDefs[nodeId];
        const parts = this.instancedMeshes.get(nodeId);
        const matrices = this.baseMatrices.get(nodeId);
        const indexMap = this.instanceIndexMap.get(nodeId);
        if (!prop || !parts || !matrices || !indexMap) return null;

        const index = this.nextInstanceIndex.get(nodeId)!;
        if (index >= this.MAX_INSTANCES) return null;

        // 임시 객체 재사용 (new 제거)
        this._spawnEuler.set(0, prop.randomRotation ? Math.random() * Math.PI * 2 : 0, 0);
        this._spawnQuat.setFromEuler(this._spawnEuler);
        let s = prop.scale;
        if (prop.randomScaleRange) {
            s *= prop.randomScaleRange[0] + Math.random() * (prop.randomScaleRange[1] - prop.randomScaleRange[0]);
        }
        this._spawnScale.set(s, s, s);
        this._spawnMatrix.compose(pos, this._spawnQuat, this._spawnScale);
        this._spawnMatrix.toArray(matrices, index * 16);

        this.nextInstanceIndex.set(nodeId, index + 1);

        const id = EnvironmentManager._nextId();
        const collider = this._registerEnvironmentCollider(id, prop, pos, s);
        const envObj = new Tree(
            id,
            prop,
            pos.clone(),
            null,
            this.eventCtrl,
            collider,
            this.colliderRegistry,
            index,
            parts,
            this._spawnMatrix.clone(),
        );
        this.envObjects.set(id, envObj);
        this.envObjectsArray.push(envObj);
        indexMap.set(index, envObj);
        PlacementManager.Instance.registerFootprint({
            id,
            source: 'environment',
            state: 'active',
            nodeId,
            pos,
            width: prop.size.width,
            depth: prop.size.depth,
        });

        // 공간 그리드에 등록
        const cellKey = this._cellKey(pos.x, pos.z);
        if (!this._spatialGrid.has(cellKey)) this._spatialGrid.set(cellKey, []);
        this._spatialGrid.get(cellKey)!.push(envObj);

        return id;
    }

    /**
     * populateWithNoise 완료 후 한 번 호출: 전체 인스턴스를 visible 상태로 팩킹
     */
    private _initRenderSlots(nodeId: string) {
        const parts = this.instancedMeshes.get(nodeId);
        const matrices = this.baseMatrices.get(nodeId);
        const indexMap = this.instanceIndexMap.get(nodeId);
        const slotToLogical = this._renderSlotToLogical.get(nodeId);
        const logicalToSlot = this._logicalToRenderSlot.get(nodeId);
        if (!parts || !matrices || !indexMap || !slotToLogical || !logicalToSlot) return;

        const total = this.nextInstanceIndex.get(nodeId) ?? 0;
        for (let logIdx = 0; logIdx < total; logIdx++) {
            slotToLogical[logIdx] = logIdx;
            logicalToSlot[logIdx] = logIdx;
            this._tempMatrix.fromArray(matrices, logIdx * 16);
            parts.forEach(p => p.setMatrixAt(logIdx, this._tempMatrix));
        }

        this._visibleCount.set(nodeId, total);
        parts.forEach(p => {
            p.count = total;
            p.instanceMatrix.needsUpdate = true;
        });
    }

    async spawn(nodeId: string, pos: THREE.Vector3, silent = false, useInstancing = false): Promise<string | null> {
        const prop = environmentDefs[nodeId];
        if (!prop) return null;
        const alignedPos = this._snapToPlacementGrid(pos, prop);

        try {
            if (useInstancing) {
                await this._ensureInstancedMesh(nodeId);
                const id = this._spawnInstanced(nodeId, alignedPos);
                if (!silent && id) {
                    this.rebuildClusters(nodeId);
                    this._initRenderSlots(nodeId);
                    this.sendEnvironmentStatus();
                }
                return id;
            } else {
                const asset = await this.loader.GetAssets(prop.assetKey);
                const [model] = await asset.UniqModel(`env_${Date.now()}_${nodeId}`);
                if (!model) return null;

                model.position.copy(alignedPos);
                if (prop.randomRotation) model.rotation.y = Math.random() * Math.PI * 2;
                let s = prop.scale;
                if (prop.randomScaleRange) {
                    s *= prop.randomScaleRange[0] + Math.random() * (prop.randomScaleRange[1] - prop.randomScaleRange[0]);
                }
                model.scale.set(s, s, s);
                this.scene.add(model);

                const id = EnvironmentManager._nextId();
                const collider = this._registerEnvironmentCollider(id, prop, alignedPos, s);
                const envObj = new Tree(id, prop, alignedPos, model, this.eventCtrl, collider, this.colliderRegistry);
                this.envObjects.set(id, envObj);
                this.envObjectsArray.push(envObj);
                PlacementManager.Instance.registerFootprint({
                    id,
                    source: 'environment',
                    state: 'active',
                    nodeId,
                    pos: alignedPos,
                    width: prop.size.width,
                    depth: prop.size.depth,
                });

                const cellKey = this._cellKey(alignedPos.x, alignedPos.z);
                if (!this._spatialGrid.has(cellKey)) this._spatialGrid.set(cellKey, []);
                this._spatialGrid.get(cellKey)!.push(envObj);

                if (!silent) {
                    this.rebuildClusters(nodeId);
                    this.sendEnvironmentStatus();
                }
                return id;
            }
        } catch (err) {
            console.error(`Failed to spawn environment object ${nodeId}:`, err);
            return null;
        }
    }

    private _createInstancedMeshParts(source: THREE.Object3D, maxCount: number): THREE.InstancedMesh[] {
        const parts: THREE.InstancedMesh[] = [];
        source.updateMatrixWorld(true);
        source.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry.clone();
                geometry.applyMatrix4(child.matrixWorld);
                geometry.computeBoundingSphere();
                const inst = new THREE.InstancedMesh(geometry, child.material.clone(), maxCount);
                inst.castShadow = false;
                inst.receiveShadow = false;
                // frustumCulled=false: Three.js의 메쉬 단위 컬링 비활성화
                // 대신 inst.count로 실제 가시 인스턴스 수를 제어 → vertex shader 완전 생략
                inst.frustumCulled = false;
                inst.count = 0;
                inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                parts.push(inst);
            }
        });
        return parts;
    }

    private _registerEnvironmentCollider(
        id: string,
        prop: EnvironmentProperty,
        pos: THREE.Vector3,
        scale: number,
    ): THREE.Object3D | null {
        if (!isEnvironmentCollisionEnabled(prop)) return null;

        return this.colliderRegistry.registerBoxCollider({
            id,
            kind: StaticColliderKind.Environment,
            position: getEnvironmentCollisionCenter(pos, prop, scale),
            size: getEnvironmentCollisionSize(prop, this.gridSize, scale),
            raycastOn: false,
        });
    }

    private _setPlacementAlignedPosition(target: THREE.Vector3, gridX: number, gridZ: number, prop: EnvironmentProperty) {
        const offsetX = (prop.size.width % 2 !== 0) ? this.gridSize * 0.5 : 0;
        const offsetZ = (prop.size.depth % 2 !== 0) ? this.gridSize * 0.5 : 0;
        target.set(gridX * this.gridSize + offsetX, 0, gridZ * this.gridSize + offsetZ);
    }

    private _snapToPlacementGrid(pos: THREE.Vector3, prop: EnvironmentProperty): THREE.Vector3 {
        const gridX = Math.round(pos.x / this.gridSize);
        const gridZ = Math.round(pos.z / this.gridSize);
        const snapped = new THREE.Vector3();
        this._setPlacementAlignedPosition(snapped, gridX, gridZ, prop);
        snapped.y = pos.y;
        return snapped;
    }

    private _computeInstanceCullRadius(parts: THREE.InstancedMesh[], prop: EnvironmentProperty): number {
        let radius = Math.max(prop.size.width, prop.size.depth, 1);
        const maxRandomScale = prop.randomScaleRange?.[1] ?? 1;
        const instanceScale = prop.scale * maxRandomScale;

        for (const part of parts) {
            if (!part.geometry.boundingSphere) part.geometry.computeBoundingSphere();
            const bounds = part.geometry.boundingSphere;
            if (!bounds) continue;
            radius = Math.max(radius, bounds.radius * instanceScale);
        }

        return radius * 1.1;
    }

    private rebuildClusters(nodeId: string) {
        const indexMap = this.instanceIndexMap.get(nodeId);
        const parts = this.instancedMeshes.get(nodeId);
        const matrices = this.baseMatrices.get(nodeId);
        if (!indexMap) return;

        // slice 없이 인덱스 기반으로 클러스터 구성
        const objects = this.envObjectsArray.filter(o => o.property.id === nodeId && o.instanceIndex !== undefined);
        const clusterList: { center: THREE.Vector3, radius: number, indices: number[] }[] = [];
        const tmpMatrix = new THREE.Matrix4();
        const tmpSphere = new THREE.Sphere();

        for (let i = 0; i < objects.length; i += this.CLUSTER_SIZE) {
            const end = Math.min(i + this.CLUSTER_SIZE, objects.length);
            const center = new THREE.Vector3();
            for (let j = i; j < end; j++) center.add(objects[j].position);
            center.multiplyScalar(1 / (end - i));

            let maxDist = 0;
            for (let j = i; j < end; j++) {
                const o = objects[j];
                if (parts && matrices && o.instanceIndex !== undefined) {
                    tmpMatrix.fromArray(matrices, o.instanceIndex * 16);
                    for (const part of parts) {
                        const bounds = part.geometry.boundingSphere;
                        if (!bounds) continue;
                        tmpSphere.copy(bounds).applyMatrix4(tmpMatrix);
                        const d = center.distanceTo(tmpSphere.center) + tmpSphere.radius;
                        if (d > maxDist) maxDist = d;
                    }
                } else {
                    const d = o.position.distanceTo(center) + 2;
                    if (d > maxDist) maxDist = d;
                }
            }

            const indices: number[] = [];
            for (let j = i; j < end; j++) indices.push(objects[j].instanceIndex!);
            clusterList.push({ center, radius: maxDist, indices });
        }

        this.clusters.set(nodeId, clusterList);
        this._dirtyNodes.add(nodeId);
    }

    /**
     * depletion 등 인스턴스 상태 변경 시 외부에서 호출.
     * visibilityCache를 무효화하여 다음 프레임에서 강제 재팩킹.
     */
    markDirty(nodeId: string) {
        this._dirtyNodes.add(nodeId);
        // visCache 무효화 - 캐시된 가시성으로 depleted 인스턴스가 계속 보이는 버그 방지
        this._clusterVisibility.delete(nodeId);
    }

    /**
     * 공간 해시 그리드를 사용한 O(1) 범위 탐색.
     * 기존 O(n) envObjectsArray 선형 탐색 대체.
     */
    getObjectsInRange(pos: THREE.Vector3, radius: number, type?: string): IEnvironmentObject[] {
        const results: IEnvironmentObject[] = [];
        const cellRadius = Math.ceil(radius / this.SPATIAL_CELL_SIZE);
        const cx = Math.floor(pos.x / this.SPATIAL_CELL_SIZE);
        const cz = Math.floor(pos.z / this.SPATIAL_CELL_SIZE);
        const radiusSq = radius * radius;

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const cellKey = `${cx + dx},${cz + dz}`;
                const cell = this._spatialGrid.get(cellKey);
                if (!cell) continue;
                for (let i = 0; i < cell.length; i++) {
                    const obj = cell[i];
                    if (obj.isDepleted) continue;
                    if (type && obj.property.id !== type) continue;
                    // XZ 평면 거리만 비교 (sqrt 제거)
                    const dx2 = obj.position.x - pos.x;
                    const dz2 = obj.position.z - pos.z;
                    if (dx2 * dx2 + dz2 * dz2 <= radiusSq) results.push(obj);
                }
            }
        }
        return results;
    }

    getResourceObjectsInRange(pos: THREE.Vector3, radius: number, query: EnvironmentResourceQuery = {}): IEnvironmentObject[] {
        const environmentIds = query.environmentIds ? new Set(query.environmentIds) : undefined;
        const resourceTypes = query.resourceTypes ? new Set(query.resourceTypes) : undefined;
        const minAmount = query.minAmount ?? 1;

        return this.getObjectsInRange(pos, radius).filter((obj) => {
            if (obj.currentAmount < minAmount) return false;
            if (environmentIds && !environmentIds.has(obj.property.id)) return false;
            if (resourceTypes && !resourceTypes.has(obj.property.resourceType)) return false;
            return true;
        });
    }

    getResourceObjectsOverlappingGridRange(pos: THREE.Vector3, radius: number, query: EnvironmentResourceQuery = {}): IEnvironmentObject[] {
        const environmentIds = query.environmentIds ? new Set(query.environmentIds) : undefined;
        const resourceTypes = query.resourceTypes ? new Set(query.resourceTypes) : undefined;
        const minAmount = query.minAmount ?? 1;
        const rangeCells = collectCircularGridCellKeys(pos, radius, this.gridSize);
        if (rangeCells.size === 0) return [];

        return PlacementManager.Instance.getFootprints('environment').reduce<IEnvironmentObject[]>((matches, footprint) => {
            const obj = this.envObjects.get(footprint.id);
            if (!obj || obj.isDepleted) return matches;
            if (obj.currentAmount < minAmount) return matches;
            if (environmentIds && !environmentIds.has(obj.property.id)) return matches;
            if (resourceTypes && !resourceTypes.has(obj.property.resourceType)) return matches;

            const footprintCells = getFootprintGridCellKeys(footprint.pos, footprint.width, footprint.depth, this.gridSize);
            if (hasGridCellOverlap(rangeCells, footprintCells)) matches.push(obj);
            return matches;
        }, []);
    }

    update(delta: number) {
        if (this.envObjectsArray.length === 0) return;

        const camQuat = this.camera.quaternion;
        const moved = this.camera.position.distanceToSquared(this._lastCamPos) > 0.0001;
        const rotated = Math.abs(camQuat.dot(this._lastCamQuat)) < 0.9999;

        if (moved || rotated) {
            this._lastCamPos.copy(this.camera.position);
            this._lastCamQuat.copy(camQuat);
            this.camera.updateMatrixWorld();
            this._projScreenMatrix.multiplyMatrices(
                this.camera.projectionMatrix,
                this.camera.matrixWorldInverse
            );
            this._frustum.setFromProjectionMatrix(this._projScreenMatrix);
            this.instancedMeshes.forEach((_, nodeId) => this._dirtyNodes.add(nodeId));
        }

        if (this._dirtyNodes.size > 0) {
            this._dirtyNodes.forEach(nodeId => {
                const parts = this.instancedMeshes.get(nodeId);
                const clusters = this.clusters.get(nodeId);
                const matrices = this.baseMatrices.get(nodeId);
                const indexMap = this.instanceIndexMap.get(nodeId);
                const slotToLogical = this._renderSlotToLogical.get(nodeId);
                const logicalToSlot = this._logicalToRenderSlot.get(nodeId);
                if (!parts || !clusters || !matrices || !indexMap || !slotToLogical || !logicalToSlot) return;
                const instanceRadius = this.instanceCullRadius.get(nodeId) ?? 2.0;

                let visCacheRaw = this._clusterVisibility.get(nodeId);
                if (!visCacheRaw || visCacheRaw.length !== clusters.length) {
                    visCacheRaw = new Array(clusters.length).fill(-1);
                    this._clusterVisibility.set(nodeId, visCacheRaw);
                }
                const visCache = visCacheRaw;

                const prevCount = this._visibleCount.get(nodeId) ?? 0;
                const newCount = packVisibleInstances(
                    this._frustum,
                    clusters,
                    matrices,
                    parts,
                    slotToLogical,
                    logicalToSlot,
                    visCache,
                    instanceRadius,
                    prevCount,
                    this._cullSphere,
                    this._tempMatrix,
                    (logIdx) => {
                        const obj = indexMap.get(logIdx);
                        return !!obj && !obj.isDepleted;
                    },
                    undefined,
                    true,
                );
                this._visibleCount.set(nodeId, newCount);
            });

            this._dirtyNodes.clear();
        }

        for (let i = 0; i < this.envObjectsArray.length; i++) {
            this.envObjectsArray[i].update(delta);
        }
    }

    advanceTurn() {
        for (let i = 0; i < this.envObjectsArray.length; i++) {
            this.envObjectsArray[i].advanceTurn();
        }
    }

    detachFromScene(): void {
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
        this.colliderRegistry.clear();
        for (const meshes of this.instancedMeshes.values()) {
            for (const mesh of meshes) {
                mesh.parent?.remove(mesh);
            }
        }
        for (const envObj of this.envObjectsArray) {
            if (envObj.mesh) envObj.mesh.parent?.remove(envObj.mesh);
        }
    }

    attachToScene(scene: THREE.Scene): void {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
        for (const meshes of this.instancedMeshes.values()) {
            for (const mesh of meshes) {
                if (!mesh.parent) scene.add(mesh);
            }
        }
        for (const envObj of this.envObjectsArray) {
            if (envObj.mesh && !envObj.mesh.parent) scene.add(envObj.mesh);
        }
        this._registerActiveEnvironmentColliders();
    }

    private _registerActiveEnvironmentColliders(): void {
        for (const envObj of this.envObjectsArray) {
            if (envObj.isDepleted) continue;
            this._registerEnvironmentCollider(
                envObj.id,
                envObj.property,
                envObj.position,
                this._getEnvironmentObjectScale(envObj),
            );
        }
    }

    private _getEnvironmentObjectScale(envObj: IEnvironmentObject): number {
        if (envObj.mesh) return envObj.mesh.scale.x;
        if (envObj.baseMatrix) {
            envObj.baseMatrix.decompose(this._colliderPos, this._colliderQuat, this._colliderScale);
            return this._colliderScale.x;
        }
        return envObj.property.scale;
    }

    private _cellKey(x: number, z: number): string {
        return `${Math.floor(x / this.SPATIAL_CELL_SIZE)},${Math.floor(z / this.SPATIAL_CELL_SIZE)}`;
    }

    private sendEnvironmentStatus() {
        const envs = this.envObjectsArray.map(e => ({
            source: 'environment',
            nodeId: e.property.id,
            pos: e.position,
            width: e.property.size.width,
            depth: e.property.size.depth
        }));
        this.eventCtrl.SendEventMessage(EventTypes.ResponseBuilding, envs);
    }
}
