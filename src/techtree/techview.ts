// techtree.view.ts
// DOM + Canvas/Minimap renderer for TechTreeService
// by you + ChatGPT

import { TechId, TechTreeKind } from "./techtreedefs";
import { TechTreeService } from "./techtreeservice";


/* =========================== View Models & Options ========================== */

export type NodeStatus = "locked" | "available" | "unlocked" | "maxed";

export type TreeNodeView = {
  id: TechId;
  name: string;
  kind: TechTreeKind;
  lv: number;
  maxLv: number;
  status: NodeStatus;
  children: string[]; // edge: this -> childId
};

export type TreeLayoutNode = TreeNodeView & {
  x: number;
  y: number;
  w: number;
  h: number;
  col: number;
  row: number;
};

export type TreeLayoutEdge = {
  from: string;
  to: string;
  points: { x: number; y: number }[]; // polyline (ortho)
};

export type TreeLayoutResult = {
  nodes: Map<string, TreeLayoutNode>;
  edges: TreeLayoutEdge[];
  width: number;
  height: number;
  gridW: number;
  gridH: number;
};

export type TechTreeRenderCallbacks = {
  onNodeClick?: (node: TreeLayoutNode, ev: MouseEvent) => void;
  onNodeHover?: (node: TreeLayoutNode | null, ev: MouseEvent) => void;
};

export type TechTreeDomOptions = {
  mount: HTMLElement;             // DOM이 붙을 컨테이너
  nodeSize?: { w: number; h: number };
  gap?: { x: number; y: number };
  showLegend?: boolean;
  classNameRoot?: string;         // 기본: ttx-root
} & TechTreeRenderCallbacks;

export type TechTreeCanvasOptions = {
  canvas: HTMLCanvasElement;      // 메인 캔버스
  minimap?: HTMLCanvasElement;    // 선택: 미니맵
  nodeSize?: { w: number; h: number };
  gap?: { x: number; y: number };
  zoom?: { min: number; max: number; initial: number };
  pan?: { x: number; y: number }; // 초기 팬
  pixelRatio?: number;            // 기본: devicePixelRatio
} & TechTreeRenderCallbacks;

/* ============================== Layout Builder ============================== */
/** 서비스 상태 → TreeNodeView(상태 포함) */
function buildTreeView(service: TechTreeService): Map<string, TreeNodeView> {
  const out = new Map<string, TreeNodeView>();
  for (const id of service.index.byId.keys()) {
    const n = service.index.byId.get(id)!;
    const lv = service.levels[id] ?? 0;
    const maxed = lv >= n.maxLv;
    const can = service.canLevelUp(id);

    const status: NodeStatus = maxed ? "maxed" : lv > 0 ? "unlocked" : can.ok ? "available" : "locked";
    const children = [...(service.index.edges.get(id) ?? [])];

    out.set(id, {
      id, name: n.name, kind: n.kind,
      lv, maxLv: n.maxLv, status, children,
    });
  }
  return out;
}

/** 간단한 레이어드 DAG 레이아웃 (열: 위상순서 레벨, 행: 같은 열 내 index) */
function computeLayout(
  views: Map<string, TreeNodeView>,
  service: TechTreeService,
  cell: { w: number; h: number },
  gap: { x: number; y: number }
): TreeLayoutResult {
  // 1) 레벨(열) 계산: 위상정렬을 따라 각 노드의 longest-path depth
  const depth = new Map<string, number>();
  for (const id of service.index.order) depth.set(id, 0);
  for (const id of service.index.order) {
    const d = depth.get(id) ?? 0;
    for (const ch of service.index.edges.get(id) ?? []) {
      depth.set(ch, Math.max(depth.get(ch) ?? 0, d + 1));
    }
  }

  // 2) 열별 노드 모으기
  const cols = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!cols.has(d)) cols.set(d, []);
    cols.get(d)!.push(id);
  }

  // 3) 배치
  const nodes = new Map<string, TreeLayoutNode>();
  let maxCol = 0, maxRow = 0;
  for (const [col, ids] of cols) {
    maxCol = Math.max(maxCol, col);
    ids.forEach((id, row) => {
      const v = views.get(id)!;
      const x = col * (cell.w + gap.x);
      const y = row * (cell.h + gap.y);
      const node: TreeLayoutNode = { ...v, x, y, w: cell.w, h: cell.h, col, row };
      nodes.set(id, node);
      maxRow = Math.max(maxRow, row);
    });
  }

  // 4) 엣지 polyline(직교) 계산: from center-right → to center-left → 중간 수평/수직
  const edges: TreeLayoutEdge[] = [];
  for (const node of nodes.values()) {
    for (const to of node.children) {
      const A = node;
      const B = nodes.get(to)!;
      const p1 = { x: A.x + A.w, y: A.y + A.h / 2 };
      const p4 = { x: B.x, y: B.y + B.h / 2 };
      const midX = (p1.x + p4.x) / 2;
      const pts = [p1, { x: midX, y: p1.y }, { x: midX, y: p4.y }, p4];
      edges.push({ from: A.id, to, points: pts });
    }
  }

  const width = (maxCol + 1) * (cell.w + gap.x) - gap.x;
  const height = (maxRow + 1) * (cell.h + gap.y) - gap.y;
  return { nodes, edges, width, height, gridW: cell.w + gap.x, gridH: cell.h + gap.y };
}

