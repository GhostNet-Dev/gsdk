import * as THREE from "three";
import { IProjectileModel } from "./projectile";
import { createFireballCore, FireballCore, FireballCoreOptions } from "@Glibs/magical/libs/fireballcore";

export class FireballModel implements IProjectileModel {
    private group: THREE.Group;
    private core: FireballCore;
    private clock: THREE.Clock;
    private alive = false;

    get Meshs() { return this.group; }

    constructor(options: FireballCoreOptions = { scale: 1 }) {
        this.group = new THREE.Group();
        this.core = createFireballCore(options);
        this.group.add(this.core.root);
        this.group.visible = false;
        this.clock = new THREE.Clock();
    }

    create(position: THREE.Vector3): void {
        this.group.visible = true;
        this.alive = true;
        this.clock.start();
        this.group.position.copy(position);
    }

    update(position: THREE.Vector3): void {
        if (!this.alive) return;
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        this.group.position.copy(position);
        this.core.update(elapsed, delta);
    }

    release(): void {
        this.alive = false;
        this.group.visible = false;
    }
}
