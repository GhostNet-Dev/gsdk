
export default class RotateLight {
    dom: HTMLElement

    constructor(parent: HTMLElement, { color1 = "#00ff00", color2 = "#ffffff", speed = "4s", index = 0} = {}) {
        this.applyDynamicStyle("rotating-light", getCSS(color1, color2, speed, index))

        this.dom = document.createElement("div");
        this.dom.classList.add("rotating-background");
        const lightDom = document.createElement("div");
        lightDom.classList.add("rotating-light")
        this.dom.appendChild(lightDom)

        parent.appendChild(this.dom)
    }

    applyDynamicStyle(styleId: string, css: string) {
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style); // <head>에 스타일 추가
        } else {
            console.log("Style already applied.");
        }
    }
}

function getCSS(color1: string, color2: string, speed: string, index: number){
    return `
/* 전체 배경 */
.rotating-background {
  position: absolute;
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

