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
    GetElement() {
        return this.dom
    }
    addOption(title: string, value: boolean | number, getValue: Function,
        { type = OptType.Switches, info = "", onchange = (opt: Options) => { }
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
                formInput.checked = value as boolean
                formDiv.appendChild(formInput)
                formDiv.insertAdjacentHTML("afterbegin", `<label class="form-check-label" for="${uniqId}">${title}</label>`)
                break
            case OptType.Checks:
                formDiv.classList.add("form-check", "mb-3")
                formInput.classList.add("form-check-input")
                formInput.type = "checkbox"
                formInput.checked = value as boolean
                formDiv.appendChild(formInput)
                formDiv.insertAdjacentHTML("afterbegin", `<label class="form-check-label" for="${uniqId}">${title}</label>`)
                break
            case OptType.Radios:
                formDiv.classList.add("form-check", "mb-3")
                formInput.classList.add("form-check-input")
                formInput.type = "radio"
                formInput.checked = value as boolean
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
                formDiv.insertAdjacentHTML("beforeend", `<button class="btn btn-outline-secondary" type="button" id="${uniqId}">${title}</button>`)
                break
        }
        this.dom.appendChild(formDiv)
    }
}
