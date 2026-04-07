import * as THREE from "three"
import { IEffect } from "@Glibs/interface/ieffector"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"

type FloatingTextEntry = {
  sprite: THREE.Sprite
  velocity: THREE.Vector3
  age: number
  lifetime: number
}

type FloatingTextOptions = {
  lifetime?: number
  velocity?: THREE.Vector3
  scale?: number
  yOffset?: number
}

const font = 'bold 28pt "Fredoka", sans-serif'
const shadowBlur = 4
const maxPoolSize = 64

export class FloatingTextVfx implements IEffect, ILoop {
  LoopId = 0
  private readonly root = new THREE.Group()
  private readonly active: FloatingTextEntry[] = []
  private readonly inactive: THREE.Sprite[] = []

  get Mesh() { return this.root }

  constructor(
    private readonly eventCtrl: IEventController,
    scene: THREE.Scene,
  ) {
    this.root.name = "global-floating-text-root"
    scene.add(this.root)
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  Start(position: THREE.Vector3, text: string, color = "#ffffff", options: FloatingTextOptions = {}) {
    const sprite = this.acquireSprite()
    this.drawText(sprite, text, color)

    const scale = options.scale ?? 7.5
    sprite.visible = true
    sprite.position.copy(position)
    sprite.position.y += options.yOffset ?? 4.8
    sprite.scale.set(scale, scale, 1)

    this.active.push({
      sprite,
      velocity: options.velocity?.clone() ?? new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(0.8),
        6.4 + Math.random() * 1.8,
        THREE.MathUtils.randFloatSpread(0.4),
      ),
      age: 0,
      lifetime: options.lifetime ?? 0.9,
    })
  }

  update(delta: number) {
    this.Update(delta)
  }

  Update(delta: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i]
      item.age += delta
      item.sprite.position.addScaledVector(item.velocity, delta)
      item.velocity.multiplyScalar(0.985)

      const material = item.sprite.material as THREE.SpriteMaterial
      const progress = Math.min(1, item.age / item.lifetime)
      material.opacity = 1 - progress

      if (progress >= 1) {
        this.active.splice(i, 1)
        this.releaseSprite(item.sprite)
      }
    }
  }

  Complete() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.releaseSprite(this.active[i].sprite)
    }
    this.active.length = 0
  }

  private acquireSprite() {
    const sprite = this.inactive.pop() ?? this.createSprite()
    if (!sprite.parent) this.root.add(sprite)
    return sprite
  }

  private releaseSprite(sprite: THREE.Sprite) {
    const material = sprite.material as THREE.SpriteMaterial
    material.opacity = 0
    sprite.visible = false
    sprite.position.set(0, 0, 0)

    if (this.inactive.length < maxPoolSize) {
      this.inactive.push(sprite)
      return
    }

    this.disposeSprite(sprite)
    this.root.remove(sprite)
  }

  private createSprite() {
    const material = new THREE.SpriteMaterial({
      color: 0xffffff,
      fog: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
    })
    const sprite = new THREE.Sprite(material)
    sprite.renderOrder = 120
    sprite.visible = false
    sprite.frustumCulled = false
    sprite.raycast = () => {}
    return sprite
  }

  private drawText(sprite: THREE.Sprite, text: string, color: string) {
    const element = document.createElement("canvas")
    const measureContext = element.getContext("2d")
    if (!measureContext) return

    measureContext.font = font
    const metrics = measureContext.measureText(text)
    const width = Math.max(64, Math.ceil(metrics.width + 24))
    const height = Math.max(
      40,
      Math.ceil((metrics.fontBoundingBoxAscent ?? 28) + (metrics.fontBoundingBoxDescent ?? 8) + 18),
    )

    element.width = width
    element.height = height

    const context2d = element.getContext("2d")
    if (!context2d) return

    context2d.font = font
    context2d.fillStyle = color
    context2d.shadowOffsetX = 3
    context2d.shadowOffsetY = 3
    context2d.shadowColor = "rgba(0, 0, 0, 0.9)"
    context2d.shadowBlur = shadowBlur
    context2d.textAlign = "center"
    context2d.textBaseline = "middle"
    context2d.fillText(text, width / 2, height / 2, width - 12)

    const material = sprite.material as THREE.SpriteMaterial
    material.map?.dispose()
    material.map = new THREE.CanvasTexture(element)
    material.needsUpdate = true
    material.opacity = 1
  }

  private disposeSprite(sprite: THREE.Sprite) {
    const material = sprite.material as THREE.SpriteMaterial
    material.map?.dispose()
    material.dispose()
  }
}
