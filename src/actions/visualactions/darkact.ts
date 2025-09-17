import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class DarkAction implements IActionComponent, ILoop {
    LoopId: number = 0
    id = "darkparticle"
    dark?: OccludingParticles
    constructor(
        private eventCtrl: IEventController,
        private scean: THREE.Scene,
    ) { }

    activate(target: IActionUser, context?: ActionContext | undefined): void {
        const obj = target.objs
        if (!obj) return
        if (!this.dark) this.dark = new OccludingParticles({ ...context?.param })
        this.dark.setTargets([obj], "local", true)
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        this.eventCtrl.RegisterEventListener(EventTypes.DarkParticle, (count: number) => {
          this.dark!.setOptions({ particleCount: count })
        })
        // this.scean.add(this.dark.points)
        obj.add((this.dark.points))
    }
    deactivate(target: IActionUser, context?: ActionContext | undefined): void {
        const obj = target.objs
        if (!obj) return
        this.dark?.dispose()
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        // this.scean.remove(this.dark!.points)
        obj.remove((this.dark!.points))
    }
    update(delta: number): void {
        this.dark!.update(delta)
    }
}
export type WindMode = "Directional" | "Omni" | "Turbulence";

export interface OccludingParticlesOptions {
  /** 총 파티클 개수 */
  particleCount?: number;                 // default 50000
  /** 수명 범위 [min, max] (초) */
  lifespanRange?: [number, number];       // default [2.5, 5.0]
  /** 초기 속도 범위 [min, max] */
  initialSpeedRange?: [number, number];   // default [0.2, 0.6]
  /** 상승 속도 (+ 위로, - 아래로) */
  riseSpeed?: number;                     // default 0.8
  /** 중력 계수 (수명 진행에 따라 제곱 감소) */
  gravity?: number;                       // default 0.1
  /** 난기류 강도 */
  turbulenceStrength?: number;            // default 2.0
  /** 파티클 픽셀 크기(기저) */
  particleSize?: number;                  // default 0.15
  /** 파티클 색상 */
  color?: THREE.ColorRepresentation;      // default "#ffffff"
  /** 바람 벡터 (Directional 모드에서 사용) */
  wind?: THREE.Vector3;                   // default (0,0,0)
  /** 바람 모드 */
  windMode?: WindMode;                    // default "Turbulence"
  /** 깊이 테스트/쓰기로 '가림' 효과 */
  depthWrite?: boolean;                   // default true
  depthTest?: boolean;                    // default true
  alphaTest?: number;                     // default 0.5
  /** 스폰 직후 표면에 머무는 시간(초). 이 시간 이후부터 이동 시작 */
  stickTime?: number;                     // default 0
}

function randRange(min: number, max: number){
  return min + Math.random() * (max - min);
}

const WIND_MODE_MAP: Record<WindMode, number> = {
  "Directional": 0,
  "Omni": 1,
  "Turbulence": 2
};

type BakeSpace = "world" | "local";

export class OccludingParticles {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  readonly geometry: THREE.BufferGeometry;

  private options: Required<OccludingParticlesOptions>;

  private totalVertexCount = 0;

  private vertexPosTex?: THREE.DataTexture;
  private vertexNrmTex?: THREE.DataTexture;

  // skinned 추가
  private skinIndexTex?: THREE.DataTexture;
  private skinWeightTex?: THREE.DataTexture;
  private skinnedMesh?: THREE.SkinnedMesh;
  private skinnedMode = false;

  private aData!: Float32Array;       // age, lifespan, speed, vertexIndex
  private aRotData!: Float32Array;    // rotAngle, rotSpeed

  private time = 0;

