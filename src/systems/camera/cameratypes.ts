import { IPhysicsObject } from "@Glibs/interface/iobject";

export enum CameraMode {
    TopView,
    ThirdPerson,
    ThirdFollowPerson,
    FirstPerson,
    Free,
    Cinematic,
    AimThirdPerson,
    Grid,
    Restore
}

export interface ICameraStrategy {
    init?(camera: THREE.PerspectiveCamera): void
    uninit?(camera: THREE.PerspectiveCamera): void
    update(camera: THREE.Camera, player?: IPhysicsObject): void
    orbitStart?(): void
    orbitEnd?(): void
}
