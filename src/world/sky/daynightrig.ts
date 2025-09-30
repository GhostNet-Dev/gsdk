// DayNightRig.ts — Sky/Light hard sync v2.2 (fix: skyTime logic, light access, sun color)
import * as THREE from "three";
import { gui } from "@Glibs/helper/helper";
import { SkyBoxAllTime } from "./skyboxalltime";
import DefaultLights from "@Glibs/systems/lights/defaultlights";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export interface DayNightRigOptions {
  debug?: boolean;

  nightExposureFactor?: number;     // default 0.55
  damping?: number;                 // default 0.15
  dayLengthSec?: number;            // default 120

  sunDayIntensity?: number;         // default 1.0
  sunNightIntensity?: number;       // default 0.08
  ambDayIntensity?: number;         // default 1.0
  ambNightIntensity?: number;       // default 0.10
  hemiDayIntensity?: number;        // default 0.8
  hemiNightIntensity?: number;      // default 0.05
  fillDayIntensity?: number;        // default 0.25
  fillNightIntensity?: number;      // default 0.04

  portions?: Partial<Portions>;
  lightEase?: "linear" | "smooth";  // default 'linear'
  auto?: boolean
}

export interface Portions {
  dayCore: number;
  sunset: number;
  nightCore: number;
  sunrise: number;
}

type Range = { start: number; len: number };

export class DayNightRig implements ILoop {
  LoopId: number = 0;

  private _t = 0.0;
  private _targetT = 0.0;
  private _exposure = 1.0;

  private P: Portions;
  private ranges!: { day: Range; sunset: Range; night: Range; sunrise: Range; };

