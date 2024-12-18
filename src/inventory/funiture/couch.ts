import { Funiture, FunitureType } from "./funiture"


export class Couch extends Funiture {
    constructor() {
        super()
        this.type = FunitureType.Couch
    }
}