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
    // play를 제어한다. 0 정지, n: n배속
    TimeCtrl = "time",
    // ui에 전달할 정보들이다. health, coin등등이 있다. 
    UiInfo = "uiinfo",
    KeyDown = "keydown",
    KeyUp = "keyup",
    Input = "input",
    CtrlObj = "ctrlObj",
    CtrlObjOff = "ctrlObjOff",
    SetNonGlow = "nonglow",

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
    JoypadOn = "joypadon",
    JoypadOff = "joypadoff",

    AlarmWarning = "alarmwarning",
    AlarmNormal = "alarmnormal",
    Toast = "toast",
    Spinner = "spin",

    // player와 상호작용하는 객체 로
    AddInteractive = "addinter",
    DelInteractive = "delinter",

    RegisterLoop = "regloop",
    DeregisterLoop = "deregloop",
    RegisterViewer = "regviewer",

    RegisterPhysic = "regphysic",
    DeregisterPhysic = "deregphysic",

    AgentEpisode = "agentep",
    AgentSave = "agentsv",
    AgentLoad = "agentld",

    LoadingProgress = "loading",

    RegisterSound = "sound",
    PlaySound = "soundplay",

    GameCenter = "gcenter",
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