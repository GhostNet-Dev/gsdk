import * as THREE from 'three';
import { IBuildingObject, BuildingType, BuildingMode } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData, ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { BaseSpec } from '@Glibs/actors/battle/basespec';
import { AttackOption, AttackType } from '@Glibs/types/playertypes';
import { DamageKind } from '@Glibs/actors/battle/damagepacket';
import { ActionContext, IActionComponent, IActionUser } from '@Glibs/types/actiontypes';
import { BuildingRingProgress, BuildingRingProgressState } from '../buildingringprogress';
import { WeaponMode } from '@Glibs/actors/projectile/projectiletypes';

/**
 * 모든 건물의 공통 로직을 처리하는 추상 클래스
 */
export abstract class BaseBuilding implements IBuildingObject, IActionUser {
    public level: number = 1;
    public readonly baseSpec: BaseSpec;
    protected isUpgrading: boolean = false;
    protected upgradeTimer: number = 0;
    protected upgradeTime: number = 0;
    protected currentHp: number;
    protected currentMode: BuildingMode = BuildingMode.Timer;
    protected isDestroyed: boolean = false;
    private readonly hpRing: BuildingRingProgress;

    // 자원 생산 관련 내부 상태 (상속 클래스와의 이름 충돌 방지를 위해 명확히 정의)
    protected resourceProductionTimer: number = 0;
    protected resourceProductionTurnCount: number = 0;

    constructor(
        public readonly id: string,
        public readonly type: BuildingType,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        if (this.mesh) this.mesh.position.copy(position);
        this.mesh.name = this.id;
        this.baseSpec = new BaseSpec({
            attackRanged: 0,
            attackRange: 1,
            defense: 0,
            ...(this.property.combat?.stats ?? {}),
            hp: this.property.hp,
        }, this);
        this.baseSpec.lastUsedWeaponMode = WeaponMode.Ranged;
        this.currentHp = this.baseSpec.Health;
        this.hpRing = new BuildingRingProgress(this.property.size.width, this.property.size.depth, {
            state: BuildingRingProgressState.Healthy,
            visible: false,
        });
        this.hpRing.attachToOwnerBase(this.mesh);
        this.updateHpRing();
        this.eventCtrl.RegisterEventListener(EventTypes.Attack + this.id, this.onAttacked);
        this.eventCtrl.RegisterEventListener(EventTypes.CombatEnter, this.onCombatEnter);
        this.eventCtrl.RegisterEventListener(EventTypes.CombatLeave, this.onCombatLeave);
    }

    get objs() {
        return this.mesh;
    }

    applyAction(action: IActionComponent, context?: ActionContext): void {
        action.apply?.(this, context);
        action.activate?.(this, context);
    }

    removeAction(action: IActionComponent, context?: ActionContext): void {
        action.deactivate?.(this, context);
        action.remove?.(this);
    }

    /**
     * 건물의 동작 모드 설정 (타이머 vs 턴제)
     */
    setMode(mode: BuildingMode): void {
        this.currentMode = mode;
        // 모드 변경 시 카운터 초기화
        this.resourceProductionTimer = 0;
        this.resourceProductionTurnCount = 0;
    }

    /**
     * 공통 업데이트 로직 (업그레이드 및 자동 생산)
     */
    update(delta: number): void {
        if (this.isDestroyed) return;

        if (this.isUpgrading && this.currentMode === BuildingMode.Timer) {
            this.upgradeTimer += delta;
            if (this.upgradeTimer >= this.upgradeTime) {
                this.completeUpgrade();
            }
        }

        // 자동 자원 생산 처리 (시간제)
        this.handleAutoResourceProduction(delta);

        this.onUpdate(delta);
    }

    /**
     * 턴 진행 로직 (업그레이드 및 자동 생산)
     */
    advanceTurn(): void {
        if (this.isDestroyed) return;

        if (this.isUpgrading && this.currentMode === BuildingMode.Turn) {
            this.upgradeTimer += 1; 
            if (this.upgradeTimer >= this.upgradeTime) {
                this.completeUpgrade();
            }
        }

        // 자동 자원 생산 처리 (턴제)
        this.handleTurnResourceProduction();

        this.onAdvanceTurn();
    }

    /**
     * [시간제] 자동 자원 생산 로직
     */
    private handleAutoResourceProduction(delta: number) {
        if (this.isUpgrading || this.currentMode !== BuildingMode.Timer || !this.property.production) return;

        this.resourceProductionTimer += delta;
        if (this.resourceProductionTimer >= this.property.production.interval) {
            this.produceResources();
            this.resourceProductionTimer = 0;
        }
    }

    /**
     * [턴제] 자동 자원 생산 로직
     */
    private handleTurnResourceProduction() {
        if (this.isUpgrading || this.currentMode !== BuildingMode.Turn || !this.property.production) return;

        this.resourceProductionTurnCount += 1;
        if (this.resourceProductionTurnCount >= this.property.production.turns) {
            this.produceResources();
            this.resourceProductionTurnCount = 0;
        }
    }

