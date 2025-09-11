// CurvedShoreOcean.ts — Uniform global scale & position control
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import * as THREE from "three";

/* ------------------------------ Public Options ------------------------------ */
export type OceanOptions = {
  /** 바다 전역 스케일(길이·높이·파장·폼 범위·슬로프 폭/깊이 등) — 기본=1 */
  scale?: number;

  /** 바다 기준점(해안 원점) 절대 위치 지정: 미지정 시 해변 메쉬에서 자동 추정 */
  position?: THREE.Vector3 | { x: number; y?: number; z: number };

  /** 기준점에 더해서 이동(옵션) */
  offset?: THREE.Vector3 | { x: number; y?: number; z: number };

  /** 커버리지(패널 사이즈)를 직접 지정하고 싶을 때 */
  width?: number;
  depth?: number;
  marginAlong?: number;
  marginOff?: number;

  /** 색/광택 */
  deepColor?: number; shallowColor?: number; foamColor?: number;
  specularBoost?: number;

  /** 해안선 곡률 파라미터 */
  shoreBase?: number;
  coastA?: [number, number, number]; // 진폭 A1..A3 (길이 단위 → scale 적용)
  coastL?: [number, number, number]; // 파장 L1..L3 (길이 단위 → scale 적용)
  coastP?: [number, number, number]; // 위상
  endless?: boolean;
  coastSlideSpeed?: number;          // 해안선 x 슬라이드 속도(길이/초 → scale 적용)

  /** 해변 프로파일 */
  slopeWidth?: number; slopeDepth?: number;
  inlandWidth?: number; inlandHeight?: number;

  /** 해상 상태 초기값(0~1) */
  seaState?: number;
};

const v2 = (x=0,y=0)=>new THREE.Vector2(x,y);
const v3 = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function avg(a:number[]){ return a.length? a.reduce((p,c)=>p+c,0)/a.length : 0; }
function dot2(a:THREE.Vector2,b:THREE.Vector2){return a.x*b.x+a.y*b.y}

/* --------------------------------- Class ---------------------------------- */
export class Beach implements IWorldMapObject {
  Type: MapEntryType = MapEntryType.Beach;
  Mesh?: THREE.Object3D;

  private _group = new THREE.Group();
  private _water?: THREE.Mesh;
  private _horizon?: THREE.Mesh;

  // 최근 생성 컨텍스트(Rescale 재생성용)
  private _lastBeach?: THREE.Mesh;
  private _lastOpts?: OceanOptions;

  // 해안 좌표계(월드 XZ 기준)
  private _coastOrigin = v2(0,0);
  private _coastRotC = 1.0;  // cosθ (해안선 진행 x축)
  private _coastRotS = 0.0;  // sinθ

  // 전역 스케일(길이·높이·파장 등) — 재생성시 반영
  private _scale = 1.0;

  // 애니메이션
  private _endless = true;
  private _slideSpeed = 2.0; // (길이/초) → scale 반영
  private _lastTime = 0;

