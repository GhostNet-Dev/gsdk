import * as THREE from "three"
import IEventController from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { DefaultRelationResolver, RelationResolver } from "./relationresolver"
import {
  RegisterTargetMsg,
  Relation,
  TargetQueryOptions,
  TargetRecord,
  UpdateTargetStateMsg,
} from "./targettypes"

export class TargetRegistrySystem {
  private readonly byId = new Map<string, TargetRecord>()
  private readonly idByObject = new WeakMap<THREE.Object3D, string>()

  constructor(
    private readonly eventCtrl: IEventController,
    private readonly relationResolver: RelationResolver = new DefaultRelationResolver(),
  ) {
    this.eventCtrl.RegisterEventListener(EventTypes.RegisterTarget, (msg: RegisterTargetMsg) => {
      this.register(msg)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.DeregisterTarget, (id: string) => {
      this.deregister(id)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.UpdateTargetState, (msg: UpdateTargetStateMsg) => {
      this.updateState(msg)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.UpdateTargetObject, (id: string, object: THREE.Object3D) => {
      this.updateObject(id, object)
    })
    this.eventCtrl.SendEventMessage(EventTypes.RegisterTargetSystem, this)
  }

  register(msg: RegisterTargetMsg) {
    const prev = this.byId.get(msg.id)
    if (prev) {
      this.unindexObject(prev.object)
    }

    const record: TargetRecord = {
      id: msg.id,
      object: msg.object,
      teamId: msg.teamId ?? prev?.teamId,
      factionId: msg.factionId ?? prev?.factionId,
      fleetId: msg.fleetId ?? prev?.fleetId,
      kind: msg.kind ?? prev?.kind ?? "other",
      alive: msg.alive ?? prev?.alive ?? true,
      targetable: msg.targetable ?? prev?.targetable ?? true,
      collidable: msg.collidable ?? prev?.collidable ?? true,
    }

    this.byId.set(msg.id, record)
    this.indexObject(record.id, record.object)
  }

  deregister(id: string) {
    const record = this.byId.get(id)
    if (!record) return
    this.unindexObject(record.object)
    this.byId.delete(id)
  }

  updateState(msg: UpdateTargetStateMsg) {
    const record = this.byId.get(msg.id)
    if (!record) return

    if (msg.teamId !== undefined) record.teamId = msg.teamId
    if (msg.factionId !== undefined) record.factionId = msg.factionId
    if (msg.fleetId !== undefined) record.fleetId = msg.fleetId
    if (msg.alive !== undefined) record.alive = msg.alive
    if (msg.targetable !== undefined) record.targetable = msg.targetable
    if (msg.collidable !== undefined) record.collidable = msg.collidable
  }

  updateObject(id: string, object: THREE.Object3D) {
    const record = this.byId.get(id)
    if (!record) return
    this.unindexObject(record.object)
    record.object = object
    this.indexObject(id, object)
  }

  get(id: string) {
    return this.byId.get(id)
  }

  getByObject(object?: THREE.Object3D | null) {
    let current = object ?? undefined
    while (current) {
      const id = this.idByObject.get(current)
      if (id) return this.byId.get(id)
      current = current.parent ?? undefined
    }
    return undefined
  }

  getObject(id: string) {
    return this.byId.get(id)?.object
  }

  getTargets(options: TargetQueryOptions = {}) {
    return [...this.byId.values()].filter((record) => this.matchesOptions(record, options))
  }

  getObjects(options: TargetQueryOptions = {}) {
    return this.getTargets(options).map((record) => record.object)
  }

  getTargetsForTeam(teamId: string, relation: Relation = "enemy", options: TargetQueryOptions = {}) {
    return this.getTargets(options).filter((record) => {
      return this.relationResolver.getRelation(teamId, record.teamId) === relation
    })
  }

  getObjectsForTeam(teamId: string, relation: Relation = "enemy", options: TargetQueryOptions = {}) {
    return this.getTargetsForTeam(teamId, relation, options).map((record) => record.object)
  }

  isHostile(sourceId: string, targetId: string) {
    const source = this.byId.get(sourceId)
    const target = this.byId.get(targetId)
    if (!source || !target) return false
    return this.relationResolver.getRelation(source.teamId, target.teamId) === "enemy"
  }

  findNearestHostile(sourceId: string, maxDistance: number, options: TargetQueryOptions = {}) {
    const source = this.byId.get(sourceId)
    if (!source) return undefined

    let nearest: TargetRecord | undefined
    let nearestDistSq = maxDistance * maxDistance

    for (const target of this.getTargetsForTeam(source.teamId ?? "", "enemy", options)) {
      if (target.id === sourceId) continue

      const distSq = source.object.position.distanceToSquared(target.object.position)
      if (distSq >= nearestDistSq) continue

      nearest = target
      nearestDistSq = distSq
    }

    return nearest
  }

  private matchesOptions(record: TargetRecord, options: TargetQueryOptions) {
    if (options.aliveOnly && !record.alive) return false
    if (options.targetableOnly && !record.targetable) return false
    if (options.collidableOnly && !record.collidable) return false
    if (options.kinds && options.kinds.length > 0 && !options.kinds.includes(record.kind)) return false
    return true
  }

  private indexObject(id: string, object: THREE.Object3D) {
    this.idByObject.set(object, id)
    object.traverse((child) => {
      this.idByObject.set(child, id)
    })
  }

  private unindexObject(object: THREE.Object3D) {
    this.idByObject.delete(object)
    object.traverse((child) => {
      this.idByObject.delete(child)
    })
  }
}
