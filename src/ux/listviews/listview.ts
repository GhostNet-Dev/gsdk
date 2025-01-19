import { IUiItem } from "@Glibs/interface/idialog"


export default class ListView implements IUiItem {
    dom = document.createElement("div")
    row = document.createElement("div")
    padding = ""
    child: IUiItem[] = []

    constructor({ height = "300px", bgColor = "#141827", padding = "p-0" } = {}) {
        this.padding = padding
        this.dom.classList.add("container", "rounded", "overflow-auto")
        this.dom.style.backgroundColor = bgColor
        this.dom.style.height = height
        this.row.classList.add("row")
        this.dom.appendChild(this.row)

        const observer = new IntersectionObserver((e) => {
            e.forEach(element => {
                if (element.isIntersecting) {
                    const dom = element.target
                    this.SendEvent(dom.getBoundingClientRect().width)
                }
            });
        })
        observer.observe(this.dom)
        window.addEventListener("resize", () => { 
            this.SendEvent(this.dom.getBoundingClientRect().width) 
        })
    }
    render(width: number): void {
       this.SendEvent(this.dom.getBoundingClientRect().width) 
    }
    SendEvent(width: number) {
        this.child.forEach((e) => {
            e.render(width)
        })
    }
    addChild(dom: IUiItem) {
        const col = document.createElement("div")
        col.classList.add("col", this.padding)
        col.appendChild(dom.dom)
        this.row.appendChild(col)
        this.child.push(dom)
    }
}