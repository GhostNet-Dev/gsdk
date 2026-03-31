import { IPhysicsObject } from "@Glibs/interface/iobject";
import * as THREE from "three";

export enum CameraMode {
    TopView,
    ThirdPerson,
    ThirdFollowPerson,
    FirstPerson,
    Free,
    Cinematic,
    AimThirdPerson,
    Grid,
    SpaceWar,
    Restore
}

export type CameraTrackTargetKind = "ship" | "fleet" | "point"

export interface ICameraTrackTarget {
    getTrackPosition(out?: THREE.Vector3): THREE.Vector3
    getTrackLookTarget?(out?: THREE.Vector3): THREE.Vector3
    getTrackRadius?(): number
    getTrackKind?(): CameraTrackTargetKind
}

export interface ICameraStrategy {
    init?(camera: THREE.PerspectiveCamera): void
    uninit?(camera: THREE.PerspectiveCamera): void
    update(camera: THREE.Camera, player?: IPhysicsObject): void
    orbitStart?(): void
    orbitEnd?(): void
}
