import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import { IWorldMapObject, MapEntryType } from '../worldmap/worldmaptypes';
import { CustomGroundData } from '@Glibs/types/worldmaptypes';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

// ---- Uint8Array | Uint8ClampedArray → Uint8Array 안전 변환 헬퍼 ----
function toU8(a: Uint8Array | Uint8ClampedArray): Uint8Array {
  return a instanceof Uint8Array ? a : new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
}

/* ------------------------- Beach Slope 옵션 타입 ------------------------- */
type BeachSide = 'north' | 'south' | 'east' | 'west';
type BeachColorMode = 'none' | 'sand' | 'sandToGrass';

export interface BeachSlopeOptions {
  side: BeachSide;               // 어느 변으로 해변을 만들지 (기본 south = -Z)
  startFraction: number;         // 변에서부터 시작지점(평면 너비 대비 비율) 기본 0.30
  maxDrop: number;               // 가장자리에서 최대 하강량(월드 단위) 기본 2
  noiseAmplitude: number;        // 해변 경계선의 랜덤 출렁임 크기(월드 단위) 기본 2
  noiseFrequency: number;        // 출렁임 주기(평면 전체 기준) 기본 1.2
  profilePower: number;          // 경사 프로파일 강도, 기본 1

  // 색상 모드
  colorMode: BeachColorMode;     // 'none' | 'sand' | 'sandToGrass' (기본 'sandToGrass')
  sandColor: THREE.Color;        // 모래색 (기본 #E2CDA5)
  grassColor: THREE.Color;       // 초원색 (기본 #A6C954)
  colorBlendPower: number;       // 색상 블렌딩 커브 강도(기본 1)
  edgeSharpness: number;         // 경계 선명도 (기본 1.8, ↑ 선명)
  colorNoiseFrequency: number;   // 색 경계 노이즈 주파수 (기본 3.0)
  colorJitterAmplitude: number;  // 색 경계 랜덤 강도 [0..0.5] (기본 0.12)
}

export default class CustomGround implements IWorldMapObject {
  Type: MapEntryType = MapEntryType.CustomGround;

  obj!: THREE.Mesh;
  blendMap!: THREE.DataTexture;
  blendMapData!: Uint8Array;
  shaderMaterial!: THREE.MeshStandardMaterial;
  geometry!: THREE.PlaneGeometry;

  // 기본 파라미터
  planeSize = 256;
  width = 1024 * 3;
  height = 1024 * 3;
  blendMapSize = this.width * this.height;

  // 브러시/스케일
  scale = 0.5;
  radius = 50 / this.scale;  // 클릭 브러시 반경(월드)
  depth = 3 / this.scale;    // 최대 깊이(월드 의미 유지)
  falloff = 3 / this.scale;

  // 노이즈
  noise = new ImprovedNoise();
  noiseScale = 20.0;
  noiseStrength = 0.5;