    /**
     * 실제 자원 지급 처리
     */
    protected produceResources() {
        const prod = this.property.production;
        if (!prod) return;

        for (const [type, amount] of Object.entries(prod.resources)) {
            // 레벨에 따른 가중치 적용 (레벨당 기본 생산량만큼 추가)
            const totalAmount = (amount as number) * this.level;
            this.eventCtrl.SendEventMessage(type, totalAmount);
        }
    }

    /**
     * 자식 클래스에서 구현할 개별 업데이트 로직
     */
    protected onUpdate(delta: number): void { }

    /**
     * 자식 클래스에서 구현할 개별 턴 로직
     */
    protected onAdvanceTurn(): void { }

    /**
     * 업그레이드 시작 (비용은 테크트리 서비스와 연계 필요)
     */
    protected startUpgrade() {
        if (this.isUpgrading) return;
        
        // 레벨업 시간 계산: 기본 건설 시간 * 현재 레벨
        this.upgradeTime = this.property.buildTime * this.level;
        this.upgradeTimer = 0;
        this.isUpgrading = true;
        
        console.log(`[${this.property.name}] Upgrade started. Time: ${this.upgradeTime}s`);
        
        // 전역 테크트리 업그레이드 요청 (비용 차감)
        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, this.property.id);
    }

    protected completeUpgrade() {
        this.level++;
        this.isUpgrading = false;
        console.log(`[${this.property.name}] Upgrade complete! New Level: ${this.level}`);
        
        // HP 회복 또는 능력치 상승 로직 추가 가능
        this.baseSpec.status.health = this.property.hp;
        this.currentHp = this.baseSpec.Health; 
        this.updateHpRing();

        // 전역 테크트리 레벨업 완료 알림 (데이터 동기화 및 효과 적용)
        this.eventCtrl.SendEventMessage(EventTypes.UpgradeComplete, this.property.id);
    }

    destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.eventCtrl.DeregisterEventListener(EventTypes.Attack + this.id, this.onAttacked);
        this.eventCtrl.DeregisterEventListener(EventTypes.CombatEnter, this.onCombatEnter);
        this.eventCtrl.DeregisterEventListener(EventTypes.CombatLeave, this.onCombatLeave);
        this.hpRing.dispose();
        this.eventCtrl.SendEventMessage(EventTypes.UpdateTargetState, {
            id: this.id,
            alive: false,
            targetable: false,
            collidable: false,
        });
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterPhysic, this.mesh);
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    private onAttacked = (opts: AttackOption[] = []) => {
        if (this.isDestroyed) return;

        for (const opt of opts) {
            const damage = Math.max(0, opt.damage ?? 0);
            if (damage <= 0) continue;
            const kind = this.resolveDamageKind(opt.type);

            this.baseSpec.ReceiveDamage({
                amount: this.applyDefense(damage, kind, opt.spec),
                kind,
                sourceSpec: opt.spec,
                sourceId: opt.obj?.name,
                targetId: this.id,
                hitPoint: opt.targetPoint,
                tags: ["building"],
            });
        }

        this.currentHp = this.baseSpec.Health;
        this.updateHpRing();
        if (this.currentHp <= 0) {
            this.destroy();
        }
    };

    private onCombatEnter = () => {
        if (this.isDestroyed) return;
        this.hpRing.show();
    };

    private onCombatLeave = () => {
        this.hpRing.hide();
    };

    private updateHpRing(): void {
        const ratio = THREE.MathUtils.clamp(this.currentHp / Math.max(1, this.property.hp), 0, 1);
        this.hpRing.setRatio(ratio);
        this.hpRing.setState(this.resolveHpRingState(ratio));
    }

    private resolveHpRingState(ratio: number): BuildingRingProgressState {
        if (ratio <= 0.3) return BuildingRingProgressState.Critical;
        if (ratio <= 0.6) return BuildingRingProgressState.Warning;
        return BuildingRingProgressState.Healthy;
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

    /**
     * 하단 UI 데이터 구성 (공통 + 자식 특수 명령)
     */
    getSelectionData(): ISelectionData {
        const commonCommands: ICommand[] = [
            {
                id: "common_upgrade",
                name: "업그레이드",
                icon: "🔼",
                shortcut: "U",
                onClick: () => this.startUpgrade(),
                isDisabled: () => this.isUpgrading || this.level >= 10 // 최대 레벨 제한 예시
            }
        ];

        const specificCommands = this.getSpecificCommands();
        
        return {
            title: this.property.name,
            description: this.property.desc,
            level: this.level,
            hp: { current: this.currentHp, max: this.property.hp },
            status: this.isUpgrading ? "업그레이드 중..." : this.getStatusText(),
            progress: this.isUpgrading ? (this.upgradeTimer / this.upgradeTime) : this.getSpecificProgress(),
            commands: [...specificCommands, ...commonCommands] // 특수 명령 먼저, 업그레이드는 뒤에
        };
    }

    /**
     * 자식 클래스에서 구현할 개별 커맨드 목록
     */
    protected abstract getSpecificCommands(): ICommand[];

    /**
     * 자식 클래스에서 구현할 상태 텍스트
     */
    protected abstract getStatusText(): string;

    /**
     * 자식 클래스에서 구현할 진행률 (생산 중 등)
     */
    protected getSpecificProgress(): number | undefined {
        return undefined;
    }
}
