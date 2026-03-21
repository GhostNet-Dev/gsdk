// ============================================================================
// views/techtreeview.ts
// ============================================================================
import { TechTreeService } from '@Glibs/techtree/techtreeservice';
import { TechId, RarityConfig } from '@Glibs/techtree/techtreedefs';
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';
import { TooltipComponent } from '../core/tooltip';

interface TechTreeProps {
    service: TechTreeService;
    onLevelUp?: (id: TechId) => void;
}

const NODE_W = 58;
const NODE_H = 58;
const R_GAP  = 170;
const PAD    = 90;

export class TechTreeView implements IDialogView<TechTreeProps> {
    private ctx!: ViewContext;
    private props!: TechTreeProps;
    private container!: HTMLElement;
    private tabsEl!: HTMLElement;
    private contentEl!: HTMLElement;
    private canvas!: HTMLCanvasElement;
    private nodesLayer!: HTMLElement;
    private tooltip!: TooltipComponent;

    private nodeElements  = new Map<TechId, HTMLElement>();
    private nodePositions = new Map<TechId, { x: number; y: number }>();
    private levelRadii = new Map<number, number>(); // 동심원 가이드용
    private centerX  = 0;
    private centerY  = 0;
    private maxLevel = 0;

    private roots: TechId[] = [];
    private selectedRoot: TechId = '';

    mount(ctx: ViewContext, props: TechTreeProps): void {
        this.ctx   = ctx;
        this.props = props;

        // gnx-dialog__body는 display:grid / overflow-x:hidden 이라 내부 flex 레이아웃이 깨짐.
        // techtree 전용으로 body를 flex 컨테이너로 재설정한다.
        const body = ctx.shell.body;
        body.style.padding       = '0';
        body.style.display       = 'flex';
        body.style.flexDirection = 'column';
        body.style.overflow      = 'hidden';

        this.container = createEl(ctx.shell.sr, 'div');
        this.container.className = 'techtree-view';
        body.appendChild(this.container);

        this.tooltip = new TooltipComponent(ctx.shell.sr);
        this.setupStyles();

        // 루트 노드(진입 차수 0) 목록
        this.roots = props.service.index.order.filter(
            id => (props.service.index.indeg.get(id) ?? 0) === 0
        );
        this.selectedRoot = this.roots[0] ?? '';

        // 탭 영역 (고정)
        this.tabsEl = createEl(ctx.shell.sr, 'div');
        this.tabsEl.className = 'techtree-tabs';
        this.container.appendChild(this.tabsEl);
        this.renderTabs();

        // 트리 콘텐츠 영역 (스크롤)
        this.contentEl = createEl(ctx.shell.sr, 'div');
        this.contentEl.className = 'techtree-content';
        this.container.appendChild(this.contentEl);

        this.renderTree();
    }

