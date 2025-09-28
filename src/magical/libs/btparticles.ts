import * as THREE from "three";

export type WindMode = "Directional" | "Omni" | "Turbulence";

export interface OccludingParticlesOptions {
  particleCount?: number;                 // default 1000
  lifespanRange?: [number, number];       // default [0.1, 1.0]
  initialSpeedRange?: [number, number];   // default [0.2, 0.6]
  riseSpeed?: number;                     // default 0.3
  gravity?: number;                       // default 0.1
  turbulenceStrength?: number;            // default 2.0
  particleSize?: number;                  // default 0.5
  color?: THREE.ColorRepresentation;      // default "#000000"
  wind?: THREE.Vector3;                   // default (0,0,0)
  windMode?: WindMode;                    // default "Turbulence"
  depthWrite?: boolean;                   // default true
  depthTest?: boolean;                    // default true
  alphaTest?: number;                     // default 0.5
  stickTime?: number;                     // default 0.1

  // Spawn fade-in (absolute time)
  spawnFadeIn?: boolean;                  // default true
  spawnFadeInSeconds?: number;            // default 0.2
  maxAlpha?: number;                      // default 1.0
  spawnFadeInPower?: number;              // default 1.0

  // Lifetime fade-out (relative)
  fadeOutStart?: number;                  // default 0.9
  fadeOutEnd?: number;                    // default 1.0
}

function randRange(min: number, max: number){ return min + Math.random() * (max - min); }

const WIND_MODE_MAP: Record<WindMode, number> = { "Directional": 0, "Omni": 1, "Turbulence": 2 };
type BakeSpace = "world" | "local";

export class OccludingParticles {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  readonly geometry: THREE.BufferGeometry;

  private options: Required<OccludingParticlesOptions>;

  private totalVertexCount = 0;

  private vertexPosTex?: THREE.DataTexture;
  private vertexNrmTex?: THREE.DataTexture;

  // skinned
  private skinIndexTex?: THREE.DataTexture;
  private skinWeightTex?: THREE.DataTexture;
  private skinnedMesh?: THREE.SkinnedMesh;
  private skinnedMode = false;

  private aData!: Float32Array;       // age, lifespan, speed, vertexIndex
  private aRotData!: Float32Array;    // rotAngle, rotSpeed

  private time = 0;

  // Smooth scaling state
  private capacity = 0;
  private activeCount = 0;
  private targetActiveCount = 0;
  private fadeOutSeconds = 0.35;
  private shrinkCursor = 0;
  private shrinkPerFrame = 256;

  // 🔒 Respawn 차단 마스크 (1=respawn 금지; 0=허용)
  private killMask!: Uint8Array;

  constructor(opts: OccludingParticlesOptions = {}){
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

      spawnFadeIn: opts.spawnFadeIn ?? true,
      spawnFadeInSeconds: opts.spawnFadeInSeconds ?? 0.2,
      maxAlpha: opts.maxAlpha ?? 1.0,
      spawnFadeInPower: opts.spawnFadeInPower ?? 1.0,
      fadeOutStart: opts.fadeOutStart ?? 0.9,
      fadeOutEnd: opts.fadeOutEnd ?? 1.0,
    };

