import { Icons } from "@Glibs/types/icontypes";

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
 */
export class SelectionPanel {
    private container: HTMLElement;
    private content: HTMLElement;

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
        this.render(data);
    }

    hide() {
        this.container.style.display = "none";
    }

    private render(data: ISelectionData) {
        this.content.innerHTML = "";

        // 1. 왼쪽 정보 영역 (약 65% 차지)
        const infoArea = document.createElement("div");
        infoArea.style.flex = "6.5";
        infoArea.style.padding = "0 20px 0 10px";
        infoArea.style.display = "flex";
        infoArea.style.flexDirection = "column";
        infoArea.style.justifyContent = "center";
        
        const levelText = data.level !== undefined ? ` <span style="color:#a0aec0; font-size:0.8em;">Lv.${data.level}</span>` : "";
        infoArea.innerHTML = `<h3 style="margin: 0; color: #63b3ed; font-weight:600; font-size:1.4em;">${data.title}${levelText}</h3>`;
        
        if (data.hp) {
            infoArea.innerHTML += `
                <div style="margin-top: 15px;">
                    <div style="display:flex; justify-content:space-between; font-size: 11px; margin-bottom: 5px; color:#cbd5e0;">
                        <span>${data.status || "STATUS"}</span>
                        <span>HP: ${Math.floor(data.hp.current)} / ${data.hp.max}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #2d3748; border-radius: 4px; overflow: hidden; border:1px solid #1a202c; position:relative;">
                        <div style="width: ${(data.hp.current / data.hp.max) * 100}%; height: 100%; background: linear-gradient(90deg, #48bb78, #38a169); transition: width 0.2s;"></div>
                        ${data.progress !== undefined ? `<div style="position:absolute; top:0; left:0; width:${data.progress * 100}%; height:100%; background:rgba(236,201,75,0.4); box-shadow:0 0 10px #ecc94b;"></div>` : ""}
                    </div>
                </div>
            `;
        }
        
        infoArea.innerHTML += `<p style="font-size: 14px; color: #a0aec0; margin-top: 15px; line-height:1.5; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${data.description || ""}</p>`;

        // 2. 오른쪽 커맨드 영역 (약 35% 차지, 3x3 Grid)
        const commandArea = document.createElement("div");
        commandArea.style.flex = "3.5";
        commandArea.style.display = "grid";
        commandArea.style.gridTemplateColumns = "repeat(3, 1fr)";
        commandArea.style.gridTemplateRows = "repeat(3, 1fr)"; // [추가] 3행 균등 배분
        commandArea.style.gap = "6px";
        commandArea.style.paddingLeft = "20px";
        commandArea.style.borderLeft = "1px solid #2d3748";
        commandArea.style.height = "100%"; // [추가] 부모 높이 꽉 채우기

        data.commands.forEach(cmd => {
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
            
            // 아이콘(이모지) 추가
            const iconHtml = cmd.icon ? `<span style="font-size: 20px; margin-bottom: 4px;">${cmd.icon}</span>` : "";
            btn.innerHTML = `${iconHtml}<span style="text-align:center; word-break:keep-all;">${cmd.name}</span>`;
            
            if (cmd.shortcut) {
                const s = document.createElement("span");
                s.style.cssText = "position:absolute; top:3px; right:5px; font-size:9px; color:#ecc94b; font-weight:bold; opacity:0.8;";
                s.innerText = cmd.shortcut;
                btn.appendChild(s);
            }

            const disabled = cmd.isDisabled?.() || false;
            if (disabled) {
                btn.style.opacity = "0.2";
                btn.style.cursor = "not-allowed";
                btn.style.filter = "grayscale(1)";
            } else {
                btn.onclick = (e) => { e.stopPropagation(); cmd.onClick(); };
                btn.onmouseover = () => { 
                    btn.style.background = "#2d3748"; 
                    btn.style.borderColor = "#63b3ed";
                    btn.style.transform = "translateY(-2px)";
                };
                btn.onmouseout = () => { 
                    btn.style.background = "#1a202c"; 
                    btn.style.borderColor = "#4a5568";
                    btn.style.transform = "translateY(0)";
                };
            }
            commandArea.appendChild(btn);
        });

        this.content.appendChild(infoArea);
        this.content.appendChild(commandArea);
    }
}
