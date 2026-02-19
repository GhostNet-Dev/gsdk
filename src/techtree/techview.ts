import { TechId, Tag, TechTreeKind } from "./techtreedefs";
import { TechTreeService } from "./techtreeservice";

/* =========================== View Models & Options ========================== */

export type NodeStatus = "locked" | "available" | "unlocked" | "maxed";

export type TreeNodeView = {
  id: TechId;
  name: string;
  desc?: string;
  kind: TechTreeKind;
  lv: number;
  maxLv: number;
  status: NodeStatus;
  tags: Tag[];
  icon?: string;
  children: string[];
  parents: string[];
};

export type TreeLayoutNode = TreeNodeView & {
  x: number;
  y: number;
  w: number;
  h: number;
  col?: number;    // Depth (Vertical Level)
  row?: number;    // Index in Level (Horizontal Position)
  depth?: number;
  offset?: number;
};

export type TreeLayoutEdge = {
  from: string;
  to: string;
  points: { x: number; y: number }[]; 
  status?: NodeStatus;
};

export type TreeLayoutResult = {
  nodes: Map<string, TreeLayoutNode>;
  edges: TreeLayoutEdge[];
  width: number;
  height: number;
  gridW?: number;
  gridH?: number;
};

export type TabDefinition = {
  id: string;
  label: string;
  nodeIds: Set<string>; 
};

export type TooltipOptions = {
  enable?: boolean;
  follow?: boolean;
  render?: (node: TreeLayoutNode) => string;
};

export type TechTreeRenderCallbacks = {
  onNodeClick?: (node: TreeLayoutNode, ev: MouseEvent) => void;
  onNodeHover?: (node: TreeLayoutNode | null, ev: MouseEvent) => void;
};

// --- Render Options ---

export type TechTreeDomOptions = {
  mount: HTMLElement;
  nodeSize?: { w: number; h: number };
  gap?: { x: number; y: number };
  showLegend?: boolean;
  classNameRoot?: string;
  tooltip?: TooltipOptions;
} & TechTreeRenderCallbacks;

export type TechTreeCanvasOptions = {
  canvas: HTMLCanvasElement;
  minimap?: HTMLCanvasElement;
  minimapInline?: boolean;
  minimapSize?: { w: number; h: number };
  minimapPos?: { right?: number; top?: number; left?: number; bottom?: number };
  nodeSize?: { w: number; h: number };
  gap?: { x: number; y: number };
  zoom?: { min: number; max: number; initial: number };
  pan?: { x: number; y: number };
  pixelRatio?: number;
  tooltip?: TooltipOptions;
} & TechTreeRenderCallbacks;

export type TechTreeDiabloOptions = {
  mount: HTMLElement;
  nodeSize?: { w: number; h: number };
  gap?: { x: number; y: number };
  tabs?: TabDefinition[];
  showMinimap?: boolean;
} & TechTreeRenderCallbacks;


/* ============================== CSS Definitions ============================== */

export const CSS_STANDARD_TREE = `
  .ttx-root { position:relative; background:#0b0f16; color:#e9edf3; font:12px sans-serif; overflow:auto; }
  .ttx-edges { position:absolute; pointer-events:none; left:0; top:0; }
  .ttx-edge { stroke:#6f7b91; stroke-width:2; fill:none; opacity:0.6; }
  .ttx-node { position:absolute; box-sizing:border-box; border:1px solid #333; background:#222; border-radius:8px; padding:8px; cursor:pointer; transition: transform 0.1s; }
  .ttx-node:hover { border-color:#fff; transform:scale(1.05); z-index:10; }
  .ttx-node.ttx-available { background:#2a3d2a; border-color:#484; }
  .ttx-node.ttx-unlocked { background:#2a2a4d; border-color:#66a; }
  .ttx-node.ttx-maxed { background:#3d2a3d; border-color:#a6a; }
  .ttx-node-title { font-weight:bold; margin-bottom:4px; font-size:13px; text-align: center; }
  .ttx-node-meta { font-size:11px; opacity:0.7; text-align: center; }
  .ttx-tooltip { position:fixed; z-index:9999; background:rgba(0,0,0,0.9); padding:8px 12px; border:1px solid #555; border-radius:4px; pointer-events:none; color:#fff; }
`;

