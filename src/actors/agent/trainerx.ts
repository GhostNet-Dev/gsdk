import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import IEventController from '@Glibs/interface/ievent';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { EventTypes } from '@Glibs/types/globaltypes';
import { TrainingParam } from '@Glibs/types/agenttypes';
import ModelStore from './modelstore';
import IState, { DistanceState } from './state';
import DQNAgent from './dqn';
import SimpleEnv from './simpleenv'
import { Visualization } from './vis';

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
    state: IState
    env: IEnvironment
    network: DQNAgent
    eventTarget = new EventTarget()
    vis = new Visualization()

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
            mapSize = 100,
            episode = 0,
            doneCount = 0,
            agentSkillLevel = 1, // 에이전트 초기 스킬 레벨
            timeScale = 1,
            loss = 'meanSquaredError',
            goalReward = 500,
            enermyReward = -100,
            stepReward = -20,
            step = 100,
        } = {}
    ) {
        this.param = {
            actionSize, gamma, epsilon, epsilonDecay, learningRate, mapSize, 
            episode, doneCount, agentSkillLevel, timeScale, loss, goalReward, 
            enermyReward, stepReward, step
        }
        this.state = new DistanceState(this.agent, this.enermy, this.goal, mapSize)
        this.env = new SimpleEnv(this.state, eventCtrl, modelStore, agent, enermy, goal, this.param)
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
            if (scale == 0) return
            this.eventTarget.dispatchEvent(new CustomEvent("pause"))
        })
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
        this.env.enable = true
        this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param)
        this.timeoutId = setTimeout(() => {
            this.gameLoop()
        }, 0)
    }
    async eventPause(): Promise<void> {
        return new Promise((resolve) => {
            const handler = () => {
                resolve()
            }
            this.eventTarget.removeEventListener("pause", handler)
            this.eventTarget.addEventListener("pause", handler)
        })
    }
    async gameLoop() {
        let state = this.env.reset();
        let totalReward = 0;
        let lossSum = 0;
        this.resetGame()

        let stepCount = 0
        for (stepCount = 0; stepCount < this.param.step; stepCount++) {
            if (!this.env.enable) {
                await this.eventPause()
            }
            const action = this.network.selectAction(state);
            const [nextState, reward, done] = await Promise.race([
                this.env.step(action),
                this.env.eventStep(action)
            ])

            this.network.storeExperience(state, action, reward, nextState, done);
            state = nextState;
            totalReward += reward;
            
            await this.network.train();
            lossSum += this.network['model'].history?.history.loss?.[0] as number || 0;

            if (done) break;
        }
        const logTxt = `Episode ${this.param.episode + 1}: Total Reward = ${totalReward}`;
        console.log(logTxt)
        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, logTxt)
        this.param.episode ++
        this.eventCtrl.SendEventMessage(EventTypes.AgentEpisode, this.param)

        const avgLoss = stepCount > 0 ? lossSum / stepCount : 0;

        // Update visualization
        this.vis.updateReward(this.param.episode + 1, totalReward);
        this.vis.updateLoss(this.param.episode + 1, avgLoss);
        this.vis.updateEpsilon(this.param.episode + 1, this.network['epsilon']);

        this.timeoutId = setTimeout(() => {
            this.gameLoop()
        }, 0)
    }
}

