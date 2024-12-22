import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';

// 타입 선언
type Position = { x: number; y: number };

export type TraingParam = {
    stateSize: number // 에이전트 x, y 좌표 및 스킬 레벨, 적의 근접도
    actionSize: number // 상, 하, 좌, 우
    gamma: number // 할인율
    epsilon: number // 탐험 비율
    epsilonDecay: number
    learningRate: number
}
export default class Traing {
    currentState = this.getState();
    totalReward = 0;
    step = 0;
    episode = 0;
    doneCount = 0;
    // 상태 및 레벨 데이터
    agentPosition: Position = { x: 0, y: 0 };
    agentSkillLevel = 1; // 에이전트 초기 스킬 레벨
    enemyProximity = 5.0; // 적의 거리
    enemyPosition: Position = { x: 3, y: 3 };
    // 적 추적 속도
    enemySpeed = 0.05;

    goalPosition: Position = { x: 5, y: 5 };
    obstaclePositions: Position[] = [
        { x: 1, y: 2 },
        { x: -2, y: -1 },
        { x: 3, y: -2 },
    ];

    obstacles: THREE.Mesh[] = [];
    qNetwork: tf.Sequential
    agent: THREE.Mesh
    enemy: THREE.Mesh
    goal: THREE.Mesh

    constructor(
        private scene: THREE.Scene,
        private param: TraingParam = {
        stateSize: 4,
        actionSize: 4,
        gamma: 0.99,
        epsilon: 1.0,
        epsilonDecay: 0.995,
        learningRate: 0.01
    }) {
        // Q-Network 정의
        this.qNetwork = tf.sequential();
        this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [this.param.stateSize] }));
        this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        this.qNetwork.add(tf.layers.dense({ units: this.param.actionSize }));
        this.qNetwork.compile({ optimizer: tf.train.adam(this.param.learningRate), loss: 'meanSquaredError' });

        // 에이전트, 적, 목표 설정
        this.agent = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.2),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        scene.add(this.agent);

        this.enemy = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        scene.add(this.enemy);

        this.goal = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.4, 0.4),
            new THREE.MeshBasicMaterial({ color: 0x0000ff })
        );
        scene.add(this.goal);

        this.agent.position.set(0, 0, 0);
        this.enemy.position.set(3, 3, 0);
        this.goal.position.set(5, 5, 0);


    }
    // 장애물 생성
    createObstacles(): void {
        const obstacleGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        for (const pos of this.obstaclePositions) {
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
            obstacle.position.set(pos.x, pos.y, 0);
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }
    }

    // 충돌 확인
    isCollidingWithObstacle(position: Position): boolean {
        return this.obstaclePositions.some((obstacle) => {
            const dx = position.x - obstacle.x;
            const dy = position.y - obstacle.y;
            return Math.sqrt(dx * dx + dy * dy) < 0.5;
        });
    }


    // 적 캐릭터 추적
    updateEnemyPosition(): void {
        const dx = this.agentPosition.x - this.enemyPosition.x;
        const dy = this.agentPosition.y - this.enemyPosition.y;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0.1) {
            this.enemyPosition.x += (dx / distance) * this.enemySpeed;
            this.enemyPosition.y += (dy / distance) * this.enemySpeed;
        }

        this.enemy.position.set(this.enemyPosition.x, this.enemyPosition.y, 0);
    }

    // 상태 계산
    getState(): number[] {
        const distanceToEnemy = Math.sqrt(
            Math.pow(this.agentPosition.x - this.enemyPosition.x, 2) + Math.pow(this.agentPosition.y - this.enemyPosition.y, 2)
        );
        this.enemyProximity = Math.min(5.0, distanceToEnemy);
        return [this.agentPosition.x / 5, this.agentPosition.y / 5, this.agentSkillLevel / 10, this.enemyProximity / 5];
    }

    // 행동 선택
    selectAction(state: number[]): number {
        if (Math.random() < this.param.epsilon) {
            return Math.floor(Math.random() * this.param.actionSize); // 랜덤 행동
        } else {
            return tf.tidy(() => {
                const qValues = this.qNetwork.predict(tf.tensor2d([state])) as tf.Tensor;
                return qValues.argMax(1).dataSync()[0];
            });
        }
    }

    // 행동 적용
    applyAction(action: number): void {
        const previousPosition: Position = { ...this.agentPosition }; // 이전 위치 저장

        switch (action) {
            case 0:
                this.agentPosition.y += 1;
                break; // 위로 이동
            case 1:
                this.agentPosition.y -= 1;
                break; // 아래로 이동
            case 2:
                this.agentPosition.x -= 1;
                break; // 왼쪽으로 이동
            case 3:
                this.agentPosition.x += 1;
                break; // 오른쪽으로 이동
        }

        if (this.isCollidingWithObstacle(this.agentPosition)) {
            this.agentPosition = previousPosition; // 충돌 시 이전 위치로 복귀
        }

        this.agentPosition.x = Math.max(-5, Math.min(5, this.agentPosition.x));
        this.agentPosition.y = Math.max(-5, Math.min(5, this.agentPosition.y));
        this.agent.position.set(this.agentPosition.x, this.agentPosition.y, 0);
    }

    // 보상 계산
    getReward(): number {
        const currentDistance = Math.sqrt(
            Math.pow(this.goalPosition.x - this.agentPosition.x, 2) +
            Math.pow(this.goalPosition.y - this.agentPosition.y, 2)
        );
        if (
            Math.abs(this.agentPosition.x - this.goalPosition.x) < 0.5 &&
            Math.abs(this.agentPosition.y - this.goalPosition.y) < 0.5
        ) {
            this.agentSkillLevel += 1; // 목표 도달
            return 10 + this.agentSkillLevel * 2;
        }
        if (this.enemyProximity < 1.0) {
            return -5; // 적과 충돌 시 페널티
        }
        if (this.isCollidingWithObstacle(this.agentPosition)) {
            return -3; // 장애물 충돌 시 페널티
        }
        return -currentDistance; // 일반 이동 페널티
    }

    // 학습 루프
    async trainStep(
        state: number[],
        action: number,
        reward: number,
        nextState: number[],
        done: boolean
    ): Promise<void> {
        const targetQ = tf.tidy(() => {
            const qNext = this.qNetwork.predict(tf.tensor2d([nextState])) as tf.Tensor;
            const maxQNext = qNext.max(1).dataSync()[0];
            const target = done ? reward : reward + this.param.gamma * maxQNext;

            const qValues = this.qNetwork.predict(tf.tensor2d([state])) as tf.Tensor;
            const qUpdate = Array.from(qValues.dataSync());
            qUpdate[action] = target;

            return tf.tensor2d([qUpdate]);
        });

        await this.qNetwork.fit(tf.tensor2d([state]), targetQ, { epochs: 1 });
        targetQ.dispose();
    }
    gameLoop(): void {
        const action = this.selectAction(this.currentState);
        this.applyAction(action);

        this.updateEnemyPosition();

        const reward = this.getReward();
        this.totalReward += reward;

        const nextState = this.getState();
        const done =
            Math.abs(this.agentPosition.x - this.goalPosition.x) < 0.5 &&
            Math.abs(this.agentPosition.y - this.goalPosition.y) < 0.5;

        this.trainStep(this.currentState, action, reward, nextState, done).then(() => {
            this.currentState = nextState;
            if (done) this.doneCount++;
            if (done || this.step >= 50) {
                console.log(`Episode ${this.episode} finished with total reward: ${this.totalReward}`);
                this.episode++;
                this.resetGame();
            } else {
                this.step++;
            }
        });
    }

    resetGame(): void {
        this.agentPosition = { x: 0, y: 0 };
        this.agent.position.set(0, 0, 0);
        this.enemyPosition = { x: 0, y: 0 };
        this.agentSkillLevel = 1;
        this.currentState = this.getState();
        this.totalReward = 0;
        this.step = 0;
        this.createObstacles();

        this.param.epsilon = Math.max(0.1, this.param.epsilon * this.param.epsilonDecay);
    }

}

