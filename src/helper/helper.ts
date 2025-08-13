import * as THREE from "three";
import { GUI } from "lil-gui"
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export const gui = new GUI()
gui.hide()


export class Helper {
    gui = gui
    debugMode = false
    axesHelper: THREE.AxesHelper = new THREE.AxesHelper(300)
    gridHelper: THREE.GridHelper = new THREE.GridHelper(100, 100)
    //stats = new Stats()
    //arrowHelper: THREE.ArrowHelper
    //arrowAttackHelper: THREE.ArrowHelper

    constructor(
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
        { enable = false, axesEnable = false, gridEnable = false } = {}
    ) {
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, this.axesHelper)
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, this.gridHelper)
        this.gridHelper.visible = gridEnable
        this.axesHelper.visible = axesEnable
        this.scene.add(this.axesHelper, this.gridHelper)
        const folder = gui.addFolder("helper")
        folder.add(this.gridHelper, "visible").name("grid")
        folder.add(this.axesHelper, "visible").name("axes")
        folder.close()
        gui.close()
        if (enable) {
            gui.show()
        }
    }

    CheckStateBegin() {
    }
    CheckStateEnd() {
        //this.stats.update()
    }

    CreateVectorGui(f: GUI, v: THREE.Vector3 | THREE.Euler, name: string) {
        f.add(v, "x", -100, 100, 0.01).listen().name(name + "X")
        f.add(v, "y", -100, 100, 0.01).listen().name(name + "Y")
        f.add(v, "z", -100, 100, 0.01).listen().name(name + "Z")
    }
    CreateMeshGui(meshs: THREE.Group | THREE.Mesh | THREE.Sprite | THREE.Points | THREE.Object3D, name: string) {
        const fp = this.gui.addFolder(name)
        this.CreateVectorGui(fp, meshs.position, "Pos")
        this.CreateVectorGui(fp, meshs.rotation, "Rot")
        this.CreateVectorGui(fp, meshs.scale, "Scale")
        fp.add(meshs, "visible").listen().name("Visible")
        fp.close()
        return fp
    }
}