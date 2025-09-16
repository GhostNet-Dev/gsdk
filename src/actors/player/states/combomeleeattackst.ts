// ComboMeleeState.ts — Timer + Catch-up + Re-ChangeAction Resync 보조 버전
//  - 총 재생시간(초) = attackSpeed (ChangeAction(anim, attackSpeed))
//  - 스윙/히트 setTimeout 예약 + Update catch-up 즉시 실행
//  - 드리프트 감지 → (가능시) 애니메이션 소프트 시크 / (초반) 하드 리셋(ChangeAction 재호출)
//  - 입력창 소비 정책: "히트 이후 + 리커버리" 유지

import * as THREE from "three";
import { IPlayerAction } from "./playerstate";
import { Player } from "../player";
import { BaseSpec } from "../../battle/basespec";
import { PlayerCtrl } from "../playerctrl";
import { AttackType } from "@Glibs/types/playertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Bind } from "@Glibs/types/assettypes";
import { ActionType } from "../playertypes";
import { Item } from "@Glibs/inventory/items/item";
import { AttackState } from "./attackstate";
import { KeyType } from "@Glibs/types/eventtypes";
import { GlobalEffectType } from "@Glibs/types/effecttypes";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type ComboPhase = "idle" | "windup" | "hit" | "recovery";
type SecOrFrac = { sec?: number; frac?: number };

interface ComboStep {
    anim: ActionType;

    // (레거시) 절대초
    windup?: number;
    hitTime?: number;
    recovery?: number;
    inputWindow?: [number, number];

    // (신규) frac(0..1) 또는 sec(절대초): 총 길이(attackSpeed)에 맞춰 해석
    windupT?: SecOrFrac;
    hitT?: SecOrFrac;
    recoveryT?: SecOrFrac;
    inputWindowT?: [SecOrFrac, SecOrFrac];

    damageMul?: number;
    rangeMul?: number;

    cancelInto?: ActionType[];
    next?: number;

    // SFX
    swingSfx?: string;
    swingLeadSec?: number; // 히트 직전 리드
    impactSfx?: string;
    missSfx?: string;
    sfx?: string; // (레거시) impactSfx 간주
}

interface ComboChain {
    name: string;
    steps: ComboStep[];
    inputBufferSec?: number;
    hitstopSec?: number;
    triggerPolicy?: "afterHitOnly" | "anytimeRecovery";
}

interface ResolvedTimes {
    windupSec: number;
    hitSec: number;
    recoverySec: number;
    inputWinStartSec: number;
    inputWinEndSec: number;
    swingLeadSec: number;
}

/* -------------------------------------------------------------------------- */
/*                              Chain Presets                                 */
/* -------------------------------------------------------------------------- */

const Unarmed3: ComboChain = {
    name: "Unarmed-3",
    inputBufferSec: 0.25,
    hitstopSec: 0.04,
    triggerPolicy: "afterHitOnly",
    steps: [
        {
            anim: ActionType.Punch,
            windupT: { sec: 0.12 },
            hitT: { sec: 0.18 },
            recoveryT: { sec: 0.18 },
            inputWindowT: [{ sec: 0.20 }, { sec: 0.35 }],
            damageMul: 1.0, rangeMul: 1.0,
            swingSfx: "whoosh_light", swingLeadSec: 0.05,
            impactSfx: "punch1",
        }
    ]
};

const OneHandSword3: ComboChain = {
    name: "Sword-3",
    inputBufferSec: 0.28,
    hitstopSec: 0.05,
    triggerPolicy: "afterHitOnly",
    steps: [
        {
            anim: ActionType.TwoHandSword1,
            windupT: { sec: 0.14 }, hitT: { sec: 0.20 }, recoveryT: { sec: 0.22 },
            inputWindowT: [{ sec: 0.18 }, { sec: 0.34 }],
            damageMul: 1.2, rangeMul: 1.1,
            swingSfx: "whoosh_med", swingLeadSec: 0.06, impactSfx: "slash1",
            next: 1
        },
        {
            anim: ActionType.TwoHandSword2,
            windupT: { sec: 0.12 }, hitT: { sec: 0.18 }, recoveryT: { sec: 0.24 },
            inputWindowT: [{ sec: 0.18 }, { sec: 0.34 }],
            damageMul: 1.3, rangeMul: 1.15,
            swingSfx: "whoosh_med", swingLeadSec: 0.06, impactSfx: "slash2",
            next: 2
        },
        {
            anim: ActionType.TwoHandSwordFinish,
            windupT: { sec: 0.16 }, hitT: { sec: 0.24 }, recoveryT: { sec: 0.30 },
            inputWindowT: [{ sec: 0.26 }, { sec: 0.40 }],
            damageMul: 1.6, rangeMul: 1.25,
            swingSfx: "whoosh_heavy", swingLeadSec: 0.07, impactSfx: "stab"
        }
    ]
};

