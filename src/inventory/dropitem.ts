// Item.ts
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { ItemDropOptions } from '@Glibs/types/inventypes';
import * as THREE from 'three';


export class DropItem {
    private velocity: THREE.Vector3;
    private acceleration: THREE.Vector3;
    private player: IPhysicsObject; // 플레이어 오브젝트 참조

    private isExploding: boolean;
    private explosionDuration: number;
    private explosionTimer: number;

    private canTrack: boolean;
    private isTracking: boolean;
    private initialTrackingSpeed: number;
    private maxTrackingSpeed: number;
    private trackingAccelerationFactor: number;
    private trackingStartDelay: number;
    private trackingDelayTimer: number;

    private restitution: number;
    private friction: number;
    private bounces: number;
    private maxBounces: number;

    // 아이템 획득 범위
    private readonly ACQUISITION_RANGE = 1; // 플레이어 반지름 고려 (0.8) + 아이템 반지름 (0.2) + 여유분
    private readonly MaxTrackingDistance = 5; // 아이템이 가속되는 최대 거리

    constructor(
        public mesh: THREE.Mesh | THREE.Group,
        monsterPosition: THREE.Vector3,
        playerObject: IPhysicsObject,
        options?: ItemDropOptions
    ) {
        this.mesh.position.copy(monsterPosition);

        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.player = playerObject;

        this.isExploding = true;
        this.explosionDuration = options?.explosionDuration ?? 0.5;
        this.explosionTimer = 0;

        this.canTrack = options?.canTrack ?? true;
        this.isTracking = false;
        this.initialTrackingSpeed = options?.initialTrackingSpeed ?? 2;
        this.maxTrackingSpeed = options?.maxTrackingSpeed ?? 10;
        this.trackingAccelerationFactor = options?.trackingAccelerationFactor ?? 0.8;
        this.trackingStartDelay = options?.trackingStartDelay ?? (Math.random() * 0.2); // 기본 딜레이
        this.trackingDelayTimer = 0;

        this.restitution = options?.restitution ?? 0.6;
        this.friction = options?.friction ?? 0.8;
        this.bounces = 0;
        this.maxBounces = options?.maxBounces ?? 3;

        // 초기 폭발 방향 및 속도 설정
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5; // 5 ~ 10 사이의 초기 속도
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.z = Math.sin(angle) * speed;
        this.velocity.y = 2 + Math.random() * 3; // 위로 튀어 오르는 느낌
    }

    public update(deltaTime: number): boolean {
        // 딜레이 카운트
        if (this.trackingDelayTimer < this.trackingStartDelay) {
            this.trackingDelayTimer += deltaTime;
            this.applyPhysics(deltaTime); // 딜레이 중에도 물리 적용
            return false;
        }

        // 폭발 단계
        if (this.isExploding) {
            this.explosionTimer += deltaTime;
            if (this.explosionTimer < this.explosionDuration) {
                this.applyPhysics(deltaTime);
            } else {
                this.isExploding = false;
                if (this.canTrack) {
                    this.isTracking = true;
                }
            }
        }
        // 추적 단계 (canTrack이 true일 경우에만)
        else if (this.isTracking && this.canTrack) {
            const playerPosition = this.player.CenterPos;
            const distance = this.mesh.position.distanceTo(playerPosition);

            // 플레이어 방향으로 가속
            const directionToPlayer = playerPosition.clone().sub(this.mesh.position).normalize();

            let currentSpeed = this.initialTrackingSpeed;
            if (distance < this.MaxTrackingDistance) {
                const speedFactor = 1 - (distance / this.MaxTrackingDistance);
                currentSpeed = this.initialTrackingSpeed + (this.maxTrackingSpeed - this.initialTrackingSpeed) * speedFactor * this.trackingAccelerationFactor;
            } else {
                this.isTracking = false
                return false
            }
            currentSpeed = Math.min(currentSpeed, this.maxTrackingSpeed);

            this.acceleration.copy(directionToPlayer).multiplyScalar(currentSpeed);
            this.velocity.lerp(this.acceleration, 0.1); // 부드러운 방향 전환
            this.mesh.position.addScaledVector(this.velocity, deltaTime);

            // 아이템 획득 로직
            if (distance < this.ACQUISITION_RANGE) {
                return true; // 아이템 획득됨
            }
        }
        // 추적 불가능한 아이템이거나, 추적 단계가 아닌 아이템에 대한 물리 처리
        else {
            this.applyPhysics(deltaTime);
            // 바닥에 닿아 완전히 멈춘 아이템은 더 이상 업데이트할 필요 없음
            const distance = this.mesh.position.distanceTo(this.player.CenterPos);
            if (distance < this.MaxTrackingDistance && this.canTrack) this.isTracking = true
            if (distance < this.ACQUISITION_RANGE) return true

            if (this.bounces >= this.maxBounces && this.mesh.position.y <= 0.1 && this.velocity.lengthSq() < 0.01) {
                this.velocity.set(0,0,0); // 완전히 멈춤
                return false; // 획득되지 않음
            }
        }
        
        return false; // 획득 안 됨
    }

    private applyPhysics(deltaTime: number) {
        this.velocity.y -= 9.8 * deltaTime; // 중력 적용
        this.mesh.position.addScaledVector(this.velocity, deltaTime);

        const groundLevel = 0.5; // 아이템의 반지름 고려 (지표면)
        if (this.mesh.position.y <= groundLevel) {
            this.mesh.position.y = groundLevel;
            
            if (this.velocity.y < -0.01) { // 아래로 움직이고 있을 때만 바운스 처리
                this.velocity.y *= -this.restitution; // 속도 반전 및 탄성 적용
                this.bounces++;

                // 바닥 마찰 적용 (수평 속도 감쇠)
                this.velocity.x *= this.friction;
                this.velocity.z *= this.friction;
            } else {
                // 바운스할 힘이 없으면 완전히 멈춤
                this.velocity.y = 0;
            }
        }
    }
}