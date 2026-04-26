import * as THREE from "three"
import { IEffect } from "@Glibs/interface/ieffector"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"

type FloatingTextEntry = {
  sprite: THREE.Sprite
  velocity: THREE.Vector3
  age: number
  lifetime: number
  pixelHeight: number
  aspect: number
}

type FloatingTextOptions = {
  lifetime?: number
  velocity?: THREE.Vector3
  scale?: number
  pixelHeight?: number
  yOffset?: number
}

const font = 'bold 28pt "Fredoka", sans-serif'
const shadowBlur = 4
const maxPoolSize = 64
const defaultPixelHeight = 51
const legacyScaleToPixelHeight = 15
const defaultLifetime = 0.75
const defaultRiseVelocity = 1.6
const defaultRiseVelocityRange = 0.4

export class FloatingTextVfx implements IEffect, ILoop {
  LoopId = 0
  private readonly root = new THREE.Group()
  private readonly active: FloatingTextEntry[] = []
  private readonly inactive: THREE.Sprite[] = []
  private readonly cameraToSprite = new THREE.Vector3()
  private readonly cameraDirection = new THREE.Vector3()

  get Mesh() { return this.root }

  constructor(
    private readonly eventCtrl: IEventController,
    scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.root.name = "global-floating-text-root"
    scene.add(this.root)
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  Start(position: THREE.Vector3, text: string, color = "#ffffff", options: FloatingTextOptions = {}) {
    const sprite = this.acquireSprite()
    const displayText = this.normalizeText(text)
    const aspect = this.drawText(sprite, displayText, color)

    const pixelHeight = this.getPixelHeight(options)
    sprite.visible = true
    sprite.position.copy(position)
    sprite.position.y += options.yOffset ?? 4.8
    this.updateSpriteScale(sprite, pixelHeight, aspect)

    this.active.push({
      sprite,
      velocity: options.velocity?.clone() ?? new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(0.8),
        defaultRiseVelocity + Math.random() * defaultRiseVelocityRange,
        THREE.MathUtils.randFloatSpread(0.4),
      ),
      age: 0,
      lifetime: options.lifetime ?? defaultLifetime,
      pixelHeight,
      aspect,
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
      this.updateSpriteScale(item.sprite, item.pixelHeight, item.aspect)

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
    sprite.scale.set(1, 1, 1)

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
    if (!measureContext) return 1

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
    if (!context2d) return width / height

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

    return width / height
  }

  private getPixelHeight(options: FloatingTextOptions) {
    if (options.pixelHeight !== undefined) return options.pixelHeight
    if (options.scale !== undefined) return options.scale * legacyScaleToPixelHeight
    return defaultPixelHeight
  }

  private normalizeText(text: string) {
    const trimmedText = text.trim()
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmedText)) return text

    const roundedValue = Math.round(Number(trimmedText))
    if (trimmedText.startsWith("+") && roundedValue > 0) return `+${roundedValue}`
    return roundedValue.toString()
  }

  private updateSpriteScale(sprite: THREE.Sprite, pixelHeight: number, aspect: number) {
    const viewportHeight = Math.max(1, window.innerHeight)
    const worldHeight = this.getWorldHeightForPixels(sprite.position, pixelHeight, viewportHeight)
    sprite.scale.set(worldHeight * aspect, worldHeight, 1)
  }

  private getWorldHeightForPixels(position: THREE.Vector3, pixelHeight: number, viewportHeight: number) {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.cameraToSprite.copy(position).sub(this.camera.position)
      this.camera.getWorldDirection(this.cameraDirection)

      const depth = Math.max(0.01, this.cameraToSprite.dot(this.cameraDirection))
      const visibleHeight = (
        2 *
        depth *
        Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)
      ) / this.camera.zoom

      return visibleHeight * (pixelHeight / viewportHeight)
    }

    if (this.camera instanceof THREE.OrthographicCamera) {
      const visibleHeight = (this.camera.top - this.camera.bottom) / this.camera.zoom
      return visibleHeight * (pixelHeight / viewportHeight)
    }

    return pixelHeight / viewportHeight
  }

  private disposeSprite(sprite: THREE.Sprite) {
    const material = sprite.material as THREE.SpriteMaterial
    material.map?.dispose()
    material.dispose()
  }
}