/* -------------------------------------------------------------------------- */
/*                      Tunables: 지연/드리프트/리셋 정책                     */
/* -------------------------------------------------------------------------- */

// 사운드 지연이 없다면 0 유지
const AUDIO_LAG_COMP_SEC = 0.00;

// catch-up 즉시 실행 허용 오차(초)
const CATCHUP_EPSILON_SEC = 0.001;

// 드리프트 임계치(초) — 이보다 크면 보조 동기화 시도
const RESYNC_SOFT_SEEK_SEC = 0.020;  // 이 이상 어긋나면 애니메이션 seek 시도
const RESYNC_HARD_RESET_SEC = 0.060; // 이 이상 + 스텝 초반이면 ChangeAction 재호출

// 하드 리셋 허용 구간(스텝 시작 후 몇 초 이내만 허용 — 중/후반 리셋은 시각적으로 거슬림)
const RESYNC_HARD_WINDOW_SEC = 0.20;

// 디버그 로그 on/off
const DEBUG_SYNC = false;

/* -------------------------------------------------------------------------- */
/*                              ComboMeleeState                               */
/* -------------------------------------------------------------------------- */

export class ComboMeleeState extends AttackState implements IPlayerAction {
    private chain!: ComboChain;
    private stepIndex = 0;
    private currentStep!: ComboStep;

    private phase: ComboPhase = "idle";
    private phaseTime = 0;
    private hitstopLeft = 0;
    private comboWindowOpen = false;

    // 입력 버퍼/엣지
    private prevAttackPressed = false;
    private inputQueue: number[] = [];
    private inputBufferSec = 0.25;

    private hitstopSec = 0.04;

    private resolved: ResolvedTimes = {
        windupSec: 0, hitSec: 0, recoverySec: 0,
        inputWinStartSec: 0, inputWinEndSec: 0,
        swingLeadSec: 0.05
    };

    private swingSfxPlayed = false;
    private impactSfxPlayed = false;

    // 타이머 스케줄링/기준시각(벽시계)
    private stepStartWallSec = 0;
    private swingTimerId?: ReturnType<typeof setTimeout>;
    private hitTimerId?: ReturnType<typeof setTimeout>;
    private swingTimerFired = false;
    private hitTimerFired = false;