    private setupStyles() {
        const style = css`
            .techtree-view {
                position: relative;
                flex: 1;
                min-height: 0;
                width: 100%;
                background: radial-gradient(ellipse at 25% 40%, #16213e 0%, #0f0f1a 60%, #0a0a12 100%);
                display: flex;
                flex-direction: column;
                user-select: none;
            }
            .techtree-tabs {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 10px 16px;
                background: rgba(5,5,15,0.6);
                border-bottom: 1px solid #1a1a2a;
                overflow-x: auto;
                scrollbar-width: none;
                z-index: 10;
            }
            .techtree-tabs::-webkit-scrollbar { display: none; }
            .techtree-tab {
                display: flex;
                align-items: center;
                gap: 7px;
                padding: 5px 16px;
                border-radius: 20px;
                border: 1.5px solid #252535;
                background: rgba(15,15,28,0.8);
                color: #4a4a6a;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                letter-spacing: 0.03em;
                transition: border-color 0.15s, color 0.15s, background 0.15s, box-shadow 0.15s;
            }
            .techtree-tab:hover {
                border-color: #89b4fa;
                color: #cdd6f4;
                background: rgba(137,180,250,0.07);
            }
            .techtree-tab.active {
                border-color: var(--tab-color, #89b4fa);
                color: var(--tab-color, #89b4fa);
                background: rgba(137,180,250,0.08);
                box-shadow: 0 0 10px var(--tab-glow, rgba(137,180,250,0.18));
            }
            .techtree-tab-icon { font-size: 15px; line-height: 1; }
            .techtree-content {
                flex: 1;
                min-height: 0;      /* flex + overflow:auto 동작을 위해 필수 */
                min-width: 0;
                position: relative;
                overflow: auto;
                scroll-behavior: smooth;
            }
            .techtree-canvas {
                position: absolute;
                top: 0; left: 0;
                pointer-events: none;
                z-index: 1;
            }
            .techtree-nodes {
                position: relative;
                z-index: 2;
            }
            .techtree-node {
                position: absolute;
                width: ${NODE_W}px;
                height: ${NODE_H}px;
                background: linear-gradient(145deg, #1e1e30 0%, #252540 100%);
                border: 2px solid #3a3a5a;
                border-radius: 14px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                            box-shadow 0.18s ease,
                            border-color 0.18s ease;
                transform: translate(-50%, -50%);
                box-shadow: 0 4px 18px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06);
            }
            .techtree-node:hover:not(.locked) {
                transform: translate(-50%, -50%) scale(1.18);
                box-shadow: 0 0 28px var(--node-glow, rgba(137,180,250,0.45)),
                            0 8px 28px rgba(0,0,0,0.7);
                z-index: 20;
            }
            .techtree-node.active {
                background: linear-gradient(145deg, #1e2040 0%, #252850 100%);
            }
            .techtree-node.available {
                border-color: #89b4fa;
                animation: ttree-pulse 2.4s ease-in-out infinite;
            }
            @keyframes ttree-pulse {
                0%,100% { box-shadow: 0 0 10px rgba(137,180,250,0.2), 0 4px 18px rgba(0,0,0,0.65); }
                50%      { box-shadow: 0 0 22px rgba(137,180,250,0.5), 0 4px 18px rgba(0,0,0,0.65); }
            }
            .techtree-node.locked {
                opacity: 0.22;
                filter: grayscale(1) blur(0.4px);
                cursor: default;
            }
            .techtree-node.maxed {
                background: linear-gradient(145deg, #201a10 0%, #2a2015 100%);
            }
            .techtree-node-icon {
                font-size: 26px;
                line-height: 1;
                filter: drop-shadow(0 2px 5px rgba(0,0,0,0.7));
            }
            .techtree-node-lv {
                position: absolute;
                bottom: -9px; right: -9px;
                background: #0d0d1a;
                color: #b0b8d8;
                padding: 1px 5px;
                border-radius: 5px;
                font-size: 10px;
                font-weight: 800;
                border: 1px solid #3a3a5a;
                letter-spacing: 0.02em;
            }
            .techtree-node.maxed .techtree-node-lv {
                color: #fab387;
                border-color: #fab387;
                background: rgba(250,179,135,0.12);
            }
            .techtree-node-name {
                position: absolute;
                top: calc(100% + 12px);
                left: 50%;
                transform: translateX(-50%);
                white-space: nowrap;
                font-size: 10px;
                color: #4a4a6a;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                text-shadow: 0 1px 4px rgba(0,0,0,1);
                pointer-events: none;
                transition: color 0.15s;
            }
            .techtree-node.active .techtree-node-name  { color: #8888aa; }
            .techtree-node:hover .techtree-node-name   { color: #cdd6f4; }
        `;
        this.ctx.render.ensureScopedCSS(this.ctx.shell.sr, style, 'techtree-view');
    }

