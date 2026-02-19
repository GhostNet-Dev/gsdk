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
/* Types                                                                      */
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

    playThroughRatio?: number; // 스텝별 애니메이션 재생 비율 (0.0 ~ 1.0)

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
    playThroughRatio?: number; // 체인 기본 재생 비율 (0.0 ~ 1.0)
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
/* Chain Presets                                                              */
/* -------------------------------------------------------------------------- */

const Unarmed3: ComboChain = {
    name: "Unarmed-3",
    inputBufferSec: 0.25,
    hitstopSec: 0.08, // 타격감을 위해 조금 늘림
    triggerPolicy: "afterHitOnly",
    playThroughRatio: 0.85,
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
    hitstopSec: 0.1, // 타격감을 위해 조금 늘림
    triggerPolicy: "afterHitOnly",
    playThroughRatio: 0.85,
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
            playThroughRatio: 1.0,
            windupT: { sec: 0.16 }, hitT: { sec: 0.24 }, recoveryT: { sec: 0.30 },
            inputWindowT: [{ sec: 0.26 }, { sec: 0.40 }],
            damageMul: 1.6, rangeMul: 1.25,
            swingSfx: "whoosh_heavy", swingLeadSec: 0.07, impactSfx: "stab"
        }
    ]
};

/* -------------------------------------------------------------------------- */
/* Tunables                                                                   */
/* -------------------------------------------------------------------------- */

const AUDIO_LAG_COMP_SEC = 0.00;
const CATCHUP_EPSILON_SEC = 0.001;
const RESYNC_SOFT_SEEK_SEC = 0.020;
const RESYNC_HARD_RESET_SEC = 0.060;
const RESYNC_HARD_WINDOW_SEC = 0.20;
const DEBUG_SYNC = false;
const COMBO_STEP_SPEED_INCREASE = 0.25;

/* -------------------------------------------------------------------------- */
/* ComboMeleeState                                                            */
/* -------------------------------------------------------------------------- */

export class ComboMeleeState extends AttackState implements IPlayerAction {
    private chain!: ComboChain;
    private stepIndex = 0;
    private currentStep!: ComboStep;

    private phase: ComboPhase = "idle";
    private phaseTime = 0;
    private hitstopLeft = 0;
    private comboWindowOpen = false;
    private nextStepQueued = false;
    private currentPlayThroughRatio = 1.0;

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
    private autoAttack = false;

    // [New] 타격감 개선용 변수
    private readonly STEP_IN_SPEED = 6.0; // 전진 속도
    private readonly STEP_IN_DURATION_RATIO = 0.4; // Windup 초반 몇% 동안 전진할지

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

    // 충돌/대미지 처리 + [개선] 히트스톱 설정
    private doHit() {
        const dmgMul = this.currentStep.damageMul ?? 1;
        const rangeMul = this.currentStep.rangeMul ?? 1;
        const baseDamage = this.baseSpec.Damage * dmgMul;
        const baseRange = this.attackDist * rangeMul;

        this.player.Meshs.getWorldDirection(this.attackDir);
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize());

        const hits = this.raycast.intersectObjects(this.playerCtrl.targets);
        let anyHit = false;

        // 히트 이펙트 위치 저장용
        let hitPoint: THREE.Vector3 | null = null;
        let hitNormal = new THREE.Vector3(0, 1, 0);

        if (hits.length > 0 && hits[0].distance < baseRange) {
            const hit = hits[0];
            hitPoint = hit.point;
            if (hit.face) hitNormal = hit.face.normal;

            const buckets = new Map<string, any[]>();
            for (const h of hits) {
                if (h.distance > baseRange) continue;
                const arr = buckets.get(h.object.name) ?? [];
                arr.push({
                    type: AttackType.NormalSwing,
                    damage: baseDamage,
                    spec: this.baseSpec,
                    obj: h.object
                });
                buckets.set(h.object.name, arr);
            }
            buckets.forEach((v, k) => {
                this.keytimeout.push(setTimeout(() => {
                    const particleCount = (this.stepIndex == this.chain.steps.length - 1) ? 40 : 20;
                    if (hitPoint) {
                        this.eventCtrl.SendEventMessage(EventTypes.GlobalEffect, GlobalEffectType.SparkEshSystem, hitPoint, hitNormal, { count: particleCount })
                    }
                    this.eventCtrl.SendEventMessage(EventTypes.Attack + k, v);
                }, this.attackSpeed * 1000 * 0.4))
            });
            anyHit = buckets.size > 0;
        }

