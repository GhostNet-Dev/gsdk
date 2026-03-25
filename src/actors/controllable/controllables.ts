import { ActorCommand } from "./controllabletypes"
import { ControllableCtrl } from "./controllablectrl"

export class Controllables {
  private selected = new Set<string>()
  private readonly actors = new Map<string, ControllableCtrl>()

  register(actorId: string, ctrl: ControllableCtrl) {
    this.actors.set(actorId, ctrl)
  }

  unregister(actorId: string) {
    this.selected.delete(actorId)
    this.actors.get(actorId)?.release()
    this.actors.delete(actorId)
  }

  select(actorId: string, append = false) {
    if (!append) this.selected.clear()
    this.selected.add(actorId)
  }

  clearSelection() {
    this.selected.clear()
  }

  issue(command: ActorCommand) {
    this.actors.get(command.actorId)?.enqueue(command)
  }

  issueGroup(commands: ActorCommand[]) {
    commands.forEach((command) => {
      if (!this.selected.has(command.actorId)) return
      this.actors.get(command.actorId)?.enqueue(command)
    })
  }
}
