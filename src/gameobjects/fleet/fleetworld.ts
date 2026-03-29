import * as THREE from "three"
import { gsap } from "gsap"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { Loader } from "@Glibs/loader/loader"
import { Char } from "@Glibs/loader/assettypes"
import { ControllableDb } from "@Glibs/actors/controllable/controllabledb"
import { Controllables } from "@Glibs/actors/controllable/controllables"
import { CreateControllable } from "@Glibs/actors/controllable/createcontrollable"
import { AiPolicy } from "@Glibs/actors/controllable/policy/aipolicy"
import { HumanPolicy } from "@Glibs/actors/controllable/policy/humanpolicy"
import { PolicyRegistry } from "@Glibs/actors/controllable/policy/controlpolicy"
import {
  defaultEscortAiPlanner,
  defaultShipAiPlanner,
  registerSampleDefinitions,
} from "@Glibs/actors/controllable/samples/controllabledefs"
import { FighterShipRuntime } from "@Glibs/actors/controllable/samples/fightershipruntime"
import { Formation, FleetFormation } from "./formation"
import { FleetManager } from "./fleetmanager"
import { FleetOrder, FleetCommandIssuer } from "./fleet"
import { FleetAimInput, destinationFromAim } from "./directionaim"

type Vector3Like = THREE.Vector3 | [number, number, number] | { x: number, y: number, z: number }

type ShipSpawnOptions = {
  controllableId?: string
  color?: THREE.ColorRepresentation
  speed?: number
}

export type FleetDirectionalMoveOptions = {
  distance: number
  aim: FleetAimInput
  anchor?: Vector3Like
  formation?: FleetFormation
  spacing?: number
  issuedAt?: number
  issuer?: FleetCommandIssuer
  priority?: number
}

type ShipStatusRingVisual = {
  group: THREE.Group
  hpRing: THREE.Mesh
  energyRing: THREE.Mesh
  hpInnerRadius: number
  hpOuterRadius: number
  energyInnerRadius: number
  energyOuterRadius: number
  lastHullRatio: number
  lastEnergyRatio: number
}

export type FleetWorldGridOptions = {
  enabled: boolean
  size: number
  divisions: number
  centerColor: THREE.ColorRepresentation
  gridColor: THREE.ColorRepresentation
  y: number
}

export type FleetWorldCameraOptions = {
  autoFrame: boolean
  initialPosition: Vector3Like
  initialTarget: Vector3Like
  minRadius: number
  minHeight: number
  minDistance: number
  heightFactor: number
  distanceFactor: number
}

export type FleetWorldFleetOptions = {
  id: string
  name?: string
  shipPrefix?: string
  shipCount: number
  controllableId: string
  formation: FleetFormation
  anchor: Vector3Like
  facing: Vector3Like
  color?: THREE.ColorRepresentation
  speed?: number
  spacing?: number
}

export type FleetWorldDebugOptions = {
  enabled: boolean
}

export type FleetWorldStatusRingOptions = {
  enabled: boolean
  verticalOffset: number
  outerRadiusMultiplier: number
  minOuterRadius: number
  hpThickness: number
  ringGap: number
  energyThickness: number
  hpColor: THREE.ColorRepresentation
  hpBackgroundColor: THREE.ColorRepresentation
  hpBackgroundOpacity: number
  energyColor: THREE.ColorRepresentation
  energyBackgroundColor: THREE.ColorRepresentation
  energyBackgroundOpacity: number
}

export type FleetWorldOptions = {
  backgroundColor: THREE.ColorRepresentation
  grid: FleetWorldGridOptions
  camera: FleetWorldCameraOptions
  debug: FleetWorldDebugOptions
  statusRings: FleetWorldStatusRingOptions
  spacingMultiplier: number
  minSpacing: number
  fleets: FleetWorldFleetOptions[]
}

