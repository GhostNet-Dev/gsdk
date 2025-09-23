import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import { IWorldMapObject, MapEntryType } from '../worldmap/worldmaptypes';
import { CustomGroundData } from '@Glibs/types/worldmaptypes';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

function toU8(a: Uint8Array | Uint8ClampedArray): Uint8Array {
  return a instanceof Uint8Array ? a : new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
}

type BeachSide = 'north' | 'south' | 'east' | 'west';
type BeachColorMode = 'none' | 'sand' | 'sandToGrass';

export interface BeachSlopeOptions {
  side: BeachSide;
  startFraction: number;
  maxDrop: number;
  noiseAmplitude: number;
  noiseFrequency: number;
  profilePower: number;
  colorMode: BeachColorMode;
  sandColor: THREE.Color;
  grassColor: THREE.Color;
  colorBlendPower: number;
  edgeSharpness: number;
  colorNoiseFrequency: number;
  colorJitterAmplitude: number;
}

export default class CustomGround implements IWorldMapObject {
  Type: MapEntryType = MapEntryType.CustomGround;

  obj!: THREE.Mesh;
  blendMap!: THREE.DataTexture;
  blendMapData!: Uint8Array;
  shaderMaterial!: THREE.MeshStandardMaterial;
  geometry!: THREE.PlaneGeometry;

  /* ===== BlendMap(페인트) 해상도 ===== */
  width = 1024 * 3;   // 픽셀 폭
  height = 1024 * 3;  // 픽셀 높이
  blendMapSize = this.width * this.height;

  /* ===== 지오메트리(월드) 크기 / 세그먼트 ===== */
  planeWidth = 256 * 3;    // X (world units)
  planeHeight = 256 * 3;   // Z (world units)
  segmentsX = 256 * 3;
  segmentsZ = 256 * 3;

  /* ===== 텍셀 밀도(px per world unit) ===== */
  texelDensityX = 2;   // px per 1 world-unit (X 방향)
  texelDensityZ = 2;   // px per 1 world-unit (Z 방향)

  // 브러시/스케일
  scale = 0.5;
  radius = 50 / this.scale;
  depth = 3 / this.scale;
  falloff = 3 / this.scale;

  // 노이즈
  noise = new ImprovedNoise();
  noiseScale = 20.0;
  noiseStrength = 0.5;

