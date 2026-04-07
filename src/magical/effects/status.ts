import * as THREE from "three";
import { IEffect } from "./ieffector";

const font = 'bold 14pt "Fredoka", sans-serif';
const shadowBlur = 2;
const maxPoolSize = 12;

type ActiveTextStatus = {
    sprite: THREE.Sprite
    velocity: THREE.Vector3
    age: number
    lifetime: number
}

export class TextStatusPool implements IEffect {
    private readonly obj = new THREE.Group()
    private readonly active: ActiveTextStatus[] = []
    private readonly inactive: THREE.Sprite[] = []

    get Mesh() { return this.obj }

    Start(text: string, color: string = "#ffffff") {
        const sprite = this.acquireSprite()
        this.drawText(sprite, text, color)
        sprite.visible = true
        sprite.position.set(
            THREE.MathUtils.randFloatSpread(0.8),
            3.3 + Math.random() * 0.35,
            0.5 + THREE.MathUtils.randFloatSpread(0.15),
        )
        const scale = 1 + Math.min(1.2, text.length * 0.1)
        sprite.scale.set(scale, scale, 1)
        this.active.push({
            sprite,
            velocity: new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(0.22),
                0.9 + Math.random() * 0.35,
                THREE.MathUtils.randFloatSpread(0.08),
            ),
            age: 0,
            lifetime: 0.7 + Math.random() * 0.2,
        })
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
        if (!sprite.parent) {
            this.obj.add(sprite)
        }
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
        this.obj.remove(sprite)
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
        sprite.renderOrder = 99
        sprite.visible = false
        return sprite
    }

    private drawText(sprite: THREE.Sprite, text: string, color: string) {
        const element = document.createElement("canvas")
        const measureContext = element.getContext("2d")
        if (!measureContext) return

        measureContext.font = font
        const metrics = measureContext.measureText(text)
        const width = Math.max(32, Math.ceil(metrics.width + 16))
        const height = Math.max(
            24,
            Math.ceil((metrics.fontBoundingBoxAscent ?? 14) + (metrics.fontBoundingBoxDescent ?? 6) + 10),
        )

        element.width = width
        element.height = height

        const context2d = element.getContext("2d")
        if (!context2d) return

        context2d.font = font
        context2d.fillStyle = color
        context2d.shadowOffsetX = 2
        context2d.shadowOffsetY = 2
        context2d.shadowColor = "rgba(0, 0, 0, 0.9)"
        context2d.shadowBlur = shadowBlur
        context2d.textAlign = "center"
        context2d.textBaseline = "middle"
        context2d.fillText(text, width / 2, height / 2, width - 8)

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

export { TextStatusPool as TextStatus }
