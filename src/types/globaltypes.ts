export enum AppMode {
    Intro,
    Long,
    Close,
    Play,
    EditPlay,
    Brick,
    Face,
    Weapon,
    Furniture,
    Farmer,
    Portal,
    Lego,
    NonLego,
    LegoDelete,
    CityView,
    EditCity,
}

export enum EventTypes {
    KeyDown = "keydown",
    KeyUp = "keyup",
    Input = "input",
    CtrlObj = "ctrlObj",
    Equipment = "Equip",
    Drop = "drop",
    DirectDrop = "directdrop",
    BrickInfo = "bsize",
    TerrainInfo = "tsize",
    Attack = "attack",
    SceneClear = "clear",
    Reload = "reload",
    AppMode = "appmode",
    PlayMode = "playmode",
    PlayerStatus = "playerstatus",
    Projectile = "Projectile",
    AlarmWarning = "alarmwarning",
    AlarmNormal = "alarmnormal",
    AddInteractive = "addinter",
    DelInteractive = "delinter",
    UpdateBuff = "updatebuff",
}