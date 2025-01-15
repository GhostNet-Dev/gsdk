import { gsap } from "gsap"

export default class TapButton {
    dom = document.createElement("div")
    textDom = document.createElement("div")
    open: Function
    close: Function

    constructor(
        private parent: HTMLElement, 
        { opacity = "0.5", content = "Tap", open = () => {}, close = () => {}, click = () => {} } = {}
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

        this.textDom.style.position = "relative"
        this.textDom.style.top = "75%"
        this.textDom.style.left = "50%"
        this.textDom.style.width = "fit-content"
        this.textDom.style.transform = "translate(-50%, -50%)"
        this.textDom.innerText = content
        this.textDom.classList.add("gametext")

        this.dom.appendChild(this.textDom)
    }
    addChild(dom: HTMLElement) {
        dom.addEventListener("click", (e) => { e.stopPropagation() })
        this.dom.insertAdjacentElement("beforeend", dom)
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