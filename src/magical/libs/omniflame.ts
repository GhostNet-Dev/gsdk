/* OmniFlames.ts */
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface OmniFlamesViewport {
  width: number;
  height: number;
  /** camera.fov in degrees */
  fovDeg: number;
}

export interface ShellOptions {
  noiseScale?: number;
  noiseSpeed?: number;
  curlScale?: number;
  mixCurl?: number;

  shellOffset?: number;
  shellAmp?: number;
  shellStretch?: number;
  farMul?: number;
  coverage?: number;
  lift?: number;
  wind?: THREE.Vector3;

  fadeFalloff?: number;
  alphaMul?: number;
  fresnelPow?: number;
  glowMul?: number;

  colorHot?: THREE.ColorRepresentation;
  colorMid?: THREE.ColorRepresentation;
  colorCool?: THREE.ColorRepresentation;
  edgeColor?: THREE.ColorRepresentation;
}

export interface StreakOptions {
  /** 생성할 스트릭 개수(인스턴스 개수) */
  count?: number;
  /** 픽셀 기준 폭/길이 (fov, z, viewport에 따라 자동 변환됨) */
  widthPx?: number;
  lengthPx?: number;
  ashStart?: number;
  ashColor?: THREE.ColorRepresentation;
  colorHot?: THREE.ColorRepresentation;
  colorMid?: THREE.ColorRepresentation;
  colorCool?: THREE.ColorRepresentation;

  /** 물리/장 필드 파라미터 */
  outBias?: number;   // 노멀 방향 가중치
  align?: number;     // curl 필드 정렬 강도
  swirl?: number;     // 회전 성분
  jitterAmp?: number; // 난수 진동
  buoyancy?: number;  // 상승
  fieldScale?: number;
}

export interface OmniFlamesOptions {
  viewport?: OmniFlamesViewport;          // 초기 뷰포트 설정
  streakCount?: number;                   // Shorthand for StreakOptions.count
  shell?: ShellOptions;
  streak?: StreakOptions;
}

/* -------------------------------------------------------------------------- */
/*                             GLSL Shared (Noise)                            */
/* -------------------------------------------------------------------------- */

