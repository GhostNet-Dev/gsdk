import * as THREE from "three";
import { Joystick } from "./joystic";
import { KeyAction1, KeyAction2, KeyAction3, KeyDown, KeyLeft, KeyRight, KeySpace, KeyUp } from "../event/keycommand";
import { EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "@Glibs/interface/ievent";

export enum InputMode {
    Joypad,
    Joystick
}

export default class Input {
    //dom = document.createElement("div")
    //joystick: nipplejs.JoystickManager
    realV = new THREE.Vector3()
    virtualV = new THREE.Vector3()
    zeroV = new THREE.Vector3()

    left = document.getElementById("goleft") as HTMLDivElement
    right = document.getElementById("goright") as HTMLDivElement
    up = document.getElementById("goup") as HTMLDivElement
    down = document.getElementById("godown") as HTMLDivElement
    jump = document.getElementById("joypad_button1") as HTMLDivElement
    action1 = document.getElementById("joypad_button2") as HTMLDivElement
    action2 = document.getElementById("joypad_button3") as HTMLDivElement
    action3 = document.getElementById("joypad_button4") as HTMLDivElement
    currentEvent?: Touch
    clock = new THREE.Clock()
    startTime = this.clock.getElapsedTime().toFixed(2)

    joystick = new Joystick({
        event: (type: string, direction: string, x: number, y: number) => {
            if (type == "move") {
                const delta = this.clock.getElapsedTime().toFixed(2)
                if (this.startTime == delta) {
                    return
                } else {
                    this.startTime = delta
                }
            }

            const p = this.virtualV.copy(this.zeroV)
            switch (direction) {
                case "w": p.z = -1; break;
                case "x": p.z = 1; break;
                case "d": p.x = 1; break;
                case "a": p.x = -1; break;
            }
            this.realV.set(x, 0, y)
            console.log(type, x, y)
            this.eventCtrl.SendEventMessage(EventTypes.Input, { type: type }, this.realV, this.virtualV)
        },
        /*
        ontouchstart: (e) => this.MultiTouchEvent(e),
        ontouchmove: (e) => this.MultiTouchEvent(e),
        ontouchend: (e) => this.MultiTouchEvent(e),
        */
    })
    constructor(private eventCtrl: IEventController) {
        this.applyDynamicStyle("joypad", css)
        document.body.insertAdjacentHTML("afterend", html)

        this.left = document.getElementById("goleft") as HTMLDivElement
        this.right = document.getElementById("goright") as HTMLDivElement
        this.up = document.getElementById("goup") as HTMLDivElement
        this.down = document.getElementById("godown") as HTMLDivElement
        this.jump = document.getElementById("joypad_button1") as HTMLDivElement
        this.action1 = document.getElementById("joypad_button2") as HTMLDivElement
        this.action2 = document.getElementById("joypad_button3") as HTMLDivElement
        this.action3 = document.getElementById("joypad_button4") as HTMLDivElement
        this.eventCtrl.RegisterEventListener(EventTypes.JoypadOn, (mode: InputMode) => {
            switch (mode) {
                case InputMode.Joypad: {
                    this.LegacyButtonShow()
                    this.ButtonShow()
                    break
                }
                case InputMode.Joystick: {
                    this.joystick.Show()
                    this.ButtonShow()
                    break
                }
            }
        })
        this.eventCtrl.RegisterEventListener(EventTypes.JoypadOff, (mode: InputMode) => {
            switch(mode) {
                case InputMode.Joypad: {
                    this.LegacyButtonHide()
                    this.ButtonHide()
                    break
                }
                case InputMode.Joystick: {
                    this.joystick.Hide()
                    this.ButtonHide()
                    break
                }
            }
        })

        this.up.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyUp); }
        this.down.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyDown); }
        this.left.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyLeft); }
        this.right.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyRight); }
        this.up.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyUp); }
        this.down.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyDown); }
        this.left.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyLeft); }
        this.right.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyRight); }

        this.jump.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeySpace) }
        this.jump.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeySpace) }

        this.action1.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyAction1) }
        this.action1.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyAction1) }

        this.action2.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyAction2) }
        this.action2.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyAction2) }

        this.action3.ontouchstart = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyAction3) }
        this.action3.ontouchend = () => { this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyAction3) }
    }
    LegacyButtonShow() {
        const joypad = document.getElementById("joypad") as HTMLDivElement
        joypad.style.display = "block"
    }
    LegacyButtonHide() {
        const joypad = document.getElementById("joypad") as HTMLDivElement
        joypad.style.display = "none"
    }
    ButtonShow() {
        const btnTag = document.getElementById("joypad_buttons") as HTMLDivElement
        btnTag.style.display = 'block'
    }
    ButtonHide() {
        const btnTag = document.getElementById("joypad_buttons") as HTMLDivElement
        btnTag.style.display = 'none'
    }

    MultiTouchEvent(e: Touch) {
        if (this.currentEvent == undefined) {
            if(e!= undefined) {
                //start
                const btn = e.target as HTMLElement
                console.log("start", e)
                switch(btn.id) {
                    case "joypad_button1": this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeySpace); break;
                    case "joypad_button2": this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyAction1); break;
                    case "joypad_button3": this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyAction2); break;
                    case "joypad_button4": this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyAction3); break;
                    case "zone_joystick": this.joystick.start(e.clientX, e.clientY);break;
                }
            }
            this.currentEvent = e
        }
        if (this.currentEvent != undefined) {
            if(e!= undefined) {
                //move
                console.log("move", e)
                const btn = e.target as HTMLElement
                switch(btn.id) {
                    case "zone_joystick": this.joystick.move(e.clientX, e.clientY);break;
                }
            } else {
                //end
                console.log("end", this.currentEvent)
                const btn = this.currentEvent.target as HTMLElement
                switch(btn.id) {
                    case "joypad_button1": this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeySpace); break;
                    case "joypad_button2": this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyAction1); break;
                    case "joypad_button3": this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyAction2); break;
                    case "joypad_button4": this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyAction3); break;
                    case "zone_joystick": this.joystick.end();break;
                }
            }
        }
        this.currentEvent = e
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
const html =`
<div id="joypad">
        <div class="container p-2 ms-1">
            <div class="row text-center select-disable" id="goup">
                <div class="joypad_arrow select-disable"> </div>
            </div>
            <div class="row">
                <div class="col select-disable" id="goleft">
                    <div class="joypad_arrow select-disable"> </div>
                </div>
                <div class="col text-right select-disable" id="goright">
                    <div class="joypad_arrow select-disable"> </div>
                </div>
            </div>
            <div class="row text-center select-disable" id="godown">
                <div class="joypad_arrow select-disable"><span class="visually-hidden">joypad</span></div>
            </div>
        </div>
    </div>
    <div id="joypad_buttons">
        <div class="container p-2 me-1">
            <div class="row">
                <div class="col pb-2 text-right" style="display: flex;justify-content: flex-end;">
                    <div id="joypad_button4" class="joypad_button select-disable pt-2">
                        <span style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            change_history
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col pb-2 text-right" style="display: flex;justify-content: flex-end;">
                    <div id="joypad_button3" class="joypad_button select-disable pt-2">
                        <span style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            square
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col pb-2 text-right" style="display: flex;justify-content: flex-end;">
                    <div id="joypad_button2" class="joypad_button select-disable pt-2">
                        <span style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            circle
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <div id="joypad_button1" class="joypad_button select-disable pt-2">
                        <span style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            close
                        </span>
                    </div>
                </div>
                <div class="col" style="width: 50px;">
                </div>
            </div>
        </div>
    </div>
`
const css = `
#zone_joystick {
    display: none;
    position: absolute;
    left: 10px;
    bottom: 10px;
}
#joypad {
    display: none;
    position: absolute;
    left: 10px;
    bottom: 10px;
}
#joypad_buttons {
    display: none;
    position: absolute;
    right: 0px;
    bottom: 10px;
}
.joypad_arrow {
display: inline-block;
    width: 4rem;
    height: 4rem;
    vertical-align: -0.125em;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    margin: 0 auto;
}
.joypad_button {
    display: inline-block;
    width: 4rem;
    height: 4rem;
    vertical-align: middle;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    margin: 0 auto;
    text-align: center;
}
.joypad_inven {
    display: inline-block;
    width: 4rem;
    height: 4rem;
    vertical-align: middle;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    margin: 0;
    text-align: center;
}
`
