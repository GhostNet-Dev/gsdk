import { GUX, IGUX } from "../gux";


export class GStack extends GUX {
    Dom: HTMLElement = document.createElement("div");
    child: {
        ui: IGUX
        classList?: string[]
    }[] = []
    padding = "p-1"
    margin = "m-1"
    constructor({ padding = "p-0", margin = "m-0" } = {}) {
        super();
        this.padding = padding
        this.margin = margin
        this.Dom.classList.add("container", this.padding, this.margin)
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    let maxHeight = 0
                    const maxWidth = this.Dom.offsetWidth
                    this.child.forEach(element => {
                        maxHeight = (maxHeight > element.ui.Dom.offsetHeight) ? maxHeight : element.ui.Dom.offsetHeight
                        element.ui.Dom.style.width = maxWidth + "px"
                    })
                    this.Dom.style.height = maxHeight + "px"
                    console.log('타겟 DOM이 뷰포트에 진입했습니다 (IntersectionObserver):', entry.target.id);
                    // 요소가 화면에 보일 때 수행할 작업
                    // 한 번만 실행하고 싶다면 observer.unobserve(entry.target);
                    observer.unobserve(entry.target);
                } 
            });
        }, {
            root: null, // 뷰포트를 기준으로 관찰 (기본값)
            threshold: 0.01 // 요소의 10%가 보일 때 콜백 실행
        });

        observer.observe(this.Dom);
    }
    Show(): void {
        this.Dom.style.display = "block"
    }
    Hide(): void {
        this.Dom.style.display = "none"
    }
    RenderHTML(): void {
        this.child.forEach(element => {
            element.ui.Dom.classList.add("position-absolute", ...element.classList ?? "")
            element.ui.RenderHTML?.()
            this.Dom.appendChild(element.ui.Dom)
        })
    }
    AddChild(dom: IGUX, classList?: string[]): void {
        this.child.push({ ui: dom, classList })
    }
    AddChildDom(dom: HTMLElement) {
        const col = document.createElement("div")
        col.classList.add("col")
        col.appendChild(dom)
        this.Dom.appendChild(col)
    }
}