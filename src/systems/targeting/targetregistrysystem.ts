import * as THREE from "three"
import IEventController from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { GetHorizontalDistanceToBoxSurface } from "@Glibs/actors/battle/meleecombat"
import { DefaultRelationResolver, RelationResolver } from "./relationresolver"
import {
  RegisterTargetMsg,
  Relation,
  TargetDistanceMode,
  TargetQueryOptions,
  TargetRecord,
  UpdateTargetStateMsg,
} from "./targettypes"

type TargetObjectMeta = Partial<RegisterTargetMsg> & { id?: string }

export class TargetRegistrySystem {
  private readonly byId = new Map<string, TargetRecord>()
  private readonly idByObject = new WeakMap<THREE.Object3D, string>()
  private readonly closestPoint = new THREE.Vector3()
  private readonly distanceBox = new THREE.Box3()

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
    this.eventCtrl.RegisterEventListener(EventTypes.RequestTargetSystem, () => {
      this.eventCtrl.SendEventMessage(EventTypes.RegisterTargetSystem, this)
    })
    this.eventCtrl.SendEventMessage(EventTypes.RegisterTargetSystem, this)
  }

  register(msg: RegisterTargetMsg) {
    const prev = this.byId.get(msg.id)
    if (prev) {
      this.unindexObject(prev.object)
    }
    const objectMeta = this.getObjectMeta(msg.object)
    const kind = msg.kind ?? objectMeta?.kind ?? prev?.kind ?? "other"
    const bounds = kind === "structure"
      ? msg.bounds ?? prev?.bounds
      : undefined

    const record: TargetRecord = {
      id: msg.id ?? objectMeta?.id ?? prev?.id ?? msg.object.uuid,
      object: msg.object,
      teamId: msg.teamId ?? objectMeta?.teamId ?? prev?.teamId,
      factionId: msg.factionId ?? objectMeta?.factionId ?? prev?.factionId,
      fleetId: msg.fleetId ?? objectMeta?.fleetId ?? prev?.fleetId,
      kind,
      alive: msg.alive ?? prev?.alive ?? true,
      targetable: msg.targetable ?? prev?.targetable ?? true,
      collidable: msg.collidable ?? prev?.collidable ?? true,
      bounds,
    }

    if (record.bounds) {
      msg.object.userData.bounds = record.bounds
    } else {
      delete msg.object.userData.bounds
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
    if (record.kind === "structure" && record.bounds) {
      object.userData.bounds = record.bounds
    } else {
      delete object.userData.bounds
    }
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
      const metaId = this.getObjectMeta(current)?.id
      if (metaId) {
        const record = this.byId.get(metaId)
        if (record) return record
      }
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
    let nearestDist = maxDistance

    for (const target of this.getTargetsForTeam(source.teamId ?? "", "enemy", options)) {
      if (target.id === sourceId) continue

      const dist = this.getDistance(source.object.position, target, options.distanceMode ?? TargetDistanceMode.Center)
      if (dist >= nearestDist) continue

      nearest = target
      nearestDist = dist
    }

    return nearest
  }

  private getDistance(sourcePos: THREE.Vector3, target: TargetRecord, mode: TargetDistanceMode) {
    if (mode === TargetDistanceMode.BoundsSurface) {
      return GetHorizontalDistanceToBoxSurface(sourcePos, this.getDistanceBounds(target), target.object.position, this.closestPoint)
    }
    return sourcePos.distanceTo(target.object.position)
  }

  private getDistanceBounds(target: TargetRecord): THREE.Box3 | undefined {
    if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
      return target.bounds
    }

    this.distanceBox.setFromObject(target.object)
    return this.distanceBox.isEmpty() ? undefined : this.distanceBox
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

  private getObjectMeta(object: THREE.Object3D): TargetObjectMeta | undefined {
    return object.userData?.targetMeta as TargetObjectMeta | undefined
  }
}
