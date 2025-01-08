import MenuItem from "./menuitem"

export default class TitleScreen {
    color: string
    fontFamiliy: string
    dom?: HTMLDivElement
    constructor(
        private title:string,
        private menuItem: MenuItem[] = [],
        {
            color = "#fff",
            fontFamiliy = "Modak"
        } = {}
    ) { 
        this.color = color
        this.fontFamiliy = fontFamiliy

    }
    Dispose() {
        if (this.dom) {
            this.dom.remove()
            if (this.dom.hasChildNodes()) {
                this.dom.replaceChildren()
            }
        }
    }
    SubMenuShow(menuItem: MenuItem[]) {
        const container = document.createElement("div")
        container.classList.add("container", "pt-5", "menuFont")
        menuItem.forEach((d) => {
            const row = document.createElement("div")
            row.classList.add("row")
            const col = document.createElement("div")
            col.classList.add("col")
            d.RenderHTML(col)
            row.appendChild(col)
            container.appendChild(row)
        })
        this.dom?.replaceChildren(container)
    }
    RenderHTML() {
        this.dom = document.createElement("div") as HTMLDivElement
        this.dom.className = "titleFont"
        this.dom.classList.add("gametext", "text-center", "titleLayout")
        this.dom.innerHTML = this.rainbowText(this.title)
        this.addDynamicStyle(`
.titleLayout {
    position: absolute;
    font-size: xxx-large;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${this.color};
}
.titleFont {
    font-family: "${this.fontFamiliy}", serif;
    font-weight: 400;
    font-style: normal;
    line-height: 1;
}
.menuFont {
    line-height: 1.5;
    white-space: nowrap;
}
        `)
        const container = document.createElement("div")
        container.classList.add("container", "pt-5", "menuFont")
        this.menuItem.forEach((d) => {
            const row = document.createElement("div")
            row.classList.add("row")
            const col = document.createElement("div")
            col.classList.add("col")
            d.RenderHTML(col)
            row.appendChild(col)
            container.appendChild(row)
        })
        this.dom.appendChild(container)
        document.body.appendChild(this.dom)
    }
    rainbowText(input: string): string {
        const rainbowColors: string[] = [
            "#FF0000", // 빨강
            "#FF7F00", // 주황
            "#FFFF00", // 노랑
            "#00FF00", // 초록
            "#0000FF", // 파랑
            "#4B0082", // 남색
            "#8B00FF"  // 보라
        ];

        let colorIndex = 0; // 색상 인덱스
        const output = input.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
            if (tag) {
                // 태그는 그대로 반환
                return tag;
            } else if (text) {
                // 텍스트에만 색상 적용
                return text
                .split("") // 텍스트를 문자 배열로 변환
                .map((char: any) => {
                    const color = rainbowColors[colorIndex % rainbowColors.length];
                    colorIndex++; // 다음 문자로 넘어갈 때 색상 인덱스 증가
                    return `<span style="color: ${color}">${char}</span>`;
                })
                .join(""); // 변환된 문자들을 하나의 문자열로 결합
            }
            return match;
        });

        return output;
    }
    addDynamicStyle(css: string): void {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = css;
        document.head.appendChild(style);
    }
}
