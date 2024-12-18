import * as THREE from "three";
import { GhostModel } from "../models/ghostmodel";
import { IAsset } from "../../loader/assetmodel";
import { IPhysicsObject } from "../models/iobject";
import { ProgressBar } from "../models/progressbar";
import { FloatingName } from "../../common/floatingtxt";
import { ITreeMotions } from "./treectrl";

export class Tomato extends GhostModel implements IPhysicsObject, ITreeMotions {
    get BoxPos() { return this.asset.GetBoxPos(this.meshs) }
    gauge = new ProgressBar(0.1, 0.1, 2)
    gaugeEnable = false
    lv = 1

    constructor(
        private assets: IAsset[], 
        private meshName: string
    ) {
        super(assets[0])
        this.text = new FloatingName("")
        this.text.SetText(this.meshName + "를 심어주세요")
        this.text.position.y = 7
    }

    async Init() {
    }
    SetLevel(lv: number): void {
        this.lv = lv
        const target = lv - 1
        for(let i = 0 ; i < this.assets.length; i++) {
            if(i == target) this.meshs.children[i].visible = true
            else this.meshs.children[i].visible = false
        }
    }
    SetProgress(ratio: number): void {
        if(!this.gaugeEnable) {
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
    NeedHavest(): void { }
    Havest(): void {
        this.SetLevel(1)
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
            this.text.SetText("식물이 죽었습니다.")
        }
        const target = this.lv - 1
        this.meshs.children[target].traverse((child) => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial;
                material.color = new THREE.Color("#000000")
            }
        })
    }
    Damage(): void { }
    Delete(): void {
        for (let i = 0; i < this.assets.length; i++) {
            this.meshs.children[i].traverse(child => {
                if ('material' in child) {
                    const material = child.material as THREE.MeshStandardMaterial
                    material.transparent = true;
                    material.depthWrite = false;
                    material.opacity = .3;
                }
            })
        }
    }

    SetOpacity(opacity: number) {
        const target = this.lv - 1
        this.meshs.children[target].traverse(child => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = true;
                material.depthWrite = true;
                material.opacity = opacity;
            }
        })
    }
    Plant(): void {
        for (let i = 0; i < this.assets.length; i++) {
            this.meshs.children[i].traverse(child => {
                if ('material' in child) {
                    const material = child.material as THREE.MeshStandardMaterial
                    material.transparent = true;
                    material.depthWrite = true;
                    material.opacity = 1;
                }
            })
        }

        if (this.text != undefined) {
            this.text.SetText("물을 주세요")
        }

        if (!this.gaugeEnable) this.CreateGauge()
        
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
        this.SetLevel(this.lv)
    }

    async MassLoader(position: THREE.Vector3, id?: string) {
        this.meshs = new THREE.Group()
        if(id) {
            for (let i = 0; i < this.assets.length; i++) {
                const a = this.assets[i]
                const [meshs, _exist] = await a.UniqModel(this.meshName + i + "_" + id)
                if (i) meshs.visible = false
                this.meshs.add(meshs)
            }
        } else {
            for (let i = 0; i < this.assets.length; i++) {
                const a = this.assets[i]
                const meshs = await a.CloneModel()
                if (i) meshs.visible = false
                this.meshs.add(meshs)
            }
        }
        this.meshs.position.copy(position)
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
}