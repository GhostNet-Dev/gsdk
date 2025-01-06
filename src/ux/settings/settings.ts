export enum OptType {
    Switches,
    Checks,
    Radios,
    Inputs,
    Buttons,
}
export type Options = {
    uniqId: string
    type: OptType
    title: string
    info: string
    value: boolean | number
    getValue: Function
}

export default class Setting {
    uniqId = 0
    opts: Options[] = []
    dom = document.createElement('div')

    updateOptions() {
        this.opts.forEach((opt) => {
            const v = opt.getValue()
            const dom = document.getElementById(opt.uniqId) as HTMLInputElement
            if (typeof v == "boolean") {
                dom.checked = v
            } else {
                dom.value = v
            }
        })
    }
    GetElements() {
        return this.dom
    }
    GetOptionValue(uniqId: string) {
        const opt = this.opts.find((e) => e.uniqId == uniqId)
        if (!opt) return

        const dom = document.getElementById(uniqId) as HTMLInputElement
        switch(opt.type) {
            case OptType.Switches:
            case OptType.Checks:
            case OptType.Radios:
                return dom.checked
            default:
                return dom.value
        }
    }
    addLine() {
        const lineDom = document.createElement("hr");
        lineDom.classList.add("border", "border-primary", "border-1", "opacity-50")
        this.dom.appendChild(lineDom)
    }
    addOption(title: string,
        { type = OptType.Switches, info = "", name = "", checked = false, value = 1,
            onchange = (opt: Options) => { }, onclick = (opt: Options) => { },
            getValue = (): boolean | number => { return false }
        } = {}) {
        const uniqId = "options_" + (this.uniqId++).toString()

        const opt: Options = { uniqId, type, title, info, value, getValue }
        this.opts.push(opt)

        const formDiv = document.createElement("div")
        const formInput = document.createElement("input")
        formInput.onchange = () => { onchange(opt) }
        formInput.id = uniqId
        switch (type) {
            case OptType.Switches:
                formDiv.classList.add("form-check", "form-switch", "mb-3")
                formInput.classList.add("form-check-input")
                formInput.type = "checkbox"
                formInput.checked = checked
                formInput.value = value.toString()
                formDiv.appendChild(formInput)
                formDiv.insertAdjacentHTML("afterbegin", `<label class="form-check-label" for="${uniqId}">${title}</label>`)
                break
            case OptType.Checks:
                formDiv.classList.add("form-check", "mb-3")
                formInput.classList.add("form-check-input")
                formInput.type = "checkbox"
                formInput.checked = checked
                formInput.value = value.toString()
                formDiv.appendChild(formInput)
                formDiv.insertAdjacentHTML("afterbegin", `<label class="form-check-label" for="${uniqId}">${title}</label>`)
                break
            case OptType.Radios:
                formDiv.classList.add("form-check", "mb-3")
                formInput.classList.add("form-check-input")
                formInput.type = "radio"
                formInput.checked = checked
                formInput.value = value.toString()
                if (name.length > 0) formInput.name = name
                formDiv.appendChild(formInput)
                formDiv.insertAdjacentHTML("afterbegin", `<label class="form-check-label" for="${uniqId}">${title}</label>`)
                break
            case OptType.Inputs:
                formDiv.classList.add("input-group", "mb-3")
                formInput.classList.add("form-control")
                formInput.setAttribute("aria-describedby", uniqId)
                formInput.value = value.toString()
                formInput.type = "text"
                formDiv.appendChild(formInput)
                formDiv.insertAdjacentHTML("beforeend", `<span class="input-group-text">${title}</span>`)
                break
            case OptType.Buttons:
                formDiv.classList.add("input-group", "mb-3")
                formInput.classList.add("form-control")
                formInput.placeholder = "model's name"
                formInput.setAttribute("aria-describedby", uniqId)
                formDiv.appendChild(formInput)
                const btn = document.createElement("button")
                btn.classList.add("btn", "btn-outline-secondary")
                btn.innerText = title
                btn.onclick = () => { onclick(opt) }
                formDiv.appendChild(btn)
                break
        }
        this.dom.appendChild(formDiv)
        return uniqId
    }
}
