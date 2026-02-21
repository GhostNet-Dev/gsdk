import * as THREE from "three";
import { ActionRegistry } from "./actionregistry"
import { StatBoostAction } from "./traitaction/statboostact"
import { FireballAction } from "./skillactions/fireballact"
import { KnifeAction } from "./skillactions/knifeact"
import { MuzzleAction } from "./itemactions/muzzleact";
import { EventController } from "@Glibs/systems/event/eventctrl";
import { BulletCasingAct } from "./itemactions/bulletcasingact";
import { ShakerAction } from "./itemactions/shakeract";
import { FluffyAction } from "./itemactions/fluffyact";
import SwingEffectAction from "./itemactions/swingeffact";
import { DarkAction } from "./visualactions/darkact";
import { StunStarsAction } from "./visualactions/stunstar";
import { FireAction } from "./visualactions/fireact";
import { Camera } from "@Glibs/systems/camera/camera";
import { ElectricAction } from "./visualactions/electricact";
import { FireballDefenceAction } from "./skillactions/firedefenceact";
import { ElectricDefenceAction } from "./skillactions/electricdefenceact";
import { GhostAction } from "./visualactions/ghostact";
import { WaterDefenceAction } from "./skillactions/waterdefenceact";
import { MeteorAction } from "./skillactions/meteoract";
import SwingArcEffectAction from "./itemactions/swingarcact";

export function InitActionRegistry(eventCtrl: EventController, scene: THREE.Scene, camera: Camera) {
    ActionRegistry.register("statBoost", def => new StatBoostAction(def))
    ActionRegistry.register("hpStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("attackStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("projectileSpeedStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("areaStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("cooldownStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("critRateStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("recoveryStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("maxHpStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("armorStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("speedStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("greedStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("luckStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("magnetStatBoost", def => new StatBoostAction(def))
    ActionRegistry.register("fireball", def => new FireballAction(eventCtrl, def))
    ActionRegistry.register("projectileFire", def => new FireballAction(eventCtrl, def))
    ActionRegistry.register("projectileKnife", def => new KnifeAction(eventCtrl, def))
    ActionRegistry.register("projectileKnifeFan", def => new KnifeAction(eventCtrl, def))
    ActionRegistry.register("meteor", def => new MeteorAction(eventCtrl, scene, def))
    ActionRegistry.register("casing", def => new BulletCasingAct(eventCtrl, scene, def.socket))
    ActionRegistry.register("muzzleFlash", def => {
        const texture = new THREE.TextureLoader().load(def.texture)
        return new MuzzleAction(eventCtrl, scene, texture, def.socket, def.size, def.duration)
    })
    ActionRegistry.register("shaker", def => new ShakerAction())
    ActionRegistry.register("fluffy", def => new FluffyAction(eventCtrl))
    ActionRegistry.register("swing", def => new SwingEffectAction(eventCtrl, scene, def.socketA, def.socketB, ))
    ActionRegistry.register("swingarc", def => new SwingArcEffectAction(eventCtrl, scene, def.socketA, def.socketB, ))
    ActionRegistry.register("darkparticle", def => new DarkAction(eventCtrl, scene))
    ActionRegistry.register("stunstars", def => new StunStarsAction(eventCtrl, scene))
    ActionRegistry.register("fireflame", def => new FireAction(eventCtrl, camera))
    ActionRegistry.register("electricaura", def => new ElectricAction(eventCtrl))
    ActionRegistry.register("ghostaura", def => new GhostAction(eventCtrl))
    ActionRegistry.register("firedefence", def => new FireballDefenceAction(eventCtrl, camera, def))
    ActionRegistry.register("electricdefence", def => new ElectricDefenceAction(eventCtrl, def))
    ActionRegistry.register("waterdefence", def => new WaterDefenceAction(eventCtrl, def))
}
