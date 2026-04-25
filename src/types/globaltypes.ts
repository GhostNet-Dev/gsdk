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

export const GameModeId = {
    Simcity: "simcity",
    Galaxy: "galaxy",
    RivalCityView: "rival-city-view",
    Tutorial: "tutorial",
    CityWalk: "city-walk",
} as const;

export type GameModeId = typeof GameModeId[keyof typeof GameModeId];

export enum EventTypes {
    // 🎮 1. 입력 및 컨트롤 (Input & Control)
    KeyDown = "keydown",
    KeyUp = "keyup",
    Input = "input",
    InputButtonEnable = "inputbtnenable",
    InputHookOnce = "inputhookonce",
    InputHookRemove = "inputhookremove",
    JoypadOn = "joypadon",
    JoypadOff = "joypadoff",
    SetControlSource = "setcontrolsource",
    IssueControllableCommand = "issuectrlcmd",
    IssueControllableGroupCommand = "issuectrlgroupcmd",

    // 🎥 2. 카메라 및 뷰포트 (Camera & View)
    OrbitControlsOnOff = "orbitcontrols",
    CameraMode = "cameramode",
    CameraInputPreset = "camerainputpreset",
    CameraTrackTarget = "cameratracktarget",
    AimOverlay = "aimoverlay",

    // 🏗️ 3. 건설 및 그리드 (Building & Grid)
    ShowGrid = "showgrid",
    HideGrid = "hidegrid",
    HighlightGrid = "highlightgrid",
    GridArrowClick = "gridarrowclick",
    ShowBuildingInfo = "showbuildinginfo",
    RequestBuilding = "requestbuilding",
    ResponseBuilding = "responsebuilding",
    BuildRequirementValidatorReady = "buildreqvalidatorready",
    RequestUpgrade = "requestupgrade",
    UpgradeComplete = "upgradecomplete",

    // ⚔️ 4. 전투 및 스킬 (Combat & Skills)
    Attack = "attack",
    AreaOfEffect = "AOE",
    UpdateBuff = "updatebuff",
    RemoveBuff = "removebuff",
    SkillLearned = "skilllearned",
    UpdateSkill = "updateskill",
    RemoveSkill = "removeskill",
    SkillSlotCast = "skillslotcast",
    Death = "death",
    AllyDeath = "allydeath",
    ActionAttach = "actionattach",
    ActionDettach = "actiondetach",
    CombatResourceChanged = "resourcechanged",
    ChangePlayerMode = "chgplayermod",
    SpawnProjectile = "Projectile",
    RegisterTarget = "registertarget",
    DeregisterTarget = "deregistertarget",
    UpdateTargetState = "updatetargetstate",
    UpdateTargetObject = "updatetargetobject",
    RequestTargetSystem = "requesttargetsystem",
    RegisterTargetSystem = "registertargetsystem",

    // 💰 5. 자원 및 보상 (Resources & Rewards)
    Exp = "exp",
    People = "people",
    Gold = "gold",
    Wood = "wood",
    Stone = "stone",
    Water = "water",
    Electric = "electric",
    Food = "food",
    LevelUp = "levelup",
    AddSkillPoint = "addskillp",
    CurrencyChangeRequested = "resourcechangereq",
    CurrencyAmountChanged = "resourceamountchanged",

    // 🎒 6. 아이템 및 상호작용 (Inventory & Interaction)
    Equipment = "Equip",
    Unequipment = "unequip",
    Drop = "drop",
    DirectDrop = "directdrop",
    Pickup = "pickup",
    Reward = "reward",
    UseItem = "useitem",
    DiscardItem = "discarditem",
    AddInteractive = "addinter",
    DelInteractive = "delinter",
    CheckInteraction = "checkinter",
    DoInteraction = "dointer",
    ActiveInteraction = "actinter",
    CampfireCtrl = "campfire",
    CampfireInteract = "campfireinter",
    FlameCtrl = "flamectrl",
    FlameInteract = "flameinter",

    // 🔄 7. 게임 루프 및 턴 시스템 (Game Loop & Turn System)
    TimeCtrl = "time",
    RegisterLoop = "regloop",
    DeregisterLoop = "deregloop",
    TurnNext = "turnnext",
    TurnEnded = "turnended",
    TurnReportUpdated = "turnreportupdated",
    RegisterTurnParticipant = "regturnparticipant",
    DeregisterTurnParticipant = "deregturnparticipant",
    FactionStateChanged = "factionstatechanged",
    RivalCityStateChanged = "rivalcitystatechanged",
    PlanetStateChanged = "planetstatechanged",
    RouteStateChanged = "routestatechanged",
    StrategicGalaxyUpdated = "strategicgalaxyupdated",
    GalaxyViewModelUpdated = "galaxyviewmodelupdated",
    StrategicFleetStateChanged = "strategicfleetstatechanged",
    StrategicFleetOrderRequested = "strategicfleetorderrequested",
    RequestPlanetClaim = "requestplanetclaim",

    // 🌍 8. 물리 및 렌더링 (Physics, Rendering & VFX)
    CtrlObj = "ctrlObj",
    CtrlObjOff = "ctrlObjOff",
    SetNonGlow = "nonglow",
    SetGlow = "glow",
    Outline = "outline",
    RegisterLandPhysic = "reglphysic",
    RegisterPhysic = "regphysic",
    RegisterPhysicBox = "regphysicb",
    DeregisterPhysic = "deregphysic",
    GlobalEffect = "globaleffect",
    DarkParticle = "darkparticle",

    // 📢 9. UI, 시스템 상태 및 퀘스트 (UI & System Messages)
    UiInfo = "uiinfo",
    BrickInfo = "bsize",
    TerrainInfo = "tsize",
    SceneClear = "clear",
    Reload = "reload",
    AppMode = "appmode",
    PlayMode = "playmode",
    PlayerStatus = "playerstatus",
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
    QuestStateChanged = "queststate",
    QuestProcessChanged = "questpro",
    QuestComplete = "questcomp",
    Confetti = "confetti",
    RegisterViewer = "regviewer",
    GameCenter = "gcenter",

    // 🤖 10. AI 에이전트 제어 (AI Agents)
    AgentEpisode = "agentep",
    AgentSave = "agentsv",
    AgentLoad = "agentld",

    // ⏳ 11. 로딩 및 진행도 (Loading)
    LoadingProgress = "loading",
    RegisterLoadingItems = "regloaditems",
    RegisterLoadingCompleteItem = "regcompitems",
    RegLoadingCommonItems = "regloadcitems",
    RegLoadingCompleteCommonItem = "regcompcitems",
    LoadingStart = "loadingstart",
    ShowProgress = "showprogress",

    // 🎵 12. 사운드 및 환경 (Audio & Environment)
    RegisterSound = "sound",
    RegisterSoundListener = "soundlis",
    PlaySound = "soundplay",
    PlayBGM = "soundbgm",
    StopBGM = "stopbgm",
    AllStopBGM = "allstopbgm",
    DayNightCtrl = "daynight",
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

export type CombatResourceChangedPayload = {
    actorId: string
    key: "hp" | "mp" | "stamina" | "exp"
    prev: number
    next: number
    max?: number
    reason: "cost" | "regen" | "damage" | "item" | "levelup"
    sourceId?: string
}
