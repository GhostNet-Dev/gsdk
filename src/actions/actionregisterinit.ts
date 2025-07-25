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

export function InitActionRegistry(eventCtrl: EventController, scean: THREE.Scene) {
    ActionRegistry.register("statBoost", def => new StatBoostAction(def.stats))
    ActionRegistry.register("fireball", def => new FireballAction())
    ActionRegistry.register("casing", def => new BulletCasingAct(eventCtrl, scean, def.socket))
    ActionRegistry.register("muzzleFlash", def => {
        const texture = new THREE.TextureLoader().load(def.texture)
        return new MuzzleAction(eventCtrl, scean, texture, def.socket, def.size, def.duration)
    })
    ActionRegistry.register("shaker", def => new ShakerAction())
    ActionRegistry.register("fluffy", def => new FluffyAction(eventCtrl))
    ActionRegistry.register("swing", def => new SwingEffectAction(eventCtrl, scean, def.socketA, def.socketB, ))
}

