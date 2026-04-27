import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/world/worldmap/worldmaptypes";

export enum HorizonMountainStyle {
  Smooth = "smooth",
  Sharp = "sharp",
  Jagged = "jagged"
}

export interface HorizonMountainLayerOptions {
  /**
   * Plane 반경 대비 산맥 거리 비율입니다.
   * 예: 1.0이면 Plane 반경 근처, 1.2면 Plane 바깥쪽입니다.
   */
  radiusRatio?: number;

  /**
   * Plane 최대 반경 대비 기본 산 높이 비율입니다.
   */
  baseHeightRatio?: number;

  /**
   * Plane 최대 반경 대비 산 높이 변화량 비율입니다.
   */
  heightVariationRatio?: number;

  /**
   * Plane 상단 Y 기준 산맥 하단 위치 비율입니다.
   * 음수면 Plane보다 아래에서 시작합니다.
   */
  bottomYRatio?: number;

  color?: THREE.ColorRepresentation;
  opacity?: number;
  seed?: number;
}

export interface HorizonHazeLayerOptions {
  radiusRatio?: number;
  heightRatio?: number;
  yRatio?: number;
  opacity?: number;
}

export interface HorizonEnvironmentOptions {
  scene?: THREE.Scene;

  name?: string;

  /**
   * 산맥 스타일
   */
  style?: HorizonMountainStyle;

  /**
   * 산맥 능선 vertex 개수입니다.
   * 값이 높을수록 부드럽고 디테일하지만 geometry가 커집니다.
   */
  segments?: number;

  /**
   * 전체 산맥 거리 스케일입니다.
   */
  distanceScale?: number;

  /**
   * 전체 산맥 높이 스케일입니다.
   */
  heightScale?: number;

  /**
   * Plane 기준 Y 보정값입니다.
   */
  yOffset?: number;

  /**
   * Plane 크기에서 추가로 밀어낼 거리입니다.
   */
  radiusPadding?: number;

  enableMountains?: boolean;
  enableHaze?: boolean;

  mountainLayers?: HorizonMountainLayerOptions[];
  hazeLayers?: HorizonHazeLayerOptions[];

  hazeColor?: THREE.ColorRepresentation;

  /**
   * scene.fog를 자동 적용할지 여부입니다.
   */
  applyFog?: boolean;
  fogColor?: THREE.ColorRepresentation;
  fogDensity?: number;

  /**
   * scene.background를 단색으로 설정할지 여부입니다.
   * Skybox가 아니라 단색 배경입니다.
   */
  applyBackgroundColor?: boolean;
  backgroundColor?: THREE.ColorRepresentation;

  /**
   * true면 렌더 순서를 앞으로 조정할 수 있습니다.
   */
  renderOrder?: number;

  /**
   * 카메라나 플레이어를 넣으면 HorizonEnvironment가 X/Z 방향으로 따라갑니다.
   * 무한 지평선처럼 보이고 싶을 때 사용합니다.
   */
  followTarget?: THREE.Object3D | null;
  followX?: boolean;
  followZ?: boolean;
}

export interface HorizonEnvironmentSaveData {
  type: MapEntryType.HorizonEnvironment;
  options: Omit<HorizonEnvironmentOptions, "scene" | "followTarget">;
}

interface PlaneInfo {
  center: THREE.Vector3;
  size: THREE.Vector3;
  halfX: number;
  halfZ: number;
  halfMax: number;
  topY: number;
}

const DEFAULT_MOUNTAIN_LAYERS: Required<HorizonMountainLayerOptions>[] = [
  {
    radiusRatio: 1.22,
    baseHeightRatio: 0.095,
    heightVariationRatio: 0.225,
    bottomYRatio: -0.04,
    color: 0xe8ddd0,
    opacity: 1.0,
    seed: 2.4
  },
  {
    radiusRatio: 1.04,
    baseHeightRatio: 0.073,
    heightVariationRatio: 0.168,
    bottomYRatio: -0.03,
    color: 0xd4c4b8,
    opacity: 1.0,
    seed: 6.7
  },
  {
    radiusRatio: 0.86,
    baseHeightRatio: 0.043,
    heightVariationRatio: 0.092,
    bottomYRatio: -0.02,
    color: 0xb8a89c,
    opacity: 1.0,
    seed: 11.1
  }
];

const DEFAULT_HAZE_LAYERS: Required<HorizonHazeLayerOptions>[] = [
  {
    radiusRatio: 0.62,
    heightRatio: 0.12,
    yRatio: 0.055,
    opacity: 0.11
  },
  {
    radiusRatio: 0.86,
    heightRatio: 0.19,
    yRatio: 0.085,
    opacity: 0.16
  },
  {
    radiusRatio: 1.18,
    heightRatio: 0.28,
    yRatio: 0.12,
    opacity: 0.24
  }
];

