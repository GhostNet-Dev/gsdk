import { GUX, IGUX } from "../gux";

export default class RotateLight extends GUX {
  Dom = document.createElement("div")
  contentCol = document.createElement("div")
  open: Function
  close: Function

  constructor(private parent: HTMLElement, {
    color1 = "#00ff00", color2 = "#ffffff", speed = "4s", index = 0,
    open = () => { }, close = () => { }, click = () => { }
  } = {}) {
    super()
    this.open = open
    this.close = close
    this.applyDynamicStyle("rotating-light", getCSS(color1, color2, speed, index))

    this.Dom = document.createElement("div");
    this.Dom.classList.add("rotating-background");
    const lightDom = document.createElement("div");
    lightDom.classList.add("rotating-light")
    this.Dom.appendChild(lightDom)
    this.Dom.onclick = (e) => { e.stopPropagation(); click(); }

    const container = document.createElement("div")
    container.classList.add("container", "p-2")
    container.style.height = "100%"
    const row1 = document.createElement("div")
    row1.classList.add("row", "m-0")
    row1.style.height = "80%"
    this.contentCol.classList.add("col", "d-flex", "align-items-center")
    row1.appendChild(this.contentCol)
    container.appendChild(row1)
    this.Dom.appendChild(container)
  }
  AddChild(dom: IGUX, ...param: any): void {
    this.contentCol.appendChild(dom.Dom)
  }
  AddChildDom(dom: HTMLElement) {
    dom.addEventListener("click", (e) => { e.stopPropagation() })
    this.contentCol.appendChild(dom)
  }
  RenderHTML(...param: any): void {
  }
  dispose() {
    this.parent.removeChild(this.Dom)
  }
  Show() {
    this.parent.appendChild(this.Dom)
    this.open()
  }
  Hide(): void {
    this.close()
    if (this.parent.contains(this.Dom)) this.parent.removeChild(this.Dom)
  }
}

function getCSS(color1: string, color2: string, speed: string, index: number) {
  return `
/* 전체 배경 */
.rotating-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden; /* 스크롤바 방지 */
  ${index > 0 ? `z-index:${index};` : ""}
}

.rotating-light {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1000vw; /* 화면 크기보다 충분히 크게 설정 */
  height: 1000vh; /* 화면 크기보다 충분히 크게 설정 */
  background: repeating-conic-gradient(
    from 0deg,
    ${color1} 0deg,
    ${color1} 15deg,
    ${color2} 15deg,
    ${color2} 30deg
  );
  transform: translate(-50%, -50%) rotate(0deg); /* 중앙에 배치 */
  animation: rotate-light ${speed} linear infinite; /* 회전 애니메이션 */
  ${index > 0 ? `z-index:${index};` : ""}
}

/* 회전 애니메이션 */
@keyframes rotate-light {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}


    `
}