  private _scratchV3 = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
  ) {}

  /* -------------------------------- 생성 -------------------------------- */
  /**
   * width/height(픽셀)를 직접 주지 않으면 planeWidth/planeHeight × texelDensity 로 자동 산출
   * planeSize(legacy) 사용 시 정사각형으로 간주하여 planeWidth/Height 및 segments를 동일 값으로 설정합니다.
   */
  Create({
    color = new THREE.Color(0xA6C954),
    width, height,                      // blendMap 픽셀 해상도 (선택)
    planeWidth = 256 * 1.5, planeHeight = 256 * 3,            // 지오메트리 월드 크기
    segmentsX = 256 * 1.5, segmentsZ = 256 * 3,               // 세그먼트
    planeSize,                          // legacy (정사각)
    texelDensity,                       // 단일 값으로 X/Z 공통 설정
    texelDensityX, texelDensityZ,       // 개별 설정
  }: {
    color?: THREE.Color;
    width?: number; height?: number;
    planeWidth?: number; planeHeight?: number;
    segmentsX?: number; segmentsZ?: number;
    planeSize?: number;                 // legacy
    texelDensity?: number;
    texelDensityX?: number; texelDensityZ?: number;
  } = {}) {
    // --- 크기/세그먼트 구성 ---
    if (planeSize !== undefined) {
      this.planeWidth = planeSize;
      this.planeHeight = planeSize;
      this.segmentsX = Math.max(1, Math.round(planeSize));
      this.segmentsZ = Math.max(1, Math.round(planeSize));
    }
    if (planeWidth !== undefined) this.planeWidth = planeWidth;
    if (planeHeight !== undefined) this.planeHeight = planeHeight;
    if (segmentsX !== undefined) this.segmentsX = Math.max(1, Math.floor(segmentsX));
    if (segmentsZ !== undefined) this.segmentsZ = Math.max(1, Math.floor(segmentsZ));

    if (texelDensity !== undefined) {
      this.texelDensityX = texelDensity;
      this.texelDensityZ = texelDensity;
    }
    if (texelDensityX !== undefined) this.texelDensityX = texelDensityX;
    if (texelDensityZ !== undefined) this.texelDensityZ = texelDensityZ;

    // --- 블렌드맵 해상도 자동 산출(미지정시) ---
    if (width === undefined)  width  = Math.max(2, Math.round(this.planeWidth  * this.texelDensityX));
    if (height === undefined) height = Math.max(2, Math.round(this.planeHeight * this.texelDensityZ));

    this.width = width;
    this.height = height;
    this.blendMapSize = width * height;

    // --- 텍스처 초기화 ---
    this.blendMapData = new Uint8Array(4 * this.blendMapSize);
    const r = (color.r * 255) | 0, g = (color.g * 255) | 0, b = (color.b * 255) | 0;
    for (let i = 0; i < this.blendMapData.length; ) {
      this.blendMapData[i++] = r;
      this.blendMapData[i++] = g;
      this.blendMapData[i++] = b;
      this.blendMapData[i++] = 255;
    }
    this._applyBlendMapToTexture();

    // --- 지오메트리 생성 ---
    this._rebuildGeometry();

    const ground = new THREE.Mesh(this.geometry, this.shaderMaterial);
    ground.position.setY(-0.01);
    ground.receiveShadow = true;
    ground.scale.set(this.scale, this.scale, this.scale);
    ground.userData.mapObj = this;

    this.obj = ground;
    this.applyBeachSlope();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, this.obj);
    return ground;
  }
  Delete(...param: any) {
    
  }

  /* --------------------------- 런타임 갱신(리샘플) --------------------------- */
  /**
   * 지오메트리 크기/세그먼트/텍셀밀도 변경 및 blendMap 해상도 자동 갱신
   * 기존 페인트는 UV 기준으로 바이리니어 리샘플하여 보존
   */
  updateGeometryAndBlendMap({
    planeWidth, planeHeight, segmentsX, segmentsZ,
    texelDensity, texelDensityX, texelDensityZ,
    explicitWidth, explicitHeight,      // 강제 픽셀 해상도 지정(밀도 무시)
  }: {
    planeWidth?: number; planeHeight?: number;
    segmentsX?: number; segmentsZ?: number;
    texelDensity?: number; texelDensityX?: number; texelDensityZ?: number;
    explicitWidth?: number; explicitHeight?: number;
  } = {}) {
    if (!this.obj) return;

    if (planeWidth  !== undefined) this.planeWidth  = planeWidth;
    if (planeHeight !== undefined) this.planeHeight = planeHeight;
    if (segmentsX   !== undefined) this.segmentsX   = Math.max(1, Math.floor(segmentsX));
    if (segmentsZ   !== undefined) this.segmentsZ   = Math.max(1, Math.floor(segmentsZ));

    if (texelDensity !== undefined) {
      this.texelDensityX = texelDensity;
      this.texelDensityZ = texelDensity;
    }
    if (texelDensityX !== undefined) this.texelDensityX = texelDensityX;
    if (texelDensityZ !== undefined) this.texelDensityZ = texelDensityZ;

    const newW = explicitWidth  ?? Math.max(2, Math.round(this.planeWidth  * this.texelDensityX));
    const newH = explicitHeight ?? Math.max(2, Math.round(this.planeHeight * this.texelDensityZ));

    // 1) 기존 텍스처를 UV 기준으로 새 해상도로 리샘플
    const resampled = this._resampleRGBA(this.blendMapData, this.width, this.height, newW, newH);
    this.width = newW; this.height = newH; this.blendMapSize = newW * newH;
    this.blendMapData = resampled;
    this._applyBlendMapToTexture();

    // 2) 지오메트리 재구축
    this._rebuildGeometry();

    // 메쉬 재적용
    this.obj.geometry = this.geometry;
    this.obj.material = this.shaderMaterial;
  }

  /* ------------------------------ 로드/세이브 ------------------------------ */
  Load(data: CustomGroundData, callback?: Function) {
    if (this.obj) this.scene.remove(this.obj);

    const textureData = new Uint8Array(data.textureData);
    const texture = new THREE.DataTexture(
      textureData, data.textureWidth, data.textureHeight, THREE.RGBAFormat
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    const mapWidth  = (data as any).mapWidth  ?? data.mapSize;
    const mapHeight = (data as any).mapHeight ?? data.mapSize;
    const segW = (data as any).segW ?? data.mapSize;
    const segH = (data as any).segH ?? data.mapSize;

    // 선택: 저장돼 있으면 밀도 복원
    const tdx = (data as any).texelDensityX;
    const tdz = (data as any).texelDensityZ;
    if (typeof tdx === 'number') this.texelDensityX = tdx;
    if (typeof tdz === 'number') this.texelDensityZ = tdz;

    this.planeWidth = mapWidth;
    this.planeHeight = mapHeight;
    this.segmentsX = Math.max(1, Math.floor(segW));
    this.segmentsZ = Math.max(1, Math.floor(segH));

    this.blendMap = texture;
    this.blendMapData = toU8(texture.image.data as Uint8Array | Uint8ClampedArray);
    this.width = texture.image.width;
    this.height = texture.image.height;
    this.blendMapSize = this.width * this.height;

    // 지오메트리
    const geometry = new THREE.PlaneGeometry(mapWidth, mapHeight, this.segmentsX, this.segmentsZ);
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

    this.geometry = geometry;

    this.shaderMaterial?.dispose();
    this.shaderMaterial = new THREE.MeshStandardMaterial({
      map: this.blendMap, side: THREE.FrontSide, transparent: false, roughness: 1, metalness: 0,
    });

    const ground = new THREE.Mesh(this.geometry, this.shaderMaterial);
    ground.position.setY(-0.01);
    ground.receiveShadow = true;
    ground.userData.mapObj = this;

    this.obj = ground;

    const s = data.scale ?? this.scale;
    this.obj.scale.set(s, s, s);
    this.scale = s;
    this.radius = 80 / this.scale;
    this.depth = 3 / this.scale;
    this.falloff = 3 / this.scale;

    this.scene.add(this.obj);
    this.applyBeachSlope();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, this.obj);
    callback?.(this.obj, this.Type);
  }

  Save(): CustomGroundData & { mapWidth?: number; mapHeight?: number; segW?: number; segH?: number; texelDensityX?: number; texelDensityZ?: number } {
    const map = this.blendMap;
    const srcTex = toU8(map.image.data as Uint8Array | Uint8ClampedArray);
    const textureData = Array.from(srcTex);

    const srcVerts = this.geometry.getAttribute('position').array as Float32Array;
    const verticesData = Array.from(srcVerts);

    return {
      textureData,
      textureWidth: map.image.width,
      textureHeight: map.image.height,
      mapSize: Math.round(Math.max(this.planeWidth, this.planeHeight)), // legacy
      scale: this.scale,
      verticesData,
      mapWidth: this.planeWidth,
      mapHeight: this.planeHeight,
      segW: this.segmentsX,
      segH: this.segmentsZ,
      texelDensityX: this.texelDensityX,
      texelDensityZ: this.texelDensityZ,
    };
  }

  /* ------------------------------ 페인팅 등 ------------------------------ */
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
    const r = (color.r * 255) | 0, g = (color.g * 255) | 0, b = (color.b * 255) | 0;
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
          this.blendMapData[i + 0] = r; this.blendMapData[i + 1] = g; this.blendMapData[i + 2] = b; this.blendMapData[i + 3] = 255;
        }
      }
    }
    this.blendMap.needsUpdate = true;
  }

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
      const vx = arr[i + 0], vy = arr[i + 1], vz = arr[i + 2];
      const dx = vx - local.x, dz = vz - local.z;
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
    const pw = pattern.image.width, ph = pattern.image.height;

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

  /* ------------------------- UV ↔ 월드(X,Z) 변환 ------------------------- */
  private xFromU(u: number) { const halfW = this.planeWidth * 0.5; return -halfW + u * this.planeWidth; }
  private zFromV(v: number) { const halfH = this.planeHeight * 0.5; return  halfH - v * this.planeHeight; }
  private uFromX(x: number) { const halfW = this.planeWidth * 0.5; return (x + halfW) / this.planeWidth; }
  private vFromZ(z: number) { const halfH = this.planeHeight * 0.5; return (halfH - z) / this.planeHeight; }
  private xiFromX(x: number) { const u = this.uFromX(x); return Math.max(0, Math.min(this.width - 1, Math.round(u * (this.width - 1)))); }
  private yiFromZ(z: number) { const v = this.vFromZ(z); return Math.max(0, Math.min(this.height - 1, Math.round(v * (this.height - 1)))); }
  private xFromXi(xi: number) { const u = xi / (this.width - 1); return this.xFromU(u); }
  private zFromYi(yi: number) { const v = yi / (this.height - 1); return this.zFromV(v); }

  /* --------------------- 해변 경사 + 색상(2색 그라디언트) -------------------- */
  applyBeachSlope(opts: Partial<BeachSlopeOptions> = {}) {
    if (!this.obj) return;
    const {
      side = 'south',
      startFraction = 0.20,
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

    const s = this.obj.scale.x;
    const halfW = this.planeWidth * 0.5;
    const halfH = this.planeHeight * 0.5;

    const maxDropLocal = maxDrop / s;
    const noiseAmpLocal = noiseAmplitude / s;

    const alongAxis: 'x' | 'z' = (side === 'east' || side === 'west') ? 'z' : 'x';
    const perpAxis:  'x' | 'z' = (alongAxis === 'x') ? 'z' : 'x';

    const edgeCoord =
      side === 'south' ? -halfH :
      side === 'north' ?  halfH :
      side === 'west'  ? -halfW :  halfW;

    const baseStart = (side === 'south' || side === 'west')
      ? edgeCoord + (side === 'south' ? this.planeHeight : this.planeWidth) * startFraction
      : edgeCoord - (side === 'north' ? this.planeHeight : this.planeWidth) * startFraction;

    const coastNoise1D = (v: number) => {
      const u = (alongAxis === 'x')
        ? (v + halfW) / this.planeWidth
        : (v + halfH) / this.planeHeight;
      return this.noise.noise(u * noiseFrequency * 10.0, 0, 0);
    };

    const smootherPow = (t: number, p: number) => {
      const tt = Math.max(0, Math.min(1, t));
      const s5 = tt * tt * tt * (tt * (tt * 6 - 15) + 10);
      return Math.pow(s5, p);
    };

    for (let i = 0; i < arr.length; i += 3) {
      const vx = arr[i + 0], vy = arr[i + 1], vz = arr[i + 2];
      const along = (alongAxis === 'x') ? vx : vz;
      const perp  = (perpAxis  === 'x') ? vx : vz;

      const startLine = baseStart + noiseAmpLocal * coastNoise1D(along);
      const slopeWidth = Math.max(1e-6, Math.abs(startLine - edgeCoord));

      let t: number;
      if (side === 'south' || side === 'west') t = (startLine - perp) / slopeWidth;
      else                                      t = (perp - startLine) / slopeWidth;
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

    if (colorMode !== 'none' && this.blendMapData) {
      const sr = Math.round(sandColor.r * 255), sg = Math.round(sandColor.g * 255), sb = Math.round(sandColor.b * 255);
      const gr = Math.round(grassColor.r * 255), gg = Math.round(grassColor.g * 255), gb = Math.round(grassColor.b * 255);

      const colorNoise2D = (x: number, z: number) => {
        const u = (x + halfW) / this.planeWidth;
        const v = (z + halfH) / this.planeHeight;
        return this.noise.noise(u * colorNoiseFrequency * 10.0, v * colorNoiseFrequency * 10.0, 0);
      };

      const applyPixel = (xi: number, yi: number, wSand: number) => {
        const idx = (yi * this.width + xi) * 4;
        if (colorMode === 'sand') {
          this.blendMapData[idx + 0] = Math.round(this.blendMapData[idx + 0] * (1 - wSand) + sr * wSand);
          this.blendMapData[idx + 1] = Math.round(this.blendMapData[idx + 1] * (1 - wSand) + sg * wSand);
          this.blendMapData[idx + 2] = Math.round(this.blendMapData[idx + 2] * (1 - wSand) + sb * wSand);
        } else {
          this.blendMapData[idx + 0] = Math.round(gr * (1 - wSand) + sr * wSand);
          this.blendMapData[idx + 1] = Math.round(gg * (1 - wSand) + sg * wSand);
          this.blendMapData[idx + 2] = Math.round(gb * (1 - wSand) + sb * wSand);
        }
      };

      const smoother01 = (x: number) => {
        const t = Math.max(0, Math.min(1, x));
        return t * t * t * (t * (t * 6 - 15) + 10);
      };

      if (side === 'south' || side === 'north') {
        for (let xi = 0; xi < this.width; xi++) {
          const x = this.xFromXi(xi);
          const startLine = baseStart + noiseAmpLocal * coastNoise1D(x);
          const minZ = Math.min(edgeCoord, startLine), maxZ = Math.max(edgeCoord, startLine);
          const yiStart = this.yiFromZ(minZ), yiEnd = this.yiFromZ(maxZ);
          const y0 = Math.min(yiStart, yiEnd), y1 = Math.max(yiStart, yiEnd);
          const slopeWidth = Math.max(1e-6, Math.abs(startLine - edgeCoord));

          for (let yi = y0; yi <= y1; yi++) {
            const z = this.zFromYi(yi);
            let t = (side === 'south') ? (startLine - z) / slopeWidth : (z - startLine) / slopeWidth;
            t = Math.max(0, Math.min(1, t));
            if (t <= 0) continue;
            let w = Math.pow(smoother01(t), 1.0);
            w = Math.pow(w, 1.8);
            const n = colorNoise2D(x, z);
            w = Math.max(0, Math.min(1, w + n * 0.12));
            applyPixel(xi, yi, w);
          }
        }
      } else {
        for (let yi = 0; yi < this.height; yi++) {
          const z = this.zFromYi(yi);
          const startLine = baseStart + noiseAmpLocal * coastNoise1D(z);
          const minX = Math.min(edgeCoord, startLine), maxX = Math.max(edgeCoord, startLine);
          const xiStart = this.xiFromX(minX), xiEnd = this.xiFromX(maxX);
          const x0 = Math.min(xiStart, xiEnd), x1 = Math.max(xiStart, xiEnd);
          const slopeWidth = Math.max(1e-6, Math.abs(startLine - edgeCoord));

          for (let xi = x0; xi <= x1; xi++) {
            const x = this.xFromXi(xi);
            let t = (side === 'west') ? (startLine - x) / slopeWidth : (x - startLine) / slopeWidth;
            t = Math.max(0, Math.min(1, t));
            if (t <= 0) continue;
            let w = Math.pow(smoother01(t), 1.0);
            w = Math.pow(w, 1.8);
            const n = colorNoise2D(x, z);
            w = Math.max(0, Math.min(1, w + n * 0.12));
            applyPixel(xi, yi, w);
          }
        }
      }
      this.blendMap.needsUpdate = true;
    }
  }

  /* -------------------------------- 정리 -------------------------------- */
  Dispose() {
    this.shaderMaterial?.dispose();
    this.geometry?.dispose();
    this.blendMap?.dispose();
    if (this.obj) this.obj.userData.mapObj = undefined;
  }

  /* ========================= 내부 유틸 ========================= */
  private _applyBlendMapToTexture() {
    if (this.blendMap) this.blendMap.dispose();
    this.blendMap = new THREE.DataTexture(this.blendMapData, this.width, this.height, THREE.RGBAFormat);
    this.blendMap.colorSpace = THREE.SRGBColorSpace;
    this.blendMap.magFilter = THREE.LinearFilter;
    this.blendMap.minFilter = THREE.LinearFilter;
    this.blendMap.generateMipmaps = false;
    this.blendMap.needsUpdate = true;

    if (this.shaderMaterial) {
      this.shaderMaterial.map = this.blendMap;
      this.shaderMaterial.needsUpdate = true;
    } else {
      this.shaderMaterial = new THREE.MeshStandardMaterial({
        map: this.blendMap, side: THREE.FrontSide, transparent: false, roughness: 1, metalness: 0,
      });
    }
  }

  private _rebuildGeometry() {
    this.geometry?.dispose();
    this.geometry = new THREE.PlaneGeometry(
      this.planeWidth, this.planeHeight, this.segmentsX, this.segmentsZ
    );
    this.geometry.rotateX(-Math.PI / 2);
    const posAttr = this.geometry.getAttribute('position');
    if (posAttr instanceof THREE.BufferAttribute) posAttr.setUsage(THREE.DynamicDrawUsage);
  }

  /** UV 기준 바이리니어 리샘플 */
  private _resampleRGBA(src: Uint8Array, srcW: number, srcH: number, dstW: number, dstH: number): Uint8Array {
    const dst = new Uint8Array(dstW * dstH * 4);
    const sW1 = srcW - 1, sH1 = srcH - 1;
    for (let y = 0; y < dstH; y++) {
      const v = sH1 * (y / (dstH - 1 || 1));
      const y0 = Math.floor(v), y1 = Math.min(sH1, y0 + 1);
      const fy = v - y0;
      for (let x = 0; x < dstW; x++) {
        const u = sW1 * (x / (dstW - 1 || 1));
        const x0 = Math.floor(u), x1 = Math.min(sW1, x0 + 1);
        const fx = u - x0;

        const i00 = (y0 * srcW + x0) * 4;
        const i10 = (y0 * srcW + x1) * 4;
        const i01 = (y1 * srcW + x0) * 4;
        const i11 = (y1 * srcW + x1) * 4;

        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const o = (y * dstW + x) * 4;
        dst[o + 0] = (src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11) | 0;
        dst[o + 1] = (src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11) | 0;
        dst[o + 2] = (src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11) | 0;
        dst[o + 3] = (src[i00 + 3] * w00 + src[i10 + 3] * w10 + src[i01 + 3] * w01 + src[i11 + 3] * w11) | 0;
      }
    }
    return dst;
  }
}

/* smootherstep for color pattern */
function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, x));
  const s = t * t * t * (t * (t * 6 - 15) + 10);
  return edge0 + (edge1 - edge0) * s;
}
