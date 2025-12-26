// ============================================================================
// views/ShopView.ts  — Tooltip(pin) 고정/해제 안정화 + 쉘 톤 맞춘 가독성 개선
// ============================================================================
import { createEl, css, renderIcon } from '../dlgstyle';
import type { IDialogView, ViewContext } from '../souldlgtypes';

type ShopItem = {
  id: string;
  icon: string;
  title: string;
  price: number;
  rarity?: 'Common' | 'Rare' | 'Epic';
  desc?: string;
};

const CSS_SHOP = css`
  :host { color: var(--gnx-ui-fg); }

  .gnx-shop-list{ display:grid; gap:8px; }

  .gnx-shop-row{
    display:grid; grid-template-columns:auto 1fr auto auto; gap:10px; align-items:center;
    border:1px solid rgba(255,255,255,.10); border-radius:12px; padding:10px 12px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
  }
  .gnx-row__icon{
    width:36px; height:36px; border-radius:8px; display:grid; place-items:center;
    background:rgba(255,255,255,.06); font-size:20px;
  }
  .gnx-shop-title{ font-weight:700; letter-spacing:.2px; }
  .gnx-price{ font-weight:700; }
  .gnx-price .coin{ color: var(--gnx-ui-accent); }

  .gnx-btn{ appearance:none; border:1px solid rgba(255,255,255,.18); color:var(--gnx-ui-fg);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
    padding:8px 12px; border-radius:12px; cursor:pointer; font-weight:600; letter-spacing:.2px; }
  .gnx-btn--accent{
    border-color:var(--gnx-ui-accent-weak);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.25), var(--gnx-card-glow);
    background:linear-gradient(180deg, color-mix(in oklab, var(--gnx-ui-accent) 25%, transparent), rgba(255,255,255,.02));
    color:#fff;
  }
  .gnx-card__meta{ font-size:12px; display:inline-block; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,.06); }
  .gnx-rar-common{ color:var(--gnx-rar-common); box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--gnx-rar-common) 60%, transparent); }
  .gnx-rar-rare  { color:var(--gnx-rar-rare);   box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--gnx-rar-rare)   60%, transparent); }
  .gnx-rar-epic  { color:var(--gnx-rar-epic);   box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--gnx-rar-epic)   60%, transparent); }

  /* ===== Tooltip ===== */
  .gnx-tip {
    position: fixed;
    z-index: 2147483647;
    min-width: 240px;
    max-width: 360px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.18);
    background: var(--gnx-ui-bg, rgba(14,17,22,.92));
    box-shadow: var(--gnx-shadow, 0 8px 40px rgba(0,0,0,.55));
    color: var(--gnx-ui-fg);
    /* 호버 상태: 이벤트 통과 → 행으로 mouseenter/move 재진입 허용 */
    pointer-events: none;
    transform: translate(-50%, -8px);
    opacity: 0;
    transition: opacity .08s ease, transform .08s ease;
  }
  .gnx-tip[data-show="true"] { opacity: 1; }
  .gnx-tip[data-pinned="true"] { pointer-events: auto; transform: translate(-50%, 0); }

  .gnx-tip h4{ margin:0 0 6px 0; font-size:14px; font-weight:700; }
  .gnx-tip .meta{ display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; }
  .gnx-tip .desc{ color:var(--gnx-ui-sub); line-height:1.55; }
  .gnx-tip .actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
`;

export class ShopView implements IDialogView<{ items: ShopItem[]; onBuy: (id: string) => void }> {
  private shell?: any;
  private ctx!: ViewContext;
  private props!: { items: ShopItem[]; onBuy: (id: string) => void };

  // tooltip refs
  private tip?: HTMLDivElement;
  private tipPinned = false;
  private tipItemId: string | null = null;

