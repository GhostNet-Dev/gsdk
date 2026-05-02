import { getResourceDisplayName } from "@Glibs/gameobjects/resourcetypes";
import { CurrencyType, Wallet } from "@Glibs/inventory/wallet";
import { PlanetMarketState, StrategicPlanetId } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";
import {
  TRADEABLE_CURRENCY_TYPES,
  TradeableCurrencyType,
} from "@Glibs/gameobjects/strategicgalaxy/trademarket";
import {
  TradeRequest,
  TradeResult,
} from "@Glibs/gameobjects/strategicgalaxy/tradeservice";
import { createEl, css } from "../dlgstyle";
import type { IDialogView, ViewContext } from "../souldlgtypes";

export type TradeViewProps = {
  planetId: StrategicPlanetId;
  marketState: PlanetMarketState;
  wallet: Readonly<Wallet>;
  quoteTrade: (request: TradeRequest) => TradeResult;
  onTrade: (request: TradeRequest) => TradeResult;
};

const RESOURCE_ICONS: Record<TradeableCurrencyType, string> = {
  [CurrencyType.Wood]: "🪵",
  [CurrencyType.Water]: "💧",
  [CurrencyType.Electric]: "⚡",
  [CurrencyType.Food]: "🌾",
  [CurrencyType.Materials]: "🔩",
  [CurrencyType.Gems]: "💎",
};

const CSS_TRADE = css`
  :host { color: var(--gnx-ui-fg); }
  .gnx-trade { display: grid; gap: 10px; min-width: min(720px, 82vw); }
  .gnx-trade__summary {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    color: var(--gnx-ui-sub); font-size: 13px;
  }
  .gnx-trade__gold { color: var(--gnx-ui-accent); font-weight: 800; }
  .gnx-trade__list { display: grid; gap: 8px; }
  .gnx-trade__row {
    display: grid; grid-template-columns: 42px minmax(96px, 1fr) 78px 82px 126px 132px;
    gap: 8px; align-items: center;
    border: 1px solid rgba(255,255,255,.10); border-radius: 8px; padding: 9px 10px;
    background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015));
  }
  .gnx-trade__icon {
    width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px;
    background: rgba(255,255,255,.06); font-size: 19px;
  }
  .gnx-trade__name { font-weight: 750; }
  .gnx-trade__sub { color: var(--gnx-ui-sub); font-size: 12px; margin-top: 2px; }
  .gnx-trade__pressure { font-weight: 800; }
  .gnx-trade__pressure[data-dir="up"] { color: #74d99f; }
  .gnx-trade__pressure[data-dir="down"] { color: #ff9a8a; }
  .gnx-trade__amount { font-variant-numeric: tabular-nums; }
  .gnx-trade__qty { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
  .gnx-trade__input {
    width: 100%; box-sizing: border-box; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.16); background: rgba(0,0,0,.22);
    color: var(--gnx-ui-fg); padding: 7px 8px; font: inherit;
  }
  .gnx-trade__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .gnx-trade__btn {
    appearance: none; border: 1px solid rgba(255,255,255,.18); border-radius: 8px;
    color: var(--gnx-ui-fg); cursor: pointer; padding: 7px 8px; font-weight: 750;
    background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
  }
  .gnx-trade__btn--accent {
    border-color: var(--gnx-ui-accent-weak);
    background: linear-gradient(180deg, color-mix(in oklab, var(--gnx-ui-accent) 24%, transparent), rgba(255,255,255,.02));
  }
  .gnx-trade__btn:disabled {
    opacity: .34; cursor: not-allowed; filter: grayscale(1);
  }
  .gnx-trade__status { min-height: 18px; color: var(--gnx-ui-sub); font-size: 13px; }
  .gnx-trade__status[data-error="true"] { color: #ffb3a7; }
  @media (max-width: 760px) {
    .gnx-trade__row { grid-template-columns: 34px minmax(110px, 1fr) 70px; }
    .gnx-trade__amount, .gnx-trade__qty, .gnx-trade__actions { grid-column: 2 / 4; }
  }
`;

export class TradeView implements IDialogView<TradeViewProps> {
  private ctx!: ViewContext;
  private props!: TradeViewProps;
  private shell?: any;
  private quantities: Partial<Record<TradeableCurrencyType, number>> = {};
  private statusText = "";
  private statusIsError = false;

  mount(ctx: ViewContext, props: TradeViewProps): void {
    this.ctx = ctx;
    this.props = props;
    this.shell = ctx.shell;
    ctx.render.ensureScopedCSS(this.shell.sr, CSS_TRADE, "view:trade");
    ctx.render.setTitle(this.shell, "무역소");
    ctx.render.setActions(this.shell, [{ id: "close", label: "닫기", onClick: () => this.ctx.manager.close() }]);
    this.render();
  }

  update(props: TradeViewProps): void {
    this.props = props;
    this.render();
  }

  unmount(): void {
    this.quantities = {};
  }

