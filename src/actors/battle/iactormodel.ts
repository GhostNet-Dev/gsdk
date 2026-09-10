import { IPhysicsObject } from "@Glibs/interface/iobject"
import { EffectType } from "@Glibs/types/effecttypes"
import { ActionType } from "@Glibs/types/playertypes"

export interface IActorModel extends IPhysicsObject {
    get Visible(): boolean
    set Visible(flag: boolean)
    update(delta: number): void
    SetOpacity(opacity: number): void
    DamageEffect(damage: number, effect?: EffectType): void
    ChangeAction(action: ActionType, speed?: number): number | undefined
}
