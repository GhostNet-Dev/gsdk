import { IItem } from "@Glibs/interface/iinven"
import { Bind } from "@Glibs/types/assettypes"
import { Modifier } from "@Glibs/inventory/stat/modifier"
import { StatApplyMode, StatKey } from "@Glibs/inventory/stat/stattypes"
import { StatSystem } from "@Glibs/inventory/stat/statsystem"
import { IActionUser } from "@Glibs/types/actiontypes"
import { Buffdefs } from "@Glibs/magical/buff/buffdefs"
import { Buff } from "@Glibs/magical/buff/buff"
import { CharacterStatus } from "./charstatus"
import { StatFactory } from "./statfactory"
import { calculateCompositeDamage, DamageContext, DamageResult } from "./damagecalc"
import { DamageFormula } from "./damageformula"
import { DamagePacket, DamageResolution, IDamageInterceptor } from "./damagepacket"

export class BaseSpec {
    // 레거시 호환성을 위한 프로퍼티 (필요 없다면 제거 가능)
    attackDamageMax = 1
    attackDamageMin = 1
    defence = 2

    // 성장 계산을 위해 초기 태생 스탯을 기억합니다.
    private _initialStats: Partial<Record<StatKey, number>>;

    stats: StatSystem
    equipment: Record<string, IItem | null> = {};
    
    // 이 수치들은 이제 StatSystem에서 가져오는 것이 정확하므로 get 접근자를 권장하지만,
    // 기존 코드 호환성을 위해 필드로 남겨둘 경우 동기화 로직이 필요합니다.
    attack = 1
    strength = 1
    skillMultiplier = 1
    
    status: CharacterStatus
    lastUsedWeaponMode: 'melee' | 'ranged' = 'melee'
    private damageInterceptors: IDamageInterceptor[] = []

    // Getters
    get AttackSpeedMelee() {
        return this.stats.getStat("attackSpeedMelee");
    }

    get AttackSpeedRanged() {
        return this.stats.getStat("attackSpeedRanged");
    }

    get AttackSpeed() {
        return this.lastUsedWeaponMode === 'ranged' ? this.AttackSpeedRanged : this.AttackSpeedMelee;
    }

    get AttackRange() {
        const item = this.lastUsedWeaponMode === 'ranged' ? this.GetRangedItem() : this.GetMeleeItem();
        return (item?.Stats?.attackRange ?? this.stats.getStat("attackRange")) + 0.5;
    }
    get Speed() { return this.stats.getStat("speed") }
    
    get DamageMelee() { return this.stats.getStat("attackMelee") }
    get DamageRanged() { return this.stats.getStat("attackRanged") }
    get Damage() {
        return this.lastUsedWeaponMode === 'ranged' ? this.DamageRanged : this.DamageMelee;
    }
    
    // 레거시 Getter 호환성 유지
    get AttackDamageMax() { return this.Damage } 
    get AttackDamageMin() { return this.Damage * 0.9 } // 최소 데미지 예시 로직
    
    get Status() { return this.status }
    get Health() { return this.status.health }
    get Owner() { return this.owner }

    constructor( 
        stats: Partial<Record<StatKey, number>>,
        private owner: IActionUser,
    ) {
        // 1. 초기 스탯 백업 (성장 기준점)
        this._initialStats = { ...stats };
        
        // 2. 스탯 시스템 초기화
        this.stats = new StatSystem(stats);
        
        this.status = {
            level: 1,
            health: this.stats.getStat("hp"),
            mana: this.stats.getStat("mp"),
            stamina: this.stats.getStat("stamina"),
            maxExp: StatFactory.getRequiredExp ? StatFactory.getRequiredExp(1) : 100,
            exp: 0,
            immortal: false,
            actions: [],
            stats,
        }

        // 초기 상태 설정
        this.RecoverFullState();
    }

    // ==========================================
    // 🌱 레벨업 및 성장 로직
    // ==========================================

