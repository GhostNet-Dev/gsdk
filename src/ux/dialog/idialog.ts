
export default interface IDialog {
    GetContentElement(): HTMLElement
    RenderHtml(title: string, content: string | HTMLElement, options?: {
        btnText: string, event: ()=> void
    }): void
    show(): void
}