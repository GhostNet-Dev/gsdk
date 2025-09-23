import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { IInteractiveComponent } from "./interobjs/intcomponent";
import { IAsset } from "@Glibs/interface/iasset";
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { InteractableProperty } from "@Glibs/types/interactivetypes";
import { ActionRegistry } from "@Glibs/actions/actionregistry";
import { EventTypes } from "@Glibs/types/globaltypes";

// export abstract class InteractableObject extends THREE.Object3D {
export abstract class InteractableObject extends THREE.Group implements IActionUser {
    baseSpec: BaseSpec
    isActive = false;
    actions: IActionComponent[] = []
    components: Map<string, IInteractiveComponent> = new Map();
    meshs?: THREE.Group
    get DefId() { return this.def.id }
    get objs() { return this.meshs }

    constructor(
        public interactId: string,
        protected def: InteractableProperty,
        protected eventCtrl: IEventController,
        protected asset?: IAsset,
    ) {
        super();
        const stats = def.stats
        this.baseSpec = new BaseSpec(stats, this)

        if ("actions" in def) {
            this.actions = def.actions.map((a: any) => ActionRegistry.create(a))
        }
    }
    abstract Loader(position: THREE.Vector3, rotation: THREE.Euler, scale: number, name: string): void;

    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }
    activate(context?: ActionContext) {
        for (const action of this.actions) {
            action.activate?.(this, context)
        }
    }
    trigger(triggerType: TriggerType, context?: ActionContext) {
        for (const action of this.actions) {
            action.trigger?.(this, triggerType, context)
        }
    }
    abstract tryInteract(actor: IPhysicsObject): void;
    abstract DoInteract(actor: IPhysicsObject, ...param: any): void;
    abstract _disable(): void;
    abstract afterLoad(): void;

    interact(actor: IPhysicsObject): void {
        this.components.forEach((comp) => comp.onInteract?.(actor));
    }

    update(delta: number) {
        this.components.forEach((comp) => comp.onUpdate?.(delta));
    }

    disable() {
        this.isActive = false
        this.eventCtrl.SendEventMessage(EventTypes.ChangePlayerMode)
        this.eventCtrl.SendEventMessage(EventTypes.AlarmInteractiveOff)
        this._disable()
    }

    addComponent(comp: IInteractiveComponent) {
        this.components.set(comp.name, comp);
        comp.attachTo(this);
    }

    getComponent<T extends IInteractiveComponent>(name: string): T | undefined {
        return this.components.get(name) as T;
    }
}

