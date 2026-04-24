import * as THREE from "three";
import { Loader } from "@Glibs/loader/loader";
import { environmentDefs } from "@Glibs/interactives/environment/environmentdefs";
import { InstanceCullingCluster, packVisibleInstances } from "@Glibs/interactives/environment/instancecullingutils";
import { NpcEnvironmentNodeId, NpcEnvironmentObjectSnapshot } from "./cityviewtypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

type EnvironmentBatch = {
  nodeId: NpcEnvironmentNodeId;
  parts: THREE.InstancedMesh[];
  baseMatrices: Float32Array;
  renderSlotToLogical: Int32Array;
  logicalToRenderSlot: Int32Array;
  clusters: InstanceCullingCluster[];
  clusterVisibilityCache: number[];
  instanceCullRadius: number;
  geomCenter: THREE.Vector3;
  visibleCount: number;
};

export class NpcEnvironmentRenderer implements ILoop {
  LoopId: number = 0;
  readonly root = new THREE.Group();

  private readonly batches: EnvironmentBatch[] = [];
  private readonly clusterSize = 16;
  private readonly projectionScreenMatrix = new THREE.Matrix4();
  private readonly frustum = new THREE.Frustum();
  private readonly scratchMatrix = new THREE.Matrix4();
  private readonly scratchPosition = new THREE.Vector3();
  private readonly scratchEuler = new THREE.Euler();
  private readonly scratchQuaternion = new THREE.Quaternion();
  private readonly scratchScale = new THREE.Vector3();
  private readonly scratchSphere = new THREE.Sphere();
  private readonly lastCameraPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
  private readonly lastCameraQuaternion = new THREE.Quaternion(0, 0, 0, 0);

  constructor(
    private readonly loader: Loader,
    private readonly camera: THREE.Camera,
    private readonly eventCtrl: IEventController,
  ) {
    this.root.name = "npc-environment-runtime";
  }

  async render(snapshot: readonly NpcEnvironmentObjectSnapshot[]): Promise<void> {
    this.clearRoot();

    const grouped = this.groupByNodeId(snapshot);
    for (const [nodeId, objects] of grouped) {
      const batch = await this.createBatch(nodeId, objects);
      if (!batch) continue;
      this.batches.push(batch);
      batch.parts.forEach((part) => this.root.add(part));
    }

  }

  attach(scene: THREE.Scene): void {
    if (!this.root.parent) {
      scene.add(this.root);      
    }
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  private _frameCount = 0;

  update(delta:number, elapsed?:number, force = false): void {
    if (this.batches.length === 0) {
      return;
    }

    this.camera.updateMatrixWorld();
    const changed = this.hasCameraChanged();
    this._frameCount++;

    // 매 60프레임마다 또는 강제/변경 시 로그
    const shouldLog = force || changed || this._frameCount % 60 === 0;
    if (shouldLog) {
      const pos = this.camera.position;
      const fov = this.camera instanceof THREE.PerspectiveCamera ? `fov=${this.camera.fov}` : 'ortho';
    }

    if (!force && !changed) {
      return;
    }

    this.lastCameraPosition.copy(this.camera.position);
    this.lastCameraQuaternion.copy(this.camera.quaternion);
    this.projectionScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix);

    for (const batch of this.batches) {
      this.packVisibleInstances(batch);
    }
  }

  dispose(): void {
    this.clearRoot();
    this.root.parent?.remove(this.root);
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }

  private groupByNodeId(
    snapshot: readonly NpcEnvironmentObjectSnapshot[],
  ): Map<NpcEnvironmentNodeId, NpcEnvironmentObjectSnapshot[]> {
    const grouped = new Map<NpcEnvironmentNodeId, NpcEnvironmentObjectSnapshot[]>();
    for (const object of snapshot) {
      const list = grouped.get(object.nodeId) ?? [];
      list.push(object);
      grouped.set(object.nodeId, list);
    }
    return grouped;
  }

  private async createBatch(
    nodeId: NpcEnvironmentNodeId,
    objects: readonly NpcEnvironmentObjectSnapshot[],
  ): Promise<EnvironmentBatch | undefined> {
    if (objects.length === 0) {
      return undefined;
    }

    const prop = environmentDefs[nodeId];
    const asset = this.loader.GetAssets(prop.assetKey);
    const source = await asset.CloneModel();
    source.updateMatrixWorld(true);

    const parts = this.createInstancedMeshParts(source, objects.length);
    if (parts.length === 0) {
      return undefined;
    }

    const baseMatrices = new Float32Array(objects.length * 16);
    const renderSlotToLogical = new Int32Array(objects.length).fill(-1);
    const logicalToRenderSlot = new Int32Array(objects.length).fill(-1);

    objects.forEach((object, index) => {
      this.scratchPosition.copy(object.position);
      this.scratchEuler.set(0, object.rotationY, 0);
      this.scratchQuaternion.setFromEuler(this.scratchEuler);
      this.scratchScale.setScalar(object.scale);
      this.scratchMatrix.compose(
        this.scratchPosition,
        this.scratchQuaternion,
        this.scratchScale,
      );
      this.scratchMatrix.toArray(baseMatrices, index * 16);
    });

    const clusters = this.buildClusters(objects, parts);
    const maxScale = objects.reduce((max, obj) => Math.max(max, obj.scale), 1);
    const partRadius = this.computePartRadius(parts);
    const instanceCullRadius = partRadius * maxScale * 1.1;
    const geomCenter = this.computeGeomCenter(parts);
    return {
      nodeId,
      parts,
      baseMatrices,
      renderSlotToLogical,
      logicalToRenderSlot,
      clusters,
      clusterVisibilityCache: new Array(clusters.length).fill(-1),
      instanceCullRadius,
      geomCenter,
      visibleCount: 0,
    };
  }

