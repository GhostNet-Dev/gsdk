import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import IEventController, { ILoop, IViewer } from "@Glibs/interface/ievent";
import { Canvas } from "@Glibs/systems/event/canvas";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export class Camera extends THREE.PerspectiveCamera implements IViewer, ILoop {
    LoopId = 0
    controls: OrbitControls
    lookTarget = true
    constructor(
        canvas: Canvas,
        eventCtrl: IEventController,
        dom: HTMLElement,
        private player?: IPhysicsObject,
        { lookTarget = false } = {}
    ) {
        super(45, canvas.Width / canvas.Height, 0.1, 1000)
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.SendEventMessage(EventTypes.RegisterViewer, this)
        eventCtrl.RegisterEventListener(EventTypes.CtrlObj, (obj: IPhysicsObject) => {
            this.lookTarget = true
            this.player = obj
        })
        eventCtrl.RegisterEventListener(EventTypes.CtrlObjOff, () => {
            this.lookTarget = false
        })
        this.position.set(7, 5, 7)
        this.lookTarget = lookTarget
        if (lookTarget) this.lookAt(player!.Pos)
        this.controls = new OrbitControls(this, dom)
    }

    resize(width: number, height: number) {
        this.aspect = width / height
        this.updateProjectionMatrix()
    }

    update() {
        if (this.lookTarget) {
            this.controls.update()
            this.updateCamera()
        }
    }

    shakeCamera(intensity = 0.5, duration = 0.3) {
        const startTime = performance.now();
        const backup = new THREE.Vector3()
        backup.copy(this.position)

        const updateShake = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed > duration * 1000) {
                this.position.copy(backup)
                return;
            }

            const shakeX = (Math.random() - 0.5) * intensity;
            const shakeY = (Math.random() - 0.5) * intensity;

            this.position.x += shakeX;
            this.position.y += shakeY;

            requestAnimationFrame(updateShake);
        }

        updateShake();
    }

    lerpFactor = 0.1; // 보간 속도 조절 (0~1, 작을수록 부드러움)
    cameraTarget = new THREE.Vector3(); // 목표 바라볼 위치
    offset = new THREE.Vector3(10, 15, 10)

    updateCamera() {
        if (!this.player) return
        // 목표 위치 설정 (캐릭터를 따라가는 오프셋 위치)
        const targetPosition = this.player.Pos.clone().add(this.offset);

        // 카메라 위치를 보간하여 이동
        this.position.lerp(targetPosition, this.lerpFactor);

        // 📌 목표 바라볼 위치도 부드럽게 이동
        this.cameraTarget.lerp(this.player.Pos, this.lerpFactor);

        // 📌 부드러운 회전을 위해 Quaternion 보간 적용
        const targetQuaternion = new THREE.Quaternion();
        const currentQuaternion = this.quaternion.clone();

        this.lookAt(this.cameraTarget);
        // targetQuaternion.copy(this.quaternion); // 목표 회전값 저장
        // this.quaternion.copy(currentQuaternion); // 기존 회전값으로 복구 (즉시 회전 방지)

        // // Quaternion을 보간하여 천천히 회전
        // this.quaternion.slerp(targetQuaternion, this.lerpFactor);
    }
}