  // 공유 유니폼
  private _uni = {
    uTime:            { value: 0.0 },
    uDir:             { value: v2(0,-1) },

    // Waves
    uAmpNear:         { value: 1.15 },
    uAmpFar:          { value: 0.36 },
    uAmpRange:        { value: 170.0 },
    uChop:            { value: 1.05 },
    uWaveABC:         { value: v3(0.55,0.36,0.20) },  // 파고(높이)
    uWaveLen:         { value: v3(18.0,9.5,5.8) },    // 파장(길이)
    uWaveSpd:         { value: v3(0.85,1.0,1.15) },   // 무차원 속도 계수
    uBackwashAmp:     { value: 0.24 },
    uEddyStrength:    { value: 0.18 },
    uEddyScale:       { value: 0.12 },

    // Curved shoreline
    uShoreBase:       { value: 0.0 },
    uCoastAmp:        { value: v3(6.0,3.0,1.8) },       // 진폭(길이)
    uCoastFreq:       { value: v3(2*Math.PI/140, 2*Math.PI/70, 2*Math.PI/35) }, // 1/길이
    uCoastPhase:      { value: v3(0.0,1.1,2.3) },
    uCoastOffset:     { value: 0.0 },

    // Beach profile
    uSlopeWidth:      { value: 36.0 },
    uSlopeDepth:      { value: 8.5 },
    uInlandWidth:     { value: 52.0 },
    uInlandHeight:    { value: 8.5 },

    // Colors/foam
    uDeepCol:         { value: new THREE.Color(0x084060) },
    uShallowCol:      { value: new THREE.Color(0x2bb9cf) },
    uFoamCol:         { value: new THREE.Color(0xf6f7f8) },
    uSunDir:          { value: v3(-0.6,1.2,-0.4).normalize() },
    uFoamShoreDepth:  { value: 3.0 },

    // Foam bands
    uBandFreq:        { value: 0.45*Math.PI }, // 1/길이
    uBandWidth:       { value: 0.92 },
    uBandSpeed:       { value: 1.3 },          // (위상속도)
    uBand2Phase:      { value: 1.2 },
    uBand3Phase:      { value: 2.65 },
    uBands:           { value: 3 },

    uWetWidth:        { value: 0.8 },          // 길이
    uNearWidth:       { value: 28.0 },         // 길이
    uStyleMode:       { value: 0 },
    uSpecularBoost:   { value: 1.0 },

    // Edge attenuation
    uHalfW:           { value: 150.0 },
    uHalfD:           { value: 150.0 },
    uEdgeFade:        { value: 22.0 },

    // Sea state foam modifiers
    uBandStrength:    { value: 1.0 },
    uCrestGain:       { value: 1.0 },
    uFoamNoiseAmt:    { value: 0.45 },

    // World→Coast mapping
    uCoastOrigin:     { value: v2(0,0) },
    uCoastRotC:       { value: 1.0 },
    uCoastRotS:       { value: 0.0 },
  };

