export type BattleResultType = "win" | "loss"

export class BattleResult {
  private overlay: HTMLDivElement | null = null

  constructor(
    private readonly onConfirm: (result: BattleResultType) => void
  ) {}

  show(result: BattleResultType) {
    if (this.overlay) return

    const isWin = result === "win"
    this.overlay = document.createElement("div")
    this.overlay.id = "battle-result-overlay"
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(6px);
      font-family: sans-serif;
    `

    const container = document.createElement("div")
    container.style.cssText = `
      background: #0f172a;
      padding: 48px 80px;
      border-radius: 16px;
      border: 2px solid ${isWin ? "#22c55e" : "#ef4444"};
      text-align: center;
      box-shadow: 0 0 60px rgba(0,0,0,0.6);
      transform: scale(0.9);
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    `

    const title = document.createElement("h1")
    title.innerText = isWin ? "VICTORY" : "DEFEAT"
    title.style.cssText = `
      margin: 0 0 32px;
      font-size: 64px;
      font-weight: 900;
      color: ${isWin ? "#22c55e" : "#ef4444"};
      text-transform: uppercase;
      letter-spacing: 8px;
      text-shadow: 0 0 20px ${isWin ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"};
    `

    const button = document.createElement("button")
    button.innerText = "CONFIRM"
    button.style.cssText = `
      padding: 16px 48px;
      font-size: 20px;
      font-weight: 800;
      background: ${isWin ? "#22c55e" : "#ef4444"};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      letter-spacing: 2px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    button.onmouseover = () => {
      button.style.opacity = "0.9"
      button.style.transform = "translateY(-2px)"
      button.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)"
    }
    button.onmouseout = () => {
      button.style.opacity = "1"
      button.style.transform = "translateY(0)"
      button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)"
    }
    button.onclick = () => {
      this.hide()
      this.onConfirm(result)
    }

    container.appendChild(title)
    container.appendChild(button)
    this.overlay.appendChild(container)
    document.body.appendChild(this.overlay)

    // Animation trigger
    requestAnimationFrame(() => {
      container.style.transform = "scale(1)"
      container.style.opacity = "1"
    })
  }

  hide() {
    if (!this.overlay) return
    document.body.removeChild(this.overlay)
    this.overlay = null
  }

  dispose() {
    this.hide()
  }
}