  constructor(opts: OccludingParticlesOptions = {}){

    // 기본 옵션
    this.options = {
      particleCount: opts.particleCount ?? 1000,
      lifespanRange: opts.lifespanRange ?? [0.1, 1.0],
      initialSpeedRange: opts.initialSpeedRange ?? [0.2, 0.6],
      riseSpeed: opts.riseSpeed ?? 0.3,
      gravity: opts.gravity ?? 0.1,
      turbulenceStrength: opts.turbulenceStrength ?? 2.0,
      particleSize: opts.particleSize ?? 0.5,
      color: opts.color ?? "#000000",
      wind: opts.wind ?? new THREE.Vector3(0,0,0),
      windMode: opts.windMode ?? "Turbulence",
      depthWrite: opts.depthWrite ?? true,
      depthTest: opts.depthTest ?? true,
      alphaTest: opts.alphaTest ?? 0.5,
      stickTime: opts.stickTime ?? 0.1,
    };

    // 지오메트리 & 어트리뷰트 생성
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.options.particleCount * 3); // placeholder
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.aData = new Float32Array(this.options.particleCount * 4);
    this.aRotData = new Float32Array(this.options.particleCount * 2);
    this.geometry.setAttribute("aData", new THREE.BufferAttribute(this.aData, 4));
    this.geometry.setAttribute("aRotationData", new THREE.BufferAttribute(this.aRotData, 2));

    // 머티리얼
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        // common
        uTime:               { value: 0.0 },
        uParticleSize:       { value: this.options.particleSize },
        uRiseSpeed:          { value: this.options.riseSpeed },
        uGravity:            { value: this.options.gravity },
        uTurbulenceStrength: { value: this.options.turbulenceStrength },
        uStickTime:          { value: this.options.stickTime },
        uWind:               { value: this.options.wind.clone() },
        uWindMode:           { value: WIND_MODE_MAP[this.options.windMode] },
        uColor:              { value: new THREE.Color(this.options.color) },

        // vertex/normal
        uVertexPositions:    { value: null },
        uVertexNormals:      { value: null },