  /* -------------------------------- Shaders -------------------------------- */
  private _vert = /* glsl */`
    uniform float uTime;
    uniform vec2  uDir;
    uniform float uAmpNear, uAmpFar, uAmpRange, uChop;
    uniform vec3  uWaveABC, uWaveLen, uWaveSpd;
    uniform float uBackwashAmp, uEddyStrength, uEddyScale;

    uniform float uShoreBase;
    uniform vec3  uCoastAmp, uCoastFreq, uCoastPhase;
    uniform float uCoastOffset;

    uniform float uSlopeWidth, uSlopeDepth, uInlandWidth, uInlandHeight;

    uniform float uHalfW, uHalfD, uEdgeFade;

    uniform vec2  uCoastOrigin;
    uniform float uCoastRotC, uCoastRotS;

    varying vec3  vWorldPos;
    varying vec3  vNormal;
    varying float vShoreDepth;
    varying float vSeaDist;
    varying vec2  vCoastXZ;

    float smooth01(float t){ return t*t*(3.0-2.0*t); }

    float shorelineZ(float x){
      return uShoreBase
        + uCoastAmp.x * sin(uCoastFreq.x*(x+uCoastOffset) + uCoastPhase.x)
        + uCoastAmp.y * sin(uCoastFreq.y*(x+uCoastOffset) + uCoastPhase.y)
        + uCoastAmp.z * sin(uCoastFreq.z*(x+uCoastOffset) + uCoastPhase.z);
    }

    vec2 toCoast(vec2 wxz){
      vec2 r = wxz - uCoastOrigin;
      return vec2(uCoastRotC*r.x + uCoastRotS*r.y, -uCoastRotS*r.x + uCoastRotC*r.y);
    }

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    vec2 gradNoise(vec2 p){
      float e=0.5;
      float n1=noise(p+vec2(e,0.0)), n2=noise(p-vec2(e,0.0));
      float n3=noise(p+vec2(0.0,e)), n4=noise(p-vec2(0.0,e));
      return vec2(n1-n2, n3-n4)/(2.0*e);
    }
    vec3 gerstnerAt(vec2 xz, vec2 dir, float amp, float lambda, float speed, float time, float chop){
      float k = 6.28318530718 / lambda;
      float w = sqrt(9.8 * k);
      float phase = k * dot(dir, xz) - (w*speed) * time;
      float sinp = sin(phase), cosp = cos(phase);
      float Qa = chop * amp;
      return vec3(Qa*dir.x*cosp, amp*sinp, Qa*dir.y*cosp);
    }
    float edgeAtten(vec3 p0){
      float fx = clamp((uHalfW - abs(p0.x)) / uEdgeFade, 0.0, 1.0);
      float fz = clamp((uHalfD - p0.z) / uEdgeFade, 0.0, 1.0);
      return min(fx, fz);
    }

    vec3 surfacePos(vec3 p0, vec2 baseDir, vec3 ampABC, vec3 lenABC, vec3 spdABC, float time, float chop, float ampScale, float dSea){
      float nearFactor = 1.0 - clamp(dSea / max(1e-3, uAmpRange), 0.0, 1.0);
      vec2 g = gradNoise((p0.xz + vec2(0.0, time*0.15)) * uEddyScale);
      vec2 curl = vec2(g.y, -g.x);
      vec2 eddy = normalize(curl + 1e-6) * uEddyStrength * nearFactor;
      vec2 dir = normalize(baseDir + eddy);

      float eA = edgeAtten(p0);
      float chopLocal = mix(0.0, chop, eA);
      float ampLocal  = ampScale * eA;

      vec3 disp = vec3(0.0);
      disp += gerstnerAt(p0.xz, dir, ampLocal*ampABC.x, lenABC.x, spdABC.x, time, chopLocal);
      disp += gerstnerAt(p0.xz, dir, ampLocal*ampABC.y, lenABC.y, spdABC.y, time, chopLocal*0.9);
      disp += gerstnerAt(p0.xz, dir, ampLocal*ampABC.z, lenABC.z, spdABC.z, time, chopLocal*1.1);

      vec2 rdir = -dir;
      float backAmp = ampLocal * uBackwashAmp * nearFactor;
      disp += gerstnerAt(p0.xz, rdir, backAmp*0.6, lenABC.x*0.7, spdABC.x*1.25, time, chopLocal*0.7);
      disp += gerstnerAt(p0.xz, rdir, backAmp*0.4, lenABC.y*0.6, spdABC.y*1.35, time, chopLocal*0.8);

      return p0 + disp;
    }

    void main(){
      vec3 p = position;
      vec4 ws = modelMatrix * vec4(p, 1.0);
      vec3 wp = ws.xyz;

      vec2 coast = toCoast(wp.xz);
      float zShore = shorelineZ(coast.x);
      float dSea = max(coast.y - zShore, 0.0);
      vSeaDist = dSea;
      vCoastXZ = coast;

      float nearFactor = 1.0 - clamp(dSea / max(1e-3, uAmpRange), 0.0, 1.0);
      float ampScale = mix(uAmpFar, uAmpNear, nearFactor);

      vec3 surf = surfacePos(p, uDir, uWaveABC, uWaveLen, uWaveSpd, uTime, uChop, ampScale, dSea);
      float eps = 0.35;
      vec3 sx = surfacePos(p + vec3(eps,0.0,0.0), uDir, uWaveABC, uWaveLen, uWaveSpd, uTime, uChop, ampScale, dSea);
      vec3 sz = surfacePos(p + vec3(0.0,0.0,eps), uDir, uWaveABC, uWaveLen, uWaveSpd, uTime, uChop, ampScale, dSea);
      vec3 n = normalize(cross(sz - surf, sx - surf));

      float d = coast.y - shorelineZ(coast.x);
      float bH = (d >= 0.0)
        ? -uSlopeDepth * smooth01(clamp(d/max(1e-3,uSlopeWidth),0.0,1.0))
        :  uInlandHeight * smooth01(clamp(-d/max(1e-3,uInlandWidth),0.0,1.0));

      vec4 ws2 = modelMatrix * vec4(surf, 1.0);
      vWorldPos = ws2.xyz;
      vNormal   = normalize((modelViewMatrix * vec4(n, 0.0)).xyz);
      vShoreDepth = ws2.y - bH;

      gl_Position = projectionMatrix * viewMatrix * ws2;
    }
  `;