  mount(ctx: ViewContext, props: { items: ShopItem[]; onBuy: (id: string) => void }) {
    this.ctx = ctx;
    this.props = props;

    this.shell = ctx.shell;
    ctx.render.setTitle(this.shell, '상점 — 방랑 상인');

    // CSS 스코프 주입(필요시)
    ctx.render.ensureScopedCSS(this.shell.sr, CSS_SHOP, 'view:shop');

    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const list = createEl(doc, 'div');
    list.className = 'gnx-shop-list';

    // 행 렌더
    props.items.forEach((it) => {
      const row = createEl(doc, 'div');
      row.className = 'gnx-shop-row';
      row.innerHTML = `
        <div class="gnx-row__icon">${renderIcon(it.icon)}</div>
        <div>
          <div class="gnx-shop-title">${escapeHtml(it.title)}</div>
          <div class="meta">
            <span class="gnx-card__meta ${rarClass(it.rarity)}">${it.rarity ?? 'Common'}</span>
          </div>
        </div>
        <div class="gnx-price"><span class="coin">◈</span> ${it.price}</div>
      `;
      const buyBtn = createEl(doc, 'button');
      buyBtn.className = 'gnx-btn gnx-btn--accent';
      buyBtn.textContent = '구매';
      buyBtn.onclick = (e) => {
        e.stopPropagation();
        this.props.onBuy(it.id);
        this.ctx.manager.close();
      };
      row.appendChild(buyBtn);

      // Hover → 툴팁 표시
      row.addEventListener('mouseenter', (e) => this.onRowHover(it, e as MouseEvent));
      row.addEventListener('mousemove', (e) => this.onRowHover(it, e as MouseEvent));
      row.addEventListener('mouseleave', () => this.onRowLeave());
      // 클릭 핀(마우스만 pin, 터치는 무시하고 행 클릭은 구매 유지)
      row.addEventListener('pointerdown', (e) => {
        if ((e as PointerEvent).pointerType !== 'mouse') return;
        e.stopPropagation();
        this.pinTip(it);
      }, { capture: true });

      // 행 클릭 = 빠른 구매(원하시면 비활성화 가능)
      row.addEventListener('click', () => {
        this.props.onBuy(it.id);
        this.ctx.manager.close();
      });

      list.appendChild(row);
    });

    // 툴팁(1개만) 준비 + 외부 클릭 시 해제
    this.ensureTip();
    document.addEventListener('pointerdown', this.onGlobalDown, true);

    this.shell.body.appendChild(list);
    this.ctx.render.setActions(this.shell, [{ id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }]);
  }

  unmount() {
    // 전역 리스너 정리
    document.removeEventListener('pointerdown', this.onGlobalDown, true);
    // 툴팁 제거
    if (this.tip && this.tip.parentElement) this.tip.parentElement.removeChild(this.tip);
    this.tip = undefined;
  }

  /* ----------------------------- Tooltip Logic ----------------------------- */

  private ensureTip() {
    if (this.tip) return;
    const doc = (this.shell!.sr instanceof ShadowRoot) ? this.shell!.sr : document;
    const tip = createEl(doc, 'div') as HTMLDivElement;
    tip.className = 'gnx-tip';
    tip.setAttribute('data-show', 'false');
    tip.setAttribute('data-pinned', 'false');
    this.shell!.sr.appendChild(tip);
    this.tip = tip;
  }

  private onRowHover(it: ShopItem, ev: MouseEvent) {
    if (!this.tip) this.ensureTip();
    if (!this.tip) return;
    if (this.tipPinned) return; // pinned면 호버에 반응 X

    this.showTip(it, false);
    this.placeTip(ev.clientX, ev.clientY);
  }

  private onRowLeave() {
    if (this.tipPinned) return;
    this.hideTip();
  }

  private pinTip(it: ShopItem) {
    this.showTip(it, true);
    // pinned 됐을 때 버튼 클릭 가능하도록 pointer-events:auto는 CSS에서 처리됨
  }

