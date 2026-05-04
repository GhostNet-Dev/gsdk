import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Allies } from "@Glibs/actors/allies/allies";
import { Monsters } from "@Glibs/actors/monsters/monsters";
import { LoopType } from "@Glibs/systems/event/canvas";
import { CombatDebugInfo, CombatDebugTeam } from "@Glibs/systems/debugger/combatdebugtypes";
import { EventTypes } from "@Glibs/types/globaltypes";

type CombatDebugVisualBundle = {
    team: CombatDebugTeam
    box: THREE.Box3
    damageBox: THREE.Mesh
    previousDamageBoxVisible: boolean
    previousDamageBoxColors: (THREE.Color | undefined)[]
    moveArrow: THREE.ArrowHelper
    attackRange: THREE.Line
    targetLine: THREE.Line
}

const AllyColor = 0x00ff00;
const MonsterColor = 0xff0000;
const AttackRangeSegments = 64;
const MoveArrowLength = 2.5;
const GroundYOffset = 0.05;

export class CombatDebugSystem implements ILoop {
    LoopId = 0;

    private isDebugMode = false;
    private disposed = false;
    private readonly visuals = new Map<string, CombatDebugVisualBundle>();
    private readonly visibleActorIds = new Set<string>();
    private readonly tempDir = new THREE.Vector3();
    private readonly tempTargetPoint = new THREE.Vector3();
    private readonly tempRangeCenter = new THREE.Vector3();

    private readonly onToggleCombatDebug = () => {
        this.isDebugMode = !this.isDebugMode;
        if (!this.isDebugMode) this.clearVisuals();
    };

