import { GUX, IGUX } from "../gux";

export default class Focusing extends GUX{
  Dom: HTMLElement

  constructor(private parent: HTMLElement, { color = "#000000", start = "20%", end = "100%", index = 0 } = {}) {
    super()
    this.applyDynamicStyle("focusing-gradient", getCSS(color, start, end, index))
    this.Dom = document.createElement("div");
    this.Dom.classList.add("gradient-overlay");
  }
  Hide() {
    this.parent.removeChild(this.Dom)
  }
  Show() {
    this.parent.appendChild(this.Dom)
  }
  RenderHTML(...param: any): void { }
  AddChild(dom: IGUX, ...param: any): void { }
}



function getCSS(hex: string, start: string, end: string, index: number) {
    // HEX 코드에서 # 제거
    hex = hex.replace('#', '');

    // 3자리 HEX를 6자리 HEX로 변환
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    // R, G, B 값 계산
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `
/* 방사형 그라데이션 효과 */
.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle,
    rgba(${r}, ${g}, ${b}, 0) ${start},  /* 중심부 투명 */
    rgba(${r}, ${g}, ${b}, 1) ${end} /* 외곽부 어두움 */
  );
  pointer-events: none; /* 상호작용 차단 (아래 요소 클릭 가능) */
  ${index > 0 ? `z-index:${index};` : ""}
}
    `
}
