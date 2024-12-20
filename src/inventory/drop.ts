import IEventController, { ICanvas, ILoop } from "@Glibs/interface/ievent";
import IInventory from "@Glibs/interface/iinven";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { EventFlag } from "@Glibs/types/eventtypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { MonDrop } from "@Glibs/types/monstertypes";
import * as THREE from "three";

type DropBox = {
    id: number
    droped: boolean
    items?: string[]
}

export class Drop implements ILoop {
    dropBox: DropBox[] = []
    activeDropBox: DropBox[] = []
    resetPos = new THREE.Vector3(0, -10, 0)
    pointsGeometry?: THREE.BufferGeometry
    points: THREE.Points | THREE.InstancedMesh;
    head = 0
    maxCount = 300
    moveDist = 6
    dummy = new THREE.Object3D()
    createPos = new THREE.Vector3()
    moveDirection = new THREE.Vector3()

    constructor(
        private inventory: IInventory,
        private player: IPhysicsObject,
        canvas: ICanvas,
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
    ) {
        eventCtrl.RegisterEventListener(EventTypes.PlayMode, (e: EventFlag) => {
            switch (e) {
                case EventFlag.Start:
                    break
                case EventFlag.End:
                    this.Uninit()
                    break
            }
        })
        eventCtrl.RegisterEventListener(EventTypes.Drop, (pos: THREE.Vector3, drop: MonDrop[] | undefined) => {
            this.dropPoint(pos, drop)
        })
        eventCtrl.RegisterEventListener(EventTypes.DirectDrop, (drop: MonDrop[] | undefined) => {
            this.DirectItem(drop)
        })

        canvas.RegisterLoop(this)
        //this.points = this.CreateInstancedMesh()//this.CreatePoints()
        this.points = this.CreatePoints()
        // frustumCulled 안하면 특정 각도에서 보이지 않는다.
        this.points.frustumCulled = false
        this.points.renderOrder = 1
        this.scene.add(this.points)
    }
    Uninit() {
        if (this.pointsGeometry == undefined) return
        const points = this.pointsGeometry.attributes.position
        for (let i = 0; i < this.dropBox.length; i++) {
            const b = this.dropBox[this.head]
            if (b.droped) {
                b.droped = false
                points.setX(b.id, this.resetPos.x)
                points.setY(b.id, this.resetPos.y)
                points.setZ(b.id, this.resetPos.z)
            }
            this.head++
            this.head %= this.dropBox.length
        }
        this.head = 0
        this.activeDropBox.length = 0
        points.needsUpdate = true
    }

