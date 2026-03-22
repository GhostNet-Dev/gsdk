import { GUX } from "../gux"
import { Icons } from "../menuicons/icontypes"
import { GetIconDb } from "../icons/preicons"
import { CurrencyType, WalletManager } from "../../inventory/wallet"

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

/**
 * Merged Top Status Bar (like Civilization, SimCity)
 */
export default class TopStatusBar extends GUX {
    Dom = document.createElement("div")
    private container = document.createElement("div")
    private items: Map<CurrencyType, StatusItem> = new Map()

    constructor(private parent: HTMLElement, private wallet: WalletManager) {
        super()
        this.setupContainer()
        this.initializeItems()
        this.registerListeners()
        this.parent.appendChild(this.Dom)
    }

    private setupContainer() {
        this.Dom.id = "top-status-bar"
        this.Dom.classList.add("d-flex", "justify-content-center", "w-100")
        this.Dom.style.position = "absolute"
        this.Dom.style.top = "5px"
        this.Dom.style.left = "0"
        this.Dom.style.zIndex = "1000"
        this.Dom.style.pointerEvents = "none"

        // Merged container style with wrap support
        this.container.classList.add("d-flex", "flex-wrap", "justify-content-center", "align-items-center", "px-2", "py-1", "rounded-pill")
        this.container.style.backgroundColor = "rgba(0, 0, 0, 0.6)"
        this.container.style.border = "1px solid rgba(255, 255, 255, 0.2)"
        this.container.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.5)"
        this.container.style.pointerEvents = "auto"
        this.container.style.backdropFilter = "blur(4px)"
        this.container.style.maxWidth = "95vw" // Prevent horizontal scroll
        this.container.style.gap = "4px" // Modern spacing
        
        this.Dom.appendChild(this.container)

        // Inject responsive CSS
        this.applyDynamicStyle("top-status-bar-style", `
            #top-status-bar .rounded-pill {
                transition: all 0.3s ease;
            }
            @media (max-width: 600px) {
                #top-status-bar .gametext {
                    font-size: 11px !important;
                }
                #top-status-bar img {
                    height: 14px !important;
                    width: 14px !important;
                }
                #top-status-bar .mx-1 {
                    margin-left: 2px !important;
                    margin-right: 2px !important;
                }
                #top-status-bar .status-divider {
                    margin: 0 4px !important;
                }
            }
        `)
    }

    private initializeItems() {
        const config = [
            { type: CurrencyType.Gold, icon: Icons.Coin },
            { type: CurrencyType.Materials, icon: Icons.Beam },
            { type: CurrencyType.Gems, icon: Icons.Diamond },
            { type: CurrencyType.Wood, icon: "🌲" },
            { type: CurrencyType.Water, icon: "💧" },
            { type: CurrencyType.Electric, icon: Icons.Lightning },
            { type: CurrencyType.Food, icon: Icons.Apple },
            { type: CurrencyType.People, icon: Icons.Multi },
        ]

        config.forEach((cfg, index) => {
            const item = new StatusItem(cfg.type, cfg.icon, this.wallet.getAmount(cfg.type))
            this.items.set(cfg.type, item)
            this.container.appendChild(item.Dom)

            // Add divider except for the last item
            if (index < config.length - 1) {
                const divider = document.createElement("div")
                divider.classList.add("status-divider")
                divider.style.width = "1px"
                divider.style.height = "12px"
                divider.style.backgroundColor = "rgba(255, 255, 255, 0.2)"
                divider.style.margin = "0 8px"
                this.container.appendChild(divider)
            }
        })
    }

    private registerListeners() {
        this.wallet.addListener((type, newValue) => {
            const item = this.items.get(type)
            if (item) {
                item.update(newValue)
            }
        })
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
