import { Icons, IconsColor } from "./icontypes";
import { GetIconColorDb, GetIconDb } from "./preicons"

/*
yellow: startColor = "#FFC107", endColor = "#FFF176"
blue:  startColor = "#0D47A1", endColor = "#2196F3"
*/

export default class MenuIcon {
  icons = GetIconDb()
  colors = GetIconColorDb()
  dom = document.createElement("div");

  constructor({
    text = "", icon = Icons.Save,
    iconEnable = true, iconWidth = "60%",
    boxEnable = false, circleEnable = false, boxWidth = "50px", boxheight = "50px",
    width = "50px", height = "50px", rounded = "10px",
    color = IconsColor.Blue, lolli = false, click = () => {}
  } = {}) {
    const c = this.colors.get(color)
    const startColor = c ? c[0] : "";
    const endColor = c ? c[1] : "";
    const lolliColor = c ? c[2] : "";

    this.dom.style.cursor = "pointer"
    this.dom.style.position = "relative"
    this.dom.style.width = boxWidth
    this.dom.style.height = boxheight
    this.dom.onclick = () => {
      click()
    }
    this.dom.addEventListener("click", (e) => { e.stopPropagation() })
    let boxHtml = ""
    let iconHtml = ""
    let lolliHtml = ""
    let textHtml = ""

    if (lolli) {
      lolliHtml = ` lolli lolli-${lolliColor}" style="width:${boxWidth};height:${boxheight};"`
    } else {
      lolliHtml = `" style="background: linear-gradient(to bottom, ${startColor}, ${endColor});width:${boxWidth};height:${boxheight};"`
    }

    if (boxEnable) {
      boxHtml = `<div class="rounded-gradient-box${lolliHtml}></div>`
    } else if (circleEnable) {
      boxHtml = `<div class="circle-icon${lolliHtml}></div>`
    } 
    this.applyDynamicStyle("menuIcon", getCSS(width, height, rounded))
    
    let textPosition = ""
    if (iconEnable) {
      iconHtml = `<div class="icon-img">
          <img src="${this.icons.get(icon)}" style="position:relative;left:50%;width:${iconWidth};${(!text.length)?
            "top:50%;transform: translate(-50%, -50%);":"transform: translate(-50%, 0%);"}">
          </div>`
      textPosition = `style="bottom:0px"`
    }
    if (text.length > 0) {
      textHtml = `
      <!-- 텍스트를 SVG 위에 오버레이 -->
      <div class="icon-font gametext text-center" ${textPosition}>
        ${text}
      </div>
      `
    }
    this.dom.innerHTML = `
      ${boxHtml}
      ${iconHtml}
      ${textHtml}
      `
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

function getCSS(width: string, height: string, rounded: string) {
  return `
  .icon-img {
      position: absolute;
      width: ${width};
      height: ${height};
      top:0px;
      left:50%;
      transform: translate(-50%, 0%);
  }
  .icon-font {
      position: absolute;
      left: 50%;
      transform: translate(-50%, 0%);
      text-align: center;
      font-family: coiny;
  }
  .circle-icon {
      border-radius: 50%;
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
  .circle-icon:active {
      transform: translateY(5px); /* 살짝 아래로 올라가는 효과 */
          transition: all 0.3s ease; /* 부드러운 애니메이션 */
  }

  .rounded-gradient-box {
          border-radius: ${rounded}; /* 모서리 둥글기 */
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
  }
  .lolli {
      /*Lollipop background gradient*/
      background-image: linear-gradient(
          -45deg,
          rgba(255, 255, 255, .2) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, .2) 50%,
          rgba(255, 255, 255, .2) 75%,
          transparent 75%,
          transparent
      );

      background-size: 30px 30px;
      animation: move 2s linear infinite;
      box-shadow:
          0 6px 12px rgba(0, 0, 0, 0.3),
      inset 0 3px 6px rgba(255, 255, 255, 0.6),
      inset 0 -3px 8px rgba(0, 0, 0, 0.3);
      transition: width 2s ease-out;
  }
  .lolli-blue {
    background-color: #0D47A1;
  }
  .lolli-yellow {
    background-color: #FFC107;
  }

  /*Lollipop background gradient animation*/
  @keyframes move {
    0% {
        background-position: 0 0;
    }
    100% {
        background-position: 30px 30px;
    }
  }
    
    `

}
