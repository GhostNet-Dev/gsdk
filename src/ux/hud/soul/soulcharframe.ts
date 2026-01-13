import { GUX, IGUX } from "../../gux";

// BuffStatus와 호환되는 아이콘 정의 타입
export type IconDef =
  | string
  | { type: 'img'; src: string; alt?: string }
  | { type: 'gfont'; name: string }
  | { type: 'text'; value: string }
  | { type: 'svgInline'; value: string };

export interface CharFrameOptions {
  name?: string;
  level?: number;
  icon?: IconDef;        // 이미지, 이모지, 폰트 아이콘 등 지원
  visible?: boolean;
  onClick?: (e: MouseEvent) => void; // 클릭 콜백
}

/** 캐릭터 초상화 및 레벨 표시 모듈 (클릭 상호작용 포함) */
export class SoulCharacterFrame extends GUX implements IGUX {
  get Dom() { return this.root; }
  private root: HTMLDivElement;
  private elFaceBox: HTMLElement;
  private elLevel: HTMLElement;
  private elName: HTMLElement;

  private _level: number = 1;
  private _clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(opt: CharFrameOptions = {}) {
    super();
    this.applyDynamicStyle('ghud-char-style', CHAR_CSS);

    this._level = opt.level ?? 1;

    // 루트 요소 생성
    this.root = document.createElement('div');
    this.root.className = 'ghud-char-frame';
    
    // HTML 구조 주입
    this.root.innerHTML = `
      <div class="ghud-char-avatar-wrap">
        <div class="ghud-char-img-box">
           <div class="ghud-face-content"></div>
           <div class="ghud-click-overlay"></div>
        </div>
        <div class="ghud-char-lvl-badge">
          <span class="ghud-lvl-label">Lv.</span>
          <b class="ghud-lvl-val">${this._level}</b>
        </div>
      </div>
      <div class="ghud-char-name-tag"></div>
    `;

    // 요소 참조 캐싱
    this.elFaceBox = this.root.querySelector('.ghud-face-content') as HTMLElement;
    this.elLevel = this.root.querySelector('.ghud-lvl-val') as HTMLElement;
    this.elName = this.root.querySelector('.ghud-char-name-tag') as HTMLElement;

    // 이벤트 리스너 등록
    this.root.addEventListener('click', (e) => {
      if (this._clickHandler) {
        e.stopPropagation(); // 이벤트 전파 방지 (게임 월드 클릭 방지)
        this._clickHandler(e);
      }
    });

    // 초기값 설정
    this.setName(opt.name || 'Unknown');
    if (opt.icon) this.setIcon(opt.icon);
    if (opt.onClick) this.setOnClick(opt.onClick);
    if (opt.visible === false) this.Hide();
  }

  // --- Public Methods ---

  getEl(): HTMLElement { return this.root; }
  
  isVisible(): boolean { return this.visible; }
  
  Show(): void { 
    this.visible = true; 
    this.root.style.display = ''; 
  }
  
  Hide(): void { 
    this.visible = false; 
    this.root.style.display = 'none'; 
  }

  setVisible(v: boolean): void { v ? this.Show() : this.Hide(); }

  /** 레벨 변경 */
  setLevel(lv: number) {
    this._level = lv;
    this.elLevel.textContent = String(this._level);
    // 레벨업 시 깜빡임 효과
    this.triggerUpdateAnim(this.elLevel.parentElement!);
  }

  /** 캐릭터 이름 변경 */
  setName(name: string) {
    this.elName.textContent = name;
  }

  /** * 아이콘/이미지/이모지 설정 
   * - 문자열: URL이면 이미지, 아니면 텍스트(이모지)로 자동 판별
   * - 객체: { type: 'img' | 'text' | 'gfont' ... } 명시적 지정
   */
  setIcon(icon: IconDef) {
    this.elFaceBox.innerHTML = ''; // 기존 내용 초기화

    if (!icon) return;

    // 1. 문자열인 경우 (단순 텍스트 or URL 감지)
    if (typeof icon === 'string') {
      // http로 시작하거나 확장자/경로가 보이면 이미지로 간주
      if (icon.startsWith('http') || icon.includes('/') || icon.includes('.')) {
         this.renderImg(icon);
      } else {
         // 그 외엔 텍스트(이모지 등)로 처리
         this.renderText(icon);
      }
      return;
    }

    // 2. 객체 타입 처리
    switch (icon.type) {
        case 'img': this.renderImg(icon.src, icon.alt); break;
        case 'gfont': this.renderGFont(icon.name); break;
        case 'text': this.renderText(icon.value); break;
        case 'svgInline': this.elFaceBox.innerHTML = icon.value; break;
    }
  }

