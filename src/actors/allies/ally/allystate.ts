/**
 * 호환 심(shim). 실제 FSM 구현은 `@Glibs/actors/battle/actorcombatstates` 로 병합됨. (설계 §5.4)
 * import 경로와 `NewDefaultAllyState` 시그니처를 유지하기 위해 이 파일을 남긴다.
 */
import { AllyModel } from "../allymodel"
import { IGPhysic } from "@Glibs/interface/igphysics"
import IEventController from "@Glibs/interface/ievent"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { IActorState } from "../allytypes"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { AllyProperty } from "../allytypes"
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes"
import {
    ActorCombatState,
    ActorStateConfig,
    allyAttackTiming,
    AttackActorState,
    BuildActorStateSet,
    DyingActorState,
    GetActorAttackTargetId,
    HurtActorState,
    IdleActorState,
    JumpActorState,
    RunActorState,
} from "@Glibs/actors/battle/actorcombatstates"

// ── 호환 별칭 (기존 import 이름 유지) ──────────────────────────────────────────
export {
    ActorCombatState as AllyState,
    IdleActorState as IdleAllyState,
    RunActorState as RunAllyState,
    AttackActorState as AttackAllyState,
    JumpActorState as JumpAllyState,
    HurtActorState as HurtAllyState,
    DyingActorState as DyingAllyState,
}

export function GetAllyAttackTargetId(target?: IPhysicsObject) {
    return GetActorAttackTargetId(target, { fallbackTargetId: TargetTeamId.Monster } as ActorStateConfig)
}

/** AllyProperty + spec 로 아군용 FSM 설정을 만든다. */
export function BuildAllyStateConfig(prop: AllyProperty): ActorStateConfig {
    return {
        debugActor: "ally",
        fallbackTargetId: TargetTeamId.Monster,
        attackAction: prop.attackAction,
        projectileDef: prop.projectileDef,
        muzzleOffset: { x: 0, y: 1.2, z: 0.8 },
        meleeHitToleranceRadius: 0,
        standDownWithoutTarget: true,
        beginAttackAnim: allyAttackTiming,
    }
}

export function NewDefaultAllyState(
    _id: number,
    allyModel: AllyModel,
    prop: AllyProperty,
    gphysic: IGPhysic,
    eventCtrl: IEventController,
    spec: BaseSpec,
): IActorState {
    const cfg = BuildAllyStateConfig(prop)
    const defSt = BuildActorStateSet(allyModel, gphysic, eventCtrl, spec, cfg)
    return defSt.IdleSt
}
