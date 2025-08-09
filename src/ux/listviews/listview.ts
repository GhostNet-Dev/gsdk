import { GUX, IGUX } from "../gux"


export default class ListView extends GUX {
    Dom = document.createElement("div")
    row = document.createElement("div")
    padding = ""
    margin = ""
    savedScrollPosition = 0
    isContainerVisible = false
    child: IGUX[] = []

    constructor({ height = "300px", bgColor = "#141827", padding = "p-0", margin = "m-0" } = {}) {
        super()
        this.padding = padding
        this.margin = margin
        this.Dom.classList.add("container", "rounded", "overflow-auto", "p-0")
        this.Dom.style.backgroundColor = bgColor
        this.Dom.style.height = height
        this.row.classList.add("d-flex", "flex-wrap", "justify-content-start")
        this.Dom.appendChild(this.row)

        const observer = new IntersectionObserver((e) => {
            e.forEach(element => {
                if (element.isIntersecting) {
                    const dom = element.target
                    this.SendEvent(dom.getBoundingClientRect().width)
                }
            });
        })
        observer.observe(this.Dom)

        // MutationObserver 인스턴스 생성
        const observer2 = new MutationObserver((mutationsList: MutationRecord[]) => {
            for (const mutation of mutationsList) {
                // 'style' 또는 'class' 속성 변경을 감지합니다.
                if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    // 변경 후의 현재 가시성 상태를 확인합니다.
                    const currentVisibility = this.Dom.offsetWidth > 0 || this.Dom.offsetHeight > 0 || this.Dom.getClientRects().length > 0;

                    // 가시성 상태가 변경되었는지 확인합니다.
                    if (currentVisibility !== this.isContainerVisible) {
                        if (!currentVisibility) { // 현재 숨겨진 상태가 되었을 때 (보임 -> 숨김)
                            // 숨겨지기 직전의 스크롤 위치를 저장합니다.
                            this.savedScrollPosition = this.Dom.scrollTop;
                            console.log('MutationObserver: 컨테이너가 숨겨졌습니다. 스크롤 위치 저장:', this.savedScrollPosition);
                        } else { // 현재 보이는 상태가 되었을 때 (숨김 -> 보임)
                            // 다시 보여질 때 저장된 스크롤 위치를 복원합니다.
                            if (this.savedScrollPosition > 0) { // 저장된 스크롤 위치가 있을 때만 복원
                                requestAnimationFrame(() => {
                                    this.Dom.scrollTop = this.savedScrollPosition;
                                    console.log('MutationObserver: 컨테이너가 다시 보여집니다. 스크롤 위치 복원:', this.savedScrollPosition);
                                    // 복원 후 savedScrollPosition을 초기화하여 다음 숨김 시 새로운 스크롤 위치를 저장하도록 합니다.
                                    // savedScrollPosition = 0; // 필요에 따라 주석 해제
                                });
                            }
                        }
                        // 가시성 상태를 업데이트합니다.
                        this.isContainerVisible = currentVisibility;
                    }
                }
            }
        });

        // 감시할 옵션 설정
        const observerConfig = {
            attributes: true, // 속성 변경 감지
            attributeFilter: ['style', 'class'], // 'style' 또는 'class' 속성만 필터링
            attributeOldValue: true // 이전 속성 값도 전달
        };
        // scrollContainer에 observer 연결
        observer2.observe(this.Dom, observerConfig);

        window.addEventListener("resize", () => {
            this.SendEvent(this.Dom.getBoundingClientRect().width)
        })
    }
    Show(): void {
    }
    Hide(): void {
    }
    RenderHTML(): void {
        this.SendEvent(this.Dom.getBoundingClientRect().width)
    }
    SendEvent(width: number) {
        this.child.forEach((e) => {
            e.RenderHTML(width)
        })
    }
    AddChild(dom: IGUX) {
        const col = document.createElement("div")
        col.classList.add(this.padding, this.margin)
        col.appendChild(dom.Dom)
        this.row.appendChild(col)
        this.child.push(dom)
    }
    RemoveChild() {
        while (this.row.firstChild) {
            this.row.removeChild(this.row.firstChild);
        }
        this.child = []
    }
}