export const CSS_DIABLO_TREE = `
  .diablo-root {
    /* [핵심 수정] 부모 창 밖으로 밀려나지 않도록 절대 고정 */
    position: absolute;
    inset: 0; 
    display: flex; flex-direction: column;
    background: transparent; 
    color: var(--gnx-ui-fg, #eee);
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }
  .diablo-tabs {
    display: flex; justify-content: center; gap: 6px;
    padding: 10px 16px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
    flex-wrap: wrap; 
    z-index: 50;
  }
  .diablo-tab-btn {
    appearance: none;
    background: transparent;
    border: 1px solid transparent;
    color: var(--gnx-ui-sub, #888);
    padding: 6px 14px;
    cursor: pointer;
    font-size: 13px; font-weight: 600;
    border-radius: 6px;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .diablo-tab-btn:hover {
    background: rgba(255,255,255,0.05);
    color: var(--gnx-ui-fg, #fff);
  }
  .diablo-tab-btn.active {
    background: color-mix(in oklab, var(--gnx-ui-accent, #d8b66b) 15%, transparent);
    color: var(--gnx-ui-accent, #d8b66b);
    border: 1px solid color-mix(in oklab, var(--gnx-ui-accent, #d8b66b) 30%, transparent);
    box-shadow: 0 0 12px color-mix(in oklab, var(--gnx-ui-accent, #d8b66b) 10%, transparent);
  }
  .diablo-content {
    /* [핵심 수정] 무한히 팽창하지 않도록 min-size 제약 추가 */
    flex: 1 1 0px; 
    min-width: 0; 
    min-height: 0;
    position: relative; 
    overflow: auto; 
    background-image: 
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    cursor: grab;
  }
  .diablo-content:active { cursor: grabbing; }
  .diablo-scroll-area { 
    position: relative; 
    margin: 0 auto;
  }
  .diablo-edge {
    fill: none; stroke-width: 2px;
    stroke: rgba(255,255,255,0.15);
    transition: stroke 0.3s;
  }
  .diablo-edge.unlocked {
    stroke: var(--gnx-ui-accent, #d8b66b);
    filter: drop-shadow(0 0 3px color-mix(in oklab, var(--gnx-ui-accent, #d8b66b) 50%, transparent));
  }
  .diablo-node {
    position: absolute; 
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    cursor: pointer; z-index: 10;
    width: 84px;
    transition: transform 0.2s;
  }
  .diablo-node:hover { transform: translateY(-4px) scale(1.05); z-index: 20; }
  .node-frame {
    position: relative;
    width: 56px; height: 56px;
    border: 2px solid rgba(255,255,255,0.2);
    background: var(--gnx-ui-bg-strong, #111);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: all 0.2s;
    margin-bottom: 6px;
  }
  .node-icon {
    font-size: 28px; 
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%;
  }
  .node-icon img {
    width: 80%; height: 80%; object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }
  .node-label {
    font-size: 11px;
    color: var(--gnx-ui-sub, #aaa);
    text-align: center;
    line-height: 1.2;
    width: 100%;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    text-shadow: 0 1px 2px #000;
    transition: color 0.2s;
  }
  .diablo-node:hover .node-label { color: var(--gnx-ui-fg, #fff); }
  .diablo-node.locked .node-frame { opacity: 0.5; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); }
  .diablo-node.locked .node-icon { opacity: 0.4; filter: grayscale(1); }
  .diablo-node.available .node-frame { border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3); animation: pulse-green 1.5s infinite alternate; }
  .diablo-node.available .node-label { color: #4CAF50; }
  .diablo-node.unlocked .node-frame { border-color: var(--gnx-ui-accent, #d8b66b); background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); }
  .diablo-node.unlocked .node-label { color: var(--gnx-ui-accent, #d8b66b); }
  .diablo-node.maxed .node-frame { border-color: var(--gnx-ui-coin, #ffd700); box-shadow: 0 0 12px color-mix(in oklab, var(--gnx-ui-coin, #ffd700) 30%, transparent); }
  .diablo-node.maxed .node-label { color: var(--gnx-ui-coin, #ffd700); font-weight: bold; }
  .node-lv { position: absolute; bottom: -6px; right: -6px; background: #000; border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 8px; z-index: 5; font-weight: 700; min-width: 18px; text-align: center; }
  .diablo-node.available .node-lv { border-color: #4CAF50; color: #4CAF50; }
  .diablo-node.unlocked .node-lv { border-color: var(--gnx-ui-accent, #d8b66b); color: var(--gnx-ui-accent, #d8b66b); }
  .node-tooltip-overlay {
    position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
    background: rgba(10,12,16,0.95); border: 1px solid rgba(255,255,255,0.15);
    padding: 8px 12px; border-radius: 8px; width: max-content; max-width: 220px;
    pointer-events: none; opacity: 0; transition: opacity 0.2s, transform 0.2s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 100;
  }
  .diablo-node:hover .node-tooltip-overlay { opacity: 1; transform: translateX(-50%) translateY(-4px); }
  .tt-desc { color: var(--gnx-ui-sub, #aaa); font-size: 11px; line-height: 1.4; white-space: pre-wrap; text-align: center; }
  
  .diablo-minimap {
    position: absolute; left: 20px; top: 60px;
    background: rgba(10, 15, 20, 0.85);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.7);
    z-index: 100;
    cursor: crosshair;
  }
  @keyframes pulse-green { from { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); border-color: #4CAF50; } to { box-shadow: 0 0 8px 2px rgba(76, 175, 80, 0); border-color: #81c784; } }
`;


