import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { FurnBox, FurnEntry, FurnProperty, FurnState } from "./furntypes";
import { IGPhysic } from "@Glibs/interface/igphysics";


export interface IFurnMotions {
    Building(): void
    Done(): void
    Create(): void
}


export class FurnCtrl {
    position: THREE.Vector3
    lv = 1 // tree age
    timer = 0 // ms, 0.001 sec
    lastBuildingTime = 0
    checktime = 0
    health = 3
    phybox: FurnBox
    dom: HTMLDivElement
    msg: HTMLLabelElement
    progress: HTMLProgressElement
    get State() { return this.saveEntry.state }
    get Entry() { return this.saveEntry }

    constructor(
        id: number, 
        private funi: IPhysicsObject, 
        private treeMotion: IFurnMotions,
        private property: FurnProperty,
        private gphysic: IGPhysic,
        private save: FurnEntry[],
        private saveEntry: FurnEntry,
    ) {
        this.position = funi.Meshs.position
        const size = funi.Size
        const geometry = new THREE.BoxGeometry(size.x , size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true
        })
        this.phybox = new FurnBox(id, "furniture", geometry, material, this)
        if (window.location.hostname == "hons.ghostwebservice.com") {
            this.phybox.visible = false
        }
        const scale = 1.2
        this.phybox.scale.set(scale, 1, scale)
        this.phybox.position.copy(this.funi.BoxPos)
        this.phybox.rotation.copy(this.funi.Meshs.rotation)
        if(saveEntry.state == FurnState.Done) {
            this.treeMotion.Done()
        }
        this.dom = document.getElementById("edit-progress-bar-container") as HTMLDivElement
        this.progress = document.getElementById("edit-progress-bar") as HTMLProgressElement
        this.msg = document.getElementById("job_label") as HTMLLabelElement

    }
    BuildingStart() {
        if(this.saveEntry.state == FurnState.Done) return
        this.timer = 0
        this.saveEntry.state = FurnState.Building
        const now = new Date().getTime() // ms, 0.001 sec
        this.lastBuildingTime = now - this.property.buildingTime
        this.msg.innerText = "제작하고 있습니다."
        this.dom.style.display = "block"
    }
    BuildingCancel() {
        if(this.saveEntry.state == FurnState.Building)
            this.saveEntry.state = FurnState.Suspend
        this.dom.style.display = "none"
    }

    BuildingDone() {
        this.saveEntry.state = FurnState.Done
        this.timer = 0 
        this.lastBuildingTime = new Date().getTime() // ms, 0.001 sec
        this.treeMotion.Done()
        this.save.push({
            id: this.property.id, 
            createTime: this.lastBuildingTime, 
            state: this.saveEntry.state,
            position: this.funi.Meshs.position,
            rotation: this.funi.Meshs.rotation
        })
        this.dom.style.display = "none"
        console.log("done", this.save, JSON.stringify(this.save))
    }
    Delete(damage: number) {
        console.log(this.health)
        if (!damage) {
            this.dom.style.display = "none"
        } else {
            this.msg.innerText = "가구를 제거합니다."
            this.dom.style.display = "block"
            this.health -= damage
            this.progress.value = 1 - this.health / 3
        }
        return this.health
    }

    update(delta: number) {
        this.checktime += delta
        if( Math.floor(this.checktime) < 1)  return
        this.checktime = 0
        if (this.gphysic.Check(this.funi)) {
            do {
                this.funi.Meshs.position.y += 0.2
            } while (this.gphysic.Check(this.funi))
        } else {
            do {
                this.funi.Meshs.position.y -= 0.2
            } while (!this.gphysic.Check(this.funi) && this.funi.Meshs.position.y >= 0)
            this.funi.Meshs.position.y += 0.2
        }
        this.saveEntry.position.x = this.funi.Meshs.position.x
        this.saveEntry.position.y = this.funi.Meshs.position.y
        this.saveEntry.position.z = this.funi.Meshs.position.z
        this.phybox.position.copy(this.funi.BoxPos)

        switch(this.saveEntry.state) {
            case FurnState.NeedBuilding:
                return;
            case FurnState.Building:
                {
                    this.timer += delta * 10
                    const ratio = this.timer / 5
                    this.progress.value = ratio
                    //this.treeMotion.SetProgress(ratio)
                    if (ratio > 1) {
                        this.BuildingDone()
                    }
                }
                return;
        }
    }
}