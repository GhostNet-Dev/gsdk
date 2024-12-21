export interface IMonsterAction {
    Init(): void
    Uninit(): void
    Update(delta: number, v: THREE.Vector3, dist: number): IMonsterAction
}