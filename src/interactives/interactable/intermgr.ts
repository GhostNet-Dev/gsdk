import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import { Char } from "@Glibs/types/assettypes";
import { InteractableObject } from "./interactable";
import { Loader } from "@Glibs/loader/loader";
import IEventController from "@Glibs/interface/ievent";
import { ComponentRecord, interactableDefs } from "@Glibs/types/interactivetypes";
import { CooldownComponent, DurabilityComponent, IInteractiveComponent, RewardComponent, TrapComponent } from "./interobjs/intcomponent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { InterTree } from "./interobjs/intertree";
import { IAsset } from "@Glibs/interface/iasset";
import { TriggerType } from "@Glibs/types/actiontypes";
import { Obstacles } from "./interobjs/obstacle";
import { Campfire } from "./interobjs/campfire";

export default class InteractiveManager implements IWorldMapObject {
    objs: InteractableObject[] = []
    get Type() { return MapEntryType.Interactive }
    constructor(
        private loader: Loader,
        private eventCtrl: IEventController
    ) { 
        eventCtrl.RegisterEventListener(EventTypes.DoInteraction, (id: string, type: TriggerType) => {
            this.objs.forEach(inter => {
                if(inter.interactId == id) inter.trigger(type)
            })
            
        })
        eventCtrl.RegisterEventListener(EventTypes.CheckInteraction, (obj: IPhysicsObject) => {
            obj.Meshs.updateMatrixWorld(true); // 월드 행렬 업데이트
            const myDirection = new THREE.Vector3(0, 0, 1); // Mesh의 로컬 Z축
            obj.Meshs.getWorldDirection(myDirection); // 월드 좌표계에서의 앞 방향을 얻음 (자동 정규화됨)
            // 4. 시야각 설정 (Degrees)
            const fovDegrees = 90; // 90도 시야각
            const halfFovRadians = THREE.MathUtils.degToRad(fovDegrees / 2); // 라디안으로 변환

            this.objs.forEach(inter => {
                if (obj.Pos.distanceTo(inter.position) > 6) {
                    if(inter.isActive) inter.disable()
                    return
                }

                const result = this.isLookingAt(obj.Pos, myDirection, inter.position, halfFovRadians)
                if (result) {
                    inter.tryInteract(obj)
                } else {
                    if(inter.isActive) inter.disable()
                }
            })
        })
    }
    async Create({
        type = Char.None,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 1,
        boxType = "none",
    }) {
        const asset = this.loader.GetAssets(type)
        const uniqId = type.toString() + position.x + position.y + position.z
        const inter = this.createByType(boxType, uniqId, asset)
        await inter.Loader(position, rotation, scale, uniqId)
        this.objs.push(inter)
        return inter
    }
    createByType(type: string, uniqId: string, asset: IAsset): InteractableObject {
        let ret: InteractableObject
        switch (type) {
            case "tree":
                ret = new InterTree(uniqId, interactableDefs.Tree, asset, this.eventCtrl);
                break;
            case "obstacle":
                ret = new Obstacles(uniqId, interactableDefs.Obstacle, asset, this.eventCtrl)
                break
            case "campfire":
                ret = new Campfire(uniqId, interactableDefs.Campfire, this.eventCtrl)
                break
            default:
                ret = new InterTree(uniqId, interactableDefs.Tree, asset, this.eventCtrl);
                break;
        }
        return ret
    }
    Delete(...param: any) {
    }
    applyComponents(obj: InteractableObject, defs: ComponentRecord) {
        Object.entries(defs).forEach(([name, def]) => {
            let component: IInteractiveComponent | undefined;

            switch (def.type) {
                case "cooldown":
                    component = new CooldownComponent(def.cooldownTime);
                    break;
                case "durability":
                    component = new DurabilityComponent(def.durability);
                    break;
                case "trap":
                    component = new TrapComponent(def.damage);
                    break;
                case "reward":
                    component = new RewardComponent(def.reward);
                    break;
                default:
                    console.warn(`⚠️ 알 수 없는 컴포넌트 타입: ${def.type}`);
            }

            if (component) {
                obj.addComponent(component);
            }
        });
    }
    isLookingAt(myPosition: THREE.Vector3, myDirection: THREE.Vector3, targetPosition: THREE.Vector3, halfFovRadians: number) {
        // 1. 나에게서 상대방을 향하는 벡터 계산
        const toTargetVector = new THREE.Vector3().subVectors(targetPosition, myPosition);

        // 2. 벡터 정규화 (방향만 필요하므로)
        toTargetVector.normalize();

        // 3. 나의 방향 벡터와 상대방을 향하는 벡터 간의 내적 계산
        const dotProduct = myDirection.dot(toTargetVector);

        // 4. 내적 값을 이용하여 각도 계산 (코사인 역함수)
        // dotProduct는 -1 (완전히 반대) ~ 1 (완전히 같은 방향) 사이의 값을 가집니다.
        // clamp를 사용하여 부동 소수점 오차로 인한 acos( > 1 또는 < -1 ) 에러 방지
        const angleRadians = Math.acos(THREE.MathUtils.clamp(dotProduct, -1, 1));

        // 5. 계산된 각도가 시야각의 절반보다 작은지 확인
        return angleRadians < halfFovRadians;
    }
}