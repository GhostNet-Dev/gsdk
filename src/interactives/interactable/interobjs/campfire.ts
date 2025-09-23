// ToonCampfire.ts
import * as THREE from 'three';
import { InteractableObject } from '../interactable';
import { InteractableProperty } from '../interactivetypes';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { KeyType } from '@Glibs/types/eventtypes';
import { PlayerCtrl } from '@Glibs/actors/player/playerctrl';
import { itemDefs } from '@Glibs/inventory/items/itemdefs';

export class Campfire extends InteractableObject implements ILoop {
  LoopId: number = 0
  campfire?: ToonCampfire
  constructor(
    uniqId: string,
    protected def: InteractableProperty,
    protected eventCtrl: IEventController
  ) {
    super(uniqId, def, eventCtrl)
  }
  DoInteract(actor: IPhysicsObject): void {
    this.eventCtrl.SendEventMessage(EventTypes.CampfireInteract, actor)
  }
  async Loader(position: THREE.Vector3, rotation: THREE.Euler, scale: number, name: string) {
    const campfire = new ToonCampfire({ scale })
    this.position.copy(position);
    this.rotation.copy(rotation);
    this.scale.set(scale, scale, scale);
    const rocks = new ToonRockRing({
      count: 14, radius: 0.8, position: [0, 0, 0],
      shadows: { cast: false, receive: true }
    });
    const wood = new ToonFirewood({
      count: 3, length: 1.0, radius: 0.06, position: [0, 0, 0],
      shadows: { cast: true, receive: false }
    });
    campfire.group.add(rocks.group, wood.group);
    this.name = name;
    // const meshs = await this.asset.CloneModel()
    // this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, meshs)
    this.meshs = campfire.group
    this.actions.forEach(a => this.applyAction(a))
    this.add(this.meshs)
    this.campfire = campfire

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    this.eventCtrl.RegisterEventListener(EventTypes.CampfireCtrl, (amount: number) => {
      console.log("campfire: ", amount)
      if (amount > 0) {
        this.campfire!.ignite(true)
      } else {
        this.campfire!.extinguish(true)
        return
      }
      this.campfire!.setFireAmount(amount, true)
    })
  }
  afterLoad(): void {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, this, true)
  }
  _disable(): void {
  }

  tryInteract(actor: IPhysicsObject): void {
    // EventBus.emit("gatherWood", { actor, tree: this });
    if (actor.Pos.distanceTo(this.position) < 5 && !this.isActive) {
      this.eventCtrl.SendEventMessage(EventTypes.AlarmInteractiveOn, {
        [KeyType.Action1]: "나무 보충하기"
      })
      this.eventCtrl.SendEventMessage(EventTypes.ChangePlayerMode,
        this.def.type, this.interactId, "onHit", 5)
      // this.trigger("onHit")
      this.isActive = true
    }
  }
  timer: number = 0
  update(delta: number): void {
    this.timer += delta
    this.campfire!.update(this.timer)
  }
}

export type CampfirePalette = {
  coreBlue?: THREE.ColorRepresentation;   // 코어(푸른 기)
  midYellow?: THREE.ColorRepresentation;  // 중간(노랑)
  outerOrange?: THREE.ColorRepresentation;// 외곽(주황)
  deepMaroon?: THREE.ColorRepresentation; // 가장 바깥(짙은 적갈)
};

export interface CampfireOptions {
  position?: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
  scale?: number;

  // Flame shape (외곽 레이어 기준). 내부 레이어는 비율로 자동 보정됩니다.
  flameShape?: {
    width?: number;     // 0.3 ~ 0.7
    tip?: number;       // 1.0 ~ 2.6
    flow?: number;      // 0.4 ~ 1.2
    wobble?: number;    // 0.0 ~ 0.5
    noiseAmp?: number;  // 0.0 ~ 0.6
    noiseFreq?: number; // 0.8 ~ 4.2
    alpha?: number;     // 0.4 ~ 1.0
  };

  wind?: { x?: number; z?: number }; // 바람 (연기·스파크·불꽃에 반영)

  palette?: CampfirePalette; // 불꽃 팔레트
  glowAlpha?: number;        // 지면 잔광 강도(0~1)

  // 삼각 스파크 옵션
  triangles?: {
    max?: number;   // 내부 버퍼 최대치(생성 시 고정). 기본 160
    count?: number; // 실시간 드로우 개수(<= max)
    rise?: number;  // 상승 속도 계수
    curl?: number;  // 회오리감(곡률)
    alpha?: number; // 투명도
  };

  // 연기
  smoke?: {
    enabled?: boolean;
    alpha?: number; // 0~0.8
  };

  // 포인트 라이트
  light?: {
    enabled?: boolean;
    color?: THREE.ColorRepresentation;
    intensity?: number;
    distance?: number;
    decay?: number;
    flicker?: boolean; // update() 때 은은한 깜빡임
  };

  // 빌보드(카메라를 향하게) 사용 여부
  billboard?: boolean;

  /** 🔥 불꽃 on/off & 세기(양) 제어 */
  fire?: {
    enabled?: boolean;        // 초기 켜짐 여부 (기본 true)
    amount?: number;          // 0..1, 기본 1
    transitionSec?: number;   // 보간 시간(초), 0이면 즉시 반영. 기본 0.35
  };
}

