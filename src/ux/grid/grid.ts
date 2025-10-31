import { GUX, IGUX } from "../gux";


export class Grid extends GUX {
    Dom: HTMLElement = document.createElement("div");
    vertical = false
    child: {
        ui: IGUX
        rowClassList?: string[]
        colClassList?: string[]
    }[] = []
    padding = "p-0"
    margin = "m-0"
    constructor({ vertical = false, padding = "p-1", margin = "m-1" } = {}) {
        super();
        this.vertical = vertical
        this.padding = padding
        this.margin = margin
    }
    Show(): void {
        this.Dom.style.display = "block"
    }
    Hide(): void {
        this.Dom.style.display = "none"
    }
    RenderHTML(): void {
        this.Dom.classList.add("container", this.padding, this.margin)
        const row = document.createElement("div")
        row.classList.add("row", "m-0", "flex-nowrap")
        this.child.forEach(element => {
            const dom = document.createElement("div")
            dom.classList.add("col", ...element.colClassList ?? "")
            dom.appendChild(element.ui.Dom)
            element.ui.RenderHTML?.()

            if (this.vertical) {
                const vrow = document.createElement("div")
                vrow.classList.add("row", ...element.rowClassList ?? "")
                vrow.appendChild(dom)
                this.Dom.appendChild(vrow)
            } else {
                row.appendChild(dom)
            }
        })
        this.Dom.appendChild(row)
    }
    AddChild(dom: IGUX, { rowClassList = ["p-0", "m-0"], colClassList = ["p-0", "m-0"] } = {}): void {
        this.child.push({ ui: dom, rowClassList, colClassList })
    }
    AddChildDom(dom: HTMLElement) {
        const col = document.createElement("div")
        col.classList.add("col")
        col.appendChild(dom)
        this.Dom.appendChild(col)
    }
    dispose(): void {
        // 1. 모든 자식 UI 요소의 dispose 함수를 호출합니다.
        this.child.forEach(element => {
            // 자식에게 dispose 함수가 있는지 확인하고 호출합니다.
            if (typeof (element.ui as any).dispose === 'function') {
                (element.ui as any).dispose();
            }
        });

        // 2. 자식 배열을 비워 참조를 제거합니다.
        this.child = [];

        // 3. Grid가 생성한 DOM 내부를 비웁니다.
        this.Dom.innerHTML = '';

        // 4. Grid의 DOM 요소 자체를 부모로부터 제거합니다.
        // this.Dom.parentElement?.removeChild(this.Dom);
    }
}