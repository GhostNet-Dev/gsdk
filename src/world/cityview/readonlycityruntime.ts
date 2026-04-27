import * as THREE from "three";
import { Loader } from "@Glibs/loader/loader";
import { ReadonlyCityLayoutSnapshot, ReadonlyCityObjectKind } from "./cityviewtypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { StaticColliderKind, StaticColliderRegistry } from "@Glibs/interactives/environment/staticcolliderregistry";
import { BuildingType } from "@Glibs/interactives/building/ibuildingobj";
import { buildingDefs, BuildingProperty } from "@Glibs/interactives/building/buildingdefs";
import { TargetRecord } from "@Glibs/systems/targeting/targettypes";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { ProjectileWeaponController } from "@Glibs/actors/controllable/projectileweaponcontroller";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { AttackOption, AttackType } from "@Glibs/types/playertypes";
import { DamageKind } from "@Glibs/actors/battle/damagepacket";
import { BuildingRingProgress, BuildingRingProgressState } from "@Glibs/interactives/building/buildingringprogress";

export class ReadonlyCityRuntime implements ILoop {
  LoopId = 0;
  readonly root = new THREE.Group();
  private readonly customMaterials = new Set<THREE.Material>();
  private readonly colliderRegistry?: StaticColliderRegistry;
  private readonly combatants: ReadonlyCityDefenseCombatant[] = [];
  private readonly registeredTargetIds: string[] = [];
  private readonly registeredInteractiveObjects: THREE.Object3D[] = [];
  private readonly destroyedTargetIds = new Set<string>();
  private targetRegistry?: TargetRegistrySystem;
  private coreTargetId?: string;

  constructor(
    private readonly loader: Loader,
    private readonly eventCtrl?: IEventController,
    private readonly collisionEnabled = false,
  ) {
    this.root.name = "readonly-city-runtime";
    this.colliderRegistry = eventCtrl && collisionEnabled
      ? new StaticColliderRegistry(eventCtrl)
      : undefined;
    this.eventCtrl?.RegisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry);
    this.eventCtrl?.SendEventMessage(EventTypes.RequestTargetSystem);
    this.eventCtrl?.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  async render(snapshot: ReadonlyCityLayoutSnapshot): Promise<void> {
    this.clearRoot();

    for (const object of snapshot.objects) {
      const asset = this.loader.GetAssets(object.assetKey);
      const model = await asset.CloneModel();
      model.position.copy(object.position);
      model.rotation.y = object.rotationY;
      model.scale.setScalar(object.scale);
      model.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });

      if (object.kind === ReadonlyCityObjectKind.ConstructionSite) {
        this.applyConstructionMaterial(model);
      }

      this.root.add(model);

      if (object.kind !== ReadonlyCityObjectKind.ConstructionSite && this.eventCtrl) {
        const targetId = object.key;
        model.name = targetId;
        model.userData.targetMeta = {
          id: targetId,
          teamId: snapshot.summary.factionId,
          factionId: snapshot.summary.factionId,
          kind: "structure",
        };
        this.eventCtrl.SendEventMessage(EventTypes.RegisterTarget, {
          id: targetId,
          object: model,
          teamId: snapshot.summary.factionId,
          factionId: snapshot.summary.factionId,
          kind: "structure",
          alive: true,
          targetable: true,
          collidable: true,
        });
        this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, model);
        this.registeredTargetIds.push(targetId);
        this.registeredInteractiveObjects.push(model);

