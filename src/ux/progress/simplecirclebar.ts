// ProgressBar.ts

import { GUX, IGUX } from "../gux";
import { IProgressBar } from "../loading/loadingmgr";

interface Preset {
    color: string;
    bgColor: string;
    thickness: number;
}

// 설정 객체의 타입을 정의합니다.
interface ProgressBarSettings {
    size: number;
    thickness: number;
    color: string;
    bgColor: string;
    textColor: string;
    initialProgress: number;
    preset?: string; // 프리셋 선택 옵션
    positionX?: number; // X 위치 (퍼센트)
    positionY?: number; // Y 위치 (퍼센트)
}

export class SimpleCircleProgressBar extends GUX implements IProgressBar {
    get Dom() {
        return this.container
    }
    // 클래스 내부에 프리셋을 내장합니다.
    private static presets: Record<string, Preset> = {
        'Fire':     { color: '#ff4800', bgColor: '#8b0000', thickness: 10 },
        'Ice':      { color: '#00d5ff', bgColor: '#005f73', thickness: 6 },
        'Leaf':     { color: '#70e000', bgColor: '#004b23', thickness: 12 },
        'Sunshine': { color: '#ffca3a', bgColor: '#ff8c00', thickness: 15 },
        'Ocean':    { color: '#4361ee', bgColor: '#00123e', thickness: 8 },
        'Cosmic':   { color: '#c77dff', bgColor: '#3c096c', thickness: 9 },
        'Monochrome': { color: '#f8f9fa', bgColor: '#343a40', thickness: 10 },
        // Rainbow는 특수 처리되므로 기본 색상만 정의합니다.
        'Rainbow':  { color: '#ff0000', bgColor: '#444444', thickness: 10 },
    };

    // DOM 요소 참조
    private container: HTMLElement;
    private progressContainer?: HTMLDivElement;
    private svg?: SVGSVGElement;
    private circleBg?: SVGCircleElement;
    private circle?: SVGCircleElement;
    private text?: HTMLSpanElement;
    
    // 설정과 상태
    private settings: Omit<ProgressBarSettings, 'preset'>;
    private currentProgress: number;
    private targetProgress: number;
    private animationFrameId?: number;
    
    // 무지개 프리셋을 위한 상태
    private isRainbow: boolean = false;
    private rainbowHue: number = 0;
    private isCreated: boolean = false;

    constructor(initialSettings: Partial<ProgressBarSettings> = {}) {
        super()
        this.container = document.createElement('div');

        // 프리셋 설정 적용
        const presetName = initialSettings.preset;
        const presetSettings = presetName && SimpleCircleProgressBar.presets[presetName] 
            ? SimpleCircleProgressBar.presets[presetName] 
            : {};

        // 기본 -> 프리셋 -> 사용자 설정 순서로 설정을 병합합니다.
        this.settings = {
            size: 100,
            thickness: 12,
            color: '#3498db',
            bgColor: '#ecf0f1',
            textColor: '#ecf0f1',
            initialProgress: 0,
            positionX: 50, // 기본값: 중앙
            positionY: 50, // 기본값: 중앙
            ...presetSettings,
            ...initialSettings
        };
        
        this.currentProgress = this.settings.initialProgress;
        this.targetProgress = this.settings.initialProgress;

        // 무지개 프리셋인지 확인
        if (presetName === 'Rainbow') {
            this.isRainbow = true;
        }
        
        // this.createDOM();
    }