/* =================================== DOM ==================================== */

export class DomTreeRenderer {
  private opts: TechTreeDomOptions;
  private layout!: TreeLayoutResult;
  private root!: HTMLElement;
  private edgeLayer!: SVGSVGElement;

  constructor(opts: TechTreeDomOptions) {
    this.opts = opts;
    injectCssOnce();
  }

  mount(layout: TreeLayoutResult) {
    this.layout = layout;
    const root = document.createElement("div");
    root.className = this.opts.classNameRoot ?? "ttx-root";
    root.style.position = "relative";
    root.style.width = `${layout.width}px`;
    root.style.height = `${layout.height}px`;
    root.style.userSelect = "none";

    // SVG edge layer
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ttx-edges");
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    root.appendChild(svg);
    this.edgeLayer = svg;

    // Nodes
    for (const nd of layout.nodes.values()) {
      const n = document.createElement("div");
      n.className = `ttx-node ttx-${nd.status} ttx-kind-${nd.kind}`;
      n.style.left = `${nd.x}px`; n.style.top = `${nd.y}px`;
      n.style.width = `${nd.w}px`; n.style.height = `${nd.h}px`;
      n.innerHTML = `
        <div class="ttx-node-title">${escapeHtml(nd.name)}</div>
        <div class="ttx-node-meta">Lv ${nd.lv}/${nd.maxLv}</div>
      `;
      n.addEventListener("click", (ev) => this.opts.onNodeClick?.(nd, ev));
      n.addEventListener("mouseenter", (ev) => this.opts.onNodeHover?.(nd, ev));
      n.addEventListener("mouseleave", (ev) => this.opts.onNodeHover?.(null, ev));
      root.appendChild(n);
    }

    // edges
    for (const e of layout.edges) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("class", "ttx-edge");
      const d = polylineToPath(e.points);
      path.setAttribute("d", d);
      svg.appendChild(path);
    }

    // legend(optional)
    if (this.opts.showLegend) {
      const lg = document.createElement("div");
      lg.className = "ttx-legend";
      lg.innerHTML = `
        <span class="ttx-dot ttx-locked"></span> locked
        <span class="ttx-dot ttx-available"></span> available
        <span class="ttx-dot ttx-unlocked"></span> unlocked
        <span class="ttx-dot ttx-maxed"></span> maxed
      `;
      root.appendChild(lg);
    }

    // mount
    this.opts.mount.innerHTML = "";
    this.opts.mount.appendChild(root);
    this.root = root;
  }

  unmount() {
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }
}

/* ================================= Canvas =================================== */

export class CanvasTreeRenderer {
  private opts: TechTreeCanvasOptions;
  private layout!: TreeLayoutResult;
  private ctx!: CanvasRenderingContext2D;
  private dpr = 1;
  private zoom = 1;
  private panX = 0;
  private panY = 0;

  private hovered: TreeLayoutNode | null = null;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private worldStart = { x: 0, y: 0 };

  constructor(opts: TechTreeCanvasOptions) {
    this.opts = opts;
  }

