import IEventController from '@Glibs/interface/ievent';
import { IPhysicsObject, PhysicsObject } from '@Glibs/interface/iobject';
import { KeyDown, KeyLeft, KeyRight, KeyUp } from '@Glibs/systems/event/keycommand';
import { EventTypes } from '@Glibs/types/globaltypes';
import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';

// 타입 선언
type Position = { x: number; y: number };

export type TraingParam = {
    actionSize: number // 상, 하, 좌, 우
    gamma: number // 할인율
    epsilon: number // 탐험 비율
    epsilonDecay: number
    learningRate: number
    mapSize: number
}
export default class Training {
    currentState = this.getState();
    totalReward = 0;
    step = 0;
    episode = 0;
    doneCount = 0;
    // 상태 및 레벨 데이터
    agentSkillLevel = 1; // 에이전트 초기 스킬 레벨

    obstacles: THREE.Mesh[] = [];
    qNetwork: tf.Sequential
    stateSize: number = 4// 에이전트 x, y 좌표 및 스킬 레벨, 적의 근접도

    constructor(
        private eventCtrl: IEventController,
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        private param: TraingParam = {
        actionSize: 4,
        gamma: 0.99,
        epsilon: 1.0,
        epsilonDecay: 0.995,
        learningRate: 0.01,
        mapSize: 300
    }) {
        this.stateSize = 4 + this.enermy.length * 3 + this.goal.length * 3
        // Q-Network 정의
        this.qNetwork = tf.sequential();
        this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [this.stateSize] }));
        this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        this.qNetwork.add(tf.layers.dense({ units: this.param.actionSize }));
        this.qNetwork.compile({ optimizer: tf.train.adam(this.param.learningRate), loss: 'meanSquaredError' });

        this.agent.Pos.set(0, 0, 0);
    }

    isCollidingWithEnermy(pos: THREE.Vector3) {
        return this.enermy.some((e) => {
            if (e.Pos.distanceTo(pos) < 1.0) {
                return true
            }
            return false
        })
    }

    // 상태 계산
    getState(): number[] {
        const state = [
            this.agent.Pos.x / this.param.mapSize, 
            this.agent.Pos.y / this.param.mapSize, 
            this.agent.Pos.z / this.param.mapSize, 
            this.agentSkillLevel / 10];
        this.enermy.forEach((e) => {
            state.push(e.Pos.x, e.Pos.y, e.Pos.z)
        })
        this.goal.forEach((g) => {
            state.push(g.Pos.x, g.Pos.y, g.Pos.z)
        })
        return state
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
        const pos = new THREE.Vector3()
        switch (action) {
            case 0:
                pos.z = -.5
                break; // 위로 이동
            case 1:
                pos.z = .5
                break; // 아래로 이동
            case 2:
                pos.x = -.5
                break; // 왼쪽으로 이동
            case 3:
                pos.x = .5
                break; // 오른쪽으로 이동
        }
        this.eventCtrl.SendEventMessage(EventTypes.Input, { type: "move" }, pos); 
    }

    // 보상 계산
    getReward(): number {
        let currentDistance = 10;
        const goalFlag = this.goal.some((g) => {
            const d = this.agent.Pos.distanceTo(g.Pos)
            if ( d < 0.5) {
                return true
            }
            if (currentDistance < d) currentDistance = d
            return false
        })

        if(goalFlag) {
            this.agentSkillLevel += 1; // 목표 도달
            return 10 + this.agentSkillLevel * 2;
        }
        if (this.isCollidingWithEnermy(this.agent.Pos)) {
            return -5; // 적과 충돌 시 페널티
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
    interval = 500
    Start() {
        const action = this.selectAction(this.currentState);
        this.applyAction(action);
        setTimeout(() => {
            this.gameLoop(action)
        }, this.interval);
    }
    gameLoop(action: number): void {
        const reward = this.getReward();
        this.totalReward += reward;

        const nextState = this.getState();
        const done = this.goal.some((g) => {
            if (g.Pos.distanceTo(this.agent.Pos) < 0.5) return true;
            return false;
        })

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
        const nextAction = this.selectAction(this.currentState);
        this.applyAction(nextAction);
        setTimeout(() => {
            this.gameLoop(nextAction)
        }, this.interval)
    }

    resetGame(): void {
        this.agent.Pos.set(0, 0, 0);
        this.agentSkillLevel = 1;
        this.currentState = this.getState();
        this.totalReward = 0;
        this.step = 0;

        this.param.epsilon = Math.max(0.1, this.param.epsilon * this.param.epsilonDecay);
    }

}