    public SetProgress(progress: number): void {
        this.targetProgress = Math.max(0, Math.min(100, progress));
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    private animate = (): void => {
        // 무지개 효과 적용
        if (this.isRainbow) {
            this.rainbowHue = (this.rainbowHue + 1) % 360;
            const rainbowColor = `hsl(${this.rainbowHue}, 100%, 60%)`;
            this.circle?.setAttribute('stroke', rainbowColor);
        }

        const difference = this.targetProgress - this.currentProgress;
        if (Math.abs(difference) < 0.1) {
            this.currentProgress = this.targetProgress;
            this.updateVisuals();
            return;
        }

        this.currentProgress += difference * 0.1;
        this.updateVisuals();
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    private updateVisuals(): void {
        const radius = (this.settings.size / 2) - (this.settings.thickness / 2);
        const circumference = 2 * Math.PI * radius;
        
        const offset = circumference - (this.currentProgress / 100) * circumference;
        if (this.circle) this.circle.style.strokeDashoffset = `${offset}`;
        
        if (this.text) this.text.textContent = `${Math.round(this.currentProgress)}%`;
    }
    AddChild(dom: IGUX, ...param: any): void { }
    RenderHTML(...param: any): void { 
        this.Create()
    }
    Show(): void {
        this.container.style.display = 'block';
    }
    Hide(): void {
        this.container.style.display = 'none';
    }
    Delete() {
        if (this.progressContainer) this.container.removeChild(this.progressContainer)
    }
    // ProgressBar.ts (Create 메서드만 수정)

    Create(): void {
        if (this.isCreated) return;

        this.container.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        this.progressContainer = document.createElement('div');
        
        // <<< 수정 1: Flexbox 대신 Grid를 사용하여 자식 요소들을 겹치고 중앙 정렬 >>>
        this.progressContainer.style.cssText = `
            position: absolute;
            left: ${this.settings.positionX}%;
            top: ${this.settings.positionY}%;
            transform: translate(-50%, -50%); /* 요소의 중앙이 지정한 위치에 오도록 보정 */
            width: ${this.settings.size}px;
            height: ${this.settings.size}px;
            display: grid; 
            place-items: center; /* 모든 자식(item)을 중앙에 배치 */
            font-family: sans-serif;
            font-weight: bold;
        `;
        
        const svgNS = "http://www.w3.org/2000/svg";
        this.svg = document.createElementNS(svgNS, 'svg');
        // ... (SVG 속성 설정은 이전과 동일)
        this.svg.setAttribute('width', `${this.settings.size}`);
        this.svg.setAttribute('height', `${this.settings.size}`);

        // <<< 수정 2: Grid의 자식 요소들은 자동으로 겹쳐지므로 col/row를 지정 >>>
        // SVG와 text가 모두 grid의 첫 번째 칸(1,1)을 차지하게 되어 완벽히 겹쳐집니다.
        this.svg.style.gridColumn = '1 / 1';
        this.svg.style.gridRow = '1 / 1';
        
        // ... (circle, circleBg 생성 코드는 이전과 동일)
        const radius = (this.settings.size / 2) - (this.settings.thickness / 2);
        const cx = this.settings.size / 2;
        [this.circleBg, this.circle] = [document.createElementNS(svgNS, 'circle'), document.createElementNS(svgNS, 'circle')];
        [this.circleBg, this.circle].forEach(c => {
            c.setAttribute('fill', 'transparent'); c.setAttribute('cx', `${cx}`);
            c.setAttribute('cy', `${cx}`); c.setAttribute('r', `${radius}`);
            c.setAttribute('stroke-width', `${this.settings.thickness}`);
        });
        this.circleBg.setAttribute('stroke', this.settings.bgColor);
        this.circle.setAttribute('stroke', this.settings.color);
        this.circle.style.transform = 'rotate(-90deg)';
        this.circle.style.transformOrigin = '50% 50%';
        const circumference = 2 * Math.PI * radius;
        this.circle.style.strokeDasharray = `${circumference} ${circumference}`;


        this.text = document.createElement('span');
        this.text.style.color = this.settings.textColor;
        this.text.style.fontSize = `${this.settings.size / 5}px`;

        // <<< 수정: transform 속성을 추가하여 텍스트 위치 미세 조정 >>>
        this.text.style.transform = 'translateY(-20%)'; 
        
        // <<< 수정 3: 불필요해진 position: absolute 제거 및 Grid 위치 지정 >>>
        this.text.style.gridColumn = '1 / 1';
        this.text.style.gridRow = '1 / 1';
        

        this.svg.appendChild(this.circleBg);
        this.svg.appendChild(this.circle);
        this.progressContainer.appendChild(this.svg);
        this.progressContainer.appendChild(this.text);
        this.container.appendChild(this.progressContainer);

        this.updateVisuals();
        
        this.isCreated = true;
    }
}
