import { GetIconDb } from "../icons/preicons"
import { Icons } from "@Glibs/types/icontypes"
import { GUX, IGUX } from "../gux"
import { IconProperty } from "@Glibs/types/iconstypes"


export default class Slot extends GUX {
    icons = GetIconDb()

    Dom = document.createElement("div")
    iconDom = document.createElement('img') as HTMLImageElement
    constructor({ width = "50px", icon = Icons.None, iconPath = "", click = () => { } } = {}) {
        super()
        this.Dom.style.width = width
        this.Dom.style.height = width
        this.Dom.style.borderRadius = "8px"
        this.Dom.style.justifyContent = "center"
        this.Dom.style.alignItems = "center"
        this.Dom.style.transition = "transform 0.2s, box-shadow 0.2s"

        this.Dom.style.background = "linear-gradient(145deg, #0b3d91, #1e90ff)"
        this.Dom.style.border = "3px solid rgba(135, 206, 250, 0.8)"
        this.Dom.classList.add("m-1", "mb-0")
        this.Dom.onclick = () => { click() }

        const path = (iconPath.length > 0) ? iconPath : this.icons.get(icon) 
        if (path) {
            this.iconDom.src = path
            this.iconDom.classList.add("h-100")
        }
        this.Dom.appendChild(this.iconDom)
    }
    ChangeIcon(icon: IconProperty): void {
        this.iconDom.src = icon.path
        this.iconDom.classList.add("h-100")
    }
    RenderHTML(width: number): void {
        const maxPerRow = Math.floor((width * 0.8) / 40)
        const size = Math.max(40, Math.min(60, (width / maxPerRow) * 0.85))
        console.log(width, maxPerRow, size, this.Dom.offsetLeft, this.Dom.offsetTop)
        if(this.Dom.offsetLeft >= width - size) {
            this.Dom.classList.remove("me-0")
            this.Dom.classList.add("me-1")
            console.log("me-1", width - size, this.Dom.offsetLeft)
        } else {
            this.Dom.classList.remove("me-1")
            this.Dom.classList.add("me-0")
            console.log("me-0", width - size, this.Dom.offsetLeft)
        }
        this.Dom.style.width = size + "px"
        this.Dom.style.height = size + "px"
    }
    Show(): void {
        
    }
    Hide(): void {
        
    }
    AddChild(dom: IGUX): void {
        
    }
}

/*
테마	배경색 1 (진한 색)	배경색 2 (밝은 색)	테두리색 (RGBA)
파란색	#0B3D91	#1E90FF	rgba(135, 206, 250, 0.8)
녹색	#006400	#32CD32	rgba(144, 238, 144, 0.8)
빨강	#8B0000	#FF6347	rgba(255, 160, 122, 0.8)
노랑	#B8860B	#FFD700	rgba(255, 239, 134, 0.8)
 */
const css = `

/* 슬롯 기본 스타일 */
.slot {
    width: 80px;
    height: 80px;
    border-radius: 8px; /* 둥근 모서리 */
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 0.2s, box-shadow 0.2s; /* 호버 효과 */
}

/* 1. 기본 디자인 */
.standard-slot {
    background: linear-gradient(145deg, #0b3d91, #1e90ff); /* 진한 파랑에서 밝은 파랑 */
    border: 2px solid #1c6ea4; /* 파란 테두리 */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); /* 입체감을 위한 그림자 */
}

/* 2. 입체감 강조 디자인 */
/* 입체감 강조 디자인 슬롯 */
.embossed-slot {
    background: linear-gradient(145deg, #0b3d91, #1e90ff); /* 동일한 배경 */
    border: 2px solid #1c6ea4; /* 기본 테두리 */
    box-shadow: 
        inset 2px 2px 4px rgba(0, 0, 0, 0.8), /* 안쪽 음영 */
        inset -2px -2px 4px rgba(255, 255, 255, 0.3), /* 안쪽 빛 */
        0 4px 8px rgba(0, 0, 0, 0.5); /* 외부 그림자 */
}

/* 3. 밝은 테두리 강조 디자인 */
.bright-border-slot {
    background: linear-gradient(145deg, #0b3d91, #1e90ff); /* 동일한 배경 */
    border: 3px solid rgba(135, 206, 250, 0.8); /* 밝은 파란색 테두리 */
}
`