/* ============================== Helpers & Logic ============================== */

export function generateSubtreeTabs(service: TechTreeService, rootId: string = "root_license"): TabDefinition[] {
    const tabs: TabDefinition[] = [];
    const rootEdges = service.index.edges.get(rootId);

    if (!rootEdges || rootEdges.size === 0) {
        tabs.push({ id: 'main', label: 'Main', nodeIds: new Set(service.index.byId.keys()) });
        return tabs;
    }

    const collectDescendants = (startId: string): Set<string> => {
        const result = new Set<string>();
        const q = [startId];
        result.add(startId); 

        while (q.length > 0) {
            const curr = q.shift()!;
            const children = service.index.edges.get(curr);
            if (children) {
                children.forEach(child => {
                    if (!result.has(child)) {
                        result.add(child);
                        q.push(child);
                    }
                });
            }
        }
        return result;
    };

    rootEdges.forEach(childId => {
        const childNode = service.index.byId.get(childId);
        if (!childNode) return;
        tabs.push({
            id: childId,
            label: childNode.name,
            nodeIds: collectDescendants(childId)
        });
    });

    return tabs;
}

function getIconHtml(icon?: string, kind?: TechTreeKind): string {
    if (icon) {
        if (/^(https?:\/\/|\/|\.\.?\/|data:image)/i.test(icon)) return `<img src="${icon}" draggable="false" />`;
        return icon;
    }
    switch (kind) {
        case 'trait': return "💎"; case 'skill': return "⚡"; case 'buff': return "🛡️"; case 'building': return "🏰"; case 'action': return "⚔️"; default: return "❓";
    }
}

function buildTreeView(service: TechTreeService): Map<string, TreeNodeView> {
    const out = new Map<string, TreeNodeView>();
    const index = service.index;
    const parentsMap = new Map<string, string[]>();
    for (const [p, children] of index.edges) {
        children.forEach(c => { if (!parentsMap.has(c)) parentsMap.set(c, []); parentsMap.get(c)!.push(p); });
    }
    for (const id of index.byId.keys()) {
        const n = index.byId.get(id)!;
        const lv = service.levels[id] ?? 0;
        const maxed = lv >= n.maxLv;
        const can = service.canLevelUp(id);
        let status: NodeStatus = "locked";
        if (maxed) status = "maxed"; else if (lv > 0) status = "unlocked"; else if (can.ok || can.reason.includes("funds")) status = "available";
        const defIcon = (n as any).icon; 
        out.set(id, { 
            id, name: n.name, desc: n.desc, kind: n.kind, lv, maxLv: n.maxLv, status, tags: n.tags || [], icon: defIcon, 
            children: [...(index.edges.get(id) ?? [])], 
            parents: parentsMap.get(id) ?? [] 
        });
    }
    return out;
}

/* ============================== Layout Engines ============================== */

function computeStandardLayout(
  views: Map<string, TreeNodeView>,
  service: TechTreeService,
  cell: { w: number; h: number },
  gap: { x: number; y: number }
): TreeLayoutResult {
  const depth = new Map<string, number>();
  for (const id of service.index.order) depth.set(id, 0);
  for (const id of service.index.order) {
    const d = depth.get(id) ?? 0;
    for (const ch of service.index.edges.get(id) ?? []) {
      depth.set(ch, Math.max(depth.get(ch) ?? 0, d + 1));
    }
  }

  const levels = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!levels.has(d)) levels.set(d, []);
    levels.get(d)!.push(id);
  }

  const nodes = new Map<string, TreeLayoutNode>();
  let maxDepth = 0;
  
  let maxNodesInLevel = 0;
  for (const ids of levels.values()) {
    maxNodesInLevel = Math.max(maxNodesInLevel, ids.length);
  }
  const totalWidth = maxNodesInLevel * (cell.w + gap.x) - gap.x;

  for (const [d, ids] of levels) {
    maxDepth = Math.max(maxDepth, d);
    const currentLevelWidth = ids.length * (cell.w + gap.x) - gap.x;
    const startX = (totalWidth - currentLevelWidth) / 2;

    ids.forEach((id, idx) => {
      const v = views.get(id)!;
      const x = startX + idx * (cell.w + gap.x);
      const y = d * (cell.h + gap.y);
      nodes.set(id, { ...v, x, y, w: cell.w, h: cell.h, col: d, row: idx });
    });
  }

  const edges: TreeLayoutEdge[] = [];
  for (const node of nodes.values()) {
    for (const to of node.children) {
      const target = nodes.get(to);
      if (!target) continue;
      const p1 = { x: node.x + node.w / 2, y: node.y + node.h }; 
      const p4 = { x: target.x + target.w / 2, y: target.y };     
      const midY = (p1.y + p4.y) / 2;
      edges.push({ from: node.id, to, points: [p1, { x: p1.x, y: midY }, { x: p4.x, y: midY }, p4] });
    }
  }

  return {
    nodes, edges,
    width: totalWidth,
    height: (maxDepth + 1) * (cell.h + gap.y) - gap.y,
    gridW: cell.w + gap.x,
    gridH: cell.h + gap.y
  };
}