const DEFAULT_OPTIONS: Required<Omit<
  HorizonEnvironmentOptions,
  "scene" | "followTarget" | "mountainLayers" | "hazeLayers"
>> = {
  name: "HorizonEnvironment",
  style: HorizonMountainStyle.Smooth,
  segments: 260,
  distanceScale: 1.0,
  heightScale: 1.0,
  yOffset: 0,
  radiusPadding: 0,
  enableMountains: true,
  enableHaze: true,
  hazeColor: 0xf2e4d0,
  applyFog: true,
  fogColor: 0xf2e4d0,
  fogDensity: 0.0019,
  applyBackgroundColor: true,
  backgroundColor: 0xf2e4d0,
  renderOrder: 0,
  followX: true,
  followZ: true
};

export class HorizonEnvironment implements IWorldMapObject {
  public Type: MapEntryType;
  public Mesh?: THREE.Object3D;

  private sourcePlane?: THREE.Object3D;
  private planeInfo?: PlaneInfo;

  private options: HorizonEnvironmentOptions;
  private sceneStateSnapshot?: {
    scene: THREE.Scene;
    background: THREE.Scene["background"];
    fog: THREE.Scene["fog"];
  };

  private readonly tmpWorldPos = new THREE.Vector3();

  constructor(private scene?: THREE.Scene) {
    this.Type = MapEntryType.HorizonEnvironment;
    this.options = this.mergeOptions({});
  }

  public Create(playPlane: THREE.Object3D, scene?: THREE.Scene, options?: HorizonEnvironmentOptions): THREE.Group;
  public Create(...param: any[]): THREE.Group {
    const playPlane = param[0] as THREE.Object3D | undefined;
    const scene = param[1] as THREE.Scene | undefined;
    const options = param[2] as HorizonEnvironmentOptions | undefined;

    if (!playPlane) {
      throw new Error("[HorizonEnvironment] Create(playPlane) requires a THREE.Object3D plane.");
    }

    if (options) {
      this.options = this.mergeOptions(options);
    }

    if (scene) {
      this.scene = scene;
    }

    this.Delete();

    this.sourcePlane = playPlane;
    this.planeInfo = this.computePlaneInfo(playPlane);

    const root = new THREE.Group();
    root.name = this.options.name ?? DEFAULT_OPTIONS.name;

    root.position.set(
      this.planeInfo.center.x,
      this.planeInfo.topY + (this.options.yOffset ?? 0),
      this.planeInfo.center.z
    );

    if (this.options.enableMountains !== false) {
      this.createMountainLayers(root, this.planeInfo);
    }

    if (this.options.enableHaze !== false) {
      this.createHazeLayers(root, this.planeInfo);
    }

    this.Mesh = root;

    if (this.scene) {
      this.applySceneOptions(this.scene);
      this.scene.add(root);
    }

    return root;
  }

  public async CreateDone(): Promise<void> {
    return;
  }

  public Delete(..._param: any[]): void {
    if (this.Mesh) {
      this.Mesh.parent?.remove(this.Mesh);
      this.disposeObject(this.Mesh);

      this.Mesh = undefined;
    }
    this.restoreSceneOptions();
  }

  public Show(): void {
    if (this.Mesh) {
      this.Mesh.visible = true;
    }
  }

  public Hide(): void {
    if (this.Mesh) {
      this.Mesh.visible = false;
    }
  }

  public Save(): HorizonEnvironmentSaveData {
    const {
      scene,
      followTarget,
      ...serializableOptions
    } = this.options;

    return {
      type: MapEntryType.HorizonEnvironment,
      options: serializableOptions
    };
  }

  public Load(data: any, callback?: Function): void {
    if (data?.options) {
      this.options = this.mergeOptions(data.options);
    }

    if (this.sourcePlane) {
      this.Create(this.sourcePlane, this.scene);
    }

    callback?.(this);
  }

  /**
   * 게임 루프에서 호출하면 followTarget을 따라갑니다.
   * IWorldMapObject에는 없지만 필요하면 RegisterLoop 대상에서 호출하면 됩니다.
   */
  public Update(_delta?: number): void {
    const target = this.options.followTarget;

    if (!this.Mesh || !target) return;

    target.getWorldPosition(this.tmpWorldPos);

    if (this.options.followX !== false) {
      this.Mesh.position.x = this.tmpWorldPos.x;
    }

    if (this.options.followZ !== false) {
      this.Mesh.position.z = this.tmpWorldPos.z;
    }
  }

