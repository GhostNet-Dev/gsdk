import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InteractableObject } from "../interactable";
import { EventTypes } from "@Glibs/types/globaltypes";
import { KeyType } from "@Glibs/types/eventtypes";
import IEventController from "@Glibs/interface/ievent";
import { IAsset } from "@Glibs/interface/iasset";
import { InteractableProperty } from "@Glibs/types/interactivetypes";

export class Obstacles extends InteractableObject {
    constructor(
        uniqId: string,
        protected def: InteractableProperty,
        protected asset: IAsset,
        protected eventCtrl: IEventController
    ) {
        super(uniqId, def, eventCtrl, asset)
    }
    afterLoad(): void {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, this)
    }
    tryInteract(actor: IPhysicsObject): void {
    }
    async Loader(position: THREE.Vector3, rotation: THREE.Euler, scale: number, name: string) {
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.scale.set(scale, scale, scale);
        this.name = name;
        const meshs = await this.asset.CloneModel()
        // const [meshs, _] = await this.asset.UniqModel(name)
        // this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, meshs)
        this.meshs = meshs
        this.actions.forEach(a => this.applyAction(a))
        this.add(meshs)
        this.afterLoad()
    }
}