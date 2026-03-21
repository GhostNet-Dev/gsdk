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

const NODE_W   = 58;   // 노드 크기 (px)
const NODE_H   = 58;
const R_GAP    = 170;  // 레벨당 반지름 증가량 (px)
const PAD      = 90;   // 캔버스 여백

export class TechTreeView implements IDialogView<TechTreeProps> {
    private ctx!: ViewContext;
    private props!: TechTreeProps;
    private container!: HTMLElement;
    private canvas!: HTMLCanvasElement;
    private nodesLayer!: HTMLElement;
    private tooltip!: TooltipComponent;

    private nodeElements  = new Map<TechId, HTMLElement>();
    private nodePositions = new Map<TechId, { x: number; y: number }>();
    // 역방향 간선: childId → Set<parentId>
    private reverseEdges  = new Map<TechId, Set<TechId>>();
    // 방사형 레이아웃 중심 좌표 및 최대 레벨
    private centerX  = 0;
    private centerY  = 0;
    private maxLevel = 0;

    mount(ctx: ViewContext, props: TechTreeProps): void {
        this.ctx   = ctx;
        this.props = props;

        this.container = createEl(ctx.shell.sr, 'div');
        this.container.className = 'techtree-view';
        ctx.shell.body.appendChild(this.container);

        this.tooltip = new TooltipComponent(ctx.shell.sr);
        this.setupStyles();
        this.render();
    }

    private setupStyles() {
        const style = css`
            .techtree-view {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 600px;
                background: radial-gradient(ellipse at 25% 40%, #16213e 0%, #0f0f1a 60%, #0a0a12 100%);
                overflow: auto;
                user-select: none;
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
                pointer-events: none;
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

    private render() {
        this.container.innerHTML = '';
        this.nodeElements.clear();
        this.nodePositions.clear();
        this.reverseEdges.clear();

        this.buildReverseEdges();

        this.canvas = createEl(this.ctx.shell.sr, 'canvas');
        this.canvas.className = 'techtree-canvas';
        this.container.appendChild(this.canvas);

        this.nodesLayer = createEl(this.ctx.shell.sr, 'div');
        this.nodesLayer.className = 'techtree-nodes';
        this.container.appendChild(this.nodesLayer);

        this.calculateLayout();
        this.drawNodes();
        requestAnimationFrame(() => this.drawLines());
    }

    // ── 역방향 간선 구축 (child → parents) ─────────────────────────────────
    private buildReverseEdges() {
        const { index } = this.props.service;
        index.order.forEach(id => this.reverseEdges.set(id, new Set()));
        index.edges.forEach((children, parentId) => {
            children.forEach(childId => this.reverseEdges.get(childId)?.add(parentId));
        });
    }

    // ── 레이아웃 계산 (방사형 + Barycenter 휴리스틱) ──────────────────────
    private calculateLayout() {
        const { index } = this.props.service;
        const levels = new Map<TechId, number>();

        // 1. BFS로 깊이(레벨) 결정
        const roots = index.order.filter(id => (index.indeg.get(id) ?? 0) === 0);
        const queue: { id: TechId; level: number }[] = roots.map(id => ({ id, level: 0 }));
        while (queue.length) {
            const { id, level } = queue.shift()!;
            levels.set(id, Math.max(levels.get(id) ?? 0, level));
            index.edges.get(id)?.forEach(child => queue.push({ id: child, level: level + 1 }));
        }

        // 2. 레벨별 배열 구성
        this.maxLevel = Math.max(...Array.from(levels.values()), 0);
        const cols: TechId[][] = Array.from({ length: this.maxLevel + 1 }, () => []);
        levels.forEach((lv, id) => cols[lv].push(id));

        // 3. Barycenter 휴리스틱: 각 링에서 노드를 부모의 평균 각도 순으로 정렬
        //    → 의존 관계가 있는 노드끼리 각도상 인접 → 선 교차 최소화
        const score = new Map<TechId, number>();
        cols[0].forEach((id, i) => score.set(id, i));

        for (let lv = 1; lv <= this.maxLevel; lv++) {
            const sorted = cols[lv].map(id => {
                const parents = this.reverseEdges.get(id)!;
                if (!parents.size) return { id, s: score.get(id) ?? 0 };
                let sum = 0;
                parents.forEach(pid => (sum += score.get(pid) ?? 0));
                return { id, s: sum / parents.size };
            }).sort((a, b) => a.s - b.s);
            sorted.forEach(({ id }, i) => { score.set(id, i); cols[lv][i] = id; });
        }

        // 4. 방사형 좌표 할당
        //    - 레벨 0 단일 루트  → 정중앙
        //    - 레벨 0 다중 루트  → 반지름 R_GAP*0.35 의 원 위에 균등 배치
        //    - 레벨 L (L≥1)      → 반지름 L * R_GAP 의 원 위에 균등 배치
        const maxR    = this.maxLevel * R_GAP + PAD + NODE_W;
        const canvasW = maxR * 2;
        const canvasH = maxR * 2;
        this.centerX = maxR;
        this.centerY = maxR;

        cols.forEach((ids, lv) => {
            const count = ids.length;
            if (lv === 0 && count === 1) {
                this.nodePositions.set(ids[0], { x: this.centerX, y: this.centerY });
                return;
            }
            const radius = lv === 0 ? R_GAP * 0.35 : lv * R_GAP;
            ids.forEach((id, i) => {
                // 위쪽(-π/2)에서 시작해 시계방향으로 균등 분배
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                this.nodePositions.set(id, {
                    x: this.centerX + radius * Math.cos(angle),
                    y: this.centerY + radius * Math.sin(angle),
                });
            });
        });

        this.canvas.width  = canvasW;
        this.canvas.height = canvasH;
        this.nodesLayer.style.width  = `${canvasW}px`;
        this.nodesLayer.style.height = `${canvasH}px`;
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
                    this.render();
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

    /** 레벨별 동심원 가이드 */
    private drawCircleGuides(cvs: CanvasRenderingContext2D) {
        for (let lv = 1; lv <= this.maxLevel; lv++) {
            const r = lv * R_GAP;
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
            body += `
                <div style="font-size:12px;margin-bottom:5px;color:#9399b2;">단계: <span style="color:#cdd6f4;">${curLv} → ${nextLv}</span></div>
                <div style="font-size:12px;margin-bottom:10px;color:#9399b2;">비용: <span style="color:#fab387;font-weight:bold;">${costStr || '무료'}</span></div>
            `;
            body += res.ok
                ? `<div style="font-size:11px;color:#a6e3a1;font-weight:bold;text-align:center;border:1px solid #a6e3a1;padding:4px;border-radius:4px;">강화 가능 (클릭)</div>`
                : `<div style="font-size:11px;color:#f38ba8;background:rgba(243,139,168,0.08);padding:8px;border-radius:4px;border:1px solid rgba(243,139,168,0.2);">⚠️ ${res.reason}</div>`;
        } else {
            body += `<div style="font-size:11px;color:#fab387;font-weight:bold;text-align:center;background:rgba(250,179,135,0.08);padding:6px;border-radius:4px;">★ 최대 단계</div>`;
        }

        this.tooltip.show({ title: node.name, icon: node.icon, body });
        this.tooltip.move(e);
    }

    unmount(): void {
        this.container.remove();
        this.tooltip.destroy();
    }
}
