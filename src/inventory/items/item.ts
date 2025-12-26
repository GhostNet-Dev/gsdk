import { IItem } from "@Glibs/interface/iinven"
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"
import { ActionRegistry } from "@Glibs/actions/actionregistry"
import type { ItemProperty } from "./itemdefs"
import { IAsset } from "@Glibs/interface/iasset"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { ItemIconProperty } from "../../ux/icons/itemicons"
import { ItemType } from "@Glibs/types/inventypes"


export class ItemAbstract implements IItem {
  meshs?: THREE.Group

  get UniqId() { return this.uniqId }
  get Id() { return this.property.id }
  get ItemType() { return this.property.type }
  get ItemTypeTrans() {
    switch (this.property.type as ItemType) {
      case "shield":
      case "armor":
        return "방어구"
      case "meleeattack":
      case "rangeattack":
        return "무기"
      case "material":
        return "소모"
      case "potion":
        return "물약"
    }
    return this.property.type
  }
  get IconPath() { return this.property.icon.path }
  get Bindable() { return this.property.binding }
  get Bind() { return ("bind" in this.property) ? this.property.bind : undefined }
  get Mesh() { return this.meshs }
  get Name() { return this.property.name }
  get Actions() { return ("actions" in this.property) ? this.property.actions as readonly IActionComponent[] | undefined : undefined }
  get AttackType() { return ("weapon" in this.property) ? this.property.weapon : undefined }
  get AutoAttack() { return ("autoAttack" in this.property) ? this.property.autoAttack ?? false : false }
  get Stackable() { return this.property.stackable }
  get Sound() { return ("sound" in this.property) ? this.property.sound : undefined }
  get Stats() { return ("stats" in this.property) ? this.property.stats : undefined }
  get Enchantments() { return ("enchantments" in this.property) ? this.property.enchantments : undefined }
  get Description() { return this.property.description }
  // get Effects() { return this.property.effects }

  constructor(protected uniqId: string, public property: ItemProperty) { }
}

export class Item extends ItemAbstract implements IActionUser {
  id: string
  name: string
  icon: ItemIconProperty
  type: string
  stats?: any
  actions: IActionComponent[] = []
  baseSpec: BaseSpec
  get objs() { return this.meshs }

  constructor(
    uniqId: string,
    public def: ItemProperty,
    private asset?: IAsset,
  ) {
    super(uniqId, def)
    this.id = def.id
    this.name = def.name
    this.icon = def.icon
    this.type = def.type
    this.stats = ("stats" in def) ? def.stats : undefined
    this.baseSpec = new BaseSpec(this.stats, this)

    if ("actions" in def) {
      this.actions = def.actions.map((a: any) => ActionRegistry.create(a))
    }
  }
  applyAction(action: IActionComponent, ctx?: ActionContext) {
    action.apply?.(this, ctx)
    action.activate?.(this, ctx)
  }
  removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
    action.deactivate?.(this, context)
    action.remove?.(this)
  }
  activate(context?: ActionContext) {
    for (const action of this.actions) {
      action.activate?.(this, context)
    }
  }
  deactivate(context?: ActionContext) {
    for (const action of this.actions) {
      action.deactivate?.(this, context)
    }
  }
  trigger(triggerType: TriggerType, context?: ActionContext) {
    for (const action of this.actions) {
      action.trigger?.(this, triggerType, context)
    }
  }

  onEquip(player: IActionUser) {
    for (const action of this.actions) {
      action.apply?.(player)
    }
  }

  onUnequip(player: IActionUser) {
    for (const action of this.actions) {
      action.remove?.(player)
    }
  }

  use(target: IActionUser) {
    for (const action of this.actions) {
      if (action.isAvailable?.()) {
        action.activate?.(target)
      }
    }
  }

  async Loader() {
    const asset = this.asset
    if (asset == undefined) return
    //const [meshs, _exist] = await asset.UniqModel(this.property.name)
    const meshs = await asset.CloneModel()
    this.meshs = meshs
  }
}
