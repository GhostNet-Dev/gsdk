import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InteractableObject } from "../interactable";
import { EventTypes } from "@Glibs/types/globaltypes";
import { KeyType } from "@Glibs/types/eventtypes";
import IEventController from "@Glibs/interface/ievent";
import { IAsset } from "@Glibs/interface/iasset";
import { InteractableProperty } from "@Glibs/types/interactivetypes";

export class InterTree extends InteractableObject {
  constructor(
        uniqId: string,
        protected def: InteractableProperty,
        protected asset: IAsset,
        protected eventCtrl: IEventController
  ) {
    super(uniqId, def, asset, eventCtrl)
    eventCtrl.RegisterEventListener(EventTypes.Attack + uniqId, () => {
      eventCtrl.SendEventMessage(EventTypes.Drop, this.position, )
    })
  }

  tryInteract(actor: IPhysicsObject): void {
    // EventBus.emit("gatherWood", { actor, tree: this });
    if (actor.Pos.distanceTo(this.position) < 5 && !this.isActive) {
      this.eventCtrl.SendEventMessage(EventTypes.AlarmInteractiveOn, {
        [KeyType.Action1]: "나무 베기"
      })
      this.eventCtrl.SendEventMessage(EventTypes.ChangePlayerMode, 
        this.def.type, this.interactId, "onHit")
      // this.trigger("onHit")
      this.isActive = true
    } 
  }
}