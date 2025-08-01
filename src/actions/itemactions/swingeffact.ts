import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"
import { EventTypes } from "@Glibs/types/globaltypes";

export default class SwingEffectAction implements IActionComponent, ILoop {
    LoopId: number = 0
    id = 'swing'
    trail?: WeaponTrail
    keytimeout?:NodeJS.Timeout
    constructor(
        private eventCtrl: IEventController,
        private scene: THREE.Scene,
        private socketA: string = "localTipAOffset", // 기본값
        private socketB: string = "localTipAOffset", // 기본값
    ) { }

    apply(target: any) {
    }
    activate(target: IActionUser, context?: ActionContext | undefined): void {
        const obj = target.objs
        if (!obj) return
        const objA = obj.getObjectByName(this.socketA)!
        const objB = obj.getObjectByName(this.socketB)!

        this.trail = new WeaponTrail(this.scene, objA, objB)
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    trigger(target: IActionUser, triggerType: TriggerType, context?: ActionContext | undefined): void {
        this.trail!.startTrail()
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        this.keytimeout = setTimeout(() => {
            this.trail!.stopTrail()
        }, 1000)
    }
    deactivate(target: IActionUser, context?: ActionContext | undefined): void {
        this.trail!.stopTrail()
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    }
    update(delta: number): void {
        this.trail!.update(delta)
    }
}

class WeaponTrail {
    trailColor: THREE.Color
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
    trailMesh: THREE.Mesh
    points: any[] = []; // 궤적을 구성할 점들 ({tipA, tipB, time} 객체)

    maxPoints = 60; // 궤적을 구성할 최대 점의 수
    minDistance = 0.05; // 새 점을 추가할 최소 거리 (팁 A의 이동 거리 기준)
    
    // 월드 포지션을 저장할 임시 Vector3
    private _worldPositionA = new THREE.Vector3();
    private _worldPositionB = new THREE.Vector3();

    constructor(
       private scene: THREE.Scene, 
       private tipAObject: THREE.Object3D, // 궤적의 한쪽 끝을 정의할 Object3D
       private tipBObject: THREE.Object3D, // 궤적의 다른 쪽 끝을 정의할 Object3D
       trailColor = 0xADD8E6, 
       private trailDuration = 0.5
    ) {
        this.scene = scene;
        this.tipAObject = tipAObject;
        this.tipBObject = tipBObject;
        this.trailColor = new THREE.Color(trailColor);
        this.trailDuration = trailDuration; // 궤적 유지 시간

        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: this.trailColor },
                alphaTexture: { value: null } // 나중에 추가할 수 있는 알파 마스크
            },
            vertexShader: `
                        attribute vec4 customColor; // RGBA
                        varying vec4 vColor;

                        void main() {
                            vColor = customColor;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
            fragmentShader: `
                        uniform vec3 color;
                        varying vec4 vColor; // 커스텀 컬러는 RGBA

