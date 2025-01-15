import { gsap } from "gsap";
import IDialog from "./idialog"

export default class WoodModal implements IDialog {
    dom = document.createElement("div")
    titleDom = document.createElement("div");
    constructor(private parent: HTMLElement, { width = "70%", height = "fit-content" } = {}) {
        this.applyDynamicStyle("woodmodal", getCSS())
        this.dom.classList.add("woodmodal")
        this.dom.style.width = width
        this.dom.style.height = height
        this.titleDom.classList.add("woodmodal_title")
        this.dom.appendChild(this.titleDom)
    }
    GetContentElement() {
        return this.dom
    }
    RenderHtml(title: string, content: string | HTMLElement, options?: {
        btnText?: string | undefined;
        close?: (() => void) | undefined
    } | undefined): void {
        this.titleDom.innerText = title
        if (typeof content == "string") {
            this.dom.innerHTML += content
        } else {
            this.dom.appendChild(content)
        }
        this.show()
    }
    show(): void {
        this.parent.appendChild(this.dom)
    }
    hide() {
        gsap.to(this.dom, { scale: 0, opacity: 0, duration: 0.6, ease: "power2.in", 
            onComplete: () => { this.parent.removeChild(this.dom) }
        })
        
    }
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

function getCSS() {
    return `

/* 
GAME BUTTONS  
inspired by yuanzi0410
https://dribbble.com/shots/3456012-game-button
*/
    .woodmodal_title {
        position: relative;
        width:fit-content;
        top:0px;
        left:50%;
        text-align:center;
        transform: translate(-50%, -50%);
        -moz-border-radius: 10px;
        -webkit-border-radius: 10px;
        border-radius: 10px; /* border radius */
            -moz-background-clip: padding;
        -webkit-background-clip: padding-box;
        background-clip: padding-box; /* prevents bg color from leaking outside the border */
            background-color: #8cc63e; /* layer fill content */
            -moz-box-shadow: inset 0 -5px 0 #67922e; /* inner shadow */
            -webkit-box-shadow: inset 0 -5px 0 #67922e; /* inner shadow */
            box-shadow: inset 0 -5px 0 #67922e; /* inner shadow */

            padding:10px;
        color: #fff; /* text color */
        font-size: 24px;
        font-weight: bold;
        text-decoration: none;
        text-transform: uppercase;
        text-shadow:none;
    }
    .woodmodal_title::after {
        content: '';
        height: 4px;
        position: absolute;
        width: 5%;
        background: #fff;
        left: 5%;
        top: 5%;
        border-radius: 99px;
    }
    .woodmodal {
        position: absolute;
        top: 50%;
        left:50%;
        transform: translate(-55%, -55%);

        cursor: pointer;
        text-decoration: none !important;
        outline: none !important;
        font-family: 'Carter One', sans-serif;
        font-size: 20px;
        line-height: 1.5em;
        letter-spacing: .1em;
        text-shadow: 2px 2px 1px #0066a2, -2px 2px 1px #0066a2, 2px -2px 1px #0066a2, -2px -2px 1px #0066a2, 0px 2px 1px #0066a2, 0px -2px 1px #0066a2, 0px 4px 1px #004a87, 2px 4px 1px #004a87, -2px 4px 1px  #004a87;
        border: none;
        margin: 15px 15px 30px;
        background: repeating-linear-gradient( 45deg, #3ebbf7, #3ebbf7 5px, #45b1f4 5px, #45b1f4 10px);
        border-bottom: 3px solid rgba(16, 91, 146, 0.5);
        border-top: 3px solid rgba(255,255,255,.3);
        color: #fff !important;
        border-radius: 15px;
        padding: 8px 15px 10px;
        box-shadow: 0 6px 0 #266b91, 0 8px 1px 1px rgba(0,0,0,.3), 0 10px 0 5px #12517d, 0 12px 0 5px #1a6b9a, 0 15px 0 5px #0c405e, 0 15px 1px 6px rgba(0,0,0,.3);
        animation: pop 0.6s ease-out; /* 팡 튀어나오는 애니메이션 */
    }
        .woodmodal::before {
            content: '';
            height: 10px;
            position: absolute;
            width: 40%;
            background: #fff;
            right: 13%;
            top: 0%;
            border-radius: 99px;
        }
        .woodmodal::after {
            content: '';
            height: 10px;
            position: absolute;
            width: 5%;
            background: #fff;
            right: 5%;
            top: 0%;
            border-radius: 99px;
        }
        /* 애니메이션 */
            @keyframes pop {
            0% {
                transform: translate(-55%, -55%) scale(0);
                opacity: 0;
            }
            60% {
                transform: translate(-55%, -55%) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translate(-55%, -55%) scale(1);
            }
        }
        `
}
