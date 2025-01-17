import { Icons } from "../menuicons/icontypes";
import { GetIconDb } from "../menuicons/preicons";

export default class ListItem {
    dom = document.createElement("div")
    icons = GetIconDb()

    constructor({ 
        icon = Icons.Star, fontSize = "16px", 
        text = "list test", height = "40px", click = () => { }
    } = {}, btnDom?: HTMLButtonElement) {
        this.dom.classList.add("container", "rounded")
        this.dom.style.cursor = "pointer"
        this.dom.style.background = "linear-gradient(145deg, rgba(255, 224, 102, 0.9), rgba(255, 200, 0, 0.9))"
        this.dom.style.fontSize = fontSize
        //this.dom.style.borderRadius = "10px"
        this.dom.style.boxShadow = "inset -4px -4px 10px rgba(255, 190, 0, 1), inset 4px 4px 10px rgba(255, 190, 0, 1), 4px 4px 10px rgba(0, 0, 0, 0.2)"
        this.dom.style.height = height
        this.dom.onclick = () => { click() }

        // Icon set
        const iconDom = document.createElement('img') as HTMLImageElement
        iconDom.src = this.icons.get(icon)!
        iconDom.classList.add("h-100", "p-2")

        // value set
        const textDom = document.createElement('div') as HTMLDivElement
        textDom.innerText = text
        textDom.classList.add("gametext", "p-1")
        
        const content: HTMLElement[] = [iconDom, textDom]
        // button
        if(btnDom) content.push(btnDom)

        // Make Container
        const row = document.createElement('div')
        row.classList.add("row", "p-0", "flex-nowrap", "h-100")
        this.dom.appendChild(row)

        content.forEach((item) => {
            const col = document.createElement('div')
            col.classList.add("col-auto", "p-0", "h-100")
            col.appendChild(item)
            row.appendChild(col)
        })
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
