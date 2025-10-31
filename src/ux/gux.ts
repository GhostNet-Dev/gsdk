export enum UxLayerIndex {
    default = 0,
    RingMenu,
    Confetti,
    Tap = 10,
    Modal,
    List,
    Button,
}

export interface IGUX {
    Dom: HTMLElement
    Show(): void
    Hide(): void
    setVisible(v: boolean): void;
    isVisible(): boolean;
    onLayout?(slotIndex: number, total: number): void;
    RenderHTML?(...param: any): void
    AddChild?(dom: IGUX, ...param: any): void
}

export abstract class GUX implements IGUX {
    abstract Dom: HTMLElement
    abstract Show(): void
    abstract Hide(): void
    protected visible = true;
    setVisible(v: boolean): void {
        v ? this.Show() : this.Hide();
    }
    isVisible(): boolean {
        return this.visible;
    }
    applyDynamicStyle(styleId: string, css: string) {
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style); // <head>에 스타일 추가
        } else {
            console.log("Style already applied. : ", styleId);
        }
    }
    injectHTML(parent: HTMLElement, html: string): HTMLElement {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        const node = tpl.content.firstElementChild as HTMLElement;
        parent.appendChild(node);
        return node;
    }
}

export class SimpleGux extends GUX {
    Dom: HTMLElement
    child: IGUX[] = []
    constructor({
        dom = document.createElement("div"),
        param = ["container", "w-100", "h-100"],
        backgroundColor = "",
        widthSync = true
    } = {}) {
        super()
        dom.classList.add(...param)
        if (backgroundColor.length > 0) dom.style.backgroundColor = backgroundColor

        this.Dom = dom
        if (widthSync) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.Dom.style.width = this.Dom.parentElement?.offsetWidth + "px"
                        // 요소가 화면에 보일 때 수행할 작업
                        // 한 번만 실행하고 싶다면 observer.unobserve(entry.target);
                        this.child.forEach((e) => {
                            e.Dom.style.width = this.Dom.style.width
                        })
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null, // 뷰포트를 기준으로 관찰 (기본값)
                threshold: 0.1 // 요소의 10%가 보일 때 콜백 실행
            });
            observer.observe(this.Dom);
        }
    }
    Show(): void {
    }
    Hide(): void {
    }
    RenderHTML(...param: any): void {
    }
    AddChild(dom: IGUX): void {
        this.Dom.appendChild(dom.Dom)
        this.child.push(dom)
    }
}