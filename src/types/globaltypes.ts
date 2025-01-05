import * as THREE from "three";

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
    UiInfo = "uiinfo",
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
    AreaOfEffect = "AOE",
    UpdateBuff = "updatebuff",

    SceneClear = "clear",
    Reload = "reload",
    AppMode = "appmode",
    PlayMode = "playmode",
    PlayerStatus = "playerstatus",
    Projectile = "Projectile",

    AlarmWarning = "alarmwarning",
    AlarmNormal = "alarmnormal",
    Toast = "toast",

    AddInteractive = "addinter",
    DelInteractive = "delinter",

    RegisterLoop = "regloop",
    DeregisterLoop = "deregloop",
    RegisterViewer = "regviewer",

    AgentEpisode = "agentep",
    AgentSave = "agentsv",

    LoadingProgress = "loading",
}
export enum UiInfoType {
    LolliBar,
    RadialBar
}
export enum Config {
    LegoFieldW = 18,
    LegoFieldH = 24,
}

export class TargetBox extends THREE.Mesh {
    constructor(public Id: number, public ObjName: string, public MonId: string,
        geo: THREE.BoxGeometry, mat: THREE.MeshBasicMaterial
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}