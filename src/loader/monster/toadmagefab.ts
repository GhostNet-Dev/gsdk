import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough } from '@gltf-transform/functions';



export class ToadMageFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharHumanViking}

    constructor(loader: Loader) {
        super(loader, ModelType.GltfParser, "", async (resolve: (value: THREE.Group<THREE.Object3DEventMap> | PromiseLike<THREE.Group<THREE.Object3DEventMap>>) => void) => {
            const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
            const document = await io.read("assets/monster/toad_mage.glb");

            // Convert materials.
            await document.transform(metalRough());

            // Write back to GLB.
            const glb = await io.writeBinary(document);
            loader.Load.parse(glb.buffer, '', (gltf) => {
                this.gltf = gltf
                this.meshs = gltf.scene
                this.meshs.castShadow = true
                this.meshs.receiveShadow = true
                this.meshs.traverse(child => {
                    child.castShadow = true
                    child.receiveShadow = false
                })
                const scale = 2
                this.meshs.children[0].scale.set(scale, scale, scale)
                this.mixer = new THREE.AnimationMixer(gltf.scene)
                console.log(gltf.animations)
                this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "idle"))
                this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "run"))
                this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "attack"))
                this.clips.set(Ani.MagicH1, gltf.animations.find((clip) => clip.name == "cast"))
                resolve(this.meshs)
            })
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x) * 2
        this.size.y = 4
        this.size.z = Math.ceil(this.size.z) * 2
        return this.size 
    }
}