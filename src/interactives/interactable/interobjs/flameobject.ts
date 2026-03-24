import * as THREE from 'three';
import { InteractableObject } from '../interactable';
import { InteractableProperty } from '../interactivetypes';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { KeyType } from '@Glibs/types/eventtypes';
import { Controller } from '@Glibs/magical/effects/flame/controller';
import { ExplosionController } from '@Glibs/magical/effects/flame/animation/explosionController';

const BURN_RADIUS = 2.5;
const BURN_INTERVAL = 1000; // ms
const INTERACT_RADIUS = 5;

export class FlameObject extends InteractableObject implements ILoop {
  LoopId: number = 0

  private ctrl = new Controller()
  private exCtrl: ExplosionController
  private flameGroup = new THREE.Group()

  private burning = false
  private time = Date.now()
  private burnTimer = 0

  private nearbyActor: IPhysicsObject | null = null

  constructor(
    uniqId: string,
    protected def: InteractableProperty,
    protected eventCtrl: IEventController,
    private burnDamage: number = 5
  ) {
    super(uniqId, def, eventCtrl)
    this.exCtrl = new ExplosionController(this.ctrl, this.flameGroup)
  }

  async Loader(position: THREE.Vector3, rotation: THREE.Euler, scale: number, name: string) {
    this.position.copy(position)
    this.rotation.copy(rotation)
    this.name = name

    this.meshs = this.flameGroup
    this.add(this.flameGroup)

    this.ignite()

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

    this.eventCtrl.RegisterEventListener(EventTypes.FlameCtrl, (active: boolean) => {
      if (active) {
        this.ignite()
      } else {
        this.extinguish()
      }
    })
  }

  afterLoad(): void {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, this, true)
  }

  _disable(): void {
    this.nearbyActor = null
  }

  ignite() {
    if (this.burning) return
    this.ctrl.init()
    this.exCtrl.init()
    this.burning = true
    this.time = Date.now()
  }

  extinguish() {
    if (!this.burning) return
    this.exCtrl.reset()
    this.burning = false
    this.nearbyActor = null
  }

  tryInteract(actor: IPhysicsObject): void {
    const dist = actor.Pos.distanceTo(this.position)
    if (dist < INTERACT_RADIUS && !this.isActive) {
      const label = this.burning ? '불 끄기' : '불 붙이기'
      this.eventCtrl.SendEventMessage(EventTypes.AlarmInteractiveOn, {
        [KeyType.Action1]: label
      })
      this.eventCtrl.SendEventMessage(
        EventTypes.ChangePlayerMode,
        this.def.type, this.interactId, 'onHit', INTERACT_RADIUS
      )
      this.isActive = true
    }

    if (this.burning && dist < BURN_RADIUS) {
      this.nearbyActor = actor
    } else {
      this.nearbyActor = null
    }
  }

  DoInteract(actor: IPhysicsObject): void {
    this.eventCtrl.SendEventMessage(EventTypes.FlameInteract, actor, this.burning)
    if (this.burning) {
      this.extinguish()
    } else {
      this.ignite()
    }
  }

  update(delta: number): void {
    if (!this.burning) return

    const now = Date.now()
    const timediff = now - this.time
    this.exCtrl.update(timediff)
    this.time = now

    this.burnTimer += delta * 1000
    if (this.burnTimer >= BURN_INTERVAL && this.nearbyActor) {
      this.burnTimer = 0
      const actor = this.nearbyActor
      if ('applyDamage' in actor && typeof (actor as any).applyDamage === 'function') {
        (actor as any).applyDamage(this.burnDamage)
      }
      this.eventCtrl.SendEventMessage(EventTypes.FlameInteract, actor, false)
    }

    if (this.burnTimer >= BURN_INTERVAL) {
      this.burnTimer = 0
    }
  }
}
