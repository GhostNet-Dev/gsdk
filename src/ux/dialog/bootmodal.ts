import * as bootstrap from 'bootstrap'
import IDialog from './idialog'

export default class BootModal implements IDialog {
    modal: bootstrap.Modal

    constructor() {
        const dom = document.createElement("div")
        dom.innerHTML = html
        document.body.appendChild(dom)
        const backdrop = document.getElementById("staticBackdrop") as HTMLDivElement
        this.modal = new bootstrap.Modal(backdrop)
    }
    GetContentElement() {
        const bodyDom = document.getElementById("modalBody") as HTMLDivElement
        return bodyDom
    }
    RenderHtml(title: string, content: string | HTMLElement,
        {
            btnText = "Confirm",
            event = () => { }
        } = {}
    ) {
        const titleDom = document.getElementById("staticBackdropLabel")
        if (titleDom) titleDom.innerText = title
        const bodyDom = document.getElementById("modalBody") as HTMLDivElement
        if (typeof content == "string")
            bodyDom.innerHTML = content
        else
            bodyDom.appendChild(content)

        const btn = document.getElementById("confirmBtn")
        if(btn) {
            btn.innerText = btnText
            btn.onclick = () => {
                event()
                this.modal.hide()
            }
        }
    }
    show() {
        this.modal.show()
    }
}

const html = `
<!-- Modal -->
<div class="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="staticBackdropLabel">Modal title</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" id="modalBody">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" id="confirmBtn">Understood</button>
      </div>
    </div>
  </div>
</div>
`
