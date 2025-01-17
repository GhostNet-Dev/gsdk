import { Icons } from "./icontypes"
import { GetIconColorDb, GetIconDb } from "./preicons"

export default class StatusBar {
    dom = document.createElement("div")
    icons = GetIconDb()
    colors = GetIconColorDb()
    textDom = document.createElement('span') as HTMLSpanElement
    max = 0

    constructor({ text = "", min = 0, max = 0, value = 100, bgOpacity = "0.5",
        icon = Icons.Save, plusIcon = false, iconSize = "", height = "100%",
        click = () => { }
    } = {}) {
        this.max = max
        this.dom.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`
        this.dom.style.borderRadius = "30px"
        this.dom.onclick = () => { click() }
        this.dom.classList.add("h-100")
        
        // Icon set
        const iconDom = document.createElement('img') as HTMLImageElement
        iconDom.src = this.icons.get(icon)!
        iconDom.classList.add("h-100")
        if (iconSize.length > 0) iconDom.style.width = iconSize

        // value set
        let vText = value.toString()
        if (this.max > 0) vText += "/" + this.max
        this.textDom.innerText = vText
        this.textDom.classList.add("gametext", "pe-2")

        const content = [iconDom, this.textDom]
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

        this.dom.appendChild(container)
    }
    UpdateStatus(value: number) {
        let text = value.toString()
        if (this.max > 0) text += "/" + this.max
        this.textDom.innerText = text
    }
}