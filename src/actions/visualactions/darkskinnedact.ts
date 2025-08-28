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

        // 모델 내의 모든 SkinnedMesh를 찾습니다.
        const allSkinnedMeshes: THREE.SkinnedMesh[] = [];
        obj.traverse(child => {
            if (child instanceof THREE.SkinnedMesh) {
                allSkinnedMeshes.push(child);
            }
        });

        console.log(`총 ${allSkinnedMeshes.length}개의 SkinnedMesh를 발견했습니다.`, allSkinnedMeshes);

        if (allSkinnedMeshes.length > 0) {
            // 사용할 SkinnedMesh의 인덱스를 지정합니다 (0 또는 1 등으로 테스트).
            const targetIndex = 0;
            const skinnedMesh = allSkinnedMeshes[targetIndex];

            console.log(`${targetIndex}번 인덱스의 SkinnedMesh를 타겟으로 설정합니다.`, skinnedMesh);

            // Three.js 최신 버전(r150+)에서는 skinning 속성이 필요 없으며,
            // SkinnedMesh에 유효하고 보이는 재질을 적용하는 것만으로 충분합니다.
            const newVisibleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
            skinnedMesh.traverse(child => {
                if ((child as THREE.Mesh).isMesh) {
                    child.visible = true;
                    (child as THREE.Mesh).material = newVisibleMaterial;
                }
            });

            this.dark.setSkinnedTarget(skinnedMesh);

            // (디버깅용) 스켈레톤 헬퍼를 씬에 추가하여 애니메이션을 시각적으로 확인
            const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
            this.scean.add(skeletonHelper);

        } else {
            console.log("SkinnedMesh를 찾지 못했습니다. 정적 모드로 실행합니다.");
            this.dark.setTargets([obj], "local", true);
        }

        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        this.scean.add(this.dark.points)
    }

    deactivate(target: IActionUser, context?: ActionContext | undefined): void {
        this.dark?.dispose()
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        if (this.dark) {
            // 씬에서 파티클 시스템의 부모를 찾아 안전하게 제거
            const parent = this.dark.points.parent;
            if (parent) {
                parent.remove(this.dark.points);
            }
        }
    }

    update(delta: number): void {
        if (this.dark) {
            this.dark.update(delta);
        }
    }
}

export type WindMode = "Directional" | "Omni" | "Turbulence";

export interface OccludingParticlesOptions {
    particleCount?: number;
    lifespanRange?: [number, number];
    initialSpeedRange?: [number, number];
    riseSpeed?: number;
    gravity?: number;
    turbulenceStrength?: number;
    particleSize?: number;
    color?: THREE.ColorRepresentation;
    wind?: THREE.Vector3;
    windMode?: WindMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    alphaTest?: number;
    stickTime?: number;
}

