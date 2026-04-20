import * as THREE from "three";
import { gsap } from "gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import IEventController, { ILoop, IViewer } from "@Glibs/interface/ievent";
import { Canvas, LoopType } from "@Glibs/systems/event/canvas";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { CameraMode, ICameraStrategy, ICameraTrackTarget } from "./cameratypes";
import { CameraInputPreset, IOrbitControlsAccess, OrbitControlsBroker, OrbitControlsLogger } from "./orbitbroker";
import TopViewCameraStrategy from "./topview";
import ThirdPersonCameraStrategy from "./thirdperson";
import ThirdPersonFollowCameraStrategy from "./followcam";
import FirstPersonCameraStrategy from "./firstperson";
import FreeCameraStrategy from "./freeview";
import CinematicCameraStrategy from "./cinemaview";
import AimThirdPersonCameraStrategy from "./aimview";
import GridViewCameraStrategy from "./gridview";
import SpaceWarCameraStrategy from "./spacewarview";
import { AttackOption } from "@Glibs/types/playertypes";

export class Camera extends THREE.PerspectiveCamera implements IViewer, ILoop {
    LoopId = 0
    /** 외부 시스템(fleet, galaxy 등)의 하위 호환성을 위해 public 유지 */
    controls: OrbitControls
    private broker: OrbitControlsBroker

    targetObjs: THREE.Object3D[] = []
    private strategy: ICameraStrategy
    private strategies: Map<CameraMode, ICameraStrategy> = new Map()
    private mode: CameraMode = CameraMode.Free
    private previousMode: CameraMode = CameraMode.Free
    private crosshair?: THREE.Group;
    private trackTargetResolver?: () => ICameraTrackTarget | undefined
    private lastDeltaSec = 0
    private readonly interactionStartCallbacks = new Set<() => void>()
    private orbitOverlayEl!: HTMLDivElement
    private preAimSnapshot?: {
        mode: CameraMode
        position: THREE.Vector3
        quaternion: THREE.Quaternion
        target: THREE.Vector3
    }
    lookTarget = true

