import * as THREE from "three";

export interface InstanceCullingCluster {
  center: THREE.Vector3;
  radius: number;
  indices: number[];
}

/**
 * 클러스터 frustum 컬링 → per-instance frustum 컬링 → 가시 인스턴스 팩킹.
 *
 * EnvironmentManager와 NpcEnvironmentRenderer가 공유하는 핵심 컬링 로직.
 * clusterVisibilityCache로 변경된 클러스터만 감지하고,
 * needsUpdate를 조건부로 설정하여 불필요한 GPU 업로드를 방지한다.
 *
 * @returns 새 visibleCount
 */
export function packVisibleInstances(
  frustum: THREE.Frustum,
  clusters: readonly InstanceCullingCluster[],
  baseMatrices: Float32Array,
  parts: readonly THREE.InstancedMesh[],
  renderSlotToLogical: Int32Array,
  logicalToRenderSlot: Int32Array,
  clusterVisibilityCache: number[],
  instanceCullRadius: number,
  prevVisibleCount: number,
  scratchSphere: THREE.Sphere,
  scratchMatrix: THREE.Matrix4,
  filterFn?: (logicalIndex: number) => boolean,
  geomCenterLocal?: THREE.Vector3,
  forceRepack = false,
): number {
  let anyClusterChanged = false;

  for (let ci = 0; ci < clusters.length; ci++) {
    const cluster = clusters[ci];
    scratchSphere.set(cluster.center, cluster.radius);
    const nowVisible = frustum.intersectsSphere(scratchSphere) ? 1 : 0;
    if (clusterVisibilityCache[ci] !== nowVisible) {
      clusterVisibilityCache[ci] = nowVisible;
      anyClusterChanged = true;
    }
  }

  if (!anyClusterChanged && !forceRepack) {
    parts.forEach(p => {
      p.count = prevVisibleCount;
      p.instanceMatrix.needsUpdate = false;
    });
    return prevVisibleCount;
  }

  let slot = 0;
  let perInstanceCulled = 0;
  let totalInVisibleClusters = 0;
  let debugSampled = false;
  logicalToRenderSlot.fill(-1);
  for (let ci = 0; ci < clusters.length; ci++) {
    if (clusterVisibilityCache[ci] === 1) totalInVisibleClusters += clusters[ci].indices.length;
  }

  for (let ci = 0; ci < clusters.length; ci++) {
    if (clusterVisibilityCache[ci] !== 1) continue;
    const { indices } = clusters[ci];
    for (let k = 0; k < indices.length; k++) {
      const logIdx = indices[k];
      if (filterFn && !filterFn(logIdx)) continue;

      scratchMatrix.fromArray(baseMatrices, logIdx * 16);
      if (geomCenterLocal) {
        scratchSphere.center.copy(geomCenterLocal).applyMatrix4(scratchMatrix);
      } else {
        scratchSphere.center.setFromMatrixPosition(scratchMatrix);
      }
      scratchSphere.radius = instanceCullRadius;

      const passes = frustum.intersectsSphere(scratchSphere);
      if (!debugSampled) {
        debugSampled = true;
        const pos = new THREE.Vector3().setFromMatrixPosition(scratchMatrix);
      }

      if (!passes) {
        perInstanceCulled++;
        continue;
      }

      parts.forEach(p => p.setMatrixAt(slot, scratchMatrix));
      renderSlotToLogical[slot] = logIdx;
      logicalToRenderSlot[logIdx] = slot;
      slot++;
    }
  }

  const needsUpdate = slot !== prevVisibleCount || anyClusterChanged || forceRepack;
  parts.forEach(p => {
    p.count = slot;
    p.instanceMatrix.needsUpdate = needsUpdate;
  });

  return slot;
}
