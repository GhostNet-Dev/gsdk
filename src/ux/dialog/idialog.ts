
export default interface IDialog {
    GetContentElement(): HTMLElement
    RenderHtml(title: string, content: string | HTMLElement, options?: {
        btnText?: string, close?: ()=> void
    }): void
    Show(): void
}

export interface IUiItem {
    dom: HTMLElement
    render(width: number): void
}