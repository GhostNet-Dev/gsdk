import * as THREE from "three";
import { PlantEntry } from "./farmer";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { PlantProperty } from "@Glibs/types/planttypes";
import { PlantBox, PlantState } from "./planttypes";

export interface ITreeMotions {
    SetProgress(ratio: number): void
    SetLevel(lv: number): void
    SetOpacity(opacity: number): void
    Death(): Promise<void>
    Damage(opt: number): void
    Delete():void
    Plant(): void
    Enough(): void
    NeedWarter(): void
    NeedHavest(): void
    Havest(): void
    Create(): void
}


export class TreeCtrl {
    position: THREE.Vector3
    lv = 1 // tree age
    timer = 0 // ms, 0.001 sec
    checktime = 0
    phybox: PlantBox
    mySaveData?: PlantEntry
    health = 3
    havest = 3
    needHavest = false
    dom: HTMLDivElement
    msg: HTMLLabelElement
    progress: HTMLProgressElement
    get State() { return this.save.state }
    get PlantType() { return this.property.type }
    get NeedHavest() { return this.needHavest }
    get Drop() { return this.property.drop }

    constructor(
        id: number, 
        private tree: IPhysicsObject, 
        private treeMotion: ITreeMotions,
        private property: PlantProperty,
        private save: PlantEntry,
    ) {
        this.position = tree.Meshs.position
        const size = tree.Size
        const geometry = new THREE.BoxGeometry(size.x / 2, size.y, size.z / 2)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true
        })
        this.phybox = new PlantBox(id, "farmtree", geometry, material, this)
        if (window.location.hostname == "hons.ghostwebservice.com") {
            this.phybox.visible = false
        }
        this.phybox.position.copy(this.tree.BoxPos)
        this.CheckWartering()
        this.dom = document.getElementById("edit-progress-bar-container") as HTMLDivElement
        this.progress = document.getElementById("edit-progress-bar") as HTMLProgressElement
        this.msg = document.getElementById("job_label") as HTMLLabelElement
    }
    ReAlloc(pos: THREE.Vector3) {
        this.tree.Meshs.position.copy(pos)
        this.phybox.position.copy(this.tree.BoxPos)
    }
    Release() {
        this.lv = 1
        this.timer = 0
        this.checktime = 0
        this.health = 3
        this.havest = 3
        this.needHavest = false
        this.save.state = PlantState.NeedSeed
        this.treeMotion.Delete()
        this.progress.value = 0
    }
    AfterHavest() {
        this.lv = 1
        this.timer = 0
        this.checktime = 0
        this.health = 3
        this.havest = 3
        this.needHavest = false
    }
    SeedStart() {
        if (this.save.state != PlantState.NeedSeed) return
        this.timer = 0
        this.save.state = PlantState.Seeding
        this.msg.innerText = "나무를 심습니다."
        this.dom.style.display = "block"
    }
    SeedCancel() {
        if(this.save.state == PlantState.Seeding)
            this.save.state = PlantState.NeedSeed
        this.dom.style.display = "none"
        this.progress.value = 0
    }
    WarteringStart() {
        if(this.save.state == PlantState.Death) return
        if(this.save.state != PlantState.Enough && this.save.state != PlantState.NeedWartering) return
        this.timer = 0
        this.save.state = PlantState.Wartering
    }
    WarteringCancel() {
        if(this.save.state == PlantState.Wartering) this.CheckWartering()
    }

    WaterDone() {
        this.save.state = PlantState.Enough
        this.timer = 0 
        this.save.lastWarteringTime = new Date().getTime() // ms, 0.001 sec
    }

    StartGrow() {
        if(this.save.state == PlantState.Death) return
        this.save.state = PlantState.NeedWartering
        const now = new Date().getTime() // ms, 0.001 sec
        this.save.lastWarteringTime = now - this.property.warteringTime
        this.save.lastHarvestTime = now
        this.treeMotion.Plant()
        this.dom.style.display = "none"
    }
    Delete(damage: number): number {
        if (!damage) {
            this.dom.style.display = "none"
        } else {
            this.msg.innerText = "나무를 제거합니다."
            this.dom.style.display = "block"
            this.health -= damage
            this.progress.value = 1 - this.health / 3
            this.treeMotion.Damage(this.health / 3)
        }
        if (this.health <= 0) {
            this.Release()
            return 0
        }

        return this.health
    }
    HavestStart(damage: number) {
        if (!damage) {
            this.dom.style.display = "none"
        } else {
            this.msg.innerText = "수확합니다."
            this.dom.style.display = "block"
            this.havest -= damage
            this.progress.value = 1 - this.havest / 3
        }
        if (this.havest <= 0) {
            this.Havest()
            return 0
        }
        return this.havest
    }
    Havest() {
        this.AfterHavest()
        this.save.lastHarvestTime = new Date().getTime() // ms, 0.001 sec
        this.treeMotion.Havest()
        console.log(this)
    }

    CheckWartering() {
        if(this.save.state == PlantState.NeedSeed) return

        const curr = new Date().getTime()
        const remainTime = curr - this.save.lastWarteringTime
        const remainRatio = 1 - remainTime / this.property.warteringTime
        this.treeMotion.SetProgress(remainRatio)
        // draw
        if( remainRatio < -1) {
            this.save.state = PlantState.Death
            this.treeMotion.Death()
        } else if (remainRatio > .5) {
            this.save.state = PlantState.Enough
            this.treeMotion.Enough()
        } else {
            this.save.state = PlantState.NeedWartering
            this.treeMotion.NeedWarter()
        }
    }
    CheckLevelUp() {
        if(this.save.state == PlantState.NeedSeed) return
        const curr = new Date().getTime()
        const remainTime = curr - this.save.lastHarvestTime
        const currentLv = Math.floor(remainTime / this.property.levelUpTime) + 1
        if (this.lv != currentLv) {
            this.lv = (currentLv > this.property.maxLevel) ? this.property.maxLevel : this.lv + 1
            this.treeMotion.SetLevel(this.lv)
            if(this.lv == this.property.maxLevel) {
                this.treeMotion.NeedHavest()
                this.needHavest = true
            }
        }
        this.save.lv = this.lv
    }

    update(delta: number) {
        this.checktime += delta
        if( Math.floor(this.checktime) < 1)  return
        this.checktime = 0

        switch(this.save.state) {
            case PlantState.NeedSeed:
            case PlantState.Death:
                return;
            case PlantState.Wartering: 
                {
                    this.timer += delta * 10
                    const ratio = this.timer / 5
                    this.treeMotion.SetProgress(ratio)
                    if (ratio > 1) {
                        this.WaterDone()
                    }
                }
                return;
            case PlantState.Seeding:
                this.timer += delta * 10
                const ratio = this.timer / 2
                //this.treeMotion.SetProgress(ratio)
                this.progress.value = ratio
                if(ratio > 1) {
                    this.StartGrow()
                }
                return;
            case PlantState.Enough:
                this.treeMotion.Enough()
                break;
        }
        this.CheckWartering()
        this.CheckLevelUp()
    }
}