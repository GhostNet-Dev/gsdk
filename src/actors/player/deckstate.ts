import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate"
import { AttackType, PlayerCtrl } from "./playerctrl";
import { ActionType, Player } from "./player";
import { GPhysics } from "../../common/physics/gphysics";
import { EventController } from "../../event/eventctrl";

export class DeckState extends State implements IPlayerAction {
    next: IPlayerAction = this
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: GPhysics, private eventCtrl: EventController) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        console.log("deck!!")
        this.player.ChangeAction(ActionType.MagicH1) ?? 2
        this.playerCtrl.RunSt.PreviousState(this.playerCtrl.IdleSt)
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
                this.eventCtrl.OnAttackEvent(k, [msg])
            }
        } else {
            this.playerCtrl.IdleSt.Init()
            return this.playerCtrl.IdleSt
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