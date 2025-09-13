// ComboMeleeState.ts — Controller/Input 수정 불필요 버전
//  - 내부에서 KeyState 폴링 → 엣지 검출/입력버퍼 처리
//  - CheckAttack 재호출로 재-Init되는 문제를 방지하기 위해 DefaultCheck 오버라이드
//  - "히트 이후 + 리커버리"에서만 다음 스텝 소비(즉시 전개 방지 패치 적용)

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
import { IItem } from "@Glibs/interface/iinven";
import { Item } from "@Glibs/inventory/items/item";
import { AttackState } from "./attackstate";
import { KeyType } from "@Glibs/types/eventtypes";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type ComboPhase = "idle" | "windup" | "hit" | "recovery";

interface ComboStep {
    anim: ActionType;
    windup: number;                  // 준비동작 길이(초) — attackSpeed로 나눠서 실제시간 산정
    hitTime: number;                 // 타격 시점(초) — attackSpeed로 나눠서 실제시간 산정
    recovery: number;                // 후딜(초) — attackSpeed로 나눠서 실제시간 산정
    damageMul?: number;              // 기본 대미지 배율
    rangeMul?: number;               // 기본 사거리 배율
    inputWindow?: [number, number];  // 다음 스텝 입력창(초) — attackSpeed로 나눠서 실제시간 산정
    cancelInto?: ActionType[];       // 허용 캔슬 액션(구르기/런 등)
    next?: number;                   // 다음 스텝 인덱스(없으면 종료)
    sfx?: string;                    // SFX 태그(있으면 사용)
}

interface ComboChain {
    name: string;
    steps: ComboStep[];
    inputBufferSec?: number;         // 입력 버퍼 유지 시간
    hitstopSec?: number;             // 히트스톱(연출) 시간
    // (옵션) 트리거 정책: "afterHitOnly"가 기본 — 히트 이후에만 입력창을 열고 소비
    triggerPolicy?: "afterHitOnly" | "anytimeRecovery";
}

/* -------------------------------------------------------------------------- */
/*                                 Presets                                    */
/* -------------------------------------------------------------------------- */

const Unarmed3: ComboChain = {
    name: "Unarmed-3",
    inputBufferSec: 0.25,
    hitstopSec: 0.04,
    triggerPolicy: "afterHitOnly",
    steps: [
        { anim: ActionType.Punch, windup: 0.12, hitTime: 0.18, recovery: 0.18, damageMul: 1.0, rangeMul: 1.0, inputWindow: [0.20, 0.35], next: 1, sfx: "punch1" },
    ]
};

const OneHandSword3: ComboChain = {
    name: "Sword-3",
    inputBufferSec: 0.28,
    hitstopSec: 0.05,
    triggerPolicy: "afterHitOnly",
    steps: [
        { anim: ActionType.TwoHandSword1, windup: 0.14, hitTime: 0.20, recovery: 0.22, damageMul: 1.2, rangeMul: 1.1, inputWindow: [0.18, 0.34], next: 1, sfx: "slash1" },
        { anim: ActionType.TwoHandSword2, windup: 0.12, hitTime: 0.18, recovery: 0.24, damageMul: 1.3, rangeMul: 1.15, inputWindow: [0.18, 0.34], next: 2, sfx: "slash2" },
        { anim: ActionType.TwoHandSwordFinish, windup: 0.16, hitTime: 0.24, recovery: 0.30, damageMul: 1.6, rangeMul: 1.25, inputWindow: [0.26, 0.40], sfx: "stab" },
    ]
};

/* -------------------------------------------------------------------------- */
/*                              ComboMeleeState                               */
/* -------------------------------------------------------------------------- */

export class ComboMeleeState extends AttackState implements IPlayerAction {
    // 콤보 진행
    private chain!: ComboChain;
    private stepIndex = 0;
    private currentStep!: ComboStep;
    private phase: ComboPhase = "idle";
    private phaseTime = 0;         // 상태 시작 후 경과 시간(초, clock 기반)
    private hitstopLeft = 0;       // 남은 히트스톱 시간(초)
    private comboWindowOpen = false;