  /** * 클릭 콜백 설정 
   * @param fn 콜백 함수 (null 입력 시 클릭 비활성화)
   */
  setOnClick(fn: ((e: MouseEvent) => void) | null) {
    this._clickHandler = fn;
    // 클릭 가능하면 커서를 포인터로 변경 및 스타일 클래스 추가
    this.root.style.cursor = fn ? 'pointer' : '';
    this.root.classList.toggle('ghud-interactive', !!fn);
  }

  /** IGUX 구현체 (사용하지 않음) */
  AddChild(dom: IGUX, ...param: any): void {}
  RenderHTML(...param: any): void {}

  // --- Private Helpers ---

  private renderImg(src: string, alt: string = '') {
      const img = document.createElement('img');
      img.src = src; 
      img.alt = alt;
      img.className = 'ghud-char-face-img';
      this.elFaceBox.appendChild(img);
  }

  private renderText(text: string) {
      const span = document.createElement('span');
      span.textContent = text;
      span.style.fontSize = '32px'; // 이모지 크기
      span.style.lineHeight = '1';
      this.elFaceBox.appendChild(span);
  }

  private renderGFont(name: string) {
      const i = document.createElement('i');
      i.className = 'material-symbols-outlined'; // 구글 폰트 클래스 필요
      i.textContent = name;
      i.style.fontSize = '36px';
      i.style.color = '#fff';
      this.elFaceBox.appendChild(i);
  }

  private triggerUpdateAnim(el: HTMLElement) {
    el.classList.remove('ghud-anim-pop');
    void el.offsetWidth; // reflow 강제
    el.classList.add('ghud-anim-pop');
  }
}

const CHAR_CSS = `
.ghud-char-frame {
  /* [수정됨] 위치 보정 및 우선순위 최상위로 설정 */
  position: relative; 
  z-index: 50; /* 다른 요소(기본값 0~10)보다 높게 설정 */
  
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: max-content;
  user-select: none;
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 상호작용 스타일 */
.ghud-char-frame.ghud-interactive:active {
  transform: scale(0.95);
}
.ghud-char-frame.ghud-interactive:hover .ghud-char-img-box {
  border-color: rgba(255,255,255,0.6);
  box-shadow: 0 6px 16px rgba(0,0,0,0.6);
}

/* 아바타 영역 */
.ghud-char-avatar-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}

.ghud-char-img-box {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(0,0,0,0.3);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center; /* 아이콘/텍스트 중앙 정렬 */
  transition: all 0.2s ease;
}

.ghud-char-face-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 레벨 뱃지 */
.ghud-char-lvl-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: linear-gradient(135deg, #4f46e5, #000);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  padding: 2px 5px;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.6);
  font-size: 11px;
  line-height: 1;
  color: #fff;
  z-index: 2;
}

.ghud-lvl-label {
  font-size: 9px;
  opacity: 0.8;
  color: #a5b4fc;
}

.ghud-lvl-val {
  font-weight: 700;
  color: #fff;
}

/* 이름 태그 */
.ghud-char-name-tag {
  font-size: 12px;
  color: #e9edf3;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  font-weight: 600;
  background: rgba(0,0,0,0.4);
  padding: 2px 8px;
  border-radius: 99px;
  border: 1px solid rgba(255,255,255,0.1);
  min-height: 18px;
}

/* 애니메이션 */
@keyframes ghudPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); filter: brightness(1.5); }
  100% { transform: scale(1); }
}
.ghud-anim-pop {
  animation: ghudPop 0.3s ease-out;
}
`;