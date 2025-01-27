import * as THREE from 'three';
import IEventController from '@Glibs/interface/ievent';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { EventTypes } from '@Glibs/types/globaltypes';
import { TrainingParam } from '@Glibs/types/agenttypes';
import { AttackOption, AttackType } from '@Glibs/types/playertypes';
import ModelStore from './modelstore';
import IState from './state';


export default class SimpleEnv implements IEnvironment {
    currentAction = 0
    timeoutId?: NodeJS.Timeout
    interval = 500
    eventTarget = new EventTarget()
    eventQueue: CustomEvent[] = []
    actionSpace = 4
    enable = false

    constructor(
        private state: IState,
        private eventCtrl: IEventController,
        private modelStore: ModelStore,
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        private param: TrainingParam
    ) { 
        eventCtrl.RegisterEventListener(EventTypes.Attack + "aiagent", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch (opt.type) {
                    case AttackType.Heal:
                        this.param.agentSkillLevel += 1; // 목표 도달
                        this.param.doneCount++
                        const r = this.param.goalReward + this.param.agentSkillLevel * 2;
                        this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `+ ${r} Reward!!`)
                        const e = new CustomEvent("goal", {
                            detail: {data: [this.state.getState(), r, true]}
                        })
                        this.eventTarget.dispatchEvent(e)
                        this.eventQueue.push(e)
                        
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
                            detail: { data: [this.state.getState(), this.param.enermyReward, false] }
                        }))
                        break;
                }
            })
        })

        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            if(scale == 0) {
                this.enable = false
                return
            }
            this.eventTarget.dispatchEvent(new CustomEvent("pause"))
            this.enable = true
            this.param.timeScale = scale
        })
    }
    reset(): number[] {
        return this.state.resetState()
    }
    getInterval() {
        const time = this.interval / this.param.timeScale
        return time
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
    checkMapout() {
        if (this.agent.Pos.x > this.param.mapSize || this.agent.Pos.x < -this.param.mapSize ||
            this.agent.Pos.z > this.param.mapSize || this.agent.Pos.z < -this.param.mapSize )
            return true
        return false
    }
    async step(action: number): Promise<[number[], number, boolean]> {
        this.applyAction(action)
        return new Promise((resolve) => {
            clearTimeout(this.timeoutId)

            this.timeoutId = setTimeout(() => {
                let reward = this.param.stepReward;
                const nextState = this.state.getState();
                const mapOut =  this.checkMapout()
                if(mapOut) reward += this.param.enermyReward * 10
                resolve([nextState, reward, mapOut])
            }, this.getInterval())
        })
    }
    async eventStep(action: number): Promise<[number[], number, boolean]> {
        return new Promise((resolve) => {
            const handler = (e: any) => {
                this.eventTarget.removeEventListener("goal", handler)
                this.eventQueue.shift()
                resolve(e.detail.data)
            }
            this.eventTarget.removeEventListener("goal", handler)
            this.eventTarget.addEventListener("goal", handler)
            this.eventQueue.forEach((e) => { this.eventTarget.dispatchEvent(e) })
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