    // 입력(내부 처리)
    private prevAttackPressed = false; // 엣지 검출용
    private inputQueue: number[] = []; // 상태 상대시각 타임스탬프를 저장
    private inputBufferSec = 0.25;     // 체인에서 덮어씀

    // 정책/연출
    private hitstopSec = 0.04;

    constructor(
        playerCtrl: PlayerCtrl, player: Player, gphysic: IGPhysic,
        protected eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(playerCtrl, player, gphysic, eventCtrl, spec);
        this.raycast.params.Points.threshold = 20;
    }

    /* ------------------------------ Helpers --------------------------------- */

    // 공격속도 보정: 정의상 타임(sec)을 attackSpeed로 나눠 실제 경과 비교
    private normTime(t: number) { return t / this.attackSpeed; }

    // 무기/맨손에 따라 콤보 체인을 선택
    private pickChain(): ComboChain {
        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        // 실제 프로젝트 무기 타입/아이템 타입에 맞춰 분기하세요.
        return handItem ? OneHandSword3 : Unarmed3;
    }

    // 내부 폴링: KeyState로부터 상승엣지 검출 + 버퍼 push
    private pollAttackEdgeAndBuffer(nowSec: number) {
        const pressed = !!this.playerCtrl.KeyState[KeyType.Action2];
        const risingEdge = pressed && !this.prevAttackPressed;
        this.prevAttackPressed = pressed;

        if (risingEdge) {
            this.inputQueue.push(nowSec);
            // 만료 제거
            const oldest = nowSec - this.inputBufferSec;
            this.inputQueue = this.inputQueue.filter(t => t >= oldest);
        }
    }

    // 버퍼에서 최신 입력 1개 소비(유효 시간 내)
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

    // 시간 기반 입력창 오픈 — 패치: 히트 이전에는 절대 열리지 않음 + 리커버리에서만 열림
    private maybeOpenInputWindowByTime(now: number) {
        if (this.comboWindowOpen) return;
        const win = this.currentStep.inputWindow;
        if (!win) return;

        const [ws, we] = win;
        const sBase = this.normTime(ws);
        const e = this.normTime(we);

        const policy = this.chain.triggerPolicy ?? "afterHitOnly";
        const hitAfter = this.normTime(this.currentStep.hitTime);
        const s = policy === "afterHitOnly" ? Math.max(sBase, hitAfter) : sBase;

        // 리커버리 구간에서만 입력창 허용
        this.comboWindowOpen = (this.phase === "recovery") && (now >= s && now <= e);
    }

    // 히트 처리 → 리커버리로 전환 + 히트스톱
    private forceDoHit() {
        this.doHit();
        this.phase = "recovery";
        this.phaseTime = 0;
        this.hitstopLeft = this.hitstopSec;
    }

    // 실제 타격 판정(기존 근접 공격 로직 재사용)
    private doHit() {
        const dmgMul = this.currentStep.damageMul ?? 1;
        const rangeMul = this.currentStep.rangeMul ?? 1;
        const baseDamage = this.baseSpec.Damage * dmgMul;
        const baseRange = this.attackDist * rangeMul;

        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        if (handItem?.Sound) {
            this.eventCtrl.SendEventMessage(EventTypes.PlaySound, handItem.Mesh, handItem.Sound);
        }

        this.player.Meshs.getWorldDirection(this.attackDir);
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize());

