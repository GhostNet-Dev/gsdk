// ============================================================================
// core/style.ts
// ============================================================================
export type StyleHost = Document | ShadowRoot;

function hash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); }
  return (h >>> 0).toString(36);
}

export class StyleRegistry {
  private mounted = new Map<StyleHost, Map<string, { el: HTMLStyleElement; ref: number }>>();

  ensureGlobal(host: StyleHost, css: string, key?: string) {
    return this.ensure(host, css, key ?? 'global:' + hash(css));
  }

  ensureScoped(host: StyleHost, css: string, keyPrefix = 'view') {
    return this.ensure(host, css, `${keyPrefix}:${hash(css)}`);
  }

  ensureLink(host: StyleHost, href: string, rel = 'stylesheet') {
    const root = host instanceof Document ? host.head : (host as ShadowRoot).host.ownerDocument!.head;
    const key = `link:${rel}:${href}`;
    (root as any)._gnxLinks ??= new Set<string>();
    if ((root as any)._gnxLinks.has(key)) return;
    const link = root.ownerDocument.createElement('link');
    link.rel = rel; link.href = href;
    root.appendChild(link);
    (root as any)._gnxLinks.add(key);
  }

  release(host: StyleHost, key: string) {
    const map = this.mounted.get(host); if (!map) return;
    const rec = map.get(key); if (!rec) return;
    rec.ref -= 1;
    if (rec.ref <= 0) { rec.el.remove(); map.delete(key); }
  }

  private ensure(host: StyleHost, css: string, key: string) {
    let map = this.mounted.get(host);
    if (!map) { map = new Map(); this.mounted.set(host, map); }
    const found = map.get(key);
    if (found) { found.ref += 1; return key; }
    const el = (host instanceof Document ? host : host as ShadowRoot).ownerDocument?.createElement('style') ?? document.createElement('style');
    el.setAttribute('data-gnx-style', key);
    el.textContent = css;
    if (host instanceof Document) host.head.appendChild(el);
    else host.appendChild(el);
    map.set(key, { el, ref: 1 });
    return key;
  }
}

export function css(strings: TemplateStringsArray, ...vals: any[]) {
  const s = strings.reduce((acc, cur, i) => acc + cur + (vals[i] ?? ''), '');
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s{2,}/g, ' ').trim();
}

// core/dom.ts
export function docOf(host: Document | ShadowRoot): Document {
  return host instanceof ShadowRoot ? host.ownerDocument! : host;
}

export function createEl<T extends keyof HTMLElementTagNameMap>(
  host: Document | ShadowRoot,
  tag: T
): HTMLElementTagNameMap[T] {
  return docOf(host).createElement(tag);
}

// [추가] 아이콘이 URL 형태인지 텍스트인지 판단하여 HTML 문자열 반환
export function renderIcon(icon: string | undefined | null) {
  if (!icon) return '';
  // http로 시작하거나, /, ./, ../ 로 시작하는 경우 이미지로 간주
  const isUrl = /^(https?:\/\/|\/|\.\.?\/|data:image)/i.test(icon);

  if (isUrl) {
    return `<img src="${icon}" class="gnx-img-icon" alt="icon" draggable="false" />`;
  }
  return icon;
}

// dlgstyle.ts에 추가

export const STAT_LABELS: Record<string, string> = {
  attack: '공격력', defense: '방어력', hp: '생명력', mp: '마나',
  speed: '이동 속도', criticalRate: '치명타 확률', criticalDamage: '치명타 피해', weight: '무게'
};

export function getRarityClass(rarity?: string) {
  const r = rarity?.toLowerCase();
  if (r === 'epic') return 'gnx-rar-epic';
  if (r === 'rare') return 'gnx-rar-rare';
  return 'gnx-rar-common';
}

/** 아이템 스탯 섹션 HTML 생성 공통화 */
export function renderStatsHtml(item: any): string {
  const stats = item.Stats;
  const enchantments = item.Enchantments;
  if (!stats && !enchantments) return '';

  let html = '<div class="tt-stats">';
  const addRows = (data: any, isEnchant: boolean) => {
      if (!data) return;
      for (const [key, val] of Object.entries(data)) {
          if (typeof val !== 'number' || val === 0) continue;
          const label = STAT_LABELS[key] || key;
          const valStr = val > 0 ? `+${val}` : `${val}`;
          html += `<div class="tt-stat-row ${isEnchant ? 'enchant' : ''}"><span>${label}</span><span>${valStr}</span></div>`;
      }
  };

  addRows(stats, false);
  addRows(enchantments, true);
  return html + '</div>';
}