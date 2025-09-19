import * as THREE from "three";
import { Joystick } from "./joystic";
import { KeyAction1, KeyAction2, KeyAction3, KeyAction4, KeyAction5, KeyDown, KeyLeft, KeyRight, KeySpace, KeySystem0, KeyUp } from "../event/keycommand";
import { EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "@Glibs/interface/ievent";
import { KeyType } from "@Glibs/types/eventtypes";

export enum InputMode {
    Joypad,
    Joystick,
    Buttons,
}

// KeyAction에 대한 타입을 정의하여 유지보수를 용이하게 합니다.
type ActionType = 'Up' | 'Down' | 'Left' | 'Right' | 'Space' | 'Action1' | 'Action2' | 'Action3' | 'Action4' | 'Action5';

// 이벤트 페이로드 타입을 명확히 정의합니다.
export interface IButtonEnablePayload {
    button: ActionType;
    enabled: boolean;
}


export default class Input {
    // Vectors and Clock
    private realV = new THREE.Vector3();
    private virtualV = new THREE.Vector3();
    private zeroV = new THREE.Vector3();
    private clock = new THREE.Clock();
    private lastMoveTime = 0;

    // DOM Elements
    private domElements: { [key: string]: HTMLElement } = {};
    private domActionMap: { [key: string]: ActionType } = {
        up: 'Up', down: 'Down', left: 'Left', right: 'Right',
        jump: 'Space', action1: 'Action1', action2: 'Action2', action3: 'Action3',
    };

    // Event Handlers
    private keyDownHandlers = new Map<ActionType, () => void>();
    private keyUpHandlers = new Map<ActionType, () => void>();
    private originalKeyDownHandlers = new Map<ActionType, () => void>();
    private originalKeyUpHandlers = new Map<ActionType, () => void>();

    // --- [추가] 비활성화된 버튼을 관리하는 Set ---
    private disabledButtons = new Set<ActionType>();

    private joystick!: Joystick;

    constructor(private eventCtrl: IEventController) {
        this._setupDOM();
        this._initializeJoystick();
        this._createActionHandlers();
        this._queryDOMElements();
        this._attachDOMListeners();
        this._attachWindowListeners();
        this._registerEventControllerListeners();
    }

    // -------------------
    // Private Setup Methods
    // -------------------

    private _setupDOM(): void {
        this.applyDynamicStyle("joypad_style", css);
        document.body.insertAdjacentHTML("beforeend", html);
    }

    private _initializeJoystick(): void {
        this.joystick = new Joystick({
            event: (type: string, direction: string, x: number, y: number) => {
                // 시간 기반 쓰로틀링(Throttling) 개선
                if (type === "move") {
                    const elapsedTime = this.clock.getElapsedTime();
                    if (elapsedTime - this.lastMoveTime < 0.016) return; // 약 60fps
                    this.lastMoveTime = elapsedTime;
                }

                const p = this.virtualV.copy(this.zeroV);
                if (direction === "w") p.z = -1;
                else if (direction === "x") p.z = 1;
                else if (direction === "d") p.x = 1;
                else if (direction === "a") p.x = -1;
                
                this.realV.set(x, 0, y);
                this.eventCtrl.SendEventMessage(EventTypes.Input, { type }, this.realV, this.virtualV);
            },
        });
    }
    
    /**
     * 액션 핸들러들을 Map에 동적으로 생성하고 저장합니다.
     */
    private _createActionHandlers(): void {
        const keyActionMap: { [key in ActionType]: any } = {
            Up: KeyUp, Down: KeyDown, Left: KeyLeft, Right: KeyRight,
            Space: KeySpace, Action1: KeyAction1, Action2: KeyAction2,
            Action3: KeyAction3, Action4: KeyAction4, Action5: KeyAction5,
        };

        for (const key in keyActionMap) {
            const action = key as ActionType;
            const KeyClass = keyActionMap[action];
            
            this.keyDownHandlers.set(action, () => this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeyClass()));
            this.keyUpHandlers.set(action, () => this.eventCtrl.SendEventMessage(EventTypes.KeyUp, new KeyClass()));
        }
    }

    private _queryDOMElements(): void {
        const elementIds = {
            up: "goup", down: "godown", left: "goleft", right: "goright",
            jump: "joypad_button1", action1: "joypad_button2",
            action2: "joypad_button3", action3: "joypad_button4",
        };
        for (const key in elementIds) {
            this.domElements[key] = document.getElementById(elementIds[key as keyof typeof elementIds]) as HTMLElement;
        }
    }

    /**
     * DOM 요소에 터치 및 클릭 이벤트를 바인딩합니다.
     */
    // 수정 후
    private _attachDOMListeners(): void {
        for (const key in this.domActionMap) {
            const element = this.domElements[key];
            const action = this.domActionMap[key as keyof typeof this.domActionMap] as ActionType;
            if (element) {
                // --- [수정] 버튼이 비활성화 상태인지 확인하는 로직 추가 ---
                const handleKeyDown = (e: any) => {
                    if (this.disabledButtons.has(action)) return;
                    e.preventDefault();
                    this.keyDownHandlers.get(action)?.();
                };
                const handleKeyUp = () => {
                    if (this.disabledButtons.has(action)) return;
                    this.keyUpHandlers.get(action)?.();
                };
                
                element.ontouchstart = handleKeyDown;
                element.ontouchend = handleKeyUp;

                // if (key.includes('up') || key.includes('down') || key.includes('left') || key.includes('right') || key.includes('jump')) {
                    element.onclick = handleKeyDown;
                // }
            }
        }
    }

    /**
     * 키보드 이벤트를 설정합니다. key-map을 사용하여 switch문을 대체합니다.
     */
    private _attachWindowListeners(): void {
        const keyMap: { [key: string]: ActionType } = {
            "ArrowUp": 'Up', "KeyW": 'Up',
            "ArrowDown": 'Down', "KeyS": 'Down',
            "ArrowLeft": 'Left', "KeyA": 'Left',
            "ArrowRight": 'Right', "KeyD": 'Right',
            "Space": 'Space',
            "Digit1": 'Action1',
            "Digit2": 'Action2',
            "Digit3": 'Action3',
            "Digit4": 'Action4',
            "Digit5": 'Action5',
        };

        window.addEventListener("keydown", (e) => {
            const action = keyMap[e.code];
            if (action) {
                this.keyDownHandlers.get(action)?.();
            } else if (e.key === '0' && window.location.hostname !== "hons.ghostwebservice.com") {
                this.eventCtrl.SendEventMessage(EventTypes.KeyDown, new KeySystem0());
            }
        });

        window.addEventListener("keyup", (e) => {
            const action = keyMap[e.code];
            if (action) {
                this.keyUpHandlers.get(action)?.();
            }
        });
    }

    /**
     * 외부 이벤트를 수신하는 리스너들을 등록합니다.
     */
    private _registerEventControllerListeners(): void {
        this.eventCtrl.RegisterEventListener(EventTypes.JoypadOn, (mode: InputMode) => {
            const display = (id: string, show: boolean) => (document.getElementById(id) as HTMLElement).style.display = show ? 'block' : 'none';
            if (mode === InputMode.Joypad) {
                display('joypad', true);
            } else if (mode === InputMode.Joystick) {
                this.joystick.Show();
            } else {
                display('joypad_buttons', true);
            }
        });

        this.eventCtrl.RegisterEventListener(EventTypes.JoypadOff, (mode: InputMode) => {
            const display = (id: string, show: boolean) => (document.getElementById(id) as HTMLElement).style.display = show ? 'block' : 'none';
            if (mode === InputMode.Joypad) {
                display('joypad', false);
                display('joypad_buttons', false);
            } else if (mode === InputMode.Joystick) {
                this.joystick.Hide();
                display('joypad_buttons', false);
            }
        });
        // --- [추가] InputButtonEnable 이벤트 리스너 등록 ---
        this.eventCtrl.RegisterEventListener( EventTypes.InputButtonEnable, (payloads: IButtonEnablePayload[]) => {
            payloads.forEach((payload) => { this._setButtonEnabled(payload.button, payload.enabled) })
        });
        // Hook 관련 리스너들
        this.eventCtrl.RegisterEventListener(EventTypes.InputHookRemove, () => this._restoreAllHooks());
        this.eventCtrl.RegisterEventListener(EventTypes.InputHookOnce, (keyType: KeyType, hook: Function) => this._setHook(keyType, hook));
    }
    
    // --- [추가] 버튼 활성화/비활성화 로직을 처리하는 메서드 ---
    private _setButtonEnabled(action: ActionType, enabled: boolean): void {
        // domActionMap을 순회하여 action에 해당하는 DOM 요소 키를 찾습니다.
        const elementKey = Object.keys(this.domActionMap).find(key => this.domActionMap[key] === action);
        if (!elementKey) return;
        
        const element = this.domElements[elementKey];
        if (!element) return;

        if (enabled) {
            // 활성화
            this.disabledButtons.delete(action);
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
        } else {
            // 비활성화
            this.disabledButtons.add(action);
            element.style.opacity = '0.3';
            element.style.pointerEvents = 'none';
        }
    }
    // -------------------
    // Hooking Logic
    // -------------------
    
    private _setHook(keyType: KeyType, hook: Function): void {
        const keyTypeToActionMap: { [key in KeyType]?: ActionType } = {
            [KeyType.Action0]: 'Space',
            [KeyType.Action1]: 'Action1',
            [KeyType.Action2]: 'Action2',
            [KeyType.Action3]: 'Action3',
            [KeyType.Action4]: 'Action4',
        };
        
        const action = keyTypeToActionMap[keyType];
        if (!action) return;

        // 원본 핸들러 백업 (한 번만)
        if (!this.originalKeyDownHandlers.has(action)) {
            this.originalKeyDownHandlers.set(action, this.keyDownHandlers.get(action)!);
            this.originalKeyUpHandlers.set(action, this.keyUpHandlers.get(action)!);
        }

        // 새로운 핸들러로 교체
        this.keyDownHandlers.set(action, () => {
            hook();
            this._restoreHook(action);
        });
        this.keyUpHandlers.set(action, () => {}); // KeyUp 이벤트는 무시
    }

    private _restoreHook(action: ActionType): void {
        if (this.originalKeyDownHandlers.has(action)) {
            this.keyDownHandlers.set(action, this.originalKeyDownHandlers.get(action)!);
            this.keyUpHandlers.set(action, this.originalKeyUpHandlers.get(action)!);
            // 복원 후 백업본 삭제
            this.originalKeyDownHandlers.delete(action);
            this.originalKeyUpHandlers.delete(action);
        }
    }

    private _restoreAllHooks(): void {
        for (const action of this.originalKeyDownHandlers.keys()) {
            this._restoreHook(action);
        }
    }

    // -------------------
    // Public/Utility Methods
    // -------------------
    // MultiTouchEvent는 로직이 불완전하여(단일 this.currentEvent 사용) 제외했습니다.
    // 필요하다면 e.changedTouches를 순회하며 각 터치를 개별적으로 처리해야 합니다.

    private applyDynamicStyle(styleId: string, css: string): void {
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style);
        }
    }
}