        // [타격감 개선] 히트 시 처리
        if (anyHit) {
            // 1. 사운드
            if (!this.impactSfxPlayed) {
                this.playSfxOnce(this.currentStep.impactSfx ?? this.currentStep.sfx);
                this.impactSfxPlayed = true;
            }

            // 2. 비주얼 히트 스톱 설정 (막타는 조금 더 길게)
            const extraStop = (this.stepIndex === this.chain.steps.length - 1) ? 0.08 : 0;
            this.hitstopLeft = this.hitstopSec + extraStop;

        } else if (!anyHit && this.currentStep.missSfx) {
            this.playSfxOnce(this.currentStep.missSfx);
        }
    }

    private forceDoHit() {
        this.doHit();
        this.phase = "recovery";
        // 타격 판정 직후에는 리커버리 진입
        // phaseTime 리셋하지 않고 계속 진행 (애니메이션 동기화 유지)
        // 단, 로직상으로는 recovery 단계로 인식
        // this.phaseTime = 0; // <-- 이거 0으로 하면 애니메이션 튐. wallTime과 동기화 유지
        
        // hitstopLeft는 doHit 내부에서 설정됨 (히트 성공 시)
        // 히트 실패 시에는 hitstopLeft가 0이어야 함
    }

    private tryQueueNextIfBuffered(nowSec: number): boolean {
        if (this.phase !== "recovery") return false;
        if (!this.comboWindowOpen) return false;
        if (this.nextStepQueued) return true;

        if (!this.tryConsumeBufferedInput(nowSec)) return false;

        this.nextStepQueued = true;
        return true;
    }

    public onAnimationEvent(evtName: string) {
        if (evtName === "Hit") {
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

    private trySeekAnimation(sec: number): boolean {
        try {
            const p: any = this.player as any;
            if (typeof p.seekActionTime === "function") {
                p.seekActionTime(sec);
                return true;
            }
            const handle = p.getCurrentActionHandle?.();
            if (handle) {
                if (typeof handle.setTime === "function") {
                    handle.setTime(sec);
                    return true;
                }
                if ("time" in handle) {
                    handle.time = sec;
                    if (typeof handle.paused === "boolean") handle.paused = false;
                    if (typeof p.updateMixer === "function") p.updateMixer(0);
                    return true;
                }
            }
        } catch (e) {
            if (DEBUG_SYNC) console.warn("[ComboSync] seek fail:", e);
        }
        return false;
    }

    private hardRestartCurrentStep() {
        if (DEBUG_SYNC) console.log("[ComboSync] hard restart step", this.stepIndex);
        this.startStep(this.stepIndex);
    }

    private maybeResyncByDrift(nowPhaseSec: number) {
        // 히트스톱 중에는 싱크 맞추지 않음
        if (this.hitstopLeft > 0) return;

        const wallNow = this.wallNowSec;
        const drift = Math.abs(nowPhaseSec - wallNow);

        if (DEBUG_SYNC) {
            // eslint-disable-next-line no-console
            console.log(`[ComboSync] now=${nowPhaseSec.toFixed(3)} wall=${wallNow.toFixed(3)} drift=${drift.toFixed(3)}`);
        }

        if (drift < RESYNC_SOFT_SEEK_SEC) return;

        if (this.trySeekAnimation(wallNow)) {
            this.phaseTime = wallNow;
            return;
        }

        if (drift >= RESYNC_HARD_RESET_SEC && wallNow <= RESYNC_HARD_WINDOW_SEC) {
            this.hardRestartCurrentStep();
            return;
        }

        this.phaseTime = wallNow;
    }

    /* ------------------------------ Lifecycle -------------------------------- */

    Init(): void {
        this.chain = this.pickChain();
        this.inputBufferSec = this.chain.inputBufferSec ?? 0.25;
        this.hitstopSec = this.chain.hitstopSec ?? 0.04;

        this.attackProcess = false;
        this.attackDist = this.baseSpec.AttackRange;

        this.clock = new THREE.Clock();
        this.startStep(0);

        this.prevAttackPressed = false;
    }

    private startStep(i: number) {
        this.clearStepTimers();

        this.stepIndex = i;
        this.currentStep = this.chain.steps[i];

        this.currentPlayThroughRatio = this.currentStep.playThroughRatio
            ?? this.chain.playThroughRatio
            ?? 1.0;

        // 콤보 가속
        const baseSpeed = this.baseSpec.AttackSpeed;
        const speedMultiplier = 1.0 + (this.stepIndex * COMBO_STEP_SPEED_INCREASE);
        this.attackSpeed = baseSpeed / speedMultiplier;

        // 애니메이션 시작
        this.player.ChangeAction(this.currentStep.anim, this.attackSpeed);
        // ChangeAction이 timeScale을 기본 세팅하므로, Update에서 리듬감을 위해 조절함

        // 타이밍 해석
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
        this.nextStepQueued = false;
        this.swingSfxPlayed = false;
        this.impactSfxPlayed = false;
        this.swingTimerFired = false;
        this.hitTimerFired = false;

        // 무기 세팅/오토에임
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        if (handItem) {
            (handItem as Item).activate?.();
            (handItem as Item).trigger?.("onUse");
            if ((handItem as any).Sound) {
                this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, (handItem as any).Mesh, (handItem as any).Sound);
            }
            this.autoAttack = handItem.AutoAttack;
            if (this.autoAttack) this.autoDirection();
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
        if (this.playerCtrl.KeyState[KeyType.Action1]) {
            this.onAttackButtonPressed()
        }
        const d = this.DefaultCheck({ attack: false, magic: false, jump: false });
        if (d) { this.clearStepTimers(); return d; }
        if (!this.clock) return this;

        // [개선] 히트 스톱 (시각적 정지) 처리
        if (this.hitstopLeft > 0) {
            const deltaStop = this.clock.getDelta(); // 시간은 흐르게 하여 델타 소비
            this.hitstopLeft = Math.max(0, this.hitstopLeft - deltaStop);
            // 애니메이션 속도를 0으로 만들어 멈춤 효과
            if (this.player.currentAni) this.player.currentAni.timeScale = 0;
            return this;
        }

        // 정상 흐름
        const dt = this.clock.getDelta();
        this.phaseTime += dt;

        // [개선] 리듬감(Easing) 및 스텝 인(전진)
        if (this.player.currentAni && this.player.currentClip) {
            // 기본 timeScale (duration 기반 역산)
            const baseTimeScale = this.player.currentClip.duration / this.attackSpeed;
            let rhythmFactor = 1.0;

            // Windup: 힘을 모으는 구간
            if (this.phase === "windup") {
                const windupTotal = this.resolved.windupSec;
                const progress = this.phaseTime / (windupTotal || 0.1);

                // 1. 스텝 인 (전진): Windup 초반에만 이동
                if (progress < this.STEP_IN_DURATION_RATIO) {
                    const forward = new THREE.Vector3();
                    this.player.Meshs.getWorldDirection(forward);
                    forward.y = 0;
                    forward.normalize();
                    // gphysic이 있다면 충돌체크 권장, 여기선 단순 이동
                    this.player.Pos.add(forward.multiplyScalar(this.STEP_IN_SPEED * dt));
                }

                // 2. 가변 속도: 느리게 시작 -> 타격 직전 가속
                if (progress < 0.6) {
                    rhythmFactor = 0.6; // 느림 (무게감)
                } else {
                    rhythmFactor = 2.0; // 빠름 (채찍 효과)
                }
            } else if (this.phase === "hit") {
                rhythmFactor = 1.2; // 타격 구간 통과
            } else {
                rhythmFactor = 1.0; // Recovery
            }

            this.player.currentAni.timeScale = baseTimeScale * rhythmFactor;
        }


        if (this.autoAttack && !this.detectEnermy) {
            this.clearStepTimers();
            return this.ChangeMode(this.playerCtrl.currentIdleState)
        }

        const now = this.phaseTime;
        this.pollAttackEdgeAndBuffer(now);

        // 타이머 catch-up
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

        this.maybeResyncByDrift(now);

        // 상태 진행
        if (this.phase === "recovery") {
            this.maybeOpenInputWindowByTime(this.phaseTime);

            this.tryQueueNextIfBuffered(this.phaseTime);

            const endT = this.totalDurSec * this.currentPlayThroughRatio;

            if (this.phaseTime >= endT) {
                this.clearStepTimers();

                const hasNext = this.currentStep.next != null;
                const buffered = this.nextStepQueued || this.tryConsumeBufferedInput(this.phaseTime);

                if (buffered && hasNext) {
                    this.startStep(this.currentStep.next!);
                    return this;
                }

                const isLast = !hasNext;
                const hasMulti = this.chain.steps.length > 1;

                if (buffered && isLast && hasMulti) {
                    this.startStep(0);
                    return this;
                }

                this.Uninit();
                return this.playerCtrl.IdleSt;
            }
        }

        return this;
    }

    Uninit(): void {
        // 애니메이션 속도 복구
        if (this.player.currentAni) this.player.currentAni.timeScale = 1.0;
        
        this.clearStepTimers();
        this.inputQueue.length = 0;
        this.comboWindowOpen = false;
        this.nextStepQueued = false;
        this.hitstopLeft = 0;
        super.Uninit();
    }
}
