import { GUX, IGUX } from "../gux"


export default class ListView extends GUX {
    Dom = document.createElement("div")
    row = document.createElement("div")
    padding = ""
    margin = ""
    child: IGUX[] = []

    constructor({ height = "300px", bgColor = "#141827", padding = "p-0", margin = "m-0" } = {}) {
        super()
        this.padding = padding
        this.margin = margin
        this.Dom.classList.add("container", "rounded", "overflow-auto")
        this.Dom.style.backgroundColor = bgColor
        this.Dom.style.height = height
        this.row.classList.add("row", "justify-content-start")
        this.Dom.appendChild(this.row)

        const observer = new IntersectionObserver((e) => {
            e.forEach(element => {
                if (element.isIntersecting) {
                    const dom = element.target
                    this.SendEvent(dom.getBoundingClientRect().width)
                }
            });
        })
        observer.observe(this.Dom)
        window.addEventListener("resize", () => { 
            this.SendEvent(this.Dom.getBoundingClientRect().width) 
        })
    }
    Show(): void {
        
    }
    Hide(): void {
        
    }
    RenderHTML(): void {
       this.SendEvent(this.Dom.getBoundingClientRect().width) 
    }
    SendEvent(width: number) {
        this.child.forEach((e) => {
            e.RenderHTML(width)
        })
    }
    AddChild(dom: IGUX) {
        const col = document.createElement("div")
        col.classList.add("col", this.padding, this.margin)
        col.appendChild(dom.Dom)
        this.row.appendChild(col)
        this.child.push(dom)
    }
}