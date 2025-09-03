import * as THREE from "three";
import { IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class FluffyAction implements IActionComponent, ILoop {
    LoopId: number = 0
    id = "fluffy"
    shader: any[] = []

    constructor(private eventCtrl: IEventController) { }

    activate(target: IActionUser) {
        const meshs = target.objs
        if (!meshs) return
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)


        const box = new THREE.Box3().setFromObject(meshs);
        const windStrength = 0.4;
        const windFrequency = 1.0;
        const maxHeight = box.max.y; // 나무 모델의 최대 높이

        meshs.traverse((child: any) => {
             if (child.isMesh && child.material.isMeshStandardMaterial) {
                // child.material = child.material.clone();
                const originalOnBeforeCompile = child.material.onBeforeCompile;
                child.material.onBeforeCompile = (shader: any) => {
                    if(originalOnBeforeCompile) originalOnBeforeCompile(shader)

                    shader.uniforms.fluffyTime = { value: 0 };
                    shader.uniforms.fluffyWindStrength = { value: windStrength };
                    shader.uniforms.fluffyWindFrequency = { value: windFrequency };
                    shader.uniforms.fluffyMaxheight = { value: maxHeight };

                    shader.vertexShader = shader.vertexShader
                        .replace('void main() {', `
                        uniform float fluffyTime;
                        uniform float fluffyWindStrength;
                        uniform float fluffyWindFrequency;
                        uniform float fluffyMaxheight;
                        void main() {
                        `)
                                            .replace('#include <begin_vertex>', `
                        #include <begin_vertex>
                        //vec3 transformed = vec3(position);

                        // 흔들림 세기 (위로 갈수록 강해짐)
                        {
                        float strength = pow(clamp(position.y / fluffyMaxheight, 0.0, 1.0), 2.0);

                        // 흔들림 계산 (위상차 줄이고 방향 통일)
                        float sway = sin(fluffyTime * fluffyWindFrequency + position.x * 0.5) * fluffyWindStrength * strength;

                        transformed.x += sway;
                        }

                        `);

                    // render loop에서 shader.uniforms.time 업데이트 필요
                    child.material.userData.shader = shader;
                    this.shader.push(shader)
                };
                child.material.needsUpdate = true;
            }
        });
    }
    timer = 0
    update(delta: number): void {
        if (this.shader.length > 0) {
            this.timer += delta
            this.shader.forEach((s) => s.uniforms.fluffyTime.value = this.timer)
        }   
    }
}