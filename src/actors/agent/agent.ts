import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import IEventController from "@Glibs/interface/ievent";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { EventTypes } from '@Glibs/types/globaltypes';
import IState, { DistanceState } from './state';

export default class Agent {
    mapSize: number
    agentSkillLevel: number
    currentState: number[]
    currentAction = 0
    timeoutId?: NodeJS.Timeout
    interval = 500
    state: IState

    constructor(
        private eventCtrl: IEventController,
        private qNetwork: tf.Sequential,
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        {
            mapSize = 300,
            agentSkillLevel = 1,
            learningRate = 0.01,
            loss = 'meanSquaredError'
        } = {}
    ) {
        this.state = new DistanceState(this.agent, this.enermy, this.goal, mapSize)
        this.mapSize = mapSize
        this.agentSkillLevel = agentSkillLevel
        if (!this.qNetwork.optimizer) {
            this.qNetwork.compile({ optimizer: tf.train.adam(learningRate), loss });
        }
        this.currentState = this.state.getState()

    }
    getInterval() {
        const time = this.interval
        return time
    }
    Start() {
        const action = this.selectAction(this.currentState);
        this.applyAction(action);
        this.timeoutId = setTimeout(() => {
            this.gameLoop()
        }, this.getInterval())
    }
    Stop() {
        clearTimeout(this.timeoutId)
    }
    gameLoop() {
        this.currentState = this.state.getState()
        const action = this.selectAction(this.currentState);
        this.applyAction(action);
        console.log(action)
        this.timeoutId = setTimeout(() => {
            this.gameLoop()
        }, this.getInterval())
    }
    
    selectAction(state: number[]): number {
        return tf.tidy(() => {
            const qValues = this.qNetwork.predict(tf.tensor2d([state])) as tf.Tensor;
            return qValues.argMax(1).dataSync()[0];
        });
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