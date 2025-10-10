import { gsap } from "gsap"
import { GUX, IGUX, UxLayerIndex } from "../gux"

export default class TapButton extends GUX{
    Dom = document.createElement("div")
    textDom = document.createElement("div")
    contentCol = document.createElement("div")
    open: Function
    close: Function

    constructor(
        private parent: HTMLElement, 
        { 
            opacity = "0.5", content = "Tap to continue", fullScreen = false,
            open = () => { }, close = () => { }, click = () => { } } = {}
    ) {
        super()
        this.open = open
        this.close = close
        this.Dom.style.position = "absolute"
        this.Dom.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`
        this.Dom.style.top = "0"
        this.Dom.style.left = "0"
        this.Dom.style.width = "100%"
        this.Dom.style.height = "100%"
        this.Dom.style.zIndex = UxLayerIndex.Tap.toString()
        // if(topDom) {
        //     const index = Number(topDom.style.zIndex)
        //     this.dom.style.zIndex = ((index > 0) ? index - 1 : 0).toString()
        // }
        this.Dom.onclick = () => { if (fullScreen) this.toggleFullScreen(); click(); this.Hide() }
        this.Dom.addEventListener("click", (e) => { e.stopPropagation() })

        this.textDom.style.position = "relative"
        this.textDom.style.left = "50%"
        this.textDom.style.width = "fit-content"
        this.textDom.style.transform = "translate(-50%, -50%)"
        this.textDom.innerText = content
        this.textDom.classList.add("gametext", "gfont")

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

        this.Dom.appendChild(container)
    }
    RenderHTML(...param: any): void {
        
    }
    AddChild(dom: IGUX): void {
        this.AddChildDom(dom.Dom)
    }
    AddChildDom(dom: HTMLElement) {
        dom.addEventListener("click", (e) => { e.stopPropagation() })
        this.contentCol.appendChild(dom)
    }
    ani?: gsap.core.Tween
    Show() {
        this.parent.appendChild(this.Dom)
        this.open()
        this.ani = gsap.fromTo(this.textDom, { opacity: 0 }, { opacity: 1, duration: 0.6, repeat: -1, yoyo: true, ease: "power2.out" })
    }
    async Hide() {
        await this.close()
        this.ani?.kill()
        if (this.parent.contains(this.Dom)) this.parent.removeChild(this.Dom)
    }
    toggleFullScreen(): void {
        const doc = document.documentElement;

        if (!document.fullscreenElement) {
            if (doc.requestFullscreen) {
                doc.requestFullscreen();
            } else if ((doc as any).mozRequestFullScreen) { // Firefox
                (doc as any).mozRequestFullScreen();
            } else if ((doc as any).webkitRequestFullscreen) { // Chrome, Safari, Opera
                (doc as any).webkitRequestFullscreen();
            } else if ((doc as any).msRequestFullscreen) { // IE/Edge
                (doc as any).msRequestFullscreen();
            }
        }
    }
}