        const hits = this.raycast.intersectObjects(this.playerCtrl.targets);
        if (hits.length > 0 && hits[0].distance < baseRange) {
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
            buckets.forEach((v, k) => this.eventCtrl.SendEventMessage(EventTypes.Attack + k, v));
        }
    }

    // 콤보 입력 소비는 리커버리에서만 수행 — 즉시 전개 방지의 핵심
    private tryQueueNextIfBuffered(now: number): boolean {
        if (this.phase !== "recovery") return false;         // windup/hit에서는 절대 소비 금지
        if (!this.comboWindowOpen) return false;
        if (!this.tryConsumeBufferedInput(now)) return false;

        const next = this.currentStep.next;
        if (next == null) return false;

        this.startStep(next);
        return true;
    }

    // (옵션) 애니메이션 이벤트 훅 — 히트/입력창 오픈을 이벤트로 제어할 때 사용
    public onAnimationEvent(evtName: string) {
        if (evtName === "Hit" && this.phase !== "hit") {
            this.forceDoHit();
        } else if (evtName === "ComboWindowStart") {
            // 패치: 히트 이후 + 리커버리일 때만 인정
            const hitAfter = this.normTime(this.currentStep.hitTime);
            if (this.phase === "recovery" && this.phaseTime >= hitAfter) {
                this.comboWindowOpen = true;
            }
        } else if (evtName === "ComboWindowEnd") {
            this.comboWindowOpen = false;
        }
    }

    /* ---------------------------- Lifecycle --------------------------------- */

    Init(): void {
        this.chain = this.pickChain();
        this.inputBufferSec = this.chain.inputBufferSec ?? 0.25;
        this.hitstopSec = this.chain.hitstopSec ?? 0.04;

        this.attackProcess = false;
        this.attackSpeed = this.baseSpec.AttackSpeed;
        this.attackDist = this.baseSpec.AttackRange;

        this.clock = new THREE.Clock();
        this.startStep(0);

        // 시작 프레임 연타 대비: 다음 프레임에 엣지를 만들 수 있도록 false로 초기화
        this.prevAttackPressed = false;
        // 디버그 서클은 startStep에서 생성
    }

    private startStep(i: number) {
        this.stepIndex = i;
        this.currentStep = this.chain.steps[i];
        this.phase = "windup";
        this.phaseTime = 0;
        this.hitstopLeft = 0;
        this.comboWindowOpen = false;

        // 애니메이션/사운드/오토에임
        this.player.ChangeAction(this.currentStep.anim, this.attackSpeed);

        const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R);
        if (handItem) {
            (handItem as Item).activate();
            if (handItem.Sound) {
                this.eventCtrl.SendEventMessage(EventTypes.RegisterSound, handItem.Mesh, handItem.Sound);
            }
            if (handItem.AutoAttack) this.autoDirection();
        }

        // 범위 디버그
        this.player.createDashedCircle(this.attackDist * (this.currentStep.rangeMul ?? 1));
    }

    // 외부에서 호출해도 되지만, 이 구현은 내부 폴링만으로 충분합니다.
    public onAttackButtonPressed(): void {
        this.inputQueue.push(this.phaseTime);
    }

    // 콤보 중 캔슬 허용 여부
    public tryCancelInto(action: ActionType): boolean {
        // 필요 시 정책 변경(기본: 허용)
        const allow = this.currentStep.cancelInto?.includes(action) ?? true;
        return allow;
    }

    Update(_: number): IPlayerAction {
        const d = this.DefaultCheck({ attack: false, magic: false, jump: false });
        if (d) return d;
        if (!this.clock) return this;

        const dt = this.clock.getDelta();
        this.phaseTime += dt;

        // 내부 폴링: 공격키 엣지 검출 + 버퍼 적재
        const now = this.phaseTime; // 상태 상대시각(절대시각을 쓰고 싶으면 performance.now()/1000)
        this.pollAttackEdgeAndBuffer(now);

        // 히트스톱 중이면 시간 정지
        if (this.hitstopLeft > 0) {
            this.hitstopLeft = Math.max(0, this.hitstopLeft - dt);
            return this;
        }

        // 타임라인 진행
        if (this.phase === "windup") {
            const hitT = this.normTime(this.currentStep.hitTime);
            if (this.phaseTime >= hitT) {
                this.phase = "hit";
                this.forceDoHit(); // 내부에서 recovery로 전환됨
            }
        } else if (this.phase === "recovery") {
            // 패치 적용: 리커버리에서만 입력창 오픈/버퍼 소비
            this.maybeOpenInputWindowByTime(this.phaseTime);
            if (this.tryQueueNextIfBuffered(this.phaseTime)) return this;

            const endT = this.normTime(
                this.currentStep.windup + this.currentStep.hitTime + this.currentStep.recovery
            );

            if (this.phaseTime >= endT) {
                // (선택) 막차 입력 허용을 원치 않으면 아래 블록을 제거하세요.
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
        this.inputQueue.length = 0;
        this.comboWindowOpen = false;
        this.hitstopLeft = 0;
        super.Uninit();
    }
}
