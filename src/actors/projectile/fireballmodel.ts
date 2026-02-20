import * as THREE from "three";
import { IProjectileModel } from "./projectile";
import { createFireballCore, FireballCore, FireballCoreOptions } from "@Glibs/magical/libs/fireballcore";

export class FireballModel implements IProjectileModel {
    private core: FireballCore;
    private clock: THREE.Clock;
    private alive = false;
    private fading = false;
    private fadeElapsed = 0;
    private fadeDuration = 0.28;

    get Meshs() { return this.core.root; }

    constructor(options: FireballCoreOptions = { scale: 0.72 }) {
        this.core = createFireballCore(options);
        this.core.root.visible = false;
        this.clock = new THREE.Clock();
    }

    create(position: THREE.Vector3): void {
        this.core.root.visible = true;
        this.alive = true;
        this.fading = false;
        this.fadeElapsed = 0;
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

    updateRelease(delta: number): void {
        if (!this.fading) return;

        this.fadeElapsed += delta;
        const fadeRemain = Math.max(0, 1 - (this.fadeElapsed / this.fadeDuration));
        this.core.setFade(fadeRemain);

        const frameDelta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        this.core.update(elapsed, frameDelta);

        if (this.fadeElapsed >= this.fadeDuration) {
            this.fading = false;
            this.core.root.visible = false;
            this.core.setFade(1);
        }
    }

    isReleaseFinished(): boolean {
        return !this.fading;
    }

    release(): void {
        if (!this.alive && !this.fading) return;
        this.alive = false;
        this.fading = true;
        this.fadeElapsed = 0;
        this.core.stopEmission();
    }
}
