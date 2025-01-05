import * as bootstrap from 'bootstrap'
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from '@Glibs/types/globaltypes';

export default class Toast {
  toastBootstrap: bootstrap.Toast

  constructor(eventCtrl: IEventController) {
    document.body.insertAdjacentHTML("afterbegin", html)
    const toast = document.getElementById("liveToast") as HTMLDivElement
    this.toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast)
    const headDom = document.getElementById("toastHead")
    const bodyDom = document.getElementById("toastBody")
    eventCtrl.RegisterEventListener(EventTypes.Toast, (title: string, body: string) => {
      if (headDom) headDom.innerText = title
      if (bodyDom) bodyDom.innerText = body
      this.toastBootstrap.show()
    })
  }
}

const html = `
<div class="toast-container position-fixed bottom-0 end-0 p-3">
  <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header">
      <!--<img src="..." class="rounded me-2" alt="...">-->
      <strong class="me-auto" id="toastHead">Bootstrap</strong>
      <small id="toastTime">1 mins ago</small>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body" id="toastBody">
      Hello, world! This is a toast message.
    </div>
  </div>
</div>
`
