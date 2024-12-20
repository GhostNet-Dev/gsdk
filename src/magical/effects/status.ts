import * as THREE from "three";
import { IEffect } from "./ieffector";

const font =  "bold 14pt sans-serif";
//const shadowColor =  "rgba(0,0,0,0.8)";
const shadowBlur = 2

export class TextStatus extends THREE.Sprite implements IEffect {
    params_?: string
    visible_?: boolean

    processFlag = false
    obj = new THREE.Group()
    get Mesh() {return this.obj}


    constructor(params: string, color: string) {
        const element = document.createElement('canvas') as HTMLCanvasElement;
        let context2d = element.getContext('2d');
        if (context2d == null) return

        context2d.font = font
        const metrics = context2d.measureText(params)
        const w = metrics.width
        const h = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        element.width = w;
        element.height = h;

        context2d = element.getContext('2d');
        if (context2d == null) return

        context2d.font = font

        context2d.fillStyle = color;
        context2d.shadowOffsetX = 3;
        context2d.shadowOffsetY = 3;
        context2d.shadowBlur = shadowBlur
        context2d.textAlign = 'center';
        context2d.textBaseline = "middle"
        context2d.fillText(params, w / 2, h / 2, w);

        const map = new THREE.CanvasTexture(context2d.canvas);

        super(
            new THREE.SpriteMaterial({ map: map, color: 0xffffff, fog: false }));
        this.scale.set(1, 1, 1)
        this.position.y = 3.3
        this.position.z = 0.5

        this.params_ = params;
        this.visible_ = true;
        this.visible = false
        this.obj.add(this)
    }

    Destroy() {
        this.traverse(c => {
            if (c instanceof THREE.Mesh) {
                if (c.material) {
                    let materials = c.material;
                    if (!(c.material instanceof Array)) {
                        materials = [c.material];
                    }
                    for (let m of materials) {
                        m.dispose();
                    }
                }

                if (c.geometry) {
                    c.geometry.dispose();
                }
            }
        });
        if (this.parent) {
            this.parent.remove(this);
        }
    }

    InitComponent() {
    }

    OnDeath_() {
        this.Destroy();
    }
    v = 0.0001
    Start(text: string, color: string) {
        this.visible = true
        this.SetText(text, color)
        this.position.set(THREE.MathUtils.randFloatSpread(1), 3.3, 0.5)
        this.material.opacity = 1 
        this.v = 0.0001
        this.processFlag = true
    }
    Complete() {
        this.visible = false
        this.processFlag = false
    }
    Update(delta: number) {
        if (!this.processFlag) return
        this.position.y += delta * .5
        this.v += 0.001
        this.material.opacity -= this.v
        if(this.material.opacity < 0) {
            this.Complete()
        }
    }

    SetText(text: string, color: string) {
        if (!this.visible_) {
            return;
        }
        const element = document.createElement('canvas') as HTMLCanvasElement;
        this.material.dispose()

        this.params_ = text

        if (element == undefined) return

        const context2d_ = element.getContext('2d');
        if (context2d_ == null) return

        context2d_.font = font
        const metrics = context2d_.measureText(text)
        const w = metrics.width
        const h = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        element.width = w + 10;
        element.height = h;

        const context2d = element.getContext('2d');
        if (context2d == null) return

        context2d.font = font
        context2d.shadowOffsetX = 1;
        context2d.shadowOffsetY = 1;
        context2d.shadowColor = "rgba(0, 0, 0, 1)";
        context2d.shadowBlur = 0;

        context2d.fillStyle = color;
        context2d.textAlign = 'center';
        context2d.textBaseline = "middle"
        context2d.fillText(text, w / 2, h / 2, w);


        const map = new THREE.CanvasTexture(context2d.canvas);
        this.renderOrder = 99
        this.material =
            new THREE.SpriteMaterial({ 
                map: map, 
                color: 0xffffff, 
                fog: false, 
                transparent: true,
                depthTest: false, 
                depthWrite: false,
            });
        //this.sprite_.position.y += modelData.nameOffset;
        //msg.model.add(this.sprite_);
    }
}