  private _frag = /* glsl */`
    precision highp float;
    uniform vec3  uDeepCol, uShallowCol, uFoamCol;
    uniform vec3  uSunDir;
    uniform float uFoamShoreDepth, uTime;
    uniform float uBandFreq, uBandWidth, uBandSpeed, uBand2Phase, uBand3Phase;
    uniform int   uBands;
    uniform float uWetWidth;
    uniform float uNearWidth;
    uniform int   uStyleMode;
    uniform float uSpecularBoost;

    uniform float uEddyScale;
    uniform float uEddyStrength;

    uniform float uShoreBase;
    uniform vec3  uCoastAmp, uCoastFreq, uCoastPhase;
    uniform float uCoastOffset;

    varying vec3  vWorldPos;
    varying vec3  vNormal;
    varying float vShoreDepth;
    varying float vSeaDist;
    varying vec2  vCoastXZ;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    vec3 toonize(vec3 c){ return floor(c*4.0)/4.0; }

    float shorelineZ(float x){
      return uShoreBase
        + uCoastAmp.x * sin(uCoastFreq.x*(x+uCoastOffset) + uCoastPhase.x)
        + uCoastAmp.y * sin(uCoastFreq.y*(x+uCoastOffset) + uCoastPhase.y)
        + uCoastAmp.z * sin(uCoastFreq.z*(x+uCoastOffset) + uCoastPhase.z);
    }

    float foamBandsCurved(float s, vec2 coastXZ){
      float phase1 = s * uBandFreq - uTime * uBandSpeed;
      float phase2 = phase1 + uBand2Phase;
      float phase3 = phase1 + uBand3Phase;

      float warp = (noise(coastXZ * (uEddyScale*1.2) + vec2(0.0, uTime*0.2)) - 0.5) * 1.0;
      phase1 += warp; phase2 += warp*0.9; phase3 += warp*1.1;

      float b1 = smoothstep(1.0 - uBandWidth, 1.0, abs(sin(phase1)));
      float b2 = smoothstep(1.0 - uBandWidth, 1.0, abs(sin(phase2)));
      float b3 = smoothstep(1.0 - uBandWidth, 1.0, abs(sin(phase3)));
      return (b1 + b2*0.9 + (uBands==3 ? b3*0.85 : 0.0));
    }

    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vec3(0.0,0.0,1.0));

      float mask = smoothstep(-uWetWidth, 0.0, vShoreDepth);
      if(mask < 0.08) discard;

      float shallow = 1.0 - clamp(vShoreDepth / uFoamShoreDepth, 0.0, 1.0);
      vec3 waterCol = mix(uDeepCol, uShallowCol, pow(shallow, 0.65));

      float fres = pow(1.0 - max(dot(N,V),0.0), 5.0);
      vec3 L = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N,H),0.0), 120.0) * (0.22 * uSpecularBoost);
      waterCol += fres * (0.25 * uSpecularBoost);

      float foamShore = smoothstep(1.0, 0.0, clamp(vShoreDepth / uFoamShoreDepth, 0.0, 1.0));
      float crest = smoothstep(0.55, 0.95, 1.0 - N.y);

      float bands = foamBandsCurved(vSeaDist, vCoastXZ);
      float near  = 1.0 - smoothstep(0.0, uNearWidth, vSeaDist);
      bands *= near;

      float fNoise = noise(vWorldPos.xz*0.18 + uTime*0.05);
      float foam = clamp(foamShore*0.85 + crest*0.75 + bands*0.8, 0.0, 1.0);
      foam = smoothstep(0.4, 1.0, foam + (fNoise-0.5)*0.45);

      vec3 col = mix(waterCol, uFoamCol, foam);
      col += spec;
      if(uStyleMode==1) col = toonize(col);

      gl_FragColor = vec4(col, mask);
    }
  `;