const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx;
  vec3 x2=x0-i2+2.0*C.xxx;
  vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod289(i);
  vec4 p=permute( permute( permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0) );
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z), y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy, y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0, s1=floor(b1)*2.0+1.0, sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy, a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy, h.x);
  vec3 p1=vec3(a0.zw, h.y);
  vec3 p2=vec3(a1.xy, h.z);
  vec3 p3=vec3(a1.zw, h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float f=0.0,a=0.5; for(int i=0;i<5;i++){ f+=a*snoise(p); p*=2.02; a*=0.5; } return f; }`;

/* -------------------------------------------------------------------------- */
/*                                Shell Shader                                */
/* -------------------------------------------------------------------------- */

const SHELL_VERT = /* glsl */`
precision highp float;
uniform float uTime, uNoiseScale, uNoiseSpeed;
uniform float uShellOffset, uShellAmp, uShellStretch, uFarMul;
uniform float uCoverage, uLift;
uniform float uCurlScale, uMixCurl;
uniform vec3  uWind;
varying vec3 vWPos;
varying vec3 vWN;
varying float vExtrude;
${NOISE_GLSL}
vec3 curlNoise(vec3 p, float eps){
  vec3 ex=vec3(eps,0,0), ey=vec3(0,eps,0), ez=vec3(0,0,eps);
  vec3 Fpx=vec3(snoise(p+ex),snoise(p+ex+vec3(17.0)),snoise(p+ex-vec3(13.0)));
  vec3 Fnx=vec3(snoise(p-ex),snoise(p-ex+vec3(17.0)),snoise(p-ex-vec3(13.0)));
  vec3 Fpy=vec3(snoise(p+ey),snoise(p+ey+vec3(17.0)),snoise(p+ey-vec3(13.0)));
  vec3 Fny=vec3(snoise(p-ey),snoise(p-ey+vec3(17.0)),snoise(p-ey-vec3(13.0)));
  vec3 Fpz=vec3(snoise(p+ez),snoise(p+ez+vec3(17.0)),snoise(p+ez-vec3(13.0)));
  vec3 Fnz=vec3(snoise(p-ez),snoise(p-ez+vec3(17.0)),snoise(p-ez-vec3(13.0)));
  vec3 dFx=(Fpx-Fnx)/(2.0*eps), dFy=(Fpy-Fny)/(2.0*eps), dFz=(Fpz-Fnz)/(2.0*eps);
  return vec3(dFz.y-dFy.z, dFx.z-dFz.x, dFy.x-dFx.y);
}
void main(){
  vec3 opos = position;
  vec3 on   = normalize(normal);

  float flow = uTime * uNoiseSpeed;
  float n1   = fbm(opos*uNoiseScale + vec3(0.0,flow,0.0));
  float n2   = fbm(opos*(uNoiseScale*2.1) + vec3(3.1,flow*1.6,7.7));
  vec3 curl  = curlNoise(opos*uCurlScale + vec3(0.0,flow,0.0), 0.8);
  vec3 dirOS = normalize(on*(1.0-uMixCurl) + normalize(curl + uWind)*uMixCurl + 1e-5);

  float extrude = (uShellOffset + (uShellAmp*(0.5+0.5*n1) + uShellStretch*max(n2,0.0))) * max(0.0,uCoverage) * uFarMul;
  vec3 displacedOS = opos + dirOS * extrude;
  displacedOS.y += uLift * uCoverage;

  vec4 wpos4 = modelMatrix * vec4(displacedOS,1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedOS,1.0);

  vWPos = wpos4.xyz;
  vWN   = normalize(mat3(modelMatrix) * on);
  vExtrude = extrude;
}`;

const SHELL_FRAG = /* glsl */`
precision highp float;
uniform float uTime, uNoiseScale, uNoiseSpeed, uCoverage, uFadeFalloff, uAlphaMul, uFresnelPow, uGlowMul;
uniform vec3  uColorHot, uColorMid, uColorCool, uEdgeColor;
varying vec3 vWPos; varying vec3 vWN; varying float vExtrude;
${NOISE_GLSL}
vec3 ramp(float t){ t=clamp(t,0.0,1.0); return mix(uColorCool, mix(uColorMid,uColorHot,t*t), t); }
void main(){
  float flow = uTime * uNoiseSpeed;
  float f = fbm(vWPos*uNoiseScale + vec3(0.0,flow,0.0));
  float d = fbm(vWPos*(uNoiseScale*2.0) + vec3(11.0,flow*1.5,5.0));
  float heat = clamp(0.65*f + 0.35*d, 0.0, 1.0);
  vec3 col = ramp(heat);

  vec3 V = normalize(cameraPosition - vWPos);
  float fres = pow(1.0 - max(0.0, dot(normalize(vWN), V)), uFresnelPow);
  col += uEdgeColor * fres * uGlowMul;

  float fade = exp(-max(0.0, vExtrude) / max(0.0001, uFadeFalloff));
  float alpha = uCoverage * fade * uAlphaMul;
  gl_FragColor = vec4(col, alpha);
  if(gl_FragColor.a < 0.01) discard;
}`;

/* -------------------------------------------------------------------------- */
/*                         Small math helpers (CPU)                           */
/* -------------------------------------------------------------------------- */

const GRADS = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
function hash3(x:number,y:number,z:number,seed=0){
  let h = (x*374761393 + y*668265263 + z*2147483647 + seed*374761) >>> 0;
  h = (h ^ (h>>>13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return h>>>0;
}
function grad(ix:number,iy:number,iz:number,x:number,y:number,z:number,seed:number){
  const h = hash3(ix,iy,iz,seed)%12;
  const g = GRADS[h];
  return g[0]*(x-ix)+g[1]*(y-iy)+g[2]*(z-iz);
}
function fade(t:number){ return t*t*t*(t*(t*6-15)+10); }
function perlin3(x:number,y:number,z:number,seed=0){
  const X=Math.floor(x), Y=Math.floor(y), Z=Math.floor(z);
  const xf=x-X, yf=y-Y, zf=z-Z;
  const u=fade(xf), v=fade(yf), w=fade(zf);
  const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
  const n000=grad(X,Y,Z,x,y,z,seed), n100=grad(X+1,Y,Z,x,y,z,seed);
  const n010=grad(X,Y+1,Z,x,y,z,seed), n110=grad(X+1,Y+1,Z,x,y,z,seed);
  const n001=grad(X,Y,Z+1,x,y,z,seed), n101=grad(X+1,Y,Z+1,x,y,z,seed);
  const n011=grad(X,Y+1,Z+1,x,y,z,seed), n111=grad(X+1,Y+1,Z+1,x,y,z,seed);
  const x00=lerp(n000,n100,u), x10=lerp(n010,n110,u);
  const x01=lerp(n001,n101,u), x11=lerp(n011,n111,u);
  const y0=lerp(x00,x10,v), y1=lerp(x01,x11,v);
  return lerp(y0,y1,w);
}
function fieldVec(p:THREE.Vector3, t:number, scale=0.6){
  const o1=17.2, o2=31.7, o3=9.9, ts=0.35;
  const x=p.x*scale, y=p.y*scale, z=p.z*scale;
  return new THREE.Vector3(
    perlin3(x+o1, y+ts*t, z-o3, 11),
    perlin3(x-o2, y+o3, z+ts*t, 23),
    perlin3(x+ts*t, y+o1, z+o2, 37)
  );
}
function curlAt(p:THREE.Vector3, t:number, scale=0.6, eps=0.5){
  const ex=new THREE.Vector3(eps,0,0), ey=new THREE.Vector3(0,eps,0), ez=new THREE.Vector3(0,0,eps);
  const Fpx=fieldVec(p.clone().add(ex), t, scale), Fnx=fieldVec(p.clone().sub(ex), t, scale);
  const Fpy=fieldVec(p.clone().add(ey), t, scale), Fny=fieldVec(p.clone().sub(ey), t, scale);
  const Fpz=fieldVec(p.clone().add(ez), t, scale), Fnz=fieldVec(p.clone().sub(ez), t, scale);
  const dFx=Fpx.sub(Fnx).multiplyScalar(1/(2*eps));
  const dFy=Fpy.sub(Fny).multiplyScalar(1/(2*eps));
  const dFz=Fpz.sub(Fnz).multiplyScalar(1/(2*eps));
  return new THREE.Vector3(dFz.y-dFy.z, dFx.z-dFz.x, dFy.x-dFx.y);
}
function randVec(seed:number, t:number){
  const s = Math.sin(seed*12.9898 + t*78.233)*43758.5453;
  const r = s - Math.floor(s);
  const a = r * Math.PI*2.0;
  return new THREE.Vector3(Math.cos(a), Math.sin(a*0.7), Math.sin(a*1.3)).normalize();
}

/* -------------------------------------------------------------------------- */
/*                              Shell Material                                */
/* -------------------------------------------------------------------------- */

function makeShellMaterial(opts?: ShellOptions){
  const mat = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    transparent:true, depthWrite:false, depthTest:true,
    side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2
  });

  mat.uniforms = {
    uTime:{value:0},
    uNoiseScale:{value:opts?.noiseScale ?? 0.7},
    uNoiseSpeed:{value:opts?.noiseSpeed ?? 0.9},
    uCurlScale:{value:opts?.curlScale ?? 0.5},
    uMixCurl:{value:opts?.mixCurl ?? 0.7},

    uShellOffset:{value:opts?.shellOffset ?? 0.03},
    uShellAmp:{value:opts?.shellAmp ?? 0.20},
    uShellStretch:{value:opts?.shellStretch ?? 0.36},
    uFarMul:{value:opts?.farMul ?? 2.6},
    uCoverage:{value:opts?.coverage ?? 1.0},
    uLift:{value:opts?.lift ?? 0.02},
    uWind:{value:opts?.wind ? opts.wind.clone() : new THREE.Vector3(0,0,0)},

    uFadeFalloff:{value:opts?.fadeFalloff ?? 0.24},
    uAlphaMul:{value:opts?.alphaMul ?? 1.15},
    uFresnelPow:{value:opts?.fresnelPow ?? 2.0},
    uGlowMul:{value:opts?.glowMul ?? 1.2},

    uColorHot:{value:new THREE.Color(opts?.colorHot ?? new THREE.Color(1.0,0.96,0.88))},
    uColorMid:{value:new THREE.Color(opts?.colorMid ?? new THREE.Color(1.0,0.58,0.12))},
    uColorCool:{value:new THREE.Color(opts?.colorCool ?? new THREE.Color(0.55,0.12,0.06))},
    uEdgeColor:{value:new THREE.Color(opts?.edgeColor ?? new THREE.Color(1.0,0.85,0.35))}
  };
  return mat;
}

/* -------------------------------------------------------------------------- */
/*                              Streaks Geometry                              */
/* -------------------------------------------------------------------------- */

class FlameStreaks {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.RawShaderMaterial;
  readonly params: Required<Pick<StreakOptions, "outBias"|"align"|"swirl"|"jitterAmp"|"buoyancy"|"fieldScale">>;

  private aPos: THREE.InstancedBufferAttribute;
  private aVel: THREE.InstancedBufferAttribute;
  private aAge: THREE.InstancedBufferAttribute;
  private aLife: THREE.InstancedBufferAttribute;
  private aSeed: THREE.InstancedBufferAttribute;

  private sampler: MeshSurfaceSampler;
  private count: number;

  private viewport: OmniFlamesViewport = { width: 1, height: 1, fovDeg: 60 };

  constructor(surfaceMesh: THREE.Mesh, opts?: StreakOptions, viewport?: OmniFlamesViewport){
    const count = Math.max(1, Math.floor(opts?.count ?? 1600));
    this.count = count;
    if (viewport) this.viewport = viewport;

    const base = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1,1).toNonIndexed();
    base.setAttribute("position", quad.getAttribute("position"));
    base.setAttribute("uv", quad.getAttribute("uv"));
    base.setIndex(null);

    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(count*3), 3);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(count*3), 3);
    this.aAge = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.aLife= new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.aSeed= new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    base.setAttribute("aPos", this.aPos);
    base.setAttribute("aVel", this.aVel);
    base.setAttribute("aAge", this.aAge);
    base.setAttribute("aLife", this.aLife);
    base.setAttribute("aSeed", this.aSeed);

    this.mat = new THREE.RawShaderMaterial({
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{
        uTime:{value:0},
        uViewport:{value:new THREE.Vector2(this.viewport.width, this.viewport.height)},
        uFov:{value:THREE.MathUtils.degToRad(this.viewport.fovDeg)},
        uWidthPx:{value:opts?.widthPx ?? 12.0},
        uLenPx:{value:opts?.lengthPx ?? 160.0},
        uAshStart:{value:opts?.ashStart ?? 0.65},
        uAshColor:{value:new THREE.Color(opts?.ashColor ?? 0x737373)},
        uColorHot:{value:new THREE.Color(opts?.colorHot ?? 0xfff3e0)},
        uColorMid:{value:new THREE.Color(opts?.colorMid ?? 0xff9e30)},
        uColorCool:{value:new THREE.Color(opts?.colorCool ?? 0x942a15)},
      },
      vertexShader: /* glsl */`
      precision highp float;
      attribute vec3 position; attribute vec2 uv;
      attribute vec3 aPos; attribute vec3 aVel;
      attribute float aAge; attribute float aLife; attribute float aSeed;
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      uniform vec2 uViewport;
      uniform float uFov, uWidthPx, uLenPx;
      uniform float uTime, uAshStart;
      varying vec2 vUv; varying float vT; varying float vAshMix; varying float vSeed;
      vec3 orthonormal(vec3 v){
        vec3 a = abs(v.z) < 0.999 ? vec3(0.0,0.0,1.0) : vec3(0.0,1.0,0.0);
        vec3 s = normalize(cross(a, v));
        return s;
      }
      void main(){
        vec3 Pv = (modelViewMatrix * vec4(aPos,1.0)).xyz;
        vec3 Vv = normalize((modelViewMatrix * vec4(aVel,0.0)).xyz + vec3(1e-6));
        vec3 side = orthonormal(Vv);
        float T = clamp(aAge/aLife, 0.0, 1.0);
        vT = T;
        float ashMix = smoothstep(uAshStart, 1.0, T);
        vAshMix = ashMix;

        float pixelToView = 2.0 * tan(uFov*0.5) * abs(Pv.z) / uViewport.y;
        float width  = uWidthPx * (1.0 - 0.45*T) * (1.0 - 0.6*ashMix);
        float length = uLenPx   * (1.0 - 0.35*T) * (1.0 - 0.7*ashMix) + 22.0*ashMix;
        float halfW = 0.5 * width  * pixelToView;
        float halfL = 0.5 * length * pixelToView;

        vec2 c = position.xy;
        vec3 offsetV = side * (c.x * 2.0 * halfW) + Vv * (c.y * 2.0 * halfL);
        gl_Position = projectionMatrix * vec4(Pv + offsetV, 1.0);

        vUv = uv; vSeed = aSeed;
      }`,
      fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColorHot, uColorMid, uColorCool, uAshColor;
      varying vec2 vUv; varying float vT; varying float vAshMix; varying float vSeed;
      float hash(float n){ return fract(sin(n)*43758.5453); }
      vec3 ramp(float t){ t=clamp(t,0.0,1.0); return mix(uColorCool, mix(uColorMid, uColorHot, t*t), t); }
      void main(){
        vec2 q = vUv*2.0 - 1.0;
        float mask = smoothstep(1.0, 0.0, length(vec2(q.x*1.0, q.y*0.45)));
        float head = smoothstep(-0.4, 1.0, q.y*1.6);
        vec3 fireCol = ramp(0.55 + 0.45*head);
        float g = hash(vSeed*97.13 + q.x*31.7 + q.y*11.3 + vT*13.7);
        vec3 col = mix(fireCol, uAshColor*(0.9+0.2*g), vAshMix);
        float alpha = mask * (1.0 - pow(vT, 1.4)) * (1.0 - 0.25*vAshMix);
        gl_FragColor = vec4(col, alpha);
        if(gl_FragColor.a < 0.02) discard;
      }`
    });

    this.mesh = new THREE.Mesh(base, this.mat);
    this.mesh.renderOrder = 3; // 쉘보다 뒤(더 위)에 그려지도록 약간 높임
    this.params = {
      outBias:  opts?.outBias  ?? 0.55,
      align:    opts?.align    ?? 1.8,
      swirl:    opts?.swirl    ?? 1.2,
      jitterAmp:opts?.jitterAmp?? 0.9,
      buoyancy: opts?.buoyancy ?? 0.15,
      fieldScale: opts?.fieldScale ?? 0.6
    };

    this.sampler = new MeshSurfaceSampler(surfaceMesh).build();
    this.initParticles(0);
  }

  private initialDir(posOS:THREE.Vector3, normalOS:THREE.Vector3, t:number){
    const F = curlAt(posOS, t, this.params.fieldScale);
    const d = new THREE.Vector3()
      .copy(normalOS).multiplyScalar(this.params.outBias)
      .add(F.normalize().multiplyScalar(1.0 - this.params.outBias));
    if (d.lengthSq() < 1e-6) d.copy(normalOS);
    return d.normalize();
  }

  private respawn(i:number, t:number){
    const P = this.aPos.array as Float32Array;
    const V = this.aVel.array as Float32Array;
    const A = this.aAge.array as Float32Array;
    const L = this.aLife.array as Float32Array;
    const S = this.aSeed.array as Float32Array;

    const tmpP = new THREE.Vector3();
    const tmpN = new THREE.Vector3();

    this.sampler.sample(tmpP, tmpN);
    const idx = i*3;
    P[idx]=tmpP.x; P[idx+1]=tmpP.y; P[idx+2]=tmpP.z;
    const d = this.initialDir(tmpP, tmpN.normalize(), t);
    const sp = 2.2 + Math.random()*1.8;
    V[idx]=d.x*sp; V[idx+1]=d.y*sp; V[idx+2]=d.z*sp;
    L[i]=0.75 + Math.random()*1.2;
    A[i]=Math.random()*0.12;
    S[i]=Math.random()*1000.0;
  }

  private initParticles(t:number){
    for(let i=0;i<this.count;i++) this.respawn(i, t);
    this.aPos.needsUpdate =
    this.aVel.needsUpdate =
    this.aAge.needsUpdate =
    this.aLife.needsUpdate = true;
  }

  update(dt:number, t:number){
    const drag = 0.985;
    const P = this.aPos.array as Float32Array;
    const V = this.aVel.array as Float32Array;
    const A = this.aAge.array as Float32Array;
    const L = this.aLife.array as Float32Array;
    const S = this.aSeed.array as Float32Array;

    for(let i=0;i<this.count;i++){
      const idx=i*3;
      A[i]+=dt;
      if(A[i]>=L[i]){ this.respawn(i, t); continue; }

      const pos = new THREE.Vector3(P[idx],P[idx+1],P[idx+2]);
      const F = curlAt(pos, t, this.params.fieldScale);
      const Vv = new THREE.Vector3(V[idx],V[idx+1],V[idx+2]);

      const swirl = new THREE.Vector3().copy(Vv).cross(F).multiplyScalar(this.params.swirl*dt);
      const j = randVec(S[i], t*1.7).multiplyScalar(this.params.jitterAmp*dt);
      const buoy = new THREE.Vector3(0, this.params.buoyancy*dt, 0);
      const align = F.multiplyScalar(this.params.align*dt);

      Vv.add(align).add(swirl).add(j).add(buoy).multiplyScalar(drag);
      pos.addScaledVector(Vv, dt);

      V[idx]=Vv.x; V[idx+1]=Vv.y; V[idx+2]=Vv.z;
      P[idx]=pos.x; P[idx+1]=pos.y; P[idx+2]=pos.z;
    }
    this.aPos.needsUpdate = this.aVel.needsUpdate = this.aAge.needsUpdate = true;
  }

  setViewport(width:number, height:number, fovDeg:number){
    this.viewport = { width, height, fovDeg };
    (this.mat.uniforms.uViewport.value as THREE.Vector2).set(width, height);
    this.mat.uniforms.uFov.value = THREE.MathUtils.degToRad(fovDeg);
  }

  dispose(){
    this.mesh.geometry.dispose();
    this.mat.dispose();
    // sampler는 내부적으로 버퍼 참조만 하므로 별도 dispose 불필요
  }
}
// ⬇️ 유틸 추가: 첫 번째 Mesh 찾기
function findFirstMesh(root: THREE.Object3D): THREE.Mesh | null {
  if ((root as any).isMesh) return root as THREE.Mesh;
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as any).isMesh) found = o as THREE.Mesh;
  });
  return found;
}