    NextLevelUp() {
        // 1. 레벨 증가
        this.status.level++;

        // 2. 스탯 성장 (Factory 사용)
        this.UpdateStatsByLevel();

        // 3. 경험치 통 갱신
        this.UpdateExpRequirement();

        // 4. 상태 회복 (레벨업 축하)
        this.RecoverFullState();
    }

    // 레벨에 맞춰 스탯을 재계산하고 StatSystem에 반영
    private UpdateStatsByLevel() {
        // Factory를 통해 현재 레벨에 맞는 기본 스탯 계산
        const scaledStats = StatFactory.getScaledStats(
            this._initialStats, 
            this.status.level, 
            'normal' // 몬스터 등급 등을 인자로 받을 수 있음
        );

        // StatSystem을 새로운 베이스 스탯으로 교체
        // 주의: 기존 StatSystem에 걸려있던 버프나 아이템 효과가 날아가지 않도록 주의해야 함.
        // 여기서는 가장 안전한 방법으로 StatSystem을 새로 만들고 장비 스탯을 다시 적용하는 방식을 예시로 듭니다.
        this.stats = new StatSystem(scaledStats);
        
        // 장비하고 있는 아이템의 스탯 다시 적용
        this.reapplyItemModifiers();

        // 레거시 필드 동기화 (호환성 유지용)
        this.attackDamageMax = this.stats.getStat("attackMelee");
        this.defence = this.stats.getStat("defense");
    }

    // 경험치 요구량 갱신 및 초과 경험치 이월 처리
    private UpdateExpRequirement() {
        // 1. 초과분 계산: (현재 보유 경험치) - (방금 달성한 레벨의 경험치 요구량)
        // 주의: 이 시점에서 this.status.maxExp는 아직 갱신 전이므로 '이전 레벨의 목표치'입니다.
        const overflowExp = this.status.exp - this.status.maxExp;

        // 2. 새로운 레벨에 맞는 경험치 요구량(MaxExp) 설정
        // (StatFactory가 없다면 기존 공식 사용)
        this.status.maxExp = StatFactory.getRequiredExp(this.status.level);
        
        // 3. 초과된 경험치를 현재 경험치로 적용 (음수 방지 안전장치 포함)
        this.status.exp = Math.max(0, overflowExp);
    }

    // HP/MP/Stamina 풀 회복
    private RecoverFullState() {
        this.status.health = this.stats.getStat("hp");
        this.status.mana = this.stats.getStat("mp");
        this.status.stamina = this.stats.getStat("stamina");
    }

    // 경험치 획득
    ReceiveExp(exp: number) {
        this.status.exp += exp;
        // while 루프를 사용하여 경험치가 충족되는 한 계속 레벨업 (다중 레벨업 지원)
        // 예: 1레벨(0/100)에서 500EXP 획득 -> 1->2(100소모), 2->3(200소모), 3레벨(잔여 200)
        let lvUp = false
        while (this.status.exp >= this.status.maxExp) {
            this.NextLevelUp();
            lvUp = true
        }
        return lvUp
    }

    // 상태 초기화
    ResetStatus() {
        this.status.level = 1;
        this.UpdateStatsByLevel(); // 1레벨 스탯으로 복귀
        this.UpdateExpRequirement();
        this.RecoverFullState();
        this.status.immortal = false;
    }


    // ==========================================
    // ⚔️ 전투 로직 (DamageCalc 통합)
    // ==========================================

    // 내가 상대방을 공격할 때 호출
    AttackTarget(target: BaseSpec): DamageResult {
        const context: DamageContext = {
            attacker: this,
            defender: target,
            type: 'physical', // 기본 평타는 물리로 가정
            skillMultiplier: this.skillMultiplier
        };

        const result = calculateCompositeDamage(context);
        target.ReceiveCombatDamage(result);
        return result;
    }

