import { AllyId } from "@Glibs/actors/allies/allytypes";
import { Squad } from "@Glibs/actors/allies/ally/squadmanager";
import { createEl, css } from "../dlgstyle";
import type { IDialogView, ViewContext } from "../souldlgtypes";

export type SquadViewProps = {
    squads: readonly Squad[];
    reserveUnits: ReadonlyMap<AllyId, number>;
    selectedSquadId: string | null;
    onSelectSquad: (squadId: string | null) => void;
    onAssign: (squadId: string, allyId: AllyId, deckLevel: number) => void;
    onUnassign: (squadId: string, memberIndex: number) => void;
};

const ALLY_LABELS: Record<AllyId, { name: string; icon: string }> = {
    [AllyId.Warrior]: { name: "전사", icon: "⚔️" },
    [AllyId.Archer]: { name: "궁수", icon: "🏹" },
    [AllyId.Mage]: { name: "마법사", icon: "✨" },
};

const CSS_SQUAD = css`
  .gnx-squad { display: grid; grid-template-columns: minmax(360px, 1.4fr) minmax(240px, .8fr); gap: 14px; min-width: min(780px, 86vw); }
  @media (max-width: 760px) { .gnx-squad { grid-template-columns: 1fr; } }
  .gnx-squad__panel { display: grid; gap: 10px; align-content: start; }
  .gnx-squad__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: var(--gnx-ui-sub); font-size: 13px; }
  .gnx-squad__title { color: var(--gnx-ui-fg); font-weight: 800; font-size: 14px; }
  .gnx-squad__list { display: grid; gap: 10px; }
  .gnx-squad__card { border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 10px; background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015)); }
  .gnx-squad__card[data-selected="true"] { border-color: var(--gnx-ui-accent); box-shadow: 0 0 0 2px color-mix(in oklab, var(--gnx-ui-accent) 35%, transparent); }
  .gnx-squad__cardtop { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
  .gnx-squad__select { appearance: none; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; background: rgba(255,255,255,.06); color: var(--gnx-ui-fg); padding: 6px 9px; cursor: pointer; font-weight: 700; }
  .gnx-squad__slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
  .gnx-squad__slot { aspect-ratio: 1 / 1; min-height: 70px; border: 1px solid rgba(255,255,255,.15); border-radius: 8px; display: grid; place-items: center; position: relative; background: rgba(0,0,0,.14); color: var(--gnx-ui-fg); cursor: pointer; }
  .gnx-squad__slot[data-empty="true"] { color: var(--gnx-ui-sub); border-style: dashed; cursor: default; }
  .gnx-squad__slot[data-drop="true"] { border-color: var(--gnx-ui-accent); background: color-mix(in oklab, var(--gnx-ui-accent) 12%, transparent); }
  .gnx-squad__icon { font-size: 27px; line-height: 1; }
  .gnx-squad__label { font-size: 12px; margin-top: 4px; text-align: center; }
  .gnx-squad__level { position: absolute; right: 5px; bottom: 4px; font-size: 11px; color: var(--gnx-ui-sub); }
  .gnx-squad__reserve { display: grid; gap: 8px; }
  .gnx-squad__reservebtn { appearance: none; width: 100%; display: grid; grid-template-columns: 34px 1fr auto; gap: 8px; align-items: center; text-align: left; border: 1px solid rgba(255,255,255,.13); border-radius: 8px; padding: 8px 9px; color: var(--gnx-ui-fg); background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.018)); cursor: grab; }
  .gnx-squad__reservebtn:disabled { opacity: .38; cursor: not-allowed; filter: grayscale(1); }
  .gnx-squad__qty { color: var(--gnx-ui-accent); font-weight: 800; font-variant-numeric: tabular-nums; }
  .gnx-squad__empty { color: var(--gnx-ui-sub); border: 1px dashed rgba(255,255,255,.14); border-radius: 8px; padding: 14px; text-align: center; }
`;

export class SquadView implements IDialogView<SquadViewProps> {
    private ctx!: ViewContext;
    private props!: SquadViewProps;
    private shell?: any;
    private cssKey?: string;
    private dragOverSquadId: string | null = null;

    mount(ctx: ViewContext, props: SquadViewProps): void {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;
        ctx.render.setTitle(this.shell, "부대 편성");
        ctx.render.setWide(this.shell, true);
        ctx.render.setActions(this.shell, [{ id: "close", label: "닫기", onClick: () => this.ctx.manager.close() }]);
        this.cssKey = ctx.render.ensureScopedCSS(this.shell.sr, CSS_SQUAD, "view:squad");
        this.render();
    }

    update(props: SquadViewProps): void {
        this.props = props;
        this.render();
    }

    unmount(): void {
        if (this.cssKey && this.shell) {
            this.ctx.render.releaseCSS(this.shell.sr, this.cssKey);
        }
        this.dragOverSquadId = null;
    }

    private render(): void {
        if (!this.shell) return;
        const doc = this.shell.sr instanceof ShadowRoot ? this.shell.sr : document;
        const root = createEl(doc, "div");
        root.className = "gnx-squad";

        root.append(this.renderSquads(doc), this.renderReserve(doc));
        this.shell.body.replaceChildren(root);
    }

