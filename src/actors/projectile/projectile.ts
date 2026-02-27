// projectile.ts
import * as THREE from "three";

import { MonsterId } from "@Glibs/types/monstertypes";
import { Bullet3 } from "./bullet3";
import { DefaultBall } from "./defaultball";
import { ProjectileCtrl } from "./projectilectrl";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BulletLine } from "./bulletline";
import { StatFactory } from "../battle/statfactory";
import { BaseSpec } from "../battle/basespec";
import { FireballModel } from "./fireballmodel";
import { KnifeModel } from "./knifemodel";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";
import { StreakTracerModel } from "./streaktracer";

export interface IProjectileModel {
  get Meshs():
    | THREE.Mesh
    | THREE.Object3D
    | THREE.Points
    | THREE.Line
    | undefined;
  create(position: THREE.Vector3, direction?: THREE.Vector3): void;
  update(position: THREE.Vector3): void;
  release(): void;
  init?(): Promise<void>;
}

type ReleaseAnimatedProjectile = IProjectileModel & {
  updateRelease?: (delta: number) => void;
  isReleaseFinished?: () => boolean;
};

export type ProjectileMsg = {
  id: MonsterId;
  ownerSpec: BaseSpec;
  damage: number;
  src: THREE.Vector3;
  dir: THREE.Vector3;
  range: number;

  // (2) hitscan 지원
  hitscan?: boolean;    // 오토건/라스건 = true
  tracerLife?: number;  // hitscan 트레이서 표시 시간(초) 예: 0.06~0.12
  tracerRange?: number; // hitscan 트레이서 시각 길이(피해 판정 range와 분리)
};

export type ProjectileSet = {
  model: IProjectileModel;
  ctrl: ProjectileCtrl;
  releasing: boolean;

  // async init(예: KnifeModel) 레이스 컨디션 방지
  initializing?: boolean;
  pendingStart?: {
    src: THREE.Vector3;
    dir: THREE.Vector3;
    damage: number;
    ownerSpec: BaseSpec;
    opt?: { hitscan?: boolean; tracerLife?: number; tracerRange?: number };
  };
};

export class Projectile implements ILoop {
  LoopId = 0;
  projectiles = new Map<MonsterId, ProjectileSet[]>();

  constructor(
    private eventCtrl: IEventController,
    private game: THREE.Scene,
    private targetList: THREE.Object3D[],
    private loader?: Loader,
    private camera?: THREE.Camera
  ) {
    eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);

