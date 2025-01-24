import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";



export default class Spinning {
    constructor(eventCtrl: IEventController) {
        this.applyDynamicStyle("spinngin", css)
        const dom = document.createElement('div')
        dom.classList.add("spinning_gsdk", "justify-content-center")
        dom.innerHTML = html
        document.body.appendChild(dom)
        eventCtrl.RegisterEventListener(EventTypes.Spinner, (enable: boolean) => {
            dom.style.display = (enable) ? "block" : "none"
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
const html = `
<div class="spinner-border text-danger vertical_spin" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
`

const css = `
.spinning_gsdk {
    position: absolute;
    display: none;
    width: 100%;
    height: 100%;
    background: #000000;
    opacity: 0.5;
    z-index: 1090;
}
.vertical_spin {
    position: relative;
    top:50%;
    left: 50%;
}
`
