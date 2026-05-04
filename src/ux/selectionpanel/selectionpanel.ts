/**
 * 하단 패널의 각 명령 버튼 정의
 */
export interface ICommand {
    id: string;
    name: string;
    icon?: string; // 이모지 또는 아이콘 텍스트
    shortcut?: string;
    tooltip?: string;
    onClick: () => void;
    isDisabled?: () => boolean;
}

/**
 * 선택된 객체가 패널에 전달할 데이터 구조
 */
export interface ISelectionData {
    title: string;
    description?: string;
    level?: number;
    hp?: { current: number; max: number };
    commands: ICommand[];
    status?: string; 
    progress?: number; 
}

/**
 * 화면 하단에 위치하여 선택된 대상의 정보와 명령을 표시하는 범용 패널 (2분할 레이아웃)
 * 성능 및 클릭 이벤트 유실 방지를 위해 DOM 재사용 방식으로 구현됨.
 */
export class SelectionPanel {
    private container: HTMLElement;
    private content: HTMLElement;

    // 캐싱할 DOM 요소들
    private lastTitle: string = "";
    private titleEl: HTMLElement | null = null;
    private descriptionEl: HTMLElement | null = null;
    private hpTextEl: HTMLElement | null = null;
    private hpFillEl: HTMLElement | null = null;
    private statusTextEl: HTMLElement | null = null;
    private progressFillEl: HTMLElement | null = null;
    private commandArea: HTMLElement | null = null;
    private buttons: Map<string, { btn: HTMLButtonElement, command: ICommand }> = new Map();

