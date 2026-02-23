import * as THREE from "three";
import { gsap } from "gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import IEventController, { ILoop, IViewer } from "@Glibs/interface/ievent";
import { Canvas } from "@Glibs/systems/event/canvas";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { CameraMode, ICameraStrategy } from "./cameratypes";
import TopViewCameraStrategy from "./topview";
import ThirdPersonCameraStrategy from "./thirdperson";
import ThirdPersonFollowCameraStrategy from "./followcam";
import FirstPersonCameraStrategy from "./firstperson";
import FreeCameraStrategy from "./freeview";
import CinematicCameraStrategy from "./cinemaview";
import AimThirdPersonCameraStrategy from "./aimview";
import { AttackOption } from "@Glibs/types/playertypes";

export class Camera extends THREE.PerspectiveCamera implements IViewer, ILoop {
    LoopId = 0
    controls: OrbitControls

    targetObjs: THREE.Object3D[] = []
    private strategy: ICameraStrategy
    private strategies: Map<CameraMode, ICameraStrategy> = new Map()
    private mode: CameraMode = CameraMode.TopView
    private aimReticle?: HTMLDivElement
    lookTarget = true

    constructor(
        canvas: Canvas,
        eventCtrl: IEventController,
        dom: HTMLElement,
        private player?: IPhysicsObject,
        private audioListener?: THREE.AudioListener,
        { lookTarget = false } = {}
    ) {
        super(45, canvas.Width / canvas.Height, 0.1, 1000)
        if (audioListener) this.add(audioListener)

        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.SendEventMessage(EventTypes.RegisterViewer, this)
        eventCtrl.RegisterEventListener(EventTypes.CtrlObj, (obj: IPhysicsObject, mode = CameraMode.ThirdFollowPerson) => {
            this.lookTarget = true
            this.player = obj
            this.setMode(mode)
        })
        eventCtrl.RegisterEventListener(EventTypes.CtrlObjOff, () => {
            this.lookTarget = false
            this.setMode(CameraMode.Free)
        })
        eventCtrl.RegisterEventListener(EventTypes.OrbitControlsOnOff, (onOff:boolean) => {
            this.controls.enabled = onOff
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterPhysic, (obj: THREE.Object3D) => {
            this.targetObjs.push(obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.DeregisterPhysic, (obj: THREE.Object3D) => {
            this.targetObjs.splice(this.targetObjs.findIndex(o => o.uuid == obj.uuid), 1)
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "mon", (opts: AttackOption[]) => {
            this.cameraPushIn(this.player!.Meshs)
        })
        eventCtrl.RegisterEventListener(EventTypes.CameraMode, (mode: CameraMode) => {
            this.setMode(mode)
        })
        eventCtrl.RegisterEventListener(EventTypes.AimOverlay, (enabled: boolean) => {
            this.toggleAimOverlay(enabled)
        })
        this.position.set(7, 5, 7)
        this.lookTarget = lookTarget
        if (lookTarget) this.lookAt(player!.Pos)

        this.controls = new OrbitControls(this, dom)
        // 🖱️ 드래그 감지
        this.controls.addEventListener("start", () => {
            this.strategy?.orbitStart?.()
        });

        // 드래그 종료 후 offset 저장
        this.controls.addEventListener("end", () => {
            this.strategy?.orbitEnd?.()
        });
            // 전략 초기화
            this.strategies.set(CameraMode.TopView, new TopViewCameraStrategy(this.controls));
            this.strategies.set(CameraMode.ThirdPerson, new ThirdPersonCameraStrategy(this.controls, this, this.targetObjs));
            this.strategies.set(CameraMode.ThirdFollowPerson, new ThirdPersonFollowCameraStrategy(this.controls, this, this.targetObjs));
            this.strategies.set(CameraMode.FirstPerson, new FirstPersonCameraStrategy(this.controls));
            this.strategies.set(CameraMode.Free, new FreeCameraStrategy(this.controls));
            this.strategies.set(CameraMode.Cinematic, new CinematicCameraStrategy([
                new THREE.Vector3(0, 10, 20),
                new THREE.Vector3(10, 10, 0),
                new THREE.Vector3(0, 5, -10)
            ], this.controls));
            this.strategies.set(CameraMode.AimThirdPerson, new AimThirdPersonCameraStrategy(this.controls, this));        // 여기에 다른 전략도 추가하세요
        this.strategy = this.strategies.get(this.mode)!;
    }

    private toggleAimOverlay(enabled: boolean) {
        if (!this.aimReticle) {
            const reticle = document.createElement("div")
            reticle.style.position = "fixed"
            reticle.style.left = "50%"
            reticle.style.top = "50%"
            reticle.style.width = "22px"
            reticle.style.height = "22px"
            reticle.style.marginLeft = "-11px"
            reticle.style.marginTop = "-11px"
            reticle.style.borderRadius = "50%"
            reticle.style.pointerEvents = "none"
            reticle.style.border = "2px solid rgba(255,255,255,0.95)"
            reticle.style.boxShadow = "0 0 6px rgba(0,0,0,0.8)"
            reticle.style.zIndex = "9999"
            reticle.style.display = "none"
            document.body.appendChild(reticle)
            this.aimReticle = reticle
        }
        this.aimReticle.style.display = enabled ? "block" : "none"
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
    cameraPushIn(target: THREE.Object3D, dist = 1.0, duration = 0.15) {
        const dir = new THREE.Vector3()
        this.getWorldDirection(dir)
        const pushPos = this.position.clone().add(dir.multiplyScalar(dist))

        const originalPos = this.position.clone()

        gsap.to(this.position, {
            x: pushPos.x,
            y: pushPos.y,
            z: pushPos.z,
            duration: duration,
            onComplete: () => {
                gsap.to(this.position, {
                    x: originalPos.x,
                    y: originalPos.y,
                    z: originalPos.z,
                    duration: duration
                })
            }
        })
    }
    setMode(mode: CameraMode) {
        if (this.strategies.has(mode)) {
            this.mode = mode;
            this.strategy = this.strategies.get(mode)!;
            this.strategy.init?.();
        }
    }

    resize(width: number, height: number) {
        this.aspect = width / height
        this.updateProjectionMatrix()
    }

    update() {
        this.strategy.update(this, this.player)
    }
}