    eventCtrl.RegisterEventListener(EventTypes.Projectile, (opt: ProjectileMsg) => {
      this.AllocateProjPool(opt);
    });
  }

  GetModel(id: MonsterId): IProjectileModel {
    switch (id) {
      case MonsterId.DefaultBullet:
        return new Bullet3();
      case MonsterId.BulletLine:
        return new BulletLine(); // hitscan에서도 사용 가능(다만 Line 두께 한계는 존재)
      case MonsterId.Fireball:
        return new FireballModel();
      case MonsterId.WarhamerTracer:
        return new StreakTracerModel({ camera: this.camera });
      case MonsterId.Knife:
        return new KnifeModel(this.loader?.GetAssets(Char.KayKitAdvDagger));
      case MonsterId.DefaultBall:
      default:
        return new DefaultBall(0.1);
    }
  }

  update(delta: number): void {
    this.projectiles.forEach((pool) => {
      pool.forEach((entry) => {
        // init 중인 세트는 아직 start 전일 수 있으므로 그냥 스킵
        if (entry.initializing) return;

        if (!entry.ctrl.Live && !entry.releasing) return;

        // release 애니메이션(페이드 등)
        if (entry.releasing) {
          const releaseModel = entry.model as ReleaseAnimatedProjectile;
          releaseModel.updateRelease?.(delta);
          if (releaseModel.isReleaseFinished?.() ?? true) {
            this.FinalizeRelease(entry);
          }
          return;
        }

        // 일반 update
        entry.ctrl.update(delta);

        // hitscan이면 attack()은 false(이미 start에서 1회 처리)
        if (entry.ctrl.attack() || !entry.ctrl.checkLifeTime()) {
          this.Release(entry);
        }
      });
    });
  }

  resize(): void { }

  Release(entry: ProjectileSet) {
    entry.ctrl.Release();

    const releaseModel = entry.model as ReleaseAnimatedProjectile;
    if (releaseModel.updateRelease && releaseModel.isReleaseFinished) {
      entry.releasing = true;
      return;
    }

    this.FinalizeRelease(entry);
  }

  FinalizeRelease(entry: ProjectileSet) {
    entry.releasing = false;
    if (entry.model.Meshs) this.game.remove(entry.model.Meshs);
  }

  // -------- 풀 할당 API (호환용 오버로드) --------
  AllocateProjPool(msg: ProjectileMsg): void;
  AllocateProjPool(
    id: MonsterId,
    src: THREE.Vector3,
    dir: THREE.Vector3,
    damage: number,
    ownerSpec: BaseSpec,
    range: number,
    opt?: { hitscan?: boolean; tracerLife?: number; tracerRange?: number }
  ): void;
  AllocateProjPool(
    a: ProjectileMsg | MonsterId,
    src?: THREE.Vector3,
    dir?: THREE.Vector3,
    damage?: number,
    ownerSpec?: BaseSpec,
    range?: number,
    opt?: { hitscan?: boolean; tracerLife?: number; tracerRange?: number }
  ) {
    const msg: ProjectileMsg =
      typeof a === "object" && "id" in a
        ? a
        : ({
          id: a as MonsterId,
          src: src!,
          dir: dir!,
          damage: damage!,
          ownerSpec: ownerSpec!,
          range: range!,
          hitscan: opt?.hitscan,
          tracerLife: opt?.tracerLife,
          tracerRange: opt?.tracerRange,
        } as ProjectileMsg);

    const id = msg.id;
    const startOpt = {
      hitscan: msg.hitscan,
      tracerLife: msg.tracerLife,
      tracerRange: msg.tracerRange,
    };

    let pool = this.projectiles.get(id);
    if (!pool) {
      pool = [];
      this.projectiles.set(id, pool);
    }

    // 1) 사용 가능한(비어있는) 세트 찾기
    let set =
      pool.find((e) => e.ctrl.Live === false && !e.releasing && !e.initializing) ??
      undefined;

    // 2) init 중인 세트가 있으면 거기에 "pendingStart"만 최신으로 덮어쓰기
    if (!set) {
      const initSet = pool.find((e) => e.initializing);
      if (initSet) {
        initSet.pendingStart = {
          src: msg.src.clone(),
          dir: msg.dir.clone(),
          damage: msg.damage,
          ownerSpec: msg.ownerSpec,
          opt: startOpt,
        };
        return;
      }
    }

    // 3) 없으면 새로 생성
    if (!set) {
      const model = this.GetModel(id);
      const stat = StatFactory.getDefaultStats(id as string);
      const ctrl = new ProjectileCtrl(model, this.targetList, this.eventCtrl, msg.range, stat);

      set = { model, ctrl, releasing: false, initializing: false };
      pool.push(set);

      // 비동기 init이 있으면 레이스 방지: initializing 상태로 막아두고 pendingStart 저장
      if (typeof model.init === "function") {
        set.initializing = true;
        set.pendingStart = {
          src: msg.src.clone(),
          dir: msg.dir.clone(),
          damage: msg.damage,
          ownerSpec: msg.ownerSpec,
          opt: startOpt,
        };

        model
          .init()
          .then(() => {
            set!.initializing = false;

            // init 동안 들어온 마지막 발사 요청 실행
            const p = set!.pendingStart;
            set!.pendingStart = undefined;
            if (p) {
              this.startProjectile(set!, p.src, p.dir, p.damage, p.ownerSpec, p.opt);
            }
          })
          .catch((err) => {
            // init 실패 시에도 풀을 막지 않도록 해제
            console.error("Projectile model init failed:", err);
            set!.initializing = false;
            set!.pendingStart = undefined;
          });

        return; // init 완료 후 pendingStart로 start됨
      }
    }

    // 4) 즉시 start
    this.startProjectile(set, msg.src, msg.dir, msg.damage, msg.ownerSpec, startOpt);
  }

  private startProjectile(
    set: ProjectileSet,
    src: THREE.Vector3,
    dir: THREE.Vector3,
    damage: number,
    ownerSpec: BaseSpec,
    opt?: { hitscan?: boolean; tracerLife?: number; tracerRange?: number }
  ) {
    set.releasing = false;

    set.ctrl.start(src, dir, damage, ownerSpec, opt);

    if (set.model.Meshs) this.game.add(set.model.Meshs);
  }

  ReleaseAllProjPool() {
    this.projectiles.forEach((pool) => {
      pool.forEach((set) => {
        set.releasing = false;
        set.initializing = false;
        set.pendingStart = undefined;

        set.ctrl.Release();
        if (set.model.Meshs) this.game.remove(set.model.Meshs);
      });
    });
  }
}
