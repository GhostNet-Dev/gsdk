import { Icons, IconsColor } from "./icontypes"

const rootPath = 'https://hons.ghostwebservice.com/assets/'
const uiPath = 'ui/Icons/'
const uiPath2 = 'ui/Icons/SVG/'
const uiButton = 'ui/ButtonsText/'
const pack1Path = 'ui/pack1/'
const pack2Path = 'ui/pack2/'

const icons = new Map<Icons, string>()

icons.set(Icons.Diamond, rootPath + uiPath + 'Icon_Small_Diamond.png')
icons.set(Icons.Load, rootPath + pack2Path + 'openfolder.svg')
icons.set(Icons.Save, rootPath + pack2Path + 'floppy-disk.png')
icons.set(Icons.Download, rootPath + pack2Path + 'download2.png')
icons.set(Icons.Coin, rootPath + uiPath + 'Icon_Small_CoinDollar.png')
icons.set(Icons.Star, rootPath + uiPath + 'Icon_Small_Star.png')
icons.set(Icons.Heart, rootPath + uiPath + 'Icon_Small_HeartFull.png')
icons.set(Icons.Audio, rootPath + uiPath + 'Icon_Small_Blank_Audio.png')
icons.set(Icons.Menu, rootPath + uiPath + 'Icon_Small_Blank_Menu.png')
icons.set(Icons.MenuBtn, rootPath + uiButton + 'PremadeButtons_Menu.png')
icons.set(Icons.Lock, rootPath + uiPath + 'Icon_Small_Lock.png')
icons.set(Icons.Key, rootPath + uiPath + 'Icon_Small_Key.png')
icons.set(Icons.Lightning, rootPath + pack1Path + 'Main/Lighting/64px/Lighting 2nd Outline 64px.png')
icons.set(Icons.Setting, rootPath + pack1Path + 'Main/Settings/64px/Settings 1 2nd Outline 64px.png')
icons.set(Icons.Plus, rootPath + pack1Path + 'UI/Plus/64px/Plus 1st Outline 64px.png')
icons.set(Icons.Minus, rootPath + pack1Path + 'UI/Minus/64px/Minus 1st Outline 64px.png')
icons.set(Icons.Warning, rootPath + pack1Path + 'UI/Warning/64px/Warning 1st Outline 64px.png')
icons.set(Icons.X, rootPath + pack1Path + 'UI/X/64px/X 1st Outline 64px.png')
icons.set(Icons.CheckMark, rootPath + pack1Path + 'UI/Checkmark/64px/Checkmark 1st Outline 64px.png')
icons.set(Icons.Cursor, rootPath + pack1Path + 'UI/Cursor/64px/Golden Cursor 1st Outline 64px.png')
icons.set(Icons.Exclamation, rootPath + pack1Path + 'UI/Exclamation Mark/64px/Exclamation Mark 1st Outline 64px.png')
icons.set(Icons.Info, rootPath + pack1Path + 'UI/Info/64px/Info 2nd Outline 64px.png')
icons.set(Icons.GoldAngelHart, rootPath + pack1Path + 'Exclusive/Angel Heart/64px/Golden Angel Heart 1st Outline 64px.png')
icons.set(Icons.Aura, rootPath + pack1Path + 'Exclusive/Aura/64px/Aura 1st Outline 64px.png')
icons.set(Icons.Player, rootPath + pack1Path + 'People/Player/64px/Player 1st Outline 64px.png')
icons.set(Icons.Friend, rootPath + pack1Path + 'People/Friend/64px/Friend 1st Outline 64px.png')
icons.set(Icons.Multi, rootPath + pack1Path + 'People/Add Player/64px/Add Player 1st Outline 64px.png')

const GetIconDb = () => { return icons }

const iconColor = new Map<IconsColor, string[]>()

iconColor.set(IconsColor.Blue, ["#0D47A1", "#2196F3"])
iconColor.set(IconsColor.Yellow, ["#FFC107", "#FFF176"])
iconColor.set(IconsColor.Red, ["", ""])
iconColor.set(IconsColor.Transperant, ["", ""])

const GetIconColorDb = () => { return iconColor }

export { GetIconDb, GetIconColorDb }