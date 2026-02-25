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
    private crosshair?: THREE.Group;
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
        super(45, canvas.Width / canvas.Height, 0.1, 1000)
        if (audioListener) this.add(audioListener)

        this.createCrosshair();

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

    private createCrosshair() {
        const group = new THREE.Group();
        // Line은 1px로 고정되므로 가장 밝은 노란색과 1.0의 불투명도를 사용합니다.
        const mat = new THREE.LineBasicMaterial({ 
            color: 0xffff00, 
            depthTest: false, 
            depthWrite: false,
            transparent: true,
            opacity: 1.0
        });

        const size = 0.5; // 월드 단위 크기 (나중에 거리별로 스케일 조절됨)
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
        
        // 렌더링 우선순위 최상위
        group.renderOrder = 100000;
        group.traverse(obj => obj.frustumCulled = false);
        
        this.add(group);
        this.crosshair = group;
    }

    /**
     * 가늠자를 월드 좌표에 배치하고 카메라를 바라보게 합니다.
     * 거리에 상관없이 화면상 크기를 일정하게 유지합니다.
     */
    public setCrosshairWorldPosition(worldPos: THREE.Vector3) {
        if (!this.crosshair) return;
        
        // 1. 카메라 로컬 좌표계로 변환하여 배치
        const localPos = this.worldToLocal(worldPos.clone());
        this.crosshair.position.copy(localPos);

        // 2. 거리 기반 스케일 조정 (원근감에 의한 크기 변화 상쇄)
        // localPos.z는 카메라로부터의 거리(음수)입니다.
        const distance = Math.max(0.1, Math.abs(localPos.z));
        const baseScale = 0.025; // 화면상 크기 조절용 상수
        this.crosshair.scale.setScalar(distance * baseScale);
        
        // 3. 항상 카메라 평면과 평행하게 정렬 (부모가 카메라라 이미 정렬됨)
    }

    private toggleAimOverlay(enabled: boolean) {
        if (this.crosshair) {
            this.crosshair.visible = enabled;
            // 활성화될 때 기본 위치(전방 10m)로 초기화
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
        if (!this.strategies.has(mode)) return
        // ✅ 방어 코드 추가: 현재 카메라 모드와 변경하려는 모드가 같으면 초기화를 무시합니다.
        if (this.mode === mode) return;

        const prevMode = this.mode

        if (mode === CameraMode.AimThirdPerson && prevMode !== CameraMode.AimThirdPerson) {
            this.preAimSnapshot = {
                mode: prevMode,
                position: this.position.clone(),
                quaternion: this.quaternion.clone(),
                target: this.controls.target.clone(),
            }
        }

        this.strategy?.uninit?.();

        this.mode = mode
        this.strategy = this.strategies.get(mode)!
        this.strategy.init?.()

        if (
            prevMode === CameraMode.AimThirdPerson &&
            mode === CameraMode.ThirdFollowPerson
        ) {
            const followStrategy = this.strategies.get(CameraMode.ThirdFollowPerson) as any
            followStrategy?.syncFromCameraPose?.()
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