    // ── 탭 렌더링 ──────────────────────────────────────────────────────────
    private renderTabs() {
        this.tabsEl.innerHTML = '';
        this.roots.forEach(rootId => {
            const node = this.props.service.index.byId.get(rootId)!;
            const rarityColor = node.rarity
                ? (RarityConfig[node.rarity]?.color ?? '#89b4fa')
                : '#89b4fa';

            const tab = createEl(this.ctx.shell.sr, 'button');
            tab.className = `techtree-tab${rootId === this.selectedRoot ? ' active' : ''}`;
            tab.style.setProperty('--tab-color', rarityColor);
            tab.style.setProperty('--tab-glow', `${rarityColor}33`);
            tab.innerHTML = `
                <span class="techtree-tab-icon">${node.icon ?? '📌'}</span>
                <span>${node.name}</span>
            `;
            tab.addEventListener('click', () => this.selectRoot(rootId));
            this.tabsEl.appendChild(tab);
        });
    }

    // ── 탭 선택 ────────────────────────────────────────────────────────────
    private selectRoot(rootId: TechId) {
        this.selectedRoot = rootId;
        Array.from(this.tabsEl.querySelectorAll<HTMLElement>('.techtree-tab'))
            .forEach((tab, i) => tab.classList.toggle('active', this.roots[i] === rootId));
        this.renderTree();
    }

    // ── 선택된 루트의 서브트리 id 수집 (BFS) ──────────────────────────────
    private getSubtreeIds(rootId: TechId): Set<TechId> {
        const result = new Set<TechId>();
        const queue = [rootId];
        while (queue.length) {
            const id = queue.shift()!;
            if (result.has(id)) continue;
            result.add(id);
            this.props.service.index.edges.get(id)?.forEach(child => queue.push(child));
        }
        return result;
    }

