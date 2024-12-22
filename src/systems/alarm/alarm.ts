import IEventController from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { gsap } from "gsap"

export enum AlarmType {
    Normal,
    Warning,
    Deck,
}

export class Alarm {
    dom = document.createElement("div")
    bigDom = document.createElement("div")
    constructor(eventCtrl: IEventController) {
        this.dom.className = "playalarm"
        this.makeDomStyle(this.dom)
        document.body.appendChild(this.dom)

        this.bigDom.className = "bigplayalarm"
        this.makeDomStyle(this.bigDom)
        document.body.appendChild(this.bigDom)

        eventCtrl.RegisterEventListener(EventTypes.AlarmNormal, (text: string) => {
            this.NotifyInfo(text, AlarmType.Normal)
        })
        eventCtrl.RegisterEventListener(EventTypes.AlarmWarning, (text: string) => {
            this.NotifyInfo(text, AlarmType.Warning)
        })
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
            case AlarmType.Warning:
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
    makeDomStyle(dom: HTMLElement) {
        // 스타일 설정
        dom.style.position = "absolute";
        dom.style.display = "none";
        dom.style.width = "fit-content";
        dom.style.top = "15%";
        dom.style.left = "50%";
        dom.style.transform = "translate(-50%, -50%)";
        dom.style.color = "#fff";
        dom.style.textShadow = "-1px 0px black, 0px 1px black, 1px 0px black, 0px -1px black";
        dom.style.textAlign = "center";
    }
}
