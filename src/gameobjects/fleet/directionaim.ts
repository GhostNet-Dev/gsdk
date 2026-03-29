import * as THREE from "three"

export type FleetAimInput = {
  headingDeg: number
  pitchDeg?: number
}

export type FleetAimSnapshot = FleetAimInput & {
  normalizedHeadingDeg: number
  cardinal: "N" | "E" | "S" | "W"
  direction: THREE.Vector3
}

export function normalizeHeadingDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360
}

export function getCardinalLabel(headingDeg: number): "N" | "E" | "S" | "W" {
  const normalized = normalizeHeadingDegrees(headingDeg)
  if (normalized >= 315 || normalized < 45) return "N"
  if (normalized < 135) return "E"
  if (normalized < 225) return "S"
  return "W"
}

export function directionFromHeadingPitch(headingDeg: number, pitchDeg = 0) {
  const headingRad = THREE.MathUtils.degToRad(headingDeg)
  const pitchRad = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(pitchDeg, -89.9, 89.9))
  const horizontal = Math.cos(pitchRad)

  return new THREE.Vector3(
    Math.sin(headingRad) * horizontal,
    Math.sin(pitchRad),
    Math.cos(headingRad) * horizontal,
  ).normalize()
}

export function aimSnapshotFromInput(input: FleetAimInput): FleetAimSnapshot {
  const normalizedHeadingDeg = normalizeHeadingDegrees(input.headingDeg)
  return {
    headingDeg: input.headingDeg,
    pitchDeg: input.pitchDeg ?? 0,
    normalizedHeadingDeg,
    cardinal: getCardinalLabel(normalizedHeadingDeg),
    direction: directionFromHeadingPitch(normalizedHeadingDeg, input.pitchDeg ?? 0),
  }
}

export function destinationFromAim(origin: THREE.Vector3, input: FleetAimInput, distance: number) {
  const snapshot = aimSnapshotFromInput(input)
  const safeDistance = Math.max(0, distance)
  return origin.clone().addScaledVector(snapshot.direction, safeDistance)
}