    // ── 트리 콘텐츠 렌더링 ────────────────────────────────────────────────
    private renderTree() {
        this.contentEl.innerHTML = '';
        this.nodeElements.clear();
        this.nodePositions.clear();
        if (!this.selectedRoot) return;

        const subtreeIds = this.getSubtreeIds(this.selectedRoot);

        this.canvas = createEl(this.ctx.shell.sr, 'canvas');
        this.canvas.className = 'techtree-canvas';
        this.contentEl.appendChild(this.canvas);

        this.nodesLayer = createEl(this.ctx.shell.sr, 'div');
        this.nodesLayer.className = 'techtree-nodes';
        this.contentEl.appendChild(this.nodesLayer);

        this.calculateLayout(subtreeIds);
        this.drawNodes();
        // rAF1: 선 그리기 (노드 DOM이 layout에 반영된 후)
        // rAF2: scroll (body flex 재설정 + canvas 크기 반영 후)
        requestAnimationFrame(() => {
            this.drawLines();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => this.scrollToCenter());
            });
        });
    }

    // ── 레이아웃 계산 (섹터 기반 + 동적 반지름) ──────────────────────────────
    //  반지름을 레벨 고정값이 아닌 "인접 자식이 겹치지 않을 최소값"으로 동적 결정.
    //  → 겹침 제거 + 불필요한 원거리 배치 방지
    private calculateLayout(subtreeIds: Set<TechId>) {
        const { index } = this.props.service;

        // 1. BFS 깊이 계산 (maxLevel용)
        const levels = new Map<TechId, number>();
        {
            const q: { id: TechId; lv: number }[] = [{ id: this.selectedRoot, lv: 0 }];
            while (q.length) {
                const { id, lv } = q.shift()!;
                levels.set(id, Math.max(levels.get(id) ?? 0, lv));
                index.edges.get(id)?.forEach((c: TechId) => {
                    if (subtreeIds.has(c)) q.push({ id: c, lv: lv + 1 });
                });
            }
        }
        this.maxLevel = Math.max(...Array.from(levels.values()), 0);

        // 2. 서브트리의 리프(Leaf) 개수 계산 (각도 배분용)
        const leafCount = new Map<TechId, number>();
        const getChildren = (id: TechId): TechId[] =>
            Array.from(index.edges.get(id) ?? []).filter((c: TechId) => subtreeIds.has(c));

        const computeLeafCount = (id: TechId): number => {
            const children = getChildren(id);
            if (children.length === 0) {
                leafCount.set(id, 1);
                return 1;
            }
            const count = children.reduce((s, c) => s + computeLeafCount(c), 0);
            leafCount.set(id, count);
            return count;
        };
        computeLeafCount(this.selectedRoot);

        // 3. 뷰포트 기반 파라미터 결정
        const dlgEl  = this.ctx.shell.dlg as HTMLElement;
        const bounds = dlgEl.getBoundingClientRect();
        const tabH   = this.tabsEl.offsetHeight || 48;
        const vpW    = bounds.width  > 0 ? bounds.width  : Math.min(1080, window.innerWidth  - 32);
        const vpH    = bounds.height > 0 ? bounds.height - tabH : window.innerHeight * 0.8 - tabH;
        const targetR = Math.min(vpW, vpH) * 0.45;

        const MIN_GAP    = 25;  // 노드 간 최소 여백 상향
        const MIN_RADIAL = this.maxLevel > 0
            ? Math.max(NODE_W + MIN_GAP, Math.min(150, targetR / this.maxLevel))
            : 120;

        const tempPos = new Map<TechId, { x: number; y: number }>();
        tempPos.set(this.selectedRoot, { x: 0, y: 0 });

        this.levelRadii = new Map<number, number>();
        this.levelRadii.set(0, 0);

        const place = (id: TechId, parentR: number, aStart: number, aEnd: number, lv: number) => {
            const children = getChildren(id);
            if (!children.length) return;

            const sectorAngle = aEnd - aStart;
            const totalLeafs  = leafCount.get(id) ?? 1;

            // 자식별 섹터 각도 (리프 노드 비율에 따라 할당)
            const spans = children.map((c: TechId) =>
                sectorAngle * ((leafCount.get(c) ?? 1) / totalLeafs)
            );

            // 겹침 방지를 위한 반지름 계산
            // 호의 길이 (radius * angle) 가 최소 노드 크기보다 커야 함
            let requiredRadius = parentR + MIN_RADIAL;
            for (let i = 0; i < children.length; i++) {
                const span = spans[i];
                if (span > 0) {
                    const rForThisChild = (NODE_W + MIN_GAP) / span;
                    requiredRadius = Math.max(requiredRadius, rForThisChild);
                }
            }

            // 부모 레벨과의 간격 보장 및 급격한 팽창 억제 (하지만 겹침보다는 확장을 우선)
            const radius = Math.min(requiredRadius, parentR + MIN_RADIAL * 4);

            const childLv = lv + 1;
            this.levelRadii.set(childLv, Math.max(this.levelRadii.get(childLv) ?? 0, radius));

            let cur = aStart;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const span  = spans[i];
                const mid   = cur + span / 2;
                tempPos.set(child, {
                    x: radius * Math.cos(mid),
                    y: radius * Math.sin(mid),
                });
                place(child, radius, cur, cur + span, childLv);
                cur += span;
            }
        };

        place(this.selectedRoot, 0, -Math.PI, Math.PI, 0);

        // 4. bounding box -> 캔버스 크기 결정
        const margin = PAD + NODE_W / 2;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        tempPos.forEach(({ x, y }) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        const offsetX = -minX + margin;
        const offsetY = -minY + margin;
        const canvasW = (maxX - minX) + margin * 2;
        const canvasH = (maxY - minY) + margin * 2;

        this.centerX = offsetX;
        this.centerY = offsetY;
        tempPos.forEach((pos, id) => {
            this.nodePositions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
        });

        this.canvas.width  = canvasW;
        this.canvas.height = canvasH;
        this.nodesLayer.style.width  = `${canvasW}px`;
        this.nodesLayer.style.height = `${canvasH}px`;
    }

    /** 콘텐츠 영역 스크롤을 루트 노드(중앙)로 초기 정렬
     *  최대 10프레임까지 재시도 */
    private scrollToCenter(retry = 0) {
        const el = this.contentEl;
        const cw = el.clientWidth;
        const ch = el.clientHeight;

        if ((cw === 0 || ch === 0) && retry < 10) {
            requestAnimationFrame(() => this.scrollToCenter(retry + 1));
            return;
        }

        el.scrollLeft = Math.max(0, this.centerX - cw / 2);
        el.scrollTop  = Math.max(0, this.centerY - ch / 2);
    }

    // ── 노드 DOM 생성 ───────────────────────────────────────────────────────
    private drawNodes() {
        const { service } = this.props;

        service.index.order.forEach(id => {
            const node   = service.index.byId.get(id)!;
            const pos    = this.nodePositions.get(id);
            if (!pos) return;

            const curLv      = service.levels[id] ?? 0;
            const res        = service.canLevelUp(id);
            const isLocked   = curLv === 0 && !res.ok && res.reason.includes('requirement');
            const isMaxed    = curLv >= node.maxLv;
            const isAvail    = res.ok;
            const isActive   = curLv > 0;

            const rarityColor = node.rarity ? (RarityConfig[node.rarity]?.color ?? '#3a3a5a') : '#3a3a5a';
            const borderColor = isMaxed   ? '#fab387'
                              : isActive  ? rarityColor
                              : isAvail   ? '#89b4fa'
                              :             '#3a3a5a';

            const el = createEl(this.ctx.shell.sr, 'div');
            el.className = [
                'techtree-node',
                isLocked  ? 'locked'    : '',
                isMaxed   ? 'maxed'     : '',
                isAvail   ? 'available' : '',
                isActive  ? 'active'    : '',
            ].filter(Boolean).join(' ');

            el.style.left        = `${pos.x}px`;
            el.style.top         = `${pos.y}px`;
            el.style.borderColor = borderColor;
            el.style.setProperty('--node-glow', `${rarityColor}70`);

            if (isActive) {
                el.style.boxShadow = `0 0 14px ${rarityColor}30, 0 4px 18px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)`;
            }

            el.innerHTML = `
                <div class="techtree-node-icon">${node.icon ?? '❓'}</div>
                <div class="techtree-node-lv">${curLv}/${node.maxLv}</div>
                <div class="techtree-node-name">${node.name}</div>
            `;

            el.addEventListener('click', () => {
                if (service.levelUp(id)) {
                    this.renderTree();
                    this.props.onLevelUp?.(id);
                }
            });
            el.addEventListener('mouseenter', (e: Event) => this.showTooltip(id, e as MouseEvent));
            el.addEventListener('mousemove',  (e: Event) => this.tooltip.move(e as MouseEvent));
            el.addEventListener('mouseleave', ()         => this.tooltip.hide());

            this.nodesLayer.appendChild(el);
            this.nodeElements.set(id, el);
        });
    }

    // ── Canvas 연결선 (방사형 Cubic Bezier + 화살표) ────────────────────────
    private drawLines() {
        const cvs = this.canvas.getContext('2d');
        if (!cvs) return;
        cvs.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawCircleGuides(cvs);

        const { service } = this.props;
        const half = NODE_W / 2;

        service.index.edges.forEach((children, parentId) => {
            const pp = this.nodePositions.get(parentId);
            if (!pp) return;
            const parentLv = service.levels[parentId] ?? 0;

            children.forEach(childId => {
                const cp = this.nodePositions.get(childId);
                if (!cp) return;
                const childLv = service.levels[childId] ?? 0;

                // 부모 → 자식 방향 단위벡터
                const dx = cp.x - pp.x, dy = cp.y - pp.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / dist, uy = dy / dist;

                // 연결점: 부모 테두리 → 자식 테두리
                const x1 = pp.x + ux * half;
                const y1 = pp.y + uy * half;
                const x2 = cp.x - ux * half;
                const y2 = cp.y - uy * half;

                // 베지어 핸들: 각 노드의 방사 방향(중심→노드) 벡터로 제어
                //   → 부모에서 "바깥 방향"으로 나와서 자식의 "안쪽 방향"으로 들어가는 곡선
                const cpLen = dist * 0.4;

                const pr = Math.hypot(pp.x - this.centerX, pp.y - this.centerY) || 1;
                const prx = (pp.x - this.centerX) / pr;
                const pry = (pp.y - this.centerY) / pr;

                const cr = Math.hypot(cp.x - this.centerX, cp.y - this.centerY) || 1;
                const crx = (cp.x - this.centerX) / cr;
                const cry = (cp.y - this.centerY) / cr;

                // 루트(중심)에서 나올 때는 자식 방향을 핸들로 사용
                const isRoot = pr < 1;
                const cp1x = isRoot ? x1 + ux * cpLen : x1 + prx * cpLen;
                const cp1y = isRoot ? y1 + uy * cpLen : y1 + pry * cpLen;
                const cp2x = x2 - crx * cpLen;
                const cp2y = y2 - cry * cpLen;

                // ── 색상 & 스타일 ──
                let color: string, lineW: number, dash: number[], glow: boolean;
                if (parentLv > 0 && childLv > 0) {
                    color = '#fab387'; lineW = 2.5; dash = [];     glow = true;
                } else if (parentLv > 0) {
                    color = '#89b4fa'; lineW = 1.8; dash = [7, 4]; glow = false;
                } else {
                    color = '#252535'; lineW = 1.2; dash = [];      glow = false;
                }

                // ── 글로우 레이어 ──
                if (glow) {
                    cvs.save();
                    cvs.beginPath();
                    cvs.moveTo(x1, y1);
                    cvs.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
                    cvs.strokeStyle = color;
                    cvs.lineWidth   = lineW + 5;
                    cvs.globalAlpha = 0.14;
                    cvs.setLineDash([]);
                    cvs.stroke();
                    cvs.restore();
                }

                // ── 메인 곡선 ──
                cvs.save();
                cvs.beginPath();
                cvs.moveTo(x1, y1);
                cvs.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
                cvs.strokeStyle = color;
                cvs.lineWidth   = lineW;
                cvs.globalAlpha = 1;
                cvs.setLineDash(dash);
                cvs.stroke();

                // ── 화살촉 ──
                if (parentLv > 0) {
                    const aLen = 7, aWid = 4;
                    // 곡선 끝 접선 = 마지막 제어점 → 끝점 방향
                    const ang = Math.atan2(y2 - cp2y, x2 - cp2x);
                    cvs.setLineDash([]);
                    cvs.fillStyle = color;
                    cvs.beginPath();
                    cvs.moveTo(x2, y2);
                    cvs.lineTo(
                        x2 - aLen * Math.cos(ang) + aWid * Math.sin(ang),
                        y2 - aLen * Math.sin(ang) - aWid * Math.cos(ang),
                    );
                    cvs.lineTo(
                        x2 - aLen * Math.cos(ang) - aWid * Math.sin(ang),
                        y2 - aLen * Math.sin(ang) + aWid * Math.cos(ang),
                    );
                    cvs.closePath();
                    cvs.fill();
                }
                cvs.restore();
            });
        });
    }

    /** 레벨별 동심원 가이드 (동적 반지름 기반) */
    private drawCircleGuides(cvs: CanvasRenderingContext2D) {
        for (let lv = 1; lv <= this.maxLevel; lv++) {
            const r = this.levelRadii.get(lv);
            if (!r) continue;
            cvs.save();
            cvs.beginPath();
            cvs.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);
            cvs.strokeStyle = 'rgba(60,60,110,0.20)';
            cvs.lineWidth   = 1;
            cvs.setLineDash([3, 7]);
            cvs.stroke();
            cvs.restore();
        }
    }

    // ── 툴팁 ───────────────────────────────────────────────────────────────
    private showTooltip(id: TechId, e: MouseEvent) {
        const { service } = this.props;
        const node  = service.index.byId.get(id)!;
        const curLv = service.levels[id] ?? 0;
        const res   = service.canLevelUp(id);

        let body = `
            <div style="font-size:13px;color:#bac2de;line-height:1.55;margin-bottom:10px;">${node.desc ?? ''}</div>
            <div style="height:1px;background:#252535;margin:10px 0;"></div>
        `;

        if (curLv < node.maxLv) {
            const nextLv  = curLv + 1;
            const cost    = service.costOf(id, nextLv);
            const costStr = Object.entries(cost).map(([k, v]) => `${k}: ${v}`).join(', ');

            if (curLv === 0 && !res.ok && res.reason.includes('requirement')) {
                // 잠김 상태 (첫 해금 전)
                body += `<div style="font-size:12px;margin-bottom:8px;color:#f38ba8;font-weight:bold;">🔒 잠김: 해금 조건</div>`;
                if (node.requires && node.requires.length > 0) {
                    node.requires.forEach(req => {
                        const reqText = this.formatRequirement(req);
                        const isMet   = service.checkRequirement(req);
                        body += `<div style="font-size:11px;margin-bottom:4px;color:${isMet ? '#a6e3a1' : '#9399b2'};display:flex;align-items:center;gap:5px;">
                            <span>${isMet ? '✅' : '❌'}</span>
                            <span>${reqText}</span>
                        </div>`;
                    });
                } else {
                    body += `<div style="font-size:11px;color:#f38ba8;">${res.reason}</div>`;
                }
            } else {
                // 활성화됨 또는 강화 가능
                body += `
                    <div style="font-size:12px;margin-bottom:5px;color:#9399b2;">단계: <span style="color:#cdd6f4;">${curLv} → ${nextLv}</span></div>
                    <div style="font-size:12px;margin-bottom:10px;color:#9399b2;">비용: <span style="color:#fab387;font-weight:bold;">${costStr || '무료'}</span></div>
                `;
                body += res.ok
                    ? `<div style="font-size:11px;color:#a6e3a1;font-weight:bold;text-align:center;border:1px solid #a6e3a1;padding:4px;border-radius:4px;">강화 가능 (클릭)</div>`
                    : `<div style="font-size:11px;color:#f38ba8;background:rgba(243,139,168,0.08);padding:8px;border-radius:4px;border:1px solid rgba(243,139,168,0.2);">⚠️ ${res.reason}</div>`;
            }
        } else {
            body += `<div style="font-size:11px;color:#fab387;font-weight:bold;text-align:center;background:rgba(250,179,135,0.08);padding:6px;border-radius:4px;">★ 최대 단계</div>`;
        }

        this.tooltip.show({ title: node.name, icon: node.icon, body });
        this.tooltip.move(e);
    }

    private formatRequirement(req: any): string {
        switch (req.type) {
            case 'has': {
                const target = this.props.service.index.byId.get(req.id);
                const name   = target?.name ?? req.id;
                return req.minLv && req.minLv > 1 
                    ? `[${name}] ${req.minLv}단계 이상`
                    : `[${name}] 보유`;
            }
            case 'playerLv': return `플레이어 레벨 ${req.atLeast} 이상`;
            case 'stat':     return `${req.key} 스탯 ${req.atLeast} 이상`;
            case 'quest':    return `퀘스트 [${req.id}] 완료`;
            case 'all':      return '모든 조건 충족';
            case 'any':      return '다음 중 하나 충족';
            default:         return '선행 조건 필요';
        }
    }

    unmount(): void {
        // body 스타일 복원
        const body = this.ctx.shell.body;
        body.style.padding       = '';
        body.style.display       = '';
        body.style.flexDirection = '';
        body.style.overflow      = '';

        this.container.remove();
        this.tooltip.destroy();
    }
}