  mount(layout: TreeLayoutResult) {
    this.layout = layout;
    const dpr = this.opts.pixelRatio ?? window.devicePixelRatio ?? 1;
    this.dpr = dpr;
    this.zoom = this.opts.zoom?.initial ?? 1;
    this.panX = this.opts.pan?.x ?? 0;
    this.panY = this.opts.pan?.y ?? 0;

    const c = this.opts.canvas;
    const rect = c.getBoundingClientRect();
    c.width = Math.max(2, Math.round(rect.width * dpr));
    c.height = Math.max(2, Math.round(rect.height * dpr));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;

    // Events
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("mousedown", this.onDown);
    window.addEventListener("mousemove", this.onMove);
    window.addEventListener("mouseup", this.onUp);
    c.addEventListener("click", this.onClick);

    this.draw();
    this.drawMinimap();
  }

  unmount() {
    const c = this.opts.canvas;
    c.removeEventListener("wheel", this.onWheel as any);
    c.removeEventListener("mousedown", this.onDown as any);
    window.removeEventListener("mousemove", this.onMove as any);
    window.removeEventListener("mouseup", this.onUp as any);
    c.removeEventListener("click", this.onClick as any);
  }

  private onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const zmin = this.opts.zoom?.min ?? 0.25;
    const zmax = this.opts.zoom?.max ?? 2.5;
    const scale = Math.exp(-ev.deltaY * 0.001);
    // zoom around cursor
    const { x: cx, y: cy } = this.toWorld(ev.offsetX, ev.offsetY);
    const nz = clamp(this.zoom * scale, zmin, zmax);
    // adjust pan to keep cursor stationary in world coords
    const { x: sx, y: sy } = this.toScreen(cx, cy, nz);
    this.panX += (ev.offsetX - sx) / nz;
    this.panY += (ev.offsetY - sy) / nz;
    this.zoom = nz;
    this.draw();
    this.drawMinimap();
  };

  private onDown = (ev: MouseEvent) => {
    this.isPanning = true;
    this.panStart = { x: ev.clientX, y: ev.clientY };
    this.worldStart = { x: this.panX, y: this.panY };
  };
  private onMove = (ev: MouseEvent) => {
    if (this.isPanning) {
      const dx = (ev.clientX - this.panStart.x) / this.zoom;
      const dy = (ev.clientY - this.panStart.y) / this.zoom;
      this.panX = this.worldStart.x + dx;
      this.panY = this.worldStart.y + dy;
      this.draw();
      this.drawMinimap();
      return;
    }
    // hover
    const world = this.toWorldFromClient(ev);
    const h = hitTest(world.x, world.y, this.layout.nodes);
    if (h !== this.hovered) {
      this.hovered = h;
      this.opts.onNodeHover?.(h, ev);
      this.draw();
    }
  };
  private onUp = () => (this.isPanning = false);

  private onClick = (ev: MouseEvent) => {
    const w = this.toWorldFromClient(ev);
    const h = hitTest(w.x, w.y, this.layout.nodes);
    if (h) this.opts.onNodeClick?.(h, ev);
  };

  private toWorldFromClient(ev: MouseEvent) {
    const c = this.opts.canvas;
    const rect = c.getBoundingClientRect();
    const sx = (ev.clientX - rect.left) * this.dpr;
    const sy = (ev.clientY - rect.top) * this.dpr;
    return this.toWorld(sx, sy);
  }
  private toWorld(sx: number, sy: number) {
    const x = sx / this.zoom - this.panX;
    const y = sy / this.zoom - this.panY;
    return { x, y };
  }
  private toScreen(wx: number, wy: number, zoom = this.zoom) {
    return { x: (wx + this.panX) * zoom, y: (wy + this.panY) * zoom };
  }

  private draw() {
    const { ctx, dpr } = this;
    const c = this.opts.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(this.zoom, this.zoom);

    // grid bg
    ctx.save();
    ctx.translate(this.panX, this.panY);
    drawGrid(ctx, this.layout);
    // edges
    ctx.lineWidth = 2 / this.zoom;
    ctx.strokeStyle = "#6f7b91";
    ctx.globalAlpha = 0.6;
    for (const e of this.layout.edges) {
      ctx.beginPath();
      e.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // nodes
    for (const n of this.layout.nodes.values()) {
      const hovered = this.hovered && this.hovered.id === n.id;
      drawNodeBox(ctx, n, hovered ?? false);
    }

    ctx.restore();
  }

  private drawMinimap() {
    const mm = this.opts.minimap;
    if (!mm) return;
    const W = this.layout.width;
    const H = this.layout.height;

    const r = mm.getBoundingClientRect();
    mm.width = Math.max(2, Math.round(r.width * this.dpr));
    mm.height = Math.max(2, Math.round(r.height * this.dpr));
    const g = mm.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, mm.width, mm.height);

    // fit whole layout
    const sx = mm.width / W;
    const sy = mm.height / H;
    const scale = Math.min(sx, sy);
    const ox = (mm.width - W * scale) / 2;
    const oy = (mm.height - H * scale) / 2;

    // edges
    g.save();
    g.translate(ox, oy);
    g.scale(scale, scale);
    g.strokeStyle = "#59708e";
    g.lineWidth = 1 / scale;
    g.globalAlpha = 0.5;
    for (const e of this.layout.edges) {
      g.beginPath();
      e.points.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
      g.stroke();
    }
    g.globalAlpha = 1;

    // nodes
    for (const n of this.layout.nodes.values()) {
      g.fillStyle = statusColor(n.status);
      g.fillRect(n.x, n.y, n.w, n.h);
    }

    // viewport rect
    const vw = (this.opts.canvas.width / this.zoom);
    const vh = (this.opts.canvas.height / this.zoom);
    const vx = -this.panX;
    const vy = -this.panY;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2 / scale;
    g.strokeRect(vx, vy, vw, vh);

    g.restore();
  }
}