/* ------------------------------ Shaders ------------------------------ */
const FLAME_VERT = /* glsl */`
  varying vec2 vUv;
  uniform float uBillboard;
  void main(){
    vUv = uv;
    vec3 pos = position;
    if(uBillboard > 0.5){
      vec4 mv = modelViewMatrix * vec4(0.0,0.0,0.0,1.0);
      float ang = atan(mv.x, mv.z);
      float s = sin(ang), c = cos(ang);
      mat3 ry = mat3(c,0.,-s, 0.,1.,0., s,0.,c);
      pos = ry * pos;
      gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0,0.0,0.0,1.0) + vec4(pos,0.0));
    } else {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
    }
  }
`;

const FLAME_FRAG = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime, uWidth, uTipSharp, uNoiseAmp, uNoiseFreq, uFlow, uWobble, uAlpha;
  uniform vec3 uC0, uC1, uC2, uC3;
  uniform float uB1, uB2, uB3;
  uniform vec2  uWind;

  float h(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p.x+p.y)*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); float a=h(i), b=h(i+vec2(1,0)), c=h(i+vec2(0,1)), d=h(i+vec2(1,1));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
  float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*n2(p); p*=2.; a*=.5; } return v; }

  void main(){
    vec2 uv = vUv;
    float y = clamp(uv.y,0.,1.);
    float baseW = uWidth*(1.0 - pow(y,uTipSharp));
    float x = (uv.x - 0.5) / max(0.001, baseW);

    float sway = sin(uTime*2.7 + y*6.2831)*uWobble*(1.0-y);
    sway += uWind.x * (1.0-y)*0.6;
    x += sway;

    float t = uTime + y*uFlow;
    vec2 q = vec2(x*uNoiseFreq + uWind.x*0.7, (y*2.0 - t)*uNoiseFreq + uWind.y*0.4);
    float f = fbm(q);
    float distort = (f-0.5)*2.0 * uNoiseAmp*(0.4+0.6*(1.0-y));

    float r = abs(x + distort);
    float edge = smoothstep(1.0,0.7,1.0-r);
    float base = smoothstep(-0.2,0.0,(y-0.05)+(abs(x)*0.08));
    float shape = clamp(edge*base,0.0,1.0);

    float intensity = clamp(y + f*0.22 + 0.1, 0.0, 1.0);

    vec3 col = uC3;
    col = mix(uC3,uC2,step(uB1,intensity));
    col = mix(col,uC1,step(uB2,intensity));
    col = mix(col,uC0,step(uB3,intensity));
    col = min(col, vec3(0.98)); // toon highlight 클램프

    gl_FragColor = vec4(col, shape*uAlpha);
    if(gl_FragColor.a <= 0.01) discard;
  }
`;

const GLOW_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const GLOW_FRAG = /* glsl */`
  precision mediump float; varying vec2 vUv; uniform vec3 uC; uniform float uA;
  void main(){
    float d = 1.0 - length(vUv*2.0-1.0);
    float ring = smoothstep(0.1,0.0,abs(d-0.35));
    float core = smoothstep(0.6,0.0,abs(d-0.0));
    float a = clamp(core*0.5 + ring*0.3, 0.0, 1.0) * uA;
    if(a < 0.01) discard;
    gl_FragColor = vec4(uC, a);
  }
`;

// Tri-sparks (instanced)
const TRI_VERT = /* glsl */`
  attribute vec3 iOrigin;
  attribute vec4 iSeed;
  attribute float iLife;
  uniform float uTime, uRise, uCurl;
  uniform vec2 uWind;
  varying float vLife;
  void main(){
    float t = uTime + iSeed.w;
    float life = iLife;
    float age = mod(t, life);
    vLife = age / life;

    vec3 P = iOrigin;
    P.y += vLife * uRise * life;

    float ang = vLife * 6.28318 * iSeed.x;
    P.x += sin(ang + iSeed.z*6.28318) * 0.05 * (1.0 - vLife);
    P.z += cos(ang*0.8 + iSeed.z*11.0) * 0.05 * (1.0 - vLife);
    P.xz += uWind * (0.4 + 0.6*(1.0 - vLife));

    mat3 ry = mat3(cos(ang),0.,-sin(ang), 0.,1.,0., sin(ang),0.,cos(ang));
    vec3 pos = (ry * position) * (0.6 + 0.7*(1.0 - vLife));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(P + pos, 1.0);
  }
`;
const TRI_FRAG = /* glsl */`
  precision mediump float;
  varying float vLife;
  uniform vec3 uC0,uC1,uC2;
  uniform float uAlpha;
  void main(){
    vec3 col = uC2;
    col = mix(uC2,uC1, step(0.35, 1.0 - vLife));
    col = mix(col,uC0, step(0.65, 1.0 - vLife));
    col = min(col, vec3(0.97));
    float a = uAlpha * (1.0 - vLife);
    if(a < 0.02) discard;
    gl_FragColor = vec4(col, a);
  }
