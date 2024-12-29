import MenuItem from "./menuitem"

export default class TitleScreen {
    color: string
    fontFamiliy: string
    dom?: HTMLDivElement
    constructor(
        private title:string,
        private menuItem: MenuItem[] = [],
        {
            color = "#fff",
            fontFamiliy = "Modak"
        } = {}
    ) { 
        this.color = color
        this.fontFamiliy = fontFamiliy

    }
    Dispose() {
        if (this.dom) {
            this.dom.remove()
            if (this.dom.hasChildNodes()) {
                this.dom.replaceChildren()
            }
        }
    }
    RenderHTML() {
        this.dom = document.createElement("div") as HTMLDivElement
        this.dom.className = "titleFont"
        this.dom.classList.add("gametext", "text-center", "titleLayout")
        this.dom.innerText = this.title
        this.addDynamicStyle(`
.titleLayout {
    position: absolute;
    font-size: xxx-large;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${this.color};
}
.titleFont {
    font-family: "${this.fontFamiliy}", serif;
    font-weight: 400;
    font-style: normal;
}
        `)
        const container = document.createElement("div")
        container.classList.add("container", "pt-4")
        this.menuItem.forEach((d) => {
            const row = document.createElement("div")
            row.classList.add("row")
            const col = document.createElement("div")
            col.classList.add("col")
            d.RenderHTML(col)
            row.appendChild(col)
            container.appendChild(row)
        })
        this.dom.appendChild(container)
        document.body.appendChild(this.dom)
    }
    addDynamicStyle(css: string): void {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = css;
        document.head.appendChild(style);
    }
}
