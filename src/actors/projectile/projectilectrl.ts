// projectilectrl.ts
import * as THREE from "three";
import { IProjectileModel } from "./projectile";
import { AttackType } from "@Glibs/types/playertypes";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "../battle/basespec";
import { StatKey } from "@Glibs/types/stattypes";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { VirtualActorFactory } from "../battle/virtualactorfab";
import { MonsterId } from "@Glibs/types/monstertypes";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { ProjectileDamageType } from "./projectiletypes";
import { GetHorizontalDistanceToBoxSurface } from "@Glibs/actors/battle/meleecombat";
import { getCombatObstacleBounds, isCombatObstacle } from "@Glibs/actors/battle/combatobstacle";

const COMBAT_COLLISION_DEBUG = false;

type ProjectileDebugUserData = {
  staticColliderKind?: unknown;
  staticColliderId?: unknown;
  buildingId?: unknown;
  targetMeta?: unknown;
  excludeFromPhysicsTargets?: unknown;
};

enum ProjectileHitKind {
  Target = "target",
  Obstacle = "obstacle",
}

type ProjectileHit = {
  target: THREE.Object3D;
  hitPoint: THREE.Vector3;
  distance: number;
  normal?: THREE.Vector3;
  kind: ProjectileHitKind;
};

export class ProjectileCtrl implements IActionUser {
  private static readonly PROJECTILE_OBSTACLE_PADDING = 0.2;
  private static readonly PROJECTILE_HIT_LOG_THROTTLE_MS = 1000;
  private static readonly projectileHitLogTimes = new Map<string, number>();

  raycast = new THREE.Raycaster();
  moveDirection = new THREE.Vector3();
  prevPosition = new THREE.Vector3();
  position = new THREE.Vector3();

  attackDist = 1;
  maxTarget = 1;
  currenttime = 0;
  live = false;
  damage = 1;
  damageType = ProjectileDamageType.Physical;
  moving = 0;

  creatorSpec?: BaseSpec;

  // ⚠️ 기존 코드의 필드 초기화에서 this.stats를 쓰면 undefined일 수 있어
  // ctor에서 초기화하도록 수정
  baseSpec: BaseSpec;

  get Live() { return this.live; }

  // IActionUser에서 쓰일 수 있는 objs(ProjectileModel의 Meshs)
  get objs(): THREE.Object3D | undefined {
    return (this.projectile.Meshs as unknown as THREE.Object3D) ?? undefined;
  }

  constructor(
    private projectile: IProjectileModel,
    private targetRegistry: TargetRegistrySystem,
    private physicList: THREE.Object3D[],
    private eventCtrl: IEventController,
    private range: number,
    private stats: Partial<Record<StatKey, number>>,
    private projectileId?: MonsterId,
  ) {
    this.baseSpec = new BaseSpec(this.stats, this);
  }

  // ---------- (2) hitscan 지원 필드 ----------
  private isHitscan = false;
  private life = 0;
  private lifeMax = 0.08;
  private tracerRange?: number;
  private hasAttacked = false;
  private useRaycast = false;

  // 유도탄 지원 필드
  private homingActive = false;
  private homingTurnRate = 6.5;
  private homingTarget: THREE.Object3D | null = null;
  private readonly closestPoint = new THREE.Vector3();
  private readonly tmpBox = new THREE.Box3();
  private readonly tmpExpandedBox = new THREE.Box3();


  applyAction(action: IActionComponent, ctx?: ActionContext) {
    action.apply?.(this, ctx);
    action.activate?.(this, ctx);
  }

  removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
    action.deactivate?.(this, context);
    action.remove?.(this);
  }

  Release() {
    this.projectile.release();
    this.live = false;
    this.moving = 0;

    // hitscan 상태 리셋
    this.isHitscan = false;
    this.life = 0;
    this.lifeMax = 0.08;
    this.tracerRange = undefined;
    this.hasAttacked = false;
    this.useRaycast = false;
    this.damageType = ProjectileDamageType.Physical;

    this.homingActive = false;
    this.homingTarget = null;
  }

  start(
    src: THREE.Vector3,
    dir: THREE.Vector3,
    damage: number,
    damageType: ProjectileDamageType | undefined,
    spec: BaseSpec,
    opt?: { homing?: boolean; hitscan?: boolean; tracerLife?: number; tracerRange?: number; useRaycast?: boolean }
  ) {
    this.position.copy(src);
    this.prevPosition.copy(src);

    // direction 보정
    const d = dir.clone();
    this.moveDirection.copy(d);

    this.projectile.create(src, d);

    this.live = true;
    this.currenttime = 0;
    this.damage = damage;
    this.damageType = damageType ?? ProjectileDamageType.Physical;
    this.moving = 0;
    this.creatorSpec = spec;
    this.attackDist = Math.max(0.5, this.baseSpec.AttackRange);

    // hitscan 파라미터
    this.isHitscan = !!opt?.hitscan;
    this.life = 0;
    this.lifeMax = opt?.tracerLife ?? 0.08;
    this.tracerRange = opt?.tracerRange;
    this.hasAttacked = false;
    this.useRaycast = !!opt?.useRaycast;

    this.homingActive = opt?.homing ?? (this.projectileId === MonsterId.EnergyHoming);
    this.homingTarget = this.homingActive ? this.findHomingTarget() : null;

    if (this.isHitscan) {
      // end 확정
      const nd = d.lengthSq() < 1e-8 ? new THREE.Vector3(0, 0, 1) : d.clone().normalize();
      this.moveDirection.copy(nd);

      this.position.copy(src).addScaledVector(nd, this.tracerRange ?? this.range);

      // 트레이서 모델이라면 end까지 즉시 갱신
      this.projectile.update(this.position);

      // hitscan은 start에서 1회 공격 처리(즉발)
      this.doHitscanAttackOnce();
    }
  }

  checkLifeTime(): boolean {
    if (this.isHitscan) return this.life < this.lifeMax;
    return this.moving < this.range;
  }

  update(delta: number): void {
    if (!this.live) return;

    if (this.isHitscan) {
      this.life += delta;
      this.currenttime += delta;

      // 라스건 플리커 같은 연출이 있으면 여기서 update 유지
      this.projectile.update(this.position);
      return;
    }

    if (this.homingActive) {
      const hostileTargets = this.getHostileTargets()
      if (!this.homingTarget || !hostileTargets.includes(this.homingTarget)) {
        this.homingTarget = this.findHomingTarget();
      }

      if (this.homingTarget) {
        const toTarget = new THREE.Vector3().subVectors(this.homingTarget.position, this.position);
        if (toTarget.lengthSq() > 1e-6) {
          const desired = toTarget.normalize();
          const current = this.moveDirection.lengthSq() > 1e-6
            ? this.moveDirection.clone().normalize()
            : desired.clone();
          const steer = THREE.MathUtils.clamp(this.homingTurnRate * delta, 0, 1);
          current.lerp(desired, steer).normalize();
          const speedMag = Math.max(0.0001, this.moveDirection.length());
          this.moveDirection.copy(current.multiplyScalar(speedMag));
        }
      }
    }

    const dirLen = this.moveDirection.length();
    if (dirLen <= 0.000001) return;

    const projectileSpeedBonus = this.creatorSpec?.stats.getStat("projectileSpeed") ?? 0;
    const projectileSpeedMultiplier = Math.max(0.1, 1 + projectileSpeedBonus);

    const speed =
      Math.max(0.1, this.baseSpec.Speed) *
      Math.max(0.1, dirLen) *
      projectileSpeedMultiplier;

    const mov = speed * delta;

    this.currenttime += delta;
    this.moving += mov;

    this.prevPosition.copy(this.position);
    this.position.addScaledVector(this.moveDirection, mov / dirLen);

    this.projectile.update(this.position);
  }

  attack() {
    // hitscan은 start에서 공격을 끝내므로 루프에서 재공격 방지
    if (this.isHitscan) return false;

    if (!this.live || !this.creatorSpec) return false;

    const targets = this.getCollisionTargets();
    const obj = this.getClosestHit(
      this.prevPosition,
      this.position,
      targets,
      this.attackDist
    );

    if (obj != null) {
      const k = this.getTargetEventId(obj.target);
      const v = {
        type: AttackType.RangedShot,
        spec: VirtualActorFactory.createFusionActor(this.creatorSpec!, [this.baseSpec]),
        damage: this.damage,
        damageType: this.damageType,
        obj: obj.target,
      };

      const normal = obj.normal ?? new THREE.Vector3().subVectors(obj.hitPoint, obj.target.position).normalize();
      this.projectile.hit?.(obj.hitPoint, normal);

      if (obj.kind === ProjectileHitKind.Target && k) {
        this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [v]);
      }
      return true;
    }

    return false;
  }

  // hitscan 전용: start에서 1회 즉발
  private doHitscanAttackOnce() {
    if (!this.live || !this.creatorSpec) return;
    if (this.hasAttacked) return;
    this.hasAttacked = true;

    const hit = this.useRaycast
      ? this.getRaycastHit()
      : this.getClosestHit(this.prevPosition, this.position, this.getCollisionTargets(), this.attackDist);

    if (!hit) return;

    // hitscan이면 end 지점을 hitPoint로 고정
    this.position.copy(hit.hitPoint);
    this.projectile.update(this.position);

    const k = this.getTargetEventId(hit.target);
    const v = {
      type: AttackType.RangedShot,
      spec: VirtualActorFactory.createFusionActor(this.creatorSpec!, [this.baseSpec]),
      damage: this.damage,
      damageType: this.damageType,
      obj: hit.target,
    };

    const normal = hit.normal ?? new THREE.Vector3().subVectors(hit.hitPoint, hit.target.position).normalize();
    this.projectile.hit?.(hit.hitPoint, normal);

    if (hit.kind === ProjectileHitKind.Target && k) {
      this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [v]);
    }
  }

  // Ray + Box3 정밀 판정 (invisible 메시에서도 동작)
  private getRaycastHit(): ProjectileHit | null {
    const origin = this.prevPosition.clone();
    const direction = this.moveDirection.clone().normalize();
    const ray = new THREE.Ray(origin, direction);

    let closest: ProjectileHit | null = null;
    const targets = this.getCollisionTargets();
    const targetIds = this.getTargetIds(targets);

    for (const target of targets) {
      if (this.isOwnerOrSelfTarget(target)) continue;

      const hit = this.getRayBoxHit(ray, origin, target, ProjectileHitKind.Target);
      if (!hit) continue;

      if (!closest || hit.distance < closest.distance) {
        closest = hit;
      }
    }

    for (const target of this.physicList) {
      if (this.isOwnerOrSelfTarget(target)) continue;
      if (!isCombatObstacle(target, this.targetRegistry)) continue;
      if (this.isAlreadyHandledAsTarget(target, targetIds, targets)) continue;

      const hit = this.getRayBoxHit(ray, origin, target, ProjectileHitKind.Obstacle);
      if (!hit) continue;

      if (!closest || hit.distance < closest.distance) {
        closest = hit;
      }
    }

    if (closest?.kind === ProjectileHitKind.Obstacle) {
      this.logProjectilePhysicsHit(closest, this.prevPosition, this.position, ProjectileCtrl.PROJECTILE_OBSTACLE_PADDING);
    }

    return closest;
  }

  private getRayBoxHit(
    ray: THREE.Ray,
    origin: THREE.Vector3,
    target: THREE.Object3D,
    kind: ProjectileHitKind,
  ): ProjectileHit | null {
    const box = kind === ProjectileHitKind.Obstacle
      ? getCombatObstacleBounds(target, this.tmpBox, this.targetRegistry)
      : this.getTargetBounds(target);
    if (box.isEmpty()) return null;

    const hitBox = kind === ProjectileHitKind.Obstacle
      ? this.tmpExpandedBox.copy(box).expandByScalar(ProjectileCtrl.PROJECTILE_OBSTACLE_PADDING)
      : box;
    const hitPoint = new THREE.Vector3();
    if (!ray.intersectBox(hitBox, hitPoint)) return null;

    const distance = origin.distanceTo(hitPoint);
    if (distance > this.range) return null;

    return {
      target,
      hitPoint,
      distance,
      normal: this.getBoxNormal(box, hitPoint),
      kind,
    };
  }

  private getTargetIds(targets: THREE.Object3D[]): Set<string> {
    const ids = new Set<string>();
    for (const target of targets) {
      const id = this.targetRegistry.getByObject(target)?.id;
      if (id) ids.add(id);
    }
    return ids;
  }

  private isAlreadyHandledAsTarget(
    obstacle: THREE.Object3D,
    targetIds: Set<string>,
    targets: THREE.Object3D[],
  ): boolean {
    if (targets.some((target) => target === obstacle)) return true;

    const obstacleRecord = this.targetRegistry.getByObject(obstacle);
    return obstacleRecord?.id !== undefined && targetIds.has(obstacleRecord.id);
  }

  // (기존 코드 유지) 필요 시 라인 히트용
  getLineHit() {
    const msgs = new Map();
    this.getCollisionTargets().forEach((obj) => {
      const isHit = this.segmentIntersectsSphere(
        this.prevPosition,
        this.position,
        obj.position,
        this.attackDist
      );
      if (!isHit) return;

      const mons = msgs.get(obj.name);
      const msg = {
        type: AttackType.NormalSwing,
        spec: [this.creatorSpec, this.baseSpec],
        damage: this.damage,
        obj: obj,
      };

      if (mons == undefined) msgs.set(obj.name, [msg]);
      else mons.push(msg);
    });
    return msgs;
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
    const segDir = segLength <= 1e-8 ? new THREE.Vector3(0, 0, 1) : seg.clone().normalize();
    const proj = toCenter.dot(segDir);

    let closest: THREE.Vector3;
    if (proj < 0) closest = p1.clone();
    else if (proj > segLength) closest = p2.clone();
    else closest = p1.clone().add(segDir.multiplyScalar(proj));

    return closest.distanceTo(sphereCenter) <= sphereRadius;
  }

  private getTargetRadius(target: THREE.Object3D): number {
    const box = this.getTargetBounds(target);
    if (box.isEmpty()) return 0;

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    return Math.max(0, sphere.radius);
  }

  private isOwnerOrSelfTarget(target: THREE.Object3D): boolean {
    const projectileMesh = this.projectile.Meshs as unknown as THREE.Object3D | undefined;
    if (projectileMesh && (target === projectileMesh || target.parent === projectileMesh)) {
      return true;
    }

    const ownerObj = this.creatorSpec?.Owner?.objs as unknown as THREE.Object3D | undefined;
    if (!ownerObj) return false;

    // 이름 기반 비교 (빈 문자열 제외)
    if (target.name !== "" && target.name === ownerObj.name) {
      return true;
    }

    let current: THREE.Object3D | null = target;
    while (current) {
      if (current === ownerObj) {
        return true;
      }
      if (current.name !== "" && current.name === ownerObj.name) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  private findHomingTarget(): THREE.Object3D | null {
    let nearest: THREE.Object3D | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const target of this.getHostileTargets()) {
      if (this.isOwnerOrSelfTarget(target)) continue;

      const dist = this.getHorizontalDistanceToTargetSurface(this.position, target);
      if (dist > this.range) continue;

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = target;
      }
    }

    return nearest;
  }

  private getClosestPointOnSegment(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    point: THREE.Vector3
  ): THREE.Vector3 {
    const seg = new THREE.Vector3().subVectors(p2, p1);
    const segLength = seg.length();
    if (segLength <= 0.000001) return p1.clone();

    const segDir = seg.clone().divideScalar(segLength);
    const toPoint = new THREE.Vector3().subVectors(point, p1);
    const projLen = THREE.MathUtils.clamp(toPoint.dot(segDir), 0, segLength);
    return p1.clone().addScaledVector(segDir, projLen);
  }

  getClosestHit(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    targets: THREE.Object3D[],
    radius = 1
  ): ProjectileHit | null {
    let closest: ProjectileHit | null = null;
    const targetIds = this.getTargetIds(targets);

    for (const target of targets) {
      const hit = this.getTargetHit(p1, p2, target, radius);
      if (!hit) continue;

      if (!closest || hit.distance < closest.distance) {
        closest = hit;
      }
    }

    for (const obstacle of this.physicList) {
      const hit = this.getObstacleHit(p1, p2, obstacle, targetIds, targets);
      if (!hit) continue;

      if (!closest || hit.distance < closest.distance) {
        closest = hit;
      }
    }

    if (closest?.kind === ProjectileHitKind.Obstacle) {
      this.logProjectilePhysicsHit(closest, p1, p2, ProjectileCtrl.PROJECTILE_OBSTACLE_PADDING);
    }

    return closest;
  }

  private getTargetHit(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    target: THREE.Object3D,
    radius: number,
  ): ProjectileHit | null {
    const dis = this.getHorizontalDistanceToTargetSurface(p1, target);
    if (dis > this.range) return null;

    if (this.isOwnerOrSelfTarget(target)) return null;

    const boxHit = this.getSegmentBoxHit(p1, p2, target, radius, ProjectileHitKind.Target);
    if (boxHit) return boxHit;

    const center = target.position;
    const closestPoint = this.getClosestPointOnSegment(p1, p2, center);
    const distToCenter = closestPoint.distanceTo(center);
    const targetRadius = this.getTargetRadius(target) + radius;

    if (distToCenter > targetRadius) return null;

    return {
      target,
      hitPoint: closestPoint,
      distance: p1.distanceTo(closestPoint),
      kind: ProjectileHitKind.Target,
    };
  }

  private getObstacleHit(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    obstacle: THREE.Object3D,
    targetIds: Set<string>,
    targets: THREE.Object3D[],
  ): ProjectileHit | null {
    if (this.isOwnerOrSelfTarget(obstacle)) return null;
    if (!isCombatObstacle(obstacle, this.targetRegistry)) return null;
    if (this.isAlreadyHandledAsTarget(obstacle, targetIds, targets)) return null;

    const dis = this.getHorizontalDistanceToTargetSurface(p1, obstacle);
    if (dis > this.range) return null;

    return this.getSegmentBoxHit(
      p1,
      p2,
      obstacle,
      ProjectileCtrl.PROJECTILE_OBSTACLE_PADDING,
      ProjectileHitKind.Obstacle,
    );
  }

  private getTargetBounds(target: THREE.Object3D): THREE.Box3 {
    const record = this.targetRegistry.getByObject(target);
    const targetMetaKind = target.userData?.targetMeta?.kind as string | undefined;
    if (record?.kind === "structure" || targetMetaKind === "structure") {
      const registryBounds = record?.bounds;
      if (registryBounds && !registryBounds.isEmpty()) return registryBounds;

      const userBounds = target.userData?.bounds as THREE.Box3 | undefined;
      if (userBounds && !userBounds.isEmpty()) return userBounds;
    }

    return this.tmpBox.setFromObject(target);
  }

  private getHorizontalDistanceToTargetSurface(origin: THREE.Vector3, target: THREE.Object3D): number {
    const bounds = this.getTargetBounds(target);
    return GetHorizontalDistanceToBoxSurface(origin, bounds, target.position, this.closestPoint);
  }

  private getSegmentBoxHit(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    target: THREE.Object3D,
    radius: number,
    kind: ProjectileHitKind,
  ): ProjectileHit | null {
    const bounds = kind === ProjectileHitKind.Obstacle
      ? getCombatObstacleBounds(target, this.tmpBox, this.targetRegistry)
      : this.getTargetBounds(target);
    if (bounds.isEmpty()) return null;

    const expandedBox = this.tmpExpandedBox.copy(bounds).expandByScalar(radius);
    if (expandedBox.containsPoint(p1)) {
      return {
        target,
        hitPoint: p1.clone(),
        distance: 0,
        normal: this.getBoxNormal(bounds, p1),
        kind,
      };
    }

    const seg = new THREE.Vector3().subVectors(p2, p1);
    const segLength = seg.length();
    if (segLength <= 0.000001) return null;

    const ray = new THREE.Ray(p1, seg.clone().divideScalar(segLength));
    const hitPoint = new THREE.Vector3();
    if (!ray.intersectBox(expandedBox, hitPoint)) return null;

    const distance = p1.distanceTo(hitPoint);
    if (distance > segLength || distance > this.range) return null;

    return {
      target,
      hitPoint,
      distance,
      normal: this.getBoxNormal(bounds, hitPoint),
      kind,
    };
  }

  private getBoxNormal(box: THREE.Box3, point: THREE.Vector3): THREE.Vector3 {
    if (box.isEmpty()) return new THREE.Vector3(0, 1, 0);

    const clampedPoint = box.clampPoint(point, new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const halfSize = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const localHit = clampedPoint.sub(center);

    const dx = halfSize.x > 0 ? Math.abs(localHit.x / halfSize.x) : 0;
    const dy = halfSize.y > 0 ? Math.abs(localHit.y / halfSize.y) : 0;
    const dz = halfSize.z > 0 ? Math.abs(localHit.z / halfSize.z) : 0;

    if (dx > dy && dx > dz) return new THREE.Vector3(localHit.x >= 0 ? 1 : -1, 0, 0);
    if (dy > dz) return new THREE.Vector3(0, localHit.y >= 0 ? 1 : -1, 0);
    return new THREE.Vector3(0, 0, localHit.z >= 0 ? 1 : -1);
  }

  private logProjectilePhysicsHit(
    hit: ProjectileHit,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number,
  ): void {
    if (!COMBAT_COLLISION_DEBUG) return;

    const key = `${this.projectileId ?? "unknown"}:${hit.target.uuid}`;
    const now = Date.now();
    const last = ProjectileCtrl.projectileHitLogTimes.get(key) ?? 0;
    if (now - last < ProjectileCtrl.PROJECTILE_HIT_LOG_THROTTLE_MS) return;
    ProjectileCtrl.projectileHitLogTimes.set(key, now);

    const bounds = hit.kind === ProjectileHitKind.Obstacle
      ? getCombatObstacleBounds(hit.target, this.tmpBox, this.targetRegistry)
      : this.getTargetBounds(hit.target);
    const containsPoint = !bounds.isEmpty()
      ? this.tmpExpandedBox.copy(bounds).expandByScalar(radius).containsPoint(p1)
      : false;
    const userData = hit.target.userData as ProjectileDebugUserData;
    const record = this.targetRegistry.getByObject(hit.target);
    const ownerObj = this.creatorSpec?.Owner?.objs as THREE.Object3D | undefined;
    const owner = this.creatorSpec?.Owner as ({ TargetId?: string; name?: string } & IActionUser) | undefined;

    console.warn("[CombatDebug] ProjectilePhysicsHit", {
      projectileId: this.projectileId,
      owner: {
        id: owner?.TargetId,
        name: owner?.name,
        objectName: ownerObj?.name,
        objectUuid: ownerObj?.uuid,
      },
      target: {
        name: hit.target.name,
        uuid: hit.target.uuid,
        type: hit.target.type,
        isCollisionTarget: hit.kind === ProjectileHitKind.Target,
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
        userData: {
          staticColliderKind: userData.staticColliderKind,
          staticColliderId: userData.staticColliderId,
          buildingId: userData.buildingId,
          targetMeta: userData.targetMeta,
          excludeFromPhysicsTargets: userData.excludeFromPhysicsTargets,
        },
      },
      hitPoint: hit.hitPoint.toArray(),
      distance: hit.distance,
      immediate: hit.distance <= 0.000001,
      containsPoint,
      p1: p1.toArray(),
      p2: p2.toArray(),
      radius,
      bounds: bounds.isEmpty()
        ? undefined
        : {
            min: bounds.min.toArray(),
            max: bounds.max.toArray(),
          },
    });
  }

  private getCollisionTargets() {
    const ownerObj = this.creatorSpec?.Owner?.objs as THREE.Object3D | undefined
    const ownerRecord = ownerObj ? this.targetRegistry.getByObject(ownerObj) : undefined
    if (ownerRecord?.teamId) {
      return this.targetRegistry.getObjectsForTeam(ownerRecord.teamId, "enemy", {
        aliveOnly: true,
        targetableOnly: true,
        collidableOnly: true,
      })
    }

    return this.targetRegistry.getObjects({
      aliveOnly: true,
      targetableOnly: true,
      collidableOnly: true,
    })
  }

  private getHostileTargets() {
    const ownerObj = this.creatorSpec?.Owner?.objs as THREE.Object3D | undefined
    const ownerRecord = ownerObj ? this.targetRegistry.getByObject(ownerObj) : undefined
    if (!ownerRecord?.teamId) {
      return this.getCollisionTargets()
    }

    return this.targetRegistry.getObjectsForTeam(ownerRecord.teamId, "enemy", {
      aliveOnly: true,
      targetableOnly: true,
      collidableOnly: true,
    })
  }

  private getTargetEventId(target: THREE.Object3D): string | undefined {
    return this.targetRegistry.getByObject(target)?.id || target.name || undefined
  }
}
