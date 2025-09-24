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
export interface PatternBandSplatOptions {
  /** 0..1: 수직 밴드(돌바닥 메인 영역) */
  startPercent: number;
  endPercent: number;

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

    // 루프의 범위를 radius보다 약간 넓게 잡아 가장자리가 잘리는 현상을 방지합니다.
    const loopRadius = Math.floor(this.radius * 1.5);

    for (let y = -loopRadius; y <= loopRadius; y++) {
      for (let x = -loopRadius; x <= loopRadius; x++) {
        const tx = cx + x, ty = cy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;

        const d = Math.hypot(x, y);

        // 1. 노이즈 계산을 먼저 수행합니다.
        const n = this.noise.noise(tx / this.noiseScale, ty / this.noiseScale, 0);

        // 2. 노이즈를 이용해 실제 적용될 반경을 왜곡시킵니다.
        // noiseStrength가 클수록 경계가 더 불규칙해집니다.
        const distortedRadius = this.radius * (1.0 + n * this.noiseStrength);

        // 3. 왜곡된 반경을 기준으로 거리를 판단하고, 경계를 부드럽게 처리합니다.
        if (d < distortedRadius) {
          // Smoothstep 함수를 적용하여 가장자리를 매우 부드럽게 만듭니다.
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
    const perpAxis: 'x' | 'z' = (alongAxis === 'x') ? 'z' : 'x';

    const edgeCoord =
      side === 'south' ? -halfH :
        side === 'north' ? halfH :
          side === 'west' ? -halfW : halfW;

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
      const perp = (perpAxis === 'x') ? vx : vz;

      const startLine = baseStart + noiseAmpLocal * coastNoise1D(along);
      const slopeWidth = Math.max(1e-6, Math.abs(startLine - edgeCoord));

      let t: number;
      if (side === 'south' || side === 'west') t = (startLine - perp) / slopeWidth;
      else t = (perp - startLine) / slopeWidth;
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
  /** 수직 밴드(돌바닥) + 경계 스플랫 섞임: 물방울 튀듯 불규칙한 교환 */
applyPatternVerticalBandSplat(pattern: THREE.DataTexture, opts: PatternBandSplatOptions) {
  if (!this.blendMapData || !this.width || !this.height) return;

  // ---- 옵션 & 기본 ----
  let {
    startPercent, endPercent,
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
  startPercent = clamp01(startPercent);
  endPercent   = clamp01(endPercent);
  if (endPercent < startPercent) [startPercent, endPercent] = [endPercent, startPercent];
  if (endPercent === startPercent) endPercent = Math.min(1, startPercent + 1e-4);

  // --- 돌 텍스처 샘플 (픽셀 모듈로) ---
  const pSrc = pattern.image.data as Uint8Array | Uint8ClampedArray;
  const pData = toU8(pSrc);
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

  // --- 밴드(돌바닥) 메인 영역: 하드 오버라이드 ---
  const yTopBase = startPercent * (this.height - 1);
  const yBotBase = endPercent   * (this.height - 1);
  for (let xi=0; xi<this.width; xi++){
    const yiStart = Math.max(0, Math.floor(yTopBase));
    const yiEnd   = Math.min(this.height - 1, Math.ceil(yBotBase));
    for (let yi=yiStart; yi<=yiEnd; yi++){
      const [pr,pg,pb,pa] = samplePatternByPixel(xi, yi);
      if (pa===0) continue;
      const bi = (yi*this.width+xi)*4;
      this.blendMapData[bi+0]=pr;
      this.blendMapData[bi+1]=pg;
      this.blendMapData[bi+2]=pb;
    }
  }

  // --- 경계 대역을 기준으로 스플랫 씨앗 생성 ---
  const bandH = Math.max(1e-6, yBotBase - yTopBase);
  const edgeTopY = yTopBase;
  const edgeBotY = yBotBase;

  // 예상 씨앗 수(가이드): 폭 * (양쪽 대역 두께) * 밀도
  const approxSeeds = Math.max(1, Math.floor(this.width * (exchangeBandPx*2) * splatDensity));

  // 난수 유틸 (해시 기반: 안정적 분포)
  const hash = (x:number,y:number)=>{
    let h = ((x*374761393) ^ (y*668265263)) >>> 0;
    h = (h ^ (h>>>13)) * 1274126177 >>> 0;
    return (h & 0xffff)/0xffff;
  };
  const randRange = (r:number)=> (a:number,b:number)=> a + (b-a)*r;

  // 잡음(워블) — ImprovedNoise 사용
  const n = this.noise;
  const wobble = (x:number,y:number)=> {
    const w = n.noise(x*warpFreq, y*warpFreq, 0);
    return (w*2-1)*warpAmpPx;
  };

  // 스플랫 씨앗 만들기
  type Seed = {
    cx:number; cy:number; r:number; rot:number; lobes:number; // 중심/반경/회전/로브 수
    type:'dot'|'hole'; // dot: 풀쪽 돌 점(돌을 칠함), hole: 돌쪽 풀 구멍(풀 칠함)
  };
  const seeds: Seed[] = [];
  for (let i=0;i<approxSeeds;i++){
    const xr = Math.random();
    const yr = Math.random();

    const cx = Math.floor(xr * this.width);
    // 경계선 근처(위/아래 중 하나)로 배치
    const side = (Math.random()<0.5) ? -1 : +1; // -1: 위쪽 경계 근처, +1: 아래쪽 경계 근처
    const baseY = (side<0 ? edgeTopY : edgeBotY);
    // 대역 안에서 균등 + 워블
    const cy0 = baseY + side * (yr * exchangeBandPx);
    const cy = Math.max(0, Math.min(this.height-1, cy0 + wobble(cx, cy0)));

    const r  = randRange(Math.random())(splatRadiusMinPx, splatRadiusMaxPx);
    const rot= randRange(Math.random())(rotateMinDeg, rotateMaxDeg) * Math.PI/180;
    const lobes = Math.floor(randRange(Math.random())(splatLobesMin, splatLobesMax+0.999));

    // 타입 결정: 돌 안 구멍 vs 풀쪽 점 (확률 편향)
    const type:Seed['type'] = (side>0)  // 아래쪽 대역이면 보통 돌 안쪽에 가깝다고 봄
      ? (Math.random()<biasInsideHole? 'hole':'dot')
      : (Math.random()<biasOutsideDot? 'dot' :'hole');

    seeds.push({cx,cy,r,rot,lobes,type});
  }

  // 스플랫 도형 경계: r(θ) = r * (1 + irr * noise(θ*lobes))
  const irr = splatIrregularity;
  const angleStep = Math.PI/24; // 샘플 각도 해상도 (빠르고 충분히 거칠게)
  const cos = Math.cos, sin = Math.sin;

  // 각 스플랫을 자신 주변 박스만 페인트
  const gR = (c:THREE.Color)=>[Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255)] as [number,number,number];

  const [grR,grG,grB] = gR(grassFallback);

  for (const s of seeds){
    const rMax = s.r * (1 + irr);
    const x0 = Math.max(0, Math.floor(s.cx - rMax - splatFeatherPx));
    const x1 = Math.min(this.width-1, Math.ceil (s.cx + rMax + splatFeatherPx));
    const y0 = Math.max(0, Math.floor(s.cy - rMax - splatFeatherPx));
    const y1 = Math.min(this.height-1, Math.ceil (s.cy + rMax + splatFeatherPx));

    // 미리 각도별 목표 반지표 제작 (회전·워블 반영)
    // θ' = atan2(dy,dx) - rot
    const radial = (theta:number)=>{
      // 리지드풍 각방향 요철: noise(θ*lobes, 0)
      const k = s.lobes * 0.75;
      const t = n.noise(Math.cos(theta)*k, Math.sin(theta)*k, 0); // -1..1
      const bump = (t*0.5+0.5); // 0..1
      return s.r * (1 + irr*(bump*2-1)); // r * (1 + irr*( -1..1 ))
    };

    for (let y=y0; y<=y1; y++){
      for (let x=x0; x<=x1; x++){
        // 경계 대역 내에서만 스플랫 적용
        const distTop = Math.abs(y - edgeTopY);
        const distBot = Math.abs(y - edgeBotY);
        if (Math.min(distTop, distBot) > exchangeBandPx) continue;

        const dx = x - s.cx, dy = y - s.cy;
        const d  = Math.hypot(dx,dy);
        if (d > rMax + splatFeatherPx) continue;

        // 로컬 각도
        const th = Math.atan2(dy, dx) - s.rot;
        // 현재 방향의 기준 반지
        let rDir = 0;
        // 근사: 몇 개 각도만 샘플해 보간(빠르게)
        // 정밀 보간 없이 바로 호출 (noise 사용이라 충분히 자연스럽습니다)
        rDir = radial(th);

        // 가장자리 feather
        const edge = (rDir - d) / Math.max(1e-6, splatFeatherPx); // >0: 내부
        if (edge <= -1) continue;
        const w = Math.max(0, Math.min(1, edge + 1)); // -1..0..1 → 0..1
        if (w <= 0) continue;

        const bi = (y*this.width + x)*4;
        if (s.type === 'dot') {
          // 풀쪽에 생성되는 작은 돌 조각 → 돌 텍스처로 살짝/완전 덮기 (w 기반)
          const [pr,pg,pb,pa] = samplePatternByPixel(x, y);
          if (pa===0) continue;
          const sr = this.blendMapData[bi+0];
          const sg = this.blendMapData[bi+1];
          const sb = this.blendMapData[bi+2];
          const ww = w; // 0..1
          this.blendMapData[bi+0] = Math.round(sr*(1-ww) + pr*ww);
          this.blendMapData[bi+1] = Math.round(sg*(1-ww) + pg*ww);
          this.blendMapData[bi+2] = Math.round(sb*(1-ww) + pb*ww);
        } else {
          // 돌 영역 내부의 ‘풀 구멍’ → grassFallback으로 되칠하기 (w 기반)
          const sr = this.blendMapData[bi+0];
          const sg = this.blendMapData[bi+1];
          const sb = this.blendMapData[bi+2];
          const ww = w;
          this.blendMapData[bi+0] = Math.round(sr*(1-ww) + grR*ww);
          this.blendMapData[bi+1] = Math.round(sg*(1-ww) + grG*ww);
          this.blendMapData[bi+2] = Math.round(sb*(1-ww) + grB*ww);
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

/* smootherstep for color pattern */
function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, x));
  const s = t * t * t * (t * (t * 6 - 15) + 10);
  return edge0 + (edge1 - edge0) * s;
}

// 클래스 바깥(파일 하단 util 근처)에 추가해도 됩니다.
function fbm(noise: ImprovedNoise, x: number, y: number, octaves: number, gain: number, lac: number) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise.noise(x * freq, y * freq, 0);
    norm += amp;
    amp *= gain;
    freq *= lac;
  }
  return sum / (norm || 1);
}
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]; // 0..15

function rot2D(x: number, y: number, rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return [x * c - y * s, x * s + y * c] as [number, number];
}

// 리지드 fBm (점/덩어리 느낌)
function fbmRidged(noise: ImprovedNoise, x: number, y: number, oct: number, gain: number, lac: number) {
  let amp = 0.5, freq = 1.0, sum = 0.0, norm = 0.0;
  for (let i = 0; i < oct; i++) {
    // ridged: 1 - |noise|
    const n = 1.0 - Math.abs(noise.noise(x * freq, y * freq, 0));
    sum += amp * n;
    norm += amp;
    amp *= gain;
    freq *= lac;
  }
  return sum / (norm || 1); // 0..1 근사
}
