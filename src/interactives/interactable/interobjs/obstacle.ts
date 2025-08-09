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
        super(uniqId, def, asset, eventCtrl)
    }
    afterLoad(): void {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, this)
    }
    tryInteract(actor: IPhysicsObject): void {
    }
}