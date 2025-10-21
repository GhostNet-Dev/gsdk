import * as THREE from 'three'
import { ILoop } from '../event/ievent';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { IPhysicsObject } from '@Glibs/interface/iobject';

export default class DefaultLights extends THREE.DirectionalLight implements ILoop {
    LoopId: number = 0;
    private player?: IPhysicsObject
    hemi = new THREE.HemisphereLight(0xfffbef, 0xf7fbff, 0.8); // warm sky, very light ground
    ambient = new THREE.AmbientLight(0xffffff, 1.0); // 밝은 베이스
    fill = new THREE.DirectionalLight(0xfffaef, 0.25);
    lightOffset = new THREE.Vector3(12, 20, 8);
    constructor(
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
    ) {
        super(0xfff2e0, 1.0)

        this.hemi.position.set(0, 80, 0);

        const sun = this;
        sun.position.set(12, 20, 8);
        sun.castShadow = true;
        sun.target.position.set(0, 2, 0);
        this.scene.add(sun.target);

        const d = 100;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.radius = 4;
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.03;

        // 반대편에서 아주 약한 필라이트(그림자 X)
        this.fill.position.set(-10, 10, -6);
        this.fill.castShadow = false;
        this.scene.add(this.ambient, this.fill, this.hemi, /*hemispherelight,*/ this,/*this.effector.meshs*/)

        eventCtrl.RegisterEventListener(EventTypes.CtrlObj, (obj: IPhysicsObject) => {
            this.player = obj
            this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        })
        eventCtrl.RegisterEventListener(EventTypes.CtrlObjOff, () => {
            this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        })
    }
    update(): void {
        if (!this.player) return
        this.position.copy(this.player.Pos).add(this.lightOffset)
        this.target = this.player.Meshs
    }
}