/* ================================ Facade ==================================== */

export class TechTreeView {
  private service: TechTreeService;
  private layout!: TreeLayoutResult;

  constructor(service: TechTreeService) {
    this.service = service;
  }

  /** 레이아웃 계산(두 렌더러가 공유) */
  computeLayout(opts: { nodeSize?: { w: number; h: number }, gap?: { x: number; y: number } } = {}) {
    const nodeSize = opts.nodeSize ?? { w: 160, h: 72 };
    const gap = opts.gap ?? { x: 72, y: 48 };
    const views = buildTreeView(this.service);
    this.layout = computeLayout(views, this.service, nodeSize, gap);
    return this.layout;
  }

  /** DOM 렌더러 마운트 */
  mountDom(opts: TechTreeDomOptions): DomTreeRenderer {
    const dom = new DomTreeRenderer(opts);
    if (!this.layout) this.computeLayout({ nodeSize: opts.nodeSize, gap: opts.gap });
    dom.mount(this.layout);
    return dom;
  }

  /** Canvas 렌더러 마운트 */
  mountCanvas(opts: TechTreeCanvasOptions): CanvasTreeRenderer {
    const cvs = new CanvasTreeRenderer(opts);
    if (!this.layout) this.computeLayout({ nodeSize: opts.nodeSize, gap: opts.gap });
    cvs.mount(this.layout);
    return cvs;
  }

  /** 상태가 바뀌었을 때(레벨업, 환급 등) 레이아웃/뷰 갱신 */
  refresh(renderer?: DomTreeRenderer | CanvasTreeRenderer) {
    // 상태(available/locked 등) 업데이트를 위해 뷰 재생성
    const nodeSize = { w: this.layout.gridW - (this.layout.gridW - (this.layout.nodes.values().next().value.w)), h: this.layout.gridH - (this.layout.gridH - (this.layout.nodes.values().next().value.h)) };
    this.layout = computeLayout(buildTreeView(this.service), this.service, nodeSize, { x: this.layout.gridW - nodeSize.w, y: this.layout.gridH - nodeSize.h });
    if (renderer instanceof DomTreeRenderer) renderer.mount(this.layout);
    if (renderer instanceof CanvasTreeRenderer) renderer.mount(this.layout);
  }
}

/* ============================== Helpers & CSS =============================== */

