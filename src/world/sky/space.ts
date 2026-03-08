import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import * as THREE from "three";

export interface DeepSpaceMegaRingSystemOptions {
  sideBoxUrl?: string;
  topBottomUrl?: string;
  planetUrl?: string;

  skyboxSize?: number;
  planetRadius?: number;
  planetPosition?: THREE.Vector3;

  ringInnerScale?: number;
  ringOuterRadius?: number;

  asteroidCount?: number;
  asteroidMinDist?: number;
  asteroidMaxDist?: number;
  asteroidVerticalSpread?: number;

  cameraStartPosition?: THREE.Vector3;
}

type LoadedTextures = {
  sideTex: THREE.Texture;
  topBottomTex: THREE.Texture;
  planetTex: THREE.Texture;
};

export class DeepSpaceMegaRingSystem implements ILoop {
  LoopId: number = 0;
  private scene: THREE.Scene;
  private textureLoader = new THREE.TextureLoader();
  private clock = new THREE.Clock();

  private root = new THREE.Group();
  private skybox?: THREE.Mesh;
  private planet?: THREE.Mesh;
  private ring?: THREE.Mesh;
  private asteroids = new THREE.Group();

  private disposed = false;
  private initialized = false;

  private options: Required<DeepSpaceMegaRingSystemOptions>;

  constructor(
    private eventCtrl: IEventController,
    scene: THREE.Scene,
    options: DeepSpaceMegaRingSystemOptions = {}
  ) {
    this.scene = scene;

    this.options = {
      sideBoxUrl:
        options.sideBoxUrl ??
        "https://hons.ghostwebservice.com/assets/skyboxes/nebula/nebua_11111113.png",
      topBottomUrl:
        options.topBottomUrl ??
        "https://hons.ghostwebservice.com/assets/skyboxes/nebula/nebua_11111025.png",
      planetUrl:
        options.planetUrl ??
        "https://hons.ghostwebservice.com/assets/texture/planet/Gaseous/Gaseous_17-1024x512.png",

      skyboxSize: options.skyboxSize ?? 70000,
      planetRadius: options.planetRadius ?? 2500,
      planetPosition: options.planetPosition ?? new THREE.Vector3(0, 0, -10000),

      ringInnerScale: options.ringInnerScale ?? 1.4,
      ringOuterRadius: options.ringOuterRadius ?? 18000,

      asteroidCount: options.asteroidCount ?? 1000,
      asteroidMinDist: options.asteroidMinDist ?? 20000,
      asteroidMaxDist: options.asteroidMaxDist ?? 28000,
      asteroidVerticalSpread: options.asteroidVerticalSpread ?? 5000,

      cameraStartPosition:
        options.cameraStartPosition ?? new THREE.Vector3(0, 5000, 25000),
    };
  }

  async init(): Promise<void> {
    if (this.initialized || this.disposed) return;

    const textures = await this.loadTextures();

    this.buildSkybox(textures);
    this.buildPlanet(textures);
    this.buildAsteroidBelt();

    this.scene.add(this.root);


    this.initialized = true;
    this.clock.start();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  update(delta?: number, elapsed?: number): void {
    if (!this.initialized || this.disposed) return;

    const dt = delta ?? this.clock.getDelta();
    const t = elapsed ?? this.clock.getElapsedTime();

    if (this.planet) {
      this.planet.rotation.y = t * 0.008;
    }

    for (const obj of this.asteroids.children as THREE.Mesh[]) {
      const ud = obj.userData as {
        orbitSpeed: number;
        rotSpeed: number;
        dist: number;
        angle: number;
      };

      ud.angle += ud.orbitSpeed * (dt * 60.0);
      obj.position.x = Math.cos(ud.angle) * ud.dist;
      obj.position.z = Math.sin(ud.angle) * ud.dist;
      obj.rotation.x += ud.rotSpeed * (dt * 60.0);
      obj.rotation.y += ud.rotSpeed * (dt * 60.0);
    }
  }

  dispose(): void {
    if (this.disposed) return;

    this.scene.remove(this.root);

    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      if (Array.isArray(mesh.material)) {
        for (const mat of mesh.material) {
          this.disposeMaterial(mat);
        }
      } else if (mesh.material) {
        this.disposeMaterial(mesh.material);
      }
    });

