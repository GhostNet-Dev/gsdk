import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";

export interface SpaceWarSkyOptions {
  radius?: number;
  starCount?: number;
  starSize?: number;
  ambientIntensity?: number;
  keyIntensity?: number;
  rimIntensity?: number;
  backgroundColor?: THREE.ColorRepresentation;
}

export class SpaceWarSky implements IWorldMapObject, ILoop {
  LoopId = 0;
  readonly Type = MapEntryType.SpaceWarSky;

  get Mesh() {
    return this.root;
  }

  private readonly root = new THREE.Group();
  private readonly starsColor = new THREE.Color();
  private readonly options: Required<SpaceWarSkyOptions>;

  private skyDome?: THREE.Mesh;
  private stars?: THREE.Points;
  private ambient?: THREE.AmbientLight;
  private keyLight?: THREE.DirectionalLight;
  private rimLight?: THREE.DirectionalLight;
  private lightTarget?: THREE.Object3D;
  private previousBackground: THREE.Scene["background"] = null;
  private created = false;

  constructor(
    private readonly eventCtrl: IEventController,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    options: SpaceWarSkyOptions = {},
  ) {
    this.options = {
      radius: options.radius ?? 900,
      starCount: options.starCount ?? 2400,
      starSize: options.starSize ?? 2.2,
      ambientIntensity: options.ambientIntensity ?? 0.05,
      keyIntensity: options.keyIntensity ?? 3.2,
      rimIntensity: options.rimIntensity ?? 0.28,
      backgroundColor: options.backgroundColor ?? 0x000000,
    };
  }

  Create(options: SpaceWarSkyOptions = {}) {
    Object.assign(this.options, options);

    if (this.created) {
      this.clearRoot();
    }

    this.previousBackground = this.scene.background;
    this.scene.background = new THREE.Color(this.options.backgroundColor);

    this.root.name = "space-war-sky-root";
    this.root.position.copy(this.camera.position);

    this.skyDome = this.createSkyDome();
    this.stars = this.createStars();
    this.ambient = new THREE.AmbientLight(0x0a1020, this.options.ambientIntensity);
    this.ambient.name = "space-war-ambient";

    this.keyLight = new THREE.DirectionalLight(0xe8f1ff, this.options.keyIntensity);
    this.keyLight.name = "space-war-key-light";
    this.keyLight.position.set(90, 120, 70);

    this.rimLight = new THREE.DirectionalLight(0x7fb3ff, this.options.rimIntensity);
    this.rimLight.name = "space-war-rim-light";
    this.rimLight.position.set(-65, -20, -90);

    this.lightTarget = new THREE.Object3D();
    this.lightTarget.name = "space-war-light-target";
    this.lightTarget.position.set(0, 0, 0);

    this.keyLight.target = this.lightTarget;
    this.rimLight.target = this.lightTarget;

    this.root.add(
      this.skyDome,
      this.stars,
      this.ambient,
      this.keyLight,
      this.rimLight,
      this.lightTarget,
    );

    this.created = true;
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    return this.root;
  }

  Delete() {
    this.dispose();
  }

  update(): void {
    if (!this.created) return;
    this.root.position.copy(this.camera.position);
  }

  dispose(): void {
    if (!this.created) return;

    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
    this.clearRoot();
    if (this.root.parent === this.scene) {
      this.scene.remove(this.root);
    }
    this.scene.background = this.previousBackground;
    this.previousBackground = null;
    this.created = false;
  }

  private createSkyDome() {
    const geometry = new THREE.SphereGeometry(this.options.radius, 48, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.options.backgroundColor,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -20;
    mesh.raycast = () => {};
    return mesh;
  }

  private createStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.options.starCount * 3);
    const colors = new Float32Array(this.options.starCount * 3);

    for (let i = 0; i < this.options.starCount; i++) {
      const radius = this.options.radius * (0.86 + Math.random() * 0.1);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 2);
      const offset = i * 3;

      positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      positions[offset + 1] = radius * Math.cos(phi);
      positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = Math.random() > 0.92 ? 1 : 0.45 + Math.random() * 0.35;
      const tint = Math.random();

      if (tint > 0.97) this.starsColor.setRGB(brightness, brightness * 0.92, brightness * 0.8);
      else if (tint > 0.9) this.starsColor.setRGB(brightness * 0.82, brightness * 0.9, brightness);
      else this.starsColor.setRGB(brightness, brightness, brightness);

      this.starsColor.toArray(colors, offset);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: this.options.starSize,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });

    const stars = new THREE.Points(geometry, material);
    stars.renderOrder = -10;
    stars.raycast = () => {};
    return stars;
  }

  private clearRoot() {
    this.root.traverse((obj) => {
      const geometry = (obj as THREE.Object3D & { geometry?: THREE.BufferGeometry }).geometry;
      geometry?.dispose();

      const material = (obj as THREE.Object3D & { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });

    this.skyDome = undefined;
    this.stars = undefined;
    this.ambient = undefined;
    this.keyLight = undefined;
    this.rimLight = undefined;
    this.lightTarget = undefined;

    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }
  }
}
