import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OrbitControls 접근 로거.
 *
 * 사용법:
 *   OrbitControlsLogger.enabled = true          // 로깅 활성화
 *   OrbitControlsLogger.logUpdates = true        // update() 호출도 출력 (매 프레임, 주의)
 *
 * 출력 예시:
 *   [OrbitControls] ▶ SpaceWarCameraStrategy 가 소유권 획득
 *   [OrbitControls] setEnabled(false)  ← SphereAimingController.onPointerDown @ sphereaimingctrl.ts:433
 *   [OrbitControls] setTarget(0, 0, 0) ← FleetWorld.initialize @ fleetworld.ts:579
 */
export class OrbitControlsLogger {
    /** 로깅 전체 활성화 여부 */
    static enabled = true

    /** update() 호출도 출력할지 여부 (매 프레임 발생하므로 기본 비활성화) */
    static logUpdates = true

    static logAcquire(ownerTag: string, prevOwnerTag?: string): void {
        if (!this.enabled) return
        if (prevOwnerTag) {
            console.debug(`[OrbitControls] ▶ ${prevOwnerTag} → ${ownerTag} 소유권 이전`)
        } else {
            console.debug(`[OrbitControls] ▶ ${ownerTag} 소유권 획득`)
        }
    }

    static logAccess(operation: string, detail = ""): void {
        if (!this.enabled) return
        if (operation === "update" && !this.logUpdates) return
        const caller = this.extractCaller()
        const detailStr = detail ? ` (${detail})` : ""
        console.debug(`[OrbitControls] ${operation}${detailStr}  ← ${caller}`)
    }

    /**
     * 콜스택을 파싱하여 "호출 함수명 @ 파일명:라인번호" 형태의 문자열을 반환합니다.
     * orbitbroker.ts 내부 프레임은 건너뜁니다.
     */
    private static extractCaller(): string {
        const raw = new Error().stack ?? ""
        const lines = raw.split("\n")

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === "Error") continue
            // 브로커 내부 프레임 제외
            if (trimmed.includes("orbitbroker")) continue
            // camera.ts의 getControlsAccess 래퍼 및 반환 람다 제외
            if (trimmed.includes("getControlsAccess")) continue
            if (trimmed.includes("systems/camera/camera")) continue

            // Chrome / Node.js 형식: at FnName (file:line:col)
            const chrome = trimmed.match(/^at\s+([^\s(]+)\s+\((.+?):(\d+):\d+\)$/)
            if (chrome) {
                const fn = chrome[1]
                const shortFile = this.shortPath(chrome[2])
                return `${fn} @ ${shortFile}:${chrome[3]}`
            }

            // Chrome 익명 / webpack 번들: at webpack-internal:///.../file.ts:line:col
            const chromeAnon = trimmed.match(/^at\s+.+\/([^/]+\.ts):(\d+):\d+/)
            if (chromeAnon) {
                return `(anonymous) @ ${chromeAnon[1]}:${chromeAnon[2]}`
            }

            // Firefox 형식: fnName@file:line:col
            const firefox = trimmed.match(/^(.+?)@(.+?):(\d+):\d+$/)
            if (firefox) {
                const shortFile = this.shortPath(firefox[2])
                return `${firefox[1]} @ ${shortFile}:${firefox[3]}`
            }
        }
        return "unknown"
    }

    /** 긴 파일 경로에서 "디렉토리/파일명.ts" 형태로 축약 */
    private static shortPath(fullPath: string): string {
        const parts = fullPath.replace(/\\/g, "/").split("/")
        return parts.length >= 2
            ? parts.slice(-2).join("/")
            : parts[parts.length - 1] ?? fullPath
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// IOrbitControlsAccess — 외부 시스템용 인터페이스
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fleet, Galaxy 등 외부 시스템이 OrbitControls를 조작할 때 사용하는 최소 인터페이스.
 * OrbitControls에 직접 의존하지 않으므로 테스트·교체가 용이합니다.
 */
export interface IOrbitControlsAccess {
    /** controls.target을 Vector3로 설정 */
    setTarget(pos: THREE.Vector3): void
    /** controls.target을 좌표값으로 설정 (GSAP 애니메이션 콜백 등에서 사용) */
    setTargetXYZ(x: number, y: number, z: number): void
    /** 현재 controls.target 복사본 반환 */
    getTarget(): THREE.Vector3
    /** controls.enabled 설정 (드래그 조작 잠금/해제 등) */
    setEnabled(enabled: boolean): void
    /** controls.update() 호출 */
    update(): void
    /**
     * 사용자가 OrbitControls 조작을 시작할 때 호출될 콜백을 등록합니다.
     * @returns 등록 해제 함수
     */
    onUserInteractionStart(callback: () => void): () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// OrbitControlsHandle — 전략용 소유권 핸들
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 전략이 활성화된 동안만 유효한 OrbitControls 접근 핸들.
 * 전략이 비활성화(uninit) 된 뒤 broker.acquire()가 호출되면 자동으로 무효화됩니다.
 */
export class OrbitControlsHandle {
    private alive = true;

    constructor(
        private readonly _ctrl: OrbitControls,
        /** 소유 전략 식별용 태그 (로그 출력에 사용) */
        readonly ownerTag: string,
    ) {}

    /** 핸들이 아직 유효한지 여부 */
    get isValid(): boolean { return this.alive; }

    /** OrbitControls 인스턴스 (isValid로 직접 가드하여 사용) */
    get controls(): OrbitControls { return this._ctrl; }

    /** 안전 update — 무효화된 핸들에서는 아무 일도 하지 않음 */
    safeUpdate(): void { if (this.alive) this._ctrl.update(); }

    /** OrbitControlsBroker가 다음 전략으로 넘어갈 때 호출 */
    invalidate(): void { this.alive = false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// OrbitControlsBroker — 소유권 중재자
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OrbitControls 소유권을 중재하는 브로커.
 * Camera가 단독으로 보유하며, 전략에게 OrbitControlsHandle을 발급합니다.
 *
 * 흐름:
 *   1. 구 전략 uninit()  ← 이 시점엔 handle이 아직 유효 → 정리(cleanup) 안전
 *   2. 신 전략 init() → broker.acquire(태그) 호출 → 구 handle 무효화, 신 handle 발급
 *   3. 구 전략이 남아 있는 비동기 콜백에서 handle.isValid 로 접근 차단
 */
export class OrbitControlsBroker {
    private currentHandle: OrbitControlsHandle | null = null;

    constructor(private readonly controls: OrbitControls) {}

    /**
     * 새 전략이 소유권을 획득합니다.
     * @param ownerTag 로그 식별용 전략 이름 (e.g. "SpaceWarCameraStrategy")
     */
    acquire(ownerTag: string): OrbitControlsHandle {
        OrbitControlsLogger.logAcquire(ownerTag, this.currentHandle?.ownerTag)
        this.currentHandle?.invalidate();
        this.currentHandle = new OrbitControlsHandle(this.controls, ownerTag);
        return this.currentHandle;
    }
}