const defaultFleetWorldOptions: FleetWorldOptions = {
  backgroundColor: 0x030712,
  grid: {
    enabled: true,
    size: 240,
    divisions: 24,
    centerColor: 0x94a3b8,
    gridColor: 0x334155,
    y: -0.05,
  },
  camera: {
    autoFrame: true,
    initialPosition: [0, 90, 90],
    initialTarget: [0, 0, 0],
    minRadius: 24,
    minHeight: 48,
    minDistance: 56,
    heightFactor: 1.35,
    distanceFactor: 1.45,
  },
  debug: {
    enabled: true,
  },
  statusRings: {
    enabled: true,
    verticalOffset: -0.18,
    outerRadiusMultiplier: 0.42,
    minOuterRadius: 3.4,
    hpThickness: 0.56,
    ringGap: 0.24,
    energyThickness: 0.46,
    hpColor: 0x22c55e,
    hpBackgroundColor: 0x052e16,
    hpBackgroundOpacity: 0.58,
    energyColor: 0x38bdf8,
    energyBackgroundColor: 0x081421,
    energyBackgroundOpacity: 0.72,
  },
  spacingMultiplier: 2.4,
  minSpacing: 20,
  fleets: [
    {
      id: "alpha",
      name: "Alpha Fleet",
      shipPrefix: "alpha",
      shipCount: 3,
      controllableId: "ship.fighter",
      formation: "line",
      anchor: [-72, 0, 0],
      facing: [1, 0, 0],
    },
    {
      id: "beta",
      name: "Beta Fleet",
      shipPrefix: "beta",
      shipCount: 3,
      controllableId: "ship.fighter",
      formation: "line",
      anchor: [72, 0, 0],
      facing: [-1, 0, 0],
      color: 0xfca5a5,
    },
  ],
}

export class FleetWorld {
  private readonly controllableDb = new ControllableDb()
  private readonly policyRegistry = new PolicyRegistry()
  private readonly humanPolicy = new HumanPolicy()
  private readonly controllables = new Controllables()
  private readonly createControllable: CreateControllable
  private readonly shipRuntimes = new Map<string, FighterShipRuntime>()
  private readonly shipFootprints = new Map<string, number>()
  private readonly shipStatusVisuals = new Map<string, ShipStatusRingVisual>()
  private readonly controllableIds = new Set<string>()
  private readonly taskObjs: ILoop[] = []
  private readonly fleetRoot = new THREE.Group()
  private readonly fleetManager: FleetManager
  private readonly projectionProbe = new THREE.PerspectiveCamera()
  private readonly projectionViewMatrix = new THREE.Matrix4()
  private readonly projectionViewProjectionMatrix = new THREE.Matrix4()
  private selectedShipId?: string
  private bootstrapped = false

