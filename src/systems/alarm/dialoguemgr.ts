import { EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "../event/ievent";
import { KeyType } from "@Glibs/types/eventtypes";

export class DialogueManager {
    constructor(private eventCtrl: IEventController) {}

    // 1번 해결책에서 만든 Promise 기반 함수
    private ShowMessageAndWaitForAction(type: KeyType, text: string): Promise<void> {
        return new Promise((resolve) => {
        // 기존 이벤트 메시지 전송 함수를 호출합니다.
        // 키를 누르면 콜백으로 resolve 함수가 실행되도록 합니다.
        this.eventCtrl.SendEventMessage(
            EventTypes.AlarmHookMsgOn, 
            { [type]: text }, 
            () => {
                resolve(); // Promise를 이행(완료) 상태로 만듭니다.
            }
        );
    });
    }

    // 스크립트 실행기
    async runScript(script: any[]) {
        for (const command of script) {
            switch (command.type) {
                case 'dialogue':
                    await this.ShowMessageAndWaitForAction(command.key, command.text);
                    break;
                case 'action':
                    // command.func()가 Promise를 반환하면 await, 아니면 그냥 실행
                    await command.func(); 
                    break;
                case 'camera':
                    // 카메라 조작 로직 실행
                    // ...
                    break;
            }
        }
    }
}