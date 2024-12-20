
export interface IEffect {
    get Mesh(): THREE.Group | THREE.Mesh
    Start(...arg: any): void
    Update(delta: number, ...arg: any): void
    Complete(): void
}

