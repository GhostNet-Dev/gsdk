import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { EventTypes } from "@Glibs/types/globaltypes";
import { EnvironmentProperty, environmentDefs } from "./environmentdefs";
import { IEnvironmentObject } from "./ienvironmentobj";
import { Tree } from "./environmentobjs/tree";
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';

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

    private loader = new Loader();
    private noise = new ImprovedNoise();
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

    // 고유 ID 카운터
    private static _idCounter = 0;
    private static _nextId(): string { return `env_${++EnvironmentManager._idCounter}`; }

    constructor(
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
        private camera: THREE.Camera
    ) {
        EnvironmentManager._instance = this;
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
                        pos.set(gridX * this.gridSize, 0, gridZ * this.gridSize);
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

    private async _ensureInstancedMesh(nodeId: string) {
        if (this.instancedMeshes.has(nodeId)) return;

        const prop = environmentDefs[nodeId];
        if (!prop) throw new Error(`Unknown nodeId: ${nodeId}`);

        const asset = await this.loader.GetAssets(prop.assetKey);
        const parts = this._createInstancedMeshParts(await asset.CloneModel(), this.MAX_INSTANCES);
        this.instancedMeshes.set(nodeId, parts);
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
        const envObj = new Tree(id, prop, pos.clone(), null, this.eventCtrl, index, parts, this._spawnMatrix.clone());
        this.envObjects.set(id, envObj);
        this.envObjectsArray.push(envObj);
        indexMap.set(index, envObj);

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

        try {
            if (useInstancing) {
                await this._ensureInstancedMesh(nodeId);
                const id = this._spawnInstanced(nodeId, pos);
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

                model.position.copy(pos);
                if (prop.randomRotation) model.rotation.y = Math.random() * Math.PI * 2;
                let s = prop.scale;
                if (prop.randomScaleRange) {
                    s *= prop.randomScaleRange[0] + Math.random() * (prop.randomScaleRange[1] - prop.randomScaleRange[0]);
                }
                model.scale.set(s, s, s);
                this.scene.add(model);

                const id = EnvironmentManager._nextId();
                const envObj = new Tree(id, prop, pos, model, this.eventCtrl);
                this.envObjects.set(id, envObj);
                this.envObjectsArray.push(envObj);

                const cellKey = this._cellKey(pos.x, pos.z);
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

                let visCache = this._clusterVisibility.get(nodeId);
                if (!visCache || visCache.length !== clusters.length) {
                    visCache = new Array(clusters.length).fill(-1);
                    this._clusterVisibility.set(nodeId, visCache);
                }

                let anyChanged = false;

                for (let ci = 0; ci < clusters.length; ci++) {
                    const cluster = clusters[ci];
                    this._cullSphere.set(cluster.center, cluster.radius);
                    const nowVisible = this._frustum.intersectsSphere(this._cullSphere) ? 1 : 0;

                    if (visCache[ci] === nowVisible) continue;
                    visCache[ci] = nowVisible;
                    anyChanged = true;
                }

                if (!anyChanged) return;

                // 가시 클러스터의 non-depleted 인스턴스를 [0, N) 슬롯에 팩킹
                // inst.count = N → GPU는 N개 인스턴스만 vertex shader 실행 (시야 밖 완전 생략)
                let slot = 0;
                for (let ci = 0; ci < clusters.length; ci++) {
                    if (visCache[ci] !== 1) continue;
                    const indices = clusters[ci].indices;
                    for (let k = 0; k < indices.length; k++) {
                        const logIdx = indices[k];
                        const obj = indexMap.get(logIdx);
                        if (!obj || obj.isDepleted) continue;
                        this._tempMatrix.fromArray(matrices, logIdx * 16);
                        parts.forEach(p => p.setMatrixAt(slot, this._tempMatrix));
                        slotToLogical[slot] = logIdx;
                        logicalToSlot[logIdx] = slot;
                        slot++;
                    }
                }

                const prevCount = this._visibleCount.get(nodeId) ?? 0;
                this._visibleCount.set(nodeId, slot);
                parts.forEach(p => {
                    p.count = slot;
                    // 실제 변경이 있을 때만 GPU 업로드
                    p.instanceMatrix.needsUpdate = slot !== prevCount || anyChanged;
                });
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

    private _cellKey(x: number, z: number): string {
        return `${Math.floor(x / this.SPATIAL_CELL_SIZE)},${Math.floor(z / this.SPATIAL_CELL_SIZE)}`;
    }

    private sendEnvironmentStatus() {
        const envs = this.envObjectsArray.map(e => ({
            nodeId: e.property.id,
            pos: e.position,
            width: e.property.size.width,
            depth: e.property.size.depth
        }));
        this.eventCtrl.SendEventMessage(EventTypes.ResponseBuilding, envs);
    }
}
