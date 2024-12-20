import { Ani, AssetInfo, Bind, Char } from "@Glibs/types/assettypes"

export interface IAsset {
    get Id(): Char
    get Clips(): Map<Ani, THREE.AnimationClip | undefined>
    get BoxMesh(): THREE.Mesh | undefined
    get Info(): AssetInfo | undefined
    GetAnimationClip(id: Ani): THREE.AnimationClip | undefined 
    GetBox(mesh: THREE.Group): THREE.Box3
    GetBoxPos(mesh: THREE.Group): THREE.Vector3
    GetSize(mesh: THREE.Group): THREE.Vector3
    CloneModel(): Promise<THREE.Group>
    UniqModel(id: string): Promise<[THREE.Group, boolean]>
    GetMixer(id: string): THREE.AnimationMixer | undefined
    GetBodyMeshId(bind?: Bind) : string | undefined
}