/* -------------------------------------------------------------------------- */
/*                                OmniFlames                                  */
/* -------------------------------------------------------------------------- */

export class OmniFlames {
  /** 대상 메시(불 효과를 입히는 원본) */
  target?: THREE.Mesh;
  /** 쉘 Mesh/Material */
  shell?: THREE.Mesh;
  shellMat?: THREE.ShaderMaterial;
  /** 스트릭 시스템 */
  streaks?: FlameStreaks;

  /** 뷰포트(스트릭 폭/길이 픽셀 → 뷰 변환에 필요) */
  private viewport: OmniFlamesViewport = { width: 1, height: 1, fovDeg: 60 };

  constructor(private options?: OmniFlamesOptions){
    if (options?.viewport) this.viewport = options.viewport;
  }

  /** 메시에 불 효과 부착 (자식으로 추가) */
  attachTo(targetLike: THREE.Object3D) {
    this.detach(); // 중복 부착 방지

    const mesh = findFirstMesh(targetLike);
    if (!mesh) {
      throw new Error("[OmniFlames.attachTo] 대상에서 Mesh를 찾지 못했습니다. (root.traverse 필요)");
    }
    this.target = mesh;

    // Shell
    const shellMat = makeShellMaterial(this.options?.shell);
    const shell = new THREE.Mesh(mesh.geometry, shellMat);
    shell.renderOrder = 2;
    mesh.add(shell);

    // Streaks
    const streakOpts: StreakOptions = {
      ...this.options?.streak,
      count: this.options?.streakCount ?? this.options?.streak?.count
    };
    const streaks = new FlameStreaks(mesh, streakOpts, this.viewport);
    mesh.add(streaks.mesh);

    // 초기 fadeFalloff은 메시 높이에 따라 보정
    this.shellMat = shellMat;
    this.shell = shell;
    this.streaks = streaks;
    this.updateBounds(); // 한번 계산
  }