function computeDiabloLayout(
  nodes: TreeNodeView[],
  allNodesMap: Map<string, TreeNodeView>,
  nodeSize: { w: number; h: number },
  gap: { x: number; y: number }
): TreeLayoutResult {
  const layoutNodes = new Map<string, TreeLayoutNode>();
  const nodeSet = new Set(nodes.map(n => n.id));

  const depthMap = new Map<string, number>();
  const queue: { id: string, d: number }[] = [];

  nodes.forEach(n => {
    const parentsInTab = n.parents.filter(p => nodeSet.has(p));
    if (parentsInTab.length === 0) queue.push({ id: n.id, d: 0 });
  });

  let maxDepth = 0;
  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (depthMap.has(id) && depthMap.get(id)! >= d) continue;
    depthMap.set(id, d);
    maxDepth = Math.max(maxDepth, d);

    const node = allNodesMap.get(id);
    if (node) {
      node.children.forEach(childId => {
        if (nodeSet.has(childId)) queue.push({ id: childId, d: d + 1 });
      });
    }
  }

  const depthGroups: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  depthMap.forEach((d, id) => depthGroups[d].push(id));

  const MAX_COLS = 6; 
  const paddingY = 40; 
  let currentY = paddingY;
  let maxContentWidth = 0;

  depthGroups.forEach((groupNodes) => {
    const chunks: string[][] = [];
    for (let i = 0; i < groupNodes.length; i += MAX_COLS) {
        chunks.push(groupNodes.slice(i, i + MAX_COLS));
    }
    chunks.forEach((chunk) => {
        const rowW = chunk.length * nodeSize.w + (chunk.length - 1) * gap.x;
        maxContentWidth = Math.max(maxContentWidth, rowW);
    });
  });

  const canvasWidth = maxContentWidth + (gap.x * 2) + 100;
  const centerX = canvasWidth / 2;

  depthGroups.forEach((groupNodes, d) => {
    const chunks: string[][] = [];
    for (let i = 0; i < groupNodes.length; i += MAX_COLS) {
        chunks.push(groupNodes.slice(i, i + MAX_COLS));
    }

    chunks.forEach((chunk, chunkIndex) => {
        const rowW = chunk.length * nodeSize.w + (chunk.length - 1) * gap.x;
        const startX = centerX - (rowW / 2);
        
        chunk.forEach((id, idx) => {
           const node = allNodesMap.get(id)!;
           const x = startX + idx * (nodeSize.w + gap.x);
           layoutNodes.set(id, { ...node, x, y: currentY, w: nodeSize.w, h: nodeSize.h, depth: d, offset: idx });
        });
        
        currentY += nodeSize.h + gap.y;
    });
  });

  const canvasHeight = currentY + paddingY;

  const edges: TreeLayoutEdge[] = [];
  layoutNodes.forEach(source => {
    source.children.forEach(targetId => {
      if (!layoutNodes.has(targetId)) return;
      const target = layoutNodes.get(targetId)!;
      
      const p1 = { x: source.x + source.w / 2, y: source.y + source.h }; 
      const p2 = { x: target.x + target.w / 2, y: target.y };            
      
      const c1 = { x: p1.x, y: p1.y + 20 }; 
      const c2 = { x: p2.x, y: p2.y - 20 }; 
      
      edges.push({
        from: source.id, to: targetId,
        status: source.status === 'maxed' || target.status !== 'locked' ? 'unlocked' : 'locked',
        points: [p1, c1, c2, p2] 
      });
    });
  });

  return {
    nodes: layoutNodes, edges,
    width: canvasWidth, 
    height: canvasHeight
  };
}


/* ============================== Renderers ============================== */

export class DomTreeRenderer {
  private opts: TechTreeDomOptions;
  private root!: HTMLElement;
  private tooltipEl: HTMLDivElement | null = null;
  private styleId = "ttx-style-standard";

  constructor(opts: TechTreeDomOptions) {
    this.opts = opts;
    this.injectCss();
    if (this.opts.tooltip?.enable) this.tooltipEl = createTooltipEl();
  }

  mount(layout: TreeLayoutResult) {
    const root = document.createElement("div");
    root.className = this.opts.classNameRoot ?? "ttx-root";
    root.style.width = "100%"; 
    root.style.height = "100%";
    
    const content = document.createElement("div");
    content.style.position = "relative";
    content.style.minWidth = `${layout.width}px`;
    content.style.minHeight = `${layout.height}px`;
    content.style.margin = "0 auto";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ttx-edges");
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    content.appendChild(svg);

    for (const e of layout.edges) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("class", "ttx-edge");
      path.setAttribute("d", polylineToPath(e.points));
      svg.appendChild(path);
    }

