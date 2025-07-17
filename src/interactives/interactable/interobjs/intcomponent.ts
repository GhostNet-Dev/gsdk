import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InteractableObject } from "../interactable";

export interface IInteractiveComponent {
  name: string;
  attachTo(obj: InteractableObject): void;
  onInteract?(actor: IPhysicsObject): void;
  onUpdate?(delta: number): void;
}

export class CooldownComponent implements IInteractiveComponent {
  name = "cooldown";
  cooldownTime: number;
  lastUsedTime: number = -Infinity;
  obj?: InteractableObject;

  constructor(cooldownTime: number) {
    this.cooldownTime = cooldownTime;
  }

  attachTo(obj: InteractableObject) {
    this.obj = obj;
  }

  onInteract(actor: IPhysicsObject) {
    const now = performance.now();
    if (now - this.lastUsedTime < this.cooldownTime) return;

    console.log(`⏱️ [${this.obj!.id}] 사용됨`);
    this.lastUsedTime = now;
  }
}

export class DurabilityComponent implements IInteractiveComponent {
  name = "durability";
  durability: number;
  obj?: InteractableObject;

  constructor(durability: number) {
    this.durability = durability;
  }

  attachTo(obj: InteractableObject) {
    this.obj = obj;
  }

  onInteract(actor: IPhysicsObject) {
    if (this.durability <= 0) return;
    this.durability--;
    console.log(`🔨 [${this.obj!.id}] 내구도: ${this.durability}`);
    if (this.durability === 0) {
      this.obj!.isActive = false;
      console.log(`[${this.obj!.id}] 파괴됨`);
    }
  }
}

export class SwitchComponent implements IInteractiveComponent {
  name = "switch";
  obj?: InteractableObject;
  targets: InteractableObject[];

  constructor(targets: InteractableObject[]) {
    this.targets = targets;
  }

  attachTo(obj: InteractableObject) {
    this.obj = obj;
  }

  onInteract(actor: IPhysicsObject) {
    console.log(`[${this.obj!.interactId}] 스위치 작동`);
    this.targets.forEach(target => {
      target.isActive = !target.isActive;
      console.log(`↪️ 대상 [${target.interactId}] 상태: ${target.isActive}`);
    });
  }
}

export class TrapComponent implements IInteractiveComponent {
  name = "trap";
  damage: number;
  obj?: InteractableObject;

  constructor(damage: number = 10) {
    this.damage = damage;
  }

  attachTo(obj: InteractableObject) {
    this.obj = obj;
  }

  onInteract(actor: IPhysicsObject) {
    if (!this.obj?.isActive) return;

    if ('applyDamage' in actor && typeof actor.applyDamage === "function") {
      actor.applyDamage(this.damage);
    }
    console.log(`💥 [${this.obj!.interactId}] 트랩 발동, 피해 ${this.damage}`);
  }
}

export class RewardComponent implements IInteractiveComponent {
  name = "reward";
  rewardGiven = false;
  reward: string;
  obj?: InteractableObject;


  constructor(reward: string) {
    this.reward = reward;
  }

  attachTo(obj: InteractableObject) {
    this.obj = obj;
  }

  onInteract(actor: IPhysicsObject) {
    if (this.rewardGiven) return;

    // 가정: actor가 addToInventory 메서드를 갖고 있음
    if ('addToInventory' in actor && typeof actor.addToInventory === 'function') {
      actor.addToInventory(this.reward);
      console.log(`🎁 [${this.obj!.interactId}] 보상 획득: ${this.reward}`);
    }

    this.rewardGiven = true;
  }
}

export class RespawnComponent implements IInteractiveComponent {
  name = "respawn";
  cooldown: number;
  lastTime = -Infinity;
  obj?: InteractableObject;

  constructor(cooldown: number) {
    this.cooldown = cooldown;
  }

  attachTo(obj: InteractableObject) {
    this.obj = obj;
  }

  onUpdate(delta: number) {
    const now = performance.now();
    if (!this.obj!.isActive && now - this.lastTime >= this.cooldown) {
      this.obj!.isActive = true;
      console.log(`🔄 [${this.obj!.interactId}] 리스폰됨`);
    }
  }

  onInteract(actor: IPhysicsObject) {
    if (this.obj!.isActive) {
      this.obj!.isActive = false;
      this.lastTime = performance.now();
    }
  }
}