  constructor(
    private eventCtrl: IEventController,
    private sky: SkyBoxAllTime,
    private lights: DefaultLights,
    private renderer: THREE.WebGLRenderer,
    private opts: DayNightRigOptions = {}
  ) {
    const o = this.opts;
    o.nightExposureFactor ??= 0.55;
    o.damping ??= 0.15;
    o.dayLengthSec ??= 120;

    o.sunDayIntensity ??= 1.5;
    o.sunNightIntensity ??= 0.08;
    o.ambDayIntensity ??= 1.2;
    o.ambNightIntensity ??= 0.10;
    o.hemiDayIntensity ??= 1.0;
    o.hemiNightIntensity ??= 0.05;
    o.fillDayIntensity ??= 0.35;
    o.fillNightIntensity ??= 0.04;
    o.lightEase ??= "linear";
    o.auto ??= true;

    this.P = normalizePortions({
      dayCore: o.portions?.dayCore ?? 0.40,
      sunset: o.portions?.sunset ?? 0.10,
      nightCore: o.portions?.nightCore ?? 0.40,
      sunrise: o.portions?.sunrise ?? 0.10,
    });
    this.recomputeRanges();

    if (o.debug) {
      const f = gui.addFolder("DayNight");
      f.add(this, "timeOfDay", 0, 1, 0.001).name("timeOfDay");

      const pf = f.addFolder("Portions (sum=1)");
      const proxy = { ...this.P };
      pf.add(proxy, "dayCore", 0.0, 1.0, 0.001).onChange((v: number) => this.setPortion("dayCore", v));
      pf.add(proxy, "sunset", 0.0, 1.0, 0.001).onChange((v: number) => this.setPortion("sunset", v));
      pf.add(proxy, "nightCore", 0.0, 1.0, 0.001).onChange((v: number) => this.setPortion("nightCore", v));
      pf.add(proxy, "sunrise", 0.0, 1.0, 0.001).onChange((v: number) => this.setPortion("sunrise", v));

      f.add(this.opts, "lightEase", ["linear", "smooth"]).name("Light Ease");
    }

    this.applyNow(0.25); // Start at morning
    if (o.auto) this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  private setPortion(key: keyof Portions, value: number) {
    this.P = normalizePortions({ ...this.P, [key]: value });
    this.recomputeRanges();
  }

  set timeOfDay(v: number) { this._targetT = wrap01(v); }
  get timeOfDay() { return this._targetT; }

  applyNow(v: number) {
    this._t = wrap01(v);
    this._targetT = this._t;
    this.apply(this._t, true);
  }

  update(dt: number) {
    const inc = (dt / this.opts.dayLengthSec!) % 1;
    this._targetT = wrap01(this._targetT + inc);

    const k = this.opts.damping!;
    const delta = shortestWrapDelta(this._t, this._targetT);
    const smoothing = 1 - Math.pow(1 - k, Math.max(dt * 60, 1));
    this._t = wrap01(this._t + delta * smoothing);

    this.apply(this._t, false);
  }

  // DayNightRig.ts 파일 내의 apply 함수만 이 코드로 교체하세요.

  private apply(t: number, immediate: boolean) {
    // 1) skyTime & 진행도
    const dPos = segmentPos(t, this.ranges.day.start, this.ranges.day.len);
    const suPos = segmentPos(t, this.ranges.sunset.start, this.ranges.sunset.len);
    const nPos = segmentPos(t, this.ranges.night.start, this.ranges.night.len);
    const srPos = segmentPos(t, this.ranges.sunrise.start, this.ranges.sunrise.len);

    let skyTime = 0.0;
    let nightness = 0.0;

    if (dPos >= 0) {
      // 낮
      skyTime = 0.0;
      nightness = 0.0;
    } else if (suPos >= 0) {
      // 석양: skyTime 0.0 -> 0.5 (가장 붉은 노을)
      const progress = suPos / this.ranges.sunset.len;
      skyTime = 0.5 * progress;
      nightness = ease(noneOrSmooth(this.opts.lightEase!), progress);
    } else if (nPos >= 0) {
      // [수정됨] 밤: skyTime 0.5 -> 1.0 (붉은 노을이 어두운 밤으로)
      const progress = nPos / this.ranges.night.len;
      skyTime = 0.5 + 0.5 * progress;
      nightness = 1.0; // 밤 시간 동안 조명은 계속 어두운 상태
    } else if (srPos >= 0) {
      // 일출: skyTime 1.0 -> 0.0
      const progress = srPos / this.ranges.sunrise.len;
      skyTime = 1.0 - progress;
      nightness = 1.0 - ease(noneOrSmooth(this.opts.lightEase!), progress);
    }

    this.sky.setTimeOfDay(skyTime);

    // 2) 조명 색/강도 (이하 로직은 변경할 필요 없습니다)
    const daySunColor = new THREE.Color(0xfff2e0);
    const sunsetSunA = new THREE.Color(0xff8a33); // Orange
    const sunsetSunB = new THREE.Color(0xaa4488); // Purple hint
    const nightSunColor = new THREE.Color(0x224466);

    const sunColor = new THREE.Color();

    if (dPos >= 0) {
      sunColor.copy(daySunColor);
    } else if (suPos >= 0) {
      const k = ease(noneOrSmooth(this.opts.lightEase!), suPos / this.ranges.sunset.len);
      sunColor.copy(daySunColor).lerp(sunsetSunA, k).lerp(sunsetSunB, k * 0.35);
    } else if (nPos >= 0) {
      sunColor.copy(nightSunColor);
    } else if (srPos >= 0) {
      const k = ease(noneOrSmooth(this.opts.lightEase!), srPos / this.ranges.sunrise.len);
      if (k < 0.5) {
        sunColor.copy(nightSunColor).lerp(sunsetSunA, k * 2.0);
      } else {
        sunColor.copy(sunsetSunA).lerp(daySunColor, (k - 0.5) * 2.0);
      }
    }

    const sun = this.lights as THREE.DirectionalLight;
    const amb = this.lights.ambient as THREE.AmbientLight;
    const hemi = this.lights.hemi as THREE.HemisphereLight;
    const fill = this.lights.fill as THREE.DirectionalLight;

    const lerp = THREE.MathUtils.lerp;
    const sunI = lerp(this.opts.sunDayIntensity!, this.opts.sunNightIntensity!, nightness);
    const ambI = lerp(this.opts.ambDayIntensity!, this.opts.ambNightIntensity!, nightness);
    const hemiI = lerp(this.opts.hemiDayIntensity!, this.opts.hemiNightIntensity!, nightness);
    const fillI = lerp(this.opts.fillDayIntensity!, this.opts.fillNightIntensity!, nightness);

    sun.color.copy(sunColor);
    sun.intensity = sunI;
    amb.intensity = ambI;
    hemi.intensity = hemiI;
    fill.intensity = fillI;

    // 3) 노출
    const targetExposure = lerp(1.0, this.opts.nightExposureFactor!, nightness);
    if (immediate) this._exposure = targetExposure;
    else this._exposure += (targetExposure - this._exposure) * 0.2; // Smooth transition
    this._exposure = THREE.MathUtils.clamp(this._exposure, 0.01, 4.0);
    this.renderer.toneMappingExposure = this._exposure;
  }

  private recomputeRanges() {
    const Ld = this.P.dayCore;
    const Lsu = this.P.sunset;
    const Ln = this.P.nightCore;
    const Lsr = this.P.sunrise;

    const dayStart = 0.0;
    const sunsetStart = wrap01(dayStart + Ld);
    const nightStart = wrap01(sunsetStart + Lsu);
    const sunriseStart = wrap01(nightStart + Ln);

    this.ranges = {
      day: { start: dayStart, len: Ld },
      sunset: { start: sunsetStart, len: Lsu },
      night: { start: nightStart, len: Ln },
      sunrise: { start: sunriseStart, len: Lsr },
    };
  }
}

/* ==================== 유틸 ==================== */
function normalizePortions(p: Portions): Portions {
  const sum = p.dayCore + p.sunset + p.nightCore + p.sunrise;
  const s = sum > 1e-6 ? sum : 1;
  return {
    dayCore: p.dayCore / s,
    sunset: p.sunset / s,
    nightCore: p.nightCore / s,
    sunrise: p.sunrise / s,
  };
}
function wrap01(x: number) {
  x = x % 1;
  return x < 0 ? x + 1 : x;
}
function shortestWrapDelta(curr: number, target: number) {
  let d = (target - curr) % 1;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}
/** 랩 구간 내 위치: [start, start+len)면 0..len, 아니면 -1 */
function segmentPos(t: number, start: number, len: number): number {
  const end = start + len;
  if (len <= 1e-6) return -1; //
  if (end <= 1) { // 구간이 래핑되지 않는 경우
    if (t >= start && t < end) return t - start;
  } else { // 구간이 1.0을 넘어 0.0으로 래핑되는 경우
    const endWrapped = end % 1;
    if (t >= start || t < endWrapped) {
      if (t >= start) return t - start;
      else return t + (1 - start);
    }
  }
  return -1;
}
function noneOrSmooth(mode: "linear" | "smooth") {
  return mode === "smooth" ? "smooth" : "linear";
}
function ease(mode: "linear" | "smooth", x: number) {
  x = THREE.MathUtils.clamp(x, 0, 1);
  if (mode === "linear") return x;
  return x * x * (3 - 2 * x); // smoothstep
}

export default DayNightRig;