    for (const nd of layout.nodes.values()) {
      const el = document.createElement("div");
      el.className = `ttx-node ttx-${nd.status} ttx-kind-${nd.kind}`;
      el.style.left = `${nd.x}px`; el.style.top = `${nd.y}px`;
      el.style.width = `${nd.w}px`; el.style.height = `${nd.h}px`;
      el.innerHTML = `<div class="ttx-node-title">${escapeHtml(nd.name)}</div><div class="ttx-node-meta">Lv ${nd.lv}/${nd.maxLv}</div>`;
      this.attachEvents(el, nd);
      content.appendChild(el);
    }

    if (this.opts.showLegend) {
      const lg = document.createElement("div");
      lg.className = "ttx-legend";
      lg.style.cssText = "position:absolute; bottom:10px; right:10px; font-size:10px; opacity:0.7; pointer-events:none;";
      lg.innerHTML = `Lck/Avl/Unl/Max`;
      root.appendChild(lg);
    }

    root.appendChild(content);
    this.opts.mount.innerHTML = "";
    this.opts.mount.appendChild(root);
    this.root = root;
  }

  unmount() {
    this.root?.remove();
    this.tooltipEl?.remove();
  }

  private injectCss() {
    if (document.getElementById(this.styleId)) return;
    const el = document.createElement("style"); el.id = this.styleId; 
    el.textContent = CSS_STANDARD_TREE; document.head.appendChild(el);
  }

  private attachEvents(el: HTMLElement, node: TreeLayoutNode) {
    el.onclick = (e) => this.opts.onNodeClick?.(node, e);
    el.onmouseenter = (e) => {
      this.opts.onNodeHover?.(node, e);
      if (this.tooltipEl) {
        this.tooltipEl.innerHTML = this.opts.tooltip?.render?.(node) ?? defaultTooltipHTML(node);
        this.tooltipEl.style.opacity = "1";
        positionTooltip(this.tooltipEl, e.clientX, e.clientY);
      }
    };
    el.onmousemove = (e) => {
      if (this.tooltipEl && (this.opts.tooltip?.follow ?? true)) positionTooltip(this.tooltipEl, e.clientX, e.clientY);
    };
    el.onmouseleave = (e) => {
      this.opts.onNodeHover?.(null, e);
      if (this.tooltipEl) this.tooltipEl.style.opacity = "0";
    };
  }
}

export class CanvasTreeRenderer {
  private opts: TechTreeCanvasOptions;
  private layout!: TreeLayoutResult;
  private ctx!: CanvasRenderingContext2D;
  private dpr = 1;
  private zoom = 1;
  private panX = 0; private panY = 0;
  private hovered: TreeLayoutNode | null = null;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private worldStart = { x: 0, y: 0 };
  private mmCanvas?: HTMLCanvasElement;
  private mmCtx?: CanvasRenderingContext2D;
  private tooltipEl: HTMLDivElement | null = null;

  constructor(opts: TechTreeCanvasOptions) {
    this.opts = opts;
    if (this.opts.tooltip?.enable) this.tooltipEl = createTooltipEl();
  }

  mount(layout: TreeLayoutResult) {
    this.layout = layout;
    this.dpr = this.opts.pixelRatio ?? window.devicePixelRatio ?? 1;
    this.zoom = this.opts.zoom?.initial ?? 1;
    
    const c = this.opts.canvas;
    const rect = c.getBoundingClientRect();
    if (this.opts.pan) {
        this.panX = this.opts.pan.x;
        this.panY = this.opts.pan.y;
    } else {
        this.panX = (rect.width / this.zoom - layout.width) / 2;
        this.panY = 50; 
    }

    c.width = rect.width * this.dpr; c.height = rect.height * this.dpr;
    this.ctx = c.getContext("2d")!;

    this.bindEvents();
    if (this.opts.minimap) this.setupMinimap();
    
    this.draw();
    if (this.mmCtx) this.drawMinimap();
  }

  unmount() {
    this.tooltipEl?.remove();
    const c = this.opts.canvas;
    c.onmousedown = null; c.onwheel = null; c.onclick = null;
    window.onmousemove = null; window.onmouseup = null;
  }
  
