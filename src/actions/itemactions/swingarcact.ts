import * as THREE from 'three';
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"
import { EventTypes } from "@Glibs/types/globaltypes";

export default class SwingArcEffectAction implements IActionComponent, ILoop {
    LoopId: number = 0
    id = 'swingarc'
    trail?: ArcTrailEffect
    keytimeout?:NodeJS.Timeout
    constructor(
        private eventCtrl: IEventController,
        private scene: THREE.Scene,
        private socketA: string = "localTipAOffset", // 기본값
        private socketB: string = "localTipAOffset", // 기본값
    ) { }

    apply(target: any) {
    }
    trigger(target: IActionUser, triggerType: TriggerType, context?: ActionContext | undefined): void {
        if(triggerType === "onUse") {
            this.trail!.start()

        } else if(triggerType === "onUnuse") {
            this.trail!.stop()
        }
    }
    activate(target: IActionUser, context?: ActionContext | undefined): void {
        const obj = target.objs
        if (!obj) return
        const tipA = obj.getObjectByName(this.socketA)!
        const tipB = obj.getObjectByName(this.socketB)!

        if(!this.trail) 
            this.trail = new ArcTrailEffect(tipA, tipB, {
                coreColor: 0x00ffff,
                bodyColor: 0x0088ff
            });
        this.scene.add((this.trail))
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        console.log("Swing Effect Activated")
    }
    deactivate(target: IActionUser, context?: ActionContext | undefined): void {
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        console.log("Swing Effect Deactivated")
        if (this.trail) this.scene.remove((this.trail))
    }
    clock = new THREE.Clock()
    update(delta: number): void {
        this.trail!.update(delta, this.clock.elapsedTime)
    }
}



// ==========================================
// 1. 옵션 인터페이스 (기본값 정의용)
// ==========================================
export interface ArcTrailOptions {
    coreColor?: number | string;
    coreIntensity?: number;
    coreThickness?: number; // 코어의 두께 (0.0 ~ 1.0 비율, 기본 0.1)
    
    bodyColor?: number | string;
    bodyOpacity?: number;
    
    maxSamples?: number;   // 궤적의 부드러움 (높을수록 부드럽지만 성능 저하)
    fadeSpeed?: number;    // 사라지는 속도 (기본 2.0)
}

const DEFAULT_OPTIONS: Required<ArcTrailOptions> = {
    coreColor: 0x00ffff,
    coreIntensity: 8.0,
    coreThickness: 0.1, 
    bodyColor: 0x0088ff,
    bodyOpacity: 0.15,
    maxSamples: 300,
    fadeSpeed: 2.0
};

// ==========================================
// 2. 내부 헬퍼 클래스 (Spline Ribbon)
// ==========================================
class SplineRibbonTrail {
    public geom: THREE.BufferGeometry;
    public controlPointsA: THREE.Vector3[] = [];
    public controlPointsB: THREE.Vector3[] = [];
    
    private maxPoints: number;
    private curveA: THREE.CatmullRomCurve3;
    private curveB: THREE.CatmullRomCurve3;

    constructor(maxPoints: number) {
        this.maxPoints = maxPoints;
        const vCount = maxPoints * 2;
        
        const positions = new Float32Array(vCount * 3);
        const uvs = new Float32Array(vCount * 2);
        const alphas = new Float32Array(vCount);

        const idx: number[] = [];
        for (let i = 0; i < maxPoints - 1; i++) {
            const a0 = i * 2, a1 = i * 2 + 1, b0 = (i + 1) * 2, b1 = (i + 1) * 2 + 1;
            idx.push(a0, a1, b0, a1, b1, b0);
        }

        this.geom = new THREE.BufferGeometry();
        this.geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        this.geom.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
        this.geom.setIndex(idx);
        this.geom.setDrawRange(0, 0);

        this.curveA = new THREE.CatmullRomCurve3([], false, 'catmullrom', 0.5);
        this.curveB = new THREE.CatmullRomCurve3([], false, 'catmullrom', 0.5);
    }

    public clear() {
        this.controlPointsA = [];
        this.controlPointsB = [];
        this.geom.setDrawRange(0, 0);
    }