  private createInstancedMeshParts(source: THREE.Object3D, count: number): THREE.InstancedMesh[] {
    const parts: THREE.InstancedMesh[] = [];
    source.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      geometry.computeBoundingSphere();

      const material = this.cloneMaterial(child.material);
      const part = new THREE.InstancedMesh(geometry, material, count);
      part.castShadow = true;
      part.receiveShadow = true;
      part.frustumCulled = false;
      part.count = 0;
      part.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parts.push(part);
    });
    return parts;
  }

  private buildClusters(
    objects: readonly NpcEnvironmentObjectSnapshot[],
    parts: readonly THREE.InstancedMesh[],
  ): InstanceCullingCluster[] {
    const clusters: InstanceCullingCluster[] = [];
    const partRadius = this.computePartRadius(parts);

    for (let start = 0; start < objects.length; start += this.clusterSize) {
      const end = Math.min(start + this.clusterSize, objects.length);
      const center = new THREE.Vector3();
      for (let index = start; index < end; index++) {
        center.add(objects[index].position);
      }
      center.multiplyScalar(1 / (end - start));

      let radius = 0;
      const indices: number[] = [];
      for (let index = start; index < end; index++) {
        const object = objects[index];
        radius = Math.max(radius, center.distanceTo(object.position) + (partRadius * object.scale));
        indices.push(index);
      }
      clusters.push({ center, radius: radius * 1.1, indices });
    }

    return clusters;
  }

  private computePartRadius(parts: readonly THREE.InstancedMesh[]): number {
    let radius = 1;
    for (const part of parts) {
      if (!part.geometry.boundingSphere) {
        part.geometry.computeBoundingSphere();
      }
      radius = Math.max(radius, part.geometry.boundingSphere?.radius ?? 1);
    }
    return radius;
  }

  private computeGeomCenter(parts: readonly THREE.InstancedMesh[]): THREE.Vector3 {
    const center = new THREE.Vector3();
    let count = 0;
    for (const part of parts) {
      if (!part.geometry.boundingSphere) {
        part.geometry.computeBoundingSphere();
      }
      const bs = part.geometry.boundingSphere;
      if (bs) {
        center.add(bs.center);
        count++;
      }
    }
    if (count > 0) center.multiplyScalar(1 / count);
    return center;
  }

  private packVisibleInstances(batch: EnvironmentBatch): void {
    const previousVisibleCount = batch.visibleCount;
    batch.visibleCount = packVisibleInstances(
      this.frustum,
      batch.clusters,
      batch.baseMatrices,
      batch.parts,
      batch.renderSlotToLogical,
      batch.logicalToRenderSlot,
      batch.clusterVisibilityCache,
      batch.instanceCullRadius,
      batch.visibleCount,
      this.scratchSphere,
      this.scratchMatrix,
      undefined,
      batch.geomCenter,
      true,
    );
    const visibleClusters = batch.clusterVisibilityCache.reduce((count, visible) => count + (visible === 1 ? 1 : 0), 0);
  }

  private hasCameraChanged(): boolean {
    return this.camera.position.distanceToSquared(this.lastCameraPosition) > 0.0001
      || 1 - Math.abs(this.camera.quaternion.dot(this.lastCameraQuaternion)) > 0.000001;
  }

  private clearRoot(): void {
    this.root.clear();
    for (const batch of this.batches) {
      for (const part of batch.parts) {
        part.geometry.dispose();
        this.disposeMaterial(part.material);
      }
    }
    this.batches.length = 0;
    this.lastCameraPosition.set(Infinity, Infinity, Infinity);
    this.lastCameraQuaternion.set(0, 0, 0, 0);
  }

  private cloneMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
    return Array.isArray(material)
      ? material.map((item) => item.clone())
      : material.clone();
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
      return;
    }

    material.dispose();
  }

  private formatVector(vector: THREE.Vector3): string {
    return `(${vector.x.toFixed(1)},${vector.y.toFixed(1)},${vector.z.toFixed(1)})`;
  }

  private formatObjectBounds(objects: readonly NpcEnvironmentObjectSnapshot[]): string {
    if (objects.length === 0) return "empty";

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const object of objects) {
      minX = Math.min(minX, object.position.x);
      maxX = Math.max(maxX, object.position.x);
      minZ = Math.min(minZ, object.position.z);
      maxZ = Math.max(maxZ, object.position.z);
    }

    return `x=${minX.toFixed(1)}..${maxX.toFixed(1)} z=${minZ.toFixed(1)}..${maxZ.toFixed(1)}`;
  }
}