  private bindEvents() {
    const c = this.opts.canvas;
    c.onwheel = (e) => {
      e.preventDefault();
      const scale = Math.exp(-e.deltaY * 0.001);
      this.zoom = Math.max(0.1, Math.min(5, this.zoom * scale));
      this.draw(); if(this.mmCtx) this.drawMinimap();
    };
    c.onmousedown = (e) => { this.isPanning = true; this.panStart = { x: e.clientX, y: e.clientY }; this.worldStart = { x: this.panX, y: this.panY }; };
    window.onmousemove = (e) => {
        if (this.isPanning) {
            this.panX = this.worldStart.x + (e.clientX - this.panStart.x) / this.zoom;
            this.panY = this.worldStart.y + (e.clientY - this.panStart.y) / this.zoom;
            this.draw(); if(this.mmCtx) this.drawMinimap();
        } else {
            const rect = this.opts.canvas.getBoundingClientRect();
            const wx = (e.clientX - rect.left) * this.dpr / this.zoom - this.panX;
            const wy = (e.clientY - rect.top) * this.dpr / this.zoom - this.panY;
            const hit = hitTest(wx, wy, this.layout.nodes);
            if (hit !== this.hovered) {
                this.hovered = hit;
                this.draw();
                if(this.tooltipEl) {
                   if(hit) {
                       this.tooltipEl.innerHTML = this.opts.tooltip?.render?.(hit) ?? defaultTooltipHTML(hit);
                       this.tooltipEl.style.opacity = '1';
                   } else this.tooltipEl.style.opacity = '0';
                }
            }
            if(this.tooltipEl && this.hovered) positionTooltip(this.tooltipEl, e.clientX, e.clientY);
        }
    };
    window.onmouseup = () => this.isPanning = false;
    c.onclick = (e) => { if (this.hovered) this.opts.onNodeClick?.(this.hovered, e); }
  }

  private draw() {
    const ctx = this.ctx;
    const { width, height } = this.opts.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b0f16"; ctx.fillRect(0,0, width, height);
    ctx.scale(this.zoom, this.zoom); ctx.translate(this.panX, this.panY);

    ctx.strokeStyle = "#445"; ctx.lineWidth = 2;
    for (const e of this.layout.edges) {
      ctx.beginPath(); 
      if (e.points.length === 4) {
          const [p0, c1, c2, p3] = e.points;
          ctx.moveTo(p0.x, p0.y);
          ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
      } else {
          e.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      }
      ctx.stroke();
    }

    for (const n of this.layout.nodes.values()) {
        const hover = this.hovered === n;
        ctx.fillStyle = statusColor(n.status);
        if(hover) ctx.fillStyle = "#556";
        roundRect(ctx, n.x, n.y, n.w, n.h, 8, true, true);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.fillText(n.name, n.x + 10, n.y + 20);
        ctx.font = "12px sans-serif"; ctx.fillStyle = "#aaa"; ctx.fillText(`Lv ${n.lv}/${n.maxLv}`, n.x + 10, n.y + n.h - 10);
    }
  }

  private setupMinimap() { 
      this.mmCanvas = this.opts.minimap; if (!this.mmCanvas) return;
      const r = this.mmCanvas.getBoundingClientRect();
      this.mmCanvas.width = r.width * this.dpr; this.mmCanvas.height = r.height * this.dpr;
      this.mmCtx = this.mmCanvas.getContext("2d")!;
  }
  
  private drawMinimap() {
      if (!this.mmCtx || !this.mmCanvas) return;
      const ctx = this.mmCtx;
      const w = this.mmCanvas.width; const h = this.mmCanvas.height;
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h); ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);
      const scale = Math.min(w / this.layout.width, h / this.layout.height) * 0.9;
      const ox = (w - this.layout.width * scale)/2; const oy = (h - this.layout.height * scale)/2;
      ctx.translate(ox, oy); ctx.scale(scale, scale);
      for(const n of this.layout.nodes.values()) { ctx.fillStyle = statusColor(n.status); ctx.fillRect(n.x, n.y, n.w, n.h); }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 / scale;
      const vx = -this.panX; const vy = -this.panY;
      const vw = this.opts.canvas.width / this.zoom; const vh = this.opts.canvas.height / this.zoom;
      ctx.strokeRect(vx, vy, vw, vh);
  }
}

export class DiabloTreeRenderer {
  private rootEl: HTMLElement;
  private service: TechTreeService;
  private options: TechTreeDiabloOptions;
  
  private currentTabId: string;
  private nodeViews: Map<string, TreeNodeView> = new Map();
  private minimapCanvas?: HTMLCanvasElement;
  private updateMinimapFrame?: number;
  private styleId = "ttx-style-diablo";

  constructor(service: TechTreeService, options: TechTreeDiabloOptions) {
    this.service = service;
    this.options = { showMinimap: true, ...options };
    this.injectCss();
    this.rootEl = document.createElement("div");
    this.rootEl.className = "diablo-root";
    this.currentTabId = (options.tabs && options.tabs.length > 0) ? options.tabs[0].id : "all";
  }

  private injectCss() {
    if (document.getElementById(this.styleId)) return;
    const el = document.createElement("style"); 
    el.id = this.styleId; 
    el.textContent = CSS_DIABLO_TREE; 
    document.head.appendChild(el);
  }

  mount() {
    // 마운트 될 대상 엘리먼트가 static이면 절대 좌표(absolute)가 어긋나는 것을 방지
    const computed = window.getComputedStyle(this.options.mount);
    if (computed.position === 'static') {
        this.options.mount.style.position = 'relative';
    }

    this.options.mount.innerHTML = "";
    this.options.mount.appendChild(this.rootEl);
    this.refresh();
  }

