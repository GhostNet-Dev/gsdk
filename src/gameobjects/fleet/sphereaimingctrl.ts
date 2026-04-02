import * as THREE from 'three';
import { IOrbitControlsAccess } from '@Glibs/systems/camera/orbitbroker';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { LoopType } from '@Glibs/systems/event/canvas';

export interface AimingControllerOptions {
    maxRange?: number;
    lineWidth?: number;
    onAimStart?: () => void;
    onAimChange?: (degrees: number, cardinal: string) => void;
    onAimEnd?: () => void;
}

export class SphereAimingController implements ILoop {
  LoopId: number = 0;
    // Settings
    private maxRange: number;
    private lineWidth: number;

    // Callbacks
    private onAimStart?: () => void;
    private onAimChange?: (degrees: number, cardinal: string) => void;
    private onAimEnd?: () => void;

    // Three.js Objects
    public rangeGroup: THREE.Group;
    private horizontalCircle!: Line2;
    private verticalCircle!: Line2;
    private centerLine!: Line2;
    private aimHandle!: THREE.Mesh;
    private aimHitBox!: THREE.Mesh;
    private aimDirectionLabel!: THREE.Sprite;

    // Interaction State
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private isDraggingHandle = false;
    private didDisableControls = false;

    // Temp Variables for Math (GC 최적화)
    private tmpForwardDir = new THREE.Vector3();
    private tmpMainColor = new THREE.Color();
    private tmpGuideColor = new THREE.Color();
    private tmpCurrentHandleWorld = new THREE.Vector3();
    private tmpSphereCenter = new THREE.Vector3();
    private tmpPlaneHit = new THREE.Vector3();
    private tmpBestHit = new THREE.Vector3();
    private tmpPlaneNormal = new THREE.Vector3();

