import { Icons, IconsColor } from "./icontypes"

const rootPath = 'https://hons.ghostwebservice.com/assets/'
const uiPath = 'ui/Icons/'
const pack2Path = 'ui/pack2/'

const icons = new Map<Icons, string>()

icons.set(Icons.Diamond, rootPath + uiPath + 'Icon_Small_Diamond.png')
icons.set(Icons.Load, rootPath + pack2Path + 'openfolder.svg')
icons.set(Icons.Save, rootPath + pack2Path + 'floppy-disk.png')
icons.set(Icons.Download, rootPath + pack2Path + 'download2.png')

const GetIconDb = () => { return icons }

const iconColor = new Map<IconsColor, string[]>()

iconColor.set(IconsColor.Blue, ["#0D47A1", "#2196F3"])
iconColor.set(IconsColor.Yellow, ["#FFC107", "#FFF176"])
iconColor.set(IconsColor.Red, ["", ""])
iconColor.set(IconsColor.Transperant, ["", ""])

const GetIconColorDb = () => { return iconColor }

export { GetIconDb, GetIconColorDb }