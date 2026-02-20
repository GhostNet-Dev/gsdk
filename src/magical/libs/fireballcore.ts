import * as THREE from "three"

export type FireballCoreOptions = {
  scale?: number
  colorCore?: THREE.ColorRepresentation
  colorAura?: THREE.ColorRepresentation
  colorRing?: THREE.ColorRepresentation
}

export class FireballCore {
  readonly root: THREE.Group

  private core: THREE.Mesh
  private aura: THREE.Mesh
  private rings: THREE.Mesh[] = []
  private rotSpeed: number[] = []

  constructor(options: FireballCoreOptions = {}) {
    const scale = options.scale ?? 1

    this.root = new THREE.Group()

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.26 * scale, 20, 20),
      new THREE.MeshBasicMaterial({
        color: options.colorCore ?? "#ffd7a3",
        transparent: true,
        opacity: 0.95,
      }),
    )

    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.42 * scale, 18, 18),
      new THREE.MeshBasicMaterial({
        color: options.colorAura ?? "#ff6a00",
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )

    this.root.add(this.core, this.aura)

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.34 * scale, 0.43 * scale, 32),
        new THREE.MeshBasicMaterial({
          color: options.colorRing ?? "#ffb347",
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      )
      ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      this.rotSpeed.push(0.5 + Math.random() * 1.3)
      this.rings.push(ring)
      this.root.add(ring)
    }

    const light = new THREE.PointLight(0xff8a2a, 3, 8)
    this.root.add(light)
  }

  setPosition(position: THREE.Vector3) {
    this.root.position.copy(position)
  }

  update(elapsedSec: number, deltaSec: number) {
    const pulse = 1 + Math.sin(elapsedSec * 8) * 0.06
    this.aura.scale.setScalar(pulse)

    this.rings.forEach((ring, i) => {
      const spin = this.rotSpeed[i] * deltaSec
      ring.rotation.x += spin
      ring.rotation.y -= spin * 0.7
      ring.rotation.z += spin * 0.45
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.32 + Math.sin(elapsedSec * 6 + i) * 0.14
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
