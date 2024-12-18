import * as THREE from "three";
import { Loader } from "./loader";
import { Ani, AssetModel, Bind, Char, IAsset, ModelType } from "./assetmodel";


export class TwoBFab extends AssetModel implements IAsset {
    get Id() {return Char.TwoB}

    constructor(loader: Loader) { 
        super(loader, ModelType.Fbx, "assets/2b/2b01.fbx", async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true

            const tloader = new THREE.TextureLoader()
            const cloth = await tloader.loadAsync("assets/2b/cloths.jpeg")
            const face = await tloader.loadAsync("assets/2b/Face.jpeg")
            const hair = await tloader.loadAsync("assets/2b/hair.jpeg")
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
                if (child instanceof THREE.Mesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        switch (material.name) {
                            case "Clorh":
                                material.map = cloth
                                material = new THREE.MeshToonMaterial({ map: child.material.map })
                                material.needsupdate = true
                                break;
                            case "Face":
                                material.map = face
                                material = new THREE.MeshToonMaterial({ map: child.material.map })
                                material.needsupdate = true
                                break;
                            case "Hair":
                                material.map = hair
                                material = new THREE.MeshToonMaterial({ map: child.material.map })
                                material.needsupdate = true
                                break;
                        }
                    });
                }
            })
            const scale = .022
            this.meshs.scale.set(scale, scale, scale)
            this.mixer = new THREE.AnimationMixer(meshs)
            await this.LoadAnimation("assets/2b/Idle.fbx", Ani.Idle)

            await this.LoadAnimation("assets/2b/Running.fbx", Ani.Run)
            await this.LoadAnimation("assets/2b/Jumping Up.fbx", Ani.Jump)
            await this.LoadAnimation("assets/2b/Punch Combo.fbx", Ani.Punch)
            await this.LoadAnimation("assets/2b/Fight Idle.fbx", Ani.FightIdle)
            await this.LoadAnimation("assets/2b/Shooting.fbx", Ani.Shooting)
            await this.LoadAnimation("assets/2b/Sword And Shield Slash.fbx", Ani.Sword)
        })
    }
    GetBodyMeshId(_bind: Bind) { return "" }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use this.meshs
        if (this.box == undefined) {
            const s = this.GetSize(mesh)
            this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        }

        const p = this.GetBoxPos(mesh)
        this.box.position.copy(p)
        this.box.rotation.copy(mesh.rotation)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        this.size.y *= 4
        console.log(this.meshs, this.size)
        return this.size 
    }
}