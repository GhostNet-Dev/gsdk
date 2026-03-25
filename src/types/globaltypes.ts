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
    InputButtonEnable = "inputbtnenable",
    InputHookOnce = "inputhookonce",
    InputHookRemove = "inputhookremove",

    CtrlObj = "ctrlObj",
    CtrlObjOff = "ctrlObjOff",
    OrbitControlsOnOff = "orbitcontrols",
    CameraMode = "cameramode",
    AimOverlay = "aimoverlay",

    // bloom효과를 제거해야하는 객체를 등록
    SetNonGlow = "nonglow",
    SetGlow = "glow",
    Outline = "outline",

    Equipment = "Equip",
    Unequipment = "unequip",
    // item이 drop 해야될 때 
    Drop = "drop",
    DirectDrop = "directdrop",
    Pickup = "pickup",
    Reward = "reward",
    // item이 사용되는 때
    UseItem = "useitem",
    DiscardItem = "discarditem",

    BrickInfo = "bsize",
    TerrainInfo = "tsize",

    //reward
    Exp = "exp",
    People = "people",
    Gold = "gold",
    Wood = "wood",
    Water = "water",
    Electric = "electric",
    Food = "food",
    LevelUp = "levelup",
    AddSkillPoint = "addskillp",

    // Battle
    Attack = "attack",
    AreaOfEffect = "AOE",
    UpdateBuff = "updatebuff",
    RemoveBuff = "removebuff",
    SkillLearned = "skilllearned",
    UpdateSkill = "updateskill",
    RemoveSkill = "removeskill",
    SkillSlotCast = "skillslotcast",
    Death = "death",
    ActionAttach = "actionattach",
    ActionDettach = "actiondetach",
    ResourceChanged = "resourcechanged",
    // player와 상호작용하는 객체 Attackable, Interatable
    AddInteractive = "addinter",
    DelInteractive = "delinter",
    // 상호작용에 의해 Player 모드 변경 
    ChangePlayerMode = "chgplayermod",
    // player와 상호작용하는 객체 interatable
    CheckInteraction = "checkinter",
    DoInteraction = "dointer",
    ActiveInteraction = "actinter",

    SceneClear = "clear",
    Reload = "reload",
    AppMode = "appmode",
    PlayMode = "playmode",
    PlayerStatus = "playerstatus",
    Projectile = "Projectile",
    JoypadOn = "joypadon",
    JoypadOff = "joypadoff",

    // Message
    AlarmWarning = "alarmwarning",
    AlarmNormal = "alarmnormal",
    AlarmBig = "alarmbig",
    AlarmInteractiveOn = "alarminton",
    AlarmInteractiveOff = "alarmintoff",
    AlarmHookMsgOn = "alarmhookon",
    AlarmHookMsgOff = "alarmhookoff",
    Toast = "toast",
    Spinner = "spin",
    DebugOut = "debugout",
    DebugVar = "debugv",

    // Quest Event
    QuestStateChanged = "queststate",
    QuestProcessChanged = "questpro",
    QuestComplete = "questcomp",
    Confetti = "confetti",

    // 주기적으로 호출되는 함수 등록
    RegisterLoop = "regloop",
    DeregisterLoop = "deregloop",
    // resize가 필요한 요소
    RegisterViewer = "regviewer",

    // 물리적인 충돌 검사가 필요한 객체 
    RegisterLandPhysic = "reglphysic",
    RegisterPhysic = "regphysic",
    RegisterPhysicBox = "regphysicb",
    DeregisterPhysic = "deregphysic",

    // AI를 제어하는 함수들
    AgentEpisode = "agentep",
    AgentSave = "agentsv",
    AgentLoad = "agentld",

    LoadingProgress = "loading",
    RegisterLoadingItems = "regloaditems",
    RegisterLoadingCompleteItem = "regcompitems",
    RegLoadingCommonItems = "regloadcitems",
    RegLoadingCompleteCommonItem = "regcompcitems",
    LoadingStart = "loadingstart",
    ShowProgress = "showprogress",

    // Sounds
    RegisterSound = "sound",
    RegisterSoundListener = "soundlis",
    PlaySound = "soundplay",
    PlayBGM = "soundbgm",
    StopBGM = "stopbgm",
    AllStopBGM = "allstopbgm",
    // Environment
    DayNightCtrl = "daynight",

    // Grid
    ShowGrid = "showgrid",
    HideGrid = "hidegrid",
    HighlightGrid = "highlightgrid",
    GridArrowClick = "gridarrowclick",
    ShowBuildingInfo = "showbuildinginfo",
    RequestBuilding = "requestbuilding",
    ResponseBuilding = "responsebuilding",
    RequestUpgrade = "requestupgrade",
    UpgradeComplete = "upgradecomplete",

    // VFX
    GlobalEffect = "globaleffect",

    // Interactor를 제어하는 함수들
    CampfireCtrl = "campfire",
    CampfireInteract = "campfireinter",
    FlameCtrl = "flamectrl",
    FlameInteract = "flameinter",
    DarkParticle = "darkparticle",

    // Controllable actor control
    SetControlSource = "setcontrolsource",
    IssueControllableCommand = "issuectrlcmd",
    IssueControllableGroupCommand = "issuectrlgroupcmd",

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

export type ResourceChangedPayload = {
    actorId: string
    key: "hp" | "mp" | "stamina" | "exp"
    prev: number
    next: number
    max?: number
    reason: "cost" | "regen" | "damage" | "item" | "levelup"
    sourceId?: string
}
