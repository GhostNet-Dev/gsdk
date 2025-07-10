import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InteractableObject } from "./interactable";
import { EventTypes } from "@Glibs/types/globaltypes";

export class InterTree extends InteractableObject {
  activation = false
  tryInteract(actor: IPhysicsObject): void {
    // EventBus.emit("gatherWood", { actor, tree: this });
    if (actor.Pos.distanceTo(this.position) < 4 && !this.activation) {
      this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, "나무을 수집하고 싶습니다.")
      this.activation = true
    } else {
      this.activation = false
    }
  }
}