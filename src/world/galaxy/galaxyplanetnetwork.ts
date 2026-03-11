import * as THREE from "three";
import {
  FactionKey,
  GalaxyContext,
  GalaxyMapDef,
  GalaxyPlanetNetworkOptions,
  PlanetDef,
  PlanetInfoViewModel
} from "./galaxytypes";
import { getGalaxyFocusCenterNdc } from "./galaxymapui";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IWorldMapObject, MapEntryType } from "../worldmap/worldmaptypes";
import { EventTypes } from "@Glibs/types/globaltypes";

type PlanetGroup = THREE.Group & {
  userData: {
    index: number;
    id: string;
    name: string;
    faction: FactionKey;
    stats: PlanetDef["stats"];
    description: string;
    definition: PlanetDef;
    degree: number;
    chokepointScore: number;
    radius: number;
    basePosition: THREE.Vector3;
    targetAlpha: number;
    visualAlpha: number;
    planetMesh: THREE.Mesh;
    visuals: {
      sphereMat: THREE.MeshStandardMaterial;
      glowMat: THREE.SpriteMaterial;
      haloMat: THREE.MeshBasicMaterial;
      ring?: THREE.Mesh;
      ringGlow?: THREE.Mesh;
    };
    flag?: THREE.Group;
  };
};

type EdgeObject = {
  pair: [number, number];
  line: THREE.Line;
  alpha: number;
  targetAlpha: number;
};

type PulseObject = {
  pair: [number, number];
  sprite: THREE.Sprite;
  speed: number;
  offset: number;
  alpha: number;
  targetAlpha: number;
};

const DEFAULT_OPTIONS: Required<GalaxyPlanetNetworkOptions> = {
  placementMode: "optimized",
  layout: {
    pattern: "radialMindMap",
    seed: 20260309,
    planeY: 0,
    ringSpacing: 30,
    radialJitter: 2.2,
    tangentJitter: 4.8,
    rootSectorPadding: 0.18,
    sectorPadding: 0.14
  },
  focus: {
    neighborDepth: 1,
    distance: 32,
    tweenSeconds: 0.9
  },
  label: {
    fontSize: 52,
    baseScale: 0.02,
    offset: 1.15
  }
};

const FACTION_DEFS = {
  alliance: { color: 0x67c7ff, text: "#8ad6ff", label: "ALLIANCE" },
  empire:   { color: 0xff7b9e, text: "#ff9db6", label: "EMPIRE" },
  guild:    { color: 0xffc96a, text: "#ffd78d", label: "GUILD" },
  neutral:  { color: 0xb7b9d8, text: "#d2d4ef", label: "NEUTRAL" }
} as const;

export class GalaxyPlanetNetwork implements ILoop, IWorldMapObject {
  LoopId: number = 0;
  get Mesh() { return this.root; }
  readonly Type = MapEntryType.GalaxyPlanetNetwork;
  public onSelectionChanged?: (info: PlanetInfoViewModel) => void;
  public onFocusModeChanged?: (focused: boolean) => void;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly eventCtrl: IEventController;
  private readonly interactionDom: HTMLElement;
  private readonly controls?: GalaxyContext["controls"];
  private options?: Required<GalaxyPlanetNetworkOptions>;

  private readonly root = new THREE.Group();
  private readonly labelGroup = new THREE.Group();
  private readonly edgeGroup = new THREE.Group();
  private readonly routePulseGroup = new THREE.Group();
  private readonly markerGroup = new THREE.Group();
  private readonly selectedGroup = new THREE.Group();
  private readonly chokepointGroup = new THREE.Group();

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  private planets: PlanetGroup[] = [];
  private labels: THREE.Sprite[] = [];
  private linePairs: Array<[number, number]> = [];
  private adjacency: Array<Set<number>> = [];
  private chokepointScores: number[] = [];
  private chokepointIndices = new Set<number>();
  private edgeObjects: EdgeObject[] = [];
  private routePulses: PulseObject[] = [];
  private visiblePlanetSet: Set<number> | null = null;

  private selectedPlanetIndex = 0;
  private focusMode = false;
  private overviewTarget = new THREE.Vector3();
  private overviewPosition = new THREE.Vector3();
  private overviewMinDistance = 40;
  private overviewMaxDistance = 220;
  private internalTarget = new THREE.Vector3();

  private pointerDownInfo: { x: number; y: number } | null = null;
  private clickTargets: THREE.Object3D[] = [];

  private selectedOuter!: THREE.Mesh;
  private selectedMid!: THREE.Mesh;
  private selectedGlow!: THREE.Sprite;

  private cameraTween = {
    active: false,
    progress: 1,
    duration: 0.9,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    onComplete: undefined as (() => void) | undefined
  };

  // 임시 투영 계산용 카메라 - 매번 생성하지 않고 재사용
  private readonly tempCam = new THREE.PerspectiveCamera();

  constructor(private ctx: GalaxyContext) {
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.renderer = ctx.renderer;
    this.eventCtrl = ctx.eventCtrl;
    this.interactionDom = ctx.interactionDom ?? ctx.renderer.domElement;
    this.controls = ctx.controls;
  }

  Create(mapDef: GalaxyMapDef, options: GalaxyPlanetNetworkOptions = {}) {
    this.dispose();

    this.options = {
      placementMode: options.placementMode ?? DEFAULT_OPTIONS.placementMode,
      layout: { ...DEFAULT_OPTIONS.layout, ...(options.layout ?? {}) },
      focus: { ...DEFAULT_OPTIONS.focus, ...(options.focus ?? {}) },
      label: { ...DEFAULT_OPTIONS.label, ...(options.label ?? {}) }
    };

    const resolved = this.resolveGalaxyMap(mapDef);

    this.root.add(
      this.labelGroup,
      this.edgeGroup,
      this.routePulseGroup,
      this.markerGroup,
      this.selectedGroup,
      this.chokepointGroup
    );

    this.injectGalaxyMap(resolved);
    this.buildEdges();
    this.buildMarkers();
    this.buildSelectedDecor();
    this.buildChokepointDecor();
    this.computeOverviewState();
    this.applyVisibilityTargets();
    this.refreshSelectedDecor();
    this.bindEvents();
    this.emitSelection();
    if (this.onFocusModeChanged) this.onFocusModeChanged(false);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

    this.root.userData.obj = this
    return this.root;
  }

  Delete() {
    this.dispose();
  }