const html = `
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
                <div class="joypad_arrow select-disable"><span role="presentation" class="visually-hidden">joypad</span></div>
            </div>
        </div>
    </div>
    <div id="joypad_buttons">
        <div class="container p-2 me-1">
            <div class="row">
                <div class="col pb-2 text-right" style="display: flex;justify-content: flex-end;">
                    <div id="joypad_button4" class="joypad_button select-disable pt-2">
                        <span role="presentation" style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            change_history
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col pb-2 text-right" style="display: flex;justify-content: flex-end;">
                    <div id="joypad_button3" class="joypad_button select-disable pt-2">
                        <span role="presentation" style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            square
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col pb-2 text-right" style="display: flex;justify-content: flex-end;">
                    <div id="joypad_button2" class="joypad_button select-disable pt-2">
                        <span role="presentation" style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            circle
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <div id="joypad_button1" class="joypad_button select-disable pt-2">
                        <span role="presentation" style="font-size:xxx-large;opacity: 0.7;" class="material-symbols-outlined">
                            close
                        </span>
                    </div>
                </div>
                <div class="col" style="width: 30px;">
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
    z-index: 999;
}
#joypad_buttons {
    display: none;
    user-select: none;
    position: absolute;
    right: 10px;
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
    user-select: none;
    cursor: pointer;
    text-decoration: none !important;
    display: inline-block;
    width: 4rem;
    height: 4rem;
    vertical-align: middle;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    margin: 0 0;
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
.select-disable {
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
`
