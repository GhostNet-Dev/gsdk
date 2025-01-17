

export default class ListView {
    dom = document.createElement("div")
    row = document.createElement("div")

    constructor({ bgColor = "#f8f9fa" } = {}) {
        this.dom.classList.add("container", "rounded", "overflow-auto")
        this.dom.style.backgroundColor = bgColor
        this.dom.style.height = "300px"
        this.row.classList.add("row")
        this.dom.appendChild(this.row)
    }
    addChild(dom: HTMLElement) {
        const col = document.createElement("div")
        col.classList.add("col", "p-1")
        col.appendChild(dom)
        this.row.appendChild(col)
    }
}