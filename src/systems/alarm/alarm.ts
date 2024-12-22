import { gsap } from "gsap"

export enum AlarmType {
    Normal,
    Warning,
    Deck,
}

export class Alarm {
    dom = document.createElement("div")
    bigDom = document.createElement("div")
    constructor() {
        this.dom.className = "playalarm"
        document.body.appendChild(this.dom)
        this.bigDom.className = "bigplayalarm"
        document.body.appendChild(this.bigDom)
    }
    NotifyInfo(text: string, type: AlarmType) {
        switch(type) {
            case AlarmType.Normal:
                this.dom.style.display = "block"
                this.dom.insertAdjacentHTML("beforeend", text + "<br>")
                gsap.fromTo('.playalarm', 2, { opacity: 1 }, {
                    opacity: 0, ease: "power1.inOut", onComplete: () => {
                        this.dom.style.display = "none"
                        this.dom.innerText = ''
                    }
                })
                break;
            case AlarmType.Deck:
                this.bigDom.style.display = "block"
                this.bigDom.insertAdjacentHTML("beforeend", text + "<br>")
                gsap.to('.bigplayalarm', 3, {
                    scale: 2, ease: "elastic.out", onComplete: () => {
                        this.bigDom.style.display = "none"
                        this.bigDom.innerText = ''
                    }
                })
                break;
        }
    }
}