  private _scratchV3 = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
  ) {
    // ⚠️ 이제 constructor에서 Create를 자동 호출하지 않습니다.
    // 필요한 시점에 외부에서 this.Create({...})를 호출하세요.
  }

  /* ------------------------------- 생성/로딩 -------------------------------- */

  Create({
    color = new THREE.Color(0xA6C954),
    width = 1024 * 3,
    height = 1024 * 3,
    planeSize = 256 * 3,
  }: { color?: THREE.Color; width?: number; height?: number; planeSize?: number } = {}) {
    this.width = width;
    this.height = height;
    this.blendMapSize = width * height;
    this.planeSize = planeSize;

    // RGBA DataTexture 초기화
    this.blendMapData = new Uint8Array(4 * this.blendMapSize);
    for (let i = 0; i < this.blendMapData.length; ) {
      this.blendMapData[i++] = (color.r * 255) | 0;
      this.blendMapData[i++] = (color.g * 255) | 0;
      this.blendMapData[i++] = (color.b * 255) | 0;
      this.blendMapData[i++] = 255;
    }

    this.blendMap = new THREE.DataTexture(this.blendMapData, this.width, this.height, THREE.RGBAFormat);
    this.blendMap.colorSpace = THREE.SRGBColorSpace;
    this.blendMap.magFilter = THREE.LinearFilter;
    this.blendMap.minFilter = THREE.LinearFilter;
    this.blendMap.generateMipmaps = false;
    this.blendMap.needsUpdate = true;

    // 지오메트리 rotateX(-PI/2) 고정 + 동적 업데이트 힌트
    this.geometry = new THREE.PlaneGeometry(this.planeSize, this.planeSize, this.planeSize, this.planeSize);
    this.geometry.rotateX(-Math.PI / 2);
    const posAttr = this.geometry.getAttribute('position');
    if (posAttr instanceof THREE.BufferAttribute) posAttr.setUsage(THREE.DynamicDrawUsage);

    this.shaderMaterial = new THREE.MeshStandardMaterial({
      map: this.blendMap,
      side: THREE.FrontSide,
      transparent: false,
      roughness: 1,
      metalness: 0,
    });

    const ground = new THREE.Mesh(this.geometry, this.shaderMaterial);
    ground.position.setY(-0.01);
    ground.receiveShadow = true;
    ground.scale.set(this.scale, this.scale, this.scale);
    ground.userData.mapObj = this;

    this.obj = ground;
    this.applyBeachSlope()
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, this.obj);

    return ground;
  }

  Delete(..._param: any) {
    return this.obj;
  }

  Load(data: CustomGroundData, callback?: Function) {
    if (this.obj) this.scene.remove(this.obj);

    // 실제 배열 사용
    const textureData = new Uint8Array(data.textureData);
    const texture = new THREE.DataTexture(
      textureData,
      data.textureWidth,
      data.textureHeight,
      THREE.RGBAFormat
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(data.mapSize, data.mapSize, data.mapSize, data.mapSize);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const vertArr = pos.array as Float32Array;
    const srcVerts = new Float32Array(data.verticesData);
    if (srcVerts.length === vertArr.length) {
      vertArr.set(srcVerts);
      pos.needsUpdate = true;
      pos.setUsage(THREE.DynamicDrawUsage);
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    this.LoadMap(texture, geometry);

    const s = data.scale ?? this.scale;
    this.obj.scale.set(s, s, s);
    this.scale = s;
    this.radius = 80 / this.scale;
    this.depth = 3 / this.scale;
    this.falloff = 3 / this.scale;

    this.scene.add(this.obj);
    this.applyBeachSlope()
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, this.obj);
    callback?.(this.obj, this.Type);
  }

  LoadMap(texture: THREE.DataTexture, geometry: THREE.PlaneGeometry) {
    this.blendMap = texture;
    const anyData = this.blendMap.image.data as Uint8Array | Uint8ClampedArray;
    this.blendMapData = toU8(anyData);
    this.width = this.blendMap.image.width;
    this.height = this.blendMap.image.height;
    this.blendMapSize = this.width * this.height;

    this.geometry = geometry;

    this.shaderMaterial?.dispose();
    this.shaderMaterial = new THREE.MeshStandardMaterial({
      map: this.blendMap,
      side: THREE.FrontSide,
      transparent: false,
      roughness: 1,
      metalness: 0,
    });

    const ground = new THREE.Mesh(this.geometry, this.shaderMaterial);
    ground.position.setY(-0.01);
    ground.receiveShadow = true;
    ground.userData.mapObj = this;

    this.obj = ground;
  }

  Save(): CustomGroundData {
    const geometry = this.geometry;
    const map = this.blendMap;

    const srcTexAny = map.image.data as Uint8Array | Uint8ClampedArray;
    const srcTex = toU8(srcTexAny);
    const textureData = Array.from(srcTex);

    const srcVerts = geometry.getAttribute('position').array as Float32Array;
    const verticesData = Array.from(srcVerts);

    const gData: CustomGroundData = {
      textureData,
      textureWidth: map.image.width,
      textureHeight: map.image.height,
      mapSize: this.planeSize,
      scale: this.scale,
      verticesData,
    };
    return gData;
  }

  /* ------------------------------ 유틸/쿼리 -------------------------------- */

  // UV 클램프 후 컬러 조회
  GetColor(uv: THREE.Vector2) {
    const u = Math.min(0.999, Math.max(0, uv.x));
    const v = Math.min(0.999, Math.max(0, uv.y));
    const x = (u * this.width) | 0;
    const y = (v * this.height) | 0;
    const i = (y * this.width + x) * 4;
    return new THREE.Color(
      this.blendMapData[i] / 255,
      this.blendMapData[i + 1] / 255,
      this.blendMapData[i + 2] / 255
    );
  }

  /* ------------------------------ 페인팅/변형 ------------------------------ */

  Click(uv: THREE.Vector2) {
    const cx = Math.floor(uv.x * this.width);
    const cy = Math.floor(uv.y * this.height);

    for (let y = -this.radius; y <= this.radius; y++) {
      for (let x = -this.radius; x <= this.radius; x++) {
        const tx = cx + x, ty = cy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;

        const d = Math.hypot(x, y);
        if (d > this.radius) continue;

        const n = this.noise.noise(tx / this.noiseScale, ty / this.noiseScale, 0);
        const distorted = d * (1.0 + n * this.noiseStrength);
        const t = Math.max(0, 1 - distorted / this.radius);

        const i = (ty * this.width + tx) * 4;
        this.blendMapData[i + 0] = Math.min(255, this.blendMapData[i + 0] + t * 255);
        this.blendMapData[i + 1] = Math.min(204, this.blendMapData[i + 1] + t * 255);
        this.blendMapData[i + 2] = Math.min(102, this.blendMapData[i + 2] + t * 255);
        this.blendMapData[i + 3] = 255;
      }
    }
    this.blendMap.needsUpdate = true;
  }

  ClickColor(uv: THREE.Vector2, color: THREE.Color) {
    const cx = Math.floor(uv.x * this.width);
    const cy = Math.floor(uv.y * this.height);
    const r = (color.r * 255) | 0;
    const g = (color.g * 255) | 0;
    const b = (color.b * 255) | 0;

    for (let y = -this.radius; y <= this.radius; y++) {
      for (let x = -this.radius; x <= this.radius; x++) {
        const tx = cx + x, ty = cy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;

        const d = Math.hypot(x, y);
        if (d > this.radius) continue;

        const n = this.noise.noise(tx / this.noiseScale, ty / this.noiseScale, 0);
        const distorted = d * (1.0 + n * this.noiseStrength);
        const t = Math.max(0, 1 - distorted / this.radius);

        if (t > 0.5) {
          const i = (ty * this.width + tx) * 4;
          this.blendMapData[i + 0] = r;
          this.blendMapData[i + 1] = g;
          this.blendMapData[i + 2] = b;
          this.blendMapData[i + 3] = 255;
        }
      }
    }
    this.blendMap.needsUpdate = true;
  }

  // 월드→로컬, 스케일 반영 지형 융기/침하
  ClickUpDown(worldClick: THREE.Vector3, up = false) {
    if (!this.obj) return;

    const local = this._scratchV3.copy(worldClick);
    this.obj.worldToLocal(local);

    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    const sx = this.obj.scale.x;
    const radiusLocal = this.depth / sx;
    const maxDepthLocal = this.depth / sx;
    const falloffLocal = this.falloff / sx;

    for (let i = 0; i < arr.length; i += 3) {
      const vx = arr[i + 0];
      const vy = arr[i + 1];
      const vz = arr[i + 2];

      const dx = vx - local.x;
      const dz = vz - local.z;
      const dist = Math.hypot(dx, dz);

      if (dist < radiusLocal) {
        const offset = (radiusLocal - dist) * (radiusLocal / falloffLocal);
        arr[i + 1] = up ? (vy + offset) : Math.max(vy - offset, -maxDepthLocal);
      }
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  applyPatternAtUV(uv: THREE.Vector2, pattern: THREE.DataTexture) {
    const pSrc = pattern.image.data as Uint8Array | Uint8ClampedArray;
    const patternData = toU8(pSrc);

    const pw = pattern.image.width;
    const ph = pattern.image.height;

    const cx = Math.floor(uv.x * this.width);
    const cy = Math.floor(uv.y * this.height);

    for (let y = -this.radius; y <= this.radius; y++) {
      for (let x = -this.radius; x <= this.radius; x++) {
        const tx = cx + x, ty = cy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;

        const d = Math.hypot(x, y);
        if (d > this.radius) continue;

        const n = this.noise.noise(tx / this.noiseScale, ty / this.noiseScale, 0);
        const distorted = d * (1.0 + n * this.noiseStrength);
        const t = Math.max(0, 1 - distorted / this.radius);

        const bi = (ty * this.width + tx) * 4;
        const pi = (((ty % ph + ph) % ph) * pw + ((tx % pw + pw) % pw)) * 4;

        this.blendMapData[bi + 0] = Math.floor(smootherstep(this.blendMapData[bi + 0], patternData[pi + 0], t));
        this.blendMapData[bi + 1] = Math.floor(smootherstep(this.blendMapData[bi + 1], patternData[pi + 1], t));
        this.blendMapData[bi + 2] = Math.floor(smootherstep(this.blendMapData[bi + 2], patternData[pi + 2], t));
      }
    }

    this.blendMap.needsUpdate = true;
  }

  /* ------------------------- UV ↔ 월드(X,Z) 변환 헬퍼 ------------------------ */
  // rotateX(-PI/2) 기준: v(=UV.y)는 z축이 반대로 매핑됨
  private xFromU(u: number) {
    const half = this.planeSize * 0.5;
    return -half + u * this.planeSize;
  }
  private zFromV(v: number) { // v: 0..1 → z: [+half .. -half]
    const half = this.planeSize * 0.5;
    return half - v * this.planeSize;
  }
  private uFromX(x: number) {
    const half = this.planeSize * 0.5;
    return (x + half) / this.planeSize;
  }
  private vFromZ(z: number) { // z: [+half .. -half] → v: 0..1
    const half = this.planeSize * 0.5;
    return (half - z) / this.planeSize;
  }
  private xiFromX(x: number) {
    const u = this.uFromX(x);
    return Math.max(0, Math.min(this.width - 1, Math.round(u * (this.width - 1))));
  }
  private yiFromZ(z: number) {
    const v = this.vFromZ(z);
    return Math.max(0, Math.min(this.height - 1, Math.round(v * (this.height - 1))));
  }
  private xFromXi(xi: number) {
    const u = xi / (this.width - 1);
    return this.xFromU(u);
  }
  private zFromYi(yi: number) {
    const v = yi / (this.height - 1);
    return this.zFromV(v);
  }

  /* --------------------- 해변 경사 + 색상(2색 그라디언트) -------------------- */
  /**
   * 한 변(edge)에서 startFraction(기본 0.30) 지점부터 바다쪽으로 낮아지는 경사를 만들고
   * 색은 모드에 따라
   *   - 'none'        : 색 변경 없음
   *   - 'sand'        : 기존 텍스처 → 모래색으로 블렌드
   *   - 'sandToGrass' : 초원↔모래 2색 그라디언트 (기본)
   * 로 적용합니다. 경계는 edgeSharpness로 선명하게, colorNoise로 랜덤하게 만듭니다.
   */
  applyBeachSlope(opts: Partial<BeachSlopeOptions> = {}) {
    if (!this.obj) return;

    const {
      side = 'south',
      startFraction = 0.20,   // 요청: 기본 0.30
      maxDrop = 2.0,
      noiseAmplitude = 2.0,
      noiseFrequency = 1.2,
      profilePower = 1.0,

      colorMode = 'sandToGrass',
      sandColor = new THREE.Color(0xE2CDA5),
      grassColor = new THREE.Color(0xA6C954),
      colorBlendPower = 1.0,
      edgeSharpness = 1.8,
      colorNoiseFrequency = 3.0,
      colorJitterAmplitude = 0.12,
    } = opts;

    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    // 로컬/월드 변환 대비
    const s = this.obj.scale.x; // 균일 스케일 가정
    const half = this.planeSize * 0.5;

    // 월드→로컬 변환
    const maxDropLocal = maxDrop / s;
    const noiseAmpLocal = noiseAmplitude / s;

    const alongAxis: 'x' | 'z' = (side === 'east' || side === 'west') ? 'z' : 'x';
    const perpAxis:  'x' | 'z' = (alongAxis === 'x') ? 'z' : 'x';

    const edgeCoord =
      side === 'south' ? -half :
      side === 'north' ?  half :
      side === 'west'  ? -half :  half;

    const baseStart = (side === 'south' || side === 'west')
      ? edgeCoord + this.planeSize * startFraction
      : edgeCoord - this.planeSize * startFraction;

    // 지형 해안선 노이즈(저주파)
    const coastNoise1D = (v: number) => {
      const u = (v + half) / this.planeSize; // 0..1
      return this.noise.noise(u * noiseFrequency * 10.0, 0, 0);
    };

    const smootherPow = (t: number, p: number) => {
      const tt = Math.max(0, Math.min(1, t));
      const s5 = tt * tt * tt * (tt * (tt * 6 - 15) + 10); // smootherstep
      return Math.pow(s5, p);
    };

    // 1) 버텍스 경사 적용 (더 낮아질 때만)
    for (let i = 0; i < arr.length; i += 3) {
      const vx = arr[i + 0];
      const vy = arr[i + 1];
      const vz = arr[i + 2];

      const along = (alongAxis === 'x') ? vx : vz;
      const perp  = (perpAxis  === 'x') ? vx : vz;

      const startLine = baseStart + noiseAmpLocal * coastNoise1D(along);
      const slopeWidth = Math.abs(startLine - edgeCoord) || 1e-6;

      let t: number;
      if (side === 'south' || side === 'west') {
        t = (startLine - perp) / slopeWidth;
      } else {
        t = (perp - startLine) / slopeWidth;
      }
      t = Math.max(0, Math.min(1, t));
      if (t <= 0) continue;

      const d = -maxDropLocal * smootherPow(t, profilePower);
      const targetY = d;
      if (targetY < vy) arr[i + 1] = targetY;
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    // 2) 색상 적용
    if (colorMode !== 'none' && this.blendMapData) {
      // 모래/초원 색상 (0..255)
      const sr = Math.round(sandColor.r * 255);
      const sg = Math.round(sandColor.g * 255);
      const sb = Math.round(sandColor.b * 255);
      const gr = Math.round(grassColor.r * 255);
      const gg = Math.round(grassColor.g * 255);
      const gb = Math.round(grassColor.b * 255);

      // 색 경계 노이즈(고주파, 2D)
      const colorNoise2D = (x: number, z: number) => {
        const u = (x + half) / this.planeSize; // 0..1
        const v = (z + half) / this.planeSize; // 0..1
        return this.noise.noise(u * colorNoiseFrequency * 10.0, v * colorNoiseFrequency * 10.0, 0); // [-1,1]
      };

      const applyPixel = (xi: number, yi: number, wSand: number) => {
        const idx = (yi * this.width + xi) * 4;
        if (colorMode === 'sand') {
          // 기존 텍스처 → 모래색 블렌드
          this.blendMapData[idx + 0] = Math.round(this.blendMapData[idx + 0] * (1 - wSand) + sr * wSand);
          this.blendMapData[idx + 1] = Math.round(this.blendMapData[idx + 1] * (1 - wSand) + sg * wSand);
          this.blendMapData[idx + 2] = Math.round(this.blendMapData[idx + 2] * (1 - wSand) + sb * wSand);
        } else { // 'sandToGrass'
          // 초원↔모래 2색 그라디언트
          this.blendMapData[idx + 0] = Math.round(gr * (1 - wSand) + sr * wSand);
          this.blendMapData[idx + 1] = Math.round(gg * (1 - wSand) + sg * wSand);
          this.blendMapData[idx + 2] = Math.round(gb * (1 - wSand) + sb * wSand);
        }
      };

      if (side === 'south' || side === 'north') {
        // 열(xi) 단위로 스캔 → 각 열마다 z 범위를 채색
        for (let xi = 0; xi < this.width; xi++) {
          const x = this.xFromXi(xi);
          const along = (alongAxis === 'x') ? x : 0; // here alongAxis === 'x'
          const startLine = baseStart + noiseAmpLocal * coastNoise1D(along);
          const minZ = Math.min(edgeCoord, startLine);
          const maxZ = Math.max(edgeCoord, startLine);

          const yiStart = this.yiFromZ(minZ);
          const yiEnd   = this.yiFromZ(maxZ);
          const y0 = Math.min(yiStart, yiEnd);
          const y1 = Math.max(yiStart, yiEnd);

          const slopeWidth = Math.abs(startLine - edgeCoord) || 1e-6;

          for (let yi = y0; yi <= y1; yi++) {
            const z = this.zFromYi(yi);

            // 기저 가중치(해안쪽일수록 1)
            let t: number;
            if (side === 'south') {
              t = (startLine - z) / slopeWidth;
            } else { // north
              t = (z - startLine) / slopeWidth;
            }
            t = Math.max(0, Math.min(1, t));
            if (t <= 0) continue;

            // 곡선(완만→선명), 경계 선명도 강화
            let w = smootherPow(t, colorBlendPower);
            w = Math.pow(w, edgeSharpness);

            // 색 전용 랜덤 경계(2D 노이즈)로 미세 흔들림
            const n = colorNoise2D(x, z); // [-1,1]
            w = Math.max(0, Math.min(1, w + n * colorJitterAmplitude));

            applyPixel(xi, yi, w);
          }
        }
      } else {
        // 행(yi) 단위로 스캔 → 각 행마다 x 범위를 채색
        for (let yi = 0; yi < this.height; yi++) {
          const z = this.zFromYi(yi);
          const along = (alongAxis === 'z') ? z : 0; // here alongAxis === 'z'
          const startLine = baseStart + noiseAmpLocal * coastNoise1D(along);
          const minX = Math.min(edgeCoord, startLine);
          const maxX = Math.max(edgeCoord, startLine);

          const xiStart = this.xiFromX(minX);
          const xiEnd   = this.xiFromX(maxX);
          const x0 = Math.min(xiStart, xiEnd);
          const x1 = Math.max(xiStart, xiEnd);

          const slopeWidth = Math.abs(startLine - edgeCoord) || 1e-6;

          for (let xi = x0; xi <= x1; xi++) {
            const x = this.xFromXi(xi);

            // 기저 가중치(해안쪽일수록 1)
            let t: number;
            if (side === 'west') {
              t = (startLine - x) / slopeWidth;
            } else { // east
              t = (x - startLine) / slopeWidth;
            }
            t = Math.max(0, Math.min(1, t));
            if (t <= 0) continue;

            // 곡선(완만→선명), 경계 선명도 강화
            let w = smootherPow(t, colorBlendPower);
            w = Math.pow(w, edgeSharpness);

            // 색 전용 랜덤 경계(2D 노이즈)로 미세 흔들림
            const n = colorNoise2D(x, z); // [-1,1]
            w = Math.max(0, Math.min(1, w + n * colorJitterAmplitude));

            applyPixel(xi, yi, w);
          }
        }
      }

      this.blendMap.needsUpdate = true;
    }
  }

  /* -------------------------------- 정리 --------------------------------- */

  Dispose() {
    this.shaderMaterial?.dispose();
    this.geometry?.dispose();
    this.blendMap?.dispose();
    if (this.obj) this.obj.userData.mapObj = undefined;
  }
}

// smootherstep
function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, x));
  const s = t * t * t * (t * (t * 6 - 15) + 10);
  return edge0 + (edge1 - edge0) * s;
}
