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

export class ProjectileCtrl implements IActionUser {
  raycast = new THREE.Raycaster();
  moveDirection = new THREE.Vector3();
  prevPosition = new THREE.Vector3();
  position = new THREE.Vector3();

  attackDist = 1;
  maxTarget = 1;
  currenttime = 0;
  live = false;
  damage = 1;
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
    private targetList: THREE.Object3D[],
    private eventCtrl: IEventController,
    private range: number,
    private stats: Partial<Record<StatKey, number>>,
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
  }

  start(
    src: THREE.Vector3,
    dir: THREE.Vector3,
    damage: number,
    spec: BaseSpec,
    opt?: { hitscan?: boolean; tracerLife?: number; tracerRange?: number; useRaycast?: boolean }
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
    this.moving = 0;
    this.creatorSpec = spec;
    this.attackDist = Math.max(0.5, spec.AttackRange);

    // hitscan 파라미터
    this.isHitscan = !!opt?.hitscan;
    this.life = 0;
    this.lifeMax = opt?.tracerLife ?? 0.08;
    this.tracerRange = opt?.tracerRange;
    this.hasAttacked = false;
    this.useRaycast = !!opt?.useRaycast;

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

    // 기존: closest hit 1개만 처리
    const obj = this.getClosestHit(
      this.prevPosition,
      this.position,
      this.targetList,
      this.attackDist
    );

    if (obj != null) {
      const k = obj.target.name;
      const v = {
        type: AttackType.NormalSwing,
        spec: VirtualActorFactory.createFusionActor(this.baseSpec, [this.creatorSpec]),
        damage: this.damage,
        obj: obj.target,
      };
      this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [v]);
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
      : this.getClosestHit(this.prevPosition, this.position, this.targetList, this.attackDist);

    if (!hit) return;

    // hitscan이면 end 지점을 hitPoint로 고정
    this.position.copy(hit.hitPoint);
    this.projectile.update(this.position);

    const k = hit.target.name;
    const v = {
      type: AttackType.NormalSwing,
      spec: VirtualActorFactory.createFusionActor(this.baseSpec, [this.creatorSpec]),
      damage: this.damage,
      obj: hit.target,
    };

    this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [v]);
  }

  // Ray + Box3 정밀 판정 (invisible 메시에서도 동작)
  private getRaycastHit(): { target: THREE.Object3D; hitPoint: THREE.Vector3; distance: number } | null {
    const origin = this.prevPosition.clone();
    const direction = this.moveDirection.clone().normalize();
    const ray = new THREE.Ray(origin, direction);

    let closest: { target: THREE.Object3D; hitPoint: THREE.Vector3; distance: number } | null = null;

    for (const target of this.targetList) {
      if (this.isOwnerOrSelfTarget(target)) continue;

      const box = new THREE.Box3().setFromObject(target);
      if (box.isEmpty()) continue;

      const hitPoint = new THREE.Vector3();
      if (!ray.intersectBox(box, hitPoint)) continue;

      const distance = origin.distanceTo(hitPoint);
      if (distance > this.range) continue;

      if (!closest || distance < closest.distance) {
        closest = { target, hitPoint, distance };
      }
    }

    return closest;
  }

  // (기존 코드 유지) 필요 시 라인 히트용
  getLineHit() {
    const msgs = new Map();
    this.targetList.forEach((obj) => {
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
    const box = new THREE.Box3().setFromObject(target);
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

    let current: THREE.Object3D | null = target;
    while (current) {
      if (current === ownerObj) return true;
      current = current.parent;
    }

    return false;
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
  ): { target: THREE.Object3D; hitPoint: THREE.Vector3; distance: number } | null {
    let closest: { target: THREE.Object3D; hitPoint: THREE.Vector3; distance: number } | null = null;

    for (const target of targets) {
      const dis = p1.distanceTo(target.position);
      if (dis > this.range) continue;

      if (this.isOwnerOrSelfTarget(target)) continue;

      const center = target.position;
      const closestPoint = this.getClosestPointOnSegment(p1, p2, center);
      const distToCenter = closestPoint.distanceTo(center);
      const targetRadius = this.getTargetRadius(target) + radius;

      if (distToCenter <= targetRadius) {
        const distFromStart = p1.distanceTo(closestPoint);
        if (!closest || distFromStart < closest.distance) {
          closest = {
            target,
            hitPoint: closestPoint,
            distance: distFromStart,
          };
        }
      }
    }

    return closest;
  }
}