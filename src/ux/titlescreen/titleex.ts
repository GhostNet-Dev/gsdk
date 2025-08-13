// retroEffects.ts
// CSS 변수(--ts-base-font) 기반의 80s 레트로 타이틀 이펙트 모음
// TitleScreen의 ITitleEffect와 호환
/* -------------------------------------------------------------------------- */
/*                              Injection Helpers                              */
/* -------------------------------------------------------------------------- */

import { EffectDisposer, ITitleEffect } from "./retrotitlescreen";

class StyleManager {
  private static injected = new Set<string>();
  static inject(id: string, css: string) {
    if (this.injected.has(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
    this.injected.add(id);
  }
}

class FontManager {
  private static loaded = new Set<string>();
  static load(url: string) {
    if (this.loaded.has(url)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute("data-retro-font", "1");
    document.head.appendChild(link);
    this.loaded.add(url);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Utilities                                  */
/* -------------------------------------------------------------------------- */

function replaceWith(el: HTMLElement, newNode: HTMLElement): EffectDisposer {
  const parent = el.parentNode;
  if (!parent) {
    // 엘리먼트가 아직 DOM에 없다면 그냥 교체만 하고 디스포저는 원본을 제거
    el.replaceWith(newNode);
    return () => {
      try { newNode.remove(); } catch {}
    };
  }
  const next = el.nextSibling;
  parent.removeChild(el);
  if (next) parent.insertBefore(newNode, next);
  else parent.appendChild(newNode);

  // 복원
  return () => {
    if (!newNode.parentNode) return;
    const p = newNode.parentNode;
    const ref = newNode.nextSibling;
    p.removeChild(newNode);
    if (ref) p.insertBefore(el, ref);
    else p.appendChild(el);
  };
}

function ensureRetroStyles() {
  const FONTS = [
    "https://fonts.googleapis.com/css?family=Mr+Dafoe",
    "https://fonts.googleapis.com/css?family=Titillium+Web:900",
    "https://fonts.googleapis.com/css?family=Righteous",
    "https://fonts.googleapis.com/css?family=Candal",
    "https://fonts.googleapis.com/css?family=Permanent+Marker",
    "https://fonts.googleapis.com/css?family=Monoton",
  ];
  for (const u of FONTS) FontManager.load(u);

  // 모든 font-size 하드코딩 제거 → var(--ts-base-font) / 각 파트별 scale 변수로 제어
  StyleManager.inject(
    "retro-80s-pack-vars",
    `
:root { --ts-base-font: 200px; }

/* 공통 */
.retro-block { display:inline-block; line-height:1; }

/* ------------------- CHROME ------------------- */
.chrome {
  position: relative;
  background-image: -webkit-linear-gradient(#378DBC 0%, #B6E8F1 46%, #ffffff 50%, #32120E 54%, #FFC488 58%, #582C11 90%, #EC9B4E 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 4px #f5f5f5;
  font-family: 'Titillium Web', sans-serif;
  font-style: italic;
  margin: 0;
  line-height: 1;
  font-size: var(--ts-base-font);
}
.chrome::before {
  content: attr(data-text);
  position: absolute;
  left: 0; top: 0; z-index: 10;
  background-image: -webkit-linear-gradient(-40deg, transparent 0%, transparent 40%, #fff 50%, transparent 60%, transparent 100%);
  background-position:-680px 0;
  -webkit-background-clip: text;
  -webkit-text-stroke: 0;
  padding-right: 0em;
  -webkit-animation: chrome_effect 6s 2s linear infinite;
}
@-webkit-keyframes chrome_effect {
  0% {background-position:-680px 0;}
  10% {background-position:420px 0;}
  100% {background-position:420px 0;}
}

/* Dreams 오버레이 */
.dreams {
  --ts-dreams-scale: .8;
  position: absolute;
  margin: 0;
  font-family: 'Mr Dafoe', cursive;
  font-size: calc(var(--ts-base-font) * var(--ts-dreams-scale));
  color: #F975F7;
  transform: rotate(-15deg);
  -webkit-text-stroke: 1px #f008b7;
  -webkit-filter: drop-shadow(2px 2px 20px #f008b7);
  z-index: 20;
}

/* ------------------- VECTRO ------------------- */
.vectro {
  position: relative;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: .1px #f1f1f1;
  font-family: 'Righteous', cursive;
  margin: 0;
  font-size: var(--ts-base-font);
}
.vectro::after {
  content: '';
  position: absolute; left:0; top:0; width:100%; height:100%;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 2px);
}
.vectro-body {
  -webkit-background-clip: text;
  background-image: -webkit-linear-gradient(#C3BFB4 0%, #FDFCFA 50%, #E8E7E5 51%, #757172 52%, #E8E9DB 100%);
  -webkit-filter: drop-shadow(2px 2px 15px #3F59F4);
}
.vectro-red   { -webkit-text-fill-color:#F10C20;  color:#F10C20;  -webkit-text-stroke:0; -webkit-filter: drop-shadow(2px 2px 15px #F10C20); font-style: italic; padding-right: .12em; }
.vectro-green { -webkit-text-fill-color:#6BFF2B;  color:#6BFF2B;  -webkit-text-stroke:0; -webkit-filter: drop-shadow(2px 2px 15px #6BFF2B); font-style: italic; padding-right: .12em; margin-left: -.12em; }
.vectro-blue  { -webkit-text-fill-color:#3F59F4;  color:#3F59F4;  -webkit-text-stroke:0; -webkit-filter: drop-shadow(2px 2px 15px #3F59F4); font-style: italic; padding-right: .12em; margin-left: -.12em; }

/* ------------------- STREET / MACHINE ------------------- */
.street {
  position: relative;
  font-family: 'Candal', sans-serif;
  font-style: italic;
  -webkit-text-stroke: .1px #ed2121;
  color: #fff;
  text-shadow: -10px 10px 0px #ed2121;
  margin: 0;
  font-size: var(--ts-base-font);
}
.street::before {
  content: '';
  position: absolute; height: 4px; width: 3.5em; top: .46em; left: .26em;
  background: #ed2121; box-shadow: -8px 13px #ed2121;
}
.street::after {
  content: '';
  position: absolute; height: 4px; width: 3.35em; top: .6em; left: .2em;
  background: #ed2121; box-shadow: -4px 13px #ed2121;
}
.machine {
  --ts-machine-scale: .65;
  position: absolute; left: .28em; top: 1.95em;
  font-family: 'Mr Dafoe', cursive;
  transform: rotate(-15deg);
  color: #ed2121; margin: 0; margin-top: -0.9em; padding-left: 2.3em;
  text-shadow: 1px 2px 0px #F9D2D2;
  font-size: calc(var(--ts-base-font) * var(--ts-machine-scale));
}

/* ------------------- VICTORY ------------------- */
.victory {
  position: relative;
  font-family: 'Permanent Marker', cursive;
  font-variant: small-caps;
  -webkit-transform: skew(-15deg,-15deg);
  padding-left: .44em;
  background-image: -webkit-linear-gradient(#FF0FF8 0%,  #F9F9F7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  -webkit-filter: drop-shadow(2px 2px 20px #f008b7);
  font-size: var(--ts-base-font);
}
.victory::before {
  content: '-';
  position: absolute; bottom: -.54em; left: 1.41em;
  background-image: -webkit-linear-gradient(#F3C8F3 0%, #F3C8F3 100%);
  -webkit-background-clip: text;
  text-shadow: 70px -7px #F3C8F3;
}
.victory::after {
  content: '-';
  position: absolute; bottom: -.47em; left: 2.2em;
  background-image: -webkit-linear-gradient(#F3C8F3 0%, #F3C8F3 100%);
  -webkit-background-clip: text;
  text-shadow: 70px -5px #F3C8F3;
}
.victory-v {
  position: relative;
  background-image: -webkit-linear-gradient(#FF0FF8 0%,  #F9F9F7 100%);
  -webkit-background-clip: text;
  padding-right: .1em; margin-right: -.1em;
}

/* ------------------- FUTURE / COP ------------------- */
.future {
  --ts-future-scale: 1;
  position: absolute; left: 0; top: -1.7em;
  font-family: 'Mr Dafoe', cursive;
  margin: .9em 0 0 .33em;
  color: #EB219B; -webkit-text-fill-color: rgba(253, 90, 250, 1);
  text-shadow: -2px -2px 0 #FFBAF2;
  -webkit-filter: drop-shadow(3px 3px 1px #441F62);
  -webkit-transform: skew(-5deg,-5deg);
  font-weight: normal; z-index: 2;
  padding-left: .26em; padding-right: .36em;
  font-size: calc(var(--ts-base-font) * var(--ts-future-scale));
}
.cop {
  position: relative;
  font-family: 'Monoton', cursive;
  line-height: 1; margin: 0; margin-top: -.52em;
  padding-left: .44em;
  background-image: -webkit-linear-gradient(#022486 0%, #0AD0FD 30%, #BDFCFC 40%, #D8FFFF 44%, #00081C 44%, #00081C 50%, #074A67 52%, #1CD8FE 60%, #7FEDFE 62%, #96F5FC 70%, #0FD8FA 73%, #0BD2FD 88%, #AFFDFF 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1px #fff;
  font-size: var(--ts-base-font);
}
.cop::before {
  position: absolute; content: ''; left: .26em; top: .41em; width: .42em; height: 3px;
  background-image: -webkit-radial-gradient(#fff 0%, transparent 85%);
  z-index: 4; -webkit-animation: cop_before_effect 5s 2s linear infinite;
}
.cop::after {
  position: absolute; content: ''; left: .47em; top: .18em; width: 3px; height: .42em;
  background-image: -webkit-radial-gradient(#fff 0%, transparent 85%);
  z-index: 4; -webkit-animation: cop_after_effect 5s 2s linear infinite;
}
@-webkit-keyframes cop_before_effect {
  0% { left: .26em; top: .41em; opacity: 0; }
  15%{ left: .26em; top: .41em; opacity: 1; }
  30%{ left: .26em; top: .41em; opacity: 0; }
  35%{ left: 1.92em; top: .25em; opacity: 0; }
  50%{ left: 1.92em; top: .25em; opacity: 1; }
  65%{ left: 1.92em; top: .25em; opacity: 0; }
  70%{ left: 2.94em; top: .41em; opacity: 0; }
  85%{ left: 2.94em; top: .41em; opacity: 1; }
  100%{ left: 2.94em; top: .41em; opacity: 0; }
}
@-webkit-keyframes cop_after_effect {
  0% { left: .47em; top: .18em; opacity: 0; }
  15%{ left: .47em; top: .18em; opacity: 1; }
  30%{ left: .47em; top: .18em; opacity: 0; }
  35%{ left: 2.14em; top: .06em; opacity: 0; }
  50%{ left: 2.14em; top: .06em; opacity: 1; }
  65%{ left: 2.14em; top: .06em; opacity: 0; }
  70%{ left: 3.11em; top: .18em; opacity: 0; }
  85%{ left: 3.11em; top: .18em; opacity: 1; }
  100%{ left: 3.11em; top: .18em; opacity: 0; }
}
`
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Effects                                  */
/* -------------------------------------------------------------------------- */

export class ChromeEffect implements ITitleEffect {
  name = "retro-chrome";
  constructor() {}
  apply(el: HTMLElement) {
    ensureRetroStyles();
    const title = el.textContent ?? "";
    const node = document.createElement("h1");
    node.className = "chrome retro-block";
    node.dataset.text = title;
    node.textContent = title;
    return replaceWith(el, node);
  }
}

export class DreamsOverlayEffect implements ITitleEffect {
  name = "retro-dreams-overlay";
  /**
   * @param overlayText 오버레이 텍스트
   * @param offsetEm    { left:em, top:em } 단위의 위치 오프셋(기본 {left:2.2, top:-1.0})
   * @param scale       .dreams의 스케일(기본 0.8) → CSS 변수 --ts-dreams-scale
   */
  constructor(
    private overlayText = "Dreams",
    private offsetEm: { left: number; top: number } = { left: 2.2, top: -1.0 },
    private scale = 0.8
  ) {}
  apply(el: HTMLElement) {
    ensureRetroStyles();

    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.display = "inline-block";

    const main = document.createElement("h1");
    main.className = "chrome retro-block";
    main.dataset.text = el.textContent ?? "";
    main.textContent = el.textContent ?? "";

    const dreams = document.createElement("div");
    dreams.className = "dreams";
    dreams.textContent = this.overlayText;
    dreams.style.marginLeft = `${this.offsetEm.left}em`;
    dreams.style.marginTop = `${this.offsetEm.top}em`;
    dreams.style.setProperty("--ts-dreams-scale", String(this.scale));

    wrap.appendChild(main);
    wrap.appendChild(dreams);

    return replaceWith(el, wrap);
  }
}

export class VectroEffect implements ITitleEffect {
  name = "retro-vectro";
  constructor() {}
  apply(el: HTMLElement) {
    ensureRetroStyles();
    const text = (el.textContent ?? "").trim();
    const container = document.createElement("h1");
    container.className = "vectro retro-block";

    const red = document.createElement("span");
    red.className = "vectro-red";
    red.textContent = text[0] ?? "";

    const green = document.createElement("span");
    green.className = "vectro-green";
    green.textContent = text[1] ?? "";

    const blue = document.createElement("span");
    blue.className = "vectro-blue";
    blue.textContent = text[2] ?? "";

    const body = document.createElement("span");
    body.className = "vectro-body";
    body.textContent = text.slice(3);

    container.append(red, green, blue, body);
    return replaceWith(el, container);
  }
}

export class StreetMachineEffect implements ITitleEffect {
  name = "retro-street-machine";
  /**
   * @param machineText 보조 라인 텍스트
   * @param machineScale --ts-machine-scale (기본 0.65)
   * @param machineOffsetEm 보조 라인의 좌표 보정(em)
   */
  constructor(
    private machineText = "Machine",
    private machineScale = 0.65,
    private machineOffsetEm: { left?: number; top?: number } = {}
  ) {}
  apply(el: HTMLElement) {
    ensureRetroStyles();
    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.display = "inline-block";

    const street = document.createElement("h1");
    street.className = "street retro-block";
    street.textContent = el.textContent ?? "";

    const machine = document.createElement("div");
    machine.className = "machine";
    machine.textContent = this.machineText;
    machine.style.setProperty("--ts-machine-scale", String(this.machineScale));
    if (this.machineOffsetEm.left != null) machine.style.left = `${this.machineOffsetEm.left}em`;
    if (this.machineOffsetEm.top != null) machine.style.top = `${this.machineOffsetEm.top}em`;

    wrap.appendChild(street);
    wrap.appendChild(machine);
    return replaceWith(el, wrap);
  }
}

export class VictoryEffect implements ITitleEffect {
  name = "retro-victory";
  constructor() {}
  apply(el: HTMLElement) {
    ensureRetroStyles();
    const text = (el.textContent ?? "").trim();
    const v = text[0] ?? "";
    const rest = text.slice(1);

    const h1 = document.createElement("h1");
    h1.className = "victory retro-block";

    const vSpan = document.createElement("span");
    vSpan.className = "victory-v";
    vSpan.textContent = v;

    const restSpan = document.createElement("span");
    restSpan.textContent = rest;

    h1.append(vSpan, restSpan);
    return replaceWith(el, h1);
  }
}

export class FutureCopEffect implements ITitleEffect {
  name = "retro-future-cop";
  /**
   * @param futureText   상단 스크립트 라인 텍스트
   * @param futureScale  --ts-future-scale (기본 1)
   * @param futureOffsetEm 위치 보정(em)
   */
  constructor(
    private futureText = "Future",
    private futureScale = 1,
    private futureOffsetEm: { left?: number; top?: number } = {}
  ) {}
  apply(el: HTMLElement) {
    ensureRetroStyles();

    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.display = "inline-block";
    wrap.style.marginTop = "0.9em";

    const future = document.createElement("div");
    future.className = "future";
    future.textContent = this.futureText;
    future.style.setProperty("--ts-future-scale", String(this.futureScale));
    if (this.futureOffsetEm.left != null) future.style.left = `${this.futureOffsetEm.left}em`;
    if (this.futureOffsetEm.top != null) future.style.top = `${this.futureOffsetEm.top}em`;

    const cop = document.createElement("h1");
    cop.className = "cop retro-block";
    cop.textContent = el.textContent ?? "";

    wrap.appendChild(future);
    wrap.appendChild(cop);

    return replaceWith(el, wrap);
  }
}