                        void main() {
                            gl_FragColor = vec4(vColor.rgb, vColor.a);
                            if (gl_FragColor.a < 0.001) discard; // 투명도가 매우 낮으면 픽셀 버림
                        }
                    `,
            transparent: true,
            blending: THREE.AdditiveBlending, // 궤적을 더 부드럽게 보이게 함
            side: THREE.DoubleSide, // 양면 렌더링
            depthWrite: false // 깊이 버퍼에 쓰지 않아 렌더링 순서 문제 방지
        });

        this.trailMesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.trailMesh);
        this.trailMesh.visible = false

        this.maxPoints = 60; // 궤적을 구성할 최대 점의 수
        this.minDistance = 0.05; // 새 점을 추가할 최소 거리 (팁 A의 이동 거리 기준)

        // 초기 점 추가 (두 Object3D의 현재 월드 위치)
        this.tipAObject.getWorldPosition(this._worldPositionA);
        this.tipBObject.getWorldPosition(this._worldPositionB);
        this.points.push({ tipA: this._worldPositionA.clone(), tipB: this._worldPositionB.clone(), time: 0 });
    }

    // 궤적의 두께는 두 Object3D의 상대적 위치로 결정되므로 별도의 setTrailWidth는 필요 없음
    // 만약 특정 너비를 강제하고 싶다면, 이 메서드를 다시 추가하고 
    // updateTrailMesh에서 p1a, p1b, p2a, p2b 계산 시 강제 너비를 적용하는 로직이 필요합니다.

    update(deltaTime: number) {
        if (!this.trailMesh.visible) return
        // 두 Object3D의 현재 월드 포지션을 가져옴
        this.tipAObject.getWorldPosition(this._worldPositionA);
        this.tipBObject.getWorldPosition(this._worldPositionB);

        // 이전 팁 A 위치와 현재 팁 A 위치 간의 거리를 측정하여 새로운 점 추가 여부 결정
        const lastPoint = this.points[this.points.length - 1];
        if (!lastPoint || this._worldPositionA.distanceTo(lastPoint.tipA) > this.minDistance) {
            this.points.push({
                tipA: this._worldPositionA.clone(), // 현재 월드 포지션을 복사하여 저장
                tipB: this._worldPositionB.clone(), // 현재 월드 포지션을 복사하여 저장
                time: 0 // 이 점이 생성된 후 경과 시간
            });

            if (this.points.length > this.maxPoints) {
                this.points.shift(); // 오래된 점 제거
            }
        }

        // 각 점의 시간 업데이트 및 오래된 점 제거
        for (let i = this.points.length - 1; i >= 0; i--) {
            this.points[i].time += deltaTime;
            if (this.points[i].time > this.trailDuration) {
                this.points.splice(i, 1);
            }
        }

        this.updateTrailMesh();
    }

    updateTrailMesh() {
        if (this.points.length < 2) {
            // 점이 부족하면 메시를 비활성화하거나 숨김
            this.trailMesh.visible = false;
            return;
        } else {
            this.trailMesh.visible = true;
        }

        const positions = [];
        const customColors = []; // RGBA
        const indices = [];

        // 궤적을 구성하는 각 세그먼트 (두 개의 삼각형으로 사각형 형성)
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];

            // 첫 번째 세그먼트 끝의 팁 (월드 좌표)
            const p1a = p1.tipA;
            const p1b = p1.tipB;

            // 두 번째 세그먼트 끝의 팁 (월드 좌표)
            const p2a = p2.tipA;
            const p2b = p2.tipB;

            // 정점 추가
            positions.push(p1a.x, p1a.y, p1a.z); // 0
            positions.push(p1b.x, p1b.y, p1b.z); // 1
            positions.push(p2a.x, p2a.y, p2a.z); // 2
            positions.push(p2b.x, p2b.y, p2b.z); // 3

            // 색상 및 투명도 (점점 투명해지도록)
            const alpha1 = 1.0 - (p1.time / this.trailDuration);
            const alpha2 = 1.0 - (p2.time / this.trailDuration);

            customColors.push(this.trailColor.r, this.trailColor.g, this.trailColor.b, alpha1);
            customColors.push(this.trailColor.r, this.trailColor.g, this.trailColor.b, alpha1);
            customColors.push(this.trailColor.r, this.trailColor.g, this.trailColor.b, alpha2);
            customColors.push(this.trailColor.r, this.trailColor.g, this.trailColor.b, alpha2);

            // 인덱스 (두 개의 삼각형으로 사각형 구성)
            const baseIndex = i * 4;
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2); // 삼각형 1 (p1a, p1b, p2a)
            indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2); // 삼각형 2 (p1b, p2b, p2a)
        }

        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(customColors, 4)); // RGBA
        this.geometry.setIndex(indices);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.customColor.needsUpdate = true;
    }

    // 궤적 활성화/비활성화 (예: 공격 시작/종료 시)
    startTrail() {
        this.points = [];
        // 시작 시 현재 위치에서 팁 오프셋을 적용하여 첫 점 추가
        this.tipAObject.getWorldPosition(this._worldPositionA);
        this.tipBObject.getWorldPosition(this._worldPositionB);
        this.points.push({ tipA: this._worldPositionA.clone(), tipB: this._worldPositionB.clone(), time: 0 });
        this.trailMesh.visible = true;
    }

    stopTrail() {
        this.points = [];
        this.trailMesh.visible = false;
        // 필요하다면 geometry를 초기화하여 메모리 해제
        this.geometry.dispose();
        this.geometry = new THREE.BufferGeometry();
        this.trailMesh.geometry = this.geometry;
    }
}