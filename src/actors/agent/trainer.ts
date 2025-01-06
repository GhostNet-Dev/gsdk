import IEventController from '@Glibs/interface/ievent';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { EventTypes } from '@Glibs/types/globaltypes';
import { TrainingParam } from '@Glibs/types/agenttypes';
import { AttackOption, AttackType } from '@Glibs/types/playertypes';
import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import ModelStore from './modelstore';


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
    currentAction = 0
    timeoutId?: NodeJS.Timeout
    timeScale = 1

    constructor(
        private eventCtrl: IEventController,
        private modelStore: ModelStore,
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        private param: TrainingParam = {
            actionSize: 4,
            gamma: 0.99,
            epsilon: 1.0,
            epsilonDecay: 0.995,
            learningRate: 0.01,
            mapSize: 300
        }
    ) {
        this.stateSize = 4 + this.enermy.length * 3 + this.goal.length * 3
        // Q-Network 정의
        this.qNetwork = tf.sequential();
        this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [this.stateSize] }));
        this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        this.qNetwork.add(tf.layers.dense({ units: this.param.actionSize }));
        this.qNetwork.compile({ optimizer: tf.train.adam(this.param.learningRate), loss: 'meanSquaredError' });

        this.agent.Pos.set(0, 0, 0);
        eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.NormalSwing:
                    case AttackType.Magic0:
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `-5 Reward..`)
                        this.rewardEventLoop(-5)
                        break;
                }
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "aiagent", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.Heal:
                        this.agentSkillLevel += 1; // 목표 도달
                        const r = 10 + this.agentSkillLevel * 2;
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `+ ${r} Reward!!`)
                        this.rewardEventLoop(r, true)
                        break;
                }
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.AgentSave, async (title: string, download:boolean) => {
            await this.modelStore.trainAndSaveModel(this.qNetwork, { title, download })
            eventCtrl.SendEventMessage(EventTypes.Toast, "Save Model", title + " - Complete!")
        })
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            clearTimeout(this.timeoutId)
            if(scale == 0) return

            this.timeScale = scale
            const nextAction = this.selectAction(this.currentState);
            this.applyAction(nextAction);
            this.timeoutId = setTimeout(() => {
                this.gameLoop(nextAction)
            }, this.interval / this.timeScale)
        })
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
        const moveDistance = .5 / this.timeScale
        switch (action) {
            case 0:
                pos.z = -moveDistance
                break; // 위로 이동
            case 1:
                pos.z = moveDistance
                break; // 아래로 이동
            case 2:
                pos.x = -moveDistance
                break; // 왼쪽으로 이동
            case 3:
                pos.x = moveDistance
                break; // 오른쪽으로 이동
        }
        this.eventCtrl.SendEventMessage(EventTypes.Input, { type: "move" }, pos);
        this.currentAction = action
    }

    // 보상 계산
    getReward(): number {
        let currentDistance = 10;
        const goalFlag = this.goal.some((g) => {
            const d = this.agent.Pos.distanceTo(g.Pos)
            if (d < 1) {
                return true
            }
            if (currentDistance < d) currentDistance = d
            return false
        })

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
        this.timeoutId = setTimeout(() => {
            this.gameLoop(action)
        }, this.interval);
    }
    checkTrainingDone(nextState: number[], done: boolean) {
        this.currentState = nextState;
        if (done) this.doneCount++;
        if (done || this.step >= 50) {
            const logTxt = `Episode ${this.episode} finished\nReward: ${this.totalReward.toFixed(2)}`
            console.log(logTxt);
            this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, logTxt)
            this.episode++;
            this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param, this.episode)
            this.resetGame();
        } else {
            this.step++;
        }
    }
    // training loop외 event에 의해 발생한 reward
    rewardEventLoop(reward: number, done = false) {
        clearTimeout(this.timeoutId)
        this.totalReward += reward;
        const nextState = this.getState();
        this.trainStep(this.currentState, this.currentAction, reward, nextState, done).then(() => {
            this.checkTrainingDone(nextState, done)
        })
        const nextAction = this.selectAction(this.currentState);
        this.applyAction(nextAction);
        this.timeoutId = setTimeout(() => {
            this.gameLoop(nextAction)
        }, this.interval / this.timeScale)
    }
    gameLoop(action: number): void {
        const reward = this.getReward();
        this.totalReward += reward;

        const nextState = this.getState();
        const done = this.goal.some((g) => {
            if (g.Pos.distanceTo(this.agent.Pos) < 1.5) return true;
            return false;
        })

        this.trainStep(this.currentState, action, reward, nextState, done).then(() => {
            this.checkTrainingDone(nextState, done)
        });
        const nextAction = this.selectAction(this.currentState);
        this.applyAction(nextAction);
        this.timeoutId = setTimeout(() => {
            this.gameLoop(nextAction)
        }, this.interval / this.timeScale)
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

