// ============================================================================
// views/CharacterView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';

const CSS_CHAR = css`
  /* 쉘 타이틀과 동일한 전경색 강제 적용 */
  :host { color: var(--gnx-ui-fg); }

  .gnx-char{display:grid;grid-template-columns:260px 1fr;gap:16px; color:inherit;}
  @media (max-width:900px){.gnx-char{grid-template-columns:1fr}}

  .gnx-char-portrait{
    height:260px;border-radius:14px;
    background:linear-gradient(135deg,#2b2b36,#15151b);
    display:grid;place-items:center;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
    color:inherit; /* 텍스트/이모지도 동일 색 */
  }

  .gnx-stats{display:grid;gap:8px; color:inherit;}
  .gnx-stat{
    display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;
    border:1px solid rgba(255,255,255,.10);
    border-radius:10px;padding:8px 10px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    color:inherit; /* 라벨/값 모두 쉘 타이틀 색 */
  }

  .gnx-bar{height:6px;border-radius:6px;position:relative;overflow:hidden;background:rgba(255,255,255,.12);}
  .gnx-bar>i{position:absolute;left:0;top:0;bottom:0;background:color-mix(in oklab,var(--gnx-ui-accent) 60%,transparent)}

  .gnx-equip{display:grid;grid-template-columns:repeat(5,1fr);gap:10px; color:inherit;}
  @media (max-width:700px){.gnx-equip{grid-template-columns:repeat(3,1fr)}}
  .gnx-eslot{
    height:70px;border:1px solid rgba(255,255,255,.14);border-radius:10px;
    display:grid;place-items:center;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    color:inherit;
  }
`;


type Props = {
  base: { STR:number; DEX:number; INT:number; FAI:number; VIT:number };
  resistBase: { fire:number; elec:number; ice:number };
  equip: { [k:string]: { icon?:string; atk?:number; def?:number; wt?:number; set?:string }|null|undefined };
};

export class CharacterView implements IDialogView<Props> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: Props;

  mount(ctx: ViewContext, props: Props) {
    this.ctx = ctx; this.props = props;
    this.shell = ctx.shell
    ctx.render.setTitle(this.shell, '캐릭터');
    ctx.render.setWide(this.shell, true)
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_CHAR, 'view:char');
    this.render();
    this.ctx.render.setActions(this.shell, [{ id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }]);
  }
  update(next: Props) { this.props = next; this.render(); }
  unmount() { if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key); }

  private render() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';

    const wrap = createEl(doc, 'div'); wrap.className='gnx-char';

    const left = createEl(doc, 'div');
    const port = createEl(doc, 'div'); port.className='gnx-char-portrait'; port.textContent='🧍';
    left.appendChild(port);

    const stats1 = createEl(doc, 'div'); stats1.className='gnx-stats'; stats1.style.marginTop='12px';
    stats1.appendChild(this.stat('힘 STR',  this.props.base.STR, 30));
    stats1.appendChild(this.stat('민 DEX',  this.props.base.DEX, 30));
    stats1.appendChild(this.stat('지 INT',  this.props.base.INT, 30));
    stats1.appendChild(this.stat('신 FAI',  this.props.base.FAI, 30));
    stats1.appendChild(this.stat('체 VIT',  this.props.base.VIT, 30));
    left.appendChild(stats1);

    const res = createEl(doc, 'div'); res.className='gnx-stats'; res.style.marginTop='12px';
    res.appendChild(this.stat('🔥 화염 저항', this.props.resistBase.fire, 1));
    res.appendChild(this.stat('⚡ 번개 저항', this.props.resistBase.elec, 1));
    res.appendChild(this.stat('❄️ 빙결 저항', this.props.resistBase.ice, 1));
    left.appendChild(res);

    const right = createEl(doc, 'div');
    const stats2 = createEl(doc, 'div'); stats2.className='gnx-stats'; stats2.style.marginBottom='12px';
    const ATK = Math.round((this.props.equip?.weapon?.atk||0) + this.props.base.STR*1.2 + this.props.base.DEX*0.5);
    const DEF = Math.round(10 + this.props.base.VIT*0.8 + (this.props.equip?.head?.def||0)+(this.props.equip?.chest?.def||0)+(this.props.equip?.hands?.def||0)+(this.props.equip?.legs?.def||0)+(this.props.equip?.offhand?.def||0));
    const STA = 50 + this.props.base.VIT*2;
    const WT  = ['head','chest','hands','legs','weapon','offhand','ring1','ring2','amulet'].reduce((s,k)=> s+(this.props.equip?.[k]?.wt||0), 0);
    stats2.appendChild(this.stat('공격력', ATK, 100/3));
    stats2.appendChild(this.stat('방어도', DEF, 100/3));
    stats2.appendChild(this.stat('스태미너', STA, 100/1.5));
    stats2.appendChild(this.stat('장비 중량', Math.min(100, WT*12), 1, true, WT.toFixed(1)));
    right.appendChild(stats2);

    const equip = createEl(doc, 'div'); equip.className='gnx-equip';
    ['head','chest','hands','legs','weapon','offhand','ring1','ring2','amulet'].forEach(slot=>{
      const d = createEl(doc, 'div'); d.className='gnx-eslot'; d.setAttribute('data-type', slot);
      d.textContent = this.props.equip?.[slot]?.icon ?? '';
      equip.appendChild(d);
    });
    right.appendChild(equip);

    wrap.appendChild(left); wrap.appendChild(right);
    this.shell.body.appendChild(wrap);
  }

  private stat(label: string, val: number, scale: number, clamp=false, suffix?: string) {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const row = createEl(doc, 'div'); row.className='gnx-stat';
    const bar = createEl(doc, 'div'); bar.className='gnx-bar';
    const i = createEl(doc, 'i'); const w = clamp ? Math.min(100,val*scale) : (val/scale);
    (i as any).style.width = (typeof w==='number'? w : parseFloat(String(w))) + '%';
    bar.appendChild(i);
    const left = createEl(doc, 'div'); left.textContent=label;
    const right = createEl(doc, 'div'); right.textContent = suffix ?? String(val);
    row.appendChild(left); row.appendChild(bar); row.appendChild(right);
    return row;
  }
}