  update(delta: number, elapsed: number): void {
    if (this.planets.length === 0) return;

    if (this.cameraTween.active) {
      this.cameraTween.progress += delta / this.cameraTween.duration;
      const p = Math.min(this.cameraTween.progress, 1);
      const eased = 1 - Math.pow(1 - p, 3);

      this.camera.position.lerpVectors(this.cameraTween.startPos, this.cameraTween.endPos, eased);

      const currentTarget = this.currentTarget();
      currentTarget.lerpVectors(this.cameraTween.startTarget, this.cameraTween.endTarget, eased);
      this.camera.lookAt(currentTarget);

      if (p >= 1) {
        this.cameraTween.active = false;
        if (this.cameraTween.onComplete) this.cameraTween.onComplete();
        this.cameraTween.onComplete = undefined;

        // Ensure OrbitControls is synced with the final state
        this.eventCtrl.SendEventMessage(EventTypes.OrbitControlsOnOff, true);
        if (this.controls) {
          this.controls.target.copy(this.cameraTween.endTarget);
          this.controls.update?.();
        }
      }
    } else {

      this.controls?.update?.();
    }

    this.planets.forEach((planet, i) => {
      const mesh = planet.userData.planetMesh;
      planet.position.copy(planet.userData.basePosition);

      planet.rotation.y += 0.0008 + i * 0.0001;
      mesh.rotation.y += 0.0018 + i * 0.00018;

      planet.userData.visualAlpha += (planet.userData.targetAlpha - planet.userData.visualAlpha) * 0.10;
      this.applyPlanetOpacity(planet, planet.userData.visualAlpha);

      const targetScale = i === this.selectedPlanetIndex ? 1.07 : 1.0;
      const nextScale = THREE.MathUtils.lerp(planet.scale.x, targetScale, 0.08);
      planet.scale.setScalar(nextScale);

      const flag = planet.userData.flag;
      if (flag) {
        const mat = flag.userData.clothMat as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = elapsed + i * 0.45;

        const camDir = new THREE.Vector3().subVectors(this.camera.position, planet.position);
        camDir.y = 0;
        if (camDir.lengthSq() > 0.0001) {
          const targetYaw = Math.atan2(camDir.x, camDir.z);
          flag.rotation.y = THREE.MathUtils.lerp(flag.rotation.y, targetYaw, 0.08);
        }
      }
    });

    this.labels.forEach((label) => {
      const planet = this.planets[(label.userData as any).planetIndex];
      label.position.set(
        planet.position.x,
        planet.position.y - planet.userData.radius - this.options!.label.offset!,
        planet.position.z
      );

      // 카메라 거리에 따른 동적 스케일링 (화면상 크기 유지)
      const dist = this.camera.position.distanceTo(label.position);
      // 포커스 뷰 기준 거리 (기존 focusOnPlanet의 dist 계산식 참조)
      const focusDist = (this.options!.focus.distance ?? 32) + planet.userData.radius * 4.0;
      // 기준 스케일 계수 (makeTextSprite에서 설정한 0.02)
      const baseScale = this.options!.label.baseScale!;
      const scaleFactor = (dist / focusDist) * baseScale;
      
      const ud = label.userData as any;
      label.scale.set(ud.baseWidth * scaleFactor, ud.baseHeight * scaleFactor, 1);

      (label.userData as any).alpha += ((label.userData as any).targetAlpha - (label.userData as any).alpha) * 0.12;
      (label.material as THREE.SpriteMaterial).opacity = (label.userData as any).alpha;
      label.visible = (label.userData as any).alpha > 0.03;
    });
  }

  dispose(): void {
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    this.unbindEvents();

    if (this.root.parent === this.scene) {
      this.scene.remove(this.root);
    }

    this.disposeObjectTree(this.root);

    this.root.clear();
    this.labelGroup.clear();
    this.edgeGroup.clear();
    this.routePulseGroup.clear();
    this.markerGroup.clear();
    this.selectedGroup.clear();
    this.chokepointGroup.clear();

    this.planets = [];
    this.labels = [];
    this.linePairs = [];
    this.adjacency = [];
    this.chokepointScores = [];
    this.chokepointIndices.clear();
    this.edgeObjects = [];
    this.routePulses = [];
    this.visiblePlanetSet = null;
    this.clickTargets = [];
    this.pointerDownInfo = null;
    this.focusMode = false;
    this.selectedPlanetIndex = 0;
    this.cameraTween.active = false;
    this.cameraTween.onComplete = undefined;
  }

  focusOnPlanet(indexOrId: number | string): void {
    const index = typeof indexOrId === "string"
      ? this.planets.findIndex((p) => p.userData.id === indexOrId)
      : indexOrId;

    if (index < 0 || index >= this.planets.length) return;

    this.selectedPlanetIndex = index;
    this.focusMode = true;
    if (this.onFocusModeChanged) this.onFocusModeChanged(true);
    this.applyVisibilityTargets();
    this.refreshSelectedDecor();
    this.emitSelection();

    const selected = this.planets[index];
    const target = selected.userData.basePosition.clone();

    let dir = this.camera.position.clone().sub(this.currentTarget());
    if (dir.lengthSq() < 0.0001) dir.set(0.55, 0.36, 1.0);
    dir.normalize();

    const dist = (this.options!.focus.distance ?? 32) + selected.userData.radius * 4.0;

    // 최종 카메라 위치(endPos)를 먼저 계산한 뒤, 그 카메라 기준으로 UI 회피 offset을 구한다.
    // (현재 원거리 카메라 기준으로 계산하면 depth 차이로 인해 offset이 과도하게 커짐)
    const baseEndPos = target.clone()
      .add(dir.clone().multiplyScalar(dist))
      .add(new THREE.Vector3(0, dist * 0.06, 0));

    // tempCam을 재사용하여 최종 카메라 위치 기준의 orbit 중심(shiftedTarget) 계산
    this.tempCam.fov = this.camera.fov;
    this.tempCam.aspect = this.camera.aspect;
    this.tempCam.near = this.camera.near;
    this.tempCam.far = this.camera.far;
    this.tempCam.updateProjectionMatrix();
    this.tempCam.position.copy(baseEndPos);
    this.tempCam.lookAt(target);
    this.tempCam.updateMatrixWorld();

    const shiftedTarget = this.getFocusAreaCenterWorld(target, baseEndPos);

    const endPos = shiftedTarget.clone()
      .add(dir.multiplyScalar(dist))
      .add(new THREE.Vector3(0, dist * 0.06, 0));

    this.startCameraTween(endPos, shiftedTarget, this.options!.focus.tweenSeconds ?? 1, () => {
      if (this.controls) {
        this.controls.minDistance = Math.max(10, dist * 0.55);
        this.controls.maxDistance = dist * 2.4;
      }
    });
  }

  resetToOverview(): void {
    this.focusMode = false;
    if (this.onFocusModeChanged) this.onFocusModeChanged(false);
    this.applyVisibilityTargets();

    this.startCameraTween(
      this.overviewPosition,
      this.overviewTarget,
      this.options!.focus.tweenSeconds ?? 1,
      () => {
        if (this.controls) {
          this.controls.minDistance = this.overviewMinDistance;
          this.controls.maxDistance = this.overviewMaxDistance;
        }
      }
    );
  }