  constructor(
    private readonly loader: Loader,
    private readonly eventCtrl: IEventController,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly options: Partial<FleetWorldOptions> = {},
  ) {
    this.createControllable = new CreateControllable(
      this.eventCtrl,
      this.controllableDb,
      (name: string) => this.policyRegistry.get(name),
    )
    this.fleetManager = new FleetManager(this.controllables)
    this.taskObjs.push({
      LoopId: 0,
      update: (_delta: number) => this.updateShipStatusVisuals(),
    })
    
    // Initialize projection probe with main camera's properties
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.projectionProbe.fov = this.camera.fov
      this.projectionProbe.near = this.camera.near
      this.projectionProbe.far = this.camera.far
      this.projectionProbe.aspect = this.camera.aspect
      this.projectionProbe.updateProjectionMatrix()
    }
  }

  get objects(): THREE.Object3D[] {
    return [this.fleetRoot]
  }

  get tasks(): ILoop[] {
    return this.taskObjs
  }

  get manager() {
    return this.fleetManager
  }

  focusFleet(fleetId: string) {
    const summary = this.fleetManager.getFleetSummary(fleetId)
    if (!summary) return

    this.selectedShipId = summary.flagshipId
    this.focusFleetMembers(summary.memberIds, 0.6)
  }

  focusShip(shipId: string) {
    const runtime = this.shipRuntimes.get(shipId)
    if (!runtime) return
    this.selectedShipId = shipId
    this.focusRuntime(runtime, 0.45)
  }

  getFleetShips(fleetId: string) {
    const summary = this.fleetManager.getFleetSummary(fleetId)
    if (!summary) return []

    return summary.memberIds.map((shipId) => {
      const runtime = this.shipRuntimes.get(shipId)
      return {
        id: shipId,
        hull: runtime?.getHull() ?? 0,
        maxHull: runtime?.getMaxHull() ?? 100,
        hullRatio: runtime?.getHullRatio() ?? 0,
        energy: runtime?.getEnergy() ?? 0,
        maxEnergy: runtime?.getMaxEnergy() ?? 100,
        energyRatio: runtime?.getEnergyRatio() ?? 0,
        selected: shipId === this.selectedShipId,
      }
    })
  }

  moveFleetByAim(fleetId: string, options: FleetDirectionalMoveOptions) {
    const anchor = options.anchor
      ? this.toVector3(options.anchor)
      : this.getFleetFlagshipPosition(fleetId)
    if (!anchor) return []

    const destination = destinationFromAim(anchor, options.aim, options.distance)
    const moveOptions: Omit<FleetOrder, "type" | "point"> = {
      formation: options.formation,
      spacing: options.spacing,
      issuedAt: options.issuedAt,
      issuer: options.issuer,
      priority: options.priority,
      facing: destination.clone().sub(anchor).normalize(),
    }

    return this.fleetManager.moveFleet(fleetId, destination, moveOptions)
  }

  private get config(): FleetWorldOptions {
    return {
      ...defaultFleetWorldOptions,
      ...this.options,
      grid: {
        ...defaultFleetWorldOptions.grid,
        ...this.options.grid,
      },
      camera: {
        ...defaultFleetWorldOptions.camera,
        ...this.options.camera,
      },
      debug: {
        ...defaultFleetWorldOptions.debug,
        ...this.options.debug,
      },
      statusRings: {
        ...defaultFleetWorldOptions.statusRings,
        ...this.options.statusRings,
      },
      fleets: this.options.fleets ?? defaultFleetWorldOptions.fleets,
    }
  }

  private getFleetFlagshipPosition(fleetId: string) {
    const summary = this.fleetManager.getFleetSummary(fleetId)
    if (!summary?.flagshipId) return undefined
    const runtime = this.shipRuntimes.get(summary.flagshipId)
    if (!runtime) return undefined
    return runtime.mesh.getWorldPosition(new THREE.Vector3())
  }

  async init() {
    if (this.bootstrapped) return
    this.bootstrapped = true

    this.setupScene()
    this.setupControllables()
    await this.setupFleets()
    if (this.config.debug.enabled) {
      window.addEventListener("keydown", this.onDebugKeyDown)
    }
  }

  dispose() {
    if (this.config.debug.enabled) {
      window.removeEventListener("keydown", this.onDebugKeyDown)
    }

    this.controllableIds.forEach((actorId) => {
      this.controllables.unregister(actorId)
    })
    this.controllableIds.clear()

    this.shipRuntimes.clear()
    this.shipFootprints.clear()
    this.shipStatusVisuals.clear()
    this.taskObjs.length = 0
    this.taskObjs.push({
      LoopId: 0,
      update: (_delta: number) => this.updateShipStatusVisuals(),
    })
    this.fleetRoot.clear()
    this.bootstrapped = false
  }

  createFleet(id: string, memberIds: string[], formation: FleetFormation = "line", spacing = 8) {
    return this.fleetManager.createFleet(id, memberIds, { formation, spacing })
  }

  async spawnShip(id: string, position: THREE.Vector3, options: ShipSpawnOptions = {}) {
    const controllableId = options.controllableId ?? "ship.fighter"
    const def = this.controllableDb.get(controllableId)

    const mesh = await this.createShipMesh(def.model, def.scale, options.color ?? 0x7dd3fc)
    mesh.position.copy(position)
    mesh.name = id
    this.fleetRoot.add(mesh)

    const footprint = this.measureShipFootprint(mesh)
    this.shipFootprints.set(id, footprint)
    console.log(
      `[FleetWorld] spawn ${id} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) footprint=${footprint.toFixed(2)}`,
    )

    const runtime = new FighterShipRuntime(id, mesh, this.shipRuntimes, options.speed ?? 18)
    this.shipRuntimes.set(id, runtime)
    this.taskObjs.push(runtime)
    this.attachShipStatusVisual(id, mesh, footprint)

    const ctrl = this.createControllable.create(controllableId, runtime)
    this.controllables.register(id, ctrl)
    this.controllableIds.add(id)

    return { mesh, runtime, ctrl }
  }

  private setupScene() {
    this.fleetRoot.name = "space-war-fleet-root"
    this.scene.background = new THREE.Color(this.config.backgroundColor)

    const initialPosition = this.toVector3(this.config.camera.initialPosition)
    const initialTarget = this.toVector3(this.config.camera.initialTarget)
    this.camera.position.copy(initialPosition)
    this.camera.lookAt(initialTarget)
    if ("controls" in this.camera) {
      const controlled = this.camera as THREE.Camera & { controls?: { target: THREE.Vector3 } }
      controlled.controls?.target.copy(initialTarget)
    }

    if (this.config.grid.enabled) {
      const grid = new THREE.GridHelper(
        this.config.grid.size,
        this.config.grid.divisions,
        this.config.grid.centerColor,
        this.config.grid.gridColor,
      )
      grid.position.y = this.config.grid.y
      this.fleetRoot.add(grid)
    }
  }

  private setupControllables() {
    registerSampleDefinitions(this.controllableDb)
    this.policyRegistry.register("human", this.humanPolicy)
    this.policyRegistry.register("ship-default-ai", new AiPolicy(defaultShipAiPlanner))
    this.policyRegistry.register("ally-escort-ai", new AiPolicy(defaultEscortAiPlanner))
  }

  private async setupFleets() {
    const allMembers: string[] = []

    for (const fleet of this.config.fleets) {
      const anchor = this.toVector3(fleet.anchor)
      const facing = this.toVector3(fleet.facing)
      const prefix = fleet.shipPrefix ?? fleet.id

      const lead = await this.spawnShip(`${prefix}-1`, anchor, {
        controllableId: fleet.controllableId,
        color: fleet.color,
        speed: fleet.speed,
      })
      const spacing = fleet.spacing ?? this.resolveFleetSpacing([lead.runtime.id])
      const positions = this.layoutSpawnPositions(
        fleet.formation,
        anchor,
        fleet.shipCount,
        spacing,
        facing,
      )
      lead.mesh.position.copy(positions[0] ?? anchor)

      const memberIds = [lead.runtime.id]
      for (let i = 1; i < fleet.shipCount; i++) {
        const spawned = await this.spawnShip(`${prefix}-${i + 1}`, positions[i] ?? anchor, {
          controllableId: fleet.controllableId,
          color: fleet.color,
          speed: fleet.speed,
        })
        memberIds.push(spawned.runtime.id)
      }

      this.fleetManager.createFleet(fleet.id, memberIds, {
        name: fleet.name ?? fleet.id,
        color: fleet.color,
        formation: fleet.formation,
        spacing,
      })
      allMembers.push(...memberIds)
      console.log(`[FleetWorld] ${fleet.id} spacing=${spacing.toFixed(2)} count=${fleet.shipCount}`)
    }

    if (this.config.fleets[0]) {
      this.fleetManager.selectFleet(this.config.fleets[0].id)
    }

    if (this.config.camera.autoFrame) {
      this.frameInitialCamera(allMembers)
    }
  }

  private readonly onDebugKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Digit1") {
      this.fleetManager.moveFleet("alpha", new THREE.Vector3(-10, 0, -32), {
        formation: "wedge",
        facing: new THREE.Vector3(1, 0, 1),
        issuer: "script",
      })
    }

    if (event.code === "Digit2") {
      this.fleetManager.moveFleet("beta", new THREE.Vector3(12, 0, 30), {
        formation: "line",
        facing: new THREE.Vector3(-1, 0, -0.4),
        issuer: "script",
      })
    }

    if (event.code === "Digit3") {
      this.fleetManager.attackTarget("alpha", "beta-2", { issuer: "script" })
      this.fleetManager.attackTarget("beta", "alpha-2", { issuer: "script" })
    }

    if (event.code === "Digit4") {
      this.fleetManager.holdPosition("alpha", { issuer: "script" })
      this.fleetManager.holdPosition("beta", { issuer: "script" })
    }
  }

  private async createShipMesh(modelId: Char, scale: number, color: THREE.ColorRepresentation) {
    try {
      const mesh = await this.loader.GetAssets(modelId).CloneModel()
      mesh.scale.setScalar(scale)
      this.tintShipMesh(mesh, color)
      return this.normalizeShipMesh(mesh)
    } catch (error) {
      console.warn(`[FleetWorld] failed to load ship model ${String(modelId)}. using fallback mesh.`, error)
      return this.makeShipMesh(color)
    }
  }

  private tintShipMesh(root: THREE.Object3D, color: THREE.ColorRepresentation) {
    const tint = new THREE.Color(color)
    root.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!("isMesh" in mesh) || !mesh.isMesh) return

      const applyTint = (material: THREE.Material) => {
        const standard = material as THREE.MeshStandardMaterial
        if (!("color" in standard) || !standard.color) return
        standard.color = standard.color.clone().lerp(tint, 0.35)
      }

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => {
          const cloned = material.clone()
          applyTint(cloned)
          return cloned
        })
        return
      }

      mesh.material = mesh.material.clone()
      applyTint(mesh.material)
    })
  }

  private measureShipFootprint(mesh: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(mesh)
    const size = box.getSize(new THREE.Vector3())
    const planar = Math.max(size.x, size.z)
    return Math.max(planar, 4)
  }

  private normalizeShipMesh(mesh: THREE.Group) {
    const bounds = new THREE.Box3().setFromObject(mesh)
    const center = bounds.getCenter(new THREE.Vector3())
    const min = bounds.min.clone()

    mesh.position.x -= center.x
    mesh.position.z -= center.z
    mesh.position.y -= min.y

    const pivot = new THREE.Group()
    pivot.add(mesh)
    return pivot
  }

  private resolveFleetSpacing(memberIds: string[]) {
    const largest = memberIds.reduce((max, memberId) => {
      return Math.max(max, this.shipFootprints.get(memberId) ?? 0)
    }, 0)

    return Math.max(this.config.minSpacing, largest * this.config.spacingMultiplier)
  }

  private layoutSpawnPositions(
    formation: FleetFormation,
    anchor: THREE.Vector3,
    count: number,
    spacing: number,
    facing: THREE.Vector3,
  ) {
    return Formation.layout(formation, {
      anchor,
      count,
      spacing,
      facing,
    })
  }

  private frameInitialCamera(memberIds: string[]) {
    const meshes = memberIds
      .map((id) => this.shipRuntimes.get(id)?.mesh)
      .filter((mesh): mesh is THREE.Object3D => Boolean(mesh))

    if (meshes.length === 0) return

    const bounds = new THREE.Box3()
    meshes.forEach((mesh) => bounds.expandByObject(mesh))

    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const radius = Math.max(size.x, size.z, 24)
    const height = Math.max(48, radius * 1.35)
    const distance = Math.max(56, radius * 1.45)
    const target = new THREE.Vector3(center.x, 0, center.z)

    this.camera.position.set(target.x, height, target.z + distance)
    this.camera.lookAt(target)

    if ("controls" in this.camera) {
      const controlled = this.camera as THREE.Camera & { controls?: { target: THREE.Vector3; update: () => void } }
      controlled.controls?.target.copy(target)
      controlled.controls?.update()
    }
  }

  private focusRuntime(runtime: FighterShipRuntime, duration: number) {
    const target = runtime.mesh.getWorldPosition(new THREE.Vector3())
    const footprint = this.shipFootprints.get(runtime.id) ?? this.config.camera.minRadius
    const radius = Math.max(footprint * 0.9, this.config.camera.minRadius * 0.6)
    this.focusPoint(target, radius, duration)
  }

  private focusFleetMembers(memberIds: string[], duration: number) {
    const meshes = memberIds
      .map((id) => this.shipRuntimes.get(id)?.mesh)
      .filter((mesh): mesh is THREE.Object3D => Boolean(mesh))

    if (meshes.length === 0) return

    const bounds = new THREE.Box3()
    meshes.forEach((mesh) => bounds.expandByObject(mesh))

    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const radius = Math.max(size.x, size.z, this.config.camera.minRadius)
    this.focusPoint(center, radius, duration)
  }

  private focusPoint(target: THREE.Vector3, radius: number, duration: number) {
    const currentTarget = this.getCameraTarget()
    const currentOffset = this.camera.position.clone().sub(currentTarget)
    const horizontalDirection = new THREE.Vector3(currentOffset.x, 0, currentOffset.z)

    if (horizontalDirection.lengthSq() <= 0.0001) {
      horizontalDirection.set(0, 0, 1)
    } else {
      horizontalDirection.normalize()
    }

    const desiredHeight = Math.max(this.config.camera.minHeight, radius * this.config.camera.heightFactor)
    const desiredDistance = Math.max(this.config.camera.minDistance, radius * this.config.camera.distanceFactor)
    const desiredOffset = horizontalDirection.multiplyScalar(desiredDistance).setY(desiredHeight)
    const desiredPosition = target.clone().add(desiredOffset)
    const desiredTarget = this.resolveFocusTarget(target, desiredPosition, radius)

    const animationObj = {
      px: this.camera.position.x,
      py: this.camera.position.y,
      pz: this.camera.position.z,
      tx: currentTarget.x,
      ty: currentTarget.y,
      tz: currentTarget.z,
    }

    gsap.to(animationObj, {
      px: desiredPosition.x,
      py: desiredPosition.y,
      pz: desiredPosition.z,
      tx: desiredTarget.x,
      ty: desiredTarget.y,
      tz: desiredTarget.z,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        this.camera.position.set(animationObj.px, animationObj.py, animationObj.pz)
        if ("controls" in this.camera) {
          const controlled = this.camera as THREE.Camera & { controls?: { target: THREE.Vector3; update: () => void } }
          if (controlled.controls) {
            controlled.controls.target.set(animationObj.tx, animationObj.ty, animationObj.tz)
            controlled.controls.update()
          }
        } else {
          this.camera.lookAt(animationObj.tx, animationObj.ty, animationObj.tz)
        }
      },
    })
  }

  private resolveFocusTarget(shipPosition: THREE.Vector3, cameraPosition: THREE.Vector3, radius: number) {
    const baseTarget = shipPosition.clone()
    const desiredNdcY = this.getUsableViewportCenterNdcY()
    if (Math.abs(desiredNdcY) < 0.001) return baseTarget

    let bestShift = 0
    let bestError = Math.abs(this.measureFocusProjectionError(baseTarget, cameraPosition, 0, desiredNdcY))
    let step = Math.max(radius * 1.2, 10)

    for (let i = 0; i < 12; i++) {
      const candidates = [bestShift - step, bestShift, bestShift + step]
      for (const shift of candidates) {
        const error = Math.abs(this.measureFocusProjectionError(baseTarget, cameraPosition, shift, desiredNdcY))
        if (error < bestError) {
          bestError = error
          bestShift = shift
        }
      }
      step *= 0.5
    }

    // Shift along world Y axis is generally safe for tilted RTS cameras.
    // To be more robust across all angles, we could shift along camera's local Y axis in world space.
    return baseTarget.add(new THREE.Vector3(0, bestShift, 0))
  }

  private measureFocusProjectionError(
    baseTarget: THREE.Vector3,
    cameraPosition: THREE.Vector3,
    targetYShift: number,
    desiredNdcY: number,
  ) {
    const lookTarget = baseTarget.clone().add(new THREE.Vector3(0, targetYShift, 0))
    const projected = this.projectWorldPoint(baseTarget, cameraPosition, lookTarget)
    return projected.y - desiredNdcY
  }

  private projectWorldPoint(point: THREE.Vector3, cameraPosition: THREE.Vector3, lookTarget: THREE.Vector3) {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.projectionProbe.fov = this.camera.fov
      this.projectionProbe.aspect = this.camera.aspect
      this.projectionProbe.updateProjectionMatrix()
    }
    
    this.projectionProbe.position.copy(cameraPosition)
    this.projectionProbe.up.copy(this.camera.up)
    this.projectionProbe.lookAt(lookTarget)
    this.projectionProbe.updateMatrixWorld(true)

    this.projectionViewMatrix.copy(this.projectionProbe.matrixWorld).invert()
    this.projectionViewProjectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.projectionViewMatrix)

    return point.clone().applyMatrix4(this.projectionViewProjectionMatrix)
  }

  private getUsableViewportCenterNdcY() {
    const viewportHeight = window.innerHeight
    if (viewportHeight <= 0) return 0

    const panel = document.getElementById("fleet-command-panel")
    if (!panel) return 0

    const rect = panel.getBoundingClientRect()
    // The panel is at the bottom, so usable area is from top to rect.top
    const usableBottom = Math.max(0, rect.top)
    const usableCenterY = usableBottom * 0.5
    // Screen Y (0 to viewportHeight) to NDC Y (1 to -1)
    return 1 - ((usableCenterY / viewportHeight) * 2)
  }

  private updateShipStatusVisuals() {
    this.shipStatusVisuals.forEach((visual, shipId) => {
      const runtime = this.shipRuntimes.get(shipId)
      if (!runtime) return

      const hullRatio = runtime.getHullRatio()
      if (Math.abs(hullRatio - visual.lastHullRatio) > 0.001) {
        this.updateRingGeometry(
          visual.hpRing,
          visual.hpInnerRadius,
          visual.hpOuterRadius,
          hullRatio,
        )
        visual.lastHullRatio = hullRatio
      }

      const energyRatio = runtime.getEnergyRatio()
      if (Math.abs(energyRatio - visual.lastEnergyRatio) > 0.001) {
        this.updateRingGeometry(
          visual.energyRing,
          visual.energyInnerRadius,
          visual.energyOuterRadius,
          energyRatio,
        )
        visual.lastEnergyRatio = energyRatio
      }
    })
  }

  private attachShipStatusVisual(id: string, mesh: THREE.Object3D, footprint: number) {
    if (!this.config.statusRings.enabled) return
    const visual = this.createShipStatusVisual(footprint)
    mesh.add(visual.group)
    this.shipStatusVisuals.set(id, visual)
    this.updateRingGeometry(visual.hpRing, visual.hpInnerRadius, visual.hpOuterRadius, 1)
    this.updateRingGeometry(visual.energyRing, visual.energyInnerRadius, visual.energyOuterRadius, 1)
  }

  private createShipStatusVisual(footprint: number): ShipStatusRingVisual {
    const ringOptions = this.config.statusRings
    const group = new THREE.Group()
    group.position.y = ringOptions.verticalOffset

    const outerRadius = Math.max(
      footprint * ringOptions.outerRadiusMultiplier,
      ringOptions.minOuterRadius,
    )
    const hpOuterRadius = outerRadius
    const hpInnerRadius = Math.max(0.1, hpOuterRadius - ringOptions.hpThickness)
    const energyOuterRadius = Math.max(0.1, hpInnerRadius - ringOptions.ringGap)
    const energyInnerRadius = Math.max(0.05, energyOuterRadius - ringOptions.energyThickness)

    const hpBg = this.createStatusRingBackground(
      hpInnerRadius,
      hpOuterRadius,
      ringOptions.hpBackgroundColor,
      ringOptions.hpBackgroundOpacity,
    )
    const hpRing = this.createStatusRingForeground(ringOptions.hpColor)
    const energyBg = this.createStatusRingBackground(
      energyInnerRadius,
      energyOuterRadius,
      ringOptions.energyBackgroundColor,
      ringOptions.energyBackgroundOpacity,
    )
    const energyRing = this.createStatusRingForeground(ringOptions.energyColor)

    hpRing.position.y += 0.01
    energyBg.position.y += 0.02
    energyRing.position.y += 0.03

    group.add(hpBg, hpRing, energyBg, energyRing)

    return {
      group,
      hpRing,
      energyRing,
      hpInnerRadius,
      hpOuterRadius,
      energyInnerRadius,
      energyOuterRadius,
      lastHullRatio: -1,
      lastEnergyRatio: -1,
    }
  }

  private createStatusRingBackground(
    innerRadius: number,
    outerRadius: number,
    color: THREE.ColorRepresentation,
    opacity: number,
  ) {
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64)
    geometry.rotateX(-Math.PI / 2)
    return new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
  }

  private createStatusRingForeground(color: THREE.ColorRepresentation) {
    return new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
  }

  private updateRingGeometry(
    ring: THREE.Mesh,
    innerRadius: number,
    outerRadius: number,
    progress: number,
  ) {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1)
    const thetaLength = clamped * Math.PI * 2
    const geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      64,
      1,
      Math.PI / 2,
      -thetaLength,
    )
    geometry.rotateX(-Math.PI / 2)
    ring.geometry.dispose()
    ring.geometry = geometry
  }

  private getCameraTarget() {
    if ("controls" in this.camera) {
      const controlled = this.camera as THREE.Camera & { controls?: { target: THREE.Vector3 } }
      if (controlled.controls) return controlled.controls.target.clone()
    }
    return new THREE.Vector3(0, 0, 0)
  }

  private makeShipMesh(color: THREE.ColorRepresentation) {
    const group = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 5, 8),
      new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.4 }),
    )
    body.rotation.z = -Math.PI / 2
    group.add(body)

    const wingGeometry = new THREE.BoxGeometry(0.3, 0.15, 3.6)
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.2, roughness: 0.7 })

    const wingLeft = new THREE.Mesh(wingGeometry, wingMaterial)
    wingLeft.position.set(0, 0, -1.3)
    group.add(wingLeft)

    const wingRight = wingLeft.clone()
    wingRight.position.z = 1.3
    group.add(wingRight)

    return group
  }

  private toVector3(value: Vector3Like) {
    if (value instanceof THREE.Vector3) return value.clone()
    if (Array.isArray(value)) return new THREE.Vector3(value[0], value[1], value[2])
    return new THREE.Vector3(value.x, value.y, value.z)
  }
}
