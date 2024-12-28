import IEventController from "@Glibs/interface/ievent";
import { EventTypes, UiInfoType } from "@Glibs/types/globaltypes";


export default class LolliBar {
    value: number = 90
    ratio: number = 90
    bar?: HTMLDivElement
    color = ""
    constructor(eventCtrl: IEventController, {title = "", color = "#FF9a1a"} = {}) {
        this.color = color
        eventCtrl.RegisterEventListener(EventTypes.UiInfo, (type: UiInfoType, value: number, max: number) => {
            if(type == UiInfoType.LolliBar && this.bar && this.bar.firstElementChild) {
              this.bar.style.width = `${Math.floor(value / max * 100)}%`;
              (this.bar.firstElementChild as HTMLSpanElement).innerText = `${title} ${value.toFixed(1)}%`
            }
        })
    }
    RenderHTML() { 
        const dom = document.createElement("div") as HTMLDivElement
        dom.className = "wrapper"
        dom.classList.add("p-1")
        dom.innerHTML = `
            <div class="progress-bar">
                <div class="bar" data-size="100">
                <span class="perc"></span>
                </div>
            </div>
        `

        this.addDynamicStyle(`
.wrapper {
    position: absolute;
    top: 0px;
    left: 0px;
  width: 30%;
  max-width: 100%;
}

.progress-bar {
  height: 20px;
  width: 100%;
  background-color: #BFADA3;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 2px 0 10px inset rgba(0,0,0,0.2);
  position: relative;
}

* + .progress-bar {
  margin-top: 2rem;
}

.bar {
  width: 0;
  height: 100%;
  background-color: ${this.color};
  
  /*Lollipop background gradient*/
  background-image: linear-gradient(
    -45deg,
    rgba(255, 255, 255, .2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, .2) 50%,
    rgba(255, 255, 255, .2) 75%,
    transparent 75%,
    transparent
  );
 
  background-size: 30px 30px;
  animation: move 2s linear infinite;
  box-shadow: 2px 0 10px inset rgba(0,0,0,0.2);
  transition: width 2s ease-out;
}

/*Lollipop background gradient animation*/
@keyframes move {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 30px 30px;
  }
}

.perc {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-weight: bold;
}
        `);
        document.body.appendChild(dom)
        this.bar = document.querySelector(".bar") as HTMLDivElement
        this.bar.style.width = `${this.ratio}%`
        if (this.bar.firstElementChild) (this.bar.firstElementChild as HTMLSpanElement).innerText = `${this.value}`
    }
    addDynamicStyle(css: string): void {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = css;
        document.head.appendChild(style);
    }
}
