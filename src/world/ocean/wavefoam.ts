// WaterFoamRipples.ts  — three r160 / Strategy #2 (Height-band filter only)
import * as THREE from 'three';
import { IWorldMapObject, MapEntryType } from '@Glibs/types/worldmaptypes';

export type WaterFoamOptions = {
  size?: number; segments?: number;
  foamColor?: number; waterColor?: number;
  threshold?: number;              // 폼 두께 임계값(카메라 공간) 0.3~3.0 권장
  waveAmp?: number; waveFreq?: number; waveSpeed?: number;
  rippleStrength?: number;         // 0~1
  dudvScale?: number;              // 표면 왜곡 정도
  dudvUrl?: string;
  position?: THREE.Vector3; rotationX?: number;

  // ▼ 전략 2: 수면 높이 밴드 필터
  heightBand?: number;             // 수면 높이 주변 허용 밴드(미터)
};

const DEFAULTS: Required<WaterFoamOptions> = {
  size: 100,
  segments: 200,
  foamColor: 0xffffff,
  waterColor: 0x14c6a5,
  threshold: 1.0,
  waveAmp: 0.06,
  waveFreq: 1.8,
  waveSpeed: 1.2,
  rippleStrength: 0.35,
  dudvScale: 1.0,
  dudvUrl: 'https://i.imgur.com/hOIsXiZ.png',
  position: new THREE.Vector3(0,0,0),
  rotationX: -Math.PI*0.5,
  heightBand: 0.2,
};

// ===== Shaders =====
const VERTEX_SHADER = /* glsl */`
precision highp float;              // FRAG와 precision 일치
precision highp int;
varying vec2 vUv;

#include <fog_pars_vertex>          // fog 사용 시 필수

uniform float time;
uniform float waveAmp;
uniform float waveFreq;
uniform float waveSpeed;

void main() {
  vUv = uv;

  #include <begin_vertex>          // vec3 transformed = position;

  float w1 = sin( (transformed.x + transformed.y) * waveFreq + time * waveSpeed );
  float w2 = sin( (transformed.x * 0.8 - transformed.y * 1.4) * (waveFreq * 0.7) - time * (waveSpeed * 1.3) );
  transformed.z += (w1 + w2) * waveAmp;

  #include <project_vertex>
  #include <fog_vertex>            // vFogDepth 생성
}
`;

