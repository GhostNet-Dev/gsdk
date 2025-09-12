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
    super(uniqId, def, eventCtrl, asset)
    eventCtrl.RegisterEventListener(EventTypes.Attack + uniqId, () => {
      console.log("tree attack!!", this.position)
      eventCtrl.SendEventMessage(EventTypes.Drop, this.position.clone(), [{
        itemId: "Logs", ratio: 1
      }])
    })
  }
    async Loader(position: THREE.Vector3, rotation: THREE.Euler, scale: number, name: string) {
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.scale.set(scale, scale, scale);
        this.name = name;
        // const meshs = await this.asset.CloneModel()
        const [meshs, _] = await this.asset.UniqModel(name)
        // this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, meshs)
        this.meshs = meshs
        this.actions.forEach(a => this.applyAction(a))
        this.add(meshs)
        this.afterLoad()
    }
  afterLoad(): void {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, this, true)
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