import * as THREE from "three";
import { GalaxySkyboxOptions } from "../galaxy/galaxytypes";
import { ILoop } from "@Glibs/interface/ievent";
import { IWorldMapObject } from "@Glibs/types/worldmaptypes";
import { MapEntryType } from "../worldmap/worldmaptypes";

export class GalaxySkybox implements ILoop, IWorldMapObject {
  LoopId: number = 0;
  get Mesh() { return this.group; }
  readonly Type = MapEntryType.GalaxySkybox;

  private readonly group = new THREE.Group();
  private readonly sparkleGroup = new THREE.Group();
  private readonly nebulaGroup = new THREE.Group();

  private stars?: THREE.Points;
  private dust?: THREE.Points;
  private dome?: THREE.Mesh;

  private nebulaMaterials: THREE.ShaderMaterial[] = [];
  private created = false;

  constructor(
    private scene: THREE.Scene,
    private options: GalaxySkyboxOptions = {}
  ) {
  }

  Create(options: GalaxySkyboxOptions) {
    this.options = { ...this.options, ...options };

    if (this.created) {
      this.clearGroup();
    }

    const starTexture = this.createRadialTexture([
      [0.00, "rgba(255,255,255,1.0)"],
      [0.14, "rgba(255,255,255,0.98)"],
      [0.42, "rgba(185,220,255,0.34)"],
      [1.00, "rgba(0,0,0,0.0)"]
    ], 256);

    const sparkleTexture = this.createSparkleTexture(512);

    this.createGradientDome();
    this.stars = this.createStars(starTexture, this.options.starCount ?? 12000, this.options.starRadius ?? 2200);
    this.dust = this.createDust(starTexture, this.options.dustCount ?? 2200);

    this.group.add(this.stars);
    this.group.add(this.dust);

    this.createSparkles(sparkleTexture);
    this.createNebulaPlanes();

    this.group.add(this.sparkleGroup);
    this.group.add(this.nebulaGroup);

    if (!this.group.parent) {
      this.scene.add(this.group);
    }

    this.created = true;
    return this.group
  }

  Delete() {
    this.dispose();
  }

  update(_delta: number, elapsed: number): void {
    if (!this.created) return;

    if (this.stars) this.stars.rotation.y += 0.00004;
    if (this.dust) this.dust.rotation.y -= 0.00015;
    this.nebulaGroup.rotation.y += 0.00004;

    this.nebulaMaterials.forEach((mat, i) => {
      if (mat.uniforms?.uTime) {
        mat.uniforms.uTime.value = elapsed + i * 2.7;
      }
    });

    this.sparkleGroup.children.forEach((obj, i) => {
      const sprite = obj as THREE.Sprite;
      const mat = sprite.material as THREE.SpriteMaterial;
      if (!mat) return;
      mat.opacity = 0.8 + Math.sin(elapsed * (1.15 + i * 0.12) + i) * 0.18;
    });
  }

  dispose(): void {
    this.clearGroup();
    if (this.group.parent === this.scene) {
      this.scene.remove(this.group);
    }
    this.created = false;
  }

