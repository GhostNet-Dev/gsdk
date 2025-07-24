import IEventController from "@Glibs/interface/ievent"
import { KeyType } from "@Glibs/types/eventtypes"
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
    interactiveDom = document.createElement("div")
    constructor(eventCtrl: IEventController) {
        this.dom.className = "playalarm"
        this.makeDomStyle(this.dom, { top: "15%" })
        document.body.appendChild(this.dom)

        this.bigDom.className = "bigplayalarm"
        this.makeDomStyle(this.bigDom, { top: "15%" })
        document.body.appendChild(this.bigDom)

        this.interactiveDom.className = "interactivealarm"
        this.makeDomStyle(this.interactiveDom, { bottom: "35%" })
        document.body.appendChild(this.interactiveDom)

        eventCtrl.RegisterEventListener(EventTypes.AlarmNormal, (text: string) => {
            this.NotifyInfo(text, AlarmType.Normal)
        })
        eventCtrl.RegisterEventListener(EventTypes.AlarmWarning, (text: string) => {
            this.NotifyInfo(text, AlarmType.Warning)
        })
        eventCtrl.RegisterEventListener(EventTypes.AlarmInteractiveOff, () => {
            this.interactiveDom.style.display = "none"
            this.interactiveDom.innerHTML = ''
            gsap.killTweensOf('.interactivealarm')
        })
        eventCtrl.RegisterEventListener(EventTypes.AlarmInteractiveOn, (msg: { [key in KeyType]?: string }) => {
            let html = ``
            Object.keys(msg).forEach(key => {
                html += `
        <span role="presentation" style="font-size:large;" class="material-symbols-outlined">
                `
                const enumKey = Number(key)
                const value = msg[enumKey as KeyType]
                switch (enumKey) {
                    case KeyType.Action0: html +=  "close"; break;
                    case KeyType.Action1: html +=  "circle"; break;
                    case KeyType.Action2: html +=  "square"; break;
                    case KeyType.Action3: html +=  "change_history"; break;
                }
                html += "</span>&nbsp;&nbsp;" + value + ""
            });
            this.interactiveDom.style.display = "block"
            this.interactiveDom.innerHTML = html
            gsap.killTweensOf('.interactivealarm')
            gsap.fromTo('.interactivealarm', {
                opacity: 1
            }, {
                opacity: 0.3,
                ease: "power1.inOut",
                repeat: -1, // -1은 무한 반복을 의미합니다.
                yoyo: false, // true로 설정하면 애니메이션이 끝난 후 역방향으로 재생됩니다 (0 -> 1).
                duration: 1.5 // 지속 시간은 여기에 명시하는 것이 좋습니다.
            });
        })
    }
    textQueue: string[] = []

    NotifyInfo(text: string, type: AlarmType) {

        switch(type) {
            case AlarmType.Normal:
                if (this.textQueue.length > 3) this.textQueue.shift()
                this.textQueue.push(text)

                this.dom.style.display = "block"
                this.dom.insertAdjacentHTML("beforeend", this.textQueue.join("<br>"))
                gsap.killTweensOf('.playalarm')
                gsap.fromTo('.playalarm', 3, { opacity: 1 }, {
                    opacity: 0, ease: "power1.inOut", onComplete: () => {
                        this.dom.style.display = "none"
                        this.dom.innerText = ''
                        this.textQueue.length = 0
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
    makeDomStyle(dom: HTMLElement, {
        top = "", left = "50%", transform = "translate(-50%, -50%)",
        bottom = ""
    } = {}) {
        // 스타일 설정
        dom.style.position = "absolute";
        dom.style.display = "none";
        dom.style.width = "fit-content";
        if (top.length > 0) dom.style.top = top
        if (bottom.length > 0) dom.style.bottom = bottom
        dom.style.left = left
        dom.style.transform = transform;
        dom.style.color = "#fff";
        dom.style.textShadow = "-1px 0px black, 0px 1px black, 1px 0px black, 0px -1px black";
        dom.style.textAlign = "center";
    }
}