  refresh() {
    this.nodeViews = buildTreeView(this.service);
    this.render();
  }

  private render() {
    this.rootEl.innerHTML = "";

    if (this.options.tabs && this.options.tabs.length > 0) {
      const tabBar = document.createElement("div");
      tabBar.className = "diablo-tabs";
      this.options.tabs.forEach(tab => {
        const btn = document.createElement("button");
        const isActive = this.currentTabId === tab.id;
        btn.className = `diablo-tab-btn ${isActive ? "active" : ""}`;
        btn.textContent = tab.label;
        btn.dataset.id = tab.id;
        btn.onclick = () => this.onTabClick(tab.id);
        tabBar.appendChild(btn);
      });
      this.rootEl.appendChild(tabBar);
    }

    const content = document.createElement("div");
    content.className = "diablo-content";
    this.rootEl.appendChild(content);
    
    this.renderTreeContent(content);
  }

  private onTabClick(tabId: string) {
      if (this.currentTabId === tabId) return;
      this.currentTabId = tabId;

      const buttons = this.rootEl.querySelectorAll('.diablo-tab-btn');
      buttons.forEach(b => {
          const btn = b as HTMLElement;
          if (btn.dataset.id === tabId) btn.classList.add('active');
          else btn.classList.remove('active');
      });

      const content = this.rootEl.querySelector('.diablo-content') as HTMLElement;
      if (content) this.renderTreeContent(content);
  }

  private renderTreeContent(container: HTMLElement) {
    container.innerHTML = "";
    
    const currentTabDef = this.options.tabs?.find(t => t.id === this.currentTabId);
    const allNodes = Array.from(this.nodeViews.values());
    const filteredNodes = currentTabDef ? allNodes.filter(n => currentTabDef.nodeIds.has(n.id)) : allNodes;

    const nodeSize = this.options.nodeSize || { w: 84, h: 84 };
    const gap = this.options.gap || { x: 10, y: 50 };
    const layout = computeDiabloLayout(filteredNodes, this.nodeViews, nodeSize, gap);

    const scrollArea = document.createElement("div");
    scrollArea.className = "diablo-scroll-area";
    // 스크롤 내부 영역을 layout 크기에 딱 맞춤 (margin auto로 중앙 정렬)
    scrollArea.style.width = `${layout.width}px`; 
    scrollArea.style.height = `${layout.height}px`;
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
    svg.style.position = "absolute"; svg.style.top = "0"; svg.style.left = "0"; svg.style.pointerEvents = "none";
    
    layout.edges.forEach(edge => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const [p0, c1, c2, p3] = edge.points;
      const d = `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`;
      path.setAttribute("d", d); path.setAttribute("class", `diablo-edge ${edge.status}`);
      svg.appendChild(path);
    });
    scrollArea.appendChild(svg);

    layout.nodes.forEach(node => {
      const el = document.createElement("div");
      el.className = `diablo-node ${node.status} kind-${node.kind}`;
      el.style.left = `${node.x}px`; el.style.top = `${node.y}px`;
      el.style.width = `${node.w}px`; el.style.height = `${node.h}px`;
      
      const iconHtml = getIconHtml(node.icon, node.kind);
      el.innerHTML = `<div class="node-frame"><div class="node-icon">${iconHtml}</div><div class="node-lv">${node.lv}</div></div><div class="node-label">${node.name}</div><div class="node-tooltip-overlay"><div class="tt-desc">${node.desc || node.kind}</div></div>`;
      el.onclick = (e) => this.options.onNodeClick?.(node, e);
      scrollArea.appendChild(el);
    });

    container.appendChild(scrollArea);
    
    this.attachDragToPan(container);

    if (this.options.showMinimap) {
        this.renderMinimap(container, layout);
    }
    