  private render(): void {
    if (!this.shell) return;
    const doc = this.shell.sr instanceof ShadowRoot ? this.shell.sr : document;
    const root = createEl(doc, "div");
    root.className = "gnx-trade";

    const summary = createEl(doc, "div");
    summary.className = "gnx-trade__summary";
    summary.innerHTML = `
      <span>행성: ${this.props.planetId}</span>
      <span>보유 골드 <span class="gnx-trade__gold">${Math.floor(this.props.wallet[CurrencyType.Gold] ?? 0)}</span></span>
    `;
    root.appendChild(summary);

    const list = createEl(doc, "div");
    list.className = "gnx-trade__list";
    for (const resource of TRADEABLE_CURRENCY_TYPES) {
      list.appendChild(this.renderRow(doc, resource));
    }
    root.appendChild(list);

    const status = createEl(doc, "div");
    status.className = "gnx-trade__status";
    status.dataset.error = this.statusIsError ? "true" : "false";
    status.textContent = this.statusText;
    root.appendChild(status);

    this.shell.body.replaceChildren(root);
  }

  private renderRow(doc: Document | ShadowRoot, resource: TradeableCurrencyType): HTMLElement {
    const qty = this.getQuantity(resource);
    const held = Math.floor(this.props.wallet[resource] ?? 0);
    const sellQuote = this.props.quoteTrade({ action: "sell", resource, quantity: qty, planetId: this.props.planetId });
    const buyQuote = this.props.quoteTrade({ action: "buy", resource, quantity: qty, planetId: this.props.planetId });
    const pressure = this.props.marketState.pricePressure[resource] ?? 0;
    const pressurePercent = Math.round(pressure * 100);

    const row = createEl(doc, "div");
    row.className = "gnx-trade__row";

    const icon = createEl(doc, "div");
    icon.className = "gnx-trade__icon";
    icon.textContent = RESOURCE_ICONS[resource];
    row.appendChild(icon);

    const title = createEl(doc, "div");
    title.innerHTML = `
      <div class="gnx-trade__name">${getResourceDisplayName(resource)}</div>
      <div class="gnx-trade__sub">${resource}</div>
    `;
    row.appendChild(title);

    const pressureEl = createEl(doc, "div");
    pressureEl.className = "gnx-trade__pressure";
    pressureEl.dataset.dir = pressurePercent > 0 ? "up" : pressurePercent < 0 ? "down" : "flat";
    pressureEl.textContent = `${pressurePercent >= 0 ? "+" : ""}${pressurePercent}%`;
    row.appendChild(pressureEl);

    const amount = createEl(doc, "div");
    amount.className = "gnx-trade__amount";
    amount.textContent = `${held}`;
    row.appendChild(amount);

    const qtyWrap = createEl(doc, "div");
    qtyWrap.className = "gnx-trade__qty";
    const input = createEl(doc, "input");
    input.className = "gnx-trade__input";
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.value = String(qty);
    input.addEventListener("input", () => {
      this.quantities[resource] = Number(input.value);
      this.statusText = "";
      this.statusIsError = false;
      this.render();
    });
    qtyWrap.appendChild(input);

    const maxBtn = createEl(doc, "button");
    maxBtn.className = "gnx-trade__btn";
    maxBtn.textContent = "MAX";
    maxBtn.addEventListener("click", () => {
      this.quantities[resource] = Math.max(1, held);
      this.statusText = "";
      this.statusIsError = false;
      this.render();
    });
    maxBtn.disabled = held <= 0;
    qtyWrap.appendChild(maxBtn);
    row.appendChild(qtyWrap);

    const actions = createEl(doc, "div");
    actions.className = "gnx-trade__actions";
    const sellBtn = this.createTradeButton(doc, "매각", "sell", resource, sellQuote, held >= qty);
    const buyBtn = this.createTradeButton(
      doc,
      "구매",
      "buy",
      resource,
      buyQuote,
      buyQuote.ok && (this.props.wallet[CurrencyType.Gold] ?? 0) >= buyQuote.quote.totalGold,
      true,
    );
    actions.appendChild(sellBtn);
    actions.appendChild(buyBtn);
    row.appendChild(actions);

    return row;
  }

  private createTradeButton(
    doc: Document | ShadowRoot,
    label: string,
    action: "buy" | "sell",
    resource: TradeableCurrencyType,
    quote: TradeResult,
    hasEnough: boolean,
    accent = false,
  ): HTMLButtonElement {
    const button = createEl(doc, "button");
    button.className = `gnx-trade__btn${accent ? " gnx-trade__btn--accent" : ""}`;
    button.textContent = label;
    button.disabled = !quote.ok || !hasEnough;
    button.title = quote.ok ? `${quote.quote.totalGold} 골드` : quote.reason;
    button.addEventListener("click", () => {
      const request: TradeRequest = {
        action,
        resource,
        quantity: this.getQuantity(resource),
        planetId: this.props.planetId,
      };
      const result = this.props.onTrade(request);
      this.statusIsError = !result.ok;
      this.statusText = result.ok
        ? `${getResourceDisplayName(resource)} ${request.quantity}개 ${label} 완료 (${result.quote.totalGold} 골드)`
        : result.reason;
      this.render();
    });
    return button;
  }

  private getQuantity(resource: TradeableCurrencyType): number {
    const value = this.quantities[resource] ?? 1;
    return Number.isFinite(value) ? value : 0;
  }
}
