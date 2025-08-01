import { GUX, IGUX } from "../gux";


export class Grid extends GUX {
    Dom: HTMLElement = document.createElement("div");
    vertical = false
    child: IGUX[] = []
    padding = "p-1"
    margin = "m-1"
    constructor({ vertical = false, padding = "p-1", margin = "m-1" } = {}) {
        super();
        this.vertical = vertical
        this.padding = padding
        this.margin = margin
    }
    Show(): void {
        this.Dom.style.display = "block"
    }
    Hide(): void {
        this.Dom.style.display = "none"
    }
    RenderHTML(): void {
        this.Dom.classList.add("container", this.padding, this.margin)
        const row = document.createElement("div")
        row.classList.add("row")
        this.child.forEach(element => {
            const dom = document.createElement("div")
            dom.classList.add("col")
            dom.appendChild(element.Dom)

            if (this.vertical) {
                const vrow = document.createElement("div")
                vrow.classList.add("row")
                vrow.appendChild(dom)
                this.Dom.appendChild(vrow)
            } else {
                row.appendChild(dom)
            }
        })
        this.Dom.appendChild(row)
    }
    AddChild(dom: IGUX): void {
        this.child.push(dom)
    }
    AddChildDom(dom: HTMLElement) {
        const col = document.createElement("div")
        col.classList.add("col")
        col.appendChild(dom)
        this.Dom.appendChild(col)
    }
}