  public SetOptions(options: HorizonEnvironmentOptions, rebuild = true): void {
    this.options = this.mergeOptions(options);

    if (rebuild && this.sourcePlane) {
      this.Create(this.sourcePlane, this.scene);
    }
  }

  public SetMountainStyle(style: HorizonMountainStyle, rebuild = true): void {
    this.options.style = style;

    if (rebuild && this.sourcePlane) {
      this.Create(this.sourcePlane, this.scene);
    }
  }

  public SetHeightScale(heightScale: number, rebuild = true): void {
    this.options.heightScale = heightScale;

    if (rebuild && this.sourcePlane) {
      this.Create(this.sourcePlane, this.scene);
    }
  }

  public SetDistanceScale(distanceScale: number, rebuild = true): void {
    this.options.distanceScale = distanceScale;

    if (rebuild && this.sourcePlane) {
      this.Create(this.sourcePlane, this.scene);
    }
  }

  private mergeOptions(options: HorizonEnvironmentOptions): HorizonEnvironmentOptions {
    return {
      ...DEFAULT_OPTIONS,
      ...this.options,
      ...options,
      mountainLayers: options.mountainLayers ?? this.options?.mountainLayers ?? DEFAULT_MOUNTAIN_LAYERS,
      hazeLayers: options.hazeLayers ?? this.options?.hazeLayers ?? DEFAULT_HAZE_LAYERS,
      scene: options.scene ?? this.options?.scene,
      followTarget: options.followTarget ?? this.options?.followTarget ?? null
    };
  }

  private applySceneOptions(scene: THREE.Scene): void {
    if (!this.sceneStateSnapshot) {
      this.sceneStateSnapshot = {
        scene,
        background: scene.background,
        fog: scene.fog
      };
    }

    if (this.options.applyBackgroundColor) {
      scene.background = new THREE.Color(
        this.options.backgroundColor ?? DEFAULT_OPTIONS.backgroundColor
      );
    }

    if (this.options.applyFog) {
      scene.fog = new THREE.FogExp2(
        this.options.fogColor ?? DEFAULT_OPTIONS.fogColor,
        this.options.fogDensity ?? DEFAULT_OPTIONS.fogDensity
      );
    }
  }

  private restoreSceneOptions(): void {
    if (!this.sceneStateSnapshot) return;

    const { scene, background, fog } = this.sceneStateSnapshot;
    scene.background = background;
    scene.fog = fog;
    this.sceneStateSnapshot = undefined;
  }

