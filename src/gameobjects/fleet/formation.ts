import * as THREE from "three"

export type FleetFormation = "line" | "column" | "wedge" | "circle"

export type FormationLayoutOptions = {
  anchor: THREE.Vector3
  count: number
  spacing?: number
  facing?: THREE.Vector3
}

export class Formation {
  static layout(kind: FleetFormation, options: FormationLayoutOptions): THREE.Vector3[] {
    const spacing = Math.max(1, options.spacing ?? 6)
    const forward = Formation.resolveForward(options.facing)
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    switch (kind) {
      case "column":
        return Formation.column(options.anchor, options.count, spacing, forward)
      case "wedge":
        return Formation.wedge(options.anchor, options.count, spacing, forward, right)
      case "circle":
        return Formation.circle(options.anchor, options.count, spacing, forward, right)
      case "line":
      default:
        return Formation.line(options.anchor, options.count, spacing, right)
    }
  }

  private static line(anchor: THREE.Vector3, count: number, spacing: number, right: THREE.Vector3) {
    const positions: THREE.Vector3[] = []
    const centerOffset = (count - 1) / 2

    for (let i = 0; i < count; i++) {
      const offset = (i - centerOffset) * spacing
      positions.push(anchor.clone().add(right.clone().multiplyScalar(offset)))
    }

    return positions
  }

  private static column(anchor: THREE.Vector3, count: number, spacing: number, forward: THREE.Vector3) {
    const positions: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      positions.push(anchor.clone().add(forward.clone().multiplyScalar(-i * spacing)))
    }
    return positions
  }

  private static wedge(
    anchor: THREE.Vector3,
    count: number,
    spacing: number,
    forward: THREE.Vector3,
    right: THREE.Vector3,
  ) {
    const positions: THREE.Vector3[] = []
    let row = 0
    let index = 0

    while (index < count) {
      if (row === 0) {
        positions.push(anchor.clone())
        index++
        row++
        continue
      }

      const depth = forward.clone().multiplyScalar(-row * spacing)
      const lateral = row * spacing * 0.75

      const leftPos = anchor.clone().add(depth).add(right.clone().multiplyScalar(-lateral))
      positions.push(leftPos)
      index++
      if (index >= count) break

      const rightPos = anchor.clone().add(depth).add(right.clone().multiplyScalar(lateral))
      positions.push(rightPos)
      index++
      row++
    }

    return positions
  }

  private static circle(
    anchor: THREE.Vector3,
    count: number,
    spacing: number,
    forward: THREE.Vector3,
    right: THREE.Vector3,
  ) {
    if (count <= 1) return [anchor.clone()]

    const radius = Math.max(spacing, (count * spacing) / (Math.PI * 2))
    const positions: THREE.Vector3[] = []

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const lateral = right.clone().multiplyScalar(Math.cos(angle) * radius)
      const longitudinal = forward.clone().multiplyScalar(Math.sin(angle) * radius)
      positions.push(anchor.clone().add(lateral).add(longitudinal))
    }

    return positions
  }

  private static resolveForward(facing?: THREE.Vector3) {
    const candidate = facing?.clone()
    if (!candidate || candidate.lengthSq() === 0) return new THREE.Vector3(0, 0, 1)

    candidate.y = 0
    if (candidate.lengthSq() === 0) return new THREE.Vector3(0, 0, 1)

    return candidate.normalize()
  }
}