    // 내가 공격 당했을 때 호출 (구 ReceiveCalcDamage 대체)
    ReceiveCombatDamage(result: DamageResult) {
        if (!result.isHit) {
            // 회피 이펙트 처리 등을 위한 콜백이 있다면 여기서 호출
            return;
        }

        this.ReceiveDamage({
            amount: result.finalDamage,
            isCritical: result.isCritical,
            tags: result.isBlocked ? ["blocked"] : undefined,
        });
    }

    // 기존 방식의 데미지 처리 (레거시 코드 호환용, 필요 없으면 삭제 추천)
    ReceiveCalcDamage(damage: number): DamageResolution {
        return this.ReceiveDamage({ amount: damage });
    }

    ReceiveDamage(packet: DamagePacket): DamageResolution {
        let remainingPacket: DamagePacket = {
            ...packet,
            amount: Math.max(0, packet.amount),
        }
        let absorbedAmount = 0
        let shieldBroken = false

        for (const interceptor of this.damageInterceptors) {
            if (remainingPacket.amount <= 0) break
            if (!interceptor.isActive()) continue

            const interceptResult = interceptor.absorb(remainingPacket)
            absorbedAmount += Math.max(0, interceptResult.absorbedAmount)
            remainingPacket = {
                ...interceptResult.remainingPacket,
                amount: Math.max(0, interceptResult.remainingPacket.amount),
            }
            shieldBroken ||= !!interceptResult.shieldBroken
        }

        const incomingAmount = Math.max(0, packet.amount)
        const appliedAmount = Math.max(0, remainingPacket.amount)
        this.status.health = Math.max(0, this.status.health - appliedAmount)
        this.status.hit = appliedAmount > 0

        return {
            incomingAmount,
            absorbedAmount,
            appliedAmount,
            remainingAmount: 0,
            blocked: appliedAmount <= 0,
            targetDied: this.CheckDie(),
            shieldBroken,
        }
    }

    ReceiveCalcHeal(heal: number) {
        const maxHp = this.stats.getStat("hp");
        if(this.status.health + heal >= maxHp) {
            this.status.health = maxHp;
        } else {
            this.status.health += heal;
        }
    }

    ReceiveCalcMana(mana: number) {
        const maxMp = this.stats.getStat("mp");
        if (this.status.mana + mana >= maxMp) {
            this.status.mana = maxMp;
        } else {
            this.status.mana += mana;
        }
    }

    ReceiveCalcStamina(stamina: number) {
        const maxStamina = this.stats.getStat("stamina");
        if (this.status.stamina + stamina >= maxStamina) {
            this.status.stamina = maxStamina;
        } else {
            this.status.stamina += stamina;
        }
    }

    AddDamageInterceptor(interceptor: IDamageInterceptor) {
        if (this.damageInterceptors.includes(interceptor)) return
        this.damageInterceptors.push(interceptor)
    }

    RemoveDamageInterceptor(interceptor: IDamageInterceptor) {
        this.damageInterceptors = this.damageInterceptors.filter((entry) => entry !== interceptor)
    }

    TryConsumeHealth(amount: number) {
        if (amount <= 0) return true;
        if (this.status.health < amount) return false;
        this.status.health -= amount;
        this.status.health = Math.max(0, this.status.health);
        return true;
    }

    TryConsumeMana(amount: number) {
        if (amount <= 0) return true;
        if (this.status.mana < amount) return false;
        this.status.mana -= amount;
        this.status.mana = Math.max(0, this.status.mana);
        return true;
    }

    TryConsumeStamina(amount: number) {
        if (amount <= 0) return true;
        if (this.status.stamina < amount) return false;
        this.status.stamina -= amount;
        this.status.stamina = Math.max(0, this.status.stamina);
        return true;
    }

    CheckDie(): boolean {
        return (this.status.immortal === false && this.status.health <= 0);
    }


    // ==========================================
    // 🎒 아이템 및 버프 관리
    // ==========================================

    GetBindItem(slot: Bind) {
        return this.equipment[slot];
    }

    GetRangedItem() {
        return this.equipment[Bind.Weapon_Ranged] ?? null;
    }