  private clearGroup(): void {
    this.nebulaMaterials = [];
    this.stars = undefined;
    this.dust = undefined;
    this.dome = undefined;

    const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
      if (Array.isArray(material)) {
        material.forEach((m) => disposeMaterial(m));
        return;
      }

      const anyMat = material as any;
      const textureKeys = [
        "map", "alphaMap", "aoMap", "bumpMap", "normalMap", "roughnessMap",
        "metalnessMap", "emissiveMap", "displacementMap", "specularMap"
      ];

      for (const key of textureKeys) {
        if (anyMat[key] && typeof anyMat[key].dispose === "function") {
          anyMat[key].dispose();
        }
      }

      material.dispose();
    };

    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).geometry) {
        (mesh as any).geometry.dispose?.();
      }
      if ((mesh as any).material) {
        disposeMaterial((mesh as any).material);
      }
    });

    while (this.sparkleGroup.children.length > 0) {
      this.sparkleGroup.remove(this.sparkleGroup.children[0]);
    }
    while (this.nebulaGroup.children.length > 0) {
      this.nebulaGroup.remove(this.nebulaGroup.children[0]);
    }
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }

  private createGradientDome(): void {
    const vertexShader = `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      varying vec3 vWorldPos;

      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uBottomColor;
      uniform vec3 uGlowColor;
      uniform vec3 uGlowDir;
      uniform float uGlowStrength;

      void main() {
        vec3 dir = normalize(vWorldPos);

        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 baseCol = mix(uBottomColor, uMidColor, smoothstep(0.05, 0.55, h));
        baseCol = mix(baseCol, uTopColor, smoothstep(0.45, 1.0, h));

        float glow = pow(max(dot(dir, normalize(uGlowDir)), 0.0), 5.5);
        glow += pow(max(dot(dir, normalize(uGlowDir)), 0.0), 18.0) * 0.55;

        vec3 col = baseCol + uGlowColor * glow * uGlowStrength;

        float vignette = smoothstep(1.15, 0.15, length(dir.xz) * 0.72 + abs(dir.y) * 0.12);
        col *= mix(0.82, 1.0, vignette);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const geo = new THREE.SphereGeometry(2600, 40, 24);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x5c8ee2) },
        uMidColor: { value: new THREE.Color(0x14336f) },
        uBottomColor: { value: new THREE.Color(0x010205) },
        uGlowColor: { value: new THREE.Color(0x6ea8ff) },
        uGlowDir: { value: new THREE.Vector3(0.12, 0.55, -1.0).normalize() },
        uGlowStrength: { value: 1.45 }
      },
      vertexShader,
      fragmentShader
    });

    this.dome = new THREE.Mesh(geo, mat);
    this.group.add(this.dome);
  }

  private createStars(texture: THREE.Texture, count: number, radius: number): THREE.Points {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = radius * (0.22 + Math.random() * 0.78);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: texture,
        size: 2.0,
        color: 0xf0f6ff,
        transparent: true,
        opacity: 0.99,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      })
    );
  }

  private createDust(texture: THREE.Texture, count: number): THREE.Points {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = THREE.MathUtils.randFloatSpread(520);
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(180);
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(520);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: texture,
        size: 0.95,
        color: 0xc5dcff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
  }

  private createSparkles(texture: THREE.Texture): void {
    const defs: Array<[number, number, number, number, THREE.ColorRepresentation]> = [
      [-120, 36, -90, 7.0, 0xfff3da],
      [-52, 26, -82, 4.4, 0xf8d2ff],
      [16, 42, -104, 7.6, 0xeef5ff],
      [74, 24, -86, 6.1, 0xffefcf],
      [108, -4, -92, 5.0, 0xf4f7ff],
      [-128, -16, -98, 5.6, 0xffe9c7],
      [34, -24, -56, 4.6, 0xfff2df]
    ];

    for (const [x, y, z, s, c] of defs) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          color: c,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      sp.position.set(x, y, z);
      sp.scale.set(s, s, 1);
      this.sparkleGroup.add(sp);
    }
  }

  private createNebulaPlanes(): void {
    const mainNebula = this.createMainNebula(
      260, 72, 2.4, 0.82,
      0x86b8ff, 0xbdefff, 0xffefc9, 0xffd7ad
    );
    mainNebula.position.set(0, -12, -150);
    this.nebulaGroup.add(mainNebula);

    const lowerNebula = this.createMainNebula(
      220, 48, 7.1, 0.42,
      0x9cc6ff, 0xdaf7ff, 0xfff2d8, 0xffe0bf
    );
    lowerNebula.position.set(8, -22, -116);
    lowerNebula.rotation.set(0.01, -0.05, 0.015);
    this.nebulaGroup.add(lowerNebula);

    const topMist = this.createMistNebula(
      220, 38, 11.5, 0.20,
      0x7fb2ff, 0xd9f6ff
    );
    topMist.position.set(0, 32, -182);
    this.nebulaGroup.add(topMist);

    const leftMist = this.createMistNebula(
      110, 28, 3.6, 0.14,
      0x8fb7ff, 0xe9fbff
    );
    leftMist.position.set(-90, 8, -90);
    leftMist.rotation.set(-0.12, 0.18, 0.05);
    this.nebulaGroup.add(leftMist);

    const rightMist = this.createMistNebula(
      110, 28, 6.2, 0.14,
      0x9ab4ff, 0xf4deff
    );
    rightMist.position.set(92, 10, -92);
    rightMist.rotation.set(0.08, -0.18, -0.05);
    this.nebulaGroup.add(rightMist);
  }

  private createMainNebula(
    width: number,
    height: number,
    seed: number,
    opacity: number,
    colorA: THREE.ColorRepresentation,
    colorB: THREE.ColorRepresentation,
    colorC: THREE.ColorRepresentation,
    colorD: THREE.ColorRepresentation
  ): THREE.Mesh {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform float uOpacity;
      uniform float uSeed;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform vec3 uColorD;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 6; i++) {
          v += a * noise(p);
          p = m * p;
          a *= 0.52;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * vec2(4.8, 2.4);
        float t = uTime * 0.018;

        float ridge =
          0.58
          + sin(uv.x * 6.0 + uSeed) * 0.045
          + sin(uv.x * 12.0 + 0.6) * 0.018
          + (fbm(vec2(uv.x * 5.2, 1.2 + uSeed) + vec2(t * 0.7, 0.0)) - 0.5) * 0.18;

        float bodyMask = smoothstep(ridge - 0.03, ridge + 0.14, 1.0 - uv.y);

        float n1 = fbm(p + vec2(t * 0.9, -t * 0.15));
        float n2 = fbm(p * 1.7 + vec2(-t * 0.28, t * 0.35));
        float n3 = fbm((p + n1 * 1.2) * 2.3 - vec2(t * 0.4, t * 0.12));

        float cloud = n1 * 0.50 + n2 * 0.30 + n3 * 0.20;
        cloud = smoothstep(0.24, 0.94, cloud);

        float wisps = fbm(p * 3.2 + vec2(t * 0.85, -t * 0.5));
        wisps = smoothstep(0.50, 0.96, wisps) * 0.36;

        float dust = fbm(p * 2.0 - vec2(0.0, t * 0.08));
        dust = smoothstep(0.38, 0.86, dust);

        float edgeX = smoothstep(0.0, 0.14, uv.x) * (1.0 - smoothstep(0.86, 1.0, uv.x));
        float edgeY = smoothstep(0.0, 0.10, uv.y) * (1.0 - smoothstep(0.90, 1.0, uv.y));
        float softRect = edgeX * edgeY;

        float density = (cloud + wisps) * bodyMask * softRect;

        vec3 col = mix(uColorA, uColorB, smoothstep(0.22, 0.76, n1));
        col = mix(col, uColorC, smoothstep(0.38, 0.86, n2));
        col = mix(col, uColorD, smoothstep(0.60, 0.97, n3));

        col *= 1.0 - dust * bodyMask * 0.22;
        float rim = smoothstep(0.72, 0.98, n3) * 0.35;
        col += vec3(1.0, 0.96, 0.88) * rim;

        gl_FragColor = vec4(col, density * uOpacity);
      }
    `;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
        uSeed: { value: seed },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) },
        uColorC: { value: new THREE.Color(colorC) },
        uColorD: { value: new THREE.Color(colorD) }
      },
      vertexShader,
      fragmentShader
    });

    this.nebulaMaterials.push(material);

    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height, 1, 1),
      material
    );
  }

  private createMistNebula(
    width: number,
    height: number,
    seed: number,
    opacity: number,
    colorA: THREE.ColorRepresentation,
    colorB: THREE.ColorRepresentation
  ): THREE.Mesh {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform float uOpacity;
      uniform float uSeed;
      uniform vec3 uColorA;
      uniform vec3 uColorB;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = m * p;
          a *= 0.54;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float t = uTime * 0.02;

        vec2 p = uv * 2.0 + vec2(uSeed * 0.31, uSeed * 0.17);
        float n1 = fbm(p + vec2(t, -t * 0.3));
        float n2 = fbm(p * 1.9 - vec2(t * 0.22, t * 0.45));

        float density = smoothstep(0.26, 0.92, n1 * 0.68 + n2 * 0.32);
        float dist = length(vec2(uv.x * 0.72, uv.y));
        density *= 1.0 - smoothstep(0.55, 1.15, dist);

        float edgeX = smoothstep(-1.0, -0.72, uv.x) * (1.0 - smoothstep(0.72, 1.0, uv.x));
        float edgeY = smoothstep(-1.0, -0.82, uv.y) * (1.0 - smoothstep(0.82, 1.0, uv.y));
        density *= edgeX * edgeY;

        vec3 col = mix(uColorA, uColorB, smoothstep(0.20, 0.82, n2));
        gl_FragColor = vec4(col, density * uOpacity);
      }
    `;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
        uSeed: { value: seed },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) }
      },
      vertexShader,
      fragmentShader
    });

    this.nebulaMaterials.push(material);

    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height, 1, 1),
      material
    );
  }

  private createRadialTexture(stops: Array<[number, string]>, size = 256): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(
      size * 0.5, size * 0.5, 0,
      size * 0.5, size * 0.5, size * 0.5
    );

    for (const [offset, color] of stops) g.addColorStop(offset, color);

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private createSparkleTexture(size = 512): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const c = size * 0.5;

    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.12, "rgba(255,255,255,0.92)");
    g.addColorStop(0.35, "rgba(180,220,255,0.22)");
    g.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    ctx.translate(c, c);
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineCap = "round";

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-c * 0.72, 0);
    ctx.lineTo(c * 0.72, 0);
    ctx.moveTo(0, -c * 0.72);
    ctx.lineTo(0, c * 0.72);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-c * 0.52, -c * 0.52);
    ctx.lineTo(c * 0.52, c * 0.52);
    ctx.moveTo(c * 0.52, -c * 0.52);
    ctx.lineTo(-c * 0.52, c * 0.52);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
}