function drawGrid(ctx: CanvasRenderingContext2D, L: TreeLayoutResult) {
  ctx.save();
  ctx.fillStyle = "#0e1116";
  ctx.fillRect(0, 0, L.width, L.height);
  ctx.strokeStyle = "#1a2230";
  ctx.lineWidth = 1;
  for (let x = 0; x <= L.width; x += L.gridW) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.height); ctx.stroke();
  }
  for (let y = 0; y <= L.height; y += L.gridH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L.width, y); ctx.stroke();
  }
  ctx.restore();
}
function drawNodeBox(ctx: CanvasRenderingContext2D, n: TreeLayoutNode, hovered: boolean) {
  const r = 12;
  ctx.save();
  // body
  ctx.fillStyle = statusColor(n.status);
  roundRect(ctx, n.x, n.y, n.w, n.h, r, true, false);
  // title
  ctx.fillStyle = "#0b0f16";
  ctx.font = "bold 14px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(n.name, n.x + 10, n.y + 22);
  // meta
  ctx.fillStyle = "rgba(12,17,22,.8)";
  ctx.fillRect(n.x, n.y + n.h - 22, n.w, 22);
  ctx.fillStyle = "#cfe7ff";
  ctx.font = "12px system-ui";
  ctx.fillText(`Lv ${n.lv}/${n.maxLv} — ${n.kind}`, n.x + 10, n.y + n.h - 7);
  // hover
  if (hovered) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2 / (ctx.getTransform().a || 1);
    roundRect(ctx, n.x, n.y, n.w, n.h, r, false, true);
  }
  ctx.restore();
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function statusColor(s: NodeStatus) {
  switch (s) {
    case "locked": return "#263244";
    case "available": return "#314d3e";
    case "unlocked": return "#2c3f64";
    case "maxed": return "#3f2f4f";
  }
}
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function polylineToPath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return d;
}
function hitTest(wx: number, wy: number, nodes: Map<string, TreeLayoutNode>): TreeLayoutNode | null {
  for (const n of nodes.values()) {
    if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) return n;
  }
  return null;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]);
}
let ttxCssInjected = false;
function injectCssOnce() {
  if (ttxCssInjected) return; ttxCssInjected = true;
  const css = `
  .ttx-root { position:relative; background:#0b0f16; color:#e9edf3; font:12px/1.4 system-ui, -apple-system, Segoe UI, Roboto; border-radius:12px; padding:0 }
  .ttx-edges { position:absolute; left:0; top:0; pointer-events:none }
  .ttx-node { position:absolute; box-sizing:border-box; border-radius:12px; padding:8px 10px 26px 10px; cursor:pointer;
              border:1px solid #1c2838; box-shadow:0 4px 16px rgba(0,0,0,.25) }
  .ttx-node .ttx-node-title { font-weight:700; font-size:14px; margin-bottom:6px; text-shadow:0 1px 0 #000 }
  .ttx-node .ttx-node-meta { position:absolute; left:0; right:0; bottom:0; padding:3px 10px; font-size:11px; color:#cfe7ff;
                              background:linear-gradient(180deg, rgba(14,17,22,0), rgba(14,17,22,.9)) ; border-radius:0 0 12px 12px }
  .ttx-node.ttx-locked   { background:#263244 }
  .ttx-node.ttx-available{ background:#314d3e }
  .ttx-node.ttx-unlocked { background:#2c3f64 }
  .ttx-node.ttx-maxed    { background:#3f2f4f }
  .ttx-edge { stroke:#6f7b91; stroke-width:2; fill:none; opacity:.65 }
  .ttx-legend { position:absolute; right:10px; top:10px; background:#0e1116cc; border:1px solid #1c2838; border-radius:10px; padding:6px 8px; gap:8px; display:flex; align-items:center }
  .ttx-dot { display:inline-block; width:12px; height:12px; border-radius:51%; margin-right:6px; vertical-align:middle }
  .ttx-dot.ttx-locked{background:#263244} .ttx-dot.ttx-available{background:#314d3e}
  .ttx-dot.ttx-unlocked{background:#2c3f64} .ttx-dot.ttx-maxed{background:#3f2f4f}
  `;
  const el = document.createElement("style");
  el.id = "ttx-style";
  el.textContent = css;
  document.head.appendChild(el);
}
