import IEventController from "@Glibs/interface/ievent";
import { EventTypes, UnitProducedPayload } from "@Glibs/types/globaltypes";
import { AllyId, AllySpawnSpec } from "@Glibs/actors/allies/allytypes";

export interface SquadMember {
    allyId: AllyId;
    deckLevel: number;
}

export interface Squad {
    id: string;
    name: string;
    maxSize: number;
    members: SquadMember[];
}

type Subscriber = () => void;

export class SquadManager {
    private reserveUnits = new Map<AllyId, number>();
    private squads: Squad[] = [
        { id: "squad-1", name: "1분대", maxSize: 6, members: [] },
    ];
    private selectedSquadId: string | null = "squad-1";
    private subscribers: Subscriber[] = [];

    constructor(private readonly eventCtrl: IEventController) {
        this.eventCtrl.RegisterEventListener(EventTypes.UnitProduced, this.onUnitProduced);
    }

    subscribe(fn: Subscriber): () => void {
        this.subscribers.push(fn);
        return () => {
            this.subscribers = this.subscribers.filter((sub) => sub !== fn);
        };
    }

    getReserveSnapshot(): ReadonlyMap<AllyId, number> {
        return new Map(this.reserveUnits);
    }

    getSquadSnapshot(): readonly Squad[] {
        return this.squads.map((squad) => this.cloneSquad(squad));
    }

    getSelectedSquadId(): string | null {
        return this.selectedSquadId;
    }

    getSelectedSquad(): Squad | undefined {
        const squad = this.findSelectedSquad();
        return squad ? this.cloneSquad(squad) : undefined;
    }

    addReserve(allyId: AllyId, count: number): void {
        if (!this.isAllyId(allyId) || !Number.isInteger(count) || count <= 0) {
            console.warn("[SquadManager] Invalid reserve add ignored", { allyId, count });
            return;
        }

        this.reserveUnits.set(allyId, (this.reserveUnits.get(allyId) ?? 0) + count);
        this.emit();
    }

    assignMember(squadId: string, allyId: AllyId, deckLevel = 1): boolean {
        const squad = this.squads.find((item) => item.id === squadId);
        const reserveCount = this.reserveUnits.get(allyId) ?? 0;
        if (!squad || reserveCount <= 0 || squad.members.length >= squad.maxSize || deckLevel <= 0) {
            return false;
        }

        this.reserveUnits.set(allyId, reserveCount - 1);
        squad.members.push({ allyId, deckLevel });
        this.emit();
        return true;
    }

    unassignMember(squadId: string, memberIndex: number): boolean {
        const squad = this.squads.find((item) => item.id === squadId);
        if (!squad || memberIndex < 0 || memberIndex >= squad.members.length) return false;

        const [member] = squad.members.splice(memberIndex, 1);
        this.reserveUnits.set(member.allyId, (this.reserveUnits.get(member.allyId) ?? 0) + 1);
        this.emit();
        return true;
    }

    selectSquad(squadId: string | null): void {
        if (squadId !== null && !this.squads.some((squad) => squad.id === squadId)) return;
        this.selectedSquadId = squadId;
        this.emit();
    }

    toAllySpawnSpecs(squadId?: string): AllySpawnSpec[] | undefined {
        const squad = squadId
            ? this.squads.find((item) => item.id === squadId)
            : this.findSelectedSquad();
        if (!squad || squad.members.length === 0) return undefined;
        return squad.members.map((member) => ({
            allyId: member.allyId,
            deckLevel: member.deckLevel,
        }));
    }

    private onUnitProduced = (payload?: UnitProducedPayload) => {
        if (!payload) return;
        this.addReserve(payload.allyId, payload.count);
    };

    private findSelectedSquad(): Squad | undefined {
        return this.selectedSquadId
            ? this.squads.find((squad) => squad.id === this.selectedSquadId)
            : undefined;
    }

    private cloneSquad(squad: Squad): Squad {
        return {
            ...squad,
            members: squad.members.map((member) => ({ ...member })),
        };
    }

    private isAllyId(value: unknown): value is AllyId {
        return Object.values(AllyId).includes(value as AllyId);
    }

    private emit(): void {
        this.subscribers.forEach((fn) => fn());
    }
}
