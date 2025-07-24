import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InteractableObject } from "../interactable";
import { EventTypes } from "@Glibs/types/globaltypes";
import { KeyType } from "@Glibs/types/eventtypes";

export class InterTree extends InteractableObject {

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