  private computePlaneInfo(plane: THREE.Object3D): PlaneInfo {
    plane.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(plane);

    if (box.isEmpty()) {
      throw new Error("[HorizonEnvironment] Could not compute bounding box from playPlane.");
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    const halfX = Math.max(size.x * 0.5, 1);
    const halfZ = Math.max(size.z * 0.5, 1);
    const halfMax = Math.max(halfX, halfZ);

    return {
      center,
      size,
      halfX,
      halfZ,
      halfMax,
      topY: box.max.y
    };
  }

  private createMountainLayers(root: THREE.Group, info: PlaneInfo): void {
    const layers = this.options.mountainLayers ?? DEFAULT_MOUNTAIN_LAYERS;

    for (const layerOptions of layers) {
      const layer = {
        ...DEFAULT_MOUNTAIN_LAYERS[0],
        ...layerOptions
      };

      const mesh = this.createMountainRing(layer, info);

      mesh.renderOrder = this.options.renderOrder ?? 0;

      root.add(mesh);
    }
  }

  private createMountainRing(
    layer: Required<HorizonMountainLayerOptions>,
    info: PlaneInfo
  ): THREE.Mesh {
    const segments = Math.max(16, Math.floor(this.options.segments ?? DEFAULT_OPTIONS.segments));
    const distanceScale = this.options.distanceScale ?? DEFAULT_OPTIONS.distanceScale;
    const heightScale = this.options.heightScale ?? DEFAULT_OPTIONS.heightScale;
    const radiusPadding = this.options.radiusPadding ?? DEFAULT_OPTIONS.radiusPadding;

    const radiusX = (info.halfX * layer.radiusRatio + radiusPadding) * distanceScale;
    const radiusZ = (info.halfZ * layer.radiusRatio + radiusPadding) * distanceScale;

    const baseHeight = info.halfMax * layer.baseHeightRatio * heightScale;
    const heightVariation = info.halfMax * layer.heightVariationRatio * heightScale;
    const bottomY = info.halfMax * layer.bottomYRatio;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const baseColor = new THREE.Color(layer.color);
    const bottomColor = baseColor.clone().multiplyScalar(0.72);
    const peakColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.13);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2;

      const profile = this.getMountainProfile(
        angle,
        layer.seed,
        this.options.style ?? DEFAULT_OPTIONS.style
      );

      const ridgeHeight = baseHeight + heightVariation * profile;

      const x = Math.cos(angle) * radiusX;
      const z = Math.sin(angle) * radiusZ;

      positions.push(x, bottomY, z);
      colors.push(bottomColor.r, bottomColor.g, bottomColor.b);

      positions.push(x, ridgeHeight, z);
      colors.push(peakColor.r, peakColor.g, peakColor.b);
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;

      indices.push(a, c, b);
      indices.push(c, d, b);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: layer.opacity < 1.0,
      opacity: layer.opacity,
      side: THREE.DoubleSide,
      depthWrite: layer.opacity >= 1.0,
      fog: this.options.applyFog
    });

    return new THREE.Mesh(geometry, material);
  }

  private createHazeLayers(root: THREE.Group, info: PlaneInfo): void {
    const hazeLayers = this.options.hazeLayers ?? DEFAULT_HAZE_LAYERS;

    const group = new THREE.Group();
    group.name = "HorizonHazeLayers";

    for (const layerOptions of hazeLayers) {
      const layer = {
        ...DEFAULT_HAZE_LAYERS[0],
        ...layerOptions
      };

      const mesh = this.createHazeCylinder(layer, info);
      group.add(mesh);
    }

    root.add(group);
  }

  private createHazeCylinder(
    layer: Required<HorizonHazeLayerOptions>,
    info: PlaneInfo
  ): THREE.Mesh {
    const distanceScale = this.options.distanceScale ?? DEFAULT_OPTIONS.distanceScale;
    const radiusPadding = this.options.radiusPadding ?? DEFAULT_OPTIONS.radiusPadding;

    const radiusX = (info.halfX * layer.radiusRatio + radiusPadding) * distanceScale;
    const radiusZ = (info.halfZ * layer.radiusRatio + radiusPadding) * distanceScale;

    const height = info.halfMax * layer.heightRatio;
    const y = info.halfMax * layer.yRatio;

    const geometry = new THREE.CylinderGeometry(
      1,
      1,
      height,
      160,
      1,
      true
    );

    const material = new THREE.MeshBasicMaterial({
      color: this.options.hazeColor ?? DEFAULT_OPTIONS.hazeColor,
      transparent: true,
      opacity: layer.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: this.options.applyFog
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.y = y;
    mesh.scale.set(radiusX, 1, radiusZ);
    mesh.renderOrder = (this.options.renderOrder ?? 0) + 1;

    return mesh;
  }

  private getMountainProfile(
    angle: number,
    seed: number,
    style: HorizonMountainStyle
  ): number {
    const wave =
      Math.sin(angle * 2.0 + seed) * 0.34 +
      Math.sin(angle * 5.0 + seed * 1.6) * 0.24 +
      Math.sin(angle * 12.0 + seed * 0.9) * 0.12 +
      Math.sin(angle * 27.0 + seed * 2.3) * 0.055;

    let v = 0.5 + wave;

    v = THREE.MathUtils.clamp(v, 0.0, 1.0);

    if (style === HorizonMountainStyle.Smooth) {
      v = this.smoothstep(v);
    } else if (style === HorizonMountainStyle.Sharp) {
      v = Math.pow(v, 2.4);
      v = THREE.MathUtils.clamp(v * 1.35, 0.0, 1.0);
    } else if (style === HorizonMountainStyle.Jagged) {
      v = Math.pow(v, 2.0);

      const jaggedNoise =
        Math.sin(angle * 42.0 + seed * 3.0) * 0.055 +
        Math.sin(angle * 73.0 + seed * 1.2) * 0.035 +
        Math.sin(angle * 109.0 + seed * 2.7) * 0.025;

      v = THREE.MathUtils.clamp(v * 1.35 + jaggedNoise, 0.0, 1.0);
    }

    return v;
  }

  private smoothstep(t: number): number {
    t = THREE.MathUtils.clamp(t, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const maybeMesh = child as THREE.Mesh;

      if (maybeMesh.geometry) {
        maybeMesh.geometry.dispose();
      }

      const material = maybeMesh.material as THREE.Material | THREE.Material[] | undefined;

      if (material) {
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else {
          material.dispose();
        }
      }
    });
  }
}
