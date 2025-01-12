import MenuIcon from "./menuicon";


export default class MenuGroup {
    dom = document.createElement("div")
    row?: HTMLDivElement
    vertical = false
    center = false
    constructor(parent: HTMLElement, {
        top = "", left = "", right = "", bottom = "", margin = "m-1",
        vertical = false, center = false, opacity = ""
    } = {}) {
        this.vertical = vertical
        this.center = center
        this.dom.classList.add("container", "w-auto", "rounded", "rounded-translucent-box", "p-1", margin)
        this.applyDynamicStyle("menugroup", getCSS(top, left, right, bottom, opacity))
        parent.appendChild(this.dom)
        if (!vertical) {
            this.row = document.createElement("div")
            this.row.classList.add("row", "p-1")
            this.dom.appendChild(this.row)
        }
    }
    addMenu(menu: MenuIcon) {
        const col = document.createElement("div")
        col.classList.add("col")
        col.appendChild(menu.dom)
        if(!this.vertical && this.row) {
            this.row.appendChild(col)
            return
        }
        const row = document.createElement("div")
        row.classList.add("row", "p-1")
        row.appendChild(col)
        this.dom.appendChild(row)
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

function getCSS(top:string, left:string, right:string, bottom: string, opacity: string) {
    return `
    .rounded-translucent-box {
        position:absolute;
        ${top.length > 0 ? "top:" + top +";": ""}
        ${left.length > 0 ? "left:" + left +";": ""}
        ${right.length > 0 ? "right:" + right +";": ""}
        ${bottom.length > 0 ? "bottom:" + bottom +";": ""}
  background-color: rgba(0, 0, 0, ${opacity.length > 0 ? opacity: ""}); /* 반투명 검정색 */
  align-items: center;       /* 수직 가운데 정렬 */
  justify-content: center;   /* 수평 가운데 정렬 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* 살짝 입체감 */
}
    `
}

  //border-radius: 20px;       /* 모서리 둥글게 */