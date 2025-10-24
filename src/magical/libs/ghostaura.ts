// GhostAura.ts — modular ghost/water-aura overlay for any Three.js mesh
// by you + ChatGPT (TS, esm.sh-friendly imports)

import * as THREE from "three";

/** Options for the ghost/water aura effect */
export interface GhostAuraOptions {
  // visual
  color?: string | number;           // hex or css (default: 0x9fe3ff)
  opacity?: number;                  // 0..1 (default: 1)
  brightness?: number;               // default: 1.25
  rimPower?: number;                 // default: 1.8
  rimIntensity?: number;             // default: 2.0
  noiseScale?: number;               // default: 1.4
  noiseSpeed?: number;               // default: 0.35
  distort?: number;                  // default: 0.08
  scanAmp?: number;                  // default: 0.20
  scanSpeed?: number;                // default: 1.1
  flickerAmp?: number;               // default: 0.10
  alphaEdge?: number;                // default: 0.0

  // composition
  ghostScale?: number;               // scale factor applied around visual center (default: 1.05)
  originalOpacity?: number;          // fade original (0..1). Leave undefined to not touch original materials

  // debug
  solidPreview?: boolean;            // show solid debug material instead of shader (default: false)
}

export interface IGhostAura {
  attachTo(target: THREE.Object3D): void;
  detach(): void;
  update(delta: number, elapsed?: number): void;
  setOptions(opts: Partial<GhostAuraOptions>): void;
  dispose(): void;
}

export class GhostAura implements IGhostAura {
  private opts: Required<GhostAuraOptions>;

  private target?: THREE.Object3D;       // original user object (not modified)
  private parent?: THREE.Object3D;       // cached parent to insert ghost beside target
  private ghostRoot?: THREE.Object3D;    // cloned hierarchy for aura

  private ghostMaterial?: THREE.ShaderMaterial;
  private solidMat: THREE.MeshBasicMaterial;
  private savedOriginalMats: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private savedGhostMats: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  private elapsed = 0;

