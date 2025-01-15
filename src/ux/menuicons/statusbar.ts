import { Icons } from "./icontypes"
import { GetIconColorDb, GetIconDb } from "./preicons"

export default class StatusBar {
    dom = document.createElement("div")
    icons = GetIconDb()
    colors = GetIconColorDb()

    constructor({ text = "", min = 0, max = 100, value = 100, bgOpacity = "0.5",
        icon = Icons.Save, plusIcon = false, click = () => { }
    } = {}) {
    }
}