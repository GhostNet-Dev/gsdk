// DayNightRig.ts
import * as THREE from "three";
import { gui } from "@Glibs/helper/helper";
import { SkyBoxAllTime } from "./skyboxalltime";
import DefaultLights from "@Glibs/systems/lights/defaultlights";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export interface DayNightRigOptions {
  debug?: boolean;
  /** 밤의 어두움 강도 (노출 낮춤량). 1.0이면 기본, 0.4면 밤에 더 어둡게 보임 */
  nightExposureFactor?: number;  // default 0.55
  /** 감쇠(스무딩) 계수: 값이 낮을수록 반응 빠름 */
  damping?: number;              // default 0.15
  /** 낮 최대/최소 조도 */
  sunDayIntensity?: number;      // default 1.0
  sunNightIntensity?: number;    // default 0.08
  ambDayIntensity?: number;      // default 1.0
  ambNightIntensity?: number;    // default 0.10
  hemiDayIntensity?: number;     // default 0.8
  hemiNightIntensity?: number;   // default 0.05
  fillDayIntensity?: number;     // default 0.25
  fillNightIntensity?: number;   // default 0.04
  /** 하루 길이(초) */
  dayLengthSec?: number;         // default 120
}

export class DayNightRig implements ILoop {
  LoopId: number = 0;
  private _t = 0.0;         // 현재 시간 (0..1)
  private _targetT = 0.0;   // 목표 시간 (0..1)
  private _exposure = 1.0;

