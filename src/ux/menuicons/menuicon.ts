import { Icons, IconsColor } from "./icontypes";
import { GetIconColorDb, GetIconDb } from "./preicons"

/*
yellow: startColor = "#FFC107", endColor = "#FFF176"
blue:  startColor = "#0D47A1", endColor = "#2196F3"
*/

export default class MenuIcon {
  icons = GetIconDb()
  colors = GetIconColorDb()

  constructor(parent: HTMLElement, {
    text = "300", icon = Icons.Save,
    iconEnable = true, iconWidth = "70%",
    boxEnable = false, circleEnable = false, width = "50px", height = "50px", rounded = "10px",
    color = IconsColor.Blue
  } = {}) {
    const c = this.colors.get(color)
    const startColor = c ? c[0] : "";
    const endColor = c ? c[1] : "";

    const dom = document.createElement("div");
    dom.style.cursor = "pointer"
    dom.style.position = "relative"
    dom.style.width = width
    dom.style.height = height
    dom.onclick = () => {
      console.log("test")
    }
    let boxHtml = ""
    let iconHtml = ""
    if (boxEnable) {
      boxHtml = `<div class="rounded-gradient-box"></div>`
      this.applyDynamicStyle("menuIcon", getCSS(width, height, rounded, startColor, endColor))
    } else if (circleEnable) {
      boxHtml = `<div class="circle-icon"></div>`
      this.applyDynamicStyle("menuIcon", getCSS(width, height, rounded, startColor, endColor))
    }
    if (iconEnable) {
      iconHtml = `<img src="${this.icons.get(icon)}" style="width:${iconWidth}"><br>`
    }
    dom.innerHTML = `
      ${boxHtml}
      <!-- 텍스트를 SVG 위에 오버레이 -->
      <div class="icon-font gametext text-center mt-1">
        ${iconHtml}
        ${text}
      </div>`
    parent.appendChild(dom)

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

function getCSS(width: string, height: string, rounded: string, startColor: string, endColor: string) {
  return `.icon-font {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-family: coiny;
      }
      .circle-icon {
  width: ${width};
  height: ${height};
  border-radius: 50%;
  background: linear-gradient(to bottom, ${startColor}, ${endColor});
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(255, 255, 255, 0.5),
    inset 0 -2px 6px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, background 0.3s ease;
}

.circle-icon:hover {
  transform: scale(1.1);
  transition: all 0.3s ease; /* 부드러운 애니메이션 */
}

        .rounded-gradient-box {
            width: ${width}; /* 너비 */
                height: ${height}; /* 높이 */
                border-radius: ${rounded}; /* 모서리 둥글기 */
                background: linear-gradient(to bottom, ${startColor}, ${endColor}); /* 진한 노랑에서 일반 노랑으로 그라데이션 */
                box-shadow:
                0 4px 8px rgba(0, 0, 0, 0.2), /* 외곽 그림자 */
                inset 0 2px 4px rgba(255, 255, 255, 0.5), /* 내부 밝은 음영 */
                inset 0 -2px 6px rgba(0, 0, 0, 0.2); /* 내부 어두운 음영 */
                border: 1px solid rgba(0, 0, 0, 0.1); /* 외곽선 */
        }
            .rounded-gradient-box:hover {
                box-shadow:
                    0 6px 12px rgba(0, 0, 0, 0.3),
                inset 0 3px 6px rgba(255, 255, 255, 0.6),
                inset 0 -3px 8px rgba(0, 0, 0, 0.3);
                transform: translateY(-5px); /* 살짝 위로 올라가는 효과 */
                    transition: all 0.3s ease; /* 부드러운 애니메이션 */
            }`

}
