import { GUX, IGUX } from "../../gux";

export type HudArea = 'left' | 'right';

export interface MenuAddParams {
  id: string;
  area: HudArea;
  line?: number; // default 0
  item: IGUX;
}

type AreaStruct = { 
  container: HTMLElement; 
  lines: Map<number, { el: HTMLElement; items: Array<{ id: string; item: IGUX }> }> 
};

export interface HudHandles {
  root: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
}

/** 좌/우 + 라인 규칙을 관리하는 통합 배치기 */
export class SoulMenuGroup extends GUX {
  Dom: HTMLElement;
  private areas: Record<HudArea, AreaStruct>;
  private items = new Map<string, { area: HudArea; line: number; item: IGUX }>();
  
  // 라인별 커스텀 그리드 비율 저장소 (Key: "area:line", Value: css value)
  private ratios = new Map<string, string>();

  constructor(parent?: HTMLElement, param?: any) {
    super();
    const { root, left, right } = this.createHud(parent);
    this.Dom = root;
    this.areas = {
      left: { container: left, lines: new Map() },
      right: { container: right, lines: new Map() }
    };
  }

  Show(): void { this.Dom.style.display = ''; }
  Hide(): void { this.Dom.style.display = 'none'; }
  
  /** IGUX 호환용 */
  AddChild(item: IGUX, b: { id: string; area: HudArea; line: number }): void { 
    this.add({ id: b.id, area: b.area, line: b.line, item });
  }

  createHud(mount?: HTMLElement): HudHandles {
    this.applyDynamicStyle('ghud-base-style', BASE_CSS);

    const parent = mount ?? document.body;
    let root = document.getElementById('ghud-root') as HTMLElement | null;
    if (!root) root = this.injectHTML(parent, ROOT_HTML) as HTMLElement;

    const left = root.querySelector('#ghud-left') as HTMLElement;
    const right = root.querySelector('#ghud-right') as HTMLElement;

    return { root, left, right };
  }

  /**
   * 특정 라인의 그리드 비율을 수동으로 설정합니다.
   * @param area 영역 ('left' | 'right')
   * @param line 라인 번호
   * @param ratio CSS grid-template-columns 값 (예: "max-content 1fr", "100px auto")
   */
  setLineRatio(area: HudArea, line: number, ratio: string) {
    this.ratios.set(`${area}:${line}`, ratio);
    const A = this.areas[area];
    // 이미 해당 라인이 존재하면 즉시 레이아웃 갱신
    if (A && A.lines.has(line)) {
      this.layoutLine(area, line);
    }
  }

  add({ id, area, line = 0, item }: MenuAddParams): IGUX {
    const A = this.areas[area];
    if (!A) throw new Error(`Unknown area: ${area}`);

    // 기존에 같은 ID가 있다면 제거 (중복 방지)
    if (this.items.has(id)) {
      this.remove(id);
    }

    const box = this.ensureLine(A, line);
    box.items.push({ id, item });
    box.el.appendChild(item.Dom);
    
    this.items.set(id, { area, line, item });
    this.layoutLine(area, line);
    
    return item;
  }

  setLine(id: string, newLine: number): void {
    const rec = this.items.get(id); if (!rec) return;
    const oldAreaName = rec.area;
    const A = this.areas[oldAreaName];
    
    // 이전 라인에서 제거
    const oldBox = A.lines.get(rec.line);
    if (oldBox) {
      const i = oldBox.items.findIndex(v => v.id === id);
      if (i >= 0) oldBox.items.splice(i, 1);
      this.layoutLine(oldAreaName, rec.line);
    }

    // 새 라인에 추가
    const newBox = this.ensureLine(A, newLine);
    newBox.items.push({ id, item: rec.item });
    newBox.el.appendChild(rec.item.Dom);
    
    rec.line = newLine;
    this.layoutLine(oldAreaName, newLine);
  }

  remove(id: string): void {
    const rec = this.items.get(id); if (!rec) return;
    const areaName = rec.area;
    const A = this.areas[areaName];
    const box = A.lines.get(rec.line);
    
    if (box) {
      box.items = box.items.filter(v => v.id !== id);
      rec.item.Dom.remove();
      this.layoutLine(areaName, rec.line);
    }
    this.items.delete(id);
  }

