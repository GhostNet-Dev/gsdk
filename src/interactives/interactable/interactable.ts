import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { IInteractiveComponent } from "./intcomponent";
import { IAsset } from "@Glibs/interface/iasset";
import { EventTypes } from "@Glibs/types/globaltypes";

// export abstract class InteractableObject extends THREE.Object3D {
export abstract class InteractableObject extends THREE.Object3D {
    interactId: string;
    isActive = true;
    components: Map<string, IInteractiveComponent> = new Map();

    constructor(
        id: string,
        protected asset: IAsset,
        protected eventCtrl: IEventController
    ) {
        super();
        this.interactId = id;
    }
    async Loader(position: THREE.Vector3, rotation: THREE.Euler, scale: number, name: string) {
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.scale.set(scale, scale, scale);
        this.name = name;
        const [meshs, _exist] = await this.asset.UniqModel(name)
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, meshs)
        this.add(meshs)
    }
    abstract tryInteract(actor: IPhysicsObject): void;

    interact(actor: IPhysicsObject): void {
        this.components.forEach((comp) => comp.onInteract?.(actor));
    }

    update(delta: number) {
        this.components.forEach((comp) => comp.onUpdate?.(delta));
    }

    addComponent(comp: IInteractiveComponent) {
        this.components.set(comp.name, comp);
        comp.attachTo(this);
    }

    getComponent<T extends IInteractiveComponent>(name: string): T | undefined {
        return this.components.get(name) as T;
    }
}

