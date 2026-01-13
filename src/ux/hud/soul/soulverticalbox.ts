import { GUX, IGUX } from "../../gux";

export class SoulVerticalBox extends GUX implements IGUX {
  get Dom() { return this.root; }
  private root: HTMLDivElement;

  constructor(items: IGUX[] = [], gap: number = 4) {
    super();
    this.root = document.createElement('div');
    this.root.style.display = 'flex';
    this.root.style.flexDirection = 'column'; // 세로 정렬
    this.root.style.gap = `${gap}px`; // 아이템 간격
    this.root.style.width = '100%';

    items.forEach(item => this.root.appendChild(item.Dom));
  }
  
  // IGUX 인터페이스 구현
  getEl() { return this.root; }
  isVisible() { return this.root.style.display !== 'none'; }
  Show() { this.root.style.display = 'flex'; }
  Hide() { this.root.style.display = 'none'; }
  setVisible(v: boolean) { v ? this.Show() : this.Hide(); }
  AddChild(dom: IGUX): void { this.root.appendChild(dom.Dom); }
  RenderHTML(): void {}
}