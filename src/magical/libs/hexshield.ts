import * as THREE from "three"

export interface HexShieldOptions {
  radius?: number
  color?: string | number
  hexScale?: number
  baseOpacity?: number
  widthSegments?: number
  heightSegments?: number
}

export class HexShield {
  private readonly mesh: THREE.Mesh
  private readonly material: THREE.ShaderMaterial
  private elapsed = 0

  private readonly uniforms: {
    color: { value: THREE.Color }
    hitPos: { value: THREE.Vector3 }
    hitIntensity: { value: number }
    time: { value: number }
    hexScale: { value: number }
    baseOpacity: { value: number }
  }

  constructor(options: HexShieldOptions = {}) {
    const radius = options.radius ?? 1
    const color = new THREE.Color(options.color ?? 0x33aaff)
    const hexScale = options.hexScale ?? 50.0
    const baseOpacity = options.baseOpacity ?? 1.0
    const widthSegments = options.widthSegments ?? 64
    const heightSegments = options.heightSegments ?? 64

    this.uniforms = {
      color: { value: color },
      hitPos: { value: new THREE.Vector3(0, 1, 0) },
      hitIntensity: { value: 0.0 },
      time: { value: 0.0 },
      hexScale: { value: hexScale },
      baseOpacity: { value: baseOpacity },
    }

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `

    const fragmentShader = `
      uniform vec3 color;
      uniform vec3 hitPos;
      uniform float hitIntensity;
      uniform float time;
      uniform float hexScale;
      uniform float baseOpacity;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      float hexDist(vec2 p) {
        p = abs(p);
        float d = dot(p, normalize(vec2(1.0, 1.73205081)));
        return max(d, p.x);
      }

      float hexGrid(vec2 uv) {
        vec2 r = vec2(1.0, 1.73205081);
        vec2 h = r * 0.5;
        vec2 a = mod(uv, r) - h;
        vec2 b = mod(uv - h, r) - h;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        float x = hexDist(gv);
        return smoothstep(0.35, 0.45, x);
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
        fresnel = pow(fresnel, 3.0);

        float hexLine = hexGrid(vUv * hexScale);
        float dist = distance(normalize(vPosition), normalize(hitPos));
        float hitGlow = exp(-dist * 5.0) * hitIntensity;

        float baseAlpha = fresnel * 0.4 + hexLine * 0.05;
        float finalAlpha = baseAlpha + (hexLine * hitGlow * 1.5) + (hitGlow * 0.3);
        finalAlpha += sin(time * 4.0) * 0.03;
        finalAlpha *= baseOpacity;

        gl_FragColor = vec4(color, clamp(finalAlpha, 0.0, 1.0));
      }
    `

    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments)
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.name = "hex-shield"
    this.mesh.renderOrder = 10
  }

  getMesh(): THREE.Mesh {
    return this.mesh
  }

  triggerHit(localDirection: THREE.Vector3, intensity = 3.0): void {
    if (localDirection.lengthSq() <= 0.000001) return
    this.uniforms.hitPos.value.copy(localDirection).normalize()
    this.uniforms.hitIntensity.value = intensity
  }

  update(delta: number): void {
    this.elapsed += delta
    this.uniforms.time.value = this.elapsed

    if (this.uniforms.hitIntensity.value > 0) {
      this.uniforms.hitIntensity.value = Math.max(0, this.uniforms.hitIntensity.value - delta * 3.0)
    }
  }

  setOpacity(opacity: number): void {
    this.uniforms.baseOpacity.value = opacity
  }

  setHexScale(scale: number): void {
    this.uniforms.hexScale.value = scale
  }

  setColor(colorHex: string | number): void {
    this.uniforms.color.value.set(colorHex)
  }

  setVisible(visible: boolean): void {
    this.mesh.visible = visible
  }

  dispose(): void {
    this.mesh.removeFromParent()
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
