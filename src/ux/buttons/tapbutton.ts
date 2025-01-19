import { gsap } from "gsap"

export default class TapButton {
    dom = document.createElement("div")
    textDom = document.createElement("div")
    contentCol = document.createElement("div")
    open: Function
    close: Function

    constructor(
        private parent: HTMLElement, 
        { opacity = "0.5", content = "Tap to continue", open = () => {}, close = () => {}, click = () => {} } = {}
    ) {
        this.open = open
        this.close = close
        this.dom.style.position = "absolute"
        this.dom.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`
        this.dom.style.top = "0"
        this.dom.style.left = "0"
        this.dom.style.width = "100%"
        this.dom.style.height = "100%"
        // if(topDom) {
        //     const index = Number(topDom.style.zIndex)
        //     this.dom.style.zIndex = ((index > 0) ? index - 1 : 0).toString()
        // }
        this.dom.onclick = () => { click(); this.hide()}
        this.dom.addEventListener("click", (e) => { e.stopPropagation() })

        this.textDom.style.position = "relative"
        this.textDom.style.left = "50%"
        this.textDom.style.width = "fit-content"
        this.textDom.style.transform = "translate(-50%, -50%)"
        this.textDom.innerText = content
        this.textDom.classList.add("gametext")

        const container = document.createElement("div")
        container.classList.add("container", "p-2")
        container.style.height = "100%"
        const row1 = document.createElement("div")
        row1.classList.add("row", "m-0")
        row1.style.height ="80%"
        this.contentCol.classList.add("col", "d-flex", "align-items-center")
        row1.appendChild(this.contentCol)

        const row2 = document.createElement("div")
        row2.classList.add("row", "m-0")
        row2.style.height = "20%"
        const col = document.createElement("div")
        col.classList.add("col", "d-flex", "align-items-center")
        col.appendChild(this.textDom)
        row2.appendChild(col)
        container.appendChild(row1)
        container.appendChild(row2)

        this.dom.appendChild(container)
    }
    addChild(dom: HTMLElement) {
        dom.addEventListener("click", (e) => { e.stopPropagation() })
        this.contentCol.appendChild(dom)
    }
    ani?: gsap.core.Tween
    show() {
        this.parent.appendChild(this.dom)
        this.open()
        this.ani = gsap.fromTo(this.textDom, { opacity: 0 }, { opacity: 1, duration: 0.6, repeat: -1, yoyo: true, ease: "power2.out" })
    }
    async hide() {
        await this.close()
        this.ani?.kill()
        this.parent.removeChild(this.dom)
    }
}