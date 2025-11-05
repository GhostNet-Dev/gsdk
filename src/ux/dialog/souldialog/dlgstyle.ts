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