`;

// Smoke
const SMOKE_VERT = /* glsl */`
  varying vec2 vUv; uniform float uTime; uniform vec2 uWind;
  void main(){
    vUv=uv;
    vec3 p=position;
    float y=uv.y;
    p.x += sin(uTime*0.8 + y*6.2831)*0.08*(y) + uWind.x*0.15*y;
    p.z += cos(uTime*0.6 + y*4.0)*0.04*(y) + uWind.y*0.1*y;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }
`;
const SMOKE_FRAG = /* glsl */`
  precision mediump float; varying vec2 vUv; uniform float uAlpha; uniform vec3 uColor;
  void main(){
    float d=1.0-abs(vUv.x-0.5)*2.0;
    float a=smoothstep(0.0,0.6,vUv.y)*smoothstep(0.0,0.9,d)*uAlpha*(1.0 - pow(vUv.y,1.2));
    if(a<0.01) discard;
    gl_FragColor=vec4(uColor,a);
  }
`;

/* ------------------------------ Utility ------------------------------ */
function colorArr(c: THREE.ColorRepresentation): [number, number, number] {
  const col = new THREE.Color(c);
  return [col.r, col.g, col.b];
}
function setVec3Like(target: THREE.Object3D, v?: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number]) {
  if (!v) return;
  if (Array.isArray(v)) target.position.set(v[0], v[1], v[2]);
  else if ('x' in v) target.position.set(v.x, v.y, v.z);
  else target.position.copy(v as THREE.Vector3);
}

/* ------------------------------ Class ------------------------------ */
export class ToonCampfire {
  public readonly group = new THREE.Group();

  // parts
  private glow?: THREE.Mesh;
  private outer?: { mesh: THREE.Mesh; uniforms: any };
  private mid?: { mesh: THREE.Mesh; uniforms: any };
  private core?: { mesh: THREE.Mesh; uniforms: any };
  private triMesh?: THREE.Mesh;
  private triGeom?: THREE.InstancedBufferGeometry;
  private triMat?: THREE.ShaderMaterial;
  private smoke?: THREE.Mesh;
  private smokeMat?: THREE.ShaderMaterial;
  private light?: THREE.PointLight;

  // state
  private startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  private baseIndexCount = 0;

  // 🔥 fire state
  private fireAmount = 1;         // 현재 세기(보간 결과)
  private fireTarget = 1;         // 목표 세기
  private lastUpdateT?: number;   // dt 계산용

  // 베이스 값(세기 보정 전 기준값들)
  private base = {
    glowAlpha: 0.46,
    smokeAlpha: 0.34,
    triCount: 150,
    lightIntensity: 1.5,
    // 레이어별 기본 알파 & 세로 스케일
    outerAlpha: 0.95,
    midAlpha: 0.95 * 0.85,
    coreAlpha: 0.95 * 0.82,
    outerScaleY: 1.0,
    midScaleY: 0.9,
    coreScaleY: 0.78,
  };

  // config
  private cfg: Required<CampfireOptions>;

  constructor(options: CampfireOptions = {}) {
    // defaults
    const cfg: Required<CampfireOptions> = {
      position: new THREE.Vector3(0, 0, 0),
      scale: 1,
      billboard: true,
      flameShape: {
        width: 0.5, tip: 1.85, flow: 0.8, wobble: 0.16, noiseAmp: 0.26, noiseFreq: 2.4, alpha: 0.95
      },
      wind: { x: 0.12, z: 0.0 },
      palette: {
        coreBlue: '#8ad9ff',
        midYellow: '#ffd05a',
        outerOrange: '#ff7b2f',
        deepMaroon: '#4a1b0f'
      },
      glowAlpha: 0.46,
      triangles: { max: 160, count: 150, rise: 1.8, curl: 0.22, alpha: 0.78 },
      smoke: { enabled: true, alpha: 0.34 },
      light: { enabled: true, color: 0xffb15a, intensity: 1.5, distance: 10, decay: 2.0, flicker: true },
      fire: { enabled: true, amount: 1, transitionSec: 0.35 },
    };
    // merge
    this.cfg = {
      ...cfg,
      ...options,
      flameShape: { ...cfg.flameShape, ...(options.flameShape ?? {}) },
      wind: { ...cfg.wind, ...(options.wind ?? {}) },
      palette: { ...cfg.palette, ...(options.palette ?? {}) },
      triangles: { ...cfg.triangles, ...(options.triangles ?? {}) },
      smoke: { ...cfg.smoke, ...(options.smoke ?? {}) },
      light: { ...cfg.light, ...(options.light ?? {}) },
      fire: { ...cfg.fire, ...(options.fire ?? {}) },
    };

    // 초기 fire 상태
    this.fireAmount = this.cfg.fire.enabled ? THREE.MathUtils.clamp(this.cfg.fire.amount!, 0, 1) : 0;
    this.fireTarget = this.fireAmount;

    // build
    this.buildGlow();
    this.buildFlames();
    this.buildTriangles();
    this.buildSmoke();
    this.buildLight();

    // transform
    setVec3Like(this.group, this.cfg.position);
    if (this.cfg.scale !== 1) this.group.scale.setScalar(this.cfg.scale);

    // 베이스값(현재 cfg 기준) 동기화
    this.base.glowAlpha = this.cfg.glowAlpha!;
    this.base.smokeAlpha = this.cfg.smoke.alpha!;
    this.base.triCount = this.cfg.triangles.count!;
    this.base.lightIntensity = this.cfg.light.intensity!;
    this.base.outerAlpha = this.cfg.flameShape.alpha!;
    this.base.midAlpha = this.cfg.flameShape.alpha! * 0.85;
    this.base.coreAlpha = this.cfg.flameShape.alpha! * 0.82;

    // initial sync
    this.syncAll();

    // fire 세기 초기 반영
    this.applyFireInstant();
  }

  /* --------------------------- Build Parts (동일) --------------------------- */
  private buildGlow() {
    const geo = new THREE.CircleGeometry(0.9, 48);
    const mat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uC: { value: new THREE.Color(0xffa63a) },
        uA: { value: this.cfg.glowAlpha }
      }
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.001;
    this.group.add(mesh);
    this.glow = mesh;
  }

  private makeFlameLayer(opts: { width: number; tip: number; amp: number; freq: number; flow: number; wobble: number; alpha: number }) {
    const uniforms = {
      uTime: { value: 0 },
      uBillboard: { value: this.cfg.billboard ? 1.0 : 0.0 },
      uWidth: { value: opts.width },
      uTipSharp: { value: opts.tip },
      uNoiseAmp: { value: opts.amp },
      uNoiseFreq: { value: opts.freq },
      uFlow: { value: opts.flow },
      uWobble: { value: opts.wobble },
      uAlpha: { value: opts.alpha },
      uWind: { value: new THREE.Vector2(this.cfg.wind.x!, this.cfg.wind.z!) },
      uC0: { value: colorArr(this.cfg.palette.coreBlue!) },
      uC1: { value: colorArr(this.cfg.palette.midYellow!) },
      uC2: { value: colorArr(this.cfg.palette.outerOrange!) },
      uC3: { value: colorArr(this.cfg.palette.deepMaroon!) },
      uB1: { value: 0.25 },
      uB2: { value: 0.56 },
      uB3: { value: 0.82 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const geo = new THREE.PlaneGeometry(1.25, 1.9);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.75;
    return { mesh, uniforms };
  }

  private buildFlames() {
    const s = this.cfg.flameShape;
    this.outer = this.makeFlameLayer({
      width: s.width!, tip: s.tip! * 0.97, amp: s.noiseAmp! * 0.96, freq: s.noiseFreq! * 0.92, flow: s.flow! * 0.95, wobble: s.wobble!, alpha: s.alpha!
    });
    this.group.add(this.outer.mesh);

    this.mid = this.makeFlameLayer({
      width: s.width! * 0.9, tip: s.tip! * 1.1, amp: s.noiseAmp! * 0.85, freq: s.noiseFreq! * 1.25, flow: s.flow! * 1.15, wobble: s.wobble! * 0.85, alpha: s.alpha! * 0.85
    });
    this.mid.mesh.scale.set(0.9, 0.9, 1);
    this.mid.mesh.position.y = 0.72;
    this.group.add(this.mid.mesh);

    this.core = this.makeFlameLayer({
      width: s.width! * 0.78, tip: s.tip! * 1.3, amp: s.noiseAmp! * 0.7, freq: s.noiseFreq! * 1.4, flow: s.flow! * 1.3, wobble: s.wobble! * 0.7, alpha: s.alpha! * 0.82
    });
    (this.core.mesh.material as THREE.ShaderMaterial).blending = THREE.AdditiveBlending;
    this.core.mesh.scale.set(0.78, 0.78, 1);
    this.core.mesh.position.y = 0.7;
    this.group.add(this.core.mesh);
  }

  private buildTriangles() {
    const MAX = Math.max(1, Math.floor(this.cfg.triangles.max!));
    const base = new THREE.ConeGeometry(0.06, 0.12, 3);
    base.rotateX(Math.PI / 2);

    const geom = new THREE.InstancedBufferGeometry();
    geom.index = base.index!;
    geom.attributes.position = base.attributes.position;
    geom.attributes.normal = base.attributes.normal;
    geom.attributes.uv = base.attributes.uv;
    this.baseIndexCount = base.index ? base.index.count : 0;

    const origins = new Float32Array(MAX * 3);
    const seeds = new Float32Array(MAX * 4);
    const lifeA = new Float32Array(MAX);
    for (let i = 0; i < MAX; i++) {
      origins[i * 3 + 0] = (Math.random() * 2 - 1) * 0.12;
      origins[i * 3 + 1] = 0.2 + Math.random() * 0.25;
      origins[i * 3 + 2] = (Math.random() * 2 - 1) * 0.12;
      seeds[i * 4 + 0] = THREE.MathUtils.lerp(0.6, 2.2, Math.random());
      seeds[i * 4 + 1] = THREE.MathUtils.lerp(0.9, 1.8, Math.random());
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random() * 10.0; // tOffset
      lifeA[i] = THREE.MathUtils.lerp(0.7, 1.6, Math.random());
    }
    geom.setAttribute('iOrigin', new THREE.InstancedBufferAttribute(origins, 3));
    geom.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    geom.setAttribute('iLife', new THREE.InstancedBufferAttribute(lifeA, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uRise: { value: this.cfg.triangles.rise },
        uCurl: { value: this.cfg.triangles.curl },
        uAlpha: { value: this.cfg.triangles.alpha },
        uWind: { value: new THREE.Vector2(this.cfg.wind.x!, this.cfg.wind.z!) },
        uC0: { value: colorArr('#ffd47a') },
        uC1: { value: colorArr('#ff9a3a') },
        uC2: { value: colorArr('#ee5b2a') }
      },
      vertexShader: TRI_VERT,
      fragmentShader: TRI_FRAG
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.7;
    this.group.add(mesh);

    geom.instanceCount = Math.min(MAX, Math.max(0, Math.floor(this.cfg.triangles.count!)));
    this.triMesh = mesh;
    this.triGeom = geom;
    this.triMat = mat;
  }

  private buildSmoke() {
    const geo = new THREE.PlaneGeometry(0.9, 1.6);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uAlpha: { value: this.cfg.smoke.alpha },
        uColor: { value: new THREE.Color('#7e8a9a') },
        uWind: { value: new THREE.Vector2(this.cfg.wind.x!, this.cfg.wind.z!) }
      },
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.2, 0);
    mesh.visible = !!this.cfg.smoke.enabled;

    this.group.add(mesh);
    this.smoke = mesh;
    this.smokeMat = mat;
  }

  private buildLight() {
    if (!this.cfg.light.enabled) return;
    const L = new THREE.PointLight(
      this.cfg.light.color,
      this.cfg.light.intensity,
      this.cfg.light.distance,
      this.cfg.light.decay
    );
    L.position.set(0, 0.75, 0);
    this.group.add(L);
    this.light = L;
  }

  /* ----------------------------- Public API ----------------------------- */

  /** 매 프레임 호출: elapsedSeconds(누적시간)을 넣어 주세요. */
  update(elapsedSeconds: number) {
    // 시간 유니폼
    const t = elapsedSeconds ?? ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000 - this.startTime);
    if (this.outer) this.outer.uniforms.uTime.value = t + 0.0;
    if (this.mid) this.mid.uniforms.uTime.value = t + 77.0;
    if (this.core) this.core.uniforms.uTime.value = t + 154.0;
    if (this.triMat) this.triMat.uniforms.uTime.value = t;
    if (this.smokeMat) this.smokeMat.uniforms.uTime.value = t;

    // flicker
    if (this.light && this.cfg.light.flicker) {
      const flick = 0.8 + Math.sin(t * 11.0) * 0.12 + (Math.random() - 0.5) * 0.04;
      this.light.intensity = (this.base.lightIntensity * this.fireAmount) * flick;
      const tmp = new THREE.Color(this.cfg.light.color ?? 0xffb15a);
      tmp.offsetHSL(0.01 * Math.sin(t * 2.0), 0, 0);
      this.light.color.copy(tmp);
    }

    // 🔥 fire 세기 보간
    const dt = this.lastUpdateT == null ? 0.016 : Math.max(0, Math.min(0.1, elapsedSeconds - this.lastUpdateT));
    this.lastUpdateT = elapsedSeconds;
    const tau = Math.max(0, this.cfg.fire.transitionSec ?? 0.35);
    const k = tau <= 1e-6 ? 1 : 1 - Math.exp(-dt / tau);
    this.fireAmount += (this.fireTarget - this.fireAmount) * k;

    // 세기 적용
    this.applyFireVisuals();
  }

  setWind(x: number, z: number) {
    this.cfg.wind.x = x; this.cfg.wind.z = z;
    const v = new THREE.Vector2(x, z);
    if (this.outer) this.outer.uniforms.uWind.value.copy(v);
    if (this.mid) this.mid.uniforms.uWind.value.copy(v);
    if (this.core) this.core.uniforms.uWind.value.copy(v);
    if (this.triMat) this.triMat.uniforms.uWind.value.copy(v);
    if (this.smokeMat) this.smokeMat.uniforms.uWind.value.copy(v);
  }

  setPalette(p: CampfirePalette) { this.cfg.palette = { ...this.cfg.palette, ...p }; this.syncPalette(); }

  setTriCount(n: number) {
    if (!this.triGeom) return;
    const max = this.cfg.triangles.max!;
    const clamped = Math.min(max, Math.max(0, Math.floor(n)));
    this.cfg.triangles.count = clamped;
    this.triGeom.instanceCount = clamped;
    if (this.baseIndexCount && (this.triGeom as any).setDrawRange) {
      (this.triGeom as any).setDrawRange(0, this.baseIndexCount * clamped);
    }
  }

  setSmokeEnabled(enabled: boolean) { this.cfg.smoke.enabled = enabled; if (this.smoke) this.smoke.visible = enabled; }
  setSmokeAlpha(alpha: number) { this.cfg.smoke.alpha = alpha; if (this.smokeMat) this.smokeMat.uniforms.uAlpha.value = alpha; }
  setGlowAlpha(a: number) { this.cfg.glowAlpha = a; const mat = this.glow?.material as THREE.ShaderMaterial | undefined; if (mat) mat.uniforms.uA.value = a; }
  setFlameShape(partial: Partial<NonNullable<CampfireOptions['flameShape']>>) { this.cfg.flameShape = { ...this.cfg.flameShape, ...(partial ?? {}) }; this.syncFlameShape(); }
  setBillboard(enabled: boolean) { this.cfg.billboard = enabled; const v = enabled ? 1.0 : 0.0; if (this.outer) this.outer.uniforms.uBillboard.value = v; if (this.mid) this.mid.uniforms.uBillboard.value = v; if (this.core) this.core.uniforms.uBillboard.value = v; }
  setLightEnabled(enabled: boolean) {
    if (enabled && !this.light) this.buildLight();
    else if (!enabled && this.light) { this.group.remove(this.light); this.light.dispose(); this.light = undefined; }
    this.cfg.light.enabled = enabled;
  }

  setPosition(v: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number]) { setVec3Like(this.group, v); }
  setScale(s: number) { this.group.scale.setScalar(s); }

  /** 🔥 세기(양) 지정: 0..1 */
  setFireAmount(amount: number, instant = false) {
    const a = THREE.MathUtils.clamp(amount, 0, 1);
    this.cfg.fire.amount = a;
    this.fireTarget = this.cfg.fire.enabled ? a : 0;
    if (instant) { this.fireAmount = this.fireTarget; this.applyFireInstant(); }
  }

  /** 🔥 on/off 설정 */
  setFireEnabled(enabled: boolean, instant = false) {
    this.cfg.fire.enabled = enabled;
    this.fireTarget = enabled ? THREE.MathUtils.clamp(this.cfg.fire.amount!, 0, 1) : 0;
    if (instant) { this.fireAmount = this.fireTarget; this.applyFireInstant(); }
  }

  /** 편의 함수 */
  ignite(instant = false) { this.setFireEnabled(true, instant); }
  extinguish(instant = false) { this.setFireEnabled(false, instant); }
  toggleFire() { this.setFireEnabled(!this.cfg.fire.enabled); }

  /** 리소스 해제 */
  dispose() {
    const killMesh = (m?: THREE.Object3D) => {
      if (!m) return;
      m.traverse(obj => {
        if ((obj as any).geometry) (obj as any).geometry.dispose?.();
        const mat = (obj as any).material;
        if (Array.isArray(mat)) mat.forEach(mm => mm.dispose?.());
        else mat?.dispose?.();
      });
      m.parent?.remove(m);
    };
    killMesh(this.glow);
    killMesh(this.outer?.mesh);
    killMesh(this.mid?.mesh);
    killMesh(this.core?.mesh);
    killMesh(this.triMesh);
    killMesh(this.smoke);
    if (this.light) { this.group.remove(this.light); this.light.dispose(); this.light = undefined; }
  }

  /* ----------------------------- Sync Internals ----------------------------- */
  private syncPalette() {
    const c0 = colorArr(this.cfg.palette.coreBlue!);
    const c1 = colorArr(this.cfg.palette.midYellow!);
    const c2 = colorArr(this.cfg.palette.outerOrange!);
    const c3 = colorArr(this.cfg.palette.deepMaroon!);
    [this.outer, this.mid, this.core].forEach(L => {
      if (!L) return;
      L.uniforms.uC0.value = c0;
      L.uniforms.uC1.value = c1;
      L.uniforms.uC2.value = c2;
      L.uniforms.uC3.value = c3;
    });
  }

  private syncFlameShape() {
    const s = this.cfg.flameShape;
    if (this.outer) { this.outer.uniforms.uWidth.value = s.width!; this.outer.uniforms.uTipSharp.value = s.tip! * 0.97; this.outer.uniforms.uFlow.value = s.flow! * 0.95; this.outer.uniforms.uWobble.value = s.wobble!; this.outer.uniforms.uNoiseAmp.value = s.noiseAmp! * 0.96; this.outer.uniforms.uNoiseFreq.value = s.noiseFreq! * 0.92; this.outer.uniforms.uAlpha.value = s.alpha!; }
    if (this.mid) { this.mid.uniforms.uWidth.value = s.width! * 0.9; this.mid.uniforms.uTipSharp.value = s.tip! * 1.1; this.mid.uniforms.uFlow.value = s.flow! * 1.15; this.mid.uniforms.uWobble.value = s.wobble! * 0.85; this.mid.uniforms.uNoiseAmp.value = s.noiseAmp! * 0.85; this.mid.uniforms.uNoiseFreq.value = s.noiseFreq! * 1.25; this.mid.uniforms.uAlpha.value = s.alpha! * 0.85; }
    if (this.core) { this.core.uniforms.uWidth.value = s.width! * 0.78; this.core.uniforms.uTipSharp.value = s.tip! * 1.3; this.core.uniforms.uFlow.value = s.flow! * 1.3; this.core.uniforms.uWobble.value = s.wobble! * 0.7; this.core.uniforms.uNoiseAmp.value = s.noiseAmp! * 0.7; this.core.uniforms.uNoiseFreq.value = s.noiseFreq! * 1.4; this.core.uniforms.uAlpha.value = s.alpha! * 0.82; }
    // 베이스 알파도 갱신
    this.base.outerAlpha = s.alpha!;
    this.base.midAlpha = s.alpha! * 0.85;
    this.base.coreAlpha = s.alpha! * 0.82;
  }

  private syncAll() {
    this.syncPalette();
    this.syncFlameShape();
    this.setWind(this.cfg.wind.x!, this.cfg.wind.z!);
    this.setTriCount(this.cfg.triangles.count!);
    this.setSmokeEnabled(!!this.cfg.smoke.enabled);
    this.setGlowAlpha(this.cfg.glowAlpha!);
    this.setBillboard(!!this.cfg.billboard);
  }

  /* ----------------------------- Fire visuals ----------------------------- */
  private applyFireInstant() {
    // 즉시 반영(초기/즉시 변경용)
    this.applyFireVisuals(true);
  }

  private applyFireVisuals(force = false) {
    const a = THREE.MathUtils.clamp(this.fireAmount, 0, 1);
    const tiny = a < 0.02;

    // 레이어 알파 & 세로 스케일(세기↑ = 더 커지고 진함)
    const scaleY = (baseY: number) => baseY * (0.6 + 0.8 * a); // 0.6~1.4배
    if (this.outer) {
      this.outer.uniforms.uAlpha.value = this.base.outerAlpha * a;
      this.outer.mesh.scale.y = scaleY(this.base.outerScaleY);
      this.outer.mesh.visible = !tiny;
    }
    if (this.mid) {
      this.mid.uniforms.uAlpha.value = this.base.midAlpha * a;
      this.mid.mesh.scale.y = scaleY(this.base.midScaleY);
      this.mid.mesh.visible = !tiny;
    }
    if (this.core) {
      this.core.uniforms.uAlpha.value = this.base.coreAlpha * a;
      this.core.mesh.scale.y = scaleY(this.base.coreScaleY);
      this.core.mesh.visible = !tiny;
    }

    // 스파크 개수
    const triCount = Math.round(this.base.triCount * a);
    if (this.triGeom && (force || this.cfg.triangles.count !== triCount)) this.setTriCount(triCount);
    if (this.triMesh) this.triMesh.visible = triCount > 0;

    // 연기 알파(세기 뿌리감 있게 sqrt)
    const smokeA = this.base.smokeAlpha * Math.sqrt(a);
    if (this.smokeMat) this.smokeMat.uniforms.uAlpha.value = smokeA;
    if (this.smoke) this.smoke.visible = (this.cfg.smoke.enabled ?? true) && smokeA > 0.02;

    // 바닥 잔광 & 라이트
    const glowA = this.base.glowAlpha * a;
    this.setGlowAlpha(glowA);
    if (this.light) this.light.intensity = this.base.lightIntensity * a;
  }
}


// ToonCampfireExtras.ts

/* ------------------------- Utility: seeded random ------------------------- */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ======================================================================== */
/*                             Rock Ring (돌무더기)                         */
/* ======================================================================== */
export interface RockRingOptions {
  position?: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
  scale?: number;

  /** 돌 개수 */
  count?: number;         // default 14
  /** 기준 반지름 */
  radius?: number;        // default 0.8
  /** 반지름 랜덤 편차 */
  radiusJitter?: number;  // default 0.04
  /** 돌 기본 사이즈 */
  stoneSize?: number;     // default 0.13 (Dodecahedron)
  /** 개별 스케일 가중 범위 */
  stoneScaleRange?: [number, number]; // default [0.7, 1.3]
  /** 돌 높이(y) */
  height?: number;        // default 0.06
  /** 재질 색상 */
  color?: THREE.ColorRepresentation; // default 0x3a3a47
  roughness?: number;     // default 1
  metalness?: number;     // default 0
  /** 그림자 옵션 */
  shadows?: { cast?: boolean; receive?: boolean }; // default cast:false, receive:false
  /** 재현 가능한 랜덤 배치를 위한 시드 */
  seed?: number;          // default: Math.random()*1e9
}

export class ToonRockRing {
  public readonly group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private mat?: THREE.MeshStandardMaterial;

  private cfg: Required<RockRingOptions>;

  constructor(options: RockRingOptions = {}) {
    const cfgDefault: Required<RockRingOptions> = {
      position: new THREE.Vector3(0, 0, 0),
      scale: 1,
      count: 14,
      radius: 0.8,
      radiusJitter: 0.04,
      stoneSize: 0.13,
      stoneScaleRange: [0.7, 1.3],
      height: 0.06,
      color: 0x3a3a47,
      roughness: 1,
      metalness: 0,
      shadows: { cast: false, receive: false },
      seed: Math.floor(Math.random() * 1e9)
    };
    this.cfg = {
      ...cfgDefault, ...options,
      shadows: { ...cfgDefault.shadows, ...(options.shadows ?? {}) }
    };

    setVec3Like(this.group, this.cfg.position);
    if (this.cfg.scale !== 1) this.group.scale.setScalar(this.cfg.scale);

    this.build();
  }

  private build() {
    const rand = mulberry32(this.cfg.seed);
    const geo = new THREE.DodecahedronGeometry(this.cfg.stoneSize, 0);
    this.mat = new THREE.MeshStandardMaterial({
      color: this.cfg.color,
      roughness: this.cfg.roughness,
      metalness: this.cfg.metalness,
    });

    // 생성
    for (let i = 0; i < this.cfg.count; i++) {
      const a = (i / this.cfg.count) * Math.PI * 2;
      const r = this.cfg.radius + (rand() * 2 - 1) * this.cfg.radiusJitter;
      const m = new THREE.Mesh(geo, this.mat);
      m.position.set(Math.cos(a) * r, this.cfg.height, Math.sin(a) * r);
      m.rotation.y = rand() * Math.PI * 2;

      const [sMin, sMax] = this.cfg.stoneScaleRange;
      const s = THREE.MathUtils.lerp(sMin, sMax, rand());
      m.scale.setScalar(s);

      const cast = !!this.cfg.shadows.cast;
      const recv = !!this.cfg.shadows.receive;
      m.castShadow = cast;
      m.receiveShadow = recv;

      this.group.add(m);
      this.meshes.push(m);
    }
  }

  setPosition(v: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number]) { setVec3Like(this.group, v); }
  setScale(s: number) { this.group.scale.setScalar(s); }

  dispose() {
    this.meshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose?.();
      m.parent?.remove(m);
    });
    this.meshes = [];
    this.mat?.dispose();
    this.mat = undefined;
  }
}

/* ======================================================================== */
/*                               Firewood (장작)                            */
/* ======================================================================== */
export interface FirewoodOptions {
  position?: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
  scale?: number;

  /** 장작 개수 */
  count?: number;           // default 3
  /** 한 토막 길이 */
  length?: number;          // default 1.0
  /** 반지름(두께) */
  radius?: number;          // default 0.06
  /** 측면 분할 (낮을수록 로우폴리 감) */
  radialSegments?: number;  // default 6
  /** 중심에서의 기울기/배치 랜덤(라디안) */
  tiltRandom?: number;      // default 0.2
  /** 바닥에서 띄우는 높이 */
  height?: number;          // default 0.08
  /** Y축을 중심으로 둥글게 놓는 기본 오프셋 */
  yawOffset?: number;       // default 0.2 (약간 비대칭)

  /** 재질 색상/거칠기 */
  color?: THREE.ColorRepresentation; // default 0x6b4a2b
  roughness?: number;       // default 1
  metalness?: number;       // default 0

  /** 그림자 */
  shadows?: { cast?: boolean; receive?: boolean }; // default cast:false, receive:false
  /** 재현 가능한 랜덤 배치 시드 */
  seed?: number;            // default: Math.random()*1e9
}

export class ToonFirewood {
  public readonly group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private mat?: THREE.MeshStandardMaterial;

  private cfg: Required<FirewoodOptions>;

  constructor(options: FirewoodOptions = {}) {
    const cfgDefault: Required<FirewoodOptions> = {
      position: new THREE.Vector3(0, 0, 0),
      scale: 1,
      count: 3,
      length: 1.0,
      radius: 0.06,
      radialSegments: 6,
      tiltRandom: 0.2,
      height: 0.08,
      yawOffset: 0.2,
      color: 0x6b4a2b,
      roughness: 1,
      metalness: 0,
      shadows: { cast: false, receive: false },
      seed: Math.floor(Math.random() * 1e9)
    };
    this.cfg = {
      ...cfgDefault, ...options,
      shadows: { ...cfgDefault.shadows, ...(options.shadows ?? {}) }
    };

    setVec3Like(this.group, this.cfg.position);
    if (this.cfg.scale !== 1) this.group.scale.setScalar(this.cfg.scale);

    this.build();
  }

  private build() {
    const rand = mulberry32(this.cfg.seed);
    const geo = new THREE.CylinderGeometry(this.cfg.radius, this.cfg.radius, this.cfg.length, this.cfg.radialSegments);
    this.mat = new THREE.MeshStandardMaterial({
      color: this.cfg.color,
      roughness: this.cfg.roughness,
      metalness: this.cfg.metalness
    });

    for (let i = 0; i < this.cfg.count; i++) {
      const log = new THREE.Mesh(geo, this.mat);
      log.position.y = this.cfg.height;

      // 장작을 원형으로 배치하되 약간 비대칭
      const yaw = i * (Math.PI * 2 / this.cfg.count) + this.cfg.yawOffset;
      log.rotation.y = yaw;

      // 살짝 기울기, 좌우 틀어짐
      log.rotation.z = (rand() * 2 - 1) * this.cfg.tiltRandom;

      const cast = !!this.cfg.shadows.cast;
      const recv = !!this.cfg.shadows.receive;
      log.castShadow = cast;
      log.receiveShadow = recv;

      this.group.add(log);
      this.meshes.push(log);
    }
  }

  setPosition(v: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number]) { setVec3Like(this.group, v); }
  setScale(s: number) { this.group.scale.setScalar(s); }

  dispose() {
    this.meshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose?.();
      m.parent?.remove(m);
    });
    this.meshes = [];
    this.mat?.dispose();
    this.mat = undefined;
  }
}