    this.asteroids.clear();
    this.disposed = true;
  }

  getRoot(): THREE.Group {
    return this.root;
  }

  getPlanet(): THREE.Mesh | undefined {
    return this.planet;
  }

  getAsteroidGroup(): THREE.Group {
    return this.asteroids;
  }

  // -------------------------
  // 내부 구현
  // -------------------------

  private async loadTextures(): Promise<LoadedTextures> {
    const [sideTex, topBottomTex, planetTex] = await Promise.all([
      this.loadTexture(this.options.sideBoxUrl),
      this.loadTexture(this.options.topBottomUrl),
      this.loadTexture(this.options.planetUrl),
    ]);

    sideTex.colorSpace = THREE.SRGBColorSpace;
    topBottomTex.colorSpace = THREE.SRGBColorSpace;
    planetTex.colorSpace = THREE.SRGBColorSpace;

    return { sideTex, topBottomTex, planetTex };
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
  }

  private buildSkybox(textures: LoadedTextures): void {
    const { sideTex, topBottomTex } = textures;

    const createSideMaterial = (tileIndex: number): THREE.MeshBasicMaterial => {
      const tex = sideTex.clone();
      tex.needsUpdate = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(-0.25, 1);
      tex.offset.x = (tileIndex + 1) * 0.25;

      return new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      });
    };

    const matTopBottom = new THREE.MeshBasicMaterial({
      map: topBottomTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    const materials: THREE.Material[] = [
      createSideMaterial(1),
      createSideMaterial(3),
      matTopBottom,
      matTopBottom,
      createSideMaterial(0),
      createSideMaterial(2),
    ];

    const geo = new THREE.BoxGeometry(
      this.options.skyboxSize,
      this.options.skyboxSize,
      this.options.skyboxSize
    );

    this.skybox = new THREE.Mesh(geo, materials);
    this.skybox.raycast = () => {}; // 레이캐스팅 비활성화
    this.root.add(this.skybox);
  }

  private buildPlanet(textures: LoadedTextures): void {
    const { planetTex } = textures;

    const planetGeo = new THREE.SphereGeometry(this.options.planetRadius, 64, 64);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.8,
      metalness: 0.1,
      fog: false,
    });

    this.planet = new THREE.Mesh(planetGeo, planetMat);
    this.planet.position.copy(this.options.planetPosition);
    this.planet.rotation.z = Math.PI / 7;

    this.root.add(this.planet);

    this.buildRing();
  }

  private buildRing(): void {
    if (!this.planet) return;

    const innerRadius = this.options.planetRadius * this.options.ringInnerScale;
    const outerRadius = this.options.ringOuterRadius;

    const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 256);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, // 더 밝은 회색으로 변경
      emissive: 0x222222, // 약간의 자체 발광 추가
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8, // 불투명도 약간 상향
      roughness: 0.5, // 거칠기를 낮춰 빛 반사율 증가
      fog: false,
    });
    ringMat.defines = { 'USE_UV': '' };

    ringMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        #include <map_fragment>

        float d = distance(vUv, vec2(0.5, 0.5)) * 2.0;

        float gapPattern = sin(d * 80.0) * 0.5 + 0.5;
        gapPattern = step(0.15, gapPattern);

        diffuseColor.a *= gapPattern;
        `
      );
    };

    ringMat.customProgramCacheKey = () => "deep-space-mega-ring-v1";

    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;

    this.planet.add(this.ring);
  }

  private buildAsteroidBelt(): void {
    const {
      asteroidCount,
      asteroidMinDist,
      asteroidMaxDist,
      asteroidVerticalSpread,
    } = this.options;

    for (let i = 0; i < asteroidCount; i++) {
      const detail = Math.floor(Math.random() * 2);
      const geo = new THREE.IcosahedronGeometry(1, detail);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 1.0,
        fog: false,
      });

      const mesh = new THREE.Mesh(geo, mat);

      const dist =
        asteroidMinDist + Math.random() * (asteroidMaxDist - asteroidMinDist);
      const angle = Math.random() * Math.PI * 2;

      mesh.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * asteroidVerticalSpread,
        Math.sin(angle) * dist
      );

      const scaleBase = Math.random() * 150 + 80;
      mesh.scale.set(
        scaleBase * (Math.random() + 0.5),
        scaleBase * (Math.random() + 0.5),
        scaleBase * (Math.random() + 0.5)
      );

      mesh.userData = {
        orbitSpeed: Math.random() * 0.00008 + 0.00002,
        rotSpeed: Math.random() * 0.001,
        dist,
        angle,
      };

      this.asteroids.add(mesh);
    }

    this.root.add(this.asteroids);
  }

  private disposeMaterial(material: THREE.Material): void {
    const mat = material as THREE.Material & {
      map?: THREE.Texture | null;
      alphaMap?: THREE.Texture | null;
      normalMap?: THREE.Texture | null;
      roughnessMap?: THREE.Texture | null;
      metalnessMap?: THREE.Texture | null;
      emissiveMap?: THREE.Texture | null;
      aoMap?: THREE.Texture | null;
      bumpMap?: THREE.Texture | null;
    };

    mat.map?.dispose?.();
    mat.alphaMap?.dispose?.();
    mat.normalMap?.dispose?.();
    mat.roughnessMap?.dispose?.();
    mat.metalnessMap?.dispose?.();
    mat.emissiveMap?.dispose?.();
    mat.aoMap?.dispose?.();
    mat.bumpMap?.dispose?.();

    material.dispose();
  }
}