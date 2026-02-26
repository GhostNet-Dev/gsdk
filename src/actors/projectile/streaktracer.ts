// streaktracer.ts
import * as THREE from "three";
import { IProjectileModel } from "./projectile";

export type StreakTracerOptions = {
  coreColor?: number;
  glowColor?: number;

  coreWidth?: number;   // 얇은 코어
  glowWidth?: number;   // 굵은 글로우

  opacityCore?: number;
  opacityGlow?: number;

  minLength?: number;
  fadeDuration?: number;  // release 페이드 시간

  depthTest?: boolean;    // 벽 뒤 가려질지
  renderOrder?: number;
};

type ReleaseAnimatedProjectile = IProjectileModel & {
  updateRelease?: (delta: number) => void;
  isReleaseFinished?: () => boolean;
};

export class StreakTracerModel implements ReleaseAnimatedProjectile {
  private static sharedGeom = new THREE.PlaneGeometry(1, 1, 1, 1);
  private static sharedTex = StreakTracerModel.makeGradientTexture();

  private readonly root = new THREE.Group();
  get Meshs() { return this.root; }

  private start = new THREE.Vector3();
  private end = new THREE.Vector3();

  private alive = false;
  private fading = false;
  private fadeElapsed = 0;

  private readonly opt: Required<StreakTracerOptions>;
  private readonly matCore: THREE.MeshBasicMaterial;
  private readonly matGlow: THREE.MeshBasicMaterial;

  private readonly core1: THREE.Mesh;
  private readonly core2: THREE.Mesh;
  private readonly glow1: THREE.Mesh;
  private readonly glow2: THREE.Mesh;

  constructor(options: StreakTracerOptions = {}) {
    this.opt = {
      coreColor: options.coreColor ?? 0xffcc55,
      glowColor: options.glowColor ?? 0xffaa33,

      coreWidth: options.coreWidth ?? 0.045,
      glowWidth: options.glowWidth ?? 0.09,

      opacityCore: options.opacityCore ?? 1.0,
      opacityGlow: options.opacityGlow ?? 0.55,

      minLength: options.minLength ?? 0.15,
      fadeDuration: options.fadeDuration ?? 0.08,

      depthTest: options.depthTest ?? true,
      renderOrder: options.renderOrder ?? 5,
    };

    this.matCore = new THREE.MeshBasicMaterial({
      map: StreakTracerModel.sharedTex,
      color: this.opt.coreColor,
      transparent: true,
      opacity: this.opt.opacityCore,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: this.opt.depthTest,
      side: THREE.DoubleSide,
    });

    this.matGlow = new THREE.MeshBasicMaterial({
      map: StreakTracerModel.sharedTex,
      color: this.opt.glowColor,
      transparent: true,
      opacity: this.opt.opacityGlow,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: this.opt.depthTest,
      side: THREE.DoubleSide,
    });

    // 십자 2장 (코어/글로우 각각)
    this.core1 = new THREE.Mesh(StreakTracerModel.sharedGeom, this.matCore);
    this.core2 = new THREE.Mesh(StreakTracerModel.sharedGeom, this.matCore);
    this.glow1 = new THREE.Mesh(StreakTracerModel.sharedGeom, this.matGlow);
    this.glow2 = new THREE.Mesh(StreakTracerModel.sharedGeom, this.matGlow);

    this.root.add(this.glow1, this.glow2, this.core1, this.core2);

    this.root.visible = false;
    this.root.frustumCulled = false;
    this.root.renderOrder = this.opt.renderOrder;

    // 초기: plane이 “길이축=Y”라고 가정하고, 이후 scale.y를 length로 사용
    // core2 / glow2 는 direction 축 기준으로 90도 회전시켜 십자 만들기
    this.core2.rotation.y = Math.PI / 2;
    this.glow2.rotation.y = Math.PI / 2;
  }

  create(position: THREE.Vector3, _dir?: THREE.Vector3): void {
    this.start.copy(position);
    this.end.copy(position);

    this.alive = true;
    this.fading = false;
    this.fadeElapsed = 0;

    this.setOpacity(1);
    this.root.visible = true;

    this.updateTransform();
  }

  update(position: THREE.Vector3): void {
    if (!this.alive && !this.fading) return;
    this.end.copy(position);
    this.updateTransform();
  }

  release(): void {
    if (!this.root.visible) return;
    this.alive = false;
    this.fading = true;
    this.fadeElapsed = 0;
  }

  updateRelease(delta: number): void {
    if (!this.fading) return;

    this.fadeElapsed += delta;
    const t = this.opt.fadeDuration <= 0 ? 1 : (this.fadeElapsed / this.opt.fadeDuration);
    const k = Math.max(0, 1 - t);

    this.setOpacity(k);

    if (t >= 1) {
      this.fading = false;
      this.root.visible = false;
      this.setOpacity(1);
    }
  }

  isReleaseFinished(): boolean {
    return !this.fading;
  }

  private updateTransform() {
    const dir = new THREE.Vector3().subVectors(this.end, this.start);
    const len = Math.max(this.opt.minLength, dir.length());

    // midpoint에 놓고, up(0,1,0) → dir 방향으로 회전
    const mid = new THREE.Vector3().addVectors(this.start, this.end).multiplyScalar(0.5);
    this.root.position.copy(mid);

    const forward = dir.lengthSq() < 1e-8 ? new THREE.Vector3(0, 0, 1) : dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
    this.root.quaternion.copy(q);

    // 길이=scale.y, 두께=scale.x (plane의 x가 폭, y가 길이라고 가정)
    this.core1.scale.set(this.opt.coreWidth, len, 1);
    this.core2.scale.set(this.opt.coreWidth, len, 1);

    this.glow1.scale.set(this.opt.glowWidth, len, 1);
    this.glow2.scale.set(this.opt.glowWidth, len, 1);
  }

  private setOpacity(k: number) {
    this.matCore.opacity = this.opt.opacityCore * k;
    this.matGlow.opacity = this.opt.opacityGlow * k;
    this.matCore.needsUpdate = true;
    this.matGlow.needsUpdate = true;
  }

  private static makeGradientTexture(): THREE.Texture {
    // 세로 방향(길이축)으로 “앞쪽/뒤쪽 흐림 + 가운데 밝음” 느낌을 주는 텍스처
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, "rgba(255,255,255,0.00)");
    grad.addColorStop(0.15, "rgba(255,255,255,0.20)");
    grad.addColorStop(0.50, "rgba(255,255,255,1.00)");
    grad.addColorStop(0.85, "rgba(255,255,255,0.20)");
    grad.addColorStop(1.0, "rgba(255,255,255,0.00)");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }
}