import * as THREE from "three";
import { Loader } from "./loader";
import { AssetModel } from "./assetmodel";
import { IAsset } from "./iasset";
import { Ani, Bind, Char, ModelType } from "./assettypes";


export class OfficeGirlFab extends AssetModel implements IAsset {
    get Id() {return Char.CharHumanFemale}

    constructor(loader: Loader) { 
        super(loader, ModelType.Fbx, "assets/officegirl/officegirl.fbx", async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true

            const tloader = new THREE.TextureLoader()
            const cloth = await tloader.loadAsync("assets/officegirl/Cloth.png")
            const acess = await tloader.loadAsync("assets/officegirl/acessories.png")
            const hair = await tloader.loadAsync("assets/officegirl/Hair.png")
            const skin = await tloader.loadAsync("assets/officegirl/Skin.png")
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = true
                if (child instanceof THREE.Mesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        switch (material.name) {
                            case "Cloth":
                                material.map = cloth
                                material = new THREE.MeshToonMaterial({ map: child.material.map })
                                material.needsupdate = true
                                break;
                            case "Acessories":
                                material.map = acess
                                material = new THREE.MeshToonMaterial({ map: child.material.map })
                                material.needsupdate = true
                                break;
                            case "Hair":
                                material.map = hair
                                material = new THREE.MeshToonMaterial({ map: child.material.map })
                                material.needsupdate = true
                                break;
                            case "Skin":
                                material.map = skin
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
            await this.LoadAnimation("assets/officegirl/Idle.fbx", Ani.Idle)
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

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        this.size.y *= 4
        console.log(this.meshs, this.size)
        return this.size 
    }
}