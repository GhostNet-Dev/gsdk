/**
 * 호환 심(shim). 실제 FSM 구현은 `@Glibs/actors/battle/actorcombatstates` 로 병합됨. (설계 §5.4)
 * import 경로와 `NewDefaultMonsterState` 시그니처를 유지하기 위해 이 파일을 남긴다.
 */
import { Zombie } from "../zombie"
import { IGPhysic } from "@Glibs/interface/igphysics"
import IEventController from "@Glibs/interface/ievent"
import { AttackType } from "@Glibs/types/playertypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { IActorState } from "../monstertypes"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { MonsterProperty } from "@Glibs/types/monstertypes"
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes"
import {
    ActorCombatState,
    ActorStateConfig,
    ActorStates,
    AttackActorState,
    BuildActorStateSet,
    DyingActorState,
    GetActorAttackTargetId,
    HurtActorState,
    IdleActorState,
    JumpActorState,
    monsterAttackTiming,
    RunActorState,
} from "@Glibs/actors/battle/actorcombatstates"

// ── 호환 별칭 (기존 import 이름 유지) ──────────────────────────────────────────
export {
    ActorCombatState as MonState,
    IdleActorState as IdleZState,
    RunActorState as RunZState,
    AttackActorState as AttackZState,
    JumpActorState as JumpZState,
    HurtActorState as HurtZState,
    DyingActorState as DyingZState,
}
export type { ActorStateConfig, ActorStates }

export function GetMonsterAttackTargetId(target?: IPhysicsObject) {
    return GetActorAttackTargetId(target, { fallbackTargetId: TargetTeamId.Player } as ActorStateConfig)
}

/** MonsterProperty + spec 로 몬스터용 FSM 설정을 만든다. */
export function BuildMonsterStateConfig(
    prop: MonsterProperty,
    spec: BaseSpec,
    eventCtrl: IEventController,
    debugActor = "monster",
): ActorStateConfig {
    return {
        debugActor,
        fallbackTargetId: TargetTeamId.Player,
        attackAction: prop.attackAction,
        projectileDef: prop.projectileDef,
        muzzleOffset: { x: 0, y: 1.4, z: 0.8 },
        meleeHitToleranceRadius: 1.0,
        standDownWithoutTarget: false,
        beginAttackAnim: monsterAttackTiming,
        onDeathInit: () => {
            eventCtrl.SendEventMessage(EventTypes.Attack + TargetTeamId.Player, [{
                type: AttackType.Exp,
                damage: spec.stats.getStat("expBonus"),
                srcMonsterId: prop.id,
            }])
        },
    }
}

export function NewDefaultMonsterState(
    _id: number,
    zombie: Zombie,
    prop: MonsterProperty,
    gphysic: IGPhysic,
    eventCtrl: IEventController,
    spec: BaseSpec,
): IActorState {
    const cfg = BuildMonsterStateConfig(prop, spec, eventCtrl)
    const defSt = BuildActorStateSet(zombie, gphysic, eventCtrl, spec, cfg)
    return defSt.IdleSt
}
