// ============================================================================
// views/skillslotsview.ts — 스킬 슬롯 할당 다이얼로그
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';
import type { LearnedSkillMessage as LearnedSkill } from '@Glibs/ux/skillslots/skillslots';

export type SkillSlotsViewProps = {
  learnedSkills: LearnedSkill[];
  currentSlots: Array<LearnedSkill | null>;
  maxSlots?: number;
  keyLabels?: string[];
  onConfirm?: (assignments: Array<LearnedSkill | null>) => void;
};

const DEFAULT_KEY_LABELS = ['Action5', 'Action6', 'Action7', 'Action8'];

const CSS_SKILL_SLOTS = css`
  :host { color: var(--gnx-ui-fg); }

  .ssv-wrap {
    display: grid;
    grid-template-columns: 1fr 260px;
    gap: 24px;
    align-items: start;
    min-height: 320px;
  }
  @media (max-width: 760px) {
    .ssv-wrap { grid-template-columns: 1fr; }
  }

  /* ── 왼쪽: 배운 스킬 목록 ── */
  .ssv-pool-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--gnx-ui-sub);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .ssv-pool {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 10px;
  }

  .ssv-skill-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 8px 4px;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
    cursor: grab;
    user-select: none;
    transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
    position: relative;
  }
  .ssv-skill-card:active { cursor: grabbing; }
  .ssv-skill-card[data-in-slot="true"] {
    opacity: 0.4;
    pointer-events: none;
  }
  .ssv-skill-card[data-dragging="true"] {
    opacity: 0.5;
  }
  .ssv-skill-card:hover:not([data-in-slot="true"]) {
    border-color: var(--gnx-ui-accent);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--gnx-ui-accent) 30%, transparent);
  }

  .ssv-skill-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(0,0,0,0.3);
    display: grid;
    place-items: center;
    font-size: 26px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .ssv-skill-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ssv-skill-name {
    font-size: 10px;
    color: var(--gnx-ui-sub);
    text-align: center;
    line-height: 1.3;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ssv-skill-level {
    font-size: 10px;
    color: #fde68a;
    font-weight: 700;
  }
  .ssv-empty-pool {
    grid-column: 1 / -1;
    color: var(--gnx-ui-sub);
    font-size: 13px;
    padding: 20px 0;
    text-align: center;
    opacity: 0.6;
  }

  /* ── 오른쪽: 슬롯 패널 ── */
  .ssv-slots-panel { display: flex; flex-direction: column; gap: 16px; }
  .ssv-slots-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--gnx-ui-sub);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .ssv-slots-list { display: flex; flex-direction: column; gap: 10px; }

  .ssv-slot {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 2px dashed rgba(255,255,255,0.15);
    border-radius: 14px;
    background: rgba(0,0,0,0.2);
    min-height: 68px;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .ssv-slot[data-drag-over="true"] {
    border-color: var(--gnx-ui-accent);
    background: color-mix(in oklab, var(--gnx-ui-accent) 8%, transparent);
  }
  .ssv-slot[data-filled="true"] {
    border-style: solid;
    border-color: rgba(255,255,255,0.22);
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
  }

  .ssv-slot-key {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.2);
    background: rgba(0,0,0,0.3);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--gnx-ui-sub);
    text-align: center;
    line-height: 1.2;
  }
  .ssv-slot-icon {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    border-radius: 10px;
    background: rgba(0,0,0,0.3);
    display: grid;
    place-items: center;
    font-size: 26px;
    overflow: hidden;
  }
  .ssv-slot-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ssv-slot-info { flex: 1; min-width: 0; }
  .ssv-slot-skill-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ssv-slot-skill-level {
    font-size: 11px;
    color: #fde68a;
    margin-top: 2px;
  }
  .ssv-slot-empty-hint {
    font-size: 12px;
    color: var(--gnx-ui-sub);
    opacity: 0.5;
  }
  .ssv-slot-clear {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid rgba(255,80,80,0.4);
    background: rgba(255,80,80,0.1);
    color: #ff8080;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.15s;
  }
  .ssv-slot-clear:hover { background: rgba(255,80,80,0.25); }
`;

export class SkillSlotsView implements IDialogView<SkillSlotsViewProps> {
  private ctx!: ViewContext;
  private props!: SkillSlotsViewProps;
  private shell!: any;
  private key?: string;

  private maxSlots = 4;
  private keyLabels: string[] = DEFAULT_KEY_LABELS;
  private assignments: Array<LearnedSkill | null> = [];

  private draggedSkill: LearnedSkill | null = null;

