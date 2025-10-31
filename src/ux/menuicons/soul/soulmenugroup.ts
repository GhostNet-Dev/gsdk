import { GUX, IGUX } from "../../gux";

export type HudArea = 'left' | 'right';

export interface MenuAddParams {
  id: string;
  area: HudArea;
  line?: number; // default 0
  item: IGUX;
}

type AreaStruct = { container: HTMLElement; lines: Map<number, { el: HTMLElement; items: Array<{ id: string; item: IGUX }> }> };

export interface HudHandles {
  root: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
}

/** HUD 루트 + 좌/우 그리드 생성 */

/** 좌/우 + 라인 규칙을 관리하는 통합 배치기 */
export class SoulMenuGroup extends GUX {
  Dom: HTMLElement
  private areas: Record<HudArea, AreaStruct>;
  private items = new Map<string, { area: HudArea; line: number; item: IGUX }>();

  constructor(parent?: HTMLElement, param?: any) {
    super()
    const { root, left, right } = this.createHud(parent)
    this.Dom = root
    this.areas = {
      left: { container: left, lines: new Map() },
      right: { container: right, lines: new Map() }
    };
  }
  Show(): void { }
  Hide(): void { }
  AddChild(item: IGUX, b: { id: string; area: HudArea; line: number }): void { 
    this.add({ id: b.id, area: b.area, line: b.line, item })
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

  add({ id, area, line = 0, item }: MenuAddParams): IGUX {
    const A = this.areas[area];
    if (!A) throw new Error(`Unknown area: ${area}`);
    const box = this.ensureLine(A, line);
    box.items.push({ id, item });
    box.el.appendChild(item.Dom);
    this.items.set(id, { area, line, item });
    this.layoutLine(A, line);
    return item;
  }

  setLine(id: string, newLine: number): void {
    const rec = this.items.get(id); if (!rec) return;
    const A = this.areas[rec.area];
    const old = A.lines.get(rec.line);
    if (old) {
      const i = old.items.findIndex(v => v.id === id);
      if (i >= 0) old.items.splice(i, 1);
      this.layoutLine(A, rec.line);
    }
    const box = this.ensureLine(A, newLine);
    box.items.push({ id, item: rec.item });
    box.el.appendChild(rec.item.Dom);
    rec.line = newLine;
    this.layoutLine(A, newLine);
  }

  remove(id: string): void {
    const rec = this.items.get(id); if (!rec) return;
    const A = this.areas[rec.area];
    const box = A.lines.get(rec.line);
    if (box) {
      box.items = box.items.filter(v => v.id !== id);
      rec.item.Dom.remove();
      this.layoutLine(A, rec.line);
    }
    this.items.delete(id);
  }

  relayoutAll(): void {
    (Object.values(this.areas) as AreaStruct[]).forEach(A => {
      for (const ln of A.lines.keys()) this.layoutLine(A, ln);
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

  private layoutLine(A: AreaStruct, line: number) {
    const box = A.lines.get(line); if (!box) return;
    const vis = box.items.filter(v => v.item.isVisible());
    const n = vis.length;

    box.el.classList.toggle('ghud-line-one', n === 1);
    box.el.style.gridTemplateColumns = n > 1 ? `repeat(${n}, 1fr)` : `1fr`;
    vis.forEach((v, i) => v.item.onLayout?.(i, n));
    box.el.style.display = n > 0 ? '' : 'none';
  }
}

const BASE_CSS = `
:root{ --ghud-ui-fg:#e9edf3; --ghud-buff-size:40px; }
#ghud-root{ color:var(--ghud-ui-fg); font-family:system-ui,-apple-system,Segoe UI,Roboto,Pretendard,Apple SD Gothic Neo,Arial,sans-serif; }
#ghud-status{ position:fixed; left:0; right:0; top:10px; z-index:0; padding:0 12px; filter: drop-shadow(0 10px 24px rgba(0,0,0,.35)); container-type:inline-size; }
#ghud-status .ghud-status-grid{ display:grid; gap:8px; grid-template-columns:1fr; align-items:start; }
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
.ghud-line{ display:grid; gap:8px; align-items:stretch; }
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
