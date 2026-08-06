import { EntityManager, GameEntity } from "yuka";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export interface IYukaEntityManager {
  add(entity: GameEntity): void;
  remove(entity: GameEntity): void;
}

export class YukaEntityManager implements ILoop, IYukaEntityManager {
  LoopId = 0;
  private readonly manager = new EntityManager();

  private readonly requestListener = () => {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterYukaEntityManager, this);
  };

  constructor(private readonly eventCtrl: IEventController) {
    this.eventCtrl.RegisterEventListener(EventTypes.RequestYukaEntityManager, this.requestListener);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterYukaEntityManager, this);
  }

  add(entity: GameEntity): void {
    if (!this.manager.entities.includes(entity)) {
      this.manager.add(entity);
    }
  }

  remove(entity: GameEntity): void {
    this.manager.remove(entity);
  }

  update(delta: number): void {
    this.manager.update(delta);
  }
}
