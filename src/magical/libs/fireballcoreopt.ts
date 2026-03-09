import * as THREE from "three"

export type FireballCoreOptions = {
  scale?: number
  colorCore?: THREE.ColorRepresentation
  colorAura?: THREE.ColorRepresentation
  colorRing?: THREE.ColorRepresentation

  particleCount?: number
  radius?: number
  riseSpeed?: number
  expansionSpeed?: number
  turbulence?: number
  baseScale?: number
  lifeTime?: number
  opacity?: number

  lightColor?: THREE.ColorRepresentation
  lightIntensity?: number
  lightRange?: number
}

type ParticleData = {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  age: number
  noiseOffset: number
}

// ---- GLSL shaders ----

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aAlpha;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position  = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (1200.0 / -mvPosition.z);
  }
`

const FRAG = /* glsl */ `
  uniform sampler2D uTexture;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec4 tex   = texture2D(uTexture, gl_PointCoord);
    float alpha = tex.a * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor * tex.rgb, alpha);
  }
`

export class FireballCoreOpt {
  readonly root: THREE.Group

  private static sharedTexture: THREE.CanvasTexture | null = null

  private emitter: THREE.Mesh
  private coreLight: THREE.PointLight

  // Points 기반 파티클
  private points!: THREE.Points
  private geometry!: THREE.BufferGeometry
  private material!: THREE.ShaderMaterial

  private posArr!: Float32Array
  private colorArr!: Float32Array
  private sizeArr!: Float32Array
  private alphaArr!: Float32Array

  private posAttr!: THREE.BufferAttribute
  private colorAttr!: THREE.BufferAttribute
  private sizeAttr!: THREE.BufferAttribute
  private alphaAttr!: THREE.BufferAttribute

  private particles: ParticleData[] = []

  private particleCount: number
  private radius: number
  private riseSpeed: number
  private expansionSpeed: number
  private turbulence: number
  private baseScale: number
  private lifeTime: number
  private opacity: number

  private emissionEnabled = true
  private fadeMultiplier = 1
  private baseLightIntensity: number
  private lastRootPosition = new THREE.Vector3()
  private rootMovement = new THREE.Vector3()

  private colorCore: THREE.Color
  private colorAura: THREE.Color
  private colorRing: THREE.Color
  private _tempColor = new THREE.Color()

  constructor(options: FireballCoreOptions = {}) {
    const scale = options.scale ?? 1

    this.particleCount = options.particleCount ?? 200
    this.radius = (options.radius ?? 0.8) * scale
    this.riseSpeed = (options.riseSpeed ?? 0.8) * scale
    this.expansionSpeed = (options.expansionSpeed ?? 0.5) * scale
    this.turbulence = (options.turbulence ?? 1.5) * scale
    this.baseScale = (options.baseScale ?? 1) * scale
    this.lifeTime = options.lifeTime ?? 1.3
    this.opacity = options.opacity ?? 0.7

    this.colorCore = new THREE.Color(options.colorCore ?? "#ffffcc")
    this.colorAura = new THREE.Color(options.colorAura ?? "#ff9900")
    this.colorRing = new THREE.Color(options.colorRing ?? "#ff2200")

    if (!FireballCoreOpt.sharedTexture) {
      FireballCoreOpt.sharedTexture = this.createHexagonTexture()
    }

    this.root = new THREE.Group()

    this.emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 * scale),
      new THREE.MeshBasicMaterial({ visible: false }),
    )

    this.baseLightIntensity = options.lightIntensity ?? 20
    this.coreLight = new THREE.PointLight(
      options.lightColor ?? 0xffaa00,
      this.baseLightIntensity,
      options.lightRange ?? 10,
    )
    this.emitter.add(this.coreLight)
    this.root.add(this.emitter)

    this.initPoints()
  }

  // ---- public API ----

  setPosition(position: THREE.Vector3) {
    this.root.position.copy(position)
    this.emitter.position.set(0, 0, 0)
  }

  setFade(multiplier: number) {
    this.fadeMultiplier = THREE.MathUtils.clamp(multiplier, 0, 1)
    this.coreLight.intensity = this.baseLightIntensity * this.fadeMultiplier
  }

  startEmission() {
    this.emissionEnabled = true
  }

  stopEmission() {
    this.emissionEnabled = false
  }

  reset(position: THREE.Vector3) {
    this.setPosition(position)
    this.lastRootPosition.copy(this.root.position)
    this.setFade(1)
    this.startEmission()
    for (let i = 0; i < this.particleCount; i++) {
      this.spawnParticle(i)
    }
  }

  update(elapsedSec: number, deltaSec: number) {
    this.rootMovement.copy(this.root.position).sub(this.lastRootPosition)
    this.lastRootPosition.copy(this.root.position)

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i]

      // root가 이동했을 때 파티클 월드 위치 보정
      p.position.sub(this.rootMovement)

      p.age += deltaSec
      if (p.age > p.life) {
        if (this.emissionEnabled) this.spawnParticle(i)
        else p.age = p.life
      }

      p.position.x += p.velocity.x * this.expansionSpeed * deltaSec
      p.position.y += (p.velocity.y + this.riseSpeed) * deltaSec
      p.position.z += p.velocity.z * this.expansionSpeed * deltaSec

      p.position.x += Math.sin(elapsedSec * 5 + p.noiseOffset) * deltaSec * this.turbulence
      p.position.y += Math.cos(elapsedSec * 3 + p.noiseOffset) * deltaSec * this.turbulence

      const lifeRatio = Math.min(1, p.age / p.life)
      const scaleCurve = Math.sin(lifeRatio * Math.PI)
      const size = scaleCurve * this.baseScale * (1 + lifeRatio * 1.5)
      const alpha = this.opacity * scaleCurve * this.fadeMultiplier

      // Color — clone() 없이 _tempColor 재사용
      if (lifeRatio < 0.3) {
        this._tempColor.copy(this.colorCore).lerp(this.colorAura, lifeRatio / 0.3)
      } else {
        this._tempColor.copy(this.colorAura).lerp(this.colorRing, (lifeRatio - 0.3) / 0.7)
      }

      const i3 = i * 3
      this.posArr[i3]     = p.position.x
      this.posArr[i3 + 1] = p.position.y
      this.posArr[i3 + 2] = p.position.z

      this.colorArr[i3]     = this._tempColor.r
      this.colorArr[i3 + 1] = this._tempColor.g
      this.colorArr[i3 + 2] = this._tempColor.b

      this.sizeArr[i]  = Math.max(0, size)
      this.alphaArr[i] = Math.max(0, alpha)
    }

    this.posAttr.needsUpdate   = true
    this.colorAttr.needsUpdate = true
    this.sizeAttr.needsUpdate  = true
    this.alphaAttr.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.emitter.geometry.dispose()
    ;(this.emitter.material as THREE.Material).dispose()
    // sharedTexture은 인스턴스별로 해제하지 않음
  }

  // ---- private ----

  private initPoints() {
    const n = this.particleCount

    this.posArr   = new Float32Array(n * 3)
    this.colorArr = new Float32Array(n * 3)
    this.sizeArr  = new Float32Array(n)
    this.alphaArr = new Float32Array(n)

    this.geometry = new THREE.BufferGeometry()

    this.posAttr   = new THREE.BufferAttribute(this.posArr,   3)
    this.colorAttr = new THREE.BufferAttribute(this.colorArr, 3)
    this.sizeAttr  = new THREE.BufferAttribute(this.sizeArr,  1)
    this.alphaAttr = new THREE.BufferAttribute(this.alphaArr, 1)

    this.posAttr.setUsage(THREE.DynamicDrawUsage)
    this.colorAttr.setUsage(THREE.DynamicDrawUsage)
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage)
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage)

    this.geometry.setAttribute("position", this.posAttr)
    this.geometry.setAttribute("aColor",   this.colorAttr)
    this.geometry.setAttribute("aSize",    this.sizeAttr)
    this.geometry.setAttribute("aAlpha",   this.alphaAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: FireballCoreOpt.sharedTexture } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.root.add(this.points)

    for (let i = 0; i < n; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        age: 0,
        noiseOffset: Math.random() * 100,
      })
      this.spawnParticle(i)
    }
  }

  private spawnParticle(i: number) {
    const p = this.particles[i]
    p.age  = 0
    p.life = Math.random() * this.lifeTime + 0.2

    const r     = Math.pow(Math.random(), 1 / 3) * this.radius
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)

    const offsetX = r * Math.sin(phi) * Math.cos(theta)
    const offsetY = r * Math.sin(phi) * Math.sin(theta)
    const offsetZ = r * Math.cos(phi)

    p.position.set(offsetX, offsetY, offsetZ)
    p.velocity.set(offsetX * 2, offsetY * 2 + Math.random() * 2, offsetZ * 2).normalize()
  }

  private createHexagonTexture() {
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width  = size
    canvas.height = size

    const ctx = canvas.getContext("2d")
    if (!ctx) return new THREE.CanvasTexture(canvas)

    const radius = (size / 2) * 0.9
    ctx.beginPath()

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const x = size / 2 + radius * Math.cos(angle)
      const y = size / 2 + radius * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.closePath()
    ctx.fillStyle = "white"
    ctx.fill()

    return new THREE.CanvasTexture(canvas)
  }
}

export function createFireballCore(options?: FireballCoreOptions) {
  return new FireballCoreOpt(options)
}
