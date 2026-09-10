import * as THREE from "three";
import { AllyModel } from "./allymodel";
import { IAllyCtrl, AllyBox, AllyProperty } from "./allytypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { StatKey } from "@Glibs/types/stattypes";
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { CombatDebugTeam } from "@Glibs/systems/debugger/combatdebugtypes";
import { TargetSelectionPolicy } from "@Glibs/systems/targeting/targetselectionpolicy";
import { NearestHostilePolicy } from "@Glibs/systems/targeting/policies/nearesthostilepolicy";
import { ActorCombatController } from "@Glibs/actors/battle/actorcombatcontroller";

export class AllyCtrl extends ActorCombatController<AllyProperty> implements IAllyCtrl {
    constructor(
        id: number,
        private readonly deckLevel: number,
        allyModel: AllyModel,
        gphysic: IGPhysic,
        eventCtrl: IEventController,
        property: AllyProperty,
        stats: Partial<Record<StatKey, number>>,
    ) {
        super({
            id, model: allyModel, gphysic, eventCtrl, property, stats,
            idPrefix: "ally",
            idleStates: property.idleStates!,
            adapterEmptyTargetId: TargetTeamId.Monster,
            // 아군은 타겟 없으면 제자리 대기 — 위치 폴백 없음.
            adapterFallback: undefined,
        })
    }

    protected get aggroRange() { return 60 }
    protected get debugTeam() { return CombatDebugTeam.Ally }
    protected get debugActor() { return "ally" }
    protected get verboseTargetLogs() { return true }

    protected createPhybox(id: number, size: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true })
        return new AllyBox(id, "ally", this.property.id, geometry, material)
    }

    protected createDefaultTargetPolicy(): TargetSelectionPolicy {
        return new NearestHostilePolicy()
    }

    protected getFallbackTargetId(): string | undefined {
        return undefined
    }

    get AllyBox() { return this.phybox as AllyBox }
    get DeckLevel() { return this.deckLevel }

    Summoned(): void {
        this.resetForSpawn()
    }
}