    this.capacity = this.options.particleCount;
    this.activeCount = this.capacity;
    this.targetActiveCount = this.capacity;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.capacity * 3);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.aData = new Float32Array(this.capacity * 4);
    this.aRotData = new Float32Array(this.capacity * 2);
    this.geometry.setAttribute("aData", new THREE.BufferAttribute(this.aData, 4));
    this.geometry.setAttribute("aRotationData", new THREE.BufferAttribute(this.aRotData, 2));

    // 🔒 killMask 초기화 (모두 0 = respawn 허용)
    this.killMask = new Uint8Array(this.capacity);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime:               { value: 0.0 },
        uParticleSize:       { value: this.options.particleSize },
        uRiseSpeed:          { value: this.options.riseSpeed },
        uGravity:            { value: this.options.gravity },
        uTurbulenceStrength: { value: this.options.turbulenceStrength },
        uStickTime:          { value: this.options.stickTime },
        uWind:               { value: this.options.wind.clone() },
        uWindMode:           { value: WIND_MODE_MAP[this.options.windMode] },
        uColor:              { value: new THREE.Color(this.options.color) },

        // fade in/out
        uEnableFadeIn:       { value: this.options.spawnFadeIn ? 1 : 0 },
        uFadeInSecs:         { value: this.options.spawnFadeInSeconds },
        uFadeInPow:          { value: this.options.spawnFadeInPower },
        uMaxAlpha:           { value: this.options.maxAlpha },
        uFadeOutStart:       { value: this.options.fadeOutStart },
        uFadeOutEnd:         { value: this.options.fadeOutEnd },

        // vertex/normal
        uVertexPositions:    { value: null },
        uVertexNormals:      { value: null },

        // skinning
        uUseSkinning:        { value: 0 },
        uSkinIndexTex:       { value: null },
        uSkinWeightTex:      { value: null },
        uBoneTexture:        { value: null },
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
    this.points.frustumCulled = false;

    this.reseedAll();
  }

  setTargets(meshes: (THREE.Mesh | THREE.Object3D)[], space: BakeSpace = "world", attachToFirstWhenLocal = true) {
    this.skinnedMode = false;
    this.skinnedMesh = undefined;
    this.material.uniforms.uUseSkinning.value = 0;

    const meshList: THREE.Mesh[] = [];
    const visit = (o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry) meshList.push(o as THREE.Mesh);
      o.children.forEach(visit);
    };
    meshes.forEach(o => visit(o));

    const { posTex, nrmTex, count } = this.bakeVertexTextures(meshList, space);
    this.totalVertexCount = count;

    this.disposeVertexTextures();
    this.vertexPosTex = posTex;
    this.vertexNrmTex = nrmTex;

    const u = this.material.uniforms;
    u.uVertexPositions.value = this.vertexPosTex;
    u.uVertexNormals.value   = this.vertexNrmTex;

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

  setSkinnedTarget(skinned: THREE.SkinnedMesh) {
    this.skinnedMode = true;
    this.skinnedMesh = skinned;
    skinned.skeleton.update();

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

    const u = this.material.uniforms;
    u.uUseSkinning.value       = 1;
    u.uVertexPositions.value   = this.vertexPosTex;
    u.uVertexNormals.value     = this.vertexNrmTex;
    u.uSkinIndexTex.value      = this.skinIndexTex;
    u.uSkinWeightTex.value     = this.skinWeightTex;
    u.uBoneTexture.value       = boneTex;
    u.uBindMatrix.value.copy(skinned.bindMatrix);
    u.uBindMatrixInverse.value.copy(skinned.bindMatrixInverse);

    if (this.points.parent !== skinned) {
      skinned.add(this.points);
      this.points.position.set(0,0,0);
      this.points.quaternion.identity();
      this.points.scale.set(1,1,1);
    }

    this.reseedAll();
  }

  update(deltaTime: number, elapsedTime?: number){
    this.time += deltaTime;
    const t = (elapsedTime !== undefined) ? elapsedTime : this.time;
    this.material.uniforms.uTime.value = t;

    if (this.skinnedMode && this.skinnedMesh) this.skinnedMesh.skeleton.update();
    if (!this.totalVertexCount || this.capacity === 0) return;

    const aData = this.aData;
    const aRot  = this.aRotData;
    const cap   = this.capacity;
    const cur   = this.activeCount;
    const tgt   = this.targetActiveCount;

    const [lifeMin, lifeMax] = this.options.lifespanRange;
    const [spdMin,  spdMax ] = this.options.initialSpeedRange;

    // ▼ 감소: target~current 영역을 페이드 아웃 + respawn 금지로 지정
    if (tgt < cur) {
      let marked = 0;
      for (let k = this.shrinkCursor; k < cur && marked < this.shrinkPerFrame; k++) {
        const i4 = k * 4;
        const age = aData[i4 + 0];
        const life= aData[i4 + 1];
        // 아직 살아있는 슬롯만 처리
        if (life > 0.0 && age <= life) {
          aData[i4 + 1] = age + this.fadeOutSeconds; // 곧 죽게 만들고
          this.killMask[k] = 1;                      // 🔒 이후 respawn 금지
          marked++;
        }
      }
      this.shrinkCursor += marked;
      if (this.shrinkCursor >= cur) this.shrinkCursor = tgt;
    }

    // 시뮬레이션
    for (let i=0; i<cap; i++){
      const i4 = i * 4;
      let age = aData[i4 + 0];
      const lifespan = aData[i4 + 1];

      age += deltaTime;

      if (age > lifespan) {
        // respawn은 활성 영역 + killMask==0 에서만 허용
        if (i < this.activeCount && this.killMask[i] === 0) {
          aData[i4 + 0] = 0.0;
          aData[i4 + 1] = randRange(lifeMin, lifeMax);
          aData[i4 + 2] = randRange(spdMin, spdMax);
          aData[i4 + 3] = Math.floor(Math.random() * this.totalVertexCount);

          const i2 = i * 2;
          aRot[i2 + 0] = Math.random() * Math.PI * 2.0;
          aRot[i2 + 1] = (Math.random() * 2.0 - 1.0) * 2.0;
        } else {
          // respawn 금지 또는 비활성 영역이면 죽은 상태 유지
          aData[i4 + 0] = lifespan + 1.0;
        }
      } else {
        aData[i4 + 0] = age;
      }
    }

    // 모든 퇴장 대상이 죽었으면 activeCount 내림
    if (tgt < cur) {
      let allDead = true;
      for (let i=tgt; i<cur; i++) {
        const i4 = i * 4;
        if (aData[i4 + 0] <= aData[i4 + 1]) { allDead = false; break; }
      }
      if (allDead) {
        this.activeCount = tgt;
        // 정리 완료 후, 범위 밖 마스크는 굳이 유지할 필요 없음(옵션)
        for (let i=this.activeCount; i<cur; i++) this.killMask[i] = 0;
      }
    }

    // 증가: 새로 활성화되는 구간의 killMask 해제
    if (tgt > cur) {
      const growStep = Math.min(tgt - cur, this.shrinkPerFrame);
      for (let i=cur; i<cur+growStep; i++) {
        this.killMask[i] = 0; // respawn 허용
        // 다음 사이클에 바로 리스폰되게 살짝 밀어줄 수도 있음(선택):
        // const i4 = i*4; this.aData[i4+0] = this.aData[i4+1] + 1.0;
      }
      this.activeCount += growStep;
    }

    (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;
  }

  setOptions(partial: Partial<OccludingParticlesOptions>){
    Object.assign(this.options, partial);

    const u = this.material.uniforms;

    if (partial.particleSize !== undefined)       u.uParticleSize.value = this.options.particleSize;
    if (partial.riseSpeed !== undefined)          u.uRiseSpeed.value = this.options.riseSpeed;
    if (partial.gravity !== undefined)            u.uGravity.value = this.options.gravity;
    if (partial.turbulenceStrength !== undefined) u.uTurbulenceStrength.value = this.options.turbulenceStrength;
    if (partial.stickTime !== undefined)          u.uStickTime.value = this.options.stickTime;
    if (partial.color !== undefined)              u.uColor.value.set(this.options.color);
    if (partial.wind !== undefined)               u.uWind.value.copy(this.options.wind);
    if (partial.windMode !== undefined)           u.uWindMode.value = WIND_MODE_MAP[this.options.windMode];
    if (partial.alphaTest !== undefined)          this.material.alphaTest = this.options.alphaTest;
    if (partial.depthWrite !== undefined)         this.material.depthWrite = this.options.depthWrite;
    if (partial.depthTest !== undefined)          this.material.depthTest = this.options.depthTest;

    if (partial.spawnFadeIn !== undefined)        u.uEnableFadeIn.value = this.options.spawnFadeIn ? 1 : 0;
    if (partial.spawnFadeInSeconds !== undefined) u.uFadeInSecs.value   = this.options.spawnFadeInSeconds;
    if (partial.spawnFadeInPower !== undefined)   u.uFadeInPow.value    = this.options.spawnFadeInPower;
    if (partial.maxAlpha !== undefined)           u.uMaxAlpha.value     = this.options.maxAlpha;
    if (partial.fadeOutStart !== undefined)       u.uFadeOutStart.value = this.options.fadeOutStart;
    if (partial.fadeOutEnd !== undefined)         u.uFadeOutEnd.value   = this.options.fadeOutEnd;

    if (partial.particleCount !== undefined) {
      const wanted = Math.max(0, partial.particleCount);
      if (wanted > this.capacity) {
        this.ensureCapacity(wanted);
        this.setParticleCountSmooth(wanted);
      } else {
        this.setParticleCountSmooth(wanted);
      }
    }
  }

  /** 부드럽게 목표 파티클 수 변경 */
  setParticleCountSmooth(nextCount: number, opts?: { fadeOutSeconds?: number; shrinkPerFrame?: number }) {
    nextCount = Math.max(0, Math.min(nextCount, this.capacity));
    this.targetActiveCount = nextCount;
    if (opts?.fadeOutSeconds !== undefined) this.fadeOutSeconds = Math.max(0.05, opts.fadeOutSeconds);
    if (opts?.shrinkPerFrame !== undefined) this.shrinkPerFrame = Math.max(1, opts.shrinkPerFrame);

    if (this.targetActiveCount < this.activeCount) {
      // 감소 시작: 커서를 target으로 맞추고, 감소 범위를 respawn 금지로 진행(업데이트 루프에서 마킹)
      this.shrinkCursor = this.targetActiveCount;
      // 즉시 효과를 원하면, 여기서도 한 번 선마킹 가능(선택)
    }
  }

  /** capacity 확장(필요할 때만) + killMask 확장 */
  ensureCapacity(newCapacity: number) {
    if (newCapacity <= this.capacity) return;

    const oldCapacity = this.capacity;
    this.rebuildGeometry(newCapacity);
    this.capacity = newCapacity;

    // killMask 확장
    const newMask = new Uint8Array(newCapacity);
    newMask.set(this.killMask, 0);       // 기존 복사
    // 새 구간은 기본 0 (respawn 허용)
    this.killMask = newMask;

    // 버퍼 갱신 플래그
    (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;

    // active/target 은 기존 유지
    // 새 슬롯은 죽은 상태로 남아 있다가 필요 시 활성화됨
  }

  dispose(){
    this.geometry.dispose();
    this.material.dispose();
    this.disposeVertexTextures();
    this.disposeSkinTextures();
  }

  // ===== utils =====
  private rebuildGeometry(newCapacity: number){
    const oldPos = this.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    const oldA   = this.geometry.getAttribute("aData") as THREE.BufferAttribute | undefined;
    const oldR   = this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute | undefined;

    const oldCapacity = this.capacity;

    const positions = new Float32Array(newCapacity * 3);
    const aData     = new Float32Array(newCapacity * 4);
    const aRotData  = new Float32Array(newCapacity * 2);

    if (oldA && oldR) {
      aData.set((oldA.array as Float32Array).subarray(0, oldCapacity * 4), 0);
      aRotData.set((oldR.array as Float32Array).subarray(0, oldCapacity * 2), 0);
    }
    for (let i = oldCapacity; i < newCapacity; i++) {
      const i4 = i * 4, i2 = i * 2;
      aData[i4 + 0] = 1.0;
      aData[i4 + 1] = 0.0;  // dead
      aData[i4 + 2] = 0.0;
      aData[i4 + 3] = 0.0;
      aRotData[i2 + 0] = 0.0;
      aRotData[i2 + 1] = 0.0;
    }

    if (oldPos) this.geometry.deleteAttribute("position");
    if (oldA)   this.geometry.deleteAttribute("aData");
    if (oldR)   this.geometry.deleteAttribute("aRotationData");

    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("aData", new THREE.BufferAttribute(aData, 4));
    this.geometry.setAttribute("aRotationData", new THREE.BufferAttribute(aRotData, 2));

    this.aData = aData;
    this.aRotData = aRotData;
  }

  private reseedAll(){
    if (!this.totalVertexCount) return;

    const [lifeMin, lifeMax] = this.options.lifespanRange;
    const [spdMin,  spdMax ] = this.options.initialSpeedRange;

    for (let i=0; i<this.capacity; i++){
      const i4 = i*4, i2 = i*2;
      this.aData[i4 + 0] = 0.0;
      this.aData[i4 + 1] = randRange(lifeMin, lifeMax);
      this.aData[i4 + 2] = randRange(spdMin, spdMax);
      this.aData[i4 + 3] = Math.floor(Math.random() * this.totalVertexCount);

      this.aRotData[i2 + 0] = Math.random() * Math.PI * 2.0;
      this.aRotData[i2 + 1] = (Math.random() * 2.0 - 1.0) * 2.0;

      this.killMask[i] = 0; // 초기엔 모두 respawn 허용
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

  private bakeVertexTextures(meshes: THREE.Mesh[], space: BakeSpace){
    let total = 0;
    for (const m of meshes){
      const pos = m.geometry.attributes.position;
      if (!pos) continue;
      total += pos.count;
    }

    if (total === 0){
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

    return { posTex, nrmTex, count: writeIdx };
  }

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

/* ========================= Vertex Shader (GLSL3) ========================= */
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

uniform sampler2D uVertexPositions; // RGBA32F
uniform sampler2D uVertexNormals;   // RGBA32F

uniform int   uUseSkinning;
uniform sampler2D uSkinIndexTex;
uniform sampler2D uSkinWeightTex;
uniform sampler2D uBoneTexture;
uniform mat4  uBindMatrix;
uniform mat4  uBindMatrixInverse;

uniform int   uEnableFadeIn;
uniform float uFadeInSecs;
uniform float uFadeInPow;
uniform float uMaxAlpha;
uniform float uFadeOutStart;
uniform float uFadeOutEnd;

out float vAlpha;
out float vRotation;

/* simplex noise */
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
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
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

ivec2 idxToTexCoord(int index, int texSize){ return ivec2(index % texSize, index / texSize); }
vec3 fetchVec3(sampler2D tex, int index, int texSize){ ivec2 tc = idxToTexCoord(index, texSize); return texelFetch(tex, tc, 0).xyz; }
vec4 fetchVec4(sampler2D tex, int index, int texSize){ ivec2 tc = idxToTexCoord(index, texSize); return texelFetch(tex, tc, 0); }

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

  if (uUseSkinning == 1) {
    int skinTexSize = textureSize(uSkinIndexTex, 0).x;
    vec4 skinI = fetchVec4(uSkinIndexTex,  vIndex, skinTexSize);
    vec4 skinW = fetchVec4(uSkinWeightTex, vIndex, skinTexSize);

    vec4 bindPos = uBindMatrix * vec4(basePos, 1.0);
    mat4 skinMatrix =
        getBoneMatrix(skinI.x) * skinW.x +
        getBoneMatrix(skinI.y) * skinW.y +
        getBoneMatrix(skinI.z) * skinW.z +
        getBoneMatrix(skinI.w) * skinW.w;

    vec4 skinnedPos4 = uBindMatrixInverse * (skinMatrix * bindPos);
    basePos = skinnedPos4.xyz;

    vec4 bindNrm = uBindMatrix * vec4(baseNrm, 0.0);
    vec4 skinnedN4 = uBindMatrixInverse * (skinMatrix * bindNrm);
    baseNrm = normalize(skinnedN4.xyz);
  }

  float progress = age / max(lifespan, 1e-5);

  vec3 windForce = vec3(0.0);
  if (uWindMode == 0) {
    windForce = uWind;
  } else if (uWindMode == 1) {
    windForce = normalize(basePos) * length(uWind);
  } else {
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

  float adv = max(0.0, age - uStickTime);
  vec3 velocity = windForce + vec3(0.0, uRiseSpeed, 0.0) - vec3(0.0, uGravity * progress * progress, 0.0);
  vec3 newPos = basePos + (baseNrm * speed * adv) + (velocity * adv);

  vec4 mv = modelViewMatrix * vec4(newPos, 1.0);
  gl_Position = projectionMatrix * mv;

  float sizeCurve = 4.0 * progress * (1.0 - progress);
  gl_PointSize = uParticleSize * sizeCurve * 300.0 / max(0.0001, -mv.z);

  float fadeIn = 1.0;
  if (uEnableFadeIn == 1) {
    float t = clamp(age / max(uFadeInSecs, 1e-5), 0.0, 1.0);
    fadeIn = pow(t, uFadeInPow);
  }

  float foStart = clamp(uFadeOutStart, 0.0, 1.0);
  float foEnd   = clamp(uFadeOutEnd  , 0.0, 1.0);
  if (foEnd < foStart) { float tmp = foStart; foStart = foEnd; foEnd = tmp; }
  float fadeOut = 1.0 - smoothstep(foStart, foEnd, progress);

  vAlpha = uMaxAlpha * fadeIn * fadeOut;
  vRotation = rotation + age * rotSpeed;
}
`;

/* ======================== Fragment Shader (GLSL3) ======================== */
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
