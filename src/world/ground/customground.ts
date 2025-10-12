import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import { IWorldMapObject, MapEntryType } from '../worldmap/worldmaptypes';
import { CustomGroundData } from '@Glibs/types/worldmaptypes';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

/* ----------------------------- Helpers ----------------------------- */
function toU8(a: Uint8Array | Uint8ClampedArray): Uint8Array {
  return a instanceof Uint8Array ? a : new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
}
function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, x));
  const s = t * t * t * (t * (t * 6 - 15) + 10);
  return edge0 + (edge1 - edge0) * s;
}

/* ----------------------- Types & Options ----------------------- */
type BeachSide = 'north' | 'south' | 'east' | 'west';
type BeachColorMode = 'none' | 'sand' | 'sandToGrass';

export interface BeachSlopeOptions {
  side: BeachSide;
  /** 해변 시작 위치(가장자리→내륙 방향 비율 0..1) */
  startFraction: number;
  /** 최대 낙차(월드 단위) */
  maxDrop: number;
  /** 해안선 요철(월드 단위) */
  noiseAmplitude: number;
  /** 해안선 요철 주파수(정규화 좌표 기준) */
  noiseFrequency: number;
  /** 경사 프로파일 지수(높이/색상 공용) */
  profilePower: number;

  /** 색상 모드 */
  colorMode: BeachColorMode;
  sandColor: THREE.Color;
  grassColor: THREE.Color;

  /** 색상 노이즈(블렌드 가중치에 소량 가감) 0..1 권장: 0~0.2 */
  colorNoiseAmp?: number; // default 0.12
}

export interface PatternBandSplatOptions {
  /** 0..1: 수직 밴드(돌바닥 메인 영역) */
  top: number
  left: number
  right: number
  bottom: number

  /** 돌 텍스처 타일링(기존 applyPatternAtUV와 동일한 ‘픽셀 모듈로’ 방식) */
  patternScalePxX?: number;   // default 1
  patternScalePxY?: number;   // default 1
  patternOffsetPxX?: number;  // default 0
  patternOffsetPxY?: number;  // default 0

  /** 밴드 경계 양쪽으로 섞일 수 있는 폭(px) — 여기서만 스플랫 생성 */
  exchangeBandPx?: number;    // default 12

  /** 스플랫 밀도(대략 px당), 값↑ → 씨앗↑ */
  splatDensity?: number;      // default 0.00025  (대충 width*exchangeBandPx*2*splatDensity 개)

  /** 스플랫 크기(px) 범위 */
  splatRadiusMinPx?: number;  // default 6
  splatRadiusMaxPx?: number;  // default 28

  /** 불규칙도(0..1) & 로브(들쭉날쭉 빈도) */
  splatIrregularity?: number; // default 0.45
  splatLobesMin?: number;     // default 3
  splatLobesMax?: number;     // default 7

  /** 가장자리 부드러움(px) */
  splatFeatherPx?: number;    // default 1.2

  /** 돌 영역 내부에 ‘풀 구멍’ vs 풀 영역에 ‘돌 점’ 비율(0..1) */
  biasInsideHole?: number;    // default 0.45  (돌 안의 풀 구멍 확률)
  biasOutsideDot?: number;    // default 0.55  (풀 밖의 돌 점 확률)

  /** 스플랫 회전(°) 범위 — 축 정렬감 줄이기 */
  rotateMinDeg?: number;      // default 0
  rotateMaxDeg?: number;      // default 360

  /** 내부 워블(형상 흔들림) */
  warpAmpPx?: number;         // default 4
  warpFreq?: number;          // default 0.08

  /** ‘풀 구멍’ 채우기에 쓸 풀 색상(원본을 저장 안 하는 구조라서 필요) */
  grassFallback?: THREE.Color;  // default new Color(0xA6C954)
}