    GetMeleeItem() {
        return this.equipment[Bind.Hands_R] ?? this.equipment[Bind.Hands_L] ?? null;
    }

    Buff(buff: Buff, level: number) {
        if ("actions" in buff && buff.actions && Array.isArray(buff.actions)) {
            for (const action of buff.actions) {
                this.owner?.applyAction(action, { level: level });
            }
        }
    }

    RemoveBuff(buff: Buff) {
        if ("actions" in buff && buff.actions && Array.isArray(buff.actions)) {
            for (const action of buff.actions) {
                this.owner?.removeAction(action);
            }
        }
    }

    Equip(item: IItem) {
        const targetSlot = item.Bind;
        if (targetSlot == undefined) throw new Error("item bind is undefined");

        const prevItem = this.equipment[targetSlot];
        if (prevItem) {
            this.Unequip(targetSlot); // 기존 아이템 해제 시 modifiers도 제거됨
        }

        // ActionComponent 실행
        if (item.Actions) {
            for (const action of item.Actions) {
                this.owner?.applyAction(action, { via: "item", source: item });
            }
        }

        this.equipment[targetSlot] = item;
        this.addItemModifiers(item);
    }

    Unequip(slot: Bind) {
        let targetSlot = slot;
        const item = this.equipment[targetSlot];
        if (item) {
            this.removeItemModifiers(item);
            this.equipment[targetSlot] = null;
            this.owner?.removeAction?.({ deactivate: (user: any) => (user.objs as any)?.getObjectByName?.(this.owner?.objs?.name)?.remove?.(item.Mesh) } as any);
        }
    }

    isEquipped(itemId: string): boolean {
        return Object.values(this.equipment).some(item => item?.Id === itemId);
    }

    getEquippedItems(): IItem[] {
        return Object.values(this.equipment).filter((item): item is IItem => !!item);
    }

    // StatSystem 재설정 시 아이템 스탯을 다시 적용하기 위한 헬퍼
    private reapplyItemModifiers() {
        this.getEquippedItems().forEach(item => {
            this.addItemModifiers(item);
        });
    }

    private addItemModifiers(item: IItem) {
        if (item.Stats) {
            Object.entries(item.Stats).forEach(([k, v]) => {
                let key = k as StatKey;
                
                // [개선] 일반 attackSpeed 키를 무기 타입에 맞게 매핑
                if (k === 'attackSpeed') {
                    if (item.ItemType === 'meleeattack') key = 'attackSpeedMelee';
                    else if (item.ItemType === 'rangeattack') key = 'attackSpeedRanged';
                } else if (k === 'attack') {
                    if (item.ItemType === 'meleeattack') key = 'attackMelee';
                    else if (item.ItemType === 'rangeattack') key = 'attackRanged';
                }

                const apply = StatApplyMode[key] || 'add';
                this.stats.addModifier(new Modifier(key, v!, apply, `item:${item.Id}`));
            });
        }
        if (item.Enchantments) {
            Object.entries(item.Enchantments).forEach(([k, v]) => {
                const key = k as StatKey;
                const apply = StatApplyMode[key] || 'add';
                this.stats.addModifier(new Modifier(key, v!, apply, `enchant:${item.Id}`));
            });
        }
    }

    private removeItemModifiers(item: IItem) {
        this.stats.removeModifierBySource(`item:${item.Id}`);
        this.stats.removeModifierBySource(`enchant:${item.Id}`);
    }
    // [New] UI에 표시할 내 물리 공격력
    get PhysicalAttackPower(): number {
        return DamageFormula.getPhysicalAttack(this);
    }

    // [New] UI에 표시할 내 마법 공격력
    get MagicAttackPower(): number {
        return DamageFormula.getMagicAttack(this);
    }
    
    // [New] 장비 비교를 위한 DPS
    get DPS(): number {
        const dps = DamageFormula.getDPS(this);
        // 캐릭터 직업/주속성에 따라 리턴값 결정 (여기선 합산 예시)
        return Math.max(dps.physical, dps.magic); 
    }

}