  mount(ctx: ViewContext, props: SkillSlotsViewProps) {
    this.ctx = ctx;
    this.props = props;
    this.shell = ctx.shell;

    this.maxSlots = props.maxSlots ?? 4;
    this.keyLabels = props.keyLabels ?? DEFAULT_KEY_LABELS;
    this.assignments = Array.from({ length: this.maxSlots }, (_, i) => props.currentSlots[i] ?? null);

    ctx.render.setTitle(this.shell, '스킬 슬롯 설정');
    ctx.render.setWide(this.shell, false);
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_SKILL_SLOTS, 'view:skill-slots');

    this.render();
  }

  update(next: SkillSlotsViewProps) {
    this.props = next;
    this.maxSlots = next.maxSlots ?? this.maxSlots;
    this.keyLabels = next.keyLabels ?? this.keyLabels;
    this.render();
  }

  unmount() {
    if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
  }

  private render() {
    const sr = this.shell.sr;
    this.shell.body.innerHTML = '';

    const wrap = createEl(sr, 'div');
    wrap.className = 'ssv-wrap';

    wrap.appendChild(this.buildPool(sr));
    wrap.appendChild(this.buildSlotsPanel(sr));

    this.shell.body.appendChild(wrap);

    this.ctx.render.setActions(this.shell, [
      {
        id: 'confirm',
        label: '확인',
        variant: 'accent',
        onClick: () => {
          this.props.onConfirm?.(this.assignments.slice());
          this.ctx.manager.close();
        },
      },
      {
        id: 'close',
        label: '닫기',
        onClick: () => this.ctx.manager.close(),
      },
    ]);
  }

  // ── 왼쪽: 배운 스킬 풀 ──────────────────────────────────────────────────
  private buildPool(sr: Document | ShadowRoot): HTMLElement {
    const doc = sr instanceof ShadowRoot ? sr.ownerDocument! : sr as Document;

    const section = createEl(sr, 'div');

    const title = createEl(sr, 'div');
    title.className = 'ssv-pool-title';
    title.textContent = '배운 스킬';
    section.appendChild(title);

    const pool = createEl(sr, 'div');
    pool.className = 'ssv-pool';

    if (!this.props.learnedSkills.length) {
      const empty = createEl(sr, 'div');
      empty.className = 'ssv-empty-pool';
      empty.textContent = '배운 스킬이 없습니다.';
      pool.appendChild(empty);
    } else {
      this.props.learnedSkills.forEach((skill) => {
        pool.appendChild(this.buildSkillCard(sr, doc, skill));
      });
    }

    section.appendChild(pool);
    return section;
  }

  private buildSkillCard(sr: Document | ShadowRoot, doc: Document, skill: LearnedSkill): HTMLElement {
    const techName = this.resolveTechName(skill);
    const inSlot = this.assignments.some((s) => s?.nodeId === skill.nodeId);

    const card = createEl(sr, 'div');
    card.className = 'ssv-skill-card';
    card.draggable = true;
    card.dataset.nodeId = skill.nodeId;
    card.dataset.inSlot = String(inSlot);

    const iconEl = createEl(sr, 'div');
    iconEl.className = 'ssv-skill-icon';
    iconEl.appendChild(this.buildIconContent(doc, skill.icon));

    const nameEl = createEl(sr, 'div');
    nameEl.className = 'ssv-skill-name';
    nameEl.textContent = techName;
    nameEl.title = techName;

    const lvEl = createEl(sr, 'div');
    lvEl.className = 'ssv-skill-level';
    lvEl.textContent = `Lv.${skill.level}`;

    card.append(iconEl, nameEl, lvEl);

    card.addEventListener('dragstart', (e: DragEvent) => {
      if (inSlot) { e.preventDefault(); return; }
      this.draggedSkill = skill;
      card.dataset.dragging = 'true';
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', JSON.stringify({ source: 'pool', nodeId: skill.nodeId }));
    });
    card.addEventListener('dragend', () => {
      card.dataset.dragging = 'false';
      this.draggedSkill = null;
    });

    return card;
  }

  // ── 오른쪽: 슬롯 패널 ────────────────────────────────────────────────────
  private buildSlotsPanel(sr: Document | ShadowRoot): HTMLElement {
    const panel = createEl(sr, 'div');
    panel.className = 'ssv-slots-panel';

    const title = createEl(sr, 'div');
    title.className = 'ssv-slots-title';
    title.textContent = '스킬 슬롯';
    panel.appendChild(title);

    const list = createEl(sr, 'div');
    list.className = 'ssv-slots-list';

    for (let i = 0; i < this.maxSlots; i++) {
      list.appendChild(this.buildSlot(sr, i));
    }

    panel.appendChild(list);
    return panel;
  }

  private buildSlot(sr: Document | ShadowRoot, index: number): HTMLElement {
    const doc = sr instanceof ShadowRoot ? sr.ownerDocument! : sr as Document;
    const assigned = this.assignments[index] ?? null;

    const slot = createEl(sr, 'div');
    slot.className = 'ssv-slot';
    slot.dataset.slotIndex = String(index);
    slot.dataset.filled = String(!!assigned);

    // 키 라벨
    const keyEl = createEl(sr, 'div');
    keyEl.className = 'ssv-slot-key';
    keyEl.textContent = this.keyLabels[index] ?? `${index + 1}`;

    slot.appendChild(keyEl);

    if (assigned) {
      const techName = this.resolveTechName(assigned);

      const iconEl = createEl(sr, 'div');
      iconEl.className = 'ssv-slot-icon';
      iconEl.appendChild(this.buildIconContent(doc, assigned.icon));

      const info = createEl(sr, 'div');
      info.className = 'ssv-slot-info';
      info.innerHTML = `
        <div class="ssv-slot-skill-name">${techName}</div>
        <div class="ssv-slot-skill-level">Lv.${assigned.level}</div>
      `;

      const clearBtn = createEl(sr, 'button');
      clearBtn.className = 'ssv-slot-clear';
      clearBtn.title = '슬롯에서 제거';
      clearBtn.textContent = '×';
      clearBtn.addEventListener('click', () => {
        this.assignments[index] = null;
        this.render();
      });

      // 슬롯에서 다른 슬롯으로 드래그
      slot.draggable = true;
      slot.addEventListener('dragstart', (e: DragEvent) => {
        this.draggedSkill = assigned;
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', JSON.stringify({ source: 'slot', slotIndex: index, nodeId: assigned.nodeId }));
      });
      slot.addEventListener('dragend', () => {
        this.draggedSkill = null;
      });

      slot.append(iconEl, info, clearBtn);
    } else {
      const hint = createEl(sr, 'div');
      hint.className = 'ssv-slot-empty-hint';
      hint.textContent = '스킬을 드래그하여 배치';
      slot.appendChild(hint);
    }

    // 드롭 이벤트
    slot.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      slot.dataset.dragOver = 'true';
    });
    slot.addEventListener('dragleave', () => {
      slot.dataset.dragOver = 'false';
    });
    slot.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      slot.dataset.dragOver = 'false';

      const raw = e.dataTransfer?.getData('text/plain');
      if (!raw) return;

      let payload: { source: 'pool' | 'slot'; nodeId: string; slotIndex?: number };
      try { payload = JSON.parse(raw); } catch { return; }

      const skill = this.props.learnedSkills.find((s) => s.nodeId === payload.nodeId) ?? null;
      if (!skill) return;

      // 슬롯→슬롯 스왑
      if (payload.source === 'slot' && payload.slotIndex !== undefined) {
        const fromIndex = payload.slotIndex;
        if (fromIndex === index) return;
        const prev = this.assignments[index];
        this.assignments[index] = skill;
        this.assignments[fromIndex] = prev;
      } else {
        // 풀→슬롯: 이미 다른 슬롯에 있으면 먼저 제거
        const existingSlotIndex = this.assignments.findIndex((s) => s?.nodeId === skill.nodeId);
        if (existingSlotIndex >= 0) this.assignments[existingSlotIndex] = null;
        this.assignments[index] = skill;
      }

      this.render();
    });

    return slot;
  }

  // ── 헬퍼 ─────────────────────────────────────────────────────────────────
  private resolveTechName(skill: LearnedSkill): string {
    const tech = skill.tech as Record<string, unknown> | null | undefined;
    if (tech && typeof tech.name === 'string') return tech.name;
    return skill.techId;
  }

  private buildIconContent(doc: Document, icon: string | undefined): HTMLElement | Text {
    if (!icon) {
      const span = doc.createElement('span');
      span.textContent = '✨';
      return span;
    }
    const isUrl = /^(https?:\/\/|\/|\.\.?\/|data:image)/i.test(icon);
    if (isUrl) {
      const img = doc.createElement('img');
      img.src = icon;
      img.alt = '';
      img.draggable = false;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
      return img;
    }
    const span = doc.createElement('span');
    span.textContent = icon;
    return span;
  }
}