        const prop = this.resolveBuildingProperty(object.nodeId);
        if (!this.coreTargetId || object.kind === ReadonlyCityObjectKind.CivicCore || object.nodeId === "cc") {
          this.coreTargetId = targetId;
        }
        if (prop) {
          this.combatants.push(new ReadonlyCityDefenseCombatant({
            id: targetId,
            property: prop,
            mesh: model,
            eventCtrl: this.eventCtrl,
            targetRegistry: this.targetRegistry,
            autoAttack: object.buildingType === BuildingType.DefenseTurret && prop.combat?.autoAttack !== false,
            onDestroyed: (id) => this.destroyedTargetIds.add(id),
          }));
        }
      }

      if (this.collisionEnabled && this.colliderRegistry) {
        model.updateWorldMatrix(true, true);
        this.colliderRegistry.registerObjectCollider({
          id: object.key,
          kind: StaticColliderKind.CityBuilding,
          object: model,
          box: new THREE.Box3().setFromObject(model),
          raycastOn: true,
        });
      }
    }
  }

  update(delta: number): void {
    for (const combatant of this.combatants) {
      combatant.setTargetRegistry(this.targetRegistry);
      combatant.update(delta);
    }
  }

  attach(scene: THREE.Scene): void {
    if (!this.root.parent) {
      scene.add(this.root);
    }
  }

  getCoreTargetId(): string | undefined {
    return this.coreTargetId;
  }

  isTargetDestroyed(targetId?: string): boolean {
    return !!targetId && this.destroyedTargetIds.has(targetId);
  }

  getAliveCombatantCount(): number {
    return this.combatants.filter((combatant) => combatant.Alive).length;
  }

  dispose(): void {
    this.clearRoot();
    this.eventCtrl?.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry);
    this.eventCtrl?.SendEventMessage(EventTypes.DeregisterLoop, this);
    this.root.parent?.remove(this.root);
  }

  private clearRoot(): void {
    for (const combatant of this.combatants) {
      combatant.dispose();
    }
    this.combatants.length = 0;
    for (const object of this.registeredInteractiveObjects) {
      this.eventCtrl?.SendEventMessage(EventTypes.DelInteractive, object);
    }
    this.registeredInteractiveObjects.length = 0;
    this.destroyedTargetIds.clear();
    this.coreTargetId = undefined;
    for (const targetId of this.registeredTargetIds) {
      this.eventCtrl?.SendEventMessage(EventTypes.DeregisterTarget, targetId);
    }
    this.registeredTargetIds.length = 0;
    this.colliderRegistry?.clear();
    this.root.clear();
    for (const material of this.customMaterials) {
      material.dispose();
    }
    this.customMaterials.clear();
  }

  private setTargetRegistry = (targetRegistry?: TargetRegistrySystem): void => {
    if (!targetRegistry) return;
    this.targetRegistry = targetRegistry;
    for (const combatant of this.combatants) {
      combatant.setTargetRegistry(targetRegistry);
    }
  };

  private resolveBuildingProperty(nodeId: string): BuildingProperty | undefined {
    return Object.values(buildingDefs).find((def) => def.id === nodeId);
  }

  private applyConstructionMaterial(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => {
          const nextMaterial = material.clone();
          nextMaterial.transparent = true;
          nextMaterial.opacity = 0.45;
          nextMaterial.depthWrite = false;
          this.customMaterials.add(nextMaterial);
          return nextMaterial;
        });
        return;
      }

      const nextMaterial = child.material.clone();
      nextMaterial.transparent = true;
      nextMaterial.opacity = 0.45;
      nextMaterial.depthWrite = false;
      child.material = nextMaterial;
      this.customMaterials.add(nextMaterial);
    });
  }
}

interface ReadonlyCityDefenseCombatantOptions {
  id: string;
  property: BuildingProperty;
  mesh: THREE.Object3D;
  eventCtrl: IEventController;
  targetRegistry?: TargetRegistrySystem;
  autoAttack: boolean;
  onDestroyed?: (id: string) => void;
}

class ReadonlyCityDefenseCombatant implements IActionUser {
  readonly baseSpec: BaseSpec;
  private readonly weaponController = new ProjectileWeaponController();
  private readonly hpRing: BuildingRingProgress;
  private target: TargetRecord | null = null;
  private destroyed = false;
  private listenersDisposed = false;

  get Alive(): boolean {
    return !this.destroyed;
  }

  constructor(private readonly options: ReadonlyCityDefenseCombatantOptions) {
    this.options.mesh.name = this.options.id;
    this.baseSpec = new BaseSpec({
      attackRanged: 0,
      attackRange: 1,
      defense: 0,
      ...(this.options.property.combat?.stats ?? {}),
      hp: this.options.property.hp,
    }, this);
    this.baseSpec.lastUsedWeaponMode = "ranged";
    this.weaponController.configure({
      eventEmitter: (msg) => this.options.eventCtrl.SendEventMessage(EventTypes.SpawnProjectile, msg),
      ownerSpec: this.baseSpec,
      ownerObject: this.options.mesh,
    });
    this.hpRing = new BuildingRingProgress(this.options.property.size.width, this.options.property.size.depth, {
      state: BuildingRingProgressState.Healthy,
      visible: false,
    });
    this.hpRing.attachToOwnerBase(this.options.mesh);
    this.updateHpRing();
    this.options.eventCtrl.RegisterEventListener(EventTypes.Attack + this.options.id, this.onAttacked);
    this.options.eventCtrl.RegisterEventListener(EventTypes.CombatEnter, this.onCombatEnter);
    this.options.eventCtrl.RegisterEventListener(EventTypes.CombatLeave, this.onCombatLeave);
  }

  get objs() {
    return this.options.mesh;
  }

  applyAction(action: IActionComponent, context?: ActionContext): void {
    action.apply?.(this, context);
    action.activate?.(this, context);
  }

  removeAction(action: IActionComponent, context?: ActionContext): void {
    action.deactivate?.(this, context);
    action.remove?.(this);
  }

  setTargetRegistry(targetRegistry?: TargetRegistrySystem): void {
    this.options.targetRegistry = targetRegistry;
  }

