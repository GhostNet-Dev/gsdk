import * as THREE from 'three'
import { ILoop } from '../event/ievent';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { LoopType } from '../event/canvas';

export default class DefaultLights extends THREE.DirectionalLight implements ILoop {
    LoopId: number = 0;
    private player?: IPhysicsObject
    // 파스텔 하늘(복숭아), 파스텔 땅(크림) → 전체를 따뜻하게 감싸는 환경광
    hemi = new THREE.HemisphereLight(0xffd6b0, 0xfff0d6, 1.2);
    // 밝은 크림-화이트 기저 앰비언트
    ambient = new THREE.AmbientLight(0xfff5e8, 1.4);
    // 반대편 소프트 라벤더-핑크 필라이트 (그림자 없음)
    fill = new THREE.DirectionalLight(0xffd6e8, 0.45);
    // 측면 파스텔 피치 보조광
    rimLight = new THREE.DirectionalLight(0xffe0b0, 0.35);
    lightOffset = new THREE.Vector3(12, 20, 8);
    constructor(
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
    ) {
        // 따뜻한 파스텔 황금빛 태양
        super(0xffcf8a, 1.3)

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

        // 라벤더-핑크 필라이트 (좌측 후방)
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