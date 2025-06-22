import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InteractableObject } from "./interactable";

class Tree extends InteractableObject {
  interact(actor: IPhysicsObject): void {
    // EventBus.emit("gatherWood", { actor, tree: this });
  }
}