import IEventController from "@Glibs/interface/ievent";
import { EventTypes, UiInfoType } from "@Glibs/types/globaltypes";


export default class RadialBar {
    healthBarState = {
        healthBarSectionGap: 4,
        maxHealth: 10,
        currentHealth: 10
    };
    color = "#B6244F"
    constructor(eventCtrl: IEventController, {color = "", healthBarSectionGap = 4, maxHealth = 10, currentHealth = 10} = {}) {
        this.color = color
        this.healthBarState = { healthBarSectionGap, maxHealth, currentHealth }
        eventCtrl.RegisterEventListener(EventTypes.UiInfo, 
            (type: UiInfoType, value: number, max: number) => {
                if (type == UiInfoType.RadialBar) {
                    if(this.healthBarState.currentHealth >= 0 && value >= this.healthBarState.maxHealth ) {
                        this.healthBarState.currentHealth = value
                        this.renderHealthBar();
                    }
                }
            })
        this.drawHtml()
        this.renderHealthBar();
    }
    drawHtml() { 
        const dom = document.createElement("div") as HTMLDivElement
        dom.className = "health-bar"
        dom.classList.add("p-1")
        dom.innerHTML = `
        <svg width="30%" height="30%" viewBox="0 0 200 200">
        <g id="healthBarInner" transform="translate(100,100)">
        <!-- generated health bar sections will go here -->
        </g>
        <circle cx="100" cy="100" r="90" fill="#fff" />
        </svg>
        <p id="healthBarText"></p>
        `

        document.body.appendChild(dom)
        this.applyDynamicStyle("radialbar", `
            .health-bar {
                position: absolute;
                top: 0px;
                left: 0px;
                display: block;
                margin: auto;
                max-width: 200px;
            }

            #healthBarText {
                font-family: "Arial", sans;
                font-weight: black;
                margin: 0;
                padding: 0;
                color: ${this.color};
                font-size: 2rem;
                position: relative;
                top: 47%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        `);
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
    // Functions
    renderHealthBar() {
        this.renderHealthBarSections(100 / this.healthBarState.maxHealth);
        this.renderHealthBarText();
    }

    renderHealthBarSections(percentage: number) {
        const healthBarInner = document.getElementById("healthBarInner");
        if(!healthBarInner) throw new Error("undefined dom");
        
        healthBarInner.innerHTML = "";
        const radius = 100;
        const angle = (percentage / 100) * 360 - this.healthBarState.healthBarSectionGap;
        const radians = (angle - 180) * (Math.PI / 180);
        const x = radius * Math.cos(radians);
        const y = radius * Math.sin(radians);
        const largeArc = percentage > 50 ? 1 : 0;
        /*
         This is the dynamic circle section part.
         The circle sections have a pie slice shape, partially hidden by a circle layered on top.
         To draw the slice, we go from the center of the healthbar to an outer point,
         draw an arc according to the max sections of the healthbar, then close the shape.
        */
        const d = `M0 0 -100 0 A${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`;

        for (let i = 0; i < this.healthBarState.currentHealth; i++) {
            const healthBarSection = this.createHealthBarSectionElement(i);
            healthBarSection.setAttribute("d", d);
            healthBarInner.appendChild(healthBarSection);
        }
    }

    createHealthBarSectionElement(index: number) {
        // This does not work with document.createElement!!
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "health-bar__section");
        path.setAttribute("fill", this.color);
        // This rotates the sections along the circle, so they are not layered on top of each other
        path.setAttribute("transform", `rotate(${this.getSectionRotation(index)}, 0, 0)`);

        return path;
    }

    getSectionRotation(index: number) {
        return (360 / this.healthBarState.maxHealth) * index;
    }

    renderHealthBarText() {
        const healthBarText = document.getElementById("healthBarText");
        if(!healthBarText) throw new Error("undefined dom");
        
        healthBarText.innerHTML = this.healthBarState.currentHealth.toString();
    }   

}