  constructor(
    private eventCtrl: IEventController,
    private sky: SkyBoxAllTime,
    private lights: DefaultLights,             // DefaultLights는 DirectionalLight를 상속
    private renderer: THREE.WebGLRenderer,
    private opts: DayNightRigOptions = {}
  ) {
    const o = this.opts;
    o.nightExposureFactor ??= 0.55;
    o.damping ??= 0.15;

    o.sunDayIntensity ??= 1.0;
    o.sunNightIntensity ??= 0.08;
    o.ambDayIntensity ??= 1.0;
    o.ambNightIntensity ??= 0.10;
    o.hemiDayIntensity ??= 0.8;
    o.hemiNightIntensity ??= 0.05;
    o.fillDayIntensity ??= 0.25;
    o.fillNightIntensity ??= 0.04;
    o.dayLengthSec ??= 120;

    if (o.debug) {
      const f = gui.addFolder("DayNight");
      f.add(this, "timeOfDay", 0, 1, 0.001).name("timeOfDay");
    }

    // 초기 적용: 정오(밝은 낮)
    this.applyNow(0.0);

    // 루프 등록
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  /** 외부에서 시간 지정 (0=낮 → 0.5=노을 → 1=밤) */
  set timeOfDay(v: number) {
    this._targetT = wrap01(v);
  }
  get timeOfDay() { return this._targetT; }

  /** 즉시 반영하고 싶을 때 */
  applyNow(v: number) {
    this._t = wrap01(v);
    this._targetT = this._t;
    this.apply(this._t, true);
  }

  /** 매 프레임 호출 */
  update(dt: number) {
    // 자동 진행: 목표 시간(t_target)을 원형 누적
    const dayLen = this.opts.dayLengthSec!;
    const inc = (dt / dayLen) % 1;
    this._targetT = wrap01(this._targetT + inc);

    // 랩 보간 (가장 짧은 원호)
    const k = this.opts.damping!;
    const delta = shortestWrapDelta(this._t, this._targetT); // [-0.5, +0.5]
    const smoothing = 1 - Math.pow(1 - k, Math.max(dt * 60, 1));
    this._t = wrap01(this._t + delta * smoothing);

    this.apply(this._t, false);
  }

  /** 내부 적용 로직 */
  private apply(t: number, immediate: boolean) {
    // 하늘 셰이더 갱신
    this.sky.setTimeOfDay(t);

    // ---- 컬러 팔레트(웜톤) ----
    const daySunColor   = new THREE.Color(0xfff2e0); // 약간 웜톤
    const sunsetSunA    = new THREE.Color(0xff8a33); // 오렌지
    const sunsetSunB    = new THREE.Color(0xaa4488); // 퍼플 기
    const nightSunColor = new THREE.Color(0x224466); // 밤 푸른기(약한)

    // 일몰/일출 펄스 (원형)
    // - 일몰 중심: 0.525 (대략 0.35~0.70의 중간)
    // - 일출 중심: 0.025 (랩 경계: 0.95~0.10)
    const sunsetSpan  = wrapPulse(t, 0.525, 0.35); // width = 0.35
    const sunriseSpan = wrapPulse(t, 0.025, 0.25); // width = 0.25

    const sunsetColor  = daySunColor.clone().lerp(sunsetSunA, sunsetSpan)
                                    .lerp(sunsetSunB, sunsetSpan * 0.35);
    const sunriseColor = daySunColor.clone().lerp(sunsetSunA, sunriseSpan * 0.6);

    // 최종 Sun 색 (낮→일출/일몰 강조→밤)
    const sunColor = daySunColor.clone()
      .lerp(sunriseColor, sunriseSpan)
      .lerp(sunsetColor,  sunsetSpan)
      .lerp(nightSunColor, smoothstep(0.60, 1.00, nightness(t)));

    // 세기: 낮(강) → 일출/일몰(중) → 밤(약)
    const sunI = THREE.MathUtils.lerp(
      this.opts.sunDayIntensity!,
      this.opts.sunNightIntensity!,
      smoothstep(0.45, 1.0, nightness(t))
    );

    // Ambient/Hemisphere/Fill 세기
    const ambI  = THREE.MathUtils.lerp(this.opts.ambDayIntensity!,  this.opts.ambNightIntensity!,  smoothstep(0.55, 1.0, nightness(t)));
    const hemiI = THREE.MathUtils.lerp(this.opts.hemiDayIntensity!, this.opts.hemiNightIntensity!, smoothstep(0.55, 1.0, nightness(t)));
    const fillI = THREE.MathUtils.lerp(this.opts.fillDayIntensity!, this.opts.fillNightIntensity!, smoothstep(0.55, 1.0, nightness(t)));

    // DefaultLights 구성요소
    const sun  = this.lights as THREE.DirectionalLight;
    const amb  = this.lights.ambient as THREE.AmbientLight;
    const hemi = this.lights.hemi as THREE.HemisphereLight;
    const fill = this.lights.fill as THREE.DirectionalLight;

    sun.color.copy(sunColor);
    sun.intensity  = sunI;
    amb.intensity  = ambI;
    hemi.intensity = hemiI;
    fill.intensity = fillI;

    // 노출: 밤에 낮춤 (일출 구간도 자연스럽게 상승)
    const targetExposure = THREE.MathUtils.lerp(
      1.0,
      this.opts.nightExposureFactor!,
      smoothstep(0.60, 1.0, nightness(t))
    );

    if (immediate) {
      this._exposure = targetExposure;
    } else {
      this._exposure += (targetExposure - this._exposure) * 0.1;
    }
    this.renderer.toneMappingExposure = this._exposure;
  }
}

/* -------------------- 유틸 -------------------- */
function wrap01(x: number) {
  x = x % 1;
  return x < 0 ? x + 1 : x;
}

/** 현재→목표의 "가장 짧은" 원형 차이: 결과 범위 [-0.5, +0.5] */
function shortestWrapDelta(curr: number, target: number) {
  let d = (target - curr) % 1;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function smoothstep(a: number, b: number, x: number) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 원형 기반 "밤 성분" (정오=0, 자정=최대) → 0..1 */
function nightness(t: number) {
  // 정오(0)로부터의 원형 거리: 0..0.5
  const dRaw = Math.abs(t - 0) % 1;
  const d = Math.min(dRaw, 1 - dRaw);      // 0 at noon, 0.5 at midnight
  // 0.25 근처부터 밤 성분이 증가 (가중치 곡선)
  return THREE.MathUtils.clamp((d - 0.25) / (0.5 - 0.25), 0, 1);
}

/** 원형 펄스: center±width 구간에서 smoothstep 모양 가중치(0..1) */
function wrapPulse(t: number, center: number, width: number) {
  // 원형 거리
  let d = Math.abs(t - center) % 1;
  d = Math.min(d, 1 - d);
  if (d >= width) return 0;
  const x = 1 - (d / width); // 0..1
  return x * x * (3 - 2 * x);
}

export default DayNightRig;
