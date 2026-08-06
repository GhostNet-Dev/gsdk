import * as THREE from "three";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { CombatObstacleUserData, getCombatObstacleBounds, isCombatObstacle } from "./combatobstacle";

const COMBAT_COLLISION_DEBUG = false;

export type LineOfSightOptions = {
    ignoreObject?: THREE.Object3D;
    ignoreObjects?: THREE.Object3D[];
    ignoreStructureId?: string;
    targetRegistry?: TargetRegistrySystem;
    debugLabel?: string;
};

export class LineOfSightTester {
    private static readonly LOG_THROTTLE_MS = 1000;
    private static readonly logTimes = new Map<string, number>();

    private readonly tempSeg = new THREE.Vector3();
    private readonly tempDir = new THREE.Vector3();
    private readonly tempHitPoint = new THREE.Vector3();
    private readonly tempBox = new THREE.Box3();
    private readonly tempExpandedBox = new THREE.Box3();

    isBlocked(
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        blockers: THREE.Object3D[],
        radius = 1,
        options: LineOfSightOptions = {},
    ): boolean {
        const seg = this.tempSeg.subVectors(p2, p1);
        const segLength = seg.length();
        if (segLength <= 0.000001) return false;

        const ray = new THREE.Ray(p1, this.tempDir.copy(seg).divideScalar(segLength));

        for (const blocker of blockers) {
            if (this.shouldIgnoreObject(blocker, options)) continue;
            if (!isCombatObstacle(blocker, options.targetRegistry)) continue;
            if (options.ignoreStructureId && this.isSameStructureCollider(blocker, options.ignoreStructureId, options.targetRegistry)) {
                continue;
            }

            const box = this.getTargetBounds(blocker, options.targetRegistry);
            if (box.isEmpty()) continue;

            this.tempExpandedBox.copy(box).expandByScalar(radius);
            if (this.tempExpandedBox.containsPoint(p1)) {
                this.logBlocked("containsPoint", blocker, box, p1, p2, radius, options);
                return true;
            }

            if (!ray.intersectBox(this.tempExpandedBox, this.tempHitPoint)) continue;
            if (p1.distanceTo(this.tempHitPoint) <= segLength) {
                this.logBlocked("intersectBox", blocker, box, p1, p2, radius, options);
                return true;
            }
        }

        return false;
    }

    private shouldIgnoreObject(candidate: THREE.Object3D, options: LineOfSightOptions): boolean {
        if (options.ignoreObject && this.isObjectOrChild(candidate, options.ignoreObject)) return true;
        return options.ignoreObjects?.some((ignoreObject) => this.isObjectOrChild(candidate, ignoreObject)) ?? false;
    }

    private getTargetBounds(target: THREE.Object3D, targetRegistry?: TargetRegistrySystem): THREE.Box3 {
        return getCombatObstacleBounds(target, this.tempBox, targetRegistry);
    }

    private logBlocked(
        reason: "containsPoint" | "intersectBox",
        blocker: THREE.Object3D,
        box: THREE.Box3,
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        radius: number,
        options: LineOfSightOptions,
    ): void {
        if (!COMBAT_COLLISION_DEBUG) return;

        const label = options.debugLabel ?? "los";
        const key = `${label}:${blocker.uuid}:${reason}`;
        const now = Date.now();
        const last = LineOfSightTester.logTimes.get(key) ?? 0;
        if (now - last < LineOfSightTester.LOG_THROTTLE_MS) return;
        LineOfSightTester.logTimes.set(key, now);

        const userData = blocker.userData as CombatObstacleUserData;
        const record = options.targetRegistry?.getByObject(blocker);

        console.info("[CombatDebug] LOSBlocked", {
            label,
            reason,
            blocker: {
                name: blocker.name,
                uuid: blocker.uuid,
                type: blocker.type,
                staticColliderKind: userData.staticColliderKind,
                staticColliderId: userData.staticColliderId,
                buildingId: userData.buildingId,
                targetMeta: userData.targetMeta,
                registryRecord: record
                    ? {
                        id: record.id,
                        kind: record.kind,
                        teamId: record.teamId,
                        alive: record.alive,
                        targetable: record.targetable,
                        collidable: record.collidable,
                    }
                    : undefined,
            },
            p1: p1.toArray(),
            p2: p2.toArray(),
            radius,
            box: {
                min: box.min.toArray(),
                max: box.max.toArray(),
            },
        });
    }

    private isSameStructureCollider(
        candidate: THREE.Object3D,
        structureId: string,
        targetRegistry?: TargetRegistrySystem,
    ): boolean {
        let current: THREE.Object3D | null = candidate;
        while (current) {
            const userData = current.userData as CombatObstacleUserData;
            if (userData.staticColliderId === structureId) return true;
            if (userData.buildingId === structureId) return true;
            if (userData.targetMeta?.id === structureId) return true;
            if (targetRegistry?.getByObject(current)?.id === structureId) return true;
            current = current.parent;
        }

        return false;
    }

    private isObjectOrChild(candidate: THREE.Object3D, parent: THREE.Object3D): boolean {
        let current: THREE.Object3D | null = candidate;
        while (current) {
            if (current === parent) return true;
            current = current.parent;
        }
        return false;
    }
}
