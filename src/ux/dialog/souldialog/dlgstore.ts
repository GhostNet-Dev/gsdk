// ============================================================================
// core/store.ts — 최소 상태: 퀘스트 추적, 인벤토리, 캐릭터
// ============================================================================
export type Quest = {
  id: string; title: string; desc: string; region: string;
  status: 'active'|'completed';
  done: number; total: number;
};

export type Item = {
  icon: string; name: string; cat: '무기'|'방어구'|'소모'|'키'|'기타'|string;
  qty: number; wt: number; desc: string; rarity: 'Common'|'Rare'|'Epic'; set?: string;
};

export type EquipSlots = {
  head?: Item|null; chest?: Item|null; hands?: Item|null; legs?: Item|null;
  weapon?: Item|null; offhand?: Item|null; ring1?: Item|null; ring2?: Item|null; amulet?: Item|null;
};

type Subscriber = () => void;

export class DialogStore {
  quests: Quest[] = [];
  trackedQuestId: string | null = null;

  slots = 30;
  bag: (Item|null)[] = Array.from({length:30},()=>null);
  selectedIndex = 0;

  equip: EquipSlots = {};

  baseStats = { STR:14, DEX:12, INT:9, FAI:8, VIT:15 };
  resistBase = { fire:10, elec:8, ice:12 };

  private subs: Subscriber[] = [];

  subscribe(fn: Subscriber) { this.subs.push(fn); return () => this.unsubscribe(fn); }
  unsubscribe(fn: Subscriber) { this.subs = this.subs.filter(s=>s!==fn); }
  private emit() { this.subs.forEach(fn=>fn()); }

  setQuests(q: Quest[]) { this.quests = q; this.emit(); }
  setTracked(id: string|null) { this.trackedQuestId = id; this.emit(); }

  setBag(items: (Item|null)[]) { this.bag = items.slice(0, this.slots); this.emit(); }
  setSelected(i: number) { this.selectedIndex = i; this.emit(); }

  moveItem(from: number, to: number) {
    const b = this.bag.slice();
    const t = b[from]; b[from] = b[to]; b[to] = t;
    this.bag = b; this.selectedIndex = to; this.emit();
  }

  splitStack(idx: number, n: number) {
    const it = this.bag[idx]; if (!it || it.qty<=1 || n<=0 || n>=it.qty) return;
    const empty = this.bag.findIndex(x=>!x); if (empty<0) return;
    const b = this.bag.slice();
    b[idx] = { ...it, qty: it.qty - n };
    b[empty] = { ...it, qty: n };
    this.bag = b; this.selectedIndex = empty; this.emit();
  }

  equipMini(slot: keyof EquipSlots, idxFromBag: number) {
    const it = this.bag[idxFromBag]; if (!it) return;
    const b = this.bag.slice();
    b[idxFromBag] = null;
    this.equip[slot] = it;
    this.bag = b; this.emit();
  }
}
