import { IItem } from "@Glibs/interface/iinven"
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"
import { ActionRegistry } from "@Glibs/actions/actionregistry"
import type { ItemProperty } from "./itemdefs"
import { IAsset } from "@Glibs/interface/iasset"
import { BaseSpec } from "@Glibs/actors/battle/basespec"


export class ItemAbstract implements IItem {
  meshs?: THREE.Group

  get Id() { return this.property.id }
  get ItemType() { return this.property.type }
  get IconPath() { return this.property.icon }
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
  // get Effects() { return this.property.effects }

  constructor(public property: ItemProperty) { }
}

export class Item extends ItemAbstract implements IActionUser{
  id: string
  name: string
  icon: string
  type: string
  stats?: any
  actions: IActionComponent[] = []
  baseSpec: BaseSpec
  get objs() { return this.meshs }

  constructor(
    public def: ItemProperty,
    private asset?: IAsset,
  ) {
    super(def)
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