    public addControlPoint(a: THREE.Vector3, b: THREE.Vector3) {
        this.controlPointsA.push(a.clone());
        this.controlPointsB.push(b.clone());
        if (this.controlPointsA.length > 20) {
            this.controlPointsA.shift();
            this.controlPointsB.shift();
        }
    }

    public update(dt: number, fadeSpeed: number): boolean {
        if (this.controlPointsA.length < 4) {
            this.geom.setDrawRange(0, 0);
            return false; // 활성화된 포인트 없음
        }

        this.curveA.points = this.controlPointsA;
        this.curveB.points = this.controlPointsB;

        const pos = this.geom.getAttribute("position") as THREE.BufferAttribute;
        const uv = this.geom.getAttribute("uv") as THREE.BufferAttribute;
        const aAlpha = this.geom.getAttribute("aAlpha") as THREE.BufferAttribute;
        const samples = this.maxPoints;

        this.geom.setDrawRange(0, (samples - 1) * 6);

        for (let i = 0; i < samples; i++) {
            const t = i / (samples - 1);
            const pa = this.curveA.getPoint(t);
            const pb = this.curveB.getPoint(t);
            const life = Math.pow(t, fadeSpeed);

            const v0 = i * 2;
            pos.setXYZ(v0, pa.x, pa.y, pa.z);
            pos.setXYZ(v0 + 1, pb.x, pb.y, pb.z);
            uv.setXY(v0, 1 - t, 0);
            uv.setXY(v0 + 1, 1 - t, 1);
            aAlpha.setX(v0, life);
            aAlpha.setX(v0 + 1, life);
        }

        pos.needsUpdate = true;
        uv.needsUpdate = true;
        aAlpha.needsUpdate = true;
        
        return true; // 정상 렌더링 중
    }
}

// ==========================================
// 3. 메인 모듈 (ArcTrailEffect)
// ==========================================
export class ArcTrailEffect extends THREE.Group {
    private tipAObject: THREE.Object3D;
    private tipBObject: THREE.Object3D;
    private options: Required<ArcTrailOptions>;

    private isEmitting: boolean = false;
    private trailCore: SplineRibbonTrail;
    private trailBody: SplineRibbonTrail;
    
    private coreMat: THREE.ShaderMaterial;
    private bodyMat: THREE.ShaderMaterial;

    // 임시 연산용 벡터 (메모리 재할당 방지)
    private _posA = new THREE.Vector3();
    private _posB = new THREE.Vector3();
    private _coreStart = new THREE.Vector3();
    private _coreEnd = new THREE.Vector3();

    constructor(tipAObject: THREE.Object3D, tipBObject: THREE.Object3D, options: ArcTrailOptions = {}) {
        super();
        this.tipAObject = tipAObject;
        this.tipBObject = tipBObject;
        this.options = { ...DEFAULT_OPTIONS, ...options };

        // 궤적 인스턴스 생성
        this.trailCore = new SplineRibbonTrail(this.options.maxSamples);
        this.trailBody = new SplineRibbonTrail(Math.floor(this.options.maxSamples * 0.5));

        // 머티리얼 설정
        this.coreMat = this.createCoreMaterial();
        this.bodyMat = this.createBodyMaterial();

        const meshCore = new THREE.Mesh(this.trailCore.geom, this.coreMat);
        const meshBody = new THREE.Mesh(this.trailBody.geom, this.bodyMat);
        
        meshCore.frustumCulled = false;
        meshBody.frustumCulled = false;

        this.add(meshBody);
        this.add(meshCore);

        // 초기 상태는 보이지 않음
        this.visible = false;
    }

    // --- Public API ---

    /** 검을 휘두르기 시작할 때 호출 (이펙트 발생 시작) */
    public start(): void {
        if (this.isEmitting) return;
        this.isEmitting = true;
        this.visible = true;
        this.trailCore.clear();
        this.trailBody.clear();
        console.log("start-------------");
    }

    /** 검 휘두르기가 끝났을 때 호출 (꼬리가 자연스럽게 사라짐) */
    public stop(): void {
        this.isEmitting = false;
        console.log("stop-------------");
    }

    /** 강제로 이펙트를 즉시 숨길 때 사용 */
    public forceHide(): void {
        this.isEmitting = false;
        this.trailCore.clear();
        this.trailBody.clear();
        this.visible = false;
    }

