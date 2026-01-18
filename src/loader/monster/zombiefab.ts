import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

// [Base Class] 모든 좀비의 공통 부모 클래스
export abstract class BaseZombieFab extends AssetModel implements IAsset {
    gltf?: GLTF;
    
    // 자식 클래스에서 구현해야 할 ID
    abstract get Id(): Char; 

    constructor(loader: Loader) {
        super(loader, ModelType.Gltf, "assets/monster/zombie.gltf", async (gltf: GLTF) => {
            this.gltf = gltf;
            this.meshs = gltf.scene;
            
            // 1. 기본 메쉬 설정 (Shadow, Material, Scale)
            this.setupMesh();

            // 2. 애니메이션 설정
            this.setupAnimations(gltf);

            // 3. 추가 애니메이션 로드
            await this.loadExtraAnimations();

            // 4. [Hook] 자식 클래스별 커스텀 로직 실행 (장식물 부착 등)
            await this.onCustomSetup();
        });
    }

    private setupMesh() {
        if (this.meshs == undefined) throw new Error("meshs is undefined");
        this.meshs.name = "zombie";
        this.meshs.castShadow = true;
        this.meshs.receiveShadow = true;

        this.meshs.traverse((child: any) => {
            child.castShadow = true;
            child.receiveShadow = false;
            if (child.isMesh) {
                child.material = new THREE.MeshToonMaterial({ map: child.material.map });
            }
        });

        const scale = 0.024;
        this.meshs.children[0].scale.set(scale, scale, scale);
        this.meshs.children[0].position.set(0, 0, 0);
    }

    private setupAnimations(gltf: GLTF) {
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        const findClip = (name: string) => gltf.animations.find((clip) => clip.name == name);

        this.clips.set(Ani.Idle, findClip("ZombieIdle"));
        this.clips.set(Ani.Run, findClip("Walking"));
        this.clips.set(Ani.Punch, findClip("ZombieAttack"));
        this.clips.set(Ani.MonBiting, findClip("ZombieBiting"));
        this.clips.set(Ani.Dying, findClip("ZombieDying"));
        this.clips.set(Ani.MonScream, findClip("ZombieScream"));
    }

    private async loadExtraAnimations() {
        await this.LoadAnimation("assets/monster/Zombie_Neck_Bite.fbx", Ani.MonBiteNeck);
        await this.LoadAnimation("assets/monster/Zombie_Agonizing.fbx", Ani.MonAgonizing);
        await this.LoadAnimation("assets/monster/Running_Crawl.fbx", Ani.MonRunningCrawl);
        await this.LoadAnimation("assets/monster/zombie_headbutt.fbx", Ani.MonHurt);
    }

    // 자식 클래스에서 오버라이드하여 사용할 메서드 (기본은 빈 동작)
    protected async onCustomSetup(): Promise<void> {}

    // 공통 유틸리티: 특정 뼈대에 객체 부착
    protected attachToBone(boneName: string, object3D: THREE.Object3D, scale: number, position: THREE.Vector3) {
        if (this.meshs == undefined) throw new Error("meshs is undefined");
        const bone = this.meshs.getObjectByName(boneName);
        if (bone) {
            object3D.scale.set(scale, scale, scale);
            object3D.position.copy(position);
            bone.add(object3D);
        } else {
            console.warn(`Bone ${boneName} not found.`);
        }
    }

    GetSize(mesh?: THREE.Group): THREE.Vector3 {
        if (mesh) this.meshs = mesh;
        if (this.meshs == undefined) return new THREE.Vector3(0,0,0);
        if (this.size) return this.size;

        // children[0] 기준으로 박스 계산 (원본 코드 유지)
        const target = this.meshs.children.length > 0 ? this.meshs.children[0] : this.meshs;
        const bbox = new THREE.Box3().setFromObject(target);

        this.size = bbox.getSize(new THREE.Vector3());
        this.size.x = Math.ceil(this.size.x);
        this.size.y *= 1.1;
        this.size.z = Math.ceil(this.size.z);
        return this.size;
    }
}

// 1. 일반 좀비
export class ZombieFab extends BaseZombieFab {
    get Id() { return Char.CharMonZombie; }
    // 추가 작업 없음, onCustomSetup 구현 불필요
}

// 2. 할로윈 좀비 (호박)
export class ZombieHallowFab extends BaseZombieFab {
    get Id() { return Char.CharMonZombieHallow; }

    protected async onCustomSetup() {
        // FBX 로더 사용
        const pumpkinGroup = await this.loader.FBXLoader.loadAsync("assets/kaykit/halloween/fbx/pumpkin_orange_jackolantern.fbx");
        
        this.attachToBone(
            "mixamorigHeadTop_End", 
            pumpkinGroup, 
            0.4, 
            new THREE.Vector3(0, -35, 0)
        );
    }
}

// 3. 폭탄 좀비
export class ZombieBombFab extends BaseZombieFab {
    // 원본 코드에 중복된 ID가 있었으므로, 별도의 ID가 있다면 수정 필요
    get Id() { return Char.CharMonZombieBomb; /* 혹은 Char.CharMonZombieBomb */ }

    protected async onCustomSetup() {
        // GLTF 로더 사용 (Load 프로퍼티가 GLTFLoader라고 가정)
        const bombGltf = await this.loader.Load.loadAsync("assets/ultimatepack/LevelandMechanics/Bomb.gltf");
        
        this.attachToBone(
            "mixamorigHeadTop_End", 
            bombGltf.scene, 
            40, 
            new THREE.Vector3(0, -15, 0)
        );
    }
}