    constructor(parent: HTMLElement = document.body) {
        this.container = document.createElement("div");
        this.container.id = "bottom-selection-panel";
        this.container.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 95%;
            max-width: 800px;
            height: 180px;
            background: rgba(10, 15, 25, 0.95);
            border: 1px solid #4a5568;
            border-bottom: none;
            border-radius: 8px 8px 0 0;
            display: none;
            color: #e2e8f0;
            padding: 15px;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            z-index: 1000;
            user-select: none;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
            box-sizing: border-box;
        `;

        this.content = document.createElement("div");
        this.content.style.display = "flex";
        this.content.style.height = "100%";
        this.container.appendChild(this.content);

        parent.appendChild(this.container);
    }

    show(data: ISelectionData) {
        this.container.style.display = "block";
        
        // 타이틀이 바뀌거나 커맨드 개수가 다르면 전체 리렌더링 (구조적 변화)
        if (this.lastTitle !== data.title || this.buttons.size !== data.commands.length) {
            this.renderFull(data);
            this.lastTitle = data.title;
        } else {
            this.updateDynamic(data);
        }
    }

    hide() {
        this.container.style.display = "none";
        this.lastTitle = "";
    }

    private renderFull(data: ISelectionData) {
        this.content.innerHTML = "";
        this.buttons.clear();

        // 1. 왼쪽 정보 영역
        const infoArea = document.createElement("div");
        infoArea.style.flex = "6.5";
        infoArea.style.padding = "0 20px 0 10px";
        infoArea.style.display = "flex";
        infoArea.style.flexDirection = "column";
        infoArea.style.justifyContent = "center";

        this.titleEl = document.createElement("h3");
        this.titleEl.style.cssText = "margin: 0; color: #63b3ed; font-weight:600; font-size:1.4em;";
        infoArea.appendChild(this.titleEl);

        const hpContainer = document.createElement("div");
        hpContainer.style.marginTop = "15px";
        
        const hpLabels = document.createElement("div");
        hpLabels.style.cssText = "display:flex; justify-content:space-between; font-size: 11px; margin-bottom: 5px; color:#cbd5e0;";
        
        this.statusTextEl = document.createElement("span");
        this.hpTextEl = document.createElement("span");
        hpLabels.appendChild(this.statusTextEl);
        hpLabels.appendChild(this.hpTextEl);
        hpContainer.appendChild(hpLabels);

        const hpBarBg = document.createElement("div");
        hpBarBg.style.cssText = "width: 100%; height: 8px; background: #2d3748; border-radius: 4px; overflow: hidden; border:1px solid #1a202c; position:relative;";
        
        this.hpFillEl = document.createElement("div");
        this.hpFillEl.style.cssText = "height: 100%; background: linear-gradient(90deg, #48bb78, #38a169); transition: width 0.2s;";
        
        this.progressFillEl = document.createElement("div");
        this.progressFillEl.style.cssText = "position:absolute; top:0; left:0; height:100%; background:rgba(236,201,75,0.4); box-shadow:0 0 10px #ecc94b;";
        
        hpBarBg.appendChild(this.hpFillEl);
        hpBarBg.appendChild(this.progressFillEl);
        hpContainer.appendChild(hpBarBg);
        infoArea.appendChild(hpContainer);

        this.descriptionEl = document.createElement("p");
        this.descriptionEl.style.cssText = "font-size: 14px; color: #a0aec0; margin-top: 15px; line-height:1.5; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;";
        infoArea.appendChild(this.descriptionEl);

        // 2. 오른쪽 커맨드 영역
        this.commandArea = document.createElement("div");
        this.commandArea.style.cssText = "flex: 3.5; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 6px; padding-left: 20px; border-left: 1px solid #2d3748; height: 100%;";

        data.commands.forEach(cmd => {
            const btn = this.createCommandButton(cmd);
            this.commandArea!.appendChild(btn);
            this.buttons.set(cmd.id, { btn, command: cmd });
        });

        this.content.appendChild(infoArea);
        this.content.appendChild(this.commandArea);

        // 초기 데이터 채우기
        this.updateDynamic(data);
    }

    private createCommandButton(cmd: ICommand): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.style.cssText = `
            width: 100%;
            height: 100%;
            background: #1a202c;
            border: 1px solid #4a5568;
            color: #edf2f7;
            cursor: pointer;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 10px;
            position: relative;
            transition: all 0.15s;
            padding: 2px;
            overflow: hidden;
        `;
        
        const iconHtml = cmd.icon ? `<span style="font-size: 20px; margin-bottom: 4px; pointer-events: none;">${cmd.icon}</span>` : "";
        btn.innerHTML = `${iconHtml}<span style="text-align:center; word-break:keep-all; pointer-events: none;">${cmd.name}</span>`;
        
        if (cmd.shortcut) {
            const s = document.createElement("span");
            s.style.cssText = "position:absolute; top:3px; right:5px; font-size:9px; color:#ecc94b; font-weight:bold; opacity:0.8; pointer-events: none;";
            s.innerText = cmd.shortcut;
            btn.appendChild(s);
        }

        btn.onclick = (e) => { 
            e.stopPropagation(); 
            const isDisabled = cmd.isDisabled?.() || false;
            if (!isDisabled) cmd.onClick(); 
        };

        btn.onmouseover = () => { 
            if (!(cmd.isDisabled?.() || false)) {
                btn.style.background = "#2d3748"; 
                btn.style.borderColor = "#63b3ed";
                btn.style.transform = "translateY(-2px)";
            }
        };
        btn.onmouseout = () => { 
            btn.style.background = "#1a202c"; 
            btn.style.borderColor = "#4a5568";
            btn.style.transform = "translateY(0)";
        };

        return btn;
    }

    private updateDynamic(data: ISelectionData) {
        if (this.titleEl) {
            const levelText = data.level !== undefined ? ` <span style="color:#a0aec0; font-size:0.8em;">Lv.${data.level}</span>` : "";
            this.titleEl.innerHTML = `${data.title}${levelText}`;
        }
        if (this.descriptionEl) this.descriptionEl.innerText = data.description || "";
        
        if (data.hp) {
            if (this.hpTextEl) this.hpTextEl.innerText = `HP: ${Math.floor(data.hp.current)} / ${data.hp.max}`;
            if (this.hpFillEl) this.hpFillEl.style.width = `${(data.hp.current / data.hp.max) * 100}%`;
        }

        if (this.statusTextEl) this.statusTextEl.innerText = data.status || "STATUS";

        if (this.progressFillEl) {
            if (data.progress !== undefined) {
                this.progressFillEl.style.display = "block";
                this.progressFillEl.style.width = `${data.progress * 100}%`;
            } else {
                this.progressFillEl.style.display = "none";
            }
        }

        // 버튼 비활성화 상태 업데이트
        data.commands.forEach(cmd => {
            const btnEntry = this.buttons.get(cmd.id);
            if (btnEntry) {
                const disabled = cmd.isDisabled?.() || false;
                if (disabled) {
                    btnEntry.btn.style.opacity = "0.2";
                    btnEntry.btn.style.cursor = "not-allowed";
                    btnEntry.btn.style.filter = "grayscale(1)";
                } else {
                    btnEntry.btn.style.opacity = "1.0";
                    btnEntry.btn.style.cursor = "pointer";
                    btnEntry.btn.style.filter = "none";
                }
            }
        });
    }
}
