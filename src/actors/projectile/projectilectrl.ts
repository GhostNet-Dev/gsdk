import * as THREE from "three";
import { IProjectileModel } from "./projectile";
import { AttackType } from "@Glibs/types/playertypes";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "../battle/basespec";
import { StatKey } from "@Glibs/types/stattypes";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { VirtualActorFactory } from "../battle/virtualactorfab";



export class ProjectileCtrl implements IActionUser {
    raycast = new THREE.Raycaster()
    moveDirection = new THREE.Vector3()
    prevPosition = new THREE.Vector3()
    position = new THREE.Vector3()
    attackDist = 1
    maxTarget = 1
    currenttime = 0
    live = false
    damage = 1
    moving = 0
    creatorSpec?: BaseSpec
    baseSpec: BaseSpec = new BaseSpec(this.stats, this)
    get Live() { return this.live }
    get objs() { return this.projectile.Meshs as THREE.Mesh }
    
    constructor(
        private projectile: IProjectileModel,
        private targetList: THREE.Object3D[],
        private eventCtrl: IEventController,
        private range: number,
        private stats: Partial<Record<StatKey, number>>,
    ){
    }
    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }
    Release () {
        this.projectile.release()
        this.live = false
        this.moving = 0
    }
    start(src: THREE.Vector3, dir: THREE.Vector3, damage: number, spec: BaseSpec) {
        this.position.copy(src)
        this.prevPosition.copy(src)
        this.moveDirection.copy(dir)
        this.projectile.create(src, dir)
        this.live = true
        this.currenttime = 0
        this.damage = damage
        this.moving = 0
        this.creatorSpec = spec
        this.attackDist = Math.max(0.5, spec.AttackRange)
    }
    checkLifeTime(): boolean {
        return this.moving < this.range
    }
    update(delta: number): void {
        if (!this.live) return
        const dirLen = this.moveDirection.length()
        if (dirLen <= 0.000001) return

        const projectileSpeedBonus = this.creatorSpec?.stats.getStat("projectileSpeed") ?? 0
        const projectileSpeedMultiplier = Math.max(0.1, 1 + projectileSpeedBonus)
        const speed = Math.max(0.1, this.baseSpec.Speed) * Math.max(0.1, dirLen) * projectileSpeedMultiplier
        const mov = speed * delta
        this.currenttime += delta
        this.moving += mov
        this.prevPosition.copy(this.position)
        this.position.addScaledVector(this.moveDirection, mov / dirLen);

        this.projectile.update(this.position)
    }
    attack() {
        if (!this.live || !this.creatorSpec) return false
        if (true) {
            const obj = this.getClosestHit(this.prevPosition, this.position, 
                this.targetList, this.attackDist)
            if (obj != null) {
                const k = obj.target.name
                const v = {
                    type: AttackType.NormalSwing,
                    spec: VirtualActorFactory.createFusionActor(this.baseSpec, [this.creatorSpec]),
                    damage: this.damage,
                    obj: obj.target
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [v])
                return true
            }
        } else {
            const msgs = this.getLineHit()
            if (msgs.size > 0) {
                msgs.forEach((v, k) => {
                    this.eventCtrl.SendEventMessage(EventTypes.Attack + k, v)
                })
                return true
            }
        }

        return false
    }
    getLineHit() {
        const msgs = new Map()
        this.targetList.forEach(obj => {
            const isHit = this.segmentIntersectsSphere(this.prevPosition, this.position, obj.position, this.attackDist)
            if(!isHit) return
            const mons = msgs.get(obj.name)
            const msg = {
                type: AttackType.NormalSwing,
                spec: [this.creatorSpec, this.baseSpec],
                damage: this.damage,
                obj: obj
            }
            if (mons == undefined) {
                msgs.set(obj.name, [msg])
            } else {
                mons.push(msg)
            }
        })
        return msgs
    }
    segmentIntersectsSphere(
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        sphereCenter: THREE.Vector3,
        sphereRadius: number
    ): boolean {
        const seg = new THREE.Vector3().subVectors(p2, p1);
        const toCenter = new THREE.Vector3().subVectors(sphereCenter, p1);

        const segLength = seg.length();
        const segDir = seg.clone().normalize();
        const proj = toCenter.dot(segDir); // 투영

        let closest;
        if (proj < 0) closest = p1.clone();
        else if (proj > segLength) closest = p2.clone();
        else closest = p1.clone().add(segDir.multiplyScalar(proj));

        return closest.distanceTo(sphereCenter) <= sphereRadius;
    }

    private getTargetRadius(target: THREE.Object3D): number {
        const box = new THREE.Box3().setFromObject(target)
        if (box.isEmpty()) return 0

        const sphere = box.getBoundingSphere(new THREE.Sphere())
        return Math.max(0, sphere.radius)
    }
    private isOwnerOrSelfTarget(target: THREE.Object3D): boolean {
        const projectileMesh = this.projectile.Meshs
        if (projectileMesh && (target === projectileMesh || target.parent === projectileMesh)) {
            return true
        }

        const ownerObj = this.creatorSpec?.Owner?.objs
        if (!ownerObj) return false

        let current: THREE.Object3D | null = target
        while (current) {
            if (current === ownerObj) return true
            current = current.parent
        }

        return false
    }

    private getClosestPointOnSegment(
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        point: THREE.Vector3,
    ): THREE.Vector3 {
        const seg = new THREE.Vector3().subVectors(p2, p1)
        const segLength = seg.length()
        if (segLength <= 0.000001) return p1.clone()

        const segDir = seg.clone().divideScalar(segLength)
        const toPoint = new THREE.Vector3().subVectors(point, p1)
        const projLen = THREE.MathUtils.clamp(toPoint.dot(segDir), 0, segLength)
        return p1.clone().addScaledVector(segDir, projLen)
    }

    getClosestHit(
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        targets: THREE.Object3D[],
        radius = 1
    ): { target: THREE.Object3D, hitPoint: THREE.Vector3, distance: number } | null {
        let closest: { target: THREE.Object3D, hitPoint: THREE.Vector3, distance: number } | null = null;

        for (const target of targets) {
            const dis = p1.distanceTo(target.position);
            if(dis > this.range) continue

            if (this.isOwnerOrSelfTarget(target)) continue

            const center = target.position;
            const closestPoint = this.getClosestPointOnSegment(p1, p2, center)
            const distToCenter = closestPoint.distanceTo(center);
            const targetRadius = this.getTargetRadius(target) + radius;

            if (distToCenter <= targetRadius) {
                const distFromStart = p1.distanceTo(closestPoint);
                if (!closest || distFromStart < closest.distance) {
                    closest = {
                        target,
                        hitPoint: closestPoint,
                        distance: distFromStart
                    };
                }
            }
        }

        return closest;
    }

}