export interface ThreatEntry {
    targetId: string
    threat: number
    lastHitAt: number
}

export type ThreatBookOptions = {
    decayPerSec: number
    maxAgeMs: number
    maxEntries: number
}

const DEFAULT_THREAT_OPTIONS: ThreatBookOptions = {
    decayPerSec: 0.25,
    maxAgeMs: 8000,
    maxEntries: 8,
}

export class ThreatBook {
    private readonly entries = new Map<string, ThreatEntry>()
    private readonly opts: ThreatBookOptions
    private newestHitAt = 0
    private lastDecayAt = 0

    constructor(opts: Partial<ThreatBookOptions> = {}) {
        this.opts = { ...DEFAULT_THREAT_OPTIONS, ...opts }
    }

    record(attackerId: string, amount: number, now = Date.now()): void {
        const threatAmount = Math.max(0, amount)
        if (threatAmount <= 0) return

        const prev = this.entries.get(attackerId)
        if (prev) {
            prev.threat += threatAmount
            prev.lastHitAt = now
        } else {
            this.entries.set(attackerId, {
                targetId: attackerId,
                threat: threatAmount,
                lastHitAt: now,
            })
        }
        this.newestHitAt = Math.max(this.newestHitAt, now)
        this.trim(now)
    }

    decay(now = Date.now()): void {
        if (this.lastDecayAt <= 0) {
            this.lastDecayAt = now
            this.trim(now)
            return
        }

        const elapsedSec = Math.max(0, now - this.lastDecayAt) / 1000
        this.lastDecayAt = now
        if (elapsedSec <= 0) {
            this.trim(now)
            return
        }

        const factor = Math.exp(-this.opts.decayPerSec * elapsedSec)
        for (const entry of this.entries.values()) {
            entry.threat *= factor
        }
        this.trim(now)
    }

    list(now = Date.now()): ThreatEntry[] {
        this.trim(now)
        return [...this.entries.values()]
            .sort((a, b) => b.threat - a.threat)
            .map((entry) => ({ ...entry }))
    }

    top(now = Date.now()): ThreatEntry | undefined {
        return this.list(now)[0]
    }

    get(attackerId: string): ThreatEntry | undefined {
        const entry = this.entries.get(attackerId)
        return entry ? { ...entry } : undefined
    }

    hasNewSince(ms: number): boolean {
        return this.newestHitAt > ms
    }

    clear(): void {
        this.entries.clear()
        this.newestHitAt = 0
        this.lastDecayAt = 0
    }

    private trim(now: number): void {
        for (const [id, entry] of this.entries) {
            if (entry.threat < 0.5 || now - entry.lastHitAt > this.opts.maxAgeMs) {
                this.entries.delete(id)
            }
        }

        if (this.entries.size <= this.opts.maxEntries) return

        const sorted = [...this.entries.values()].sort((a, b) => a.threat - b.threat)
        for (const entry of sorted.slice(0, this.entries.size - this.opts.maxEntries)) {
            this.entries.delete(entry.targetId)
        }
    }
}
