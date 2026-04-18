import { GUX } from "../gux"
import { Icons } from "../menuicons/icontypes"
import { GetIconDb } from "../icons/preicons"
import { CurrencyType } from "../../inventory/wallet"

/**
 * Individual status item (e.g., [icon] 100)
 * simplified for merged display
 */
export class StatusItem extends GUX {
    Dom = document.createElement("div")
    private textDom = document.createElement("span")
    private icons = GetIconDb()

    constructor(type: CurrencyType, icon: Icons | string, initialValue: number) {
        super()
        this.Dom.classList.add("d-flex", "align-items-center", "mx-1")
        this.Dom.style.pointerEvents = "auto"
        this.Dom.style.height = "100%"

        const iconUrl = typeof icon === 'number' ? this.icons.get(icon) : undefined
        if (iconUrl) {
            const img = document.createElement("img")
            img.src = iconUrl
            img.style.height = "16px"
            img.style.width = "16px"
            img.classList.add("me-1")
            this.Dom.appendChild(img)
        } else if (typeof icon === 'string') {
            const span = document.createElement("span")
            span.innerText = icon
            span.style.fontSize = "14px"
            // Emoji fallback font for better compatibility
            span.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif'
            span.classList.add("me-1")
            this.Dom.appendChild(span)
        }

        this.textDom.innerText = initialValue.toString()
        this.textDom.classList.add("gametext", "gfont")
        this.textDom.style.fontSize = "13px"
        this.textDom.style.color = "#ffffff"
        this.textDom.style.whiteSpace = "nowrap"
        this.Dom.appendChild(this.textDom)
    }

    update(value: number) {
        this.textDom.innerText = value.toString()
    }

    Show() {
        this.Dom.style.display = "flex"
        this.visible = true
    }

    Hide() {
        this.Dom.style.display = "none"
        this.visible = false
    }
}