        // skinning
        uUseSkinning:        { value: 0 },
        uSkinIndexTex:       { value: null },
        uSkinWeightTex:      { value: null },
        uBoneTexture:        { value: null },
        // uBoneTextureSize:    { value: 0 },
        uBindMatrix:         { value: new THREE.Matrix4() },
        uBindMatrixInverse:  { value: new THREE.Matrix4() },
      },
      vertexShader:   OCP_VERT_GLSL3,
      fragmentShader: OCP_FRAG_GLSL3,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: this.options.depthWrite,
      depthTest:  this.options.depthTest,
      alphaTest:  this.options.alphaTest,
      glslVersion: THREE.GLSL3,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false; // 많은 파티클에서 편의상 비활성화
  }

  /**
   * 정적 타겟(여러 개) 베이크 → DataTexture
   */
  setTargets(
    meshes: (THREE.Mesh | THREE.Object3D)[],
    space: BakeSpace = "world",
    attachToFirstWhenLocal: boolean = true
  ) {
    this.skinnedMode = false;
    this.skinnedMesh = undefined;
    this.material.uniforms.uUseSkinning.value = 0;

    const meshList: THREE.Mesh[] = [];
    const visit = (o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry) {
        meshList.push(o as THREE.Mesh);
      }
      o.children.forEach(visit);
    };
    meshes.forEach(o => visit(o));

    const { posTex, nrmTex, count } = this.bakeVertexTextures(meshList, space);
    this.totalVertexCount = count;

    // 유니폼 연결
    this.disposeVertexTextures();
    this.vertexPosTex = posTex;
    this.vertexNrmTex = nrmTex;

    this.material.uniforms.uVertexPositions.value = this.vertexPosTex;
    this.material.uniforms.uVertexNormals.value   = this.vertexNrmTex;

    // local 모드 & 단일 타겟이면 파티클을 그 메시의 자식으로
    if (space === "local" && meshList.length === 1 && attachToFirstWhenLocal) {
      const target = meshList[0];
      if (this.points.parent !== target) {
        target.add(this.points);
        this.points.position.set(0,0,0);
        this.points.quaternion.identity();
        this.points.scale.set(1,1,1);
      }
    }

    this.reseedAll();
  }

  /**
   * 스키닝 타겟(단일 SkinnedMesh) 설정
   * - 포지션/노멀은 '바인드 포즈' 로컬값을 텍스처로 보관
   * - 셰이더에서 boneTexture + bindMatrix 로 실시간 스키닝
   * - 파티클 Points를 SkinnedMesh의 자식으로 붙여 동일 좌표계 공유
   */
  setSkinnedTarget(skinned: THREE.SkinnedMesh) {
    this.skinnedMode = true;
    this.skinnedMesh = skinned;

    // boneTexture가 준비되도록 갱신
    skinned.skeleton.update();

    // 로컬 좌표(바인드 포즈) 기준 베이크
    const { posTex, nrmTex, idxTex, wgtTex, count } = this.bakeSkinnedVertexTextures(skinned);
    this.totalVertexCount = count;

    this.disposeVertexTextures();
    this.disposeSkinTextures();

    this.vertexPosTex = posTex;
    this.vertexNrmTex = nrmTex;
    this.skinIndexTex = idxTex;
    this.skinWeightTex = wgtTex;

    const s = skinned.skeleton;
    const boneTex = s.boneTexture!;

    // 유니폼 연결
    const u = this.material.uniforms;
    u.uUseSkinning.value       = 1;
    u.uVertexPositions.value   = this.vertexPosTex;
    u.uVertexNormals.value     = this.vertexNrmTex;
    u.uSkinIndexTex.value      = this.skinIndexTex;
    u.uSkinWeightTex.value     = this.skinWeightTex;
    u.uBoneTexture.value       = boneTex;
    // u.uBoneTextureSize.value   = boneSize;
    u.uBindMatrix.value.copy(skinned.bindMatrix);
    u.uBindMatrixInverse.value.copy(skinned.bindMatrixInverse);

    // 파티클을 스키넌드 메시의 자식으로 → 동일 좌표계
    if (this.points.parent !== skinned) {
      skinned.add(this.points);
      this.points.position.set(0,0,0);
      this.points.quaternion.identity();
      this.points.scale.set(1,1,1);
    }

    this.reseedAll();
  }

  /**
   * 업데이트(애니메이션 루프에서 호출)
   * - 스키닝 모드에서는 boneTexture 갱신을 보장
   */
  update(deltaTime: number, elapsedTime?: number){
    this.time += deltaTime;
    const t = (elapsedTime !== undefined) ? elapsedTime : this.time;
    this.material.uniforms.uTime.value = t;

    if (this.skinnedMode && this.skinnedMesh) {
      // boneTexture / boneMatrices 최신화
      this.skinnedMesh.skeleton.update();
      // boneTexture 객체는 동일, 텍스처 데이터만 갱신됩니다.
    }

    if (!this.totalVertexCount) return;

    const aData = this.aData;
    const aRot  = this.aRotData;
    const count = this.options.particleCount;

    const [lifeMin, lifeMax] = this.options.lifespanRange;
    const [spdMin,  spdMax ] = this.options.initialSpeedRange;

    for (let i=0; i<count; i++){
      const i4 = i * 4;
      let age = aData[i4 + 0];
      const lifespan = aData[i4 + 1];

      age += deltaTime;
      if (age > lifespan) {
        // Respawn
        aData[i4 + 0] = 0.0;
        aData[i4 + 1] = randRange(lifeMin, lifeMax);
        aData[i4 + 2] = randRange(spdMin, spdMax);
        aData[i4 + 3] = Math.floor(Math.random() * this.totalVertexCount);

        const i2 = i * 2;
        aRot[i2 + 0] = Math.random() * Math.PI * 2.0;     // angle
        aRot[i2 + 1] = (Math.random() * 2.0 - 1.0) * 2.0; // speed
      } else {
        aData[i4 + 0] = age;
      }
    }

    (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * 파라미터 갱신(일부만 전달 가능)
   */
  setOptions(partial: Partial<OccludingParticlesOptions>){
    Object.assign(this.options, partial);

    const u = this.material.uniforms;

    if (partial.particleSize !== undefined) u.uParticleSize.value = this.options.particleSize;
    if (partial.riseSpeed !== undefined)    u.uRiseSpeed.value = this.options.riseSpeed;
    if (partial.gravity !== undefined)      u.uGravity.value = this.options.gravity;
    if (partial.turbulenceStrength !== undefined) u.uTurbulenceStrength.value = this.options.turbulenceStrength;
    if (partial.stickTime !== undefined)    u.uStickTime.value = this.options.stickTime;
    if (partial.color !== undefined)        u.uColor.value.set(this.options.color);
    if (partial.wind !== undefined)         u.uWind.value.copy(this.options.wind);
    if (partial.windMode !== undefined)     u.uWindMode.value = WIND_MODE_MAP[this.options.windMode];
    if (partial.alphaTest !== undefined)    this.material.alphaTest = this.options.alphaTest;
    if (partial.depthWrite !== undefined)   this.material.depthWrite = this.options.depthWrite;
    if (partial.depthTest !== undefined)    this.material.depthTest = this.options.depthTest;

    if (partial.particleCount !== undefined) {
      // 개수 변경 시 지오메트리/버퍼 재생성
      this.rebuildGeometry(this.options.particleCount);
      this.reseedAll();
    }
  }

  dispose(){
    this.geometry.dispose();
    this.material.dispose();
    this.disposeVertexTextures();
    this.disposeSkinTextures();
  }

  // ==========================
  // 내부 유틸
  // ==========================

  private rebuildGeometry(newCount: number){
    // 기존 attribute 제거
    this.geometry.deleteAttribute("position");
    this.geometry.deleteAttribute("aData");
    this.geometry.deleteAttribute("aRotationData");

    const positions = new Float32Array(newCount * 3);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.aData = new Float32Array(newCount * 4);
    this.aRotData = new Float32Array(newCount * 2);
    this.geometry.setAttribute("aData", new THREE.BufferAttribute(this.aData, 4));
    this.geometry.setAttribute("aRotationData", new THREE.BufferAttribute(this.aRotData, 2));
  }

  private reseedAll(){
    if (!this.totalVertexCount) return;

    const [lifeMin, lifeMax] = this.options.lifespanRange;
    const [spdMin,  spdMax ] = this.options.initialSpeedRange;

    for (let i=0; i<this.options.particleCount; i++){
      const i4 = i*4, i2 = i*2;
      this.aData[i4 + 0] = 0.0;
      this.aData[i4 + 1] = randRange(lifeMin, lifeMax);
      this.aData[i4 + 2] = randRange(spdMin, spdMax);
      this.aData[i4 + 3] = Math.floor(Math.random() * this.totalVertexCount);

      this.aRotData[i2 + 0] = Math.random() * Math.PI * 2.0;
      this.aRotData[i2 + 1] = (Math.random() * 2.0 - 1.0) * 2.0;
    }
    (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;
  }

  private disposeVertexTextures(){
    this.vertexPosTex?.dispose();
    this.vertexNrmTex?.dispose();
    this.vertexPosTex = undefined;
    this.vertexNrmTex = undefined;
  }
  private disposeSkinTextures(){
    this.skinIndexTex?.dispose();
    this.skinWeightTex?.dispose();
    this.skinIndexTex = undefined;
    this.skinWeightTex = undefined;
  }

  /**
   * 여러 Mesh의 (월드/로컬) 정점/법선을 단일 DataTexture로 베이크
   */
  private bakeVertexTextures(meshes: THREE.Mesh[], space: BakeSpace){
    // 총 정점 수 계산
    let total = 0;
    for (const m of meshes){
      const pos = m.geometry.attributes.position;
      if (!pos) continue;
      total += pos.count;
    }

    if (total === 0){
      // 빈 1px 텍스처라도 제공
      const tex = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType);
      tex.needsUpdate = true;
      const clone = tex.clone(); clone.needsUpdate = true;
      return { posTex: tex, nrmTex: clone, count: 0 };
    }

    const texSize = Math.ceil(Math.sqrt(total));
    const pxCount = texSize * texSize;
    const posData = new Float32Array(pxCount * 4);
    const nrmData = new Float32Array(pxCount * 4);

    let writeIdx = 0;

    const tmpPos = new THREE.Vector3();
    const tmpNrm = new THREE.Vector3();
    const nm = new THREE.Matrix3();

    for (const m of meshes){
      const g = m.geometry as THREE.BufferGeometry;
      const pos = g.attributes.position as THREE.BufferAttribute;
      const nrm = g.attributes.normal as THREE.BufferAttribute | undefined;

      let matWorld: THREE.Matrix4 | undefined;
      if (space === "world") {
        m.updateWorldMatrix(true, false);
        matWorld = m.matrixWorld;
        nm.getNormalMatrix(matWorld);
      }

      for (let i=0; i<pos.count; i++){
        tmpPos.fromBufferAttribute(pos, i);
        if (nrm) tmpNrm.fromBufferAttribute(nrm, i); else tmpNrm.set(0,1,0);

        if (space === "world") {
          tmpPos.applyMatrix4(matWorld!);
          tmpNrm.applyMatrix3(nm).normalize();
        }

        const i4 = writeIdx * 4;
        posData[i4+0] = tmpPos.x; posData[i4+1] = tmpPos.y; posData[i4+2] = tmpPos.z; posData[i4+3] = 1.0;
        nrmData[i4+0] = tmpNrm.x; nrmData[i4+1] = tmpNrm.y; nrmData[i4+2] = tmpNrm.z; nrmData[i4+3] = 0.0;
        writeIdx++;
      }
    }

    const posTex = new THREE.DataTexture(posData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    const nrmTex = new THREE.DataTexture(nrmData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    posTex.needsUpdate = true; nrmTex.needsUpdate = true;
    posTex.magFilter = THREE.NearestFilter; posTex.minFilter = THREE.NearestFilter;
    nrmTex.magFilter = THREE.NearestFilter; nrmTex.minFilter = THREE.NearestFilter;

    return { posTex, nrmTex, count: total };
  }

  /**
   * SkinnedMesh용: 바인드 포즈의 local position/normal + skinIndex/skinWeight 텍스처 생성
   */
  private bakeSkinnedVertexTextures(skinned: THREE.SkinnedMesh) {
    const g = skinned.geometry as THREE.BufferGeometry;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nrm = g.attributes.normal as THREE.BufferAttribute | undefined;
    const skinIndex = g.attributes.skinIndex as THREE.BufferAttribute | undefined;
    const skinWeight = g.attributes.skinWeight as THREE.BufferAttribute | undefined;

    if (!pos || !skinIndex || !skinWeight) {
      throw new Error("[OccludingParticles] SkinnedMesh geometry must have position/skinIndex/skinWeight.");
    }

    const count = pos.count;
    const texSize = Math.ceil(Math.sqrt(count));
    const pxCount = texSize * texSize;

    const posData = new Float32Array(pxCount * 4);
    const nrmData = new Float32Array(pxCount * 4);
    const idxData = new Float32Array(pxCount * 4);
    const wgtData = new Float32Array(pxCount * 4);

    const tmpPos = new THREE.Vector3();
    const tmpNrm = new THREE.Vector3();

    for (let i=0; i<count; i++){
      tmpPos.fromBufferAttribute(pos, i);
      if (nrm) tmpNrm.fromBufferAttribute(nrm, i); else tmpNrm.set(0,1,0);

      const i4 = i * 4;
      posData[i4+0] = tmpPos.x; posData[i4+1] = tmpPos.y; posData[i4+2] = tmpPos.z; posData[i4+3] = 1.0;
      nrmData[i4+0] = tmpNrm.x; nrmData[i4+1] = tmpNrm.y; nrmData[i4+2] = tmpNrm.z; nrmData[i4+3] = 0.0;

      // skin index/weight는 그 자체를 float로 저장
      const si = skinIndex as THREE.BufferAttribute;
      const sw = skinWeight as THREE.BufferAttribute;

      idxData[i4+0] = si.getX(i);
      idxData[i4+1] = si.getY(i);
      idxData[i4+2] = si.getZ(i);
      idxData[i4+3] = si.getW(i);

      wgtData[i4+0] = sw.getX(i);
      wgtData[i4+1] = sw.getY(i);
      wgtData[i4+2] = sw.getZ(i);
      wgtData[i4+3] = sw.getW(i);
    }

    const posTex = new THREE.DataTexture(posData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    const nrmTex = new THREE.DataTexture(nrmData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    const idxTex = new THREE.DataTexture(idxData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    const wgtTex = new THREE.DataTexture(wgtData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);

    for (const t of [posTex, nrmTex, idxTex, wgtTex]) {
      t.needsUpdate = true;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    }

    return { posTex, nrmTex, idxTex, wgtTex, count };
  }
}


export const OCP_VERT_GLSL3 = /* glsl */`
precision highp float;

in vec4 aData;            // x:age, y:lifetime, z:speed, w:vertexIndex
in vec2 aRotationData;    // x:rotAngle, y:rotSpeed

uniform float uTime;
uniform float uParticleSize;
uniform float uRiseSpeed;
uniform float uGravity;
uniform float uTurbulenceStrength;
uniform float uStickTime;
uniform vec3  uWind;
uniform int   uWindMode;

/* ====== Static/Skinned 공통: 정점/법선 텍스처 ====== */
uniform sampler2D uVertexPositions; // RGBA32F
uniform sampler2D uVertexNormals;   // RGBA32F

/* ====== Skinned 모드 관련 ====== */
uniform int   uUseSkinning;           // 0: 정적, 1: 스키닝 사용
uniform sampler2D uSkinIndexTex;      // RGBA: skinIndex.xyzw (float 보관)
uniform sampler2D uSkinWeightTex;     // RGBA: skinWeight.xyzw
uniform sampler2D uBoneTexture;       // 뼈 팔레트 텍스처
uniform mat4  uBindMatrix;
uniform mat4  uBindMatrixInverse;

out float vAlpha;
out float vRotation;

/* -------- simplex noise (2D) -------- */
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                 + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0),
                          dot(x12.xy,x12.xy),
                          dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
/* ------------------------------------ */

ivec2 idxToTexCoord(int index, int texSize){
  return ivec2(index % texSize, index / texSize);
}
vec3 fetchVec3(sampler2D tex, int index, int texSize){
  ivec2 tc = idxToTexCoord(index, texSize);
  return texelFetch(tex, tc, 0).xyz;
}
vec4 fetchVec4(sampler2D tex, int index, int texSize){
  ivec2 tc = idxToTexCoord(index, texSize);
  return texelFetch(tex, tc, 0);
}

/* === boneTexture에서 bone matrix 읽기: textureSize 사용 === */
mat4 getBoneMatrix(const in float i) {
  int ii = int(i);
  int j = ii * 4;
  int texW = textureSize(uBoneTexture, 0).x;
  int x = j % texW;
  int y = j / texW;
  vec4 v1 = texelFetch(uBoneTexture, ivec2(x + 0, y), 0);
  vec4 v2 = texelFetch(uBoneTexture, ivec2(x + 1, y), 0);
  vec4 v3 = texelFetch(uBoneTexture, ivec2(x + 2, y), 0);
  vec4 v4 = texelFetch(uBoneTexture, ivec2(x + 3, y), 0);
  return mat4(v1, v2, v3, v4);
}

void main(){
  float age        = aData.x;
  float lifespan   = aData.y;
  float speed      = aData.z;
  int   vIndex     = int(aData.w);

  float rotation   = aRotationData.x;
  float rotSpeed   = aRotationData.y;

  if (lifespan <= 0.0 || age > lifespan) {
    gl_Position = vec4(0.0);
    vAlpha = 0.0;
    return;
  }

  int texSize = textureSize(uVertexPositions, 0).x;
  vec3 basePos = fetchVec3(uVertexPositions, vIndex, texSize);
  vec3 baseNrm = normalize(fetchVec3(uVertexNormals,  vIndex, texSize));

  /* ====== 스키닝 적용 (현재 포즈로 보정) ====== */
  if (uUseSkinning == 1) {
    int skinTexSize = textureSize(uSkinIndexTex, 0).x; // index/weight 동일 사이즈
    vec4 skinI = fetchVec4(uSkinIndexTex,  vIndex, skinTexSize);
    vec4 skinW = fetchVec4(uSkinWeightTex, vIndex, skinTexSize);

    // bind -> bone -> bind^-1
    vec4 bindPos = uBindMatrix * vec4(basePos, 1.0);

    mat4 boneMatX = getBoneMatrix(skinI.x);
    mat4 boneMatY = getBoneMatrix(skinI.y);
    mat4 boneMatZ = getBoneMatrix(skinI.z);
    mat4 boneMatW = getBoneMatrix(skinI.w);

    mat4 skinMatrix =
        boneMatX * skinW.x +
        boneMatY * skinW.y +
        boneMatZ * skinW.z +
        boneMatW * skinW.w;

    vec4 skinnedPos4 = uBindMatrixInverse * (skinMatrix * bindPos);
    basePos = skinnedPos4.xyz;

    // 법선 근사 스키닝
    vec4 bindNrm = uBindMatrix * vec4(baseNrm, 0.0);
    vec4 skinnedN4 = uBindMatrixInverse * (skinMatrix * bindNrm);
    baseNrm = normalize(skinnedN4.xyz);
  }

  float progress = age / lifespan;

  // 바람
  vec3 windForce = vec3(0.0);
  if (uWindMode == 0) { // Directional
    windForce = uWind;
  } else if (uWindMode == 1) { // Omni
    windForce = normalize(basePos) * length(uWind);
  } else { // Turbulence
    float f = 1.0, amp = 1.0;
    for (int i=0; i<3; ++i){
      windForce += vec3(
        snoise(basePos.yz*f + uTime*0.2),
        snoise(basePos.xz*f + uTime*0.3),
        snoise(basePos.xy*f + uTime*0.4)
      ) * amp;
      f *= 2.0; amp *= 0.5;
    }
    windForce *= uTurbulenceStrength;
  }

  // 스폰 직후 stickTime 만큼 정점에 고정
  float adv = max(0.0, age - uStickTime);

  // 상승 + 중력
  vec3 velocity = windForce + vec3(0.0, uRiseSpeed, 0.0)
                - vec3(0.0, uGravity * progress * progress, 0.0);

  // 법선 방향 확산 + 바람 이동
  vec3 newPos = basePos + (baseNrm * speed * adv) + (velocity * adv);

  vec4 mv = modelViewMatrix * vec4(newPos, 1.0);
  gl_Position = projectionMatrix * mv;

  // 크기: 벨 커브 * 원근 보정
  float sizeCurve = 4.0 * progress * (1.0 - progress);
  gl_PointSize = uParticleSize * sizeCurve * 300.0 / max(0.0001, -mv.z);

  // 투명도 페이드
  float fadeIn  = smoothstep(0.0, 0.1, progress);
  float fadeOut = 1.0 - smoothstep(0.9, 1.0, progress);
  vAlpha = fadeIn * fadeOut;

  vRotation = rotation + age * rotSpeed;
}
`;


export const OCP_FRAG_GLSL3 = /* glsl */`
precision highp float;

uniform vec3 uColor;

in float vAlpha;
in float vRotation;

out vec4 outColor;

void main(){
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);

  float mask = smoothstep(0.5, 0.48, dist);
  if (mask <= 0.0) discard;

  outColor = vec4(uColor, vAlpha * mask);
}
`;
;