  /* --------------------------------- API ---------------------------------- */

  /** 외부 시간 업데이트 모드로 쓰고 싶다면 on */
  public UseExternalUpdate(on: boolean){ this._externalUpdate = on; }
  private _externalUpdate = false;
  public Update(dt: number){
    this._uni.uTime.value += dt;
    if(this._endless) this._uni.uCoastOffset.value += this._slideSpeed * dt;
  }

  /** 절대 위치로 이동(해안 원점과 그룹을 함께 이동) */
  public SetPosition(x: number, y: number, z: number){
    this._coastOrigin.set(x, z);
    this._uni.uCoastOrigin.value.set(x, z);
    this._group.position.set(x, y, z);
  }

  /** 전역 스케일 변경(지오메트리 재생성) */
  public async Rescale(scale: number){
    if(!this._lastBeach) return;
    const opts = { ...(this._lastOpts ?? {}), scale };
    const parent = this._group.parent as THREE.Object3D | null;
    const index = parent ? parent.children.indexOf(this._group) : -1;
    this.Delete();
    await this.Create(this._lastBeach, opts);
    if(parent && index>=0) parent.add(this._group);
  }

  public Show(){ this._group.visible = true; }
  public Hide(){ this._group.visible = false; }

  public Delete(){
    if(this._water){
      (this._water.geometry as THREE.BufferGeometry).dispose();
      (this._water.material as THREE.Material).dispose();
      this._group.remove(this._water);
      this._water = undefined;
    }
    if(this._horizon){
      (this._horizon.geometry as THREE.BufferGeometry).dispose();
      (this._horizon.material as THREE.Material).dispose();
      this._group.remove(this._horizon);
      this._horizon = undefined;
    }
    if(this._group.parent) this._group.parent.remove(this._group);
    this.Mesh = undefined;
  }

