import * as THREE from "three"
import { ActorCommand, ControlSource, PolicyContext } from "../controllabletypes"
import { IControlPolicy } from "./controlpolicy"

export class HumanPolicy implements IControlPolicy {
  source: ControlSource = "manual"
  private queue: ActorCommand[] = []

  enqueue(command: Omit<ActorCommand, "issuedAt" | "issuer">) {
    this.queue.push({
      ...command,
      issuedAt: Date.now(),
      issuer: "human",
    })
  }

  move(actorId: string, point: THREE.Vector3, priority = 10) {
    this.enqueue({ type: "move", actorId, point, priority })
  }

  attack(actorId: string, targetId: string, priority = 20) {
    this.enqueue({ type: "attack", actorId, targetId, priority })
  }

  tick(_delta: number, _ctx: PolicyContext): ActorCommand[] {
    if (this.queue.length === 0) return []
    const out = this.queue
    this.queue = []
    return out
  }
}