    private renderSquads(doc: Document | ShadowRoot): HTMLElement {
        const panel = createEl(doc, "section");
        panel.className = "gnx-squad__panel";
        panel.append(this.renderHeader(doc, "편성 부대", "선택한 부대가 전투에 투입됩니다."));

        const list = createEl(doc, "div");
        list.className = "gnx-squad__list";
        this.props.squads.forEach((squad) => list.append(this.renderSquadCard(doc, squad)));
        panel.append(list);
        return panel;
    }

    private renderSquadCard(doc: Document | ShadowRoot, squad: Squad): HTMLElement {
        const card = createEl(doc, "article");
        card.className = "gnx-squad__card";
        card.dataset.selected = String(squad.id === this.props.selectedSquadId);

        const top = createEl(doc, "div");
        top.className = "gnx-squad__cardtop";

        const title = createEl(doc, "div");
        title.className = "gnx-squad__title";
        title.textContent = `${squad.name} (${squad.members.length}/${squad.maxSize})`;

        const select = createEl(doc, "button");
        select.className = "gnx-squad__select";
        select.textContent = squad.id === this.props.selectedSquadId ? "선택됨" : "선택";
        select.onclick = () => this.props.onSelectSquad(squad.id);
        top.append(title, select);

        const slots = createEl(doc, "div");
        slots.className = "gnx-squad__slots";
        for (let i = 0; i < squad.maxSize; i++) {
            slots.append(this.renderSlot(doc, squad, i));
        }

        card.append(top, slots);
        return card;
    }

    private renderSlot(doc: Document | ShadowRoot, squad: Squad, index: number): HTMLElement {
        const slot = createEl(doc, "div");
        slot.className = "gnx-squad__slot";
        slot.dataset.drop = String(this.dragOverSquadId === squad.id);

        const member = squad.members[index];
        if (!member) {
            slot.dataset.empty = "true";
            slot.textContent = "+";
        } else {
            const meta = ALLY_LABELS[member.allyId];
            const wrap = createEl(doc, "div");
            const icon = createEl(doc, "div");
            icon.className = "gnx-squad__icon";
            icon.textContent = meta.icon;
            const label = createEl(doc, "div");
            label.className = "gnx-squad__label";
            label.textContent = meta.name;
            const level = createEl(doc, "span");
            level.className = "gnx-squad__level";
            level.textContent = `Lv.${member.deckLevel}`;
            wrap.append(icon, label);
            slot.append(wrap, level);
            slot.onclick = () => this.props.onUnassign(squad.id, index);
        }

        slot.ondragover = (event: DragEvent) => {
            event.preventDefault();
            this.dragOverSquadId = squad.id;
            slot.dataset.drop = "true";
        };
        slot.ondragleave = () => {
            this.dragOverSquadId = null;
            slot.dataset.drop = "false";
        };
        slot.ondrop = (event: DragEvent) => {
            event.preventDefault();
            this.dragOverSquadId = null;
            const allyId = this.readReserveDrag(event);
            if (allyId) this.props.onAssign(squad.id, allyId, 1);
        };
        return slot;
    }

    private renderReserve(doc: Document | ShadowRoot): HTMLElement {
        const panel = createEl(doc, "section");
        panel.className = "gnx-squad__panel";
        panel.append(this.renderHeader(doc, "대기 병력", "클릭하거나 슬롯으로 드래그합니다."));

        const list = createEl(doc, "div");
        list.className = "gnx-squad__reserve";
        const entries = Object.values(AllyId).map((allyId) => [allyId, this.props.reserveUnits.get(allyId) ?? 0] as const);
        entries.forEach(([allyId, count]) => list.append(this.renderReserveButton(doc, allyId, count)));
        panel.append(list);
        return panel;
    }

    private renderReserveButton(doc: Document | ShadowRoot, allyId: AllyId, count: number): HTMLElement {
        const btn = createEl(doc, "button");
        btn.className = "gnx-squad__reservebtn";
        btn.disabled = count <= 0;
        btn.draggable = count > 0;

        const meta = ALLY_LABELS[allyId];
        const icon = createEl(doc, "span");
        icon.className = "gnx-squad__icon";
        icon.textContent = meta.icon;
        const name = createEl(doc, "span");
        name.textContent = meta.name;
        const qty = createEl(doc, "span");
        qty.className = "gnx-squad__qty";
        qty.textContent = String(count);
        btn.append(icon, name, qty);

        btn.onclick = () => {
            const squadId = this.props.selectedSquadId;
            if (squadId && count > 0) this.props.onAssign(squadId, allyId, 1);
        };
        btn.ondragstart = (event: DragEvent) => {
            event.dataTransfer?.setData("text/plain", JSON.stringify({ source: "reserve", allyId }));
            if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        };
        return btn;
    }

    private renderHeader(doc: Document | ShadowRoot, titleText: string, descText: string): HTMLElement {
        const head = createEl(doc, "div");
        head.className = "gnx-squad__head";
        const title = createEl(doc, "span");
        title.className = "gnx-squad__title";
        title.textContent = titleText;
        const desc = createEl(doc, "span");
        desc.textContent = descText;
        head.append(title, desc);
        return head;
    }

    private readReserveDrag(event: DragEvent): AllyId | undefined {
        const raw = event.dataTransfer?.getData("text/plain");
        if (!raw) return undefined;
        try {
            const payload = JSON.parse(raw) as { source?: string; allyId?: AllyId };
            if (payload.source !== "reserve") return undefined;
            return Object.values(AllyId).includes(payload.allyId as AllyId) ? payload.allyId : undefined;
        } catch {
            return undefined;
        }
    }
}