/* ============================ Class ============================ */
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
  ) { }

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
    texelDensity = 4,                       // 단일 값으로 X/Z 공통 설정
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
    if (width === undefined) width = Math.max(2, Math.round(this.planeWidth * this.texelDensityX));
    if (height === undefined) height = Math.max(2, Math.round(this.planeHeight * this.texelDensityZ));

    this.width = width;
    this.height = height;
    this.blendMapSize = width * height;

    // --- 텍스처 초기화 ---
    this.blendMapData = new Uint8Array(4 * this.blendMapSize);
    const r = (color.r * 255) | 0, g = (color.g * 255) | 0, b = (color.b * 255) | 0;
    for (let i = 0; i < this.blendMapData.length;) {
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
    this.applyBeachSlope(); // 기본 옵션으로 자동 적용
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, this.obj);
    return ground;
  }

  Delete(...param: any) {
    // 필요 시 구현
  }

  /* --------------------------- 리샘플 & 재구성 --------------------------- */
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

    const newW = explicitWidth ?? Math.max(2, Math.round(this.planeWidth * this.texelDensityX));
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

    const mapWidth = (data as any).mapWidth ?? data.mapSize;
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

    const maxR = 255, maxG = 204, maxB = 102;

    // 루프의 범위를 radius보다 약간 넓게 잡아 가장자리가 잘리는 현상을 방지
    const loopRadius = Math.floor(this.radius * 1.5);

    for (let y = -loopRadius; y <= loopRadius; y++) {
      for (let x = -loopRadius; x <= loopRadius; x++) {
        const tx = cx + x, ty = cy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;

        const d = Math.hypot(x, y);

        // 노이즈 기반 반경 왜곡
        const n = this.noise.noise(tx / this.noiseScale, ty / this.noiseScale, 0);
        const distortedRadius = this.radius * (1.0 + n * this.noiseStrength);

        if (d < distortedRadius) {
          const falloff = 1.0 - d / distortedRadius;
          const t = falloff * falloff * (3.0 - 2.0 * falloff);

          const i = (ty * this.width + tx) * 4;
          this.blendMapData[i + 0] = Math.min(maxR, this.blendMapData[i + 0] + t * 255);
          this.blendMapData[i + 1] = Math.min(maxG, this.blendMapData[i + 1] + t * 255);
          this.blendMapData[i + 2] = Math.min(maxB, this.blendMapData[i + 2] + t * 255);
          this.blendMapData[i + 3] = 255;
        }
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

  applyPatternAtUV(uv: THREE.Vector2, pattern: THREE.DataTexture, radius?: number) {
    radius = radius ?? this.radius;
    const pSrc = pattern.image.data as Uint8Array | Uint8ClampedArray;
    const patternData = toU8(pSrc);
    const pw = pattern.image.width, ph = pattern.image.height;

    const cx = Math.floor(uv.x * this.width);
    const cy = Math.floor(uv.y * this.height);

    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const tx = cx + x, ty = cy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;
        const d = Math.hypot(x, y);
        if (d > radius) continue;
        const n = this.noise.noise(tx / this.noiseScale, ty / this.noiseScale, 0);
        const distorted = d * (1.0 + n * this.noiseStrength);
        const t = Math.max(0, 1 - distorted / radius);
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
  private zFromV(v: number) { const halfH = this.planeHeight * 0.5; return halfH - v * this.planeHeight; }
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
      colorNoiseAmp = 0.12,
    } = opts;

    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    const s = this.obj.scale.x;
    const halfW = this.planeWidth * 0.5;
    const halfH = this.planeHeight * 0.5;

    const maxDropLocal = maxDrop / s;
    const noiseAmpLocal = noiseAmplitude / s;

    const alongAxis: 'x' | 'z' = (side === 'east' || side === 'west') ? 'z' : 'x';
    const perpAxis: 'x' | 'z'  = (alongAxis === 'x') ? 'z' : 'x';

    const edgeCoord =
      side === 'south' ? -halfH :
      side === 'north' ?  halfH :
      side === 'west'  ? -halfW :  halfW;

    const domainLen = (side === 'south' || side === 'north') ? this.planeHeight : this.planeWidth;

    // 내륙으로 startFraction만큼 떨어진 기준선(기본)
    const baseStart =
      (side === 'south' || side === 'west')
        ? edgeCoord + domainLen * startFraction
        : edgeCoord - domainLen * startFraction;

    // 0..1 smoother + pow
    const smootherPow = (t: number, p: number) => {
      const tt = Math.min(1, Math.max(0, t));
      const s5 = tt * tt * tt * (tt * (tt * 6 - 15) + 10);
      return Math.pow(s5, p);
    };

    // 연속성 보장을 위해 along 좌표를 [0,1]로 정규화하여 같은 노이즈를 사용
    const coastNoise1D = (alongWorld: number) => {
      const u = (alongAxis === 'x')
        ? (alongWorld + halfW) / this.planeWidth
        : (alongWorld + halfH) / this.planeHeight;
      return this.noise.noise(u * noiseFrequency * 10.0, 0, 0);
    };

    const coastStart = (alongWorld: number) => baseStart + noiseAmpLocal * coastNoise1D(alongWorld);

    /* -------------------- 1) 높이(지오메트리) -------------------- */
    for (let i = 0; i < arr.length; i += 3) {
      const vx = arr[i + 0], vy = arr[i + 1], vz = arr[i + 2];
      const along = (alongAxis === 'x') ? vx : vz;
      const perp  = (perpAxis  === 'x') ? vx : vz;

      const startLine = coastStart(along);
      const localSlopeW = Math.max(1e-6, Math.abs(startLine - edgeCoord));

      // side별 t 정의 동일화
      let t = (side === 'south' || side === 'west')
        ? (startLine - perp) / localSlopeW
        : (perp - startLine) / localSlopeW;

      const w = smootherPow(t, profilePower);   // 높이/색상 공용 “같은” 프로파일
      if (w <= 0) continue;

      const targetY = -maxDropLocal * w;
      if (targetY < vy) arr[i + 1] = targetY;  // 바닥만 깎음(돌출 금지)
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    /* -------------------- 2) 색상(블렌드맵) -------------------- */
    if (colorMode !== 'none' && this.blendMapData) {
      const sr = Math.round(sandColor.r * 255), sg = Math.round(sandColor.g * 255), sb = Math.round(sandColor.b * 255);
      const gr = Math.round(grassColor.r * 255), gg = Math.round(grassColor.g * 255), gb = Math.round(grassColor.b * 255);

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

      if (side === 'south' || side === 'north') {
        // x 스캔
        for (let xi = 0; xi < this.width; xi++) {
          const x = this.xFromXi(xi);
          const startLine = coastStart(x);
          const localSlopeW = Math.max(1e-6, Math.abs(startLine - edgeCoord));
          const yi0 = this.yiFromZ(Math.min(edgeCoord, startLine));
          const yi1 = this.yiFromZ(Math.max(edgeCoord, startLine));
          for (let yi = Math.min(yi0, yi1); yi <= Math.max(yi0, yi1); yi++) {
            const z = this.zFromYi(yi);
            let t = (side === 'south') ? (startLine - z) / localSlopeW : (z - startLine) / localSlopeW;
            let w = smootherPow(t, profilePower);
            if (w <= 0) continue;

            if (colorNoiseAmp > 0) {
              const u = (x + halfW) / this.planeWidth, v = (z + halfH) / this.planeHeight;
              const n = this.noise.noise(u * 10.0, v * 10.0, 0); // 색상 노이즈 주파수 고정
              w = Math.min(1, Math.max(0, w + n * colorNoiseAmp));
            }
            applyPixel(xi, yi, w);
          }
        }
      } else {
        // z 스캔
        for (let yi = 0; yi < this.height; yi++) {
          const z = this.zFromYi(yi);
          const startLine = coastStart(z);
          const localSlopeW = Math.max(1e-6, Math.abs(startLine - edgeCoord));
          const xi0 = this.xiFromX(Math.min(edgeCoord, startLine));
          const xi1 = this.xiFromX(Math.max(edgeCoord, startLine));
          for (let xi = Math.min(xi0, xi1); xi <= Math.max(xi0, xi1); xi++) {
            const x = this.xFromXi(xi);
            let t = (side === 'west') ? (startLine - x) / localSlopeW : (x - startLine) / localSlopeW;
            let w = smootherPow(t, profilePower);
            if (w <= 0) continue;

            if (colorNoiseAmp > 0) {
              const u = (x + halfW) / this.planeWidth, v = (z + halfH) / this.planeHeight;
              const n = this.noise.noise(u * 10.0, v * 10.0, 0);
              w = Math.min(1, Math.max(0, w + n * colorNoiseAmp));
            }
            applyPixel(xi, yi, w);
          }
        }
      }
      this.blendMap.needsUpdate = true;
    }
  }

  /* ------------------------ Pattern Rect Splat ------------------------ */
  // NEW: 명확한 직사각 밴드 + 경계 스플랫
  applyPatternRectSplat(pattern: THREE.DataTexture, opts: PatternBandSplatOptions) {
    if (!this.blendMapData || !this.width || !this.height) return;

    // ---- 옵션 & 기본 ----
    let {
      top, left, bottom, right,
      patternScalePxX = 1, patternScalePxY = 1,
      patternOffsetPxX = 0, patternOffsetPxY = 0,
      exchangeBandPx = 12,
      splatDensity = 0.00025,
      splatRadiusMinPx = 6,
      splatRadiusMaxPx = 28,
      splatIrregularity = 0.45,
      splatLobesMin = 3,
      splatLobesMax = 7,
      splatFeatherPx = 1.2,
      biasInsideHole = 0.45,
      biasOutsideDot = 0.55,
      rotateMinDeg = 0,
      rotateMaxDeg = 360,
      warpAmpPx = 4,
      warpFreq = 0.08,
      grassFallback = new THREE.Color(0xA6C954),
    } = opts;

    const clamp01 = (v:number)=>Math.max(0,Math.min(1,v));
    // 4방향 값 클램핑 및 정렬
    top    = clamp01(top);
    left   = clamp01(left);
    bottom = clamp01(bottom);
    right  = clamp01(right);
    if (bottom < top) [top, bottom] = [bottom, top];
    if (right < left) [left, right] = [right, left];
    if (bottom === top) bottom = Math.min(1, top + 1e-4);
    if (right === left) right = Math.min(1, left + 1e-4);

    // --- 돌 텍스처 샘플 (픽셀 모듈로) ---
    const pSrc = pattern.image.data as Uint8Array | Uint8ClampedArray;
    const pData = (pSrc.constructor === Uint8Array) ? pSrc : new Uint8Array(pSrc.buffer);
    const pw = pattern.image.width, ph = pattern.image.height;
    const wrap = (v:number,m:number)=>((v % m)+m)%m;
    const samplePatternByPixel = (px:number, py:number) => {
      const sx = Math.max(1e-6, patternScalePxX);
      const sy = Math.max(1e-6, patternScalePxY);
      const tx = Math.floor(wrap((px + patternOffsetPxX) / sx, pw));
      const ty = Math.floor(wrap((py + patternOffsetPxY) / sy, ph));
      const i = (ty * pw + tx) * 4;
      return [pData[i], pData[i+1], pData[i+2], pData[i+3]] as [number,number,number,number];
    };

    // --- 밴드 메인 영역 하드 오버라이드 ---
    const yTopPx = top * (this.height - 1);
    const yBotPx = bottom * (this.height - 1);
    const xLeftPx = left * (this.width - 1);
    const xRightPx = right * (this.width - 1);

    for (let yi = Math.max(0, Math.floor(yTopPx)); yi <= Math.min(this.height - 1, Math.ceil(yBotPx)); yi++){
      for (let xi = Math.max(0, Math.floor(xLeftPx)); xi <= Math.min(this.width - 1, Math.ceil(xRightPx)); xi++){
        const [pr,pg,pb,pa] = samplePatternByPixel(xi, yi);
        if (pa===0) continue;
        const bi = (yi*this.width+xi)*4;
        this.blendMapData[bi+0]=pr;
        this.blendMapData[bi+1]=pg;
        this.blendMapData[bi+2]=pb;
      }
    }

    // --- 경계 대역 스플랫 씨앗 ---
    const rectW = Math.max(1, xRightPx - xLeftPx);
    const rectH = Math.max(1, yBotPx - yTopPx);
    const perimeter = 2 * (rectW + rectH);
    const approxSeeds = Math.max(1, Math.floor(perimeter * exchangeBandPx * splatDensity));

    const n = this.noise;
    const wobble = (x:number,y:number)=> (n.noise(x*warpFreq, y*warpFreq, 0) * 2 - 1) * warpAmpPx;

    type Seed = {
      cx:number; cy:number; r:number; rot:number; lobes:number;
      type:'dot'|'hole';
    };
    const seeds: Seed[] = [];

    for (let i=0;i<approxSeeds;i++){
      const p = Math.random() * perimeter;

      let cx0=0, cy0=0;
      let isHorizontalEdge = false;
      let insideSign = 0;

      if (p < rectW) { // 상단
        cx0 = xLeftPx + p;
        cy0 = yTopPx;
        isHorizontalEdge = true;
        insideSign = 1;
      } else if (p < rectW + rectH) { // 우측
        cx0 = xRightPx;
        cy0 = yTopPx + (p - rectW);
        insideSign = -1;
      } else if (p < 2 * rectW + rectH) { // 하단
        cx0 = xLeftPx + (p - (rectW + rectH));
        cy0 = yBotPx;
        isHorizontalEdge = true;
        insideSign = -1;
      } else { // 좌측
        cx0 = xLeftPx;
        cy0 = yTopPx + (p - (2 * rectW + rectH));
        insideSign = 1;
      }

      const offsetDir = (Math.random() < 0.5) ? -1 : 1; // -1: 밖, +1: 안
      const offsetVal = Math.random() * exchangeBandPx;

      let cx = cx0, cy = cy0;
      if (isHorizontalEdge) cy += insideSign * offsetDir * offsetVal;
      else cx += insideSign * offsetDir * offsetVal;

      const wob = wobble(cx0, cy0);
      if (isHorizontalEdge) cy += wob; else cx += wob;

      cx = Math.max(0, Math.min(this.width - 1, cx));
      cy = Math.max(0, Math.min(this.height - 1, cy));

      const rr  = splatRadiusMinPx + Math.random()*(splatRadiusMaxPx - splatRadiusMinPx);
      const rot = (rotateMinDeg + Math.random()*(rotateMaxDeg - rotateMinDeg)) * Math.PI/180;
      const lobes = Math.floor(splatLobesMin + Math.random()*(splatLobesMax - splatLobesMin + 0.999));

      const type:Seed['type'] = (offsetDir > 0)
        ? (Math.random() < biasInsideHole ? 'hole' : 'dot')
        : (Math.random() < biasOutsideDot ? 'dot' : 'hole');

      seeds.push({cx,cy,r:rr,rot,lobes,type});
    }

    const irr = splatIrregularity;
    const cos = Math.cos, sin = Math.sin;
    const gR = (c:THREE.Color)=>[Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255)] as [number,number,number];
    const [grR,grG,grB] = gR(grassFallback);

    for (const s of seeds){
      const rMax = s.r * (1 + irr);
      const x0 = Math.max(0, Math.floor(s.cx - rMax - splatFeatherPx));
      const x1 = Math.min(this.width-1, Math.ceil (s.cx + rMax + splatFeatherPx));
      const y0 = Math.max(0, Math.floor(s.cy - rMax - splatFeatherPx));
      const y1 = Math.min(this.height-1, Math.ceil (s.cy + rMax + splatFeatherPx));

      const radial = (theta:number)=>{
        const k = s.lobes * 0.75;
        const t = n.noise(cos(theta)*k, sin(theta)*k, 0);
        const bump = (t*0.5+0.5);
        return s.r * (1 + irr*(bump*2-1));
      };

      for (let y=y0; y<=y1; y++){
        for (let x=x0; x<=x1; x++){
          const distTop = Math.abs(y - yTopPx);
          const distBot = Math.abs(y - yBotPx);
          const distLeft = Math.abs(x - xLeftPx);
          const distRight = Math.abs(x - xRightPx);
          const minEdgeDist = Math.min(distTop, distBot, distLeft, distRight);
          if (minEdgeDist > exchangeBandPx) continue;

          const dx = x - s.cx, dy = y - s.cy;
          const d  = Math.hypot(dx,dy);
          if (d > rMax + splatFeatherPx) continue;

          const th = Math.atan2(dy, dx) - s.rot;
          const rDir = radial(th);

          const edge = (rDir - d) / Math.max(1e-6, splatFeatherPx);
          if (edge <= -1) continue;
          const w = Math.max(0, Math.min(1, edge + 1));
          if (w <= 0) continue;

          const bi = (y*this.width + x)*4;
          if (s.type === 'dot') {
            const [pr,pg,pb,pa] = samplePatternByPixel(x, y);
            if (pa===0) continue;
            const [sr,sg,sb] = [this.blendMapData[bi], this.blendMapData[bi+1], this.blendMapData[bi+2]];
            this.blendMapData[bi+0] = Math.round(sr*(1-w) + pr*w);
            this.blendMapData[bi+1] = Math.round(sg*(1-w) + pg*w);
            this.blendMapData[bi+2] = Math.round(sb*(1-w) + pb*w);
          } else { // 'hole'
            const [sr,sg,sb] = [this.blendMapData[bi], this.blendMapData[bi+1], this.blendMapData[bi+2]];
            this.blendMapData[bi+0] = Math.round(sr*(1-w) + grR*w);
            this.blendMapData[bi+1] = Math.round(sg*(1-w) + grG*w);
            this.blendMapData[bi+2] = Math.round(sb*(1-w) + grB*w);
          }
        }
      }
    }

    this.blendMap.needsUpdate = true;
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
