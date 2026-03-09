import { ActionContext, ActionDef, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ComboChain } from "@Glibs/actors/player/states/combomeleeattackst"
import { ActionType } from "@Glibs/actors/player/playertypes"
import { isCooldownReady } from "./cooldownhelper"

/* -------------------------------------------------------------------------- */
/* Built-in Chain Presets                                                      */
/* -------------------------------------------------------------------------- */

const BladeStorm5: ComboChain = {
    name: "BladeStorm-5",
    inputBufferSec: 0.20,
    hitstopSec: 0.09,
    triggerPolicy: "afterHitOnly",
    playThroughRatio: 0.80,
    steps: [
        {
            anim: ActionType.TwoHandSword1,
            windupT: { sec: 0.10 }, hitT: { sec: 0.15 }, recoveryT: { sec: 0.16 },
            inputWindowT: [{ sec: 0.14 }, { sec: 0.28 }],
            damageMul: 0.9, rangeMul: 1.0,
            swingSfx: "whoosh_light", swingLeadSec: 0.04, impactSfx: "slash1",
            next: 1
        },
        {
            anim: ActionType.TwoHandSword2,
            windupT: { sec: 0.09 }, hitT: { sec: 0.14 }, recoveryT: { sec: 0.14 },
            inputWindowT: [{ sec: 0.12 }, { sec: 0.24 }],
            damageMul: 0.9, rangeMul: 1.0,
            swingSfx: "whoosh_light", swingLeadSec: 0.04, impactSfx: "slash2",
            next: 2
        },
        {
            anim: ActionType.TwoHandSword1,
            windupT: { sec: 0.09 }, hitT: { sec: 0.14 }, recoveryT: { sec: 0.14 },
            inputWindowT: [{ sec: 0.12 }, { sec: 0.24 }],
            damageMul: 1.0, rangeMul: 1.0,
            swingSfx: "whoosh_med", swingLeadSec: 0.05, impactSfx: "slash1",
            next: 3
        },
        {
            anim: ActionType.TwoHandSword2,
            windupT: { sec: 0.09 }, hitT: { sec: 0.14 }, recoveryT: { sec: 0.14 },
            inputWindowT: [{ sec: 0.12 }, { sec: 0.24 }],
            damageMul: 1.0, rangeMul: 1.0,
            swingSfx: "whoosh_med", swingLeadSec: 0.05, impactSfx: "slash2",
            next: 4
        },
        {
            anim: ActionType.TwoHandSwordFinish,
            playThroughRatio: 1.0,
            windupT: { sec: 0.14 }, hitT: { sec: 0.22 }, recoveryT: { sec: 0.28 },
            inputWindowT: [{ sec: 0.24 }, { sec: 0.38 }],
            damageMul: 2.2, rangeMul: 1.4,
            swingSfx: "whoosh_heavy", swingLeadSec: 0.07, impactSfx: "stab"
        }
    ]
}

const DoubleSlash: ComboChain = {
    name: "DoubleSlash-2",
    inputBufferSec: 0.30,
    hitstopSec: 0.12,
    triggerPolicy: "afterHitOnly",
    playThroughRatio: 0.85,
    steps: [
        {
            anim: ActionType.TwoHandSword1,
            windupT: { sec: 0.12 }, hitT: { sec: 0.20 }, recoveryT: { sec: 0.22 },
            inputWindowT: [{ sec: 0.18 }, { sec: 0.34 }],
            damageMul: 1.8, rangeMul: 1.2,
            swingSfx: "whoosh_heavy", swingLeadSec: 0.06, impactSfx: "slash1",
            next: 1
        },
        {
            anim: ActionType.TwoHandSwordFinish,
            playThroughRatio: 1.0,
            windupT: { sec: 0.10 }, hitT: { sec: 0.16 }, recoveryT: { sec: 0.26 },
            inputWindowT: [{ sec: 0.18 }, { sec: 0.36 }],
            damageMul: 2.5, rangeMul: 1.5,
            swingSfx: "whoosh_heavy", swingLeadSec: 0.07, impactSfx: "stab"
        }
    ]
}

/* -------------------------------------------------------------------------- */
/* Chain Registry                                                              */
/* -------------------------------------------------------------------------- */

const CHAIN_REGISTRY = new Map<string, ComboChain>([
    ["BladeStorm5", BladeStorm5],
    ["DoubleSlash", DoubleSlash],
])

/** 런타임에 커스텀 체인을 등록합니다. */
export function registerComboChain(name: string, chain: ComboChain): void {
    CHAIN_REGISTRY.set(name, chain)
}

/* -------------------------------------------------------------------------- */
/* ComboSkillAction                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 스킬 슬롯에서 발동되는 콤보 스킬 액션.
 *
 * ActionDef 필드:
 *   - chainName?: string          → 레지스트리에 등록된 체인 이름으로 조회
 *   - chain?:    ComboChain       → 직접 체인 오브젝트를 인라인으로 정의
 *   - cooldown?: number           → 초 단위 (기본 5)
 *   - castAction: "none"          → 캐스팅 모션 없이 즉시 발동
 */
export class ComboSkillAction implements IActionComponent {
    id?: string
    resourceCost?: unknown
    private cooldown: number
    private lastUsed = 0
    private chain?: ComboChain

    constructor(private def: ActionDef) {
        this.id = def.id
        this.cooldown = typeof def.cooldown === "number" ? def.cooldown * 1000 : 5000
        this.resourceCost = def.resourceCost
        this.chain = this.resolveChain(def)
    }

    private resolveChain(def: ActionDef): ComboChain | undefined {
        // 1. 인라인 ComboChain 오브젝트
        if (def.chain && typeof def.chain === "object" && Array.isArray((def.chain as any).steps)) {
            return def.chain as ComboChain
        }
        // 2. 이름으로 레지스트리 조회
        if (typeof def.chainName === "string") {
            return CHAIN_REGISTRY.get(def.chainName)
        }
        return undefined
    }

    trigger(target: IActionUser, triggerType: string, _context?: ActionContext) {
        if (triggerType !== "onCast") return

        const now = performance.now()
        if (!isCooldownReady(this.lastUsed, this.cooldown, target, now)) return

        // PlayerCtrl 덕타입 접근
        const ctrl = target as any
        if (!ctrl.ComboMeleeSt || typeof ctrl.changeState !== "function") return

        // 근거리 무기가 없으면 실행하지 않음
        if (!ctrl.baseSpec?.GetMeleeItem?.()) return

        this.lastUsed = now
        ctrl.ComboMeleeSt.withChain(this.chain)
        ctrl.changeState(ctrl.ComboMeleeSt)
    }

    /**
     * castLearnedSkill 에서 비용/모션 처리 전에 호출됩니다.
     * 콤보가 이미 진행 중이면 입력 큐에 추가하고 true(처리 완료)를 반환합니다.
     * true를 반환하면 castLearnedSkill 의 비용 소모·캐스팅 모션을 건너뜁니다.
     */
    onSlotCast(ctrl: any): boolean {
        if (ctrl.currentState === ctrl.ComboMeleeSt) {
            // 콤보 진행 중 무기가 해제된 경우 연타 차단
            if (!ctrl.baseSpec?.GetMeleeItem?.()) return false
            ctrl.ComboMeleeSt.onAttackButtonPressed()
            return true
        }
        return false
    }

    isAvailable(): boolean {
        return performance.now() - this.lastUsed >= this.cooldown
    }
}
