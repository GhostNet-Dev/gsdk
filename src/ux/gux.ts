export interface IGUX {
    Dom: HTMLElement
    Show(): void
    Hide(): void
    RenderHTML(...param: any): void
    AddChild(dom: IGUX, ...param: any): void
}

export abstract class GUX implements IGUX {
    abstract Dom: HTMLElement
    abstract Show(): void
    abstract Hide(): void
    abstract RenderHTML(...param: any): void
    abstract AddChild(dom: IGUX): void

    applyDynamicStyle(styleId: string, css: string) {
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style); // <head>에 스타일 추가
        } else {
            console.log("Style already applied.");
        }
    }
}

export class SimpleGux extends GUX {
    Dom: HTMLElement
    constructor(dom:HTMLElement) {
       super() 
       this.Dom = dom
    }
    Show(): void {
    }
    Hide(): void {
    }
    RenderHTML(...param: any): void {
    }
    AddChild(dom: IGUX): void {
        this.Dom.appendChild(dom.Dom)
    }
}