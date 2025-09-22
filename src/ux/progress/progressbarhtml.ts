import IEventController from "@Glibs/interface/ievent";
import { GUX, IGUX } from "../gux";
import { EventTypes } from "@Glibs/types/globaltypes";

export default class ProgressBarHtml extends GUX {
    Dom = document.createElement("div");

    // 프로그레스 바와 텍스트 요소에 대한 참조를 저장할 속성
    private loadingBar: HTMLSpanElement | null = null;
    private loadingText: HTMLDivElement | null = null;

    constructor(
        eventCtrl: IEventController,
    ) {
        super();
        this.RenderHTML();
        this.Hide()

        // 이벤트 리스너 구현
        eventCtrl.RegisterEventListener(EventTypes.ShowProgress, (ratio: number, text: string) => {
            // ratio는 0.0 ~ 1.0 사이의 값이라고 가정합니다.
            if (this.loadingBar && this.loadingText) {
                this.Show(); // 프로그레스 바를 화면에 표시

                // 너비와 텍스트 업데이트
                this.loadingBar.style.width = `${ratio * 100}%`;
                if (text.length > 0) this.loadingText.innerText = text;
                if (ratio == 1.0) this.Hide();
            }
        });
    }

    Show(): void {
        this.Dom.style.display = "block";
    }

    Hide(): void {
        this.Dom.style.display = "none";
    }

    RenderHTML(...param: any): void {
        const html  = `
        <div id="htmlprogressbar">
            <span id="htmlloading"></span>
            <div id="htmlprogressload">loading</div>
        </div>
        `;
        this.Dom.innerHTML = html;

        // 렌더링된 HTML 내부의 요소들을 찾아 클래스 속성에 할당
        this.loadingBar = this.Dom.querySelector<HTMLSpanElement>("#htmlloading");
        this.loadingText = this.Dom.querySelector<HTMLDivElement>("#htmlprogressload");

        this.applyDynamicStyle("htmlprogressbarcss", css);
    }

    AddChild(dom: IGUX, ...param: any): void {
        // Not implemented
    }
}

const css = `
#htmlprogressbar{
  height: 26px;
  position: absolute;
  left: 50%;
  top: 50%;
  width: 200px;
  background: rgba(159, 159, 159, 0.5);
  border-radius: 10px;
  margin: -20px 0 0 -100px;
  padding: 2px;
}
#htmlloading{
  /* width 변경 시 부드러운 전환 효과를 위해 transition 수정 */
  transition: width 0.3s ease;
  height: 20px;
  width: 0%; /* 초기 너비는 0으로 설정 */
  border-radius: 8px;
  background: #474747;
  position: absolute;
  margin: 3px;
  display: inline-block;
  /* animation 속성은 로직과 충돌할 수 있으므로 제거 */
}
#htmlprogressload{ /* CSS 선택자 오타 수정 (load -> htmlprogressload) */
  font-family: Arial;
  font-weight: bold;
  text-align: center;
  position: relative; /* 텍스트가 바 위에 올바르게 표시되도록 수정 */
  color: white;
  line-height: 26px; /* 수직 중앙 정렬 */
  text-shadow: 1px 1px 2px black; /* 텍스트 가독성 향상 */
}
`;