    constructor(
      private readonly eventCtrl: IEventController,
       private scene: THREE.Scene,
       private camera: THREE.PerspectiveCamera,
       private domElement: HTMLElement,
       private spaceship: THREE.Object3D,
       private controls?: IOrbitControlsAccess,
        options?: AimingControllerOptions
    ) {
        this.maxRange = options?.maxRange ?? 60;
        this.lineWidth = options?.lineWidth ?? 9.0;
        this.onAimStart = options?.onAimStart;
        this.onAimChange = options?.onAimChange;
        this.onAimEnd = options?.onAimEnd;

        this.raycaster.params.Line = { threshold: 6.0 };
        this.rangeGroup = new THREE.Group();
        this.scene.add(this.rangeGroup);

        this.buildVisuals();
        this.bindEvents();
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems)
    }

    // ------------------------------------------------------------------------
    // Public Methods
    // ------------------------------------------------------------------------

    /** 매 프레임 호출하여 조준 UI가 우주선을 따라가도록 업데이트합니다. */
    public update(_delta: number): void {
        this.rangeGroup.position.copy(this.spaceship.position);
    }

    /** 모듈 파기 시 메모리를 해제합니다. */
    public dispose(): void {
        this.isDraggingHandle = false;
        if (this.didDisableControls && this.controls) this.controls.setEnabled(true);
                this.didDisableControls = false;
        this.unbindEvents();
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        this.scene.remove(this.rangeGroup);
        // 필요시 geometry, material dispose 추가 구현
    }

    /** 현재 목표 방향 벡터 반환 */
    public getTargetDirection(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
        return this.rangeGroup.getWorldDirection(out).normalize();
    }

    /** 저장된 조준 방향을 다시 반영합니다. */
    public setTargetDirection(direction: THREE.Vector3): void {
        if (direction.lengthSq() <= 0.0001) return;
        this.rangeGroup.position.copy(this.spaceship.position);
        this.tmpBestHit
            .copy(this.spaceship.position)
            .addScaledVector(direction.clone().normalize(), this.maxRange);
        this.rangeGroup.lookAt(this.tmpBestHit);
        this.updateAimVisualByDirection();
    }

    public setVisible(visible: boolean): void {
        this.rangeGroup.visible = visible;
    }

    // ------------------------------------------------------------------------
    // Visual Building
    // ------------------------------------------------------------------------

    private buildVisuals(): void {
        const handleRadius = this.maxRange * 0.05;
        const hitRadius = this.maxRange * 0.2;
        const labelOffsetX = this.maxRange * 0.24;
        const labelOffsetY = this.maxRange * 0.17;
        const labelScaleX = this.maxRange * 0.27;
        const labelScaleY = this.maxRange * 0.1;

        this.horizontalCircle = this.createFatCircle(this.maxRange, 0x9bf7ff, 0.42);
        this.horizontalCircle.rotation.x = Math.PI / 2;
        this.rangeGroup.add(this.horizontalCircle);

        this.verticalCircle = this.createFatCircle(this.maxRange, 0x9bf7ff, 0.42);
        this.verticalCircle.rotation.y = Math.PI / 2;
        this.rangeGroup.add(this.verticalCircle);

        this.centerLine = this.createFatSegment(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, this.maxRange),
            0xffffff,
            0.92
        );
        this.rangeGroup.add(this.centerLine);

        const handleGeo = new THREE.SphereGeometry(handleRadius, 20, 20);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0xffd23f,
            emissive: 0x553300,
            emissiveIntensity: 1.15,
            roughness: 0.35,
            metalness: 0.08
        });
        this.aimHandle = new THREE.Mesh(handleGeo, handleMat);
        this.aimHandle.position.set(0, 0, this.maxRange);

        const hitBoxGeo = new THREE.SphereGeometry(hitRadius, 8, 8);
        const hitBoxMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        this.aimHitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
        this.aimHandle.add(this.aimHitBox);

        this.aimDirectionLabel = this.createDirectionLabelSprite('북 0°');
        this.aimDirectionLabel.position.set(labelOffsetX, labelOffsetY, 0);
        this.aimDirectionLabel.scale.set(labelScaleX, labelScaleY, 1);
        this.aimHandle.add(this.aimDirectionLabel);

        this.rangeGroup.add(this.aimHandle);
        this.updateAimVisualByDirection();
    }

    private makeLineMaterial(color: number, opacity: number = 1): LineMaterial {
        const mat = new LineMaterial({
            color,
            linewidth: this.lineWidth,
            transparent: opacity < 1,
            opacity,
            depthTest: true,
            depthWrite: false,
            dashed: false
        });
        mat.resolution.set(window.innerWidth, window.innerHeight);
        return mat;
    }

    private createFatCircle(radius: number, color: number, opacity: number = 1, segments: number = 96): Line2 {
        const positions: number[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            positions.push(Math.cos(t) * radius, Math.sin(t) * radius, 0);
        }
        const geometry = new LineGeometry();
        geometry.setPositions(positions);
        const material = this.makeLineMaterial(color, opacity);
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        return line;
    }

    private createFatSegment(start: THREE.Vector3, end: THREE.Vector3, color: number, opacity: number = 1): Line2 {
        const geometry = new LineGeometry();
        geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
        const material = this.makeLineMaterial(color, opacity);
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        return line;
    }

    // ------------------------------------------------------------------------
    // Label & Sprite Logic
    // ------------------------------------------------------------------------

    private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    private createDirectionLabelSprite(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d')!;

        this.renderLabelCanvas(canvas, ctx, text, 'rgba(130, 220, 255, 0.9)');

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.userData = { canvas, ctx, texture };

        return sprite;
    }

    private renderLabelCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, text: string, borderColor: string) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawRoundedRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 16);
        ctx.fillStyle = 'rgba(5, 12, 24, 0.78)';
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 30px Segoe UI';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    private updateDirectionLabelSprite(sprite: THREE.Sprite, text: string, color: string = '#ffffff') {
        if (!sprite) return;
        const { canvas, ctx, texture } = sprite.userData;
        this.renderLabelCanvas(canvas, ctx, text, color);
        texture.needsUpdate = true;
    }

    // ------------------------------------------------------------------------
    // Math & Direction Calculation
    // ------------------------------------------------------------------------

    private getCardinalLabel(deg: number): string {
        if (deg >= 315 || deg < 45) return '북';
        if (deg >= 45 && deg < 135) return '동';
        if (deg >= 135 && deg < 225) return '남';
        return '서';
    }

    private updateAimVisualByDirection(): void {
        this.rangeGroup.getWorldDirection(this.tmpForwardDir).normalize();

        const heading = Math.atan2(this.tmpForwardDir.x, this.tmpForwardDir.z);
        const hue = (heading + Math.PI) / (Math.PI * 2);

        const pitchAbs = Math.abs(this.tmpForwardDir.y);
        const lightness = 0.50 + pitchAbs * 0.12;
        const guideLightness = 0.42 + pitchAbs * 0.10;

        this.tmpMainColor.setHSL(hue, 0.95, lightness);
        this.tmpGuideColor.setHSL(hue, 0.72, guideLightness);

        if (this.horizontalCircle?.material) {
            (this.horizontalCircle.material as LineMaterial).color.copy(this.tmpGuideColor);
            (this.horizontalCircle.material as LineMaterial).needsUpdate = true;
        }

        if (this.verticalCircle?.material) {
            (this.verticalCircle.material as LineMaterial).color.copy(this.tmpGuideColor);
            (this.verticalCircle.material as LineMaterial).needsUpdate = true;
        }

        if (this.centerLine?.material) {
            (this.centerLine.material as LineMaterial).color.copy(this.tmpMainColor);
            (this.centerLine.material as LineMaterial).needsUpdate = true;
        }

        if (this.aimHandle?.material) {
            const handleMat = this.aimHandle.material as THREE.MeshStandardMaterial;
            handleMat.color.copy(this.tmpMainColor);
            if ('emissive' in handleMat) {
                handleMat.emissive.copy(this.tmpMainColor).multiplyScalar(0.35);
            }
            handleMat.needsUpdate = true;
        }

        const degrees = THREE.MathUtils.radToDeg(heading);
        const normalizedDegrees = (degrees + 360) % 360;
        const cardinal = this.getCardinalLabel(normalizedDegrees);

        const labelText = `${cardinal} ${normalizedDegrees.toFixed(0)}°`;
        const borderColor = `#${this.tmpMainColor.getHexString()}`;
        this.updateDirectionLabelSprite(this.aimDirectionLabel, labelText, borderColor);

        if (this.onAimChange) {
            this.onAimChange(normalizedDegrees, cardinal);
        }
    }

    private getClosestSphereIntersection(
        ray: THREE.Ray,
        center: THREE.Vector3,
        radius: number,
        preferredPoint: THREE.Vector3,
        out: THREE.Vector3
    ): boolean {
        const oc = new THREE.Vector3().subVectors(ray.origin, center);
        const b = ray.direction.dot(oc);
        const c = oc.dot(oc) - radius * radius;
        const discriminant = b * b - c;

        if (discriminant < 0) return false;

        const sqrtD = Math.sqrt(discriminant);
        const t0 = -b - sqrtD;
        const t1 = -b + sqrtD;

        const candidates: THREE.Vector3[] = [];
        if (t0 >= 0) {
            const hit0 = new THREE.Vector3();
            ray.at(t0, hit0);
            candidates.push(hit0);
        }
        if (t1 >= 0) {
            const hit1 = new THREE.Vector3();
            ray.at(t1, hit1);
            candidates.push(hit1);
        }

        if (candidates.length === 0) return false;
        if (candidates.length === 1) {
            out.copy(candidates[0]);
            return true;
        }

        const d0 = preferredPoint.distanceToSquared(candidates[0]);
        const d1 = preferredPoint.distanceToSquared(candidates[1]);
        out.copy(d0 <= d1 ? candidates[0] : candidates[1]);
        return true;
    }

    // ------------------------------------------------------------------------
    // Events & Interaction
    // ------------------------------------------------------------------------

    private bindEvents(): void {
        this.domElement.addEventListener('pointerdown', this.onPointerDown, true);
        this.domElement.addEventListener('pointermove', this.onPointerMove, true);
        this.domElement.addEventListener('pointerup', this.onPointerUp, true);
        this.domElement.addEventListener('pointercancel', this.onPointerCancel, true);
        this.domElement.addEventListener('lostpointercapture', this.onLostPointerCapture, true);
    }

    private unbindEvents(): void {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown, true);
        this.domElement.removeEventListener('pointermove', this.onPointerMove, true);
        this.domElement.removeEventListener('pointerup', this.onPointerUp, true);
        this.domElement.removeEventListener('pointercancel', this.onPointerCancel, true);
        this.domElement.removeEventListener('lostpointercapture', this.onLostPointerCapture, true);
    }

    private updateRaycaster(event: PointerEvent): void {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.scene.updateMatrixWorld(true);
        this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    private onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        if ((event.target as HTMLElement).closest('.lil-gui')) return;

        this.updateRaycaster(event);

        const handleHits = this.raycaster.intersectObjects([this.aimHandle, this.aimHitBox], true);
        if (handleHits.length > 0) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.isDraggingHandle = true;
            if (!this.didDisableControls) {
                this.didDisableControls = true;
                if (this.controls) this.controls.setEnabled(false);
                if (this.onAimStart) this.onAimStart();
            }
            this.domElement.setPointerCapture?.(event.pointerId);
            document.body.style.cursor = 'grab';
            return;
        }

        const lineHits = this.raycaster.intersectObjects([this.horizontalCircle, this.verticalCircle], true);
        if (lineHits.length > 0) {
            event.preventDefault();
            this.rangeGroup.lookAt(lineHits[0].point);
            this.updateAimVisualByDirection();
            if (this.onAimStart) this.onAimStart();
            
            // 빠른 클릭 조준 후 이벤트 리셋
            setTimeout(() => {
                if (!this.isDraggingHandle && this.onAimEnd) this.onAimEnd();
            }, 500);
        }
    };

    private onPointerMove = (event: PointerEvent) => {
        if (!this.isDraggingHandle) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        document.body.style.cursor = 'grabbing';

        this.updateRaycaster(event);

        this.aimHandle.getWorldPosition(this.tmpCurrentHandleWorld);
        this.tmpSphereCenter.copy(this.spaceship.position);

        const hitOk = this.getClosestSphereIntersection(
            this.raycaster.ray,
            this.tmpSphereCenter,
            this.maxRange,
            this.tmpCurrentHandleWorld,
            this.tmpBestHit
        );

        if (hitOk) {
            this.rangeGroup.lookAt(this.tmpBestHit);
            this.updateAimVisualByDirection();
        } else {
            this.camera.getWorldDirection(this.tmpPlaneNormal).negate();
            const fallbackPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                this.tmpPlaneNormal,
                this.spaceship.position
            );
            if (this.raycaster.ray.intersectPlane(fallbackPlane, this.tmpPlaneHit)) {
                this.rangeGroup.lookAt(this.tmpPlaneHit);
                this.updateAimVisualByDirection();
            }
        }
    };

    private onPointerUp = (event: PointerEvent) => {
        if (this.isDraggingHandle) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        this.finishDraggingHandle(event.pointerId);
    };

    private onPointerCancel = (event: PointerEvent) => {
        if (this.isDraggingHandle) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        this.finishDraggingHandle(event.pointerId);
    };

    private onLostPointerCapture = (event: PointerEvent) => {
        this.finishDraggingHandle(event.pointerId, false);
    };

    private finishDraggingHandle(pointerId?: number, releaseCapture: boolean = true) {
        if (!this.isDraggingHandle) return;

        this.isDraggingHandle = false;
        if (releaseCapture && pointerId !== undefined && this.domElement.hasPointerCapture?.(pointerId)) {
            this.domElement.releasePointerCapture(pointerId);
        }
        if (this.didDisableControls && this.controls) this.controls.setEnabled(true);
        this.didDisableControls = false;
        document.body.style.cursor = 'default';
        if (this.onAimEnd) this.onAimEnd();
    }
}