  update(delta: number): void {
    if (this.destroyed) return;
    this.weaponController.update(delta);
    if (!this.options.autoAttack) return;
    if (!this.isValidTarget(this.target)) {
      this.findTarget();
    }
    if (!this.target) return;

    const lookPos = this.target.object.position.clone();
    lookPos.y = this.options.mesh.position.y;
    this.options.mesh.lookAt(lookPos);
    this.weaponController.fireAtTarget(this.target.object, this.options.property.combat?.weapons?.[0], {
      defaultRange: this.baseSpec.AttackRange,
    });
  }

  dispose(): void {
    this.disposeListeners();
    this.hpRing.dispose();
    this.options.eventCtrl.SendEventMessage(EventTypes.DeregisterTarget, this.options.id);
  }

  private findTarget(): void {
    const registry = this.options.targetRegistry;
    if (!registry) {
      this.target = null;
      return;
    }

    this.target = registry.findNearestHostile(this.options.id, this.getAttackRange(), {
      aliveOnly: true,
      targetableOnly: true,
      collidableOnly: true,
      kinds: this.options.property.combat?.targetKinds ?? ["ship", "unit"],
    }) ?? null;
  }

  private onAttacked = (opts: AttackOption[] = []): void => {
    if (this.destroyed) return;

    for (const opt of opts) {
      const damage = Math.max(0, opt.damage ?? 0);
      if (damage <= 0) continue;
      const kind = this.resolveDamageKind(opt.type);
      this.baseSpec.ReceiveDamage({
        amount: this.applyDefense(damage, kind, opt.spec),
        kind,
        sourceSpec: opt.spec,
        sourceId: opt.obj?.name,
        targetId: this.options.id,
        hitPoint: opt.targetPoint,
        tags: ["building"],
      });
    }

    this.updateHpRing();
    if (this.baseSpec.Health <= 0) {
      this.destroyed = true;
      this.options.onDestroyed?.(this.options.id);
      this.disposeListeners();
      this.hpRing.dispose();
      this.options.eventCtrl.SendEventMessage(EventTypes.UpdateTargetState, {
        id: this.options.id,
        alive: false,
        targetable: false,
        collidable: false,
      });
      this.options.eventCtrl.SendEventMessage(EventTypes.DelInteractive, this.options.mesh);
      this.options.mesh.parent?.remove(this.options.mesh);
    }
  };

  private onCombatEnter = (): void => {
    if (this.destroyed) return;
    this.hpRing.show();
  };

  private onCombatLeave = (): void => {
    this.hpRing.hide();
  };

  private disposeListeners(): void {
    if (this.listenersDisposed) return;
    this.listenersDisposed = true;
    this.options.eventCtrl.DeregisterEventListener(EventTypes.Attack + this.options.id, this.onAttacked);
    this.options.eventCtrl.DeregisterEventListener(EventTypes.CombatEnter, this.onCombatEnter);
    this.options.eventCtrl.DeregisterEventListener(EventTypes.CombatLeave, this.onCombatLeave);
  }

  private updateHpRing(): void {
    const ratio = THREE.MathUtils.clamp(this.baseSpec.Health / Math.max(1, this.options.property.hp), 0, 1);
    this.hpRing.setRatio(ratio);
    this.hpRing.setState(this.resolveHpRingState(ratio));
  }

  private resolveHpRingState(ratio: number): BuildingRingProgressState {
    if (ratio <= 0.3) return BuildingRingProgressState.Critical;
    if (ratio <= 0.6) return BuildingRingProgressState.Warning;
    return BuildingRingProgressState.Healthy;
  }

  private getAttackRange(): number {
    return this.weaponController.getEffectiveRange(
      this.options.property.combat?.weapons?.[0],
      this.baseSpec.AttackRange,
    );
  }

  private isValidTarget(target: TargetRecord | null): target is TargetRecord {
    if (!target?.alive || !target.targetable || !target.collidable) return false;
    if (this.options.mesh.position.distanceToSquared(target.object.position) > this.getAttackRange() ** 2) return false;
    return this.options.targetRegistry?.isHostile(this.options.id, target.id) ?? false;
  }

  private resolveDamageKind(type: AttackType): DamageKind {
    if (type === AttackType.Magic0) return "magic";
    return "physical";
  }

  private applyDefense(amount: number, kind: DamageKind, sourceSpec?: BaseSpec): number {
    if (kind === "true") return amount;
    const defKey = kind === "magic" ? "magicDefense" : "defense";
    const defense = this.baseSpec.stats.getStat(defKey);
    const penetration = sourceSpec?.stats.getStat("penetration") ?? 0;
    const effectiveDefense = Math.max(0, defense - penetration);
    return amount * (100 / (100 + effectiveDefense));
  }
}
