import * as THREE from "three";
import { ITreeMotions } from "./treectrl";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { ProgressBar } from "../../ux/progress/progressbar";
import { IAsset } from "@Glibs/interface/iasset";
import { FloatingName } from "../../ux/text/floatingtxt";

export class AppleTree extends PhysicsObject implements ITreeMotions {
    get BoxPos() { return this.asset.GetBoxPos(this.meshs) }
    gauge = new ProgressBar(0.1, 0.1, 2)
    gaugeEnable = false
    lv = 1
    deadTree?: THREE.Group
    fruit?: THREE.Group
    text: FloatingName

    constructor(
        asset: IAsset, 
        private fruitAsset: IAsset, 
        private deadtree: IAsset, 
        private meshName: string
    ) {
        super(asset)
        this.text = new FloatingName("나무를 심어주세요")
        this.text.position.y = 7
        this.meshs.add(this.text)
    }

    async Init() {
    }
    SetLevel(lv: number): void {
        this.lv = lv
    }
    SetProgress(ratio: number): void {
        if (!this.gaugeEnable) {
            this.CreateGauge()
            this.gauge.visible = true
        }
        this.gauge.SetProgress(ratio)
    }
    Enough(): void {
        if (this.text != undefined) {
            this.text.visible = false
        }
        this.SetOpacity(1)
        this.gauge.Meshs.traverse((child) => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial;
                material.color = new THREE.Color("#008DDA")
            }
        })
    }
    NeedHavest(): void {
       if(this.fruit) {
           this.fruit.traverse(child => {
               if ('material' in child) {
                   const material = child.material as THREE.MeshStandardMaterial
                   material.transparent = false;
                   material.depthWrite = true;
                   material.opacity = 1;
               }
           })
        this.fruit.visible = true 
       }
    }
    Havest(): void {
       if(this.fruit) this.fruit.visible = false 
    }
    NeedWarter(): void {
        if (this.text != undefined) {
            this.text.visible = true
            this.text.SetText("물을 주세요")
        }
        this.SetOpacity(1)
        this.gauge.Meshs.traverse((child) => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial;
                material.color = new THREE.Color("#008DDA")
            }
        })
    }
    async Death(): Promise<void> {
        if (this.text != undefined) {
            this.text.visible = true
            this.text.SetText("나무가 죽었습니다.")
        }
        if (this.fruit) this.fruit.visible = false
        this.meshs.children[0].visible = false
        this.deadTree = await this.CreateDeadTree()
        this.meshs.add(this.deadTree)
    }
    Damage(): void { }
    Delete(): void {
         this.meshs.children[0].traverse(child => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = true;
                material.depthWrite = true;
                material.opacity = .3;
            }
        })
    }

    SetOpacity(opacity: number) {
        this.meshs.children[0].traverse(child => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = true;
                material.depthWrite = true;
                material.opacity = opacity;
            }
        })
    }
    Plant(): void {
        this.meshs.children[0].traverse(child => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = false;
                material.depthWrite = true;
                material.opacity = 1;
            }
        })
        if (this.fruit) {
            this.fruit.traverse(child => {
                if ('material' in child) {
                    const material = child.material as THREE.MeshStandardMaterial
                    material.transparent = false;
                    material.depthWrite = true;
                    material.opacity = 1;
                }
            })
        }

        if (this.text != undefined) {
            this.text.SetText("물을 주세요")
        }

        this.CreateGauge()
        this.gauge.SetProgress(0.01)
    }
    CreateGauge() {
        this.gaugeEnable = true
        this.gauge.position.x += 1
        this.gauge.position.y = this.gauge.CenterPos.y
        this.gauge.position.z += 2
        this.gauge.Meshs.traverse((child) => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial;
                material.color = new THREE.Color("#008DDA")
            }
        })
        this.meshs.add(this.gauge)
    }

    SetText(text: string) {
        this.text?.SetText(text)
    }
     
    Create() {
        if (this.text != undefined) {
            this.text.position.y = 7
            this.meshs.add(this.text)
        }
    }

    async MassLoader(position: THREE.Vector3, id?: string) {
        this.meshs = new THREE.Group()
        if(id) {
            const [_meshs, _exist] = await this.asset.UniqModel(this.meshName + id)
            this.meshs.add(_meshs)
        } else {
            this.meshs.add(await this.asset.CloneModel())
        }
        this.fruit = await this.fruitAsset.CloneModel()
        this.fruit.name = "fruit"
        this.fruit.visible = false
        this.fruit.position.set(0, 4, 2)

        this.meshs.add(this.fruit)
        this.meshs.position.set(position.x, position.y, position.z)
        this.meshs.castShadow = true
        this.meshs.receiveShadow = true
        this.meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
            if('material' in child) {
                (child.material as THREE.MeshStandardMaterial).transparent = true;
                (child.material as THREE.MeshStandardMaterial).depthWrite = false;
                (child.material as THREE.MeshStandardMaterial).opacity = 0.3;
            }
        })
        this.meshs.visible = false
    }
    async CreateDeadTree() {
        const mesh = await this.deadtree.CloneModel()
        return mesh
    }
}