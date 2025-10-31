import LolliBar from "../progress/lollibar"
import { Icons } from "./icontypes"
import { GetIconColorDb, GetIconDb } from "../icons/preicons"
import { GUX } from "../gux"

export default class StatusBar extends GUX {
    Dom = document.createElement("div")
    icons = GetIconDb()
    colors = GetIconColorDb()
    textDom = document.createElement('span') as HTMLSpanElement
    max = 0
    lbar?: LolliBar

    constructor({ type = "hp", max = 0, cur = 50, bgOpacity = "0.5",
        icon = Icons.Save, plusIcon = false, iconSize = "", height = "100%",
        lolliBar = false, fontFamily = "",
        click = () => { }
    } = {}) {
        super()
        this.max = max
        this.Dom.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`
        this.Dom.style.borderRadius = "30px"
        this.Dom.onclick = () => { click() }
        this.Dom.classList.add("h-100")
        this.Dom.setAttribute("role", "presentation")
        
        // Icon set
        const iconDom = document.createElement('img') as HTMLImageElement
        iconDom.src = this.icons.get(icon)!
        iconDom.classList.add("h-100")
        if (iconSize.length > 0) iconDom.style.width = iconSize
        const content: HTMLElement[] = [iconDom]

        // value set
        if (lolliBar) {
            this.lbar = new LolliBar(this.Dom, { width: "60px", initValue: cur / max })
            this.lbar.RenderHTML()
            content.push(this.lbar.dom!)
        } else {
            let vText = cur.toString()
            if (this.max > 0) vText += "/" + this.max
            this.textDom.innerText = vText
            this.textDom.classList.add("gametext", "pe-2", "gfont")
            if (fontFamily.length > 0) this.textDom.style.fontFamily = fontFamily
            content.push(this.textDom)
        }

        // Plus Set
        if (plusIcon) {
            const plusDom = document.createElement('img') as HTMLImageElement
            plusDom.src = this.icons.get(Icons.Plus)!
            plusDom.classList.add("h-100")
            content.push(plusDom)
        }

        // Make Container
        const container = document.createElement('div')
        container.classList.add("container")
        container.style.height = height
        const row = document.createElement('div')
        row.classList.add("row", "p-0", "h-100", "flex-nowrap")
        container.appendChild(row)

        content.forEach((item) => {
            const col = document.createElement('div')
            col.classList.add("col", "p-0", "h-100")
            col.appendChild(item)
            row.appendChild(col)
        })

        this.Dom.appendChild(container)
    }
    UpdateStatus(value: number) {
        if(this.lbar) {
            this.lbar.updateValue(value, this.max)
            return
        }
        let text = value.toString()
        if (this.max > 0) text += "/" + this.max
        this.textDom.innerText = text
    }
    Show(): void { }
    Hide(): void { }
}