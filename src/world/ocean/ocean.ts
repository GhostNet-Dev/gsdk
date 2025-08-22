// Ocean.ts (r160-safe, compile-clean, anti-shimmer)
import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IWorldMapObject, MapEntryType, OceanData } from "@Glibs/types/worldmaptypes";

// ===== Shaders =====
const OCEAN_VERT = /* glsl */`
precision highp float;
varying vec2 vUv;
varying vec3 vWorldPos;

uniform float uTime;

#define SCALE 10.0

float calculateSurface(float x, float z) {
  float y = 0.0;
  y += (sin(x * 1.0 / SCALE + uTime * 1.0) + sin(x * 2.3 / SCALE + uTime * 1.5) + sin(x * 3.3 / SCALE + uTime * 0.4)) / 3.0;
  y += (sin(z * 0.2 / SCALE + uTime * 1.8) + sin(z * 1.8 / SCALE + uTime * 1.8) + sin(z * 2.8 / SCALE + uTime * 0.8)) / 3.0;
  return y;
}

void main() {
  vUv = uv;
  vec3 pos = position;

  float strength = 1.0;
  pos.y += strength * calculateSurface(pos.x, pos.z);
  pos.y -= strength * calculateSurface(0.0, 0.0);

  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const OCEAN_FRAG = /* glsl */`
precision highp float;

// cameraPosition 등 공통 유니폼/함수 정의
#include <common>

varying vec2 vUv;
varying vec3 vWorldPos;

uniform sampler2D uMap;
uniform float uTime;
uniform vec3  uColor;

// Anti-shimmer controls
uniform float uLodBias;         // 0.5~1.5 권장
uniform float uRippleNear;      // 가까울수록 리플 1
uniform float uRippleFar;       // 멀수록 리플 0
uniform float uRippleStrength;  // 전체 강도

// 라이트(명시 유니폼)
uniform vec3  uLightColor;
uniform float uLightIntensity;

void main() {
  // 텍스처 주파수 살짝 낮춤
  vec2 uv = vUv * 8.0 + vec2(uTime * -0.05, 0.0);

  // UV 왜곡 (살짝 완화)
  uv.y += 0.008 * (sin(uv.x * 3.5 + uTime * 0.35) + sin(uv.x * 4.8 + uTime * 1.05) + sin(uv.x * 7.3 + uTime * 0.45)) / 3.0;
  uv.x += 0.10  * (sin(uv.y * 4.0 + uTime * 0.5 ) + sin(uv.y * 6.8 + uTime * 0.75) + sin(uv.y * 11.3 + uTime * 0.2 )) / 3.0;
  uv.y += 0.10  * (sin(uv.x * 4.2 + uTime * 0.64) + sin(uv.x * 6.3 + uTime * 1.65) + sin(uv.x * 8.2  + uTime * 0.45)) / 3.0;

  // 화면 미분 기반 동적 LOD bias (fwidth는 WebGL2 코어)
  vec2 grad = fwidth(uv);
  float dynBias = clamp(log2(max(grad.x, grad.y)), 0.0, 4.0);
  float bias = uLodBias + dynBias;

  // 리플 생성(두 샘플 차분)
  vec4 tex1 = texture2D(uMap, uv, bias);
  vec4 tex2 = texture2D(uMap, uv + vec2(0.2), bias);
  float ripple = tex1.a * 0.9 - tex2.a * 0.02;

  // 거리 기반 페이드 (cameraPosition은 three가 제공)
  float dist = length(cameraPosition - vWorldPos);
  float distFade = smoothstep(uRippleFar, uRippleNear, dist);

  ripple *= distFade * uRippleStrength;

  // 컬러 합성 + 라이트 반영
  vec3 col = uColor + vec3(ripple);
  col = mix(uColor, col, 0.8);
  col *= (uLightColor * uLightIntensity);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class Ocean implements ILoop, IWorldMapObject {
  Type: MapEntryType = MapEntryType.Ocean
  LoopId = 0
  _geometry?: THREE.PlaneGeometry
  _shader?: THREE.ShaderMaterial
  mesh?: THREE.Mesh
  meshs = new THREE.Group()
  startTime = 0

  constructor(
    private eventCtrl: IEventController,
    private light: THREE.DirectionalLight,
    private path = "https://hons.ghostwebservice.com/",
    private renderer?: THREE.WebGLRenderer
  ) {}

  Create(..._param: any) {
    const size = 1200
    this._geometry = new THREE.PlaneGeometry(size, size, size, size);
    this._geometry.rotateX(-Math.PI / 2);

    const texture = new THREE.TextureLoader().load(
      this.path + "assets/texture/water.png",
      (tex) => {
        // ✅ Anti-shimmer 텍스처 설정
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = Math.min(8, this.renderer?.capabilities.getMaxAnisotropy() ?? 4);
        // 알파를 데이터처럼 사용 → 선형
        (tex as any).colorSpace = THREE.NoColorSpace; // r160
        tex.needsUpdate = true;
      }
    );

    const uniforms = {
      uMap: { value: texture },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color("#006ca5") },
      // uColor: { value: new THREE.Color("#0496c7") },

      // Anti-shimmer
      uLodBias: { value: 0.75 },
      uRippleNear: { value: 15.0 },
      uRippleFar:  { value: 120.0 },
      uRippleStrength: { value: 1.0 },

      // Light uniforms (명시)
      uLightColor:     { value: this.light.color.clone() },
      uLightIntensity: { value: this.light.intensity },
    };

    this._shader = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      side: THREE.DoubleSide,
      // WebGL1 대응 필요 시만 켜세요. WebGL2라면 코어 지원이라 없어도 됩니다.
      extensions: { derivatives: true },
      // glslVersion: THREE.GLSL3, // <- 만약 켜면, varyings/texture() 문법으로 전체 변환 필요
    });

    this.mesh = new THREE.Mesh(this._geometry, this._shader);
    this.mesh.position.y = -2;
    this.mesh.scale.multiplyScalar(0.1);
    this.meshs.add(this.mesh);
    this.meshs.userData.mapObj = this;

    this.startTime = Date.now();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    return this.meshs;
  }

  Delete(..._param: any) {
    return this.meshs;
  }

  Load(data: OceanData): void {
    const mesh = this.Create();
    const p = data.position;
    const r = data.rotation;
    const s = data.scale;
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.set(r.x, r.y, r.z);
    mesh.scale.set(s, s, s);
  }

  Save() {
    const data: OceanData = {
      position: { ...this.meshs.position },
      rotation: { ...this.meshs.rotation },
      scale: this.meshs.scale.x,
    };
    return data;
  }

  update() {
    const elapsedTime = (Date.now() - this.startTime) * 0.001;
    this._shader!.uniforms.uTime.value = elapsedTime;

    // 라이트 값 실시간 반영
    (this._shader!.uniforms.uLightColor.value as THREE.Color).copy(this.light.color);
    this._shader!.uniforms.uLightIntensity.value = this.light.intensity;

    this._shader!.uniformsNeedUpdate = true;
  }
}