  getSelectedPlanetInfo(): PlanetInfoViewModel {
    return this.buildPlanetInfo(this.selectedPlanetIndex);
  }

  private emitSelection(): void {
    this.onSelectionChanged?.(this.getSelectedPlanetInfo());
  }

  private buildSelectedDecor(): void {
    this.selectedOuter = this.createMarkerRing(1.0, 0xffffff, 0.34);
    this.selectedOuter.rotation.x = -Math.PI * 0.5;
    this.selectedGroup.add(this.selectedOuter);

    this.selectedMid = this.createMarkerRing(1.0, 0xffffff, 0.18);
    this.selectedMid.rotation.x = -Math.PI * 0.5;
    this.selectedGroup.add(this.selectedMid);

    this.selectedGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createStarTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.selectedGlow.scale.set(12, 12, 1);
    this.selectedGlow.frustumCulled = false;
    this.selectedGroup.add(this.selectedGlow);
  }

  private buildChokepointDecor(): void {
    const ranked = this.chokepointScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score);

    const count = Math.max(4, Math.ceil(this.planets.length * 0.22));
    this.chokepointIndices = new Set(ranked.slice(0, count).map((v) => v.index));

    for (const index of this.chokepointIndices) {
      const planet = this.planets[index];
      const ring = this.createMarkerRing(planet.userData.radius * 2.45, 0xffe48f, 0.28);
      ring.rotation.x = -Math.PI * 0.5;
      ring.userData.planetIndex = index;
      this.chokepointGroup.add(ring);

      const badge = this.makeTextSprite("요충", "#ffe48f", 42);
      badge.userData.planetIndex = index;
      this.chokepointGroup.add(badge);
    }
  }

  private buildMarkers(): void {
    this.planets.forEach((planet, i) => {
      const r = planet.userData.radius;
      const color = FACTION_DEFS[planet.userData.faction].color;

      const outer = this.createMarkerRing(r * 1.95, color, 0.24);
      outer.rotation.x = -Math.PI * 0.5;
      outer.userData.planetIndex = i;
      outer.userData.baseOpacity = 0.24;
      this.markerGroup.add(outer);

      const inner = this.createMarkerRing(r * 1.55, color, 0.11);
      inner.rotation.x = -Math.PI * 0.5;
      inner.userData.planetIndex = i;
      inner.userData.baseOpacity = 0.11;
      this.markerGroup.add(inner);
    });
  }

  private buildEdges(): void {
    this.edgeObjects = [];
    this.routePulses = [];

    for (const pair of this.linePairs) {
      const [aIdx, bIdx] = pair;
      const a = this.planets[aIdx].position;
      const b = this.planets[bIdx].position;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [a.x, a.y, a.z, b.x, b.y, b.z],
          3
        )
      );
      geometry.computeBoundingSphere();

      const material = new THREE.LineBasicMaterial({
        color: this.getEdgeFrontColor(aIdx, bIdx),
        transparent: true,
        opacity: 0.58,
        depthWrite: false
      });

      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      line.renderOrder = 2;

      this.edgeGroup.add(line);
      this.edgeObjects.push({
        pair,
        line,
        alpha: 0.58,
        targetAlpha: 0.58
      });

      const pulse = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.createStarTexture(),
          color: 0xaef1ff,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      pulse.scale.set(1.25, 1.25, 1);
      pulse.frustumCulled = false;
      pulse.renderOrder = 3;

      this.routePulseGroup.add(pulse);
      this.routePulses.push({
        pair,
        sprite: pulse,
        speed: 0.08 + (this.routePulses.length % 5) * 0.012,
        offset: (this.routePulses.length * 0.17) % 1,
        alpha: 0.9,
        targetAlpha: 0.9
      });
    }
  }

  private injectGalaxyMap(mapDef: GalaxyMapDef): void {
    const starTexture = this.createStarTexture();

    const texJovian = this.createPlanetTexture({
      base: "#8b6138",
      mode: "bands",
      accent1: "#f8ddb4",
      accent2: "#8a4722",
      accent3: "#d9915a"
    });
    const texPink = this.createPlanetTexture({
      base: "#cb5d97",
      mode: "spots",
      accent1: "#ffe1f2",
      accent2: "#8d2c5d",
      accent3: "#ffb16c"
    });
    const texIce = this.createPlanetTexture({
      base: "#79d7ff",
      mode: "ice",
      accent1: "#ffffff",
      accent2: "#72a2ff",
      accent3: "#baffff"
    });
    const texRock = this.createPlanetTexture({
      base: "#7f6a60",
      mode: "cracks",
      accent1: "#e7d9cf",
      accent2: "#463731",
      accent3: "#c89d73"
    });
    const texCloud = this.createPlanetTexture({
      base: "#6c89ff",
      mode: "swirl",
      accent1: "#f2f7ff",
      accent2: "#415ed2",
      accent3: "#dac6ff"
    });

    const ringTexA = this.createRingTexture(["#ffffff", "#dabdff", "#6d6686", "#aef5e9", "#ffffff"]);
    const ringTexB = this.createRingTexture(["#fff2d5", "#ffc7dd", "#8ba8ff", "#d7f8ff", "#ffffff"]);

    const planetAssetCatalog = {
      amberBands: { texture: texJovian, emissive: 0x5a3218, glowColor: 0xffb97c },
      roseSpots: { texture: texPink, emissive: 0x7d2252, glowColor: 0xff8fd6 },
      azureIce: { texture: texIce, emissive: 0x1a7b95, glowColor: 0x97f5ff },
      basaltCracks: { texture: texRock, emissive: 0x53382a, glowColor: 0xffcb9d },
      cobaltSwirl: { texture: texCloud, emissive: 0x2f4ea8, glowColor: 0xc1d2ff }
    } as const;

    const ringCatalog = {
      aurora: ringTexA,
      prism: ringTexB
    } as const;

    mapDef.planets.forEach((def, i) => {
      const asset = planetAssetCatalog[def.assetKey as keyof typeof planetAssetCatalog];
      const ringTexture = def.ring ? ringCatalog[def.ring.textureKey as keyof typeof ringCatalog] : null;

      const planet = this.createPlanet({
        radius: def.radius,
        texture: asset.texture,
        emissive: asset.emissive,
        glowColor: asset.glowColor,
        ringTexture,
        starTexture,
        ringTiltX: def.ring?.tiltX ?? 0.45,
        ringTiltY: def.ring?.tiltY ?? 0.2
      }) as PlanetGroup;

      planet.position.fromArray(def.position!);
      planet.userData.index = i;
      planet.userData.id = def.id;
      planet.userData.name = def.name;
      planet.userData.faction = def.faction;
      planet.userData.stats = def.stats;
      planet.userData.description = def.description;
      planet.userData.definition = def;
      planet.userData.degree = 0;
      planet.userData.chokepointScore = 0;
      planet.userData.basePosition = new THREE.Vector3().fromArray(def.position!);
      planet.userData.targetAlpha = 1;
      planet.userData.visualAlpha = 1;

      const factionColor = FACTION_DEFS[def.faction].color;
      const flag = this.createFactionFlag(factionColor, starTexture, def.radius);
      flag.position.set(0, def.radius, 0);
      planet.add(flag);
      planet.userData.flag = flag;

      const label = this.makeTextSprite(def.name, FACTION_DEFS[def.faction].text, this.options!.label.fontSize!);
      label.position.copy(planet.position).add(new THREE.Vector3(0, -def.radius - this.options!.label.offset!, 0));
      label.userData.planetIndex = i;
      label.userData.alpha = 1;
      label.userData.targetAlpha = 1;
      this.labelGroup.add(label);

      this.planets.push(planet);
      this.labels.push(label);
      this.root.add(planet);
    });

    this.linePairs = this.buildLinePairsFromPlanets(mapDef.planets);
    this.adjacency = this.buildAdjacency(mapDef.planets, this.linePairs);
    this.chokepointScores = this.computeBetweennessCentrality(this.adjacency);
    this.selectedPlanetIndex = Math.max(0, mapDef.planets.findIndex((p) => p.id === mapDef.selectedPlanetId));

    this.planets.forEach((planet, i) => {
      planet.userData.degree = this.adjacency[i].size;
      planet.userData.chokepointScore = this.chokepointScores[i];
    });

    // 행성 메쉬와 라벨 스프라이트를 모두 클릭 대상에 포함합니다.
    this.clickTargets = [
      ...this.planets.map((p) => p.userData.planetMesh),
      ...this.labels
    ];
  }

  private refreshSelectedDecor(): void {
    const selected = this.planets[this.selectedPlanetIndex];
    const color = FACTION_DEFS[selected.userData.faction].color;
    const radius = selected.userData.radius;

    (this.selectedOuter.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.selectedMid.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    (this.selectedGlow.material as THREE.SpriteMaterial).color.setHex(color);

    this.selectedOuter.scale.setScalar(radius * 2.9);
    this.selectedMid.scale.setScalar(radius * 2.3);
    this.selectedGlow.scale.set(radius * 12, radius * 12, 1);
  }

  private updateSelectedDecor(elapsed: number): void {
    const selected = this.planets[this.selectedPlanetIndex];
    this.selectedGroup.position.copy(selected.position).add(
      new THREE.Vector3(0, -selected.userData.radius - 0.2, 0)
    );

    this.selectedOuter.rotation.z += 0.006;
    this.selectedMid.rotation.z -= 0.004;

    (this.selectedOuter.material as THREE.MeshBasicMaterial).opacity =
      0.24 + (Math.sin(elapsed * 1.8) * 0.5 + 0.5) * 0.18;
    (this.selectedMid.material as THREE.MeshBasicMaterial).opacity =
      0.12 + (Math.sin(elapsed * 2.1 + 0.8) * 0.5 + 0.5) * 0.12;
    (this.selectedGlow.material as THREE.SpriteMaterial).opacity =
      0.14 + (Math.sin(elapsed * 2.0) * 0.5 + 0.5) * 0.16;
  }

  private updateMarkers(elapsed: number): void {
    this.markerGroup.children.forEach((marker, i) => {
      const mesh = marker as THREE.Mesh;
      const planetIndex = (mesh.userData as any).planetIndex;
      const planet = this.planets[planetIndex];
      const color = FACTION_DEFS[planet.userData.faction].color;

      mesh.position.set(
        planet.position.x,
        planet.position.y - planet.userData.radius - (i % 2 === 0 ? 0.25 : 0.23),
        planet.position.z
      );

      (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);

      const wobble =
        (i % 2 === 0 ? 0.06 : 0.035) *
        ((Math.sin(elapsed * 1.1 + i * 0.45) * 0.5) + 0.5);

      (mesh.userData as any).alpha = THREE.MathUtils.lerp(
        (mesh.userData as any).alpha ?? 0,
        (mesh.userData as any).targetAlpha ?? 0,
        0.12
      );

      (mesh.material as THREE.MeshBasicMaterial).opacity =
        (mesh.userData as any).alpha + wobble;

      mesh.rotation.z += 0.0012 * (i % 2 === 0 ? 1 : -1);
    });

    this.chokepointGroup.children.forEach((child, i) => {
      const planetIndex = (child.userData as any).planetIndex;
      if (planetIndex == null) return;

      const planet = this.planets[planetIndex];

      if (child instanceof THREE.Mesh) {
        child.position.set(
          planet.position.x,
          planet.position.y - planet.userData.radius - 0.28,
          planet.position.z
        );
        child.rotation.z += 0.003 + i * 0.0002;
      } else if (child instanceof THREE.Sprite) {
        child.position.set(
          planet.position.x,
          planet.position.y + planet.userData.radius + 4.1,
          planet.position.z
        );
      }
    });
  }

  private updateEdges(elapsed: number): void {
    this.edgeObjects.forEach((edge) => {
      edge.alpha += (edge.targetAlpha - edge.alpha) * 0.12;

      const [aIdx, bIdx] = edge.pair;
      const a = this.planets[aIdx].position;
      const b = this.planets[bIdx].position;

      const pos = edge.line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, a.x, a.y, a.z);
      pos.setXYZ(1, b.x, b.y, b.z);
      pos.needsUpdate = true;
      edge.line.geometry.computeBoundingSphere();

      const color = this.getEdgeFrontColor(aIdx, bIdx);
      const isSelectedLink = aIdx === this.selectedPlanetIndex || bIdx === this.selectedPlanetIndex;
      const finalColor = isSelectedLink ? this.mixHex(color, 0xffffff, 0.18) : color;

      const mat = edge.line.material as THREE.LineBasicMaterial;
      mat.opacity = edge.alpha;
      mat.color.setHex(finalColor);

      edge.line.visible = mat.opacity > 0.02;
    });

    this.routePulses.forEach((rp, i) => {
      rp.alpha += (rp.targetAlpha - rp.alpha) * 0.12;

      const a = this.planets[rp.pair[0]].position;
      const b = this.planets[rp.pair[1]].position;
      const t = (elapsed * rp.speed + rp.offset) % 1;
      rp.sprite.position.lerpVectors(a, b, t);

      const color = this.getEdgeFrontColor(rp.pair[0], rp.pair[1]);
      const mat = rp.sprite.material as THREE.SpriteMaterial;
      mat.color.setHex(color);
      mat.opacity = rp.alpha * (0.72 + Math.sin(elapsed * 4.0 + i) * 0.12);

      rp.sprite.visible = mat.opacity > 0.03;
    });
  }

  private applyVisibilityTargets(): void {
    this.visiblePlanetSet = this.focusMode
      ? this.getNeighborhoodSet(this.selectedPlanetIndex, this.adjacency, this.options!.focus.neighborDepth)
      : null;

    this.planets.forEach((planet, i) => {
      planet.userData.targetAlpha = !this.focusMode
        ? 1
        : (this.visiblePlanetSet!.has(i) ? 1 : 0.045);
    });

    this.labels.forEach((label) => {
      const idx = (label.userData as any).planetIndex;
      (label.userData as any).targetAlpha = this.planets[idx].userData.targetAlpha;
    });

    this.markerGroup.children.forEach((marker) => {
      const idx = (marker.userData as any).planetIndex;
      (marker.userData as any).targetAlpha =
        ((marker.userData as any).baseOpacity ?? 0.2) *
        this.planets[idx].userData.targetAlpha;
    });

    this.edgeObjects.forEach((edge) => {
      const [a, b] = edge.pair;
      edge.targetAlpha = !this.focusMode
        ? 0.58
        : (this.visiblePlanetSet!.has(a) && this.visiblePlanetSet!.has(b) ? 0.72 : 0.03);
    });

    this.routePulses.forEach((pulse) => {
      const [a, b] = pulse.pair;
      pulse.targetAlpha = !this.focusMode
        ? 0.88
        : (this.visiblePlanetSet!.has(a) && this.visiblePlanetSet!.has(b) ? 0.84 : 0.04);
    });
  }

  private buildPlanetInfo(index: number): PlanetInfoViewModel {
    const planet = this.planets[index];
    const faction = FACTION_DEFS[planet.userData.faction];
    const stats = planet.userData.stats;
    const neighbors = [...this.adjacency[index]].map(i => ({
      name: this.planets[i].userData.name,
      id: this.planets[i].userData.id
    }));
    const isChoke = this.chokepointIndices.has(index);


    return {
      id: planet.userData.id,
      name: planet.userData.name,
      factionLabel: faction.label,
      factionTextColor: faction.text,
      factionBgColor: `${this.hexToCss(faction.color)}22`,
      factionBorderColor: `${this.hexToCss(faction.color)}55`,
      isChokepoint: isChoke,
      subtitle: isChoke
        ? "방사형 회랑의 중심을 통제하는 전략적 요충지"
        : "방사형 항로망에서 기능하는 전략 거점",
      economy: stats.economy,
      industry: stats.industry,
      defense: stats.defense,
      fleet: stats.stationedFleet,
      population: stats.population,
      resource: stats.resource,
      degree: planet.userData.degree,
      chokeScore: planet.userData.chokepointScore,
      description: planet.userData.description,
      neighbors
    };
  }

  private applyPlanetOpacity(planet: PlanetGroup, alpha: number): void {
    const visuals = planet.userData.visuals;
    visuals.sphereMat.opacity = alpha;
    visuals.glowMat.opacity = 0.30 * alpha;
    visuals.haloMat.opacity = 0.06 * alpha;

    if (visuals.ring) {
      (visuals.ring.material as THREE.MeshBasicMaterial).opacity = 0.98 * alpha;
    }
    if (visuals.ringGlow) {
      (visuals.ringGlow.material as THREE.MeshBasicMaterial).opacity = 0.10 * alpha;
    }

    const flag = planet.userData.flag;
    if (flag) {
      flag.userData.alpha = THREE.MathUtils.lerp(flag.userData.alpha ?? 1, alpha, 0.12);
      (flag.userData.pole.material as THREE.MeshStandardMaterial).opacity = flag.userData.alpha;
      (flag.userData.clothMat as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.96 * flag.userData.alpha;
      (flag.userData.glow.material as THREE.SpriteMaterial).opacity = 0.18 * flag.userData.alpha;
    }
  }

  private startCameraTween(endPos: THREE.Vector3, endTarget: THREE.Vector3, duration: number, onComplete?: () => void): void {
    // Disable OrbitControls during tweening to prevent jitter
    this.eventCtrl.SendEventMessage(EventTypes.OrbitControlsOnOff, false);

    this.cameraTween.active = true;
    this.cameraTween.progress = 0;
    this.cameraTween.duration = Math.max(0.001, duration);
    this.cameraTween.startPos.copy(this.camera.position);
    this.cameraTween.endPos.copy(endPos);
    this.cameraTween.startTarget.copy(this.currentTarget());
    this.cameraTween.endTarget.copy(endTarget);
    this.cameraTween.onComplete = onComplete;
  }


  private currentTarget(): THREE.Vector3 {
    return this.controls?.target ?? this.internalTarget;
  }

  private getFocusAreaCenterWorld(planetPos: THREE.Vector3, cameraPos: THREE.Vector3): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = getGalaxyFocusCenterNdc(rect.width, rect.height);
    console.log(rect, ndc)

    // If no UI offset is needed, just return the planet position
    if (Math.abs(ndc.x) < 0.0001 && Math.abs(ndc.y) < 0.0001) return planetPos.clone();

    // 1. Setup a temporary camera at the intended end position
    this.tempCam.copy(this.camera);
    this.tempCam.position.copy(cameraPos);
    this.tempCam.lookAt(planetPos);
    this.tempCam.updateMatrixWorld();
    this.tempCam.updateProjectionMatrix();

    // 2. We want the 'planetPos' to appear at 'ndc' in the viewport.
    // This means the camera should actually be looking at a point that is 
    // offset by '-ndc' from the planet's perspective in screen space.
    const invNdc = new THREE.Vector3(-ndc.x, -ndc.y, 0.5);
    const rayPoint = invNdc.unproject(this.tempCam);
    const rayDir = rayPoint.sub(this.tempCam.position).normalize();

    // 3. Find the point along this ray at the same depth as the planet
    const viewDir = new THREE.Vector3();
    this.tempCam.getWorldDirection(viewDir);
    const planetDepth = planetPos.clone().sub(this.tempCam.position).dot(viewDir);

    // 4. This is our new target. When the camera looks here, 
    // the original planetPos will be shifted to the desired 'ndc' position.
    return this.tempCam.position.clone().add(rayDir.multiplyScalar(planetDepth));
  }


  private computeOverviewState(): void {
    const center = new THREE.Vector3();
    this.planets.forEach((p) => center.add(p.userData.basePosition));
    center.multiplyScalar(1 / this.planets.length);

    let maxRadius = 10;
    this.planets.forEach((planet) => {
      const p = planet.userData.basePosition;
      const d = Math.hypot(p.x - center.x, p.z - center.z);
      if (d > maxRadius) maxRadius = d;
    });

    this.overviewTarget.copy(center);
    this.overviewPosition.copy(center).add(
      new THREE.Vector3(0, maxRadius * 0.68 + 46, maxRadius * 1.36 + 52)
    );
    this.overviewMinDistance = Math.max(40, maxRadius * 0.48);
    this.overviewMaxDistance = Math.max(220, maxRadius * 3.2);

    this.camera.position.copy(this.overviewPosition);
    this.currentTarget().copy(this.overviewTarget);

    if (this.controls) {
      this.controls.minDistance = this.overviewMinDistance;
      this.controls.maxDistance = this.overviewMaxDistance;
    }
  }

  private bindEvents(): void {
    this.interactionDom.addEventListener("pointerdown", this.handlePointerDown);
    this.interactionDom.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  private unbindEvents(): void {
    this.interactionDom.removeEventListener("pointerdown", this.handlePointerDown);
    this.interactionDom.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownInfo = { x: event.clientX, y: event.clientY };
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointerDownInfo) return;

    const dx = event.clientX - this.pointerDownInfo.x;
    const dy = event.clientY - this.pointerDownInfo.y;
    this.pointerDownInfo = null;

    if (dx * dx + dy * dy > 16) return;

    const picked = this.pickPlanet(event);
    if (!picked) return;

    const pickedIndex = picked.userData.index;

    // If already in focus mode and clicking the SAME planet, return to overview.
    if (this.focusMode && this.selectedPlanetIndex === pickedIndex) {
      this.resetToOverview();
      return;
    }

    // Otherwise, focus on the new (or current) planet.
    this.focusOnPlanet(pickedIndex);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.resetToOverview();
  };

  private pickPlanet(event: PointerEvent): PlanetGroup | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickTargets, false);
    if (!hits.length) return null;

    const hitObject = hits[0].object;

    // 클릭된 객체가 라벨(Sprite)인 경우, userData에 저장된 인덱스로 행성 반환
    if (hitObject.userData && hitObject.userData.planetIndex !== undefined) {
      return this.planets[hitObject.userData.planetIndex];
    }

    // 클릭된 객체가 행성(Mesh)인 경우, 기존처럼 부모 객체를 반환
    return hitObject.parent as PlanetGroup;
  }

  private resolveGalaxyMap(mapDef: GalaxyMapDef): GalaxyMapDef {
    const resolved: GalaxyMapDef = {
      selectedPlanetId: mapDef.selectedPlanetId,
      planets: mapDef.planets.map((planet) => ({
        ...planet,
        links: [...(planet.links ?? [])],
        stats: { ...planet.stats }
      }))
    };

    if (this.options!.placementMode === "manual") {
      resolved.planets.forEach((planet) => {
        planet.position = planet.manualPosition ?? [0, 0, 0];
      });
      return resolved;
    }

    const positions = this.generateRadialMindMapLayout(
      resolved.planets,
      resolved.selectedPlanetId
    );

    resolved.planets.forEach((planet, i) => {
      const p = positions[i];
      planet.position = [p.x, p.y, p.z];
    });

    return resolved;
  }

  private generateRadialMindMapLayout(planetsDef: PlanetDef[], preferredRootId: string): THREE.Vector3[] {
    const adjacency = this.buildAdjacencyFromDefs(planetsDef);
    const n = planetsDef.length;
    const idToIndex = new Map(planetsDef.map((p, i) => [p.id, i]));
    const orderMap = new Map(planetsDef.map((p, i) => [p.id, i]));

    let rootIndex: number = idToIndex.get(preferredRootId) ?? 0;

    const children = Array.from({ length: n }, () => [] as number[]);
    const visited = new Array(n).fill(false);
    const depth = new Array(n).fill(0);

    const dfs = (node: number, parent = -1, d = 0) => {
      visited[node] = true;
      depth[node] = d;

      const ordered = [...adjacency[node]].sort(
        (a, b) => (orderMap.get(planetsDef[a].id)! - orderMap.get(planetsDef[b].id)!)
      );

      for (const next of ordered) {
        if (next === parent || visited[next]) continue;
        children[node].push(next);
        dfs(next, node, d + 1);
      }
    };

    dfs(rootIndex);

    const weight = new Array(n).fill(1);
    const calcWeight = (node: number): number => {
      if (!children[node].length) return (weight[node] = 1);
      let sum = 0;
      children[node].forEach((c) => (sum += calcWeight(c)));
      weight[node] = Math.max(1, sum);
      return weight[node];
    };
    calcWeight(rootIndex);

    const angles = new Array(n).fill(0);
    const assignAngles = (node: number, startAngle: number, endAngle: number) => {
      angles[node] = (startAngle + endAngle) * 0.5;
      if (!children[node].length) return;

      const total = children[node].reduce((acc, c) => acc + weight[c], 0);
      let cursor = startAngle;

      for (const child of children[node]) {
        const rawSpan = ((endAngle - startAngle) * weight[child]) / total;
        const padding = node === rootIndex
          ? this.options!.layout.rootSectorPadding
          : this.options!.layout.sectorPadding;

        const childStart = cursor + rawSpan * padding! * 0.5;
        const childEnd = cursor + rawSpan * (1 - padding! * 0.5);
        assignAngles(child, childStart, childEnd);
        cursor += rawSpan;
      }
    };

    assignAngles(rootIndex, -Math.PI * 0.5, Math.PI * 1.5);

    const positions = Array.from({ length: n }, () => new THREE.Vector3());
    positions[rootIndex].set(0, this.options!.layout.planeY!, 0);

    for (let i = 0; i < n; i++) {
      if (i === rootIndex) continue;

      const d = depth[i];
      const theta = angles[i];

      const radius =
        d * this.options!.layout.ringSpacing! +
        Math.sin(i * 1.73 + d * 0.41) * this.options!.layout.radialJitter!;

      const tangent =
        Math.sin(i * 2.17 + d * 0.83) *
        (this.options!.layout.tangentJitter! / Math.max(1, d));

      positions[i].set(
        Math.cos(theta) * radius + Math.cos(theta + Math.PI * 0.5) * tangent,
        this.options!.layout.planeY!,
        Math.sin(theta) * radius + Math.sin(theta + Math.PI * 0.5) * tangent
      );
    }

    return positions;
  }

  private buildAdjacencyFromDefs(planetsDef: PlanetDef[]): Array<Set<number>> {
    const idToIndex = new Map(planetsDef.map((p, i) => [p.id, i]));
    const adjacency = Array.from({ length: planetsDef.length }, () => new Set<number>());

    planetsDef.forEach((planet, i) => {
      (planet.links ?? []).forEach((targetId) => {
        const j = idToIndex.get(targetId);
        if (j == null || i === j) return;
        adjacency[i].add(j);
        adjacency[j].add(i);
      });
    });

    return adjacency;
  }

  private buildLinePairsFromPlanets(planetsDef: PlanetDef[]): Array<[number, number]> {
    const idToIndex = new Map(planetsDef.map((p, i) => [p.id, i]));
    const edgeSet = new Set<string>();
    const pairs: Array<[number, number]> = [];

    planetsDef.forEach((planet, fromIndex) => {
      (planet.links ?? []).forEach((targetId) => {
        const toIndex = idToIndex.get(targetId);
        if (toIndex == null || fromIndex === toIndex) return;

        const a = Math.min(fromIndex, toIndex);
        const b = Math.max(fromIndex, toIndex);
        const key = `${a}:${b}`;

        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        pairs.push([a, b]);
      });
    });

    return pairs;
  }

  private buildAdjacency(planetsDef: PlanetDef[], pairs: Array<[number, number]>): Array<Set<number>> {
    const adjacency = Array.from({ length: planetsDef.length }, () => new Set<number>());
    pairs.forEach(([a, b]) => {
      adjacency[a].add(b);
      adjacency[b].add(a);
    });
    return adjacency;
  }

  private getNeighborhoodSet(centerIndex: number, adjacency: Array<Set<number>>, depth = 1): Set<number> {
    const visible = new Set<number>([centerIndex]);
    let frontier = new Set<number>([centerIndex]);

    for (let d = 0; d < depth; d++) {
      const next = new Set<number>();
      frontier.forEach((idx) => {
        adjacency[idx].forEach((n) => {
          if (!visible.has(n)) {
            visible.add(n);
            next.add(n);
          }
        });
      });
      frontier = next;
    }

    return visible;
  }

  private computeBetweennessCentrality(adjacency: Array<Set<number>>): number[] {
    const n = adjacency.length;
    const cb = new Array(n).fill(0);

    for (let s = 0; s < n; s++) {
      const stack: number[] = [];
      const pred = Array.from({ length: n }, () => [] as number[]);
      const sigma = new Array(n).fill(0);
      const dist = new Array(n).fill(-1);

      sigma[s] = 1;
      dist[s] = 0;

      const queue = [s];
      for (let q = 0; q < queue.length; q++) {
        const v = queue[q];
        stack.push(v);

        adjacency[v].forEach((w) => {
          if (dist[w] < 0) {
            queue.push(w);
            dist[w] = dist[v] + 1;
          }
          if (dist[w] === dist[v] + 1) {
            sigma[w] += sigma[v];
            pred[w].push(v);
          }
        });
      }

      const delta = new Array(n).fill(0);
      while (stack.length) {
        const w = stack.pop()!;
        pred[w].forEach((v) => {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        });
        if (w !== s) cb[w] += delta[w];
      }
    }

    for (let i = 0; i < n; i++) cb[i] *= 0.5;
    const max = Math.max(...cb, 1e-6);
    return cb.map((v) => v / max);
  }

  private getEdgeFrontColor(aIdx: number, bIdx: number): number {
    const fa = this.planets[aIdx].userData.faction;
    const fb = this.planets[bIdx].userData.faction;
    const ca = FACTION_DEFS[fa].color;
    const cb = FACTION_DEFS[fb].color;
    return fa === fb ? ca : this.mixHex(ca, cb, 0.5);
  }

  private hexToCss(hex: number): string {
    return `#${new THREE.Color(hex).getHexString()}`;
  }

  private mixHex(a: number, b: number, t = 0.5): number {
    return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
  }

  private createMarkerRing(radius: number, color: number, opacity: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.88, radius, 64),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    mesh.userData.alpha = opacity;
    mesh.userData.targetAlpha = opacity;
    return mesh;
  }

  private makeTextSprite(text: string, color = "#ffffff", fontSize = 104): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `bold ${fontSize}px Arial`;

    const paddingX = 44;
    const paddingY = 32;
    const metrics = ctx.measureText(text);
    const width = Math.ceil(metrics.width + paddingX * 2);
    const height = Math.ceil(fontSize + paddingY * 2);

    canvas.width = width;
    canvas.height = height;

    const c = canvas.getContext("2d")!;
    c.font = `bold ${fontSize}px Arial`;
    c.textAlign = "center";
    c.textBaseline = "middle";

    // 텍스트 외곽선 보강
    c.strokeStyle = "rgba(0,0,0,0.8)";
    c.lineWidth = 16;
    c.strokeText(text, width / 2, height / 2 + 2);

    c.fillStyle = color;
    c.fillText(text, width / 2, height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearFilter;
    
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.userData.baseWidth = width;
    sprite.userData.baseHeight = height;
    
    sprite.center.set(0.5, 1.0);
    sprite.frustumCulled = false;
    return sprite;
  }

  private createStarTexture(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0.0, "rgba(255,255,255,1.0)");
    g.addColorStop(0.14, "rgba(255,255,255,0.98)");
    g.addColorStop(0.42, "rgba(185,220,255,0.34)");
    g.addColorStop(1.0, "rgba(0,0,0,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createPlanetTexture(params: {
    base: string;
    mode: "bands" | "spots" | "swirl" | "cracks" | "ice";
    accent1: string;
    accent2: string;
    accent3: string;
  }): THREE.Texture {
    const { base, mode, accent1, accent2, accent3 } = params;
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      ctx.fillRect(x, y, 1, 1);
    }

    if (mode === "bands") {
      for (let i = 0; i < 24; i++) {
        const y = (i / 24) * size + rand(-20, 20);
        const h = rand(18, 62);
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0.0, accent1);
        grad.addColorStop(0.35, accent2);
        grad.addColorStop(0.7, accent3);
        grad.addColorStop(1.0, "#2b1c14");
        ctx.globalAlpha = rand(0.25, 0.55);
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, size, h);
      }
    }

    if (mode === "spots" || mode === "ice") {
      for (let i = 0; i < 140; i++) {
        const x = rand(0, size);
        const y = rand(0, size);
        const r = rand(20, 95);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0.0, accent1);
        g.addColorStop(0.4, accent2);
        g.addColorStop(0.8, accent3);
        g.addColorStop(1.0, "rgba(0,0,0,0)");
        ctx.globalAlpha = rand(0.18, 0.35);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (mode === "swirl") {
      ctx.save();
      ctx.translate(size * 0.5, size * 0.5);
      for (let i = 0; i < 320; i++) {
        const a = i * 0.14;
        const rr = i * 1.7;
        const x = Math.cos(a) * rr * 0.7;
        const y = Math.sin(a) * rr * 0.35;
        ctx.strokeStyle = i % 3 === 0 ? accent1 : (i % 3 === 1 ? accent2 : accent3);
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = rand(6, 20);
        ctx.beginPath();
        ctx.arc(x, y, rand(12, 72), 0, Math.PI * 1.45);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (mode === "cracks") {
      for (let i = 0; i < 95; i++) {
        let x = rand(0, size);
        let y = rand(0, size);
        ctx.strokeStyle = Math.random() > 0.5 ? accent1 : accent3;
        ctx.globalAlpha = rand(0.18, 0.42);
        ctx.lineWidth = rand(1.5, 4.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        const steps = Math.floor(rand(4, 12));
        for (let s = 0; s < steps; s++) {
          x += rand(-80, 80);
          y += rand(-45, 45);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  private createRingTexture(colors: string[]): THREE.Texture {
    const size = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    for (let x = 0; x < size; x++) {
      const t = x / (size - 1);
      const band = 0.45 + 0.25 * Math.sin(t * 18) + 0.18 * Math.sin(t * 67 + 0.7);
      const color = colors[Math.floor(t * colors.length) % colors.length];
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.max(0.04, Math.min(1.0, band));
      ctx.fillRect(x, 0, 1, 64);
    }

    const fade = ctx.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0.0, "rgba(255,255,255,0)");
    fade.addColorStop(0.22, "rgba(255,255,255,1)");
    fade.addColorStop(0.78, "rgba(255,255,255,1)");
    fade.addColorStop(1.0, "rgba(255,255,255,0)");

    ctx.globalCompositeOperation = "destination-in";
    ctx.globalAlpha = 1;
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  private createPlanet(params: {
    radius: number;
    texture: THREE.Texture;
    emissive: number;
    glowColor: number;
    ringTexture: THREE.Texture | null;
    starTexture: THREE.Texture;
    ringTiltX: number;
    ringTiltY: number;
  }): THREE.Group {
    const { radius, texture, emissive, glowColor, ringTexture, starTexture, ringTiltX, ringTiltY } = params;
    const group = new THREE.Group();

    const sphereMat = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      emissive,
      emissiveIntensity: 0.08,
      roughness: 0.78,
      metalness: 0.02,
      transparent: true,
      opacity: 1
    });

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 72, 72),
      sphereMat
    );
    group.add(sphere);

    const glowMat = new THREE.SpriteMaterial({
      map: starTexture,
      color: glowColor,
      transparent: true,
      opacity: 0.30,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(radius * 5.6, radius * 5.6, 1);
    group.add(glow);

    const haloMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.18, 40, 40),
      haloMat
    );
    group.add(halo);

    let ring: THREE.Mesh | undefined;
    let ringGlow: THREE.Mesh | undefined;

    if (ringTexture) {
      const inner = radius * 1.7;
      const outer = radius * 3.05;

      const ringGeo = new THREE.RingGeometry(inner, outer, 180, 1);
      const uv = ringGeo.attributes.uv;

      for (let i = 0; i < uv.count; i++) {
        const x = ringGeo.attributes.position.getX(i);
        const y = ringGeo.attributes.position.getY(i);
        const r = Math.sqrt(x * x + y * y);
        const t = (r - inner) / (outer - inner);
        uv.setXY(i, t, 0.5);
      }
      uv.needsUpdate = true;

      ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          map: ringTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.98,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      ring.rotation.x = ringTiltX;
      ring.rotation.y = ringTiltY;
      group.add(ring);

      ringGlow = new THREE.Mesh(
        new THREE.RingGeometry(inner * 0.98, outer * 1.05, 128),
        new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.10,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      ringGlow.rotation.copy(ring.rotation);
      group.add(ringGlow);
    }

    group.userData.radius = radius;
    group.userData.planetMesh = sphere;
    group.userData.visuals = { sphereMat, glowMat, haloMat, ring, ringGlow };

    return group;
  }

  private createFactionFlag(color: number, starTexture: THREE.Texture, radius: number): THREE.Group {
    const root = new THREE.Group();

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xd8e2f2,
      emissive: 0x556070,
      emissiveIntensity: 0.18,
      roughness: 0.45,
      metalness: 0.55,
      transparent: true,
      opacity: 1
    });

    const poleHeight = 1.45 + radius * 0.55;
    const width = 1.25 + radius * 0.28;
    const height = 0.62 + radius * 0.08;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, poleHeight, 10),
      poleMat
    );
    pole.position.y = poleHeight * 0.5;
    root.add(pole);

    const clothGeo = new THREE.PlaneGeometry(width, height, 18, 10);
    clothGeo.translate(width * 0.5, poleHeight - height * 0.55, 0);

    const clothMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0.12 },
        uSpeed: { value: 2.4 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0.96 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float anchor = uv.x;
          float wave1 = sin(uTime * uSpeed + p.y * 2.2 + uv.x * 5.5) * uAmplitude;
          float wave2 = sin(uTime * (uSpeed * 1.37) + p.y * 4.1 + uv.x * 9.0) * (uAmplitude * 0.45);
          p.z += (wave1 + wave2) * anchor;
          p.x += sin(uTime * (uSpeed * 0.75) + p.y * 2.8) * 0.03 * anchor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec3 col = uColor;
          float shade = 0.82 + (1.0 - vUv.y) * 0.18;
          col *= shade;
          gl_FragColor = vec4(col, uOpacity);
        }
      `
    });

    const cloth = new THREE.Mesh(clothGeo, clothMat);
    root.add(cloth);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starTexture,
        color,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.position.set(width * 0.62, poleHeight - height * 0.35, -0.05);
    glow.scale.set(width * 1.9, height * 1.8, 1);
    root.add(glow);

    root.userData = { pole, clothMat, glow, alpha: 1 };
    return root;
  }

  private disposeObjectTree(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;

      const geometry = (mesh as any).geometry as THREE.BufferGeometry | undefined;
      if (geometry) geometry.dispose();

      const material = (mesh as any).material as THREE.Material | THREE.Material[] | undefined;
      if (material) {
        if (Array.isArray(material)) {
          material.forEach((m) => this.disposeMaterial(m));
        } else {
          this.disposeMaterial(material);
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material): void {
    const anyMat = material as any;
    const texKeys = [
      "map",
      "alphaMap",
      "aoMap",
      "bumpMap",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "emissiveMap",
      "displacementMap",
      "specularMap"
    ];

    for (const key of texKeys) {
      const tex = anyMat[key] as THREE.Texture | undefined;
      if (tex?.dispose) tex.dispose();
    }

    material.dispose();
  }
}

