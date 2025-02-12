import * as THREE from "three";
import { Loader } from "./loader";
import { AssetModel } from "./assetmodel";
import { IAsset } from "./iasset";
import { Ani, Bind, Char, ModelType } from "./assettypes";


export class TestFab extends AssetModel implements IAsset {
    get Id() {return Char.CharHumanFemale}

    constructor(loader: Loader) { 
        super(loader, ModelType.Fbx, "assets/test/Animated.fbx", async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true

            const tloader = new THREE.TextureLoader()
            const eye0 = await tloader.loadAsync("assets/test/textures/F00_000_00_EyeIris_00.png")
            const eye1 = await tloader.loadAsync("assets/test/textures/F00_000_00_EyeWhite_00.png")
            const face = await tloader.loadAsync("assets/test/textures/F00_000_00_Face_00-1.png")
            const mouth = await tloader.loadAsync("assets/test/textures/F00_000_00_FaceMouth_00.png")
            const hair = await tloader.loadAsync("assets/test/textures/F00_000_Hair_00.png")
            const hairback = await tloader.loadAsync("assets/test/textures/F00_000_HairBack_00.png")
            const acce = await tloader.loadAsync("assets/test/textures/F00_001_01_Accessory_Tie_01.png")
            const body = await tloader.loadAsync("assets/test/textures/F00_001_01_Body_00.png")
            const bottom = await tloader.loadAsync("assets/test/textures/F00_001_01_Bottoms_01.png")
            const shoes = await tloader.loadAsync("assets/test/textures/F00_001_01_Shoes_01.png")
            const top = await tloader.loadAsync("assets/test/textures/F00_001_01_Tops_01.png")

            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
                if (child instanceof THREE.Mesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        switch (material.name) {
                            case "F00_000_00_FaceMouth_00_FACE":
                                material.map = mouth
                                material.needsupdate = true
                                break;
                            case "F00_000_00_EyeWhite_00_EYE":
                            case "F00_000_00_EyeExtra_01_EYE":
                            case "F00_000_00_EyeHighlight_00_EYE":
                                material.map = eye1
                                material.needsupdate = true
                                break;
                            case "F00_000_00_FaceEyeline_00_FACE":
                            case "F00_000_00_Face_00_SKIN":
                                material.map = face
                                material.needsupdate = true
                                break;
                            case "F00_000_00_FaceEyelash_00_FACE":
                            case "F00_000_00_FaceBrow_00_FACE":
                                material.map = face
                                material.needsupdate = true
                                break;
                            case "F00_000_00_EyeIris_00_EYE":
                                material.map = eye0
                                material.needsupdate = true
                                break;
                            case "F00_001_01_Body_00_SKIN":
                                material.map = body
                                material.needsupdate = true
                                break;
                            case "F00_001_01_Tops_01_CLOTH":
                                material.map = top
                                material.needsupdate = true
                                break;
                            case "F00_001_01_Bottoms_01_CLOTH":
                                material.map = bottom
                                material.needsupdate = true
                                break;
                            case "F00_001_01_Accessory_Tie_01_CLOTH":
                                material.map = acce
                                material.needsupdate = true
                                break;
                            case "F00_001_01_Shoes_01_CLOTH":
                                material.map = shoes
                                material.needsupdate = true
                                break;
                            case "F00_000_HairBack_00_HAIR":
                                material.map = hairback
                                material.needsupdate = true
                                break;
                            case "F00_000_Hair_00_HAIR":
                                material.map = hair
                                material.needsupdate = true
                                break;
                        }
                    });
                }
            })
            const scale = 2.7
            this.meshs.scale.set(scale, scale, scale)
            this.mixer = new THREE.AnimationMixer(meshs)
            await this.LoadAnimation("assets/test/Idle.fbx", Ani.Idle)

            await this.LoadAnimation("assets/highgirl/Running.fbx", Ani.Run)
            await this.LoadAnimation("assets/highgirl/Jumping Up.fbx", Ani.Jump)
            await this.LoadAnimation("assets/highgirl/Punch Combo.fbx", Ani.Punch)
            await this.LoadAnimation("assets/highgirl/Fighting Idle.fbx", Ani.FightIdle)
            await this.LoadAnimation("assets/highgirl/Shooting.fbx", Ani.Shooting)
            await this.LoadAnimation("assets/highgirl/Sword And Shield Slash.fbx", Ani.Sword)
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
        this.size.x = 1
        this.size.z = 1
        this.size.y = 4
        console.log(this.meshs, this.size)
        return this.size 
    }
}