    constructor(
        canvas: Canvas,
        eventCtrl: IEventController,
        dom: HTMLElement,
        private player?: IPhysicsObject,
        private audioListener?: THREE.AudioListener,
        { lookTarget = false } = {}
    ) {
        super(45, canvas.Width / canvas.Height, 0.1, 200000)
        if (audioListener) this.add(audioListener)

        this.createCrosshair();

        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems)
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
        eventCtrl.RegisterEventListener(EventTypes.OrbitControlsOnOff, (onOff: boolean) => {
            // controls는 public이므로 직접 접근 (전략 소유권과 무관한 긴급 override)
            this.controls.enabled = onOff
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterLandPhysic, (obj: THREE.Object3D) => {
            this.targetObjs.push(obj)
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
        eventCtrl.RegisterEventListener(EventTypes.CameraInputPreset, (preset: CameraInputPreset) => {
            if (preset === CameraInputPreset.Default) {
                this.broker.setInputPreset(this.getDefaultInputPreset(this.mode))
            } else {
                this.broker.setInputPreset(preset)
            }
        })
        eventCtrl.RegisterEventListener(EventTypes.CameraTrackTarget, (resolver?: () => ICameraTrackTarget | undefined) => {
            this.trackTargetResolver = resolver
        })
        eventCtrl.RegisterEventListener(EventTypes.AimOverlay, (enabled: boolean) => {
            this.toggleAimOverlay(enabled)
        })
        this.position.set(7, 5, 7)
        this.lookTarget = lookTarget
        if (lookTarget) this.lookAt(player!.Pos)

        // OrbitControls용 투명 오버레이 div — canvas 대신 사용하여
        // FleetPanel 등 UI 오버레이가 있어도 배경 드래그 이벤트를 수신할 수 있게 함
        this.orbitOverlayEl = document.createElement('div')
        this.orbitOverlayEl.style.cssText = 'position:fixed;inset:0;z-index:0;touch-action:none;'
        document.body.appendChild(this.orbitOverlayEl)

        this.controls = new OrbitControls(this, this.orbitOverlayEl)
        this.broker = new OrbitControlsBroker(this.controls)

        this.controls.addEventListener("start", () => {
            this.strategy?.orbitStart?.()
            this.interactionStartCallbacks.forEach(cb => cb())
        });

        this.controls.addEventListener("end", () => {
            this.strategy?.orbitEnd?.()
        });

        // 전략 초기화 (controls를 생성자에서 제거 — broker를 통해 init에서 받음)
        this.strategies.set(CameraMode.TopView, new TopViewCameraStrategy());
        this.strategies.set(CameraMode.ThirdPerson, new ThirdPersonCameraStrategy(this, this.targetObjs));
        this.strategies.set(CameraMode.ThirdFollowPerson, new ThirdPersonFollowCameraStrategy(this, this.targetObjs));
        this.strategies.set(CameraMode.FirstPerson, new FirstPersonCameraStrategy());
        this.strategies.set(CameraMode.Free, new FreeCameraStrategy());
        this.strategies.set(CameraMode.Cinematic, new CinematicCameraStrategy([
            new THREE.Vector3(0, 10, 20),
            new THREE.Vector3(10, 10, 0),
            new THREE.Vector3(0, 5, -10)
        ]));
        this.strategies.set(CameraMode.AimThirdPerson, new AimThirdPersonCameraStrategy(this));
        this.strategies.set(CameraMode.Grid, new GridViewCameraStrategy());
        this.strategies.set(CameraMode.SpaceWar, new SpaceWarCameraStrategy(this));

        // 초기 전략 활성화
        this.strategy = this.strategies.get(this.mode)!;
        this.strategy.init?.(this, this.broker);
    }

    private createCrosshair() {
        const group = new THREE.Group();
        const mat = new THREE.LineBasicMaterial({
            color: 0xffff00,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 1.0
        });

        const size = 0.5;
        const gap = 0.2;

        const hPoints = [
            new THREE.Vector3(-size, 0, 0), new THREE.Vector3(-gap, 0, 0),
            new THREE.Vector3(gap, 0, 0), new THREE.Vector3(size, 0, 0)
        ];
        const hGeo = new THREE.BufferGeometry().setFromPoints(hPoints);
        const hLine = new THREE.LineSegments(hGeo, mat);

        const vPoints = [
            new THREE.Vector3(0, size, 0), new THREE.Vector3(0, gap, 0),
            new THREE.Vector3(0, -gap, 0), new THREE.Vector3(0, -size, 0)
        ];
        const vGeo = new THREE.BufferGeometry().setFromPoints(vPoints);
        const vLine = new THREE.LineSegments(vGeo, mat);

        group.add(hLine, vLine);
        group.visible = false;

        group.renderOrder = 100000;
        group.traverse(obj => obj.frustumCulled = false);

        this.add(group);
        this.crosshair = group;
    }

    public setCrosshairWorldPosition(worldPos: THREE.Vector3) {
        if (!this.crosshair) return;

        const localPos = this.worldToLocal(worldPos.clone());
        this.crosshair.position.copy(localPos);

        const distance = Math.max(0.1, Math.abs(localPos.z));
        const baseScale = 0.025;
        this.crosshair.scale.setScalar(distance * baseScale);
    }

    private toggleAimOverlay(enabled: boolean) {
        if (this.crosshair) {
            this.crosshair.visible = enabled;
            if (enabled) {
                const forward = new THREE.Vector3(0, 0, -10);
                this.crosshair.position.copy(forward);
                this.crosshair.scale.setScalar(10 * 0.025);
            }
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
        const requestedMode = mode

        if (mode === CameraMode.Restore) {
            mode = this.previousMode;
        }

        if (!this.strategies.has(mode)) return

        if (this.mode === mode) {
            if (requestedMode === CameraMode.Restore) {
                this.broker.setInputPreset(this.getDefaultInputPreset(mode));
            }
            return;
        }

        const prevMode = this.mode
        this.previousMode = prevMode;

        if (mode === CameraMode.AimThirdPerson && prevMode !== CameraMode.AimThirdPerson) {
            this.preAimSnapshot = {
                mode: prevMode,
                position: this.position.clone(),
                quaternion: this.quaternion.clone(),
                target: this.controls.target.clone(),
            }
        }

        // 1. 구 전략 정리 (이 시점에서 구 전략의 handle은 아직 유효)
        this.strategy?.uninit?.(this);

        // 2. 신 전략으로 교체 → broker.acquire()가 구 handle 무효화 후 신 handle 발급
        this.mode = mode
        this.strategy = this.strategies.get(mode)!
        this.strategy.init?.(this, this.broker)
        this.broker.setInputPreset(this.getDefaultInputPreset(mode));

        if (
            prevMode === CameraMode.AimThirdPerson &&
            mode === CameraMode.ThirdFollowPerson
        ) {
            const followStrategy = this.strategies.get(CameraMode.ThirdFollowPerson) as any
            followStrategy?.syncFromCameraPose?.()
        }
    }

    private getDefaultInputPreset(mode: CameraMode): CameraInputPreset {
        return mode === CameraMode.Grid
            ? CameraInputPreset.RtsPan
            : CameraInputPreset.Default
    }

    resize(width: number, height: number) {
        this.aspect = width / height
        this.updateProjectionMatrix()
    }

    /**
     * Fleet, Galaxy 등 외부 시스템이 OrbitControls를 안전하게 조작하기 위한 접근자.
     * 반환된 객체를 통해서만 controls를 조작해야 합니다.
     */
    getControlsAccess(): IOrbitControlsAccess {
        return {
            setTarget: (pos) => {
                OrbitControlsLogger.logAccess("setTarget", `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`)
                this.controls.target.copy(pos)
            },
            setTargetXYZ: (x, y, z) => {
                OrbitControlsLogger.logAccess("setTargetXYZ", `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`)
                this.controls.target.set(x, y, z)
            },
            getTarget: () => {
                OrbitControlsLogger.logAccess("getTarget")
                return this.controls.target.clone()
            },
            setEnabled: (v) => {
                OrbitControlsLogger.logAccess("setEnabled", String(v))
                this.controls.enabled = v
            },
            update: () => {
                OrbitControlsLogger.logAccess("update")
                this.controls.update()
            },
            onUserInteractionStart: (callback) => {
                this.interactionStartCallbacks.add(callback)
                return () => this.interactionStartCallbacks.delete(callback)
            },
        }
    }

    getTrackTarget() {
        return this.trackTargetResolver?.()
    }

    getLastDeltaSec() {
        return this.lastDeltaSec
    }

    update(delta = 0) {
        this.lastDeltaSec = delta
        this.strategy.update(this, this.player)
    }
}
