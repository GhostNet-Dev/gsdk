import * as THREE from 'three'
import { ILoop } from '../event/ievent';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { LoopType } from '../event/canvas';

export default class DefaultLights extends THREE.DirectionalLight implements ILoop {
    LoopId: number = 0;
    private player?: IPhysicsObject
    // 중립 하늘광과 옅은 지면 반사광으로 재질의 고유색을 유지한다.
    hemi = new THREE.HemisphereLight(0xffffff, 0xe1e9d3, 0.5);
    // 중립 화이트 기저 앰비언트
    ambient = new THREE.AmbientLight(0xffffff, 0.3);
    // 중립 보조광으로 그림자를 밝히되 색상을 바꾸지 않는다.
    fill = new THREE.DirectionalLight(0xffffff, 0.2);
    // 약한 온기의 측면 보조광
    rimLight = new THREE.DirectionalLight(0xfff8ed, 0.15);
    lightOffset = new THREE.Vector3(12, 20, 8);
    constructor(
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
    ) {
        // 살짝 따뜻한 거의-흰색 태양 (흰색이 누렇게 물들지 않도록)
        super(0xfff8ed, 1.8)

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

        // 중립 필라이트 (좌측 후방)
        this.fill.position.set(-10, 10, -6);
        this.fill.castShadow = false;

        // 피치 림라이트 (우측 측면)
        this.rimLight.position.set(8, 6, -12);
        this.rimLight.castShadow = false;

        this.scene.add(this.ambient, this.fill, this.rimLight, this.hemi, this)

        eventCtrl.RegisterEventListener(EventTypes.CtrlObj, (obj: IPhysicsObject) => {
            this.player = obj
            this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems)
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
