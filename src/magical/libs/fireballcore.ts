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

type FireballParticle = THREE.Sprite & {
  userData: {
    life: number
    age: number
    velocity: THREE.Vector3
    noiseOffset: number
  }
}

export class FireballCore {
  readonly root: THREE.Group

  private emitter: THREE.Mesh
  private particles: FireballParticle[] = []
  private particleTexture: THREE.CanvasTexture

  private particleCount: number
  private radius: number
  private riseSpeed: number
  private expansionSpeed: number
  private turbulence: number
  private baseScale: number
  private lifeTime: number
  private opacity: number

  private colorCore: THREE.Color
  private colorAura: THREE.Color
  private colorRing: THREE.Color

  constructor(options: FireballCoreOptions = {}) {
    const scale = options.scale ?? 1

    this.particleCount = options.particleCount ?? 200
    this.radius = (options.radius ?? 0.8) * scale
    this.riseSpeed = (options.riseSpeed ?? 1.5) * scale
    this.expansionSpeed = (options.expansionSpeed ?? 0.5) * scale
    this.turbulence = (options.turbulence ?? 1.5) * scale
    this.baseScale = (options.baseScale ?? 1) * scale
    this.lifeTime = options.lifeTime ?? 0.6
    this.opacity = options.opacity ?? 0.7

    this.colorCore = new THREE.Color(options.colorCore ?? "#ffffcc")
    this.colorAura = new THREE.Color(options.colorAura ?? "#ff9900")
    this.colorRing = new THREE.Color(options.colorRing ?? "#ff2200")

    this.root = new THREE.Group()

    this.emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 * scale),
      new THREE.MeshBasicMaterial({ visible: false }),
    )

    const coreLight = new THREE.PointLight(
      options.lightColor ?? 0xffaa00,
      options.lightIntensity ?? 20,
      options.lightRange ?? 10,
    )
    this.emitter.add(coreLight)
    this.root.add(this.emitter)

    this.particleTexture = this.createHexagonTexture()
    this.initParticles()
  }

  setPosition(position: THREE.Vector3) {
    this.emitter.position.copy(position)
  }

  reset(position: THREE.Vector3) {
    this.setPosition(position)
    this.particles.forEach((sprite) => this.spawnParticle(sprite))
  }

  update(elapsedSec: number, deltaSec: number) {
    this.particles.forEach((sprite) => {
      const u = sprite.userData
      u.age += deltaSec

      if (u.age > u.life) this.spawnParticle(sprite)

      sprite.position.x += u.velocity.x * this.expansionSpeed * deltaSec
      sprite.position.y += (u.velocity.y + this.riseSpeed) * deltaSec
      sprite.position.z += u.velocity.z * this.expansionSpeed * deltaSec

      sprite.position.x += Math.sin(elapsedSec * 5 + u.noiseOffset) * deltaSec * this.turbulence
      sprite.position.y += Math.cos(elapsedSec * 3 + u.noiseOffset) * deltaSec * this.turbulence

      const lifeRatio = u.age / u.life
      const scaleCurve = Math.sin(lifeRatio * Math.PI)
      const scale = scaleCurve * this.baseScale * (1 + lifeRatio * 1.5)

      sprite.scale.setScalar(scale)

      const mat = sprite.material as THREE.SpriteMaterial
      mat.opacity = this.opacity * scaleCurve

      const finalColor = this.colorCore.clone()
      if (lifeRatio < 0.3) {
        finalColor.lerp(this.colorAura, lifeRatio / 0.3)
      } else {
        finalColor.copy(this.colorAura).lerp(this.colorRing, (lifeRatio - 0.3) / 0.7)
      }

      mat.color.copy(finalColor)
    })
  }

  dispose() {
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      mesh.geometry?.dispose?.()

      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    })

    this.particleTexture.dispose()
  }

  private createHexagonTexture() {
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width = size
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

  private initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.particleTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const sprite = new THREE.Sprite(material) as FireballParticle
      sprite.userData = {
        life: 0,
        age: 0,
        velocity: new THREE.Vector3(),
        noiseOffset: Math.random() * 100,
      }

      this.root.add(sprite)
      this.particles.push(sprite)
      this.spawnParticle(sprite)
    }
  }

  private spawnParticle(sprite: FireballParticle) {
    sprite.userData.age = 0
    sprite.userData.life = Math.random() * this.lifeTime + 0.2

    const center = this.emitter.position
    const r = Math.pow(Math.random(), 1 / 3) * this.radius
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const offsetX = r * Math.sin(phi) * Math.cos(theta)
    const offsetY = r * Math.sin(phi) * Math.sin(theta)
    const offsetZ = r * Math.cos(phi)

    sprite.position.set(center.x + offsetX, center.y + offsetY, center.z + offsetZ)
    sprite.userData.velocity
      .set(offsetX * 2, offsetY * 2 + Math.random() * 2, offsetZ * 2)
      .normalize()

    const mat = sprite.material as THREE.SpriteMaterial
    mat.rotation = Math.random() * Math.PI
  }
}

export function createFireballCore(options?: FireballCoreOptions) {
  return new FireballCore(options)
}