  relayoutAll(): void {
    (Object.keys(this.areas) as HudArea[]).forEach(areaName => {
      const A = this.areas[areaName];
      for (const ln of A.lines.keys()) {
        this.layoutLine(areaName, ln);
      }
    });
  }

  private ensureLine(A: AreaStruct, line: number) {
    if (A.lines.has(line)) return A.lines.get(line)!;
    
    const el = document.createElement('div');
    el.className = 'ghud-line';

    // line 오름차순으로 DOM 삽입
    const entries = [...A.lines.entries()].sort((a, b) => a[0] - b[0]);
    let inserted = false;
    for (const [ln, obj] of entries) {
      if (line < ln) { A.container.insertBefore(el, obj.el); inserted = true; break; }
    }
    if (!inserted) A.container.appendChild(el);

    const box = { el, items: [] as Array<{ id: string; item: IGUX }> };
    A.lines.set(line, box);
    return box;
  }

  private layoutLine(areaName: HudArea, line: number) {
    const A = this.areas[areaName];
    const box = A.lines.get(line); if (!box) return;
    
    const vis = box.items.filter(v => v.item.isVisible());
    const n = vis.length;
    
    // 커스텀 비율 확인
    const customRatio = this.ratios.get(`${areaName}:${line}`);

    box.el.classList.toggle('ghud-line-one', n === 1);
    
    if (n > 0) {
      if (customRatio) {
        // 사용자 지정 비율 적용
        box.el.style.gridTemplateColumns = customRatio;
      } else {
        // 기본값: N등분
        box.el.style.gridTemplateColumns = n > 1 ? `repeat(${n}, 1fr)` : `1fr`;
      }
      box.el.style.display = '';
      
      // 아이템에 레이아웃 업데이트 알림
      vis.forEach((v, i) => v.item.onLayout?.(i, n));
    } else {
      box.el.style.display = 'none';
    }
  }
}

const BASE_CSS = `
:root{ --ghud-ui-fg:#e9edf3; --ghud-buff-size:40px; }
#ghud-root{ color:var(--ghud-ui-fg); font-family:system-ui,-apple-system,Segoe UI,Roboto,Pretendard,Apple SD Gothic Neo,Arial,sans-serif; pointer-events:none; }
#ghud-root * { pointer-events:auto; }
#ghud-status{ position:fixed; left:0; right:0; top:10px; z-index:0; padding:0 12px; filter: drop-shadow(0 10px 24px rgba(0,0,0,.35)); container-type:inline-size; }
#ghud-status .ghud-status-grid{ display:grid; gap:8px; grid-template-columns:1fr; align-items:start; }

/* 반응형 그리드 */
@container (min-width: 860px){
  #ghud-status .ghud-status-grid{ grid-template-columns:max-content 1fr; }
  #ghud-left{ grid-column:1; justify-self:start; min-width:360px; max-width:960px; }
  #ghud-right{ grid-column:2; }
}
@supports not (container-type:inline-size){
  @media (min-width: 860px){
    #ghud-status .ghud-status-grid{ grid-template-columns:max-content 1fr; }
    #ghud-left{ grid-column:1; justify-self:start; min-width:360px; max-width:960px; }
    #ghud-right{ grid-column:2; }
  }
}

#ghud-left, #ghud-right{ display:grid; gap:8px; }
.ghud-line{ display:grid; gap:8px; align-items:stretch; transition: grid-template-columns 0.2s ease; }
.ghud-line.ghud-line-one > *{ grid-column: 1 / -1; }

@container (max-width: 859px){
  #ghud-right .ghud-buffs{ justify-content:flex-start !important; }
}
@supports not (container-type:inline-size){
  @media (max-width: 859px){
    #ghud-right .ghud-buffs{ justify-content:flex-start !important; }
  }
}
`;

const ROOT_HTML = `
<div id="ghud-root">
  <div id="ghud-status" aria-label="상태 표시줄">
    <div class="ghud-status-grid">
      <div id="ghud-left"></div>
      <div id="ghud-right"></div>
    </div>
  </div>
</div>
`;