function randRange(min: number, max: number) {
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

    private skinIndexTex?: THREE.DataTexture;
    private skinWeightTex?: THREE.DataTexture;
    private skinnedMesh?: THREE.SkinnedMesh;
    private skinnedMode = false;

    private aData!: Float32Array;
    private aRotData!: Float32Array;
    private time = 0;

    // ✨ 제어를 위한 내부 상태 변수
    private paused = false;
    private emitting = true;
    private lastBurstIndex = 0;

    constructor(opts: OccludingParticlesOptions = {}) {
        this.options = {
            particleCount: opts.particleCount ?? 1000,
            lifespanRange: opts.lifespanRange ?? [0.1, 1.0],
            initialSpeedRange: opts.initialSpeedRange ?? [0.2, 0.6],
            riseSpeed: opts.riseSpeed ?? 0.3,
            gravity: opts.gravity ?? 0.1,
            turbulenceStrength: opts.turbulenceStrength ?? 2.0,
            particleSize: opts.particleSize ?? 0.5,
            color: opts.color ?? "#000000",
            wind: opts.wind ?? new THREE.Vector3(0, 0, 0),
            windMode: opts.windMode ?? "Turbulence",
            depthWrite: opts.depthWrite ?? true,
            depthTest: opts.depthTest ?? true,
            alphaTest: opts.alphaTest ?? 0.5,
            stickTime: opts.stickTime ?? 0.1,
        };

        this.geometry = new THREE.BufferGeometry();
        this.aData = new Float32Array(this.options.particleCount * 4);
        this.aRotData = new Float32Array(this.options.particleCount * 2);
        this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.options.particleCount * 3), 3));
        this.geometry.setAttribute("aData", new THREE.BufferAttribute(this.aData, 4));
        this.geometry.setAttribute("aRotationData", new THREE.BufferAttribute(this.aRotData, 2));

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uParticleSize: { value: this.options.particleSize },
                uRiseSpeed: { value: this.options.riseSpeed },
                uGravity: { value: this.options.gravity },
                uTurbulenceStrength: { value: this.options.turbulenceStrength },
                uStickTime: { value: this.options.stickTime },
                uWind: { value: this.options.wind.clone() },
                uWindMode: { value: WIND_MODE_MAP[this.options.windMode] },
                uColor: { value: new THREE.Color(this.options.color) },
                uVertexPositions: { value: null },
                uVertexNormals: { value: null },
                uUseSkinning: { value: 0 },
                uSkinIndexTex: { value: null },
                uSkinWeightTex: { value: null },
                uBoneTexture: { value: null },
                uBindMatrix: { value: new THREE.Matrix4() },
                uBindMatrixInverse: { value: new THREE.Matrix4() },
                uModelMatrix: { value: new THREE.Matrix4() },
            },
            vertexShader: OCP_VERT_GLSL3,
            fragmentShader: OCP_FRAG_GLSL3,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: this.options.depthWrite,
            depthTest: this.options.depthTest,
            alphaTest: this.options.alphaTest,
            glslVersion: THREE.GLSL3,
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
    }

    setSkinnedTarget(skinned: THREE.SkinnedMesh) {
        this.skinnedMode = true;
        this.skinnedMesh = skinned;

        const { posTex, nrmTex, idxTex, wgtTex, count } = this.bakeSkinnedVertexTextures(skinned);
        this.totalVertexCount = count;

        this.disposeVertexTextures();
        this.disposeSkinTextures();

        this.vertexPosTex = posTex;
        this.vertexNrmTex = nrmTex;
        this.skinIndexTex = idxTex;
        this.skinWeightTex = wgtTex;

        const s = skinned.skeleton;
        s.computeBoneTexture();
        const boneTex = s.boneTexture!;

        const u = this.material.uniforms;
        u.uUseSkinning.value = 1;
        u.uVertexPositions.value = this.vertexPosTex;
        u.uVertexNormals.value = this.vertexNrmTex;
        u.uSkinIndexTex.value = this.skinIndexTex;
        u.uSkinWeightTex.value = this.skinWeightTex;
        u.uBoneTexture.value = boneTex;
        u.uBindMatrix.value.copy(skinned.bindMatrix);
        u.uBindMatrixInverse.value.copy(skinned.bindMatrixInverse);

        this.reseedAll();
    }

    setTargets(meshes: (THREE.Mesh | THREE.Object3D)[], space: BakeSpace = "world", attachToFirstWhenLocal: boolean = true) {
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

        this.disposeVertexTextures();
        this.vertexPosTex = posTex;
        this.vertexNrmTex = nrmTex;

        this.material.uniforms.uVertexPositions.value = this.vertexPosTex;
        this.material.uniforms.uVertexNormals.value = this.vertexNrmTex;

        if (space === "local" && meshList.length > 0 && attachToFirstWhenLocal) {
            const target = meshes[0];
            if (this.points.parent !== target) {
                target.add(this.points);
            }
        }
        this.reseedAll();
    }

    update(deltaTime: number): void {
        if (this.paused) return;

        this.time += deltaTime;
        this.material.uniforms.uTime.value = this.time;

        if (this.skinnedMode && this.skinnedMesh) {
            this.skinnedMesh.skeleton.update();
            this.skinnedMesh.updateWorldMatrix(true, false);
            this.material.uniforms.uModelMatrix.value.copy(this.skinnedMesh.matrixWorld);
        }

        if (!this.totalVertexCount) return;

        const aData = this.aData;
        const count = this.options.particleCount;

        for (let i = 0; i < count; i++) {
            const i4 = i * 4;
            let age = aData[i4 + 0];
            const lifespan = aData[i4 + 1];

            if (lifespan > 0) {
                age += deltaTime;
                if (age > lifespan) {
                    if (this.emitting) {
                        this.respawnParticle(i);
                    } else {
                        aData[i4 + 1] = 0.0; // Mark as dead
                    }
                } else {
                    aData[i4 + 0] = age;
                }
            }
        }
        (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
        (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;
    }

    // ✨ --- NEW CONTROL FUNCTIONS --- ✨

    public pause(): void { this.paused = true; }
    public resume(): void { this.paused = false; }
    public stopEmission(): void { this.emitting = false; }
    public startEmission(): void { this.emitting = true; }

    public clear(): void {
        for (let i = 0; i < this.options.particleCount; i++) {
            this.aData[i * 4 + 1] = 0.0; // Set lifespan to 0 to kill particle
        }
        (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
    }

    public burst(count: number): void {
        if (!this.totalVertexCount) return;
        let emittedCount = 0;
        for (let i = 0; i < this.options.particleCount; i++) {
            const searchIndex = (this.lastBurstIndex + i) % this.options.particleCount;
            const lifespan = this.aData[searchIndex * 4 + 1];

            if (lifespan <= 0) {
                this.respawnParticle(searchIndex);
                emittedCount++;
                if (emittedCount >= count) {
                    this.lastBurstIndex = searchIndex + 1;
                    break;
                }
            }
        }
        (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
        (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;
    }

    // ✨ --- HELPER AND EXISTING FUNCTIONS --- ✨

    private respawnParticle(index: number): void {
        const [lifeMin, lifeMax] = this.options.lifespanRange;
        const [spdMin, spdMax] = this.options.initialSpeedRange;
        const i4 = index * 4;
        const i2 = index * 2;

        this.aData[i4 + 0] = 0.0; // age
        this.aData[i4 + 1] = randRange(lifeMin, lifeMax); // lifespan
        this.aData[i4 + 2] = randRange(spdMin, spdMax); // speed
        this.aData[i4 + 3] = Math.floor(Math.random() * this.totalVertexCount); // vertexIndex

        this.aRotData[i2 + 0] = Math.random() * Math.PI * 2.0; // angle
        this.aRotData[i2 + 1] = (Math.random() * 2.0 - 1.0) * 2.0; // rotSpeed
    }

    setOptions(partial: Partial<OccludingParticlesOptions>) {
        Object.assign(this.options, partial);
        const u = this.material.uniforms;
        if (partial.particleSize !== undefined) u.uParticleSize.value = this.options.particleSize;
        if (partial.riseSpeed !== undefined) u.uRiseSpeed.value = this.options.riseSpeed;
        if (partial.gravity !== undefined) u.uGravity.value = this.options.gravity;
        if (partial.turbulenceStrength !== undefined) u.uTurbulenceStrength.value = this.options.turbulenceStrength;
        if (partial.stickTime !== undefined) u.uStickTime.value = this.options.stickTime;
        if (partial.color !== undefined) u.uColor.value.set(this.options.color);
        if (partial.wind !== undefined) u.uWind.value.copy(this.options.wind);
        if (partial.windMode !== undefined) u.uWindMode.value = WIND_MODE_MAP[this.options.windMode];
        if (partial.alphaTest !== undefined) this.material.alphaTest = this.options.alphaTest;
        if (partial.depthWrite !== undefined) this.material.depthWrite = this.options.depthWrite;
        if (partial.depthTest !== undefined) this.material.depthTest = this.options.depthTest;
        if (partial.particleCount !== undefined) {
            this.rebuildGeometry(this.options.particleCount);
            this.reseedAll();
        }
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.disposeVertexTextures();
        this.disposeSkinTextures();
    }

    private rebuildGeometry(newCount: number) {
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

    private reseedAll() {
        if (!this.totalVertexCount) return;
        for (let i = 0; i < this.options.particleCount; i++) {
            this.respawnParticle(i);
        }
        (this.geometry.getAttribute("aData") as THREE.BufferAttribute).needsUpdate = true;
        (this.geometry.getAttribute("aRotationData") as THREE.BufferAttribute).needsUpdate = true;
    }

    private disposeVertexTextures() {
        this.vertexPosTex?.dispose();
        this.vertexNrmTex?.dispose();
        this.vertexPosTex = undefined;
        this.vertexNrmTex = undefined;
    }

    private disposeSkinTextures() {
        this.skinIndexTex?.dispose();
        this.skinWeightTex?.dispose();
        this.skinIndexTex = undefined;
        this.skinWeightTex = undefined;
    }

    private bakeVertexTextures(meshes: THREE.Mesh[], space: BakeSpace) {
        let total = 0;
        for (const m of meshes) {
            total += m.geometry.attributes.position.count;
        }
        if (total === 0) {
            const tex = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType);
            return { posTex: tex, nrmTex: tex.clone(), count: 0 };
        }
        const texSize = Math.ceil(Math.sqrt(total));
        const posData = new Float32Array(texSize * texSize * 4);
        const nrmData = new Float32Array(texSize * texSize * 4);
        let writeIdx = 0;
        const tmpPos = new THREE.Vector3();
        const tmpNrm = new THREE.Vector3();
        const nm = new THREE.Matrix3();
        for (const m of meshes) {
            const g = m.geometry;
            const pos = g.attributes.position;
            const nrm = g.attributes.normal;
            if (space === "world") {
                m.updateWorldMatrix(true, false);
                nm.getNormalMatrix(m.matrixWorld);
            }
            for (let i = 0; i < pos.count; i++) {
                tmpPos.fromBufferAttribute(pos, i);
                if (nrm) tmpNrm.fromBufferAttribute(nrm, i); else tmpNrm.set(0, 1, 0);
                if (space === "world") {
                    tmpPos.applyMatrix4(m.matrixWorld);
                    tmpNrm.applyMatrix3(nm).normalize();
                }
                posData.set([tmpPos.x, tmpPos.y, tmpPos.z, 1.0], writeIdx * 4);
                nrmData.set([tmpNrm.x, tmpNrm.y, tmpNrm.z, 0.0], writeIdx * 4);
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

    private bakeSkinnedVertexTextures(skinned: THREE.SkinnedMesh) {
        const g = skinned.geometry;
        const pos = g.attributes.position;
        const nrm = g.attributes.normal;
        const skinIndex = g.attributes.skinIndex;
        const skinWeight = g.attributes.skinWeight;
        if (!pos || !skinIndex || !skinWeight) {
            throw new Error("[OccludingParticles] SkinnedMesh geometry must have position/skinIndex/skinWeight.");
        }
        const count = pos.count;
        const texSize = Math.ceil(Math.sqrt(count));
        const posData = new Float32Array(texSize * texSize * 4);
        const nrmData = new Float32Array(texSize * texSize * 4);
        const idxData = new Float32Array(texSize * texSize * 4);
        const wgtData = new Float32Array(texSize * texSize * 4);
        const tmpPos = new THREE.Vector3();
        const tmpNrm = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
            tmpPos.fromBufferAttribute(pos, i);
            if (nrm) tmpNrm.fromBufferAttribute(nrm, i); else tmpNrm.set(0, 1, 0);
            const i4 = i * 4;
            posData.set([tmpPos.x, tmpPos.y, tmpPos.z, 1.0], i4);
            nrmData.set([tmpNrm.x, tmpNrm.y, tmpNrm.z, 0.0], i4);
            idxData.set([skinIndex.getX(i), skinIndex.getY(i), skinIndex.getZ(i), skinIndex.getW(i)], i4);
            wgtData.set([skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i)], i4);
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

// Shaders.ts

export const OCP_VERT_GLSL3 = /* glsl */`
precision highp float;

// Attributes
in vec4 aData;
in vec2 aRotationData;

// Uniforms
uniform float uTime;
uniform float uParticleSize;
uniform float uRiseSpeed;
uniform float uGravity;
uniform float uTurbulenceStrength;
uniform float uStickTime;
uniform vec3  uWind;
uniform int   uWindMode;

// Skinned Mesh Uniforms
uniform mat4 uModelMatrix; // The world matrix of the SkinnedMesh
uniform sampler2D uVertexPositions;
uniform sampler2D uVertexNormals;
uniform int   uUseSkinning;
uniform sampler2D uSkinIndexTex;
uniform sampler2D uSkinWeightTex;
uniform sampler2D uBoneTexture;
uniform mat4  uBindMatrix;
uniform mat4  uBindMatrixInverse;

// Varyings
out float vAlpha;
out float vRotation;

/* simplex noise (2D) - (unchanged) */
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
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

// Helper functions (unchanged)
ivec2 idxToTexCoord(int index, int texSize){ return ivec2(index % texSize, index / texSize); }
vec3 fetchVec3(sampler2D tex, int index, int texSize){ return texelFetch(tex, idxToTexCoord(index, texSize), 0).xyz; }
vec4 fetchVec4(sampler2D tex, int index, int texSize){ return texelFetch(tex, idxToTexCoord(index, texSize), 0); }
mat4 getBoneMatrix(const in float i) {
  int boneIdx = int(i);
  ivec2 texSize = textureSize(uBoneTexture, 0);
  int matStartIndex = boneIdx * 16;
  vec4 v1, v2, v3, v4;
  int offset = 0;
  v1.x = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v1.y = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v1.z = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v1.w = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v2.x = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v2.y = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v2.z = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v2.w = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v3.x = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v3.y = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v3.z = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v3.w = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v4.x = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v4.y = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v4.z = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
  v4.w = texelFetch(uBoneTexture, ivec2( (matStartIndex + offset++) % texSize.x, (matStartIndex + offset -1) / texSize.x), 0).r;
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

    mat4 boneMatX = getBoneMatrix(skinI.x);
    mat4 boneMatY = getBoneMatrix(skinI.y);
    mat4 boneMatZ = getBoneMatrix(skinI.z);
    mat4 boneMatW = getBoneMatrix(skinI.w);

    mat4 skinMatrix = boneMatX * skinW.x + boneMatY * skinW.y + boneMatZ * skinW.z + boneMatW * skinW.w;
    vec4 skinnedPos = uBindMatrixInverse * skinMatrix * uBindMatrix * vec4(basePos, 1.0);
    basePos = skinnedPos.xyz;

    mat3 skinNormalMatrix = mat3(transpose(inverse(uBindMatrixInverse * skinMatrix * uBindMatrix)));
    baseNrm = normalize(skinNormalMatrix * baseNrm);
  }

  float progress = age / lifespan;

  vec3 windForce = vec3(0.0);
  if (uWindMode == 0) { windForce = uWind; } 
  else if (uWindMode == 1) { windForce = normalize(basePos) * length(uWind); } 
  else {
    float f = 1.0, amp = 1.0;
    for (int i=0; i<3; ++i){
      windForce += vec3(snoise(basePos.yz*f + uTime*0.2), snoise(basePos.xz*f + uTime*0.3), snoise(basePos.xy*f + uTime*0.4)) * amp;
      f *= 2.0; amp *= 0.5;
    }
    windForce *= uTurbulenceStrength;
  }

  float adv = max(0.0, age - uStickTime);
  vec3 velocity = windForce + vec3(0.0, uRiseSpeed, 0.0) - vec3(0.0, uGravity * progress * progress, 0.0);
  vec3 newPos = basePos + (baseNrm * speed * adv) + (velocity * adv);

  // Final position calculation
  vec4 worldPos = uModelMatrix * vec4(newPos, 1.0);
  vec4 mv = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mv;

  // Point size and alpha
  float sizeCurve = 4.0 * progress * (1.0 - progress);
  gl_PointSize = uParticleSize * sizeCurve * 300.0 / max(0.0001, -mv.z);
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
`
