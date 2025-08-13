import IEventController from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"

export class DebugDiv {
    dom = document.createElement("div")
    textQueue: string[] = []
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
        this.eventCtrl.RegisterEventListener(EventTypes.DebugOut, (msg: string) => {
            if (this.textQueue.length > 4) this.textQueue.shift()
            this.textQueue.push(msg)
            this.dom.style.display = "block"
            this.dom.innerText = this.textQueue.join("\n")
        })
    }
}