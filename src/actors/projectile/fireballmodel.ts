import * as THREE from "three";
import { IProjectileModel } from "./projectile";
import { createFireballCore, FireballCore, FireballCoreOptions } from "@Glibs/magical/libs/fireballcore";

export class FireballModel implements IProjectileModel {
    private core: FireballCore;
    private clock: THREE.Clock;
    private alive = false;

    get Meshs() { return this.core.root; }

    constructor(options: FireballCoreOptions = { scale: 1 }) {
        this.core = createFireballCore(options);
        this.core.root.visible = false;
        this.clock = new THREE.Clock();
    }

    create(position: THREE.Vector3): void {
        this.core.root.visible = true;
        this.alive = true;
        this.clock.start();
        this.core.reset(position);
    }

    update(position: THREE.Vector3): void {
        if (!this.alive) return;
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        this.core.setPosition(position);
        this.core.update(elapsed, delta);
    }

    release(): void {
        this.alive = false;
        this.core.root.visible = false;
    }
}
