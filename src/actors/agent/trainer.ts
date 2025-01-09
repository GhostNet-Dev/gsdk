import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { EventTypes } from '@Glibs/types/globaltypes';
import { TrainingParam } from '@Glibs/types/agenttypes';
import { AttackOption, AttackType } from '@Glibs/types/playertypes';
import ModelStore from './modelstore';
import IState, { DistanceState } from './state';


export default class Trainer implements ILoop {
    currentState: number[]
    totalReward = 0;
    step = 0;

    obstacles: THREE.Mesh[] = [];
    qNetwork: tf.Sequential
    stateSize: number = 4// 에이전트 x, y 좌표 및 스킬 레벨, 적의 근접도
    currentAction = 0
    timeoutId?: NodeJS.Timeout
    interval = 500
    clock = new THREE.Clock
    param: TrainingParam
    enable = false
    state: IState

    constructor(
        private eventCtrl: IEventController,
        private modelStore: ModelStore,
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        {
            actionSize = 4,
            gamma = 0.99,
            epsilon = 1.0,
            epsilonDecay = 0.995,
            learningRate = 0.01,
            mapSize = 300,
            episode = 0,
            doneCount = 0,
            agentSkillLevel = 1, // 에이전트 초기 스킬 레벨
            timeScale = 1,
            loss = 'meanSquaredError',
            goalReward = 500,
            enermyReward = -100,
            stepReward = -20
        } = {}
    ) {
        this.param = {
            actionSize, gamma, epsilon, epsilonDecay, learningRate, mapSize, 
            episode, doneCount, agentSkillLevel, timeScale, loss, goalReward, 
            enermyReward, stepReward
        }
        this.state = new DistanceState(this.agent, this.enermy, this.goal, mapSize)
        this.currentState = this.state.getState()
        if(this.modelStore.loadedFlag) {
            [this.qNetwork, this.param] = this.modelStore.GetTraningData()
            this.param.timeScale = timeScale
            if (!this.qNetwork.optimizer) {
                this.qNetwork.compile({ optimizer: tf.train.adam(this.param.learningRate), loss });
            }
        } else {
            this.stateSize = this.state.getStateSize()
            // Q-Network 정의
            this.qNetwork = tf.sequential();
            this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [this.stateSize] }));
            this.qNetwork.add(tf.layers.dense({ units: 128, activation: 'relu' }));
            this.qNetwork.add(tf.layers.dense({ units: this.param.actionSize }));
            this.qNetwork.compile({ optimizer: tf.train.adam(this.param.learningRate), loss });
        }
        this.agent.Pos.set(0, 0, 0);
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.NormalSwing:
                    case AttackType.Magic0:
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `${this.param.enermyReward} Reward..`)
                        this.rewardEventLoop(this.param.enermyReward)
                        break;
                }
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "aiagent", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.Heal:
                        this.param.agentSkillLevel += 1; // 목표 도달
                        const r = this.param.goalReward + this.param.agentSkillLevel * 2;
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `+ ${r} Reward!!`)
                        this.rewardEventLoop(r, true)
                        if (opt.callback) opt.callback()
                        break;
                }
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.AgentSave, async (title: string, download: boolean) => {
            try {
                await this.modelStore.trainAndSaveModel(this.qNetwork, {
                    title, download, data: JSON.stringify(this.param)
                })
            } catch (e) {
                eventCtrl.SendEventMessage(EventTypes.Toast, "Save Model", title + " - failed!: " + e)
            } finally {
                eventCtrl.SendEventMessage(EventTypes.Toast, "Save Model", title + " - Complete!")
            }
        })
        eventCtrl.RegisterEventListener(EventTypes.AgentLoad, (model: tf.Sequential, data: string) => {
            this.qNetwork = model
            // timescale를 복구하려면 timectrl 메시지를 뿌려야한다.
            const backup = this.param.timeScale
            this.param = JSON.parse(data) as TrainingParam
            this.param.timeScale = backup
            if (!this.qNetwork.optimizer) {
                this.qNetwork.compile({ optimizer: tf.train.adam(this.param.learningRate), loss: 'meanSquaredError' });
            }
        })
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            clearTimeout(this.timeoutId)
            if(scale == 0) {
                this.enable = false
                return
            }
            this.enable = true

            this.param.timeScale = scale
            const nextAction = this.selectAction(this.currentState);
            this.applyAction(nextAction);
            this.timeoutId = setTimeout(() => {
                this.gameLoop(nextAction)
            }, this.getInterval())
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
    
    getRandomInt(max: number): number {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
    }
    // 행동 선택
    selectAction(state: number[]): number {
        if (Math.random() < this.param.epsilon) {
            return this.getRandomInt(this.param.actionSize); // 랜덤 행동
        } else {
            return tf.tidy(() => {
                const qValues = this.qNetwork.predict(tf.tensor2d([state])) as tf.Tensor;
                const ret = qValues.argMax(1).dataSync()[0];
                console.log(ret)
                return ret
            });
        }
    }

    // 행동 적용
    applyAction(action: number): void {
        const pos = new THREE.Vector3()
        const moveDistance = .5 
        switch (action) {
            case 0: pos.z = -moveDistance; break; // 위로 이동
            case 1: pos.z = moveDistance; break; // 아래로 이동
            case 2: pos.x = -moveDistance; break; // 왼쪽으로 이동
            case 3: pos.x = moveDistance; break; // 오른쪽으로 이동
        }
        this.eventCtrl.SendEventMessage(EventTypes.Input, { type: "move" }, pos);
        this.currentAction = action
    }

    // 추가 보상 계산
    getReward(): number {
        let currentDistance = 10;
        const goalFlag = this.goal.some((g) => {
            const d = this.agent.Pos.distanceTo(g.Pos)
            if (d < 1) return true

            if (currentDistance > d) currentDistance = d
            return false
        })
        return -currentDistance; // 일반 이동 페널티
    }

    trainingQueue: Promise<tf.History>[] = []
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

        if (this.trainingQueue.length > 0) {
            await this.trainingQueue[this.trainingQueue.length - 1]
        }

        const trainingTask = this.qNetwork.fit(tf.tensor2d([state]), targetQ, { epochs: 1 });
        this.trainingQueue.push(trainingTask)
        try {
            await trainingTask
        } finally {
            this.trainingQueue.shift()
            targetQ.dispose();
        }
    }
    getInterval() {
        const time = this.interval / this.param.timeScale
        return time
    }
    Start() {
        this.enable = true
        this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param)
        const action = this.selectAction(this.currentState);
        this.applyAction(action);
        this.timeoutId = setTimeout(() => {
            this.gameLoop(action)
        }, this.getInterval())
    }
    checkTrainingDone(nextState: number[], done: boolean) {
        this.currentState = nextState;
        if (done) this.param.doneCount++;
        if (done || this.step >= 50) {
            const logTxt = `Episode ${this.param.episode} finished\nReward: ${this.totalReward.toFixed(2)}`
            console.log(logTxt);
            this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, logTxt)
            this.param.episode++;
            this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param)
            this.resetGame();
        } else {
            this.step++;
        }
    }
    // training loop외 event에 의해 발생한 reward
    rewardEventLoop(reward: number, done = false) {
        clearTimeout(this.timeoutId)
        if (!this.enable) return

        this.totalReward += reward;
        const nextState = this.state.getState();
        this.trainStep(this.currentState, this.currentAction, reward, nextState, done).then(() => {
            this.checkTrainingDone(nextState, done)
        })
        const nextAction = this.selectAction(this.currentState);
        this.applyAction(nextAction);
        this.timeoutId = setTimeout(() => {
            this.gameLoop(nextAction)
        }, this.getInterval())
    }
    gameLoop(action: number, done = false): void {
        if (!this.enable) return

        const reward = this.getReward();
        this.totalReward += reward + this.param.stepReward;
        

        const nextState = this.state.getState();

        this.trainStep(this.currentState, action, reward, nextState, done).then(() => {
            this.checkTrainingDone(nextState, done)
        });
        const nextAction = this.selectAction(this.currentState);
        this.applyAction(nextAction);
        this.timeoutId = setTimeout(() => {
            this.gameLoop(nextAction)
        }, this.getInterval())
    }

    resetGame(): void {
        this.agent.Pos.set(0, 0, 0);
        this.param.agentSkillLevel = 1;
        this.currentState = this.state.getState();
        this.totalReward = 0;
        this.step = 0;

        this.param.epsilon = Math.max(0.1, this.param.epsilon * this.param.epsilonDecay);
    }
    update(delta: number): void {
        
    }

}

