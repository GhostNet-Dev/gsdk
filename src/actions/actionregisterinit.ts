import * as THREE from "three";
import { ActionRegistry } from "./actionregistry"
import { StatBoostAction } from "./itemactions/statboostact"
import { FireballAction } from "./skillactions/fireballact"
import { MuzzleAction } from "./itemactions/muzzleact";
import { EventController } from "@Glibs/systems/event/eventctrl";
import { BulletCasingAct } from "./itemactions/bulletcasingact";
import { ShakerAction } from "./itemactions/shakeract";
import { FluffyAction } from "./itemactions/fluffyact";
import SwingEffectAction from "./itemactions/swingeffact";
import { DarkAction } from "./visualactions/darkact";

export function InitActionRegistry(eventCtrl: EventController, scene: THREE.Scene) {
    ActionRegistry.register("statBoost", def => new StatBoostAction(def.stats))
    ActionRegistry.register("fireball", def => new FireballAction())
    ActionRegistry.register("casing", def => new BulletCasingAct(eventCtrl, scene, def.socket))
    ActionRegistry.register("muzzleFlash", def => {
        const texture = new THREE.TextureLoader().load(def.texture)
        return new MuzzleAction(eventCtrl, scene, texture, def.socket, def.size, def.duration)
    })
    ActionRegistry.register("shaker", def => new ShakerAction())
    ActionRegistry.register("fluffy", def => new FluffyAction(eventCtrl))
    ActionRegistry.register("swing", def => new SwingEffectAction(eventCtrl, scene, def.socketA, def.socketB, ))
    ActionRegistry.register("darkparticle", def => new DarkAction(eventCtrl, scene))
}