    constructor(
        private readonly scene: THREE.Scene,
        private readonly eventCtrl: IEventController,
        private readonly monsters: Monsters,
        private readonly allies: Allies,
    ) {
        this.eventCtrl.RegisterEventListener(EventTypes.ToggleCombatDebug, this.onToggleCombatDebug);
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this, LoopType.Systems);
    }

    update(_delta: number): void {
        if (!this.isDebugMode || this.disposed) return;

        this.visibleActorIds.clear();

        for (const sets of this.monsters.monsters.values()) {
            for (const set of sets) {
                if (!set.live) continue;
                const info = set.monCtrl.GetDebugInfo();
                this.visibleActorIds.add(info.targetId);
                this.updateActorVisual(info);
            }
        }

        for (const sets of this.allies.allies.values()) {
            for (const set of sets) {
                if (!set.live) continue;
                const info = set.allyCtrl.GetDebugInfo();
                this.visibleActorIds.add(info.targetId);
                this.updateActorVisual(info);
            }
        }

        this.removeMissingActorVisuals();
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.eventCtrl.DeregisterEventListener(EventTypes.ToggleCombatDebug, this.onToggleCombatDebug);
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
        this.clearVisuals();
    }

    private updateActorVisual(info: CombatDebugInfo): void {
        const bundle = this.getOrCreateBundle(info);

        this.updateDamageBox(bundle, info);

        this.updateMoveArrow(bundle.moveArrow, info);
        this.updateAttackRange(bundle, info);
        this.updateTargetLine(bundle.targetLine, info);
    }

    private getOrCreateBundle(info: CombatDebugInfo): CombatDebugVisualBundle {
        const existing = this.visuals.get(info.targetId);
        if (existing) return existing;

        const color = this.getColor(info.team);
        const box = new THREE.Box3();
        const moveArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), info.centerPos, MoveArrowLength, color);
        const attackRange = new THREE.Line(
            this.createAttackRangeGeometry(),
            new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.95,
                depthTest: false,
                depthWrite: false,
            }),
        );
        attackRange.renderOrder = 1000;
        const targetLineMaterial = new THREE.LineDashedMaterial({
            color,
            dashSize: 0.45,
            gapSize: 0.3,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        const targetLine = new THREE.Line(this.createTargetLineGeometry(), targetLineMaterial);

        const bundle: CombatDebugVisualBundle = {
            team: info.team,
            box,
            damageBox: info.damageBox,
            previousDamageBoxVisible: info.damageBox.visible,
            previousDamageBoxColors: this.getMaterialColors(info.damageBox.material),
            moveArrow,
            attackRange,
            targetLine,
        };

        this.scene.add(moveArrow, attackRange, targetLine);
        this.visuals.set(info.targetId, bundle);
        return bundle;
    }

    private updateDamageBox(bundle: CombatDebugVisualBundle, info: CombatDebugInfo): void {
        if (bundle.damageBox !== info.damageBox) {
            this.restoreDamageBox(bundle);
            bundle.damageBox = info.damageBox;
            bundle.previousDamageBoxVisible = info.damageBox.visible;
            bundle.previousDamageBoxColors = this.getMaterialColors(info.damageBox.material);
        }

        bundle.damageBox.visible = true;
        this.setMaterialColor(bundle.damageBox.material, this.getColor(info.team));
        bundle.damageBox.updateWorldMatrix(true, false);
        bundle.box.setFromObject(bundle.damageBox);
        info.box.copy(bundle.box);
    }

    private updateMoveArrow(arrow: THREE.ArrowHelper, info: CombatDebugInfo): void {
        this.tempDir.copy(info.moveDirection);
        this.tempDir.y = 0;

        if (this.tempDir.lengthSq() < 0.0001) {
            arrow.visible = false;
            return;
        }

        arrow.visible = true;
        arrow.position.copy(info.centerPos);
        arrow.setDirection(this.tempDir.normalize());
        arrow.setLength(MoveArrowLength, 0.55, 0.28);
    }

    private updateAttackRange(bundle: CombatDebugVisualBundle, info: CombatDebugInfo): void {
        const line = bundle.attackRange;
        const radius = Math.max(0, info.attackRange);
        line.visible = radius > 0 && !bundle.box.isEmpty();
        if (!line.visible) return;

        const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const center = bundle.box.getCenter(this.tempRangeCenter);
        const y = bundle.box.min.y + GroundYOffset;

        for (let i = 0; i <= AttackRangeSegments; i++) {
            const angle = (i / AttackRangeSegments) * Math.PI * 2;
            position.setXYZ(
                i,
                center.x + Math.cos(angle) * radius,
                y,
                center.z + Math.sin(angle) * radius,
            );
        }

        position.needsUpdate = true;
        line.geometry.computeBoundingSphere();
    }

    private updateTargetLine(line: THREE.Line, info: CombatDebugInfo): void {
        const targetPoint = this.resolveTargetPoint(info);
        line.visible = targetPoint != undefined;
        if (!targetPoint) return;

        const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        position.setXYZ(0, info.centerPos.x, info.centerPos.y, info.centerPos.z);
        position.setXYZ(1, targetPoint.x, targetPoint.y, targetPoint.z);
        position.needsUpdate = true;
        line.geometry.computeBoundingSphere();
        line.computeLineDistances();
    }

    private resolveTargetPoint(info: CombatDebugInfo): THREE.Vector3 | undefined {
        if (info.currentTargetBounds && !info.currentTargetBounds.isEmpty()) {
            return info.currentTargetBounds.clampPoint(info.centerPos, this.tempTargetPoint);
        }
        if (info.currentTargetCenter) {
            return this.tempTargetPoint.copy(info.currentTargetCenter);
        }
        return undefined;
    }

    private removeMissingActorVisuals(): void {
        for (const [targetId, bundle] of this.visuals) {
            if (this.visibleActorIds.has(targetId)) continue;
            this.disposeBundle(bundle);
            this.visuals.delete(targetId);
        }
    }

    private clearVisuals(): void {
        for (const bundle of this.visuals.values()) {
            this.disposeBundle(bundle);
        }
        this.visuals.clear();
    }

    private disposeBundle(bundle: CombatDebugVisualBundle): void {
        this.restoreDamageBox(bundle);

        bundle.moveArrow.dispose();
        bundle.moveArrow.removeFromParent();

        bundle.attackRange.geometry.dispose();
        this.disposeMaterial(bundle.attackRange.material);
        bundle.attackRange.removeFromParent();

        bundle.targetLine.geometry.dispose();
        this.disposeMaterial(bundle.targetLine.material);
        bundle.targetLine.removeFromParent();
    }

    private disposeMaterial(material: THREE.Material | THREE.Material[]): void {
        if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
            return;
        }
        material.dispose();
    }

    private restoreDamageBox(bundle: CombatDebugVisualBundle): void {
        bundle.damageBox.visible = bundle.previousDamageBoxVisible;
        this.restoreMaterialColors(bundle.damageBox.material, bundle.previousDamageBoxColors);
    }

    private getMaterialColors(material: THREE.Material | THREE.Material[]): (THREE.Color | undefined)[] {
        return this.toMaterialArray(material).map((item) => {
            return this.hasColor(item) ? item.color.clone() : undefined;
        });
    }

    private setMaterialColor(material: THREE.Material | THREE.Material[], color: number): void {
        for (const item of this.toMaterialArray(material)) {
            if (!this.hasColor(item)) continue;
            item.color.set(color);
        }
    }

    private restoreMaterialColors(material: THREE.Material | THREE.Material[], colors: (THREE.Color | undefined)[]): void {
        this.toMaterialArray(material).forEach((item, index) => {
            const color = colors[index];
            if (!color || !this.hasColor(item)) return;
            item.color.copy(color);
        });
    }

    private toMaterialArray(material: THREE.Material | THREE.Material[]): THREE.Material[] {
        return Array.isArray(material) ? material : [material];
    }

    private hasColor(material: THREE.Material): material is THREE.Material & { color: THREE.Color } {
        return "color" in material && material.color instanceof THREE.Color;
    }

    private createAttackRangeGeometry(): THREE.BufferGeometry {
        const positions = new Float32Array((AttackRangeSegments + 1) * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geometry;
    }

    private createTargetLineGeometry(): THREE.BufferGeometry {
        const positions = new Float32Array(2 * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geometry;
    }

    private getColor(team: CombatDebugTeam): number {
        return team === CombatDebugTeam.Ally ? AllyColor : MonsterColor;
    }
}