  /* -------------------------------- Create -------------------------------- */
  async Create(beachMesh: THREE.Mesh, opts: OceanOptions = {}) {
    this._lastBeach = beachMesh;
    this._lastOpts  = { ...opts };

    this.Mesh = this._group;

    // 0) 옵션/스케일
    this._scale = opts.scale ?? 0.5;
    this._endless = opts.endless ?? true;
    this._slideSpeed = (opts.coastSlideSpeed ?? 2.0) * this._scale; // 스케일에 맞춰 이동 속도도 비례

    // 1) 해안 프레임(방향/원점) 자동 탐지
    this._detectCoastFrame(beachMesh);

    // 1-1) 절대 position 또는 offset 적용
    if(opts.position){
      const p = (opts.position as any);
      this._coastOrigin.set(p.x, p.z);
      this._group.position.set(p.x, p.y ?? 0, p.z);
    } else {
      const baseY = 0;
      this._group.position.set(this._coastOrigin.x, baseY, this._coastOrigin.y);
    }
    if(opts.offset){
      const o = (opts.offset as any);
      this._coastOrigin.add(new THREE.Vector2(o.x, o.z));
      this._group.position.add(new THREE.Vector3(o.x, o.y ?? 0, o.z));
    }
    this._uni.uCoastOrigin.value.copy(this._coastOrigin);
    this._uni.uCoastRotC.value = this._coastRotC;
    this._uni.uCoastRotS.value = this._coastRotS;

    // 2) 커버리지 계산(해변 bbox 기반) → 스케일 반영
    const { width, depth } = this._computeCoverage(beachMesh, opts);
    this._uni.uHalfW.value = width/2;
    this._uni.uHalfD.value = depth/2;
    this._uni.uEdgeFade.value = 22.0 * this._scale;

    // 3) 유니폼/색/프로파일/해안 곡률 반영(+ 스케일)
    this._applyOptionsWithScale(opts);

    // 4) 지오메트리/메시
    const seg = Math.min(520, Math.max(320, Math.floor(Math.max(width, depth)*1.1)));
    const geo = new THREE.PlaneGeometry(width, depth, seg, seg);
    geo.rotateX(-Math.PI/2);

    const mat = new THREE.ShaderMaterial({
      uniforms: this._uni,
      vertexShader: this._vert,
      fragmentShader: this._frag,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    this._water = new THREE.Mesh(geo, mat);
    this._water.frustumCulled = true;
    this._group.add(this._water);

    // 수평선
    const hz = new THREE.Mesh(
      new THREE.PlaneGeometry(width*6, depth*3, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x102a3c, transparent:true, opacity:0.12, depthWrite:false })
    );
    hz.rotation.x = -Math.PI/2;
    hz.position.set(0, -60*this._scale, depth*2.5);
    this._group.add(hz);
    this._horizon = hz;

    // 5) 시간 갱신
    this._lastTime = performance.now();
    this._uni.uTime.value = 0;
    this._water.onBeforeRender = () => {
      if(this._externalUpdate) return;
      const now = performance.now();
      const dt = (now - this._lastTime) / 1000;
      this._lastTime = now;
      this._uni.uTime.value += dt;
      if(this._endless) this._uni.uCoastOffset.value += this._slideSpeed * dt;
    };

    const pos = this._group.position.clone()
    this.SetPosition(pos.x, pos.y - 1.5, pos.z + 15)

    return this.Mesh;
  }

  /* ------------------------------ Internals ------------------------------ */
  private _applyOptionsWithScale(opts: OceanOptions){
    const S = this._scale;

    // 색/광택
    if(opts.deepColor)    this._uni.uDeepCol.value.set(opts.deepColor);
    if(opts.shallowColor) this._uni.uShallowCol.value.set(opts.shallowColor);
    if(opts.foamColor)    this._uni.uFoamCol.value.set(opts.foamColor);
    if(opts.specularBoost!==undefined) this._uni.uSpecularBoost.value = opts.specularBoost;

    // 해상상태(파고/파장 등 기본값) 먼저 적용
    this.applySeaState(opts.seaState ?? 0.6);

    // 파장/파고·범위 등 길이 항목 스케일링
    this._uni.uAmpRange.value      *= S;
    this._uni.uWaveLen.value.multiplyScalar(S);
    this._uni.uWaveABC.value.multiplyScalar(S);     // 파고도 비례 스케일

    // Beach profile (길이 항목)
    this._uni.uSlopeWidth.value    = (opts.slopeWidth ?? 36.0) * S;
    this._uni.uSlopeDepth.value    = (opts.slopeDepth ?? 8.5)  * S;
    this._uni.uInlandWidth.value   = (opts.inlandWidth ?? 52.0)* S;
    this._uni.uInlandHeight.value  = (opts.inlandHeight ?? 8.5) * S;

    // Foam ranges (길이 항목)
    this._uni.uFoamShoreDepth.value= 3.0 * S;
    this._uni.uNearWidth.value     = 28.0 * S;
    this._uni.uWetWidth.value      = 0.8 * S;

    // 곡선 해안(진폭=길이, 주파수=1/길이)
    const A = opts.coastA ?? [6.0,3.0,1.8];
    const L = opts.coastL ?? [140.0,70.0,35.0];
    const P = opts.coastP ?? [0.0,1.1,2.3];
    this._uni.uShoreBase.value = opts.shoreBase ?? 0.0;
    this._uni.uCoastAmp.value.set(A[0]*S, A[1]*S, A[2]*S);
    this._uni.uCoastFreq.value.set(2*Math.PI/(L[0]*S), 2*Math.PI/(L[1]*S), 2*Math.PI/(L[2]*S));
    this._uni.uCoastPhase.value.set(P[0], P[1], P[2]);

    // Foam band 주파수(1/길이)도 스케일 보정
    this._uni.uBandFreq.value = (0.45*Math.PI) / S;

    // Endless slide 속도(길이/초)
    this._slideSpeed = (opts.coastSlideSpeed ?? 2.0) * S;
  }

  private _computeCoverage(beachMesh: THREE.Mesh, opts: OceanOptions){
    // 해변 bbox를 해안 좌표축으로 투영해서 최소 커버리지 산출
    const g = beachMesh.geometry as THREE.BufferGeometry;
    g.computeBoundingBox();
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const matW = beachMesh.matrixWorld.clone();

    const along = new THREE.Vector2(this._coastRotC, this._coastRotS);      // 해안선 방향
    const off   = new THREE.Vector2(-this._coastRotS, this._coastRotC);     // 바다쪽

    let minS=Infinity, maxS=-Infinity, minT=Infinity, maxT=-Infinity;
    const v = new THREE.Vector3();
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos, i).applyMatrix4(matW);
      const r = new THREE.Vector2(v.x, v.z).sub(this._coastOrigin);
      const s = dot2(r, along);
      const t = dot2(r, off);
      if(s<minS)minS=s; if(s>maxS)maxS=s;
      if(t<minT)minT=t; if(t>maxT)maxT=t;
    }
    const S = this._scale;
    const marginAlong = (opts.marginAlong ?? 100) * S;
    const marginOff   = (opts.marginOff   ?? 220) * S;