    DirectItem(drop: MonDrop[] | undefined) {
        if (drop != undefined) {
            const ticket = Math.random()
            drop.forEach((item) => {
                if (item.ratio > ticket) {
                    const info = this.inventory.GetItemInfo(item.itemId)
                    this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `${info.name}을 얻었습니다.`)
                    this.inventory.NewItem(item.itemId)
                }
            })
        }
    }

    dropPoint(pos: THREE.Vector3, drop: MonDrop[] | undefined) {
        if (this.pointsGeometry == undefined) return
        const itemIds: string[] = []
        if (drop != undefined) {
            const ticket = Math.random()
            drop.forEach((item) => {
                if (item.ratio > ticket) {
                    itemIds.push(item.itemId)
                }
            })
        }
        const points = this.pointsGeometry.attributes.position
        for (let i = 0; i < this.dropBox.length; i++) {
            const b = this.dropBox[this.head]
            if (!b.droped) {
                b.id = this.head
                b.droped = true
                b.items = itemIds
                points.setX(b.id, pos.x)
                points.setY(b.id, pos.y)
                points.setZ(b.id, pos.z)
                this.activeDropBox.push(b)
                break;
            }
            this.head++
            this.head %= this.dropBox.length
        }
        points.needsUpdate = true
    }
    pointsUpdate(delta: number) {
        if (!this.activeDropBox.length || this.pointsGeometry == undefined) return
        this.createPos.copy(this.player.CenterPos)
        const points = this.pointsGeometry.attributes.position
        for (let i = 0; i < this.activeDropBox.length; i++) {
            const b = this.activeDropBox[i];
            const pos = new THREE.Vector3(points.getX(b.id), points.getY(b.id), points.getZ(b.id))
            const dist = pos.distanceTo(this.createPos)
            if (dist < 1) {
                // Get Item
                points.setX(b.id, this.resetPos.x)
                points.setY(b.id, this.resetPos.y)
                points.setZ(b.id, this.resetPos.z)
                b.droped = false
                this.activeDropBox.splice(i, 1)
                b.items?.forEach(item => {
                    const info = this.inventory.GetItemInfo(item)
                    this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `${info.name}을 얻었습니다.`)
                    this.inventory.NewItem(item)
                })
            } else if (dist < this.moveDist) {
                this.moveDirection.subVectors(this.createPos, pos).normalize()
                pos.addScaledVector(this.moveDirection, delta * this.speed)
                /*
                if (this.createPos.x - pos.x < 0) {
                    pos.x -= delta * this.speed
                } else {
                    pos.x += delta * this.speed
                }
                if (this.createPos.z - pos.z < 0) {
                    pos.z -= delta * this.speed
                } else {
                    pos.z += delta * this.speed
                }
                */
                points.setX(b.id, pos.x)
                points.setY(b.id, pos.y)
                points.setZ(b.id, pos.z)
            }
        }
        points.needsUpdate = true
    }

    resize(): void { }

    speed = 4
    update(delta: number): void {
        this.pointsUpdate(delta)
        //this.instanceUpdate(delta)
    }

    makeDropPoints() {
        const boxPos: THREE.Vector3[] = []
        for (let i = 0; i < this.maxCount; i++) {
            const v = new THREE.Vector3()
            v.copy(this.resetPos)
            boxPos.push(v)
            this.dropBox.push({ id: i, droped: false })
        }
        return boxPos
    }
    GetGeometry() {
        const positions = this.makeDropPoints()
        this.pointsGeometry = new THREE.BufferGeometry()
        this.pointsGeometry.setFromPoints(positions)
        const colors = []
        for (let i = 0; i < positions.length ; i++) {
            const r = THREE.MathUtils.randInt(Math.random(), .1)
            const g = THREE.MathUtils.randInt(.6, 1)
            const b = THREE.MathUtils.randInt(0, .8)
            colors.push(r, g, b)
        }
        this.pointsGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    }
    CreatePoints() {
        this.GetGeometry()
        const _canvas = document.createElement('CANVAS') as HTMLCanvasElement
        _canvas.width = 128
        _canvas.height = 128
        const context = _canvas.getContext('2d')
        if (context == undefined) throw new Error("fail get context");

        context.globalAlpha = 0.3
        context.filter = 'blur(16px)'
        context.fillStyle = 'white'
        context.beginPath()
        context.arc(64, 64, 40, 0, 2 * Math.PI)
        context.fill()
        context.globalAlpha = 1
        context.filter = 'blur(5px)'
        context.fillStyle = 'white'
        context.beginPath()
        context.arc(64, 64, 16, 0, 2 * Math.PI)
        context.fill()
        const texture = new THREE.CanvasTexture(_canvas)

        const material = new THREE.PointsMaterial({
            color: 'white',
            vertexColors: true,
            size: 2,
            sizeAttenuation: true,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
        return new THREE.Points(this.pointsGeometry, material)
    }
    CreateShaderPoint() {
        this.GetGeometry()
        const shaderPoint = THREE.ShaderLib.points
        const uniforms = THREE.UniformsUtils.clone(shaderPoint.uniforms)
        const image = new Image()
        uniforms.map.value = new THREE.Texture(image)
        image.onload = () => {
            uniforms.map.value.needsUpdate = true
        }
        image.src = "assets/texture/particle.png"

        const radius = THREE.MathUtils.randInt(2, 3)
        uniforms.size.value = radius
        uniforms.scale.value = 100

        return new THREE.Points(this.pointsGeometry, new THREE.ShaderMaterial({
            uniforms: uniforms,
            defines: {
                USE_COLOR: "",
                USE_MAP: "",
                USE_SIZEATTENUATION: "",
            },
            //transparent: true,
            // alphaTest: 4
            depthWrite: false,
            //depthTest: false,
            blending: THREE.AdditiveBlending,
            vertexShader: shaderPoint.vertexShader,
            fragmentShader: shaderPoint.fragmentShader,
        }))
    }

    CreateInstancedMesh() {
        const geometry = new THREE.IcosahedronGeometry(1, 0)
        const material = new THREE.MeshStandardMaterial({
            //color: 0xD9AB61,
            color: 0x00ff00,
        })
        const instance = new THREE.InstancedMesh(
            geometry, material, this.maxCount
        )
        instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        const positions = this.makeDropPoints()
        const scale = 0.5
        positions.forEach((p, i) => {
            this.dummy.position.copy(p)
            this.dummy.scale.set(scale, scale, scale)
            this.dummy.updateMatrix()
            instance.setMatrixAt(i, this.dummy.matrix)
            const r = THREE.MathUtils.randInt(Math.random(), .1)
            const g = THREE.MathUtils.randInt(.6, 1)
            const b = THREE.MathUtils.randInt(0, .8)
            instance.setColorAt(i, new THREE.Color(r, g, b))
        })
        return instance
    }
    dropMesh(pos: THREE.Vector3) {
        const instance = this.points as THREE.InstancedMesh
        for (let i = 0; i < this.dropBox.length; i++) {
            const b = this.dropBox[this.head]
            if (!b.droped) {
                b.id = this.head
                b.droped = true
                this.dummy.position.copy(pos)
                this.dummy.updateMatrix()
                instance.setMatrixAt(b.id, this.dummy.matrix)
                instance.instanceMatrix.needsUpdate = true
                this.activeDropBox.push(b)
                break;
            }
            this.head++
            this.head %= this.dropBox.length
        }
    }
    instanceUpdate(delta: number) {
        if (!this.activeDropBox.length) return
        const tp = this.player.Meshs.position
        const instance = this.points as THREE.InstancedMesh
        const matrix = new THREE.Matrix4()
        const pos = new THREE.Vector3()
        for (let i = 0; i < this.activeDropBox.length; i++) {
            const b = this.activeDropBox[i];
            instance.getMatrixAt(b.id, matrix)
            pos.setFromMatrixPosition(matrix)
            const dist = pos.distanceTo(tp)
            if (dist < 1) {
                // Get Iem
                matrix.setPosition(this.resetPos)
                b.droped = false
                this.activeDropBox.splice(i, 1)
            } else if (dist < this.moveDist) {
                if (tp.x - pos.x < 0) {
                    pos.x -= delta * this.speed * this.moveDist
                } else {
                    pos.x += delta * this.speed * this.moveDist
                }
                if (tp.z - pos.z < 0) {
                    pos.z -= delta * this.speed * this.moveDist
                } else {
                    pos.z += delta * this.speed * this.moveDist
                }
                matrix.setPosition(pos)
            }
            instance.setMatrixAt(b.id, matrix)
        }
        instance.instanceMatrix.needsUpdate = true
    }

}