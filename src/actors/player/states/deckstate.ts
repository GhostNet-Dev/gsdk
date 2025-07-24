import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate"
import { PlayerCtrl } from "../playerctrl";
import { Player } from "../player";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { ActionType, AttackType } from "../playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";

export class DeckState extends State implements IPlayerAction {
    next: IPlayerAction = this
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, private eventCtrl: IEventController) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        console.log("deck!!")
        this.player.ChangeAction(ActionType.MagicH1) ?? 2
    }
    deckBuilding() {
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            for(let i = 0; i < intersects.length; i++) {
                const obj = intersects[i]
                if (obj.distance> this.attackDist) return 
                const k = obj.object.name
                const msg = {
                    type: AttackType.Delete,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
            }
        } else {
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
    }
    Uninit(): void {
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        const p = this.deckBuilding()
        if(p != undefined) {
            this.Uninit()
            return p
        }

        return this.next
    }
}