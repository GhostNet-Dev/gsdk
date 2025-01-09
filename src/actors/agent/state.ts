import { IPhysicsObject } from "@Glibs/interface/iobject";

export default interface IState {
    getState(): number[]
    getStateSize(): number
    resetState(): number[]
}

export class PositionState implements IState {
    constructor(
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        private mapSize: number,
    ) {
    }
    getStateSize(): number {
        return 2 + this.enermy.length * 2 + this.goal.length * 2
    }
    getState(): number[] {
        const state = [
            this.agent.Pos.x / this.mapSize,
            // this.agent.Pos.y / this.mapSize,
            this.agent.Pos.z / this.mapSize];
        this.enermy.forEach((e) => {
            state.push(
                e.Pos.x / this.mapSize, 
                // e.Pos.y / this.mapSize,
                e.Pos.z / this.mapSize
            )
        })
        this.goal.forEach((g) => {
            state.push(
                g.Pos.x / this.mapSize, 
                // g.Pos.y / this.mapSize, 
                g.Pos.z / this.mapSize
            )
        })
        return state
    }
    resetState(): number[] {
        return Array(this.getStateSize()).fill(0)
    }
}
export class DistanceState implements IState {
    constructor(
        private agent: IPhysicsObject,
        private enermy: IPhysicsObject[],
        private goal: IPhysicsObject[],
        private mapSize: number,
    ) {
    }
    getStateSize(): number {
        return 2 + this.enermy.length + this.goal.length
    }
    getState(): number[] {
        const state = [
            this.agent.Pos.x / this.mapSize,
            // this.agent.Pos.y / this.mapSize,
            this.agent.Pos.z / this.mapSize];
        this.enermy.forEach((e) => {
            state.push(this.agent.Pos.distanceTo(e.Pos) / this.mapSize)
        })
        this.goal.forEach((g) => {
            state.push(this.agent.Pos.distanceTo(g.Pos) / this.mapSize)
        })
        return state
    }
    resetState(): number[] {
        return Array(this.getStateSize()).fill(0)
    }
}