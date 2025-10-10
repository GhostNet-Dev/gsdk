import IEventController from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"

export class DebugDiv {
    dom = document.createElement("div")
    textQueue: string[] = []
    valueView = new Map<string, string>()
    constructor(private eventCtrl: IEventController) {
        this.dom.classList.add("debugdiv")
        Object.assign(this.dom.style, {
            position: "absolute",
            top: "0",
            left: "0",
            zIndex: "9999",
            pointerEvents: "none",
            opacity: "0.5",
        })
        document.body.appendChild(this.dom)
        this.eventCtrl.RegisterEventListener(EventTypes.DebugVar, (name, value: string) => {
            this.valueView.set(name, value)
            this.updateText()
        })
        this.eventCtrl.RegisterEventListener(EventTypes.DebugOut, (msg: string) => {
            if (this.textQueue.length > 4) this.textQueue.shift()
            this.textQueue.push(msg)
            this.updateText()
        })
    }
    updateText() {
        let text = ""
        for (const [k, v] of this.valueView) text += `${k}: ${v}\n`
        text = text + "\n" + this.textQueue.join("\n")
        this.dom.style.display = "block"
        this.dom.innerText = text
    }

    lastTime = 0
    frameCnt = 0
    defaultFps() {
        const now = performance.now()
        if(now - this.lastTime < 1000) {
            this.frameCnt++
        } else {
            this.lastTime = now
            this.eventCtrl.SendEventMessage(EventTypes.DebugVar, "fps", this.frameCnt.toString())
            this.frameCnt = 0
        }
    }
}