    /** 런타임에 옵션을 변경 (GUI 등과 연동) */
    public updateOptions(newOptions: Partial<ArcTrailOptions>): void {
        this.options = { ...this.options, ...newOptions };
        this.coreMat.uniforms.uColor.value.set(this.options.coreColor);
        this.coreMat.uniforms.uIntensity.value = this.options.coreIntensity;
        this.bodyMat.uniforms.uColor.value.set(this.options.bodyColor);
        this.bodyMat.uniforms.uOpacity.value = this.options.bodyOpacity;
    }

    /** 매 프레임 게임 루프에서 호출 */
    public update(dt: number, elapsedTime: number): void {
        if (!this.visible) return;

        if (this.isEmitting) {
            // 오브젝트의 현재 월드 좌표 추출
            this.tipAObject.getWorldPosition(this._posA);
            this.tipBObject.getWorldPosition(this._posB);

            // 1. Body 궤적 (A에서 B까지 전체)
            this.trailBody.addControlPoint(this._posA, this._posB);

            // 2. Core 궤적 (B 위치 근처에 얇고 강렬하게 생성)
            const halfThickness = this.options.coreThickness / 2;
            this._coreStart.copy(this._posA).lerp(this._posB, 1.0 - halfThickness);
            this._coreEnd.copy(this._posA).lerp(this._posB, 1.0 + halfThickness);
            
            this.trailCore.addControlPoint(this._coreStart, this._coreEnd);
        } else {
            // Emitting이 끝났으면 꼬리를 자르며 자연스럽게 페이드아웃
            if (this.trailCore.controlPointsA.length > 0) {
                this.trailCore.controlPointsA.shift();
                this.trailCore.controlPointsB.shift();
                this.trailBody.controlPointsA.shift();
                this.trailBody.controlPointsB.shift();
            }
        }

        // 지오메트리 업데이트
        const isCoreActive = this.trailCore.update(dt, this.options.fadeSpeed);
        const isBodyActive = this.trailBody.update(dt, this.options.fadeSpeed);

        // 셰이더 시간 업데이트
        this.coreMat.uniforms.uTime.value = elapsedTime;
        this.bodyMat.uniforms.uTime.value = elapsedTime;

        // 잔상이 완전히 사라지면 성능을 위해 렌더링 차단
        if (!this.isEmitting && !isCoreActive && !isBodyActive) {
            this.visible = false;
        }
    }

    // --- Private Helpers ---

    private createCoreMaterial(): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            uniforms: { 
                uColor: { value: new THREE.Color(this.options.coreColor) }, 
                uIntensity: { value: this.options.coreIntensity },
                uTime: { value: 0 } 
            },
            vertexShader: `
                attribute float aAlpha; varying vec2 vUv; varying float vA;
                void main() { vUv = uv; vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: `
                varying vec2 vUv; varying float vA; uniform float uTime; 
                uniform vec3 uColor; uniform float uIntensity;
                float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                void main() {
                    float w = abs(vUv.y - 0.5);
                    float sharp = 1.0 - smoothstep(0.0, 0.15, w);
                    float n = hash(vec2(vUv.x * 20.0 - uTime * 10.0, vUv.y));
                    float alpha = vA * sharp * mix(0.8, 1.2, n);
                    gl_FragColor = vec4(uColor * uIntensity, alpha);
                }
            `
        });
    }

    private createBodyMaterial(): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            uniforms: { 
                uColor: { value: new THREE.Color(this.options.bodyColor) }, 
                uOpacity: { value: this.options.bodyOpacity },
                uTime: { value: 0 } 
            },
            vertexShader: `
                attribute float aAlpha; varying vec2 vUv; varying float vA;
                void main() { vUv = uv; vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: `
                varying vec2 vUv; varying float vA; uniform float uTime; 
                uniform vec3 uColor; uniform float uOpacity;
                void main() {
                    float w = abs(vUv.y - 0.5) * 2.0;
                    float soft = 1.0 - pow(w, 2.0);
                    float alpha = vA * soft * uOpacity;
                    gl_FragColor = vec4(uColor * 1.5, alpha); 
                }
            `
        });
    }
}