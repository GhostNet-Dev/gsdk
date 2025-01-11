import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";



export default class Spinning {
    constructor(eventCtrl: IEventController) {
        this.addDynamicStyle(css)
        const dom = document.createElement('div')
        dom.classList.add("spinning_gsdk", "justify-content-center")
        dom.innerHTML = html
        document.body.appendChild(dom)
        eventCtrl.RegisterEventListener(EventTypes.Spinner, (enable: boolean) => {
            dom.style.display = (enable) ? "block" : "none"
        })
    }
    addDynamicStyle(css: string): void {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = css;
        document.head.appendChild(style);
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