    const width  = (opts.width ?? ((maxS - minS) + marginAlong*2)) * 1.0;
    const depth  = (opts.depth ?? ((maxT - minT) + marginOff*2))   * 1.0;
    return { width, depth };
  }

  private _detectCoastFrame(beach: THREE.Mesh){
    const g = beach.geometry as THREE.BufferGeometry;
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const matW = beach.matrixWorld.clone();

    let minX=+Infinity,maxX=-Infinity,minZ=+Infinity,maxZ=-Infinity;
    const v = new THREE.Vector3();
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos, i).applyMatrix4(matW);
      if(v.x < minX) minX = v.x; if(v.x > maxX) maxX = v.x;
      if(v.z < minZ) minZ = v.z; if(v.z > maxZ) maxZ = v.z;
    }
    const eps = 1e-3 * Math.max(1, bb.getSize(new THREE.Vector3()).length());
    const minXy:number[]=[], maxXy:number[]=[], minZy:number[]=[], maxZy:number[]=[];
    const minXpts:THREE.Vector2[]=[], maxXpts:THREE.Vector2[]=[], minZpts:THREE.Vector2[]=[], maxZpts:THREE.Vector2[]=[];

    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos, i).applyMatrix4(matW);
      if(Math.abs(v.x - minX) < eps){ minXy.push(v.y); minXpts.push(new THREE.Vector2(v.x, v.z)); }
      if(Math.abs(v.x - maxX) < eps){ maxXy.push(v.y); maxXpts.push(new THREE.Vector2(v.x, v.z)); }
      if(Math.abs(v.z - minZ) < eps){ minZy.push(v.y); minZpts.push(new THREE.Vector2(v.x, v.z)); }
      if(Math.abs(v.z - maxZ) < eps){ maxZy.push(v.y); maxZpts.push(new THREE.Vector2(v.x, v.z)); }
    }

    const dxSlope = Math.abs(avg(minXy) - avg(maxXy));
    const dzSlope = Math.abs(avg(minZy) - avg(maxZy));

    let downhill = new THREE.Vector2(0, -1);
    let anchor = new THREE.Vector2( (minX+maxX)/2, (minZ+maxZ)/2 );

    if(dxSlope >= dzSlope){
      const lowIsMin = avg(minXy) < avg(maxXy);
      downhill.set(lowIsMin ? -1 : 1, 0);
      const pts = lowIsMin ? minXpts : maxXpts;
      anchor = pts.length ? pts.reduce((a,p)=>a.add(p), new THREE.Vector2()).multiplyScalar(1/pts.length) : anchor;
    }else{
      const lowIsMin = avg(minZy) < avg(maxZy);
      downhill.set(0, lowIsMin ? -1 : 1);
      const pts = lowIsMin ? minZpts : maxZpts;
      anchor = pts.length ? pts.reduce((a,p)=>a.add(p), new THREE.Vector2()).multiplyScalar(1/pts.length) : anchor;
    }

    downhill.normalize();
    const alongShore = new THREE.Vector2(downhill.y, -downhill.x).normalize(); // 90°
    this._coastOrigin.copy(anchor);
    this._coastRotC = alongShore.x;
    this._coastRotS = alongShore.y;

    // 유니폼에도 즉시 반영(초기값)
    this._uni.uCoastOrigin.value.copy(this._coastOrigin);
    this._uni.uCoastRotC.value = this._coastRotC;
    this._uni.uCoastRotS.value = this._coastRotS;
  }

  /* ---------------------------- Sea State Lerp ---------------------------- */
  private _seaCalm = {
    ampNear: 0.60, ampFar: 0.22, ampRange: 160, chop: 0.35,
    waveA: 0.38, waveB: 0.22, waveC: 0.10,
    lenA: 28.0, lenB: 14.0, lenC: 8.0,
    spdA: 0.65, spdB: 0.80, spdC: 0.95,
    eddyStr: 0.06, backwash: 0.10,
    bandStrength: 0.45, crestGain: 0.35, foamNoise: 0.25
  };
  private _seaRough = {
    ampNear: 1.20, ampFar: 0.42, ampRange: 170, chop: 1.05,
    waveA: 0.55, waveB: 0.36, waveC: 0.20,
    lenA: 18.0, lenB: 9.5, lenC: 5.8,
    spdA: 0.85, spdB: 1.00, spdC: 1.15,
    eddyStr: 0.18, backwash: 0.24,
    bandStrength: 1.00, crestGain: 1.00, foamNoise: 0.45
  };

  applySeaState(t: number){
    const clamp01 = (x:number)=>Math.min(1,Math.max(0,x));
    t = clamp01(t);

    const L = (a:any,b:any,t:number)=>({
      ampNear: a.ampNear+(b.ampNear-a.ampNear)*t,
      ampFar:  a.ampFar +(b.ampFar -a.ampFar )*t,
      ampRange:a.ampRange+(b.ampRange-a.ampRange)*t,
      chop:    a.chop   +(b.chop   -a.chop   )*t,
      waveA:   a.waveA  +(b.waveA  -a.waveA  )*t,
      waveB:   a.waveB  +(b.waveB  -a.waveB  )*t,
      waveC:   a.waveC  +(b.waveC  -a.waveC  )*t,
      lenA:    a.lenA   +(b.lenA   -a.lenA   )*t,
      lenB:    a.lenB   +(b.lenB   -a.lenB   )*t,
      lenC:    a.lenC   +(b.lenC   -a.lenC   )*t,
      spdA:    a.spdA   +(b.spdA   -a.spdA   )*t,
      spdB:    a.spdB   +(b.spdB   -a.spdB   )*t,
      spdC:    a.spdC   +(b.spdC   -a.spdC   )*t,
      eddyStr: a.eddyStr+(b.eddyStr-a.eddyStr)*t,
      backwash:a.backwash+(b.backwash-a.backwash)*t,
      bandStrength:a.bandStrength+(b.bandStrength-a.bandStrength)*t,
      crestGain:   a.crestGain   +(b.crestGain   -a.crestGain   )*t,
      foamNoise:   a.foamNoise   +(b.foamNoise   -a.foamNoise   )*t,
    });

    const s = L(this._seaCalm, this._seaRough, t);

    // 파장/파고는 scale 적용 시점에 다시 보정되므로 여기서는 "기본값"만 세팅
    this._uni.uAmpNear.value=s.ampNear;
    this._uni.uAmpFar.value =s.ampFar;
    this._uni.uAmpRange.value=s.ampRange;
    this._uni.uChop.value=s.chop;
    this._uni.uWaveABC.value.set(s.waveA,s.waveB,s.waveC);
    this._uni.uWaveLen.value.set(s.lenA,s.lenB,s.lenC);
    this._uni.uWaveSpd.value.set(s.spdA,s.spdB,s.spdC);
    this._uni.uEddyStrength.value=s.eddyStr;
    this._uni.uBackwashAmp.value=s.backwash;
    this._uni.uBandStrength.value=s.bandStrength;
    this._uni.uCrestGain.value=s.crestGain;
    this._uni.uFoamNoiseAmt.value=s.foamNoise;
  }
}
