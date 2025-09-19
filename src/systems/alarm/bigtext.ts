
// QuestAnimator.ts

// 애니메이션 설정을 위한 타입 정의
export interface QuestAnimationConfig {
    text?: string;
    fontSize?: string;
    fontStyle?: string; // 추가
    textColor?: string;
    shadowColor?: string;
    fadeInTime?: number;
    stayTime?: number;
    fadeOutTime?: number;
    effect?: 'simple' | 'slide' | 'focus' | 'epic' | 'typing';
}

const Default: Required<QuestAnimationConfig> = {
    text: '',
    fontStyle: `'Batang', serif`,
    fontSize: '60px',
    textColor: '#ffd700',
    shadowColor: '#ffc400',
    fadeInTime: 1.5,
    stayTime: 1,
    fadeOutTime: 0.8,
    effect: 'focus',
}

export class QuestAnimator {
    private questTitleElement: HTMLElement;
    private isAnimating: boolean = false;

    constructor(elementId: string) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with id "${elementId}" not found.`);
        }
        this.questTitleElement = element;
    }

    /**
     * 퀘스트 애니메이션을 설정 객체를 받아 실행합니다.
     * @param config - QuestAnimationConfig 타입의 설정 객체
     */
    public show(_config: QuestAnimationConfig): void {
        const config = { ...Default, ..._config }
        if (this.isAnimating) return;
        this.isAnimating = true;

        // 상태 초기화 및 기본 스타일 적용
        this.prepareElement(config);

        // 타이핑 효과는 별도 함수로 처리
        if (config.effect === 'typing') {
            this.runTypingEffect(config);
            return;
        }

        // 애니메이션 시작
        this.triggerAnimation(config);

        // 사라지기 로직
        setTimeout(() => {
            this.fadeOut(config.fadeOutTime);
        }, (config.fadeInTime + config.stayTime) * 1000);

        // 애니메이션 플래그 초기화
        setTimeout(() => {
            this.isAnimating = false;
        }, (config.fadeInTime + config.stayTime + config.fadeOutTime) * 1000);
    }

    /**
     * 애니메이션 시작 전 엘리먼트의 상태를 준비합니다.
     */
    private prepareElement(config: QuestAnimationConfig): void {
        const el = this.questTitleElement;
        el.textContent = config.text ?? "error";
        el.style.position = "absolute";
        el.style.fontSize = config.fontSize ?? Default.fontSize;
        el.style.color = config.textColor ?? "";
        el.style.setProperty('--shadow-color', config.shadowColor ?? "");
        el.style.textShadow = `0 0 5px rgba(0, 0, 0, 0.7), 0 0 15px ${config.shadowColor}`;
        el.style.animation = 'none';
        el.style.transition = 'none';
        el.className = '';
        el.style.opacity = ''; // 인라인 opacity 스타일 제거

        // [수정] 폰트 스타일 적용
        el.style.fontFamily = config.fontStyle ?? Default.fontStyle;
        
        // [수정] 자동 크기 조절 로직 호출
        this.autoResizeFont(config.fontSize ?? Default.fontSize);
    }

    /**
     * [신규] 텍스트가 화면 너비를 벗어나지 않도록 글꼴 크기를 자동으로 조절합니다.
     */
    private autoResizeFont(initialFontSize: string): void {
        const el = this.questTitleElement;
        // 화면 너비의 90%를 최대 너비로 설정
        const maxWidth = window.innerWidth * 0.9;

        let currentFontSize = parseFloat(initialFontSize);
        el.style.fontSize = `${currentFontSize}px`;

        // 텍스트 너비가 최대 너비보다 크고, 폰트 크기가 10px보다 클 경우 반복
        while (el.scrollWidth > maxWidth && currentFontSize > 10) {
            currentFontSize--; // 폰트 크기를 1px씩 줄임
            el.style.fontSize = `${currentFontSize}px`;
        }
    }

    
    /**
     * 애니메이션을 트리거합니다.
     */
    private triggerAnimation(config: QuestAnimationConfig): void {
        const el = this.questTitleElement;
        el.classList.add(`effect-${config.effect}`);

        setTimeout(() => {
            if (config.effect === 'epic') {
                el.style.animation = `epic-glow-animation ${config.fadeInTime}s ease-out forwards`;
            } else {
                const properties = 'opacity, transform, filter';
                el.style.transition = `${properties} ${config.fadeInTime}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            }
            el.classList.add('show');
        }, 20);
    }
    
    /**
     * 페이드아웃 효과를 실행합니다.
     */
    private fadeOut(fadeOutTime: number): void {
        const el = this.questTitleElement;
        el.style.transition = `opacity ${fadeOutTime}s cubic-bezier(0.55, 0.06, 0.68, 0.19)`;
        el.style.opacity = '0';
    }

    /**
     * 타이핑 효과를 위한 별도 로직
     */
    private runTypingEffect(config: QuestAnimationConfig): void {
        const el = this.questTitleElement;
        el.innerHTML = '';
        el.classList.add('effect-typing');
        el.style.opacity = '1';

        const characters = config.text!.split('');
        const typingSpeed = (config.fadeInTime! * 1000) / characters.length;

        characters.forEach((char, index) => {
            setTimeout(() => {
                const span = document.createElement('span');
                span.className = 'letter';
                span.textContent = char === ' ' ? '\u00A0' : char; // 공백 문자 처리
                el.appendChild(span);
            }, index * typingSpeed);
        });

        const totalTypingTime = characters.length * typingSpeed;

        setTimeout(() => {
            this.fadeOut(config.fadeOutTime!);
        }, totalTypingTime + (config.stayTime! * 1000));
        
        setTimeout(() => {
            this.isAnimating = false;
            el.innerHTML = '';
        }, totalTypingTime + (config.stayTime! * 1000) + (config.fadeOutTime! * 1000));
    }
}