    constructor(
        playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic,
        protected eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic, eventCtrl, spec);
        this.raycast.params.Points.threshold = 20;
    }

    /* ------------------------------ Helpers --------------------------------- */

    private get totalDurSec(): number { return this.attackSpeed || 1; }

    private resolveSec(of?: SecOrFrac, legacy?: number): number {
        const T = this.totalDurSec;
        if (!of) return legacy ?? 0;
        if (of.sec != null) return of.sec;
        if (of.frac != null) return of.frac * T;
        return legacy ?? 0;
    }

    private pickChain(): ComboChain {
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        return handItem ? OneHandSword3 : Unarmed3;
    }

    private pollAttackEdgeAndBuffer(nowSec: number) {
        const pressed = !!this.playerCtrl.KeyState[KeyType.Action2];
        const risingEdge = pressed && !this.prevAttackPressed;
        this.prevAttackPressed = pressed;

        if (risingEdge) {
            this.inputQueue.push(nowSec);
            const oldest = nowSec - this.inputBufferSec;
            this.inputQueue = this.inputQueue.filter(t => t >= oldest);
        }
    }

    private tryConsumeBufferedInput(nowSec: number): boolean {
        const oldest = nowSec - this.inputBufferSec;
        for (let i = this.inputQueue.length - 1; i >= 0; i--) {
            if (this.inputQueue[i] >= oldest) {
                this.inputQueue.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    private maybeOpenInputWindowByTime(nowSec: number) {
        if (this.comboWindowOpen) return;

        const sBase = this.resolved.inputWinStartSec;
        const e = this.resolved.inputWinEndSec;

        const policy = this.chain.triggerPolicy ?? "afterHitOnly";
        const hitAfter = this.resolved.hitSec;
        const s = policy === "afterHitOnly" ? Math.max(sBase, hitAfter) : sBase;

        this.comboWindowOpen = (this.phase === "recovery") && (nowSec >= s && nowSec <= e);
    }

    private playSfxOnce(tag?: string) {
        if (!tag) return;
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        this.eventCtrl.SendEventMessage(
            EventTypes.PlaySound,
            handItem?.Mesh ?? this.player.Meshs,
            handItem?.Sound ?? tag
        );
    }

    // 충돌/대미지 처리
    private doHit() {
        const dmgMul = this.currentStep.damageMul ?? 1;
        const rangeMul = this.currentStep.rangeMul ?? 1;
        const baseDamage = this.baseSpec.Damage * dmgMul;
        const baseRange = this.attackDist * rangeMul;

        this.player.Meshs.getWorldDirection(this.attackDir);
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize());

        const hits = this.raycast.intersectObjects(this.playerCtrl.targets);
        let anyHit = false;

        if (hits.length > 0 && hits[0].distance < baseRange) {
            const hit = hits[0]
            const faceNormal = hit.face?.normal.clone() ?? new THREE.Vector3(0, 1, 0);
            // InstancedMesh면 instanceMatrix까지 고려
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
            const impactNormal = faceNormal.applyMatrix3(normalMatrix).normalize();
    
            const buckets = new Map<string, any[]>();
            for (const h of hits) {
                if (h.distance > baseRange) continue;
                const arr = buckets.get(h.object.name) ?? [];
                arr.push({
                    type: AttackType.NormalSwing,
                    damage: baseDamage,
                    spec: [this.baseSpec],
                    obj: h.object
                });
                buckets.set(h.object.name, arr);
            }
            buckets.forEach((v, k) => {
                this.keytimeout.push(setTimeout(() => {
                    const particleCount = (this.stepIndex == this.chain.steps.length - 1) ? 40 : 20;
                    this.eventCtrl.SendEventMessage(EventTypes.GlobalEffect, GlobalEffectType.SparkEshSystem, hit.point, impactNormal, { count: particleCount })
                    this.eventCtrl.SendEventMessage(EventTypes.Attack + k, v);
                }, this.attackSpeed * 1000 * 0.4))
            });
            anyHit = buckets.size > 0;
        }

        if (anyHit && !this.impactSfxPlayed) {
            this.playSfxOnce(this.currentStep.impactSfx ?? this.currentStep.sfx);
            this.impactSfxPlayed = true;
        } else if (!anyHit && this.currentStep.missSfx) {
            this.playSfxOnce(this.currentStep.missSfx);
        }
    }

    private forceDoHit() {
        this.doHit();
        this.phase = "recovery";
        this.phaseTime = 0;
        this.hitstopLeft = this.hitstopSec;
    }

    private tryQueueNextIfBuffered(nowSec: number): boolean {
        if (this.phase !== "recovery") return false;
        if (!this.comboWindowOpen) return false;
        if (!this.tryConsumeBufferedInput(nowSec)) return false;

        const next = this.currentStep.next;
        if (next == null) return false;

        this.startStep(next);
        return true;
    }

    public onAnimationEvent(evtName: string) {
        if (evtName === "Hit") {
            // 시각 프레임 = 임팩트/판정(타이머 중복 방지)
            if (!this.hitTimerFired) this.clearHitTimer();
            if (!this.impactSfxPlayed) {
                this.playSfxOnce(this.currentStep.impactSfx ?? this.currentStep.sfx);
                this.impactSfxPlayed = true;
            }
            if (this.phase !== "hit") this.forceDoHit();
            this.hitTimerFired = true;
        } else if (evtName === "ComboWindowStart") {
            const hitAfter = this.resolved.hitSec;
            if (this.phase === "recovery" && this.phaseTime >= hitAfter) {
                this.comboWindowOpen = true;
            }
        } else if (evtName === "ComboWindowEnd") {
            this.comboWindowOpen = false;
        }
    }

    /* --------------------------- Timer Scheduling ---------------------------- */

    private clearSwingTimer() {
        if (this.swingTimerId) clearTimeout(this.swingTimerId);
        this.swingTimerId = undefined;
        this.swingTimerFired = false;
    }

    private clearHitTimer() {
        if (this.hitTimerId) clearTimeout(this.hitTimerId);
        this.hitTimerId = undefined;
        this.hitTimerFired = false;
    }

    private clearStepTimers() {
        this.clearSwingTimer();
        this.clearHitTimer();
    }

    private scheduleStepTimers() {
        this.stepStartWallSec = performance.now() / 1000.0;

        const swingAt = Math.max(
            0,
            this.resolved.hitSec - this.resolved.swingLeadSec - AUDIO_LAG_COMP_SEC
        );
        const hitAt = Math.max(0, this.resolved.hitSec);

        this.clearStepTimers();

        if (this.currentStep.swingSfx) {
            this.swingTimerId = setTimeout(() => {
                if (!this.swingSfxPlayed && this.phase === "windup") {
                    this.playSfxOnce(this.currentStep.swingSfx);
                    this.swingSfxPlayed = true;
                }
                this.swingTimerFired = true;
            }, Math.max(0, swingAt * 1000));
        }

        this.hitTimerId = setTimeout(() => {
            if (!this.hitTimerFired) {
                if (this.phase === "windup" || this.phase === "hit") {
                    this.forceDoHit();
                }
                this.hitTimerFired = true;
            }
        }, Math.max(0, hitAt * 1000));
    }

    /* -------------------------- Resync(보조 동기화) -------------------------- */

    private get wallNowSec(): number {
        return performance.now() / 1000.0 - this.stepStartWallSec;
    }

    // 플레이어가 애니메이션 시간을 설정할 수 있으면 사용
    private trySeekAnimation(sec: number): boolean {
        try {
            // 우선순위: 플레이어 제공 헬퍼
            const p: any = this.player as any;
            if (typeof p.seekActionTime === "function") {
                p.seekActionTime(sec);
                return true;
            }
            // 핸들에 직접 접근
            const handle = p.getCurrentActionHandle?.();
            if (handle) {
                if (typeof handle.setTime === "function") {
                    handle.setTime(sec);
                    return true;
                }
                if ("time" in handle) {
                    handle.time = sec;
                    if (typeof handle.paused === "boolean") handle.paused = false;
                    // mixer 즉시 반영용 헬퍼가 있다면 호출
                    if (typeof p.updateMixer === "function") p.updateMixer(0);
                    return true;
                }
            }
        } catch (e) {
            if (DEBUG_SYNC) console.warn("[ComboSync] seek fail:", e);
        }
        return false;
    }

    // 스텝 재시작(처음부터) — ChangeAction 재호출 + 타이머/상태 리셋
    private hardRestartCurrentStep() {
        if (DEBUG_SYNC) console.log("[ComboSync] hard restart step", this.stepIndex);
        this.startStep(this.stepIndex);
    }

    // 드리프트 감지/보정: Update에서 주기적으로 호출
    private maybeResyncByDrift(nowPhaseSec: number) {
        const wallNow = this.wallNowSec;
        const drift = Math.abs(nowPhaseSec - wallNow);

        if (DEBUG_SYNC) {
            // eslint-disable-next-line no-console
            console.log(`[ComboSync] now=${nowPhaseSec.toFixed(3)} wall=${wallNow.toFixed(3)} drift=${drift.toFixed(3)}`);
        }

        if (drift < RESYNC_SOFT_SEEK_SEC) return; // 미세 오차 무시

        // 소프트 시크 먼저 시도(애니 API가 있으면 부드럽게 맞춤)
        if (this.trySeekAnimation(wallNow)) {
            this.phaseTime = wallNow; // 내부 시간도 함께 보정
            return;
        }

        // 소프트 시크가 불가하고, 스텝 초반이며 드리프트가 크면 하드 리셋
        if (drift >= RESYNC_HARD_RESET_SEC && wallNow <= RESYNC_HARD_WINDOW_SEC) {
            this.hardRestartCurrentStep();
            return;
        }

        // 그 외: 내부 시간만 벽시계에 맞춰 보정(비주얼은 다음 프레임에서 점진적으로 수렴)
        this.phaseTime = wallNow;
    }

    /* ------------------------------ Lifecycle -------------------------------- */

    Init(): void {
        this.chain = this.pickChain();
        this.inputBufferSec = this.chain.inputBufferSec ?? 0.25;
        this.hitstopSec = this.chain.hitstopSec ?? 0.04;

        this.attackProcess = false;
        this.attackSpeed = this.baseSpec.AttackSpeed;  // 총 길이(초)
        this.attackDist = this.baseSpec.AttackRange;

        this.clock = new THREE.Clock();
        this.startStep(0);

        this.prevAttackPressed = false;
    }

    private startStep(i: number) {
        this.clearStepTimers();

        this.stepIndex = i;
        this.currentStep = this.chain.steps[i];

        // 애니메이션 시작(처음부터, 총 길이=attackSpeed)
        this.player.ChangeAction(this.currentStep.anim, this.attackSpeed);

        // 타이밍 해석(절대초)
        const s = this.currentStep;
        const windupSec = s.windupT ? this.resolveSec(s.windupT, s.windup ?? 0) : (s.windup ?? 0);
        const hitSec = s.hitT ? this.resolveSec(s.hitT, s.hitTime ?? Math.max(0, windupSec + 0.06))
            : (s.hitTime ?? Math.max(0, windupSec + 0.06));
        const recoverySec = s.recoveryT ? this.resolveSec(s.recoveryT, s.recovery ?? 0.18)
            : (s.recovery ?? 0.18);

        let inputS = 0, inputE = 0;
        if (s.inputWindowT) {
            inputS = this.resolveSec(s.inputWindowT[0], s.inputWindow?.[0] ?? 0);
            inputE = this.resolveSec(s.inputWindowT[1], s.inputWindow?.[1] ?? 0);
        } else if (s.inputWindow) {
            inputS = s.inputWindow[0]; inputE = s.inputWindow[1];
        }

        this.resolved = {
            windupSec, hitSec, recoverySec,
            inputWinStartSec: inputS, inputWinEndSec: inputE,
            swingLeadSec: Math.max(0, s.swingLeadSec ?? 0.05)
        };

        // 상태 리셋
        this.phase = "windup";
        this.phaseTime = 0;
        this.hitstopLeft = 0;
        this.comboWindowOpen = false;
        this.swingSfxPlayed = false;
        this.impactSfxPlayed = false;
        this.swingTimerFired = false;
        this.hitTimerFired = false;

        // 무기 세팅/오토에임
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        if (handItem) {
            (handItem as Item).activate?.();
            if ((handItem as any).Sound) {
                this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, (handItem as any).Mesh, (handItem as any).Sound);
            }
            if ((handItem as any).AutoAttack) this.autoDirection();
        }

        // 예약 스케줄
        this.scheduleStepTimers();

        // 디버그 범위
        this.player.createDashedCircle(this.attackDist * (this.currentStep.rangeMul ?? 1));
    }

    public onAttackButtonPressed(): void {
        this.inputQueue.push(this.phaseTime);
    }

    public tryCancelInto(action: ActionType): boolean {
        return this.currentStep.cancelInto?.includes(action) ?? true;
    }

    Update(_: number): IPlayerAction {
        const d = this.DefaultCheck({ attack: false, magic: false, jump: false });
        if (d) { this.clearStepTimers(); return d; }
        if (!this.clock) return this;

        const dt = this.clock.getDelta();
        this.phaseTime += dt;

        if (!this.detectEnermy) {
            return this.ChangeMode(this.playerCtrl.currentIdleState)
        }
        if (!this.detectEnermy) {
            this.clearStepTimers();
            return this.ChangeMode(this.playerCtrl.currentIdleState);
        }

        const now = this.phaseTime;
        this.pollAttackEdgeAndBuffer(now);

        // 히트스톱
        if (this.hitstopLeft > 0) {
            this.hitstopLeft = Math.max(0, this.hitstopLeft - dt);
            return this;
        }

        // 1) 프레임 지연 catch-up — 이미 시점을 지나쳤다면 즉시 실행
        const swingAtSec = Math.max(0, this.resolved.hitSec - this.resolved.swingLeadSec - AUDIO_LAG_COMP_SEC);
        if (!this.swingSfxPlayed && !this.swingTimerFired && now + CATCHUP_EPSILON_SEC >= swingAtSec && this.phase === "windup") {
            this.clearSwingTimer();
            if (this.currentStep.swingSfx) this.playSfxOnce(this.currentStep.swingSfx);
            this.swingSfxPlayed = true;
        }
        if (!this.hitTimerFired && now + CATCHUP_EPSILON_SEC >= this.resolved.hitSec && (this.phase === "windup" || this.phase === "hit")) {
            this.clearHitTimer();
            this.forceDoHit();
            this.hitTimerFired = true;
        }

        // 2) 드리프트 감지/보조 동기화(소프트 시크/하드 리셋)
        this.maybeResyncByDrift(now);

        // 3) 상태 진행(종료는 총 길이 기반)
        if (this.phase === "recovery") {
            this.maybeOpenInputWindowByTime(this.phaseTime);
            if (this.tryQueueNextIfBuffered(this.phaseTime)) return this;

            const endT = this.totalDurSec;
            if (this.phaseTime >= endT) {
                this.clearStepTimers();
                if (this.tryConsumeBufferedInput(this.phaseTime) && this.currentStep.next != null) {
                    this.startStep(this.currentStep.next!);
                    return this;
                }
                this.Uninit();
                return this.playerCtrl.IdleSt;
            }
        }

        return this;
    }

    Uninit(): void {
        this.clearStepTimers();
        this.inputQueue.length = 0;
        this.comboWindowOpen = false;
        this.hitstopLeft = 0;
        super.Uninit();
    }
}
