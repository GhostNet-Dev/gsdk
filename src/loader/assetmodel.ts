import * as THREE from "three";
import { Loader } from "./loader";
import { Ani, AssetInfo, ModelType } from "./assettypes";
import { GUI } from "lil-gui"
import { Bind } from "@Glibs/types/assettypes";


export abstract class AssetModel {
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
    GetBox(mesh: THREE.Group) {
        console.log("GetBox", mesh.rotation.x)
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use this.meshs
        if (this.box == undefined) {

            // 원본 객체의 로컬 공간(회전 적용 전)의 AABB를 계산합니다.
            const localAABB = new THREE.Box3().setFromObject(mesh);
            const size = localAABB.getSize(new THREE.Vector3());
            const center = localAABB.getCenter(new THREE.Vector3());

            // 계산된 크기로 Box Geometry를 생성합니다.
            const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

            // 중요: Geometry의 중심을 로컬 AABB의 중심과 일치시킵니다.
            // 이렇게 해야 원본 객체와 동일한 지점을 중심으로 회전하게 됩니다.
            geometry.translate(center.x, center.y, center.z);

            // 이 '틀'을 이용해 Helper 메시를 생성합니다.
            // wireframe으로 만들면 내부 객체가 잘 보입니다.
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
            this.box = new THREE.Mesh(geometry, material);
        }

        // 2단계: 매번 호출될 때마다 원본 객체의 최신 월드 변환을 Helper에 복사합니다.
        mesh.updateWorldMatrix(true, false); // 원본 객체의 matrixWorld를 최신 상태로 업데이트
        this.box.matrix.copy(mesh.matrixWorld); // matrixWorld를 그대로 복사

        // matrix를 직접 제어하므로 Three.js의 자동 업데이트를 비활성화합니다.
        // this.box.matrixAutoUpdate = false;
        //if (this.box == undefined) {
        //    const s = this.GetSize(mesh)
        //    this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        //}

        return new THREE.Box3().setFromObject(this.box)
    }
    GetBodyMeshId(bind: Bind) {
        switch (bind) {
            case Bind.Hands_R: return "mixamorigRightHand";
            case Bind.Hands_L: return "mixamorigLeftHand";
        }
    }
    
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        console.log("GetSize")
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        console.log(this.meshs, this.size)
        return this.size
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
        if (this.meshs != undefined) {
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
        const Y = (this.size) ? v.y + this.size.y / 2 : v.y
        return new THREE.Vector3(v.x, Y, v.z)
    }
    CreateVectorGui(f: GUI, v: THREE.Vector3 | THREE.Euler, name: string, step: number) {
        f.add(v, "x", -1000, 1000, step).listen().name(name + "X")
        f.add(v, "y", -1000, 1000, step).listen().name(name + "Y")
        f.add(v, "z", -1000, 1000, step).listen().name(name + "Z")
    }
}
