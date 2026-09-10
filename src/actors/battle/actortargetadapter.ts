import * as THREE from "three"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { TargetRecord } from "@Glibs/systems/targeting/targettypes"

export class ActorTargetAdapter implements IPhysicsObject {
    private static readonly fallbackBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    private static readonly ZERO = new THREE.Vector3()

    private target?: TargetRecord
    private velocity = 0
    private readonly size = new THREE.Vector3(1, 1, 1)
    private readonly centerPos = new THREE.Vector3()
    private readonly headPos = new THREE.Vector3()
    private readonly box = new THREE.Box3()
    private isDirty = true

    constructor(
        private readonly emptyTargetId: string,
        private readonly fallback?: IPhysicsObject,
    ) { }

    set Target(record: TargetRecord | undefined) {
        if (this.target !== record) {
            this.target = record
            this.isDirty = true
        }
    }

    get HasTarget() { return this.target != undefined || this.fallback != undefined }
    get TargetId() { return this.target?.id ?? this.emptyTargetId }

    get Velocity() { return this.velocity }
    set Velocity(n: number) { this.velocity = n }

    get Size(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.target ? this.size : this.fallback?.Size ?? this.size
    }

    get CBox(): THREE.Mesh { return ActorTargetAdapter.fallbackBoxMesh }
    get BoxPos(): THREE.Vector3 { return this.CenterPos }

    get Box(): THREE.Box3 {
        if (this.isDirty) this.updateCache()
        return this.target ? this.box : this.fallback?.Box ?? this.box
    }

    get HeadPos(): THREE.Vector3 {
        this.headPos.copy(this.CenterPos)
        this.headPos.y += this.Size.y / 2
        return this.headPos
    }

    get CenterPos(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.target ? this.centerPos : this.fallback?.CenterPos ?? ActorTargetAdapter.ZERO
    }

    get Pos(): THREE.Vector3 {
        return this.target?.object.position ?? this.fallback?.Pos ?? ActorTargetAdapter.ZERO
    }

    set Visible(flag: boolean) {
        const object = this.target?.object
        if (object) object.visible = flag
        else if (this.fallback) this.fallback.Visible = flag
    }

    get Meshs(): THREE.Group | THREE.Mesh {
        const object = this.target?.object
        if (object instanceof THREE.Group || object instanceof THREE.Mesh) return object
        return this.fallback?.Meshs ?? ActorTargetAdapter.fallbackBoxMesh
    }

    get UUID(): string {
        return this.target?.object.uuid ?? this.fallback?.UUID ?? ""
    }

    update(): void {
        this.isDirty = true
    }

    private updateCache(): void {
        const target = this.target
        const object = target?.object
        if (!object) {
            this.box.makeEmpty()
            this.size.set(1, 1, 1)
            this.centerPos.copy(this.fallback?.CenterPos ?? ActorTargetAdapter.ZERO)
            this.isDirty = false
            return
        }

        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            this.box.copy(target.bounds)
        } else {
            this.box.setFromObject(target.colliderObject ?? object)
        }

        if (this.box.isEmpty()) {
            this.size.set(1, 1, 1)
            this.centerPos.copy(object.position)
        } else {
            this.box.getSize(this.size)
            this.box.getCenter(this.centerPos)
        }
        this.isDirty = false
    }
}
