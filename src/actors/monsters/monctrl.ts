import * as THREE from "three";
import { Zombie } from "./zombie"
import { IMonsterCtrl, MonsterBox } from "./monsters";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController from "@Glibs/interface/ievent";
import { MonsterProperty } from "./monstertypes";
import { StatKey } from "@Glibs/types/stattypes";
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { CombatDebugTeam } from "@Glibs/systems/debugger/combatdebugtypes";
import { TargetSelectionPolicy } from "@Glibs/systems/targeting/targetselectionpolicy";
import { ThreatAwareNearestPolicy } from "@Glibs/systems/targeting/policies/threatawarenearestpolicy";
import { ActorCombatController } from "@Glibs/actors/battle/actorcombatcontroller";

export class MonsterCtrl extends ActorCombatController<MonsterProperty> implements IMonsterCtrl {
    constructor(
        id: number,
        player: IPhysicsObject,
        zombie: Zombie,
        gphysic: IGPhysic,
        eventCtrl: IEventController,
        property: MonsterProperty,
        stats: Partial<Record<StatKey, number>>,
    ) {
        super({
            id, model: zombie, gphysic, eventCtrl, property, stats,
            idPrefix: "mon",
            idleStates: property.idleStates!,
            adapterEmptyTargetId: TargetTeamId.Player,
            adapterFallback: player,
        })
    }

    // 고웨이브 스폰 링 반지름(35 + wave*8)이 60을 초과하면 갓 스폰된 몬스터가 타겟을 못 잡는다.
    protected get aggroRange() { return 80 }
    protected get debugTeam() { return CombatDebugTeam.Monster }
    protected get debugActor() { return "monster" }
    protected get verboseTargetLogs() { return false }

    protected createPhybox(id: number, size: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        return new MonsterBox(id, "mon", this.property.id, geometry, material)
    }

    protected createDefaultTargetPolicy(): TargetSelectionPolicy {
        return new ThreatAwareNearestPolicy()
    }

    protected getFallbackTargetId(): string | undefined {
        return TargetTeamId.Player
    }

    get Drop() { return this.property.drop }
    get MonsterBox() { return this.phybox as MonsterBox }
    get MonsterProperty() { return this.property }

    Respawning() {
        this.resetForSpawn()
    }
}