  private onGlobalDown = (e: Event) => {
    if (!this.tip) return;
    if (!this.tipPinned) return;
    // 툴팁 내부 클릭이면 유지
    if (e.target instanceof Node && this.tip.contains(e.target)) return;
    // 외부 클릭이면 해제
    this.tipPinned = false;
    this.tip.setAttribute('data-pinned', 'false');
    // 즉시 숨기지 않고 살짝 딜레이를 주고 싶다면 setTimeout 사용 가능
    this.hideTip();
  };

  private showTip(it: ShopItem, pin = false) {
    this.ensureTip();
    if (!this.tip) return;

    this.tipPinned = pin;
    this.tipItemId = it.id;
    this.tip.setAttribute('data-pinned', pin ? 'true' : 'false');
    // 안전상 이중 보장
    this.tip.style.pointerEvents = pin ? 'auto' as any : 'none';

    // 내용 구성
    this.tip.innerHTML = '';
    const doc = (this.shell!.sr instanceof ShadowRoot) ? this.shell!.sr : document;

    const title = createEl(doc, 'h4');
    title.style.display = 'flex'; title.style.alignItems = 'center'; title.style.gap = '6px';
    title.innerHTML = `${renderIcon(it.icon)} <span>${escapeHtml(it.title)}</span>`;

    const meta = createEl(doc, 'div');
    meta.className = 'meta';
    const r = createEl(doc, 'span'); r.className = `gnx-card__meta ${rarClass(it.rarity)}`; r.textContent = it.rarity ?? 'Common';
    const p = createEl(doc, 'span'); p.className = 'gnx-card__meta'; p.innerHTML = `가격 <b class="gnx-price"><span class="coin">◈</span> ${it.price}</b>`;
    meta.appendChild(r); meta.appendChild(p);

    const desc = createEl(doc, 'div');
    desc.className = 'desc';
    desc.textContent = it.desc ?? '설명이 없습니다.';

    const acts = createEl(doc, 'div');
    acts.className = 'actions';

    // 구매
    const buy = createEl(doc, 'button');
    buy.className = 'gnx-btn gnx-btn--accent';
    buy.textContent = '구매';
    buy.onclick = (e) => {
      e.stopPropagation();
      this.props.onBuy(it.id);
      this.ctx.manager.close();
    };

    // 닫기(핀 해제)
    const close = createEl(doc, 'button');
    close.className = 'gnx-btn';
    close.textContent = '닫기';
    close.onclick = (e) => {
      e.stopPropagation();
      this.hideTip();
      this.tipPinned = false;
      this.tip?.setAttribute('data-pinned', 'false');
    };

    acts.appendChild(close);
    acts.appendChild(buy);

    this.tip.appendChild(title);
    this.tip.appendChild(meta);
    this.tip.appendChild(desc);
    this.tip.appendChild(acts);

    this.tip.setAttribute('data-show', 'true');
  }

  private hideTip() {
    if (!this.tip) return;
    this.tip.setAttribute('data-show', 'false');
    // 중요: 숨길 때 이벤트 통과로 돌려놓아야 hover가 다시 살아남
    this.tip.style.pointerEvents = 'none';
  }

  private placeTip(cx: number, cy: number) {
    if (!this.tip) return;
    // 뷰포트 경계 보정
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = this.tip.getBoundingClientRect();
    const pad = 12;
    let x = cx, y = cy - 12; // 기본 위치

    if (x - rect.width / 2 < pad) x = rect.width / 2 + pad;
    if (x + rect.width / 2 > vw - pad) x = vw - rect.width / 2 - pad;
    if (y - rect.height < pad) y = rect.height + pad; // 너무 위면 아래쪽으로

    this.tip.style.left = `${x}px`;
    this.tip.style.top = `${y}px`;
  }
}

/* ================================= Helpers ================================= */

function rarClass(r?: ShopItem['rarity']) {
  if (r === 'Epic') return 'gnx-rar-epic';
  if (r === 'Rare') return 'gnx-rar-rare';
  return 'gnx-rar-common';
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]);
}
