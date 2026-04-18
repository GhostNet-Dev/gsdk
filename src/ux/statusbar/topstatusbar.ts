import { CurrencyType, WalletManager } from "@Glibs/inventory/wallet"
import { GUX } from "../gux"
import { StatusItem } from "./statusbar"
import { Icons } from "@Glibs/types/icontypes"

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
        this.Hide()
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
