import * as THREE from "three"
import { BaseSpec } from "./basespec"

export type AttackerRef = {
    attackerTargetId?: string
    spec?: BaseSpec
    obj?: THREE.Object3D
    objectId?: string
}

type RegistryLookup = {
    getByObject(o?: THREE.Object3D | null): { id: string } | undefined
}

type TargetOwner = {
    TargetId?: string
    objs?: THREE.Object3D
}

export function resolveAttackerId(
    attacker: AttackerRef | undefined,
    registry: RegistryLookup | undefined,
    receiverId?: string,
): string | undefined {
    if (!attacker) return undefined

    const useCandidate = (id?: string) => id && id !== receiverId ? id : undefined

    const explicit = useCandidate(attacker.attackerTargetId)
    if (explicit) return explicit

    const owner = attacker.spec?.Owner as TargetOwner | undefined
    const ownerTargetId = useCandidate(owner?.TargetId)
    if (ownerTargetId) return ownerTargetId

    const ownerObjectId = useCandidate(registry?.getByObject(owner?.objs)?.id)
    if (ownerObjectId) return ownerObjectId

    const objRecordId = useCandidate(registry?.getByObject(attacker.obj)?.id)
    if (objRecordId) return objRecordId

    const metaId = useCandidate(attacker.obj?.userData?.targetMeta?.id as string | undefined)
    if (metaId) return metaId

    return undefined
}