const FRAGMENT_SHADER = /* glsl */`
// r160: pars 상단에는 tonemapping만(※ colorspace_pars 넣지 않음!)
precision highp float;
precision highp int;

#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <tonemapping_pars_fragment>

varying vec2 vUv;

uniform sampler2D tDepth;      // 프리패스로 얻은 씬 깊이
uniform sampler2D tDudv;       // 데이터 텍스처(선형/NoColorSpace)
uniform vec3 waterColor;
uniform vec3 foamColor;
uniform float cameraNear;
uniform float cameraFar;
uniform float time;
uniform float threshold;       // foam 두께 임계값(카메라 공간)
uniform vec2 resolution;       // gl_FragCoord.xy / resolution
uniform float rippleStrength;  // 0~1
uniform float dudvScale;

// ▼ 전략 2: 수면 높이 밴드 필터용
uniform mat4 projInv;          // camera.projectionMatrixInverse
uniform mat4 viewInv;          // camera.matrixWorld
uniform float waterLevelY;     // 월드 수면 높이(평균)
uniform float heightBand;      // 허용 밴드(m)

// DepthTexture vs RGBADepthPacking
float getDepth( const in vec2 screenPosition ) {
  #if DEPTH_PACKING == 1
    return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
  #else
    return texture2D( tDepth, screenPosition ).x;
  #endif
}

float getViewZ( const in float depth ) {
  #if ORTHOGRAPHIC_CAMERA == 1
    return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
  #else
    return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
  #endif
}

void main() {
  vec2 screenUV = gl_FragCoord.xy / resolution;

  // 1) 시선 두께(thickness) 기반 폼
  float sceneND  = getDepth( screenUV );
  float waterND  = gl_FragCoord.z;

  float sceneVZ  = getViewZ( sceneND );   // r160: 멀수록 더 음수
  float waterVZ  = getViewZ( waterND );

  float thickness = max(0.0, waterVZ - sceneVZ);     // 물(앞) - 씬(뒤)
  float foam = 1.0 - smoothstep(0.0, threshold, thickness);

  // 2) 높이 밴드 필터 — 수면 높이에서 멀면 폼 제거
  //    (씬 픽셀의 월드 좌표 복원)
  vec4 ndc = vec4(screenUV * 2.0 - 1.0, sceneND * 2.0 - 1.0, 1.0);
  vec4 viewPos = projInv * ndc;
  viewPos /= viewPos.w;
  vec4 worldPos = viewInv * viewPos;

  float h = abs(worldPos.y - waterLevelY);
  float heightMask = 1.0 - smoothstep(heightBand, heightBand * 1.5, h);
  foam *= heightMask; // 수면 높이에서 멀면 폼 0

  // 3) 표면 왜곡/리플 (시각 효과)
  vec2 dudv = texture2D( tDudv, ( vUv * 2.0 ) - time * 0.05 ).rg;
  dudv = (dudv * 2.0 - 1.0) * dudvScale;

  float s1 = texture2D( tDudv, vUv * 3.0 + vec2( time * 0.03, 0.0 ) ).r;
  float s2 = texture2D( tDudv, vUv * 3.0 - vec2( 0.0, time * 0.025 ) ).g;
  float rip = (s1 + s2) * 0.5;
  float waveBands = 0.5 + 0.5 * sin( (vUv.x * 10.0 + vUv.y * 12.0) - time * 1.5 );
  float rippleMask = mix( rip, waveBands, 0.5 );

  // 4) 최종 색
  vec3 baseColor = mix( waterColor, foamColor, foam );
  float t = clamp(rippleMask * rippleStrength, 0.0, 1.0);
  vec3 waveTint = mix( baseColor, baseColor * 1.35, t );
  waveTint += dudv.xxx * 0.03; // 미세 요철 느낌

  gl_FragColor = vec4( waveTint, 1.0 );

  // 하단 순서: 톤매핑 → colorspace → 안개 (각 1회)
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// ===== Class =====
export class WaterFoamRipples implements IWorldMapObject {
  public Type: MapEntryType = MapEntryType.WaterFoamRipples;
  public Mesh?: THREE.Object3D;

  private _rt!: THREE.WebGLRenderTarget;
  private _depthMat!: THREE.MeshDepthMaterial;
  private _clock = new THREE.Clock();
  private _uniforms!: {
    time: { value: number };
    threshold: { value: number };
    tDudv: { value: THREE.Texture | null };
    tDepth: { value: THREE.Texture | null };
    cameraNear: { value: number };
    cameraFar: { value: number };
    resolution: { value: THREE.Vector2 };
    foamColor: { value: THREE.Color };
    waterColor: { value: THREE.Color };
    waveAmp: { value: number };
    waveFreq: { value: number };
    waveSpeed: { value: number };
    rippleStrength: { value: number };
    dudvScale: { value: number };
    // ▼ 전략 2 유니폼
    projInv: { value: THREE.Matrix4 };
    viewInv: { value: THREE.Matrix4 };
    waterLevelY: { value: number };
    heightBand: { value: number };
    [k: string]: any;
  };

  private _opts: Required<WaterFoamOptions> = { ...DEFAULTS };
  private _dudv?: THREE.Texture;
  private _supportsDepthTex = false;
  private _lastDepthFrame = -1;

  constructor(
    private _scene: THREE.Scene,
    private _camera: THREE.Camera,
    private _renderer: THREE.WebGLRenderer,
  ) {}

  public async Create(options?: WaterFoamOptions) {
    this._opts = { ...DEFAULTS, ...(options ?? {}) };

    // Depth RT
    this._supportsDepthTex =
      !!this._renderer.capabilities.isWebGL2 ||
      !!this._renderer.extensions.get('WEBGL_depth_texture');

    const pr = this._renderer.getPixelRatio();
    const size = this._renderer.getSize(new THREE.Vector2());
    const w = Math.max(1, Math.floor(size.x * pr));
    const h = Math.max(1, Math.floor(size.y * pr));

    this._rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this._rt.texture.generateMipmaps = false;
    this._rt.texture.colorSpace = THREE.NoColorSpace; // 중간 버퍼는 선형

    if (this._supportsDepthTex) {
      const depthTex = new THREE.DepthTexture(w, h);
      depthTex.type = THREE.UnsignedShortType;
      depthTex.format = THREE.DepthFormat;
      depthTex.minFilter = THREE.NearestFilter;
      depthTex.magFilter = THREE.NearestFilter;
      this._rt.depthTexture = depthTex;
    }

    this._depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      blending: THREE.NoBlending,
    });

    // dudv: 데이터 텍스처(선형)
    this._dudv = await new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(
        this._opts.dudvUrl,
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.NoColorSpace; // 데이터 텍스처
          tex.needsUpdate = true;
          resolve(tex);
        },
        undefined,
        reject
      );
    });

    // uniforms
    this._uniforms = {
      time: { value: 0 },
      threshold: { value: this._opts.threshold },
      tDudv: { value: this._dudv ?? null },
      tDepth: { value: this._supportsDepthTex ? (this._rt.depthTexture as any) : this._rt.texture },
      cameraNear: { value: (this._camera as any).near ?? 0.1 },
      cameraFar:  { value: (this._camera as any).far  ?? 1000 },
      resolution: { value: new THREE.Vector2(w, h) },
      foamColor:  { value: new THREE.Color(this._opts.foamColor) },
      waterColor: { value: new THREE.Color(this._opts.waterColor) },
      waveAmp: { value: this._opts.waveAmp },
      waveFreq:{ value: this._opts.waveFreq },
      waveSpeed:{ value: this._opts.waveSpeed },
      rippleStrength: { value: this._opts.rippleStrength },
      dudvScale: { value: this._opts.dudvScale },

      // ▼ 전략 2 유니폼 초기값
      projInv:     { value: new THREE.Matrix4() },
      viewInv:     { value: new THREE.Matrix4() },
      waterLevelY: { value: 0 },
      heightBand:  { value: this._opts.heightBand },

      ...THREE.UniformsLib['fog'],
    };

    // geometry & material
    const geom = new THREE.PlaneGeometry(
      this._opts.size, this._opts.size,
      this._opts.segments, this._opts.segments
    );

    const isOrtho = (this._camera instanceof THREE.OrthographicCamera);
    const mat = new THREE.ShaderMaterial({
      defines: {
        DEPTH_PACKING: this._supportsDepthTex ? 0 : 1,
        ORTHOGRAPHIC_CAMERA: isOrtho ? 1 : 0,
      },
      uniforms: this._uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      fog: true,
      toneMapped: true, // 하단 include 사용
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = this._opts.rotationX;     // 수평
    mesh.position.copy(this._opts.position);

    // 깊이 프리패스: 프레임당 1회 + 명시적 clear (컴포저 사용해도 동작)
    mesh.onBeforeRender = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
      const frame = renderer.info.render.frame;
      if (this._lastDepthFrame === frame) return;
      this._lastDepthFrame = frame;

      const prevOverride = scene.overrideMaterial;
      const prevRT = renderer.getRenderTarget();

      // 수면(자신) 숨기기 — 물 자체가 깊이에 들어가지 않도록
      const hidden: THREE.Object3D[] = [];
      this.Mesh!.traverse(o => { if (o.visible) { hidden.push(o); (o as any).visible = false; } });

      scene.overrideMaterial = this._depthMat;
      renderer.setRenderTarget(this._rt);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      // 복원
      renderer.setRenderTarget(prevRT);
      scene.overrideMaterial = prevOverride ?? null;
      for (const o of hidden) (o as any).visible = true;

      // 해상도/카메라 파라미터 갱신
      const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
      this._uniforms.resolution.value.set(buf.x, buf.y);
      const camAny = camera as any;
      this._uniforms.cameraNear.value = camAny.near ?? this._uniforms.cameraNear.value;
      this._uniforms.cameraFar.value  = camAny.far  ?? this._uniforms.cameraFar.value;

      // ▼ 전략 2: 역행렬/수면 높이 갱신
      this._uniforms.projInv.value.copy((camera as any).projectionMatrixInverse);
      this._uniforms.viewInv.value.copy((camera as any).matrixWorld);
      const waterWorldPos = new THREE.Vector3();
      this.Mesh!.getWorldPosition(waterWorldPos);
      this._uniforms.waterLevelY.value = waterWorldPos.y;
      this._uniforms.heightBand.value  = this._opts.heightBand;

      // 시간/옵션 갱신
      const t = this._clock.getElapsedTime();
      this._uniforms.time.value = t;
      this._uniforms.threshold.value = this._opts.threshold;
      this._uniforms.foamColor.value.set(this._opts.foamColor);
      this._uniforms.waterColor.value.set(this._opts.waterColor);
      this._uniforms.waveAmp.value = this._opts.waveAmp;
      this._uniforms.waveFreq.value = this._opts.waveFreq;
      this._uniforms.waveSpeed.value = this._opts.waveSpeed;
      this._uniforms.rippleStrength.value = this._opts.rippleStrength;
      this._uniforms.dudvScale.value = this._opts.dudvScale;
    };

    this.Mesh = mesh;
    this._scene.add(mesh);
    return this.Mesh;
  }


  public Delete(): void {
    if (!this.Mesh) return;
    this._scene.remove(this.Mesh);
    const m = this.Mesh as THREE.Mesh;
    m.geometry.dispose();
    (m.material as THREE.ShaderMaterial).dispose();
    this._dudv?.dispose();
    this._rt?.dispose();
    this.Mesh = undefined;
  }

  public SetSize(width: number, height: number): void {
    const pr = this._renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(width * pr));
    const h = Math.max(1, Math.floor(height * pr));
    this._rt.setSize(w, h);
    this._uniforms.resolution.value.set(w, h);
  }

  public Show?(): void { if (this.Mesh) this.Mesh.visible = true; }
  public Hide?(): void { if (this.Mesh) this.Mesh.visible = false; }

  public Save?(): any {
    return {
      size: this._opts.size, segments: this._opts.segments,
      foamColor: this._opts.foamColor, waterColor: this._opts.waterColor,
      threshold: this._opts.threshold, waveAmp: this._opts.waveAmp,
      waveFreq: this._opts.waveFreq, waveSpeed: this._opts.waveSpeed,
      rippleStrength: this._opts.rippleStrength, dudvScale: this._opts.dudvScale,
      dudvUrl: this._opts.dudvUrl,
      position: this._opts.position.toArray(), rotationX: this._opts.rotationX,
      heightBand: this._opts.heightBand,
    };
  }

  public Load?(data: any): void {
    if (!data) return;
    this._opts = {
      ...this._opts, ...data,
      position: data.position ? new THREE.Vector3().fromArray(data.position) : this._opts.position,
    };
    if (this.Mesh) {
      this.Mesh.position.copy(this._opts.position);
      (this.Mesh as THREE.Mesh).rotation.x = this._opts.rotationX;
    }
  }
}

export default WaterFoamRipples;
