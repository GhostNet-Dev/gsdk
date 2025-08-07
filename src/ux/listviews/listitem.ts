import { IUiItem } from "@Glibs/interface/idialog";
import { Icons } from "../menuicons/icontypes";
import { GetIconDb } from "../icons/preicons";
import { GUX, IGUX } from "../gux";

export default class ListItem extends GUX {
    Dom = document.createElement("div")
    icons = GetIconDb()

    constructor({ 
        icon = Icons.Star, customIcon = "", fontSize = "16px", 
        text = "list test", height = "40px", click = () => { }
    } = {}, btnDom?: HTMLButtonElement) {
        super()
        this.Dom.classList.add("container", "rounded", "gfont")
        this.Dom.style.cursor = "pointer"
        this.Dom.style.background = "linear-gradient(to bottom, #4caf50, #388e3c)"
        this.Dom.style.fontSize = fontSize
        //this.dom.style.borderRadius = "8px"
        this.Dom.style.boxShadow = "0 4px #2e7d32, 0 1px 4px rgba(0, 0, 0, 0.2)"
        this.Dom.style.height = height
        this.Dom.onclick = () => { click() }

        // Icon set
        const iconDom = document.createElement('img') as HTMLImageElement
        iconDom.src = (customIcon.length > 0) ? customIcon : this.icons.get(icon)!
        iconDom.classList.add("h-100", "p-2")

        // value set
        const textDom = document.createElement('div') as HTMLDivElement
        textDom.innerText = text
        textDom.classList.add("gametext", "p-1", "gfont")
        
        const content: HTMLElement[] = [iconDom, textDom]
        // button
        if(btnDom) content.push(btnDom)

        // Make Container
        const row = document.createElement('div')
        row.classList.add("row", "p-0", "flex-nowrap", "h-100")
        this.Dom.appendChild(row)

        content.forEach((item) => {
            const col = document.createElement('div')
            col.classList.add("col-auto", "p-0", "h-100")
            col.appendChild(item)
            row.appendChild(col)
        })
    }
    RenderHTML(width: number): void {
        
    }
    Show(): void {
        
    }
    Hide(): void {
        
    }
    AddChild(dom: IGUX): void {
        
    }
}
`
            background: linear-gradient(145deg, rgba(255, 224, 102, 0.9), rgba(255, 200, 0, 0.9)); /* 투명 젤리 효과 */
            border-radius: 25px; /* 더 둥글게 */
            box-shadow: inset -4px -4px 10px rgba(255, 190, 0, 1), inset 4px 4px 10px rgba(255, 190, 0, 1), 4px 4px 10px rgba(0, 0, 0, 0.2); /* 젤리 입체감 */
            text-align: center;
            animation: pop 0.6s ease-out; /* 팡 튀어나오는 애니메이션 */
            `
function getCSS() {
    return `
.listitem {
  outline: none;
  border:none;
  cursor: pointer;
  display: block;
  position: relative;
  background-color: #fcad26;
  font-size: 16px;
  font-weight: 300px;
  color: white;
  text-transform: uppercase;
  letter-spacing: 2px;
  padding: 25px 80px;
  margin: 0 auto;
  border-radius: 20px;
  box-shadow: 0 6px #efa424;
}
    `
}
