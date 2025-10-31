import { GUX, IGUX } from "../gux"


export default class MenuGroup extends GUX {
    Dom = document.createElement("div")
    row?: HTMLDivElement
    vertical = false
    center = false
    interpadding = 1
    nowrap: boolean
    constructor(private parent: HTMLElement, {
        top = "", left = "", right = "", bottom = "", margin = "m-1",
        vertical = false, center = false, opacity = "", interpadding = 1,
        height = "", nowrap = false, width = ""
    } = {}) {
        super()
        this.vertical = vertical
        this.center = center
        this.nowrap = nowrap
        this.interpadding = interpadding
        this.Dom.classList.add("container", "w-auto", "rounded", "p-1", margin)

        this.Dom.style.backgroundColor = `rgba(0, 0, 0, ${opacity.length > 0 ? opacity: ""})`
        this.Dom.style.boxShadow = `0 4px 8px rgba(0, 0, 0, ${opacity.length > 0 ? opacity: ""})`
        this.Dom.style.overflow = "hidden"
        this.Dom.style.position = "absolute"
        if(width.length > 0) this.Dom.style.width = width
        if (height.length > 0) this.Dom.style.height = height

        if (top.length > 0) this.Dom.style.top = top
        if (left.length > 0) this.Dom.style.left = left
        if (right.length > 0) this.Dom.style.right = right
        if (bottom.length > 0) this.Dom.style.bottom = bottom

        if (!vertical) {
            this.row = document.createElement("div")
            this.row.classList.add("row", "p-" + this.interpadding, "h-100")
            if (nowrap) this.row.classList.add("flex-nowrap")
            this.Dom.appendChild(this.row)
        }
        this.parent.appendChild(this.Dom)
        this.Dom.style.display = "none"
    }
    Show() {
        this.Dom.style.display = "block"
    }
    Hide() {
        this.Dom.style.display = "none"
    }
    AddChild(dom: IGUX, ...param: any): void { 
        this.addMenu(dom)
    }
    addMenu(menu: IGUX) {
        const col = document.createElement("div")
        col.classList.add("col", "p-0", "ps-" + this.interpadding, "pe-" + this.interpadding, "h-100")
        col.appendChild(menu.Dom)
        if(!this.vertical && this.row) {
            this.row.appendChild(col)
            return menu
        }
        const row = document.createElement("div")
        row.classList.add("row", "p-" + this.interpadding)
        if (this.nowrap) row.classList.add("flex-nowrap")
        row.appendChild(col)
        this.Dom.appendChild(row)
        return menu
    }
}
  //border-radius: 20px;       /* 모서리 둥글게 */