  constructor(options: GhostAuraOptions = {}) {
    this.opts = {
      color: 0x9fe3ff,
      opacity: .5,
      brightness: 1.25,
      rimPower: 1.8,
      rimIntensity: 2.0,
      noiseScale: 1.4,
      noiseSpeed: 1.0,
      distort: 0.25,
      scanAmp: 0.20,
      scanSpeed: 1.1,
      flickerAmp: 0.10,
      alphaEdge: 0.0,
      ghostScale: 1.15,
      originalOpacity: 0.6,
      solidPreview: false,
      ...options,
    } as Required<GhostAuraOptions>;

    this.solidMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.2 });
    this.ghostMaterial = this.makeGhostMaterial();
    this.applyUniformsFromOpts();
  }

  /** Create the ghost shader material */
  private makeGhostMaterial(isSkinned = false) {
    const uniforms = {
      uTime:       { value: 0 },
      uColor:      { value: new THREE.Color(this.opts.color as any) },
      uOpacity:    { value: this.opts.opacity },
      uRimPower:   { value: this.opts.rimPower },
      uRimIntensity:{ value: this.opts.rimIntensity },
      uNoiseScale: { value: this.opts.noiseScale },
      uNoiseSpeed: { value: this.opts.noiseSpeed },
      uDistort:    { value: this.opts.distort },
      uScanAmp:    { value: this.opts.scanAmp },
      uScanSpeed:  { value: this.opts.scanSpeed },
      uBrightness: { value: this.opts.brightness },
      uFlickerAmp: { value: this.opts.flickerAmp },
      uAlphaEdge:  { value: this.opts.alphaEdge },
    } as const;

    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(uniforms),
      vertexShader: GhostAura.vertexShader,
      fragmentShader: GhostAura.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      dithering: true,
    });
    if (isSkinned) mat.defines = { ...(mat.defines || {}), USE_SKINNING: "" };
    return mat;
  }

  /** Public API */
  attachTo(target: THREE.Object3D) {
    this.detach();
    this.target = target;
    this.parent = target.parent || undefined;

    // Clone hierarchy for the ghost overlay
    const ghost = target.clone(true);
    this.ghostRoot = ghost;

    // Compute visual center in WORLD space
    const worldBox = new THREE.Box3().setFromObject(target);
    const centerW = worldBox.getCenter(new THREE.Vector3());

    // Convert the visual center into each mesh's LOCAL space and translate geometry
    // so the local origin becomes the visual center. Then offset object position back.
    // This makes scaling happen around the perceived center without touching the original.
    ghost.traverse((child: any) => {
      if (child.isMesh) {
        // Replace material with ghost material (or solid preview)
        const isSkinned = (child as any).isSkinnedMesh === true;
        const gmat = this.makeGhostMaterial(isSkinned);
        this.savedGhostMats.set(child, child.material);
        child.material = this.opts.solidPreview ? this.solidMat : gmat;

        // Centering for pivoted scaling
        // Compute center in this child's local space
        const centerLocal = child.worldToLocal(centerW.clone());
        if (child.geometry && child.geometry.isBufferGeometry) {
          child.geometry = child.geometry.clone();
          child.geometry.translate(-centerLocal.x, -centerLocal.y, -centerLocal.z);
          // Re-offset the object to keep the same world-space placement
          child.position.add(centerLocal);
        }
      }
    });

    // Insert ghost into the same parent as target (or into target if no parent)
    if (this.parent) {
      this.parent.add(ghost);
    } else {
      target.add(ghost);
    }

    // Apply initial scale around centered pivot
    ghost.scale.multiplyScalar(this.opts.ghostScale);

    // Optionally fade original (non-destructive; restores on detach)
    if (this.opts.originalOpacity !== undefined && this.opts.originalOpacity !== null) {
      this.applyOriginalOpacity(this.opts.originalOpacity);
    }
  }

  detach() {
    if (this.ghostRoot && this.ghostRoot.parent) {
      this.ghostRoot.parent.remove(this.ghostRoot);
    }
    // restore original materials if we changed opacity
    if (this.savedOriginalMats.size > 0) {
      this.savedOriginalMats.forEach((mat, mesh) => {
        if (!mesh) return;
        if (Array.isArray(mat)) mesh.material = mat.map(m => (m as THREE.Material));
        else mesh.material = mat as THREE.Material;
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => (m.transparent = (m as any).transparent));
      });
      this.savedOriginalMats.clear();
    }
    // restore ghost materials (if any were swapped to solid)
    if (this.savedGhostMats.size > 0) {
      this.savedGhostMats.forEach((mat, mesh) => {
        if (mesh) mesh.material = mat;
      });
      this.savedGhostMats.clear();
    }

    this.ghostRoot = undefined;
    this.target = undefined;
    this.parent = undefined;
  }

  update(delta: number, elapsed?: number) {
    if (!this.ghostRoot) return;
    this.elapsed = (elapsed !== undefined) ? elapsed : (this.elapsed + delta);

    // advance time uniform on all ghost materials
    this.ghostRoot.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          const sm = m as THREE.ShaderMaterial;
          if (sm.uniforms && sm.uniforms.uTime) {
            sm.uniforms.uTime.value = this.elapsed;
          }
        }
      }
    });
  }

  setOptions(opts: Partial<GhostAuraOptions>) {
    Object.assign(this.opts, opts);
    // propagate updated uniforms + toggles
    this.applyUniformsFromOpts();

    if (this.ghostRoot) {
      // live re-apply solid preview toggle
      this.ghostRoot.traverse((child: any) => {
        if (child.isMesh) {
          if (this.opts.solidPreview) {
            if (child.material !== this.solidMat) {
              this.savedGhostMats.set(child, child.material);
              child.material = this.solidMat;
            }
          } else {
            // restore ghost shader (fresh instance to be safe)
            const isSkinned = (child as any).isSkinnedMesh === true;
            const gmat = this.makeGhostMaterial(isSkinned);
            this.copyUniformsTo(gmat);
            child.material = gmat;
          }
        }
      });

      // live scale update
      this.ghostRoot.scale.setScalar(this.opts.ghostScale);
    }

    if (opts.originalOpacity !== undefined) {
      this.applyOriginalOpacity(opts.originalOpacity!);
    }
  }

  dispose() {
    // Clean up ghost materials
    if (this.ghostRoot) {
      this.ghostRoot.traverse((child: any) => {
        if (child.isMesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) (m as THREE.Material).dispose?.();
        }
      });
    }
    this.detach();
    this.solidMat.dispose();
  }

  // ---------------- internal helpers ----------------
  private applyUniformsFromOpts() {
    if (!this.ghostMaterial) return;
    this.copyUniformsTo(this.ghostMaterial);
  }

  private copyUniformsTo(mat: THREE.ShaderMaterial) {
    const u = mat.uniforms as any;
    u.uColor.value = new THREE.Color(this.opts.color as any);
    u.uOpacity.value = this.opts.opacity;
    u.uBrightness.value = this.opts.brightness;
    u.uRimPower.value = this.opts.rimPower;
    u.uRimIntensity.value = this.opts.rimIntensity;
    u.uNoiseScale.value = this.opts.noiseScale;
    u.uNoiseSpeed.value = this.opts.noiseSpeed;
    u.uDistort.value = this.opts.distort;
    u.uScanAmp.value = this.opts.scanAmp;
    u.uScanSpeed.value = this.opts.scanSpeed;
    u.uFlickerAmp.value = this.opts.flickerAmp;
    u.uAlphaEdge.value = this.opts.alphaEdge;
  }

  private applyOriginalOpacity(op: number) {
    if (!this.target) return;
    // Save and set on first time; then just update transparently on next calls
    this.target.traverse((child: any) => {
      if (child.isMesh) {
        // Save original material if not saved
        if (!this.savedOriginalMats.has(child)) {
          this.savedOriginalMats.set(child, child.material);
        }
        // Apply opacity on a cloned material (avoid mutating shared materials)
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const cloned = mats.map((m: any) => {
          const c = (m as THREE.Material).clone();
          (c as any).transparent = true;
          (c as any).opacity = op;
          return c;
        });
        child.material = Array.isArray(child.material) ? cloned : cloned[0];
      }
    });
  }

  // ---------------- GLSL (same shading as your HTML) ----------------
  static readonly vertexShader = /* glsl */`
    uniform float uTime, uNoiseScale, uNoiseSpeed, uDistort;
    varying vec3 vWorldPos; varying vec3 vNormalW; varying vec3 vViewDir;

    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz), l=1.0-g; vec3 i1=min(g.xyz,l.zxy), i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx, x2=x0-i2+C.xxx*2.0, x3=x0-1.0+C.xxx*3.0;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z), y_=floor(j-7.0*x_); vec4 x= x_*ns.x+ns.y,    y= y_*ns.x+ns.y,    h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy), b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0, s1=floor(b1)*2.0+1.0, sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy, a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x), p1=vec3(a0.zw,h.y), p2=vec3(a1.xy,h.z), p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m*=m;
      return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    #include <common>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>

    void main(){
      #include <beginnormal_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>

      vec3 worldPos = (modelMatrix * vec4(transformed,1.0)).xyz;
      vec3 worldNormal = normalize(mat3(modelMatrix) * objectNormal);

      float t = uTime * uNoiseSpeed;
      float n = snoise(worldPos * uNoiseScale + vec3(0.0, 0.0, t));

      vec3 distortDirection = normalize(mat3(modelMatrix) * normalize(transformed));
      worldPos += distortDirection * (uDistort * n);

      vWorldPos = worldPos;
      vNormalW  = normalize(worldNormal);
      vViewDir  = normalize(cameraPosition - worldPos);
      gl_Position = projectionMatrix * viewMatrix * vec4(worldPos,1.0);
    }
  `;

  static readonly fragmentShader = /* glsl */`
    precision highp float;
    uniform vec3  uColor;
    uniform float uOpacity,uRimPower,uRimIntensity,uNoiseScale,uNoiseSpeed;
    uniform float uScanAmp,uScanSpeed,uBrightness,uFlickerAmp,uAlphaEdge,uTime;
    varying vec3 vWorldPos, vNormalW, vViewDir;

    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; } 
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz), l=1.0-g; vec3 i1=min(g.xyz,l.zxy), i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx, x2=x0-i2+C.xxx*2.0, x3=x0-1.0+C.xxx*3.0;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z), y_=floor(j-7.0*x_); vec4 x= x_*ns.x+ns.y,    y= y_*ns.x+ns.y,    h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy), b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0, s1=floor(b1)*2.0+1.0, sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy, a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x), p1=vec3(a0.zw,h.y), p2=vec3(a1.xy,h.z), p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m*=m;
      return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    void main(){
      float ndv  = clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0);
      float fres = pow(1.0 - ndv, uRimPower) * uRimIntensity;
      float t = uTime * uNoiseSpeed;
      float n = snoise(vWorldPos * uNoiseScale + vec3(0.0, 0.0, t));

      float alphaNoise = smoothstep(uAlphaEdge, 1.0, 0.5 + 0.5*n);
      float scan = (sin((vWorldPos.y + t*2.0) * 6.28318 * uScanSpeed) * 0.5 + 0.5) * uScanAmp;
      float flick = (sin(t*7.3) * 0.5 + 0.5) * uFlickerAmp;
      float alpha = clamp(uOpacity * (0.55*alphaNoise + 0.25*fres + 0.2 + scan), 0.0, 1.0);
      vec3  col   = uColor * (uBrightness + 0.8*fres + scan + flick);
      gl_FragColor = vec4(col, alpha);
    }
  `;
}

// ---------------- Usage example (ESM) ----------------
// import { GhostAura } from './GhostAura.ts';
// const aura = new GhostAura({ ghostScale: 1.07, color: '#9fe3ff', originalOpacity: 0.6 });
// aura.attachTo(batMeshOrGroup);
// on render loop: aura.update(delta, elapsed);
// to tweak later: aura.setOptions({ ghostScale: 1.12, noiseScale: 2.0 });
// to remove: aura.detach(); aura.dispose();
