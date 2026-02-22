import { IPhysicsObject } from "@Glibs/interface/iobject";

export enum CameraMode {
    TopView,
    ThirdPerson,
    ThirdFollowPerson,
    FirstPerson,
    Free,
    Cinematic,
    AimThirdPerson
}

export interface ICameraStrategy {
    update(camera: THREE.Camera, player?: IPhysicsObject): void
    orbitStart?(): void
    orbitEnd?(): void
}