  /** 메시에서 불 효과 제거 및 리소스 해제 */
  detach(){
    if (!this.target) return;
    if (this.shell){
      this.target.remove(this.shell);
      this.shellMat?.dispose();
      this.shell = undefined;
      this.shellMat = undefined;
    }
    if (this.streaks){
      this.target.remove(this.streaks.mesh);
      this.streaks.dispose();
      this.streaks = undefined;
    }
    this.target = undefined;
  }

  /** 매 프레임 호출 — 시간 전달 */
  update(dt:number, t:number){
    if (!this.shellMat || !this.streaks) return;
    this.shellMat.uniforms.uTime.value = t;
    this.streaks.mat.uniforms.uTime.value = t;
    this.streaks.update(dt, t);
  }

  /** 뷰포트 변경 (리사이즈/카메라 fov 변경 시 호출) */
  setViewport(width:number, height:number, fovDeg:number){
    this.viewport = { width, height, fovDeg };
    if (this.streaks) this.streaks.setViewport(width, height, fovDeg);
  }

  /** 메시의 월드 높이에 따라 쉘의 감쇠(fadeFalloff) 자동 보정 */
  updateBounds(){
    if (!this.target || !this.shellMat) return;
    const box = new THREE.Box3().setFromObject(this.target);
    const height = Math.max(0.0001, box.max.y - box.min.y);
    this.shellMat.uniforms.uFadeFalloff.value = Math.max(0.06, height * 0.12);
  }

  /** 컬러/룩 등 쉘 유니폼 접근자(옵션 GUI 연결용) */
  get shellUniforms(){
    return this.shellMat?.uniforms;
  }

  /** 스트릭 파라미터 접근(옵션 GUI 연결용) */
  get streakParams(){
    return this.streaks?.params;
  }

  /** 완전 해제 */
  dispose(){
    this.detach();
  }
}
