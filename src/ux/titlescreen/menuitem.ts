

export default class MenuItem {
    color: string
    fontFamiliy: string
    constructor(
        private title:string,
        private clickEvent = () => { },
        {
            color = "#fff",
            fontFamiliy = "Modak",
        } = {}
    ) { 
        this.color = color
        this.fontFamiliy = fontFamiliy
    }
    RenderHTML(parent: HTMLElement) {
        const dom = document.createElement("div") as HTMLDivElement
        dom.classList.add("gametext", "text-center", "cursor", "menuFont")
        dom.innerText = this.title
        dom.onclick = () => { this.clickEvent() }
        this.addDynamicStyle(`
.menuFont {
    font-family: "${this.fontFamiliy}", serif;
    font-weight: 400;
    font-style: normal;
    font-size: x-large;
}
        `)
        parent.appendChild(dom)
    }
    addDynamicStyle(css: string): void {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = css;
        document.head.appendChild(style);
    }
}