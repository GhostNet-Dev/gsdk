import * as THREE from "three";
import { Loader } from "./loader";
import { Ani, AssetInfo, ModelType } from "./assettypes";
import { GUI } from "lil-gui"


export class AssetModel {
    protected box?: THREE.Mesh
    protected meshs?: THREE.Group
    protected size?: THREE.Vector3
    protected mixer?: THREE.AnimationMixer
    protected clips = new Map<Ani, THREE.AnimationClip | undefined>()
    private models = new Map<string, THREE.Group>()
    private mixers = new Map<string, THREE.AnimationMixer>()
    protected boxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, lightMapIntensity: 0 })
    protected info?: AssetInfo

    get Clips() { return this.clips }
    get Mixer() { return this.mixer }
    get BoxMesh() { return this.box }
    get Info() { return this.info }
    constructor(
        protected loader: Loader, 
        private loaderType: ModelType,
        private path: string, 
        private afterLoad: Function
    ) { }

    GetAnimationClip(id: Ani): THREE.AnimationClip | undefined {
        return this.clips.get(id)
    }

    async UniqModel(id: string, external?: Function): Promise<[THREE.Group, boolean]> {
        const has = this.models.get(id)
        if (has != undefined) {
            return [has, true]
        }

        const ret = await this.NewModel(external)
        this.models.set(id, ret)
        return [ret, false]
    }
    async LoadAnimation(url: string, type: Ani) {
        const obj = await this.loader.FBXLoader.loadAsync(url)
        this.clips.set(type, obj.animations[0])
    }

    GetMixer(id: string): THREE.AnimationMixer | undefined {
        const has = this.mixers.get(id)
        if (has != undefined) {
            return has
        }
        const model = this.models.get(id)
        if (model == undefined) return undefined
        const ret = new THREE.AnimationMixer(model)
        this.mixers.set(id, ret)
        return ret
    }
    async NewModel(external?: Function): Promise<THREE.Group> {
        if (this.loaderType == ModelType.Gltf) {
            return await new Promise(async (resolve) => {
                await this.loader.Load.load(this.loader.rootPath + this.path, async (gltf) => {
                    this.meshs = gltf.scene
                    await this.afterLoad(gltf)
                    await external?.(gltf)
                    resolve(gltf.scene)
                })
            })
        } else if (this.loaderType == ModelType.GltfParser) {
            return await new Promise(async (resolve) => {
                await this.afterLoad(resolve)
            })
        }
        return await new Promise(async (resolve) => {
            await this.loader.FBXLoader.load(this.loader.rootPath + this.path, async (obj) => {
                await this.afterLoad(obj)
                resolve(obj)
            })
        })
    }

    async CloneModel(): Promise<THREE.Group> {
        if(this.meshs != undefined) {
            const backupUserdata = this.meshs.userData
            this.meshs.userData = {}
            const clone = this.meshs.clone()
            this.meshs.userData = backupUserdata
            clone.userData = backupUserdata
            console.log("clone model")
            return clone
        }
        return await this.NewModel()
    }
    GetBoxPos(mesh: THREE.Group) {
        // Don't Use this.meshs
        const v = mesh.position
        const Y = (this.size)? v.y + this.size.y / 2: v.y
        return new THREE.Vector3(v.x, Y, v.z)
    }
    CreateVectorGui(f: GUI, v: THREE.Vector3 | THREE.Euler, name: string, step: number) {
        f.add(v, "x", -100, 100, step).listen().name(name + "X")
        f.add(v, "y", -100, 100, step).listen().name(name + "Y")
        f.add(v, "z", -100, 100, step).listen().name(name + "Z")
    }
}
