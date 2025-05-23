
export default class LolliBar {
  value: number = 90
  ratio: number = 90
  top: number = 0
  left: number = 0
  width: string
  bar?: HTMLDivElement
  dom?: HTMLDivElement
  color = ""
  constructor(private parent?: HTMLElement,
    {
      title = "", color = "#FF9a1a", initValue = 90, max = 100,
      top = 0, left = 0, width = "30%"
    } = {}
  ) {
    this.top = top, this.left = left, this.color = color, this.value = initValue
    this.width = width
    this.ratio = Math.floor(this.value / max * 100)
    // eventCtrl.RegisterEventListener(EventTypes.UiInfo, (type: UiInfoType, value: number, max: number) => {
    //   if (type == UiInfoType.LolliBar && this.bar && this.bar.firstElementChild) {
    //     this.bar.style.width = `${Math.floor(value / max * 100)}%`;
    //     (this.bar.firstElementChild as HTMLSpanElement).innerText = `${title} ${value.toFixed(1)}%`
    //   }
    // })
  }
  updateValue(value: number, max: number) {
    if (!this.bar || !this.bar.firstElementChild) return
    this.bar.style.width = `${Math.floor(value / max * 100)}%`;
    (this.bar.firstElementChild as HTMLSpanElement).innerText = `${this.bar.title} ${value.toFixed(1)}%`
  }
  RenderHTML() {
    this.dom = document.createElement("div") as HTMLDivElement
    this.dom.className = "wrapper"
    this.dom.classList.add("p-1")
    this.dom.innerHTML = `
            <div class="progress-bar">
                <div class="bar" data-size="100">
                <span class="perc"></span>
                </div>
            </div>
        `

    this.applyDynamicStyle("lollibar", `
.wrapper {
    position: relative;
    top: ${this.top}px;
    left: ${this.left}px;
  width: ${this.width};
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
  }
  Show() {
    if(!this.dom) throw new Error("undefined element!");
    
    if (this.parent) this.parent.appendChild(this.dom)
    this.bar = document.querySelector(".bar") as HTMLDivElement
    this.bar.style.width = `${this.ratio}%`
    if (this.bar.firstElementChild) (this.bar.firstElementChild as HTMLSpanElement).innerText = `${this.value}`
  }
  Hide() {
    if (this.dom) document.body.removeChild(this.dom)
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