    requestAnimationFrame(() => {
        container.scrollTop = 0;
        if (layout.width > container.clientWidth) {
            container.scrollLeft = (layout.width - container.clientWidth) / 2;
        }
        if (this.options.showMinimap) this.updateMinimap(container, layout);
    });
  }

  private attachDragToPan(container: HTMLElement) {
      let isDown = false;
      let startX = 0, startY = 0;
      let scrollLeft = 0, scrollTop = 0;

      container.addEventListener('mousedown', (e) => {
          if ((e.target as HTMLElement).tagName.toLowerCase() === 'canvas') return;
          isDown = true;
          startX = e.pageX - container.offsetLeft;
          startY = e.pageY - container.offsetTop;
          scrollLeft = container.scrollLeft;
          scrollTop = container.scrollTop;
      });

      container.addEventListener('mouseleave', () => isDown = false);
      container.addEventListener('mouseup', () => isDown = false);

      container.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - container.offsetLeft;
          const y = e.pageY - container.offsetTop;
          // 마우스 드래그 감도 1:1로 수정
          const walkX = (x - startX); 
          const walkY = (y - startY);
          container.scrollLeft = scrollLeft - walkX;
          container.scrollTop = scrollTop - walkY;
      });
  }

  private renderMinimap(container: HTMLElement, layout: TreeLayoutResult) {
      if (this.minimapCanvas) this.minimapCanvas.remove();
      
      const canvas = document.createElement('canvas');
      canvas.className = 'diablo-minimap';
      const MAX_SIZE = 150;
      
      // 실제 컨텐츠가 그려진 layout.width 와 컨테이너의 clientWidth 중 큰 쪽이 진짜 세계 크기
      const worldW = Math.max(layout.width, container.clientWidth);
      const worldH = Math.max(layout.height, container.clientHeight);

      // 균일한 배율(Uniform Scale) 유지 (가로, 세로 찌그러짐 방지)
      const scale = Math.min(MAX_SIZE / worldW, MAX_SIZE / worldH);

      const w = worldW * scale;
      const h = worldH * scale;

      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      
      this.minimapCanvas = canvas;
      this.rootEl.appendChild(canvas);

      container.addEventListener('scroll', () => {
          if (this.updateMinimapFrame) cancelAnimationFrame(this.updateMinimapFrame);
          this.updateMinimapFrame = requestAnimationFrame(() => this.updateMinimap(container, layout));
      });

      let isDraggingMap = false;
      const moveViewport = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          container.scrollLeft = (x / scale) - (container.clientWidth / 2);
          container.scrollTop = (y / scale) - (container.clientHeight / 2);
      };

      canvas.addEventListener('mousedown', (e) => {
          isDraggingMap = true;
          moveViewport(e);
      });
      canvas.addEventListener('mousemove', (e) => {
          if (isDraggingMap) moveViewport(e);
      });
      canvas.addEventListener('mouseup', () => isDraggingMap = false);
      canvas.addEventListener('mouseleave', () => isDraggingMap = false);
  }

  private updateMinimap(container: HTMLElement, layout: TreeLayoutResult) {
      if (!this.minimapCanvas) return;
      const ctx = this.minimapCanvas.getContext('2d');
      if (!ctx) return;

      const worldW = Math.max(layout.width, container.clientWidth);
      const worldH = Math.max(layout.height, container.clientHeight);
      if (worldW === 0 || worldH === 0) return;

      // X, Y 독립 배율이 아닌 단일 비율(Uniform Scale) 적용
      const scale = this.minimapCanvas.width / worldW;
      
      ctx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

      // margin: 0 auto 로 인해 발생하는 x, y 오프셋 계산
      const offsetX = Math.max(0, (container.clientWidth - layout.width) / 2);
      const offsetY = Math.max(0, (container.clientHeight - layout.height) / 2);

      layout.nodes.forEach(node => {
          ctx.fillStyle = statusColor(node.status);
          ctx.fillRect((node.x + offsetX) * scale, (node.y + offsetY) * scale, node.w * scale, node.h * scale);
      });

      const vx = container.scrollLeft * scale;
      const vy = container.scrollTop * scale;
      const vw = container.clientWidth * scale;
      const vh = container.clientHeight * scale;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(vx, vy, vw, vh);
  }
}

export class TechTreeView {
    constructor(private s: TechTreeService){}
    computeLayout(o:any){ return computeStandardLayout(buildTreeView(this.s), this.s, o.nodeSize, o.gap); }
    mountDom(o:TechTreeDomOptions){ const d=new DomTreeRenderer(o); d.mount(this.computeLayout(o)); return d; }
    mountCanvas(o:TechTreeCanvasOptions){ const c=new CanvasTreeRenderer(o); c.mount(this.computeLayout(o)); return c; }
}

function createTooltipEl() { const d=document.createElement("div"); d.className="ttx-tooltip"; document.body.appendChild(d); return d; }
function positionTooltip(el:HTMLElement, x:number, y:number) { el.style.left=`${x+15}px`; el.style.top=`${y+15}px`; }
function defaultTooltipHTML(n:any) { return `<b>${escapeHtml(n.name)}</b><br>${n.kind}`; }
function escapeHtml(s:string) { return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]); }
function polylineToPath(pts: {x:number,y:number}[]) { return pts.length ? `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p=>`L ${p.x} ${p.y}`).join(" ") : ""; }
function hitTest(x:number, y:number, nodes:Map<string, TreeLayoutNode>) { for(const n of nodes.values()) if(x>=n.x && x<=n.x+n.w && y>=n.y && y<=n.y+n.h) return n; return null; }
function statusColor(s: NodeStatus) { if(s==='locked') return '#444'; if(s==='available') return '#4CAF50'; if(s==='unlocked') return '#d8b66b'; if(s==='maxed') return '#ffd700'; return '#555'; }
function roundRect(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number, f:boolean, s:boolean) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); if(f) ctx.fill(); if(s) ctx.stroke(); }