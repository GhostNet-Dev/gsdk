import * as THREE from "three"

export type FireballCoreOptions = {
  scale?: number
  colorCore?: THREE.ColorRepresentation
  colorAura?: THREE.ColorRepresentation
  colorRing?: THREE.ColorRepresentation

  coreRadius?: number
  coreSegments?: number
  coreOpacity?: number

  auraRadius?: number
  auraSegments?: number
  auraOpacity?: number

  ringCount?: number
  ringInnerRadius?: number
  ringOuterRadius?: number
  ringSegments?: number
  ringOpacity?: number
  ringBaseSpin?: number
  ringRandomSpin?: number

  pulseSpeed?: number
  pulseAmplitude?: number
  ringFlickerBase?: number
  ringFlickerAmplitude?: number
  ringFlickerSpeed?: number

  lightColor?: THREE.ColorRepresentation
  lightIntensity?: number
  lightRange?: number
}

export class FireballCore {
  readonly root: THREE.Group

  private core: THREE.Mesh
  private aura: THREE.Mesh
  private rings: THREE.Mesh[] = []
  private rotSpeed: number[] = []

  private pulseSpeed: number
  private pulseAmplitude: number
  private ringFlickerBase: number
  private ringFlickerAmplitude: number
  private ringFlickerSpeed: number

  constructor(options: FireballCoreOptions = {}) {
    const scale = options.scale ?? 1

    const coreRadius = options.coreRadius ?? 0.24
    const coreSegments = options.coreSegments ?? 24
    const coreOpacity = options.coreOpacity ?? 1.0

    const auraRadius = options.auraRadius ?? 0.5
    const auraSegments = options.auraSegments ?? 22
    const auraOpacity = options.auraOpacity ?? 0.62

    const ringCount = options.ringCount ?? 4
    const ringInnerRadius = options.ringInnerRadius ?? 0.34
    const ringOuterRadius = options.ringOuterRadius ?? 0.46
    const ringSegments = options.ringSegments ?? 48
    const ringOpacity = options.ringOpacity ?? 0.65
    const ringBaseSpin = options.ringBaseSpin ?? 0.9
    const ringRandomSpin = options.ringRandomSpin ?? 1.7

    this.pulseSpeed = options.pulseSpeed ?? 11
    this.pulseAmplitude = options.pulseAmplitude ?? 0.12
    this.ringFlickerBase = options.ringFlickerBase ?? 0.46
    this.ringFlickerAmplitude = options.ringFlickerAmplitude ?? 0.22
    this.ringFlickerSpeed = options.ringFlickerSpeed ?? 8.5

    this.root = new THREE.Group()

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(coreRadius * scale, coreSegments, coreSegments),
      new THREE.MeshBasicMaterial({
        color: options.colorCore ?? "#fff1c2",
        transparent: true,
        opacity: coreOpacity,
      }),
    )

    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * scale, auraSegments, auraSegments),
      new THREE.MeshBasicMaterial({
        color: options.colorAura ?? "#ff5b00",
        transparent: true,
        opacity: auraOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )

    this.root.add(this.core, this.aura)

    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(ringInnerRadius * scale, ringOuterRadius * scale, ringSegments),
        new THREE.MeshBasicMaterial({
          color: options.colorRing ?? "#ffb347",
          transparent: true,
          opacity: ringOpacity,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      )
      ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      this.rotSpeed.push(ringBaseSpin + Math.random() * ringRandomSpin)
      this.rings.push(ring)
      this.root.add(ring)
    }

    const light = new THREE.PointLight(
      options.lightColor ?? 0xff6a00,
      options.lightIntensity ?? 4.6,
      options.lightRange ?? 10,
    )
    this.root.add(light)
  }

  setPosition(position: THREE.Vector3) {
    this.root.position.copy(position)
  }

  update(elapsedSec: number, deltaSec: number) {
    const pulse = 1 + Math.sin(elapsedSec * this.pulseSpeed) * this.pulseAmplitude
    this.aura.scale.setScalar(pulse)

    this.rings.forEach((ring, i) => {
      const spin = this.rotSpeed[i] * deltaSec
      ring.rotation.x += spin
      ring.rotation.y -= spin * 0.7
      ring.rotation.z += spin * 0.45
      ;(ring.material as THREE.MeshBasicMaterial).opacity =
        this.ringFlickerBase + Math.sin(elapsedSec * this.ringFlickerSpeed + i * 0.8) * this.ringFlickerAmplitude
    })
  }

  dispose() {
    const disposeNode = (obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      mesh.geometry?.dispose?.()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose?.()
    }

    this.root.traverse(disposeNode)
  }
}

export function createFireballCore(options?: FireballCoreOptions) {
  return new FireballCore(options)
}
