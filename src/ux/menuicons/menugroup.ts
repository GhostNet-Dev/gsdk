import MenuIcon from "./menuicon";

export interface IMenuItem {
    dom: HTMLElement
}


export default class MenuGroup {
    dom = document.createElement("div")
    row?: HTMLDivElement
    vertical = false
    center = false
    interpadding = "p-1"
    constructor(parent: HTMLElement, {
        top = "", left = "", right = "", bottom = "", margin = "m-0",
        vertical = false, center = false, opacity = "", interpadding = "p-1",
        height = ""
    } = {}) {
        this.vertical = vertical
        this.center = center
        this.interpadding = interpadding
        this.dom.classList.add("container", "w-auto", "rounded", "p-1", margin)

        this.dom.style.backgroundColor = `rgba(0, 0, 0, ${opacity.length > 0 ? opacity: ""})`
        this.dom.style.boxShadow = `0 4px 8px rgba(0, 0, 0, ${opacity.length > 0 ? opacity: ""})`
        this.dom.style.overflow = "hidden"
        this.dom.style.position = "absolute"
        if (height.length > 0) this.dom.style.height = height

        if (top.length > 0) this.dom.style.top = top
        if (left.length > 0) this.dom.style.left = left
        if (right.length > 0) this.dom.style.right = right
        if (bottom.length > 0) this.dom.style.bottom = bottom

        parent.appendChild(this.dom)
        if (!vertical) {
            this.row = document.createElement("div")
            this.row.classList.add("row", this.interpadding, "h-100")
            this.dom.appendChild(this.row)
        }
    }
    addMenu(menu: IMenuItem) {
        const col = document.createElement("div")
        col.classList.add("col", "p-0", "ps-1", "pe-1", "h-100")
        col.appendChild(menu.dom)
        if(!this.vertical && this.row) {
            this.row.appendChild(col)
            return
        }
        const row = document.createElement("div")
        row.classList.add("row", this.interpadding)
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
  //border-radius: 20px;       /* 모서리 둥글게 */