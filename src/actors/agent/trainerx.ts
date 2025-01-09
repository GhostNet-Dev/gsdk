import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { EventTypes } from '@Glibs/types/globaltypes';
import { TrainingParam } from '@Glibs/types/agenttypes';
import { AttackOption, AttackType } from '@Glibs/types/playertypes';
import ModelStore from './modelstore';
import IState, { DistanceState } from './state';
import DQNAgent from './dqn';

class SimpleAgent implements IEnvironment {
    currentAction = 0
    timeoutId?: NodeJS.Timeout
    interval = 500
    param: TrainingParam
    eventTarget = new EventTarget()
    actionSpace = 4

    constructor(
        private state: IState,
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

        eventCtrl.RegisterEventListener(EventTypes.Attack + "aiagent", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.Heal:
                        this.param.agentSkillLevel += 1; // 목표 도달
                        const r = this.param.goalReward + this.param.agentSkillLevel * 2;
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `+ ${r} Reward!!`)
                        this.eventTarget.dispatchEvent(new CustomEvent("goal", {
                            detail: {data: [this.state.getState(), r, true]}
                        }))
                        
                        if (opt.callback) opt.callback()
                        break;
                }
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.NormalSwing:
                    case AttackType.Magic0:
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `${this.param.enermyReward} Reward..`)
                        this.eventTarget.dispatchEvent(new CustomEvent("goal", {
                            detail: { data: [this.state.getState(), this.param.enermyReward, true] }
                        }))
                        break;
                }
            })
        })
    }
    reset(): number[] {
        return this.state.resetState()
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
    async step(action: number): Promise<[number[], number, boolean]> {
        this.applyAction(action)
        return new Promise((resolve) => {
            clearTimeout(this.timeoutId)

            this.timeoutId = setTimeout(() => {
                const reward = this.param.stepReward;
                const nextState = this.state.getState();
                resolve([nextState, reward, false])
            }, this.interval)
        })
    }
    async eventStep(action: number): Promise<[number[], number, boolean]> {
        return new Promise((resolve) => {
            const handler = (e: any) => {
                clearTimeout(this.timeoutId)
                resolve(e)
            }
            this.eventTarget.removeEventListener("goal", handler)
            this.eventTarget.addEventListener("goal", handler)
        })
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
}

export default class TrainerX {
    currentState: number[]
    totalReward = 0;
    step = 0;

    obstacles: THREE.Mesh[] = [];
    stateSize: number = 4// 에이전트 x, y 좌표 및 스킬 레벨, 적의 근접도
    currentAction = 0
    timeoutId?: NodeJS.Timeout
    interval = 500
    clock = new THREE.Clock
    param: TrainingParam
    enable = false
    state: IState
    env: IEnvironment
    network: DQNAgent


    constructor(
        private eventCtrl: IEventController,
        modelStore: ModelStore,
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
        this.env = new SimpleAgent(this.state, eventCtrl, modelStore, agent, enermy, goal, this.param)
        this.network = new DQNAgent(this.state.getStateSize(), this.env.actionSpace)

        this.currentState = this.state.getState()
        this.agent.Pos.set(0, 0, 0);
        
        eventCtrl.RegisterEventListener(EventTypes.AgentSave, async (title: string, download: boolean) => {
            try {
            } catch (e) {
                eventCtrl.SendEventMessage(EventTypes.Toast, "Save Model", title + " - failed!: " + e)
            } finally {
                eventCtrl.SendEventMessage(EventTypes.Toast, "Save Model", title + " - Complete!")
            }
        })
        eventCtrl.RegisterEventListener(EventTypes.AgentLoad, (model: tf.Sequential, data: string) => {
            
        })
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            clearTimeout(this.timeoutId)
            if(scale == 0) {
                this.enable = false
                return
            }
            this.enable = true
            this.param.timeScale = scale
        })
    }

    getInterval() {
        const time = this.interval / this.param.timeScale
        return time
    }
    resetGame(): void {
        this.agent.Pos.set(0, 0, 0);
        this.param.agentSkillLevel = 1;
        this.currentState = this.state.getState();
        this.totalReward = 0;
        this.step = 0;

        this.param.epsilon = Math.max(0.1, this.param.epsilon * this.param.epsilonDecay);
    }
    Start() {
        this.enable = true
        this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param)
        this.timeoutId = setTimeout(() => {
            this.gameLoop()
        }, 0)
    }
    async gameLoop() {
        let state = this.env.reset();
        let totalReward = 0;
        this.resetGame()

        for (let t = 0; t < 1000; t++) {
            const action = this.network.selectAction(state);
            const [nextState, reward, done] = await Promise.race([
                this.env.step(action),
                this.env.eventStep(action)
            ])

            this.network.storeExperience(state, action, reward, nextState, done);
            state = nextState;
            totalReward += reward;

            await this.network.train();

            if (done) break;
        }
        console.log(`Episode ${this.param.episode + 1}: Total Reward = ${totalReward}`);
        this.param.episode ++
        this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param)
        this.timeoutId = setTimeout(() => {
            this.gameLoop()
        }, 0)
    }
}

