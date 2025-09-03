import * as THREE from "three";
import { IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"
import gsap from "gsap";

export class ShakerAction implements IActionComponent {
    id = "shaker"
    triggerType: TriggerType = "onHit"
    shader: any[] = []

    constructor() { }

    apply(target: IActionUser) {
        const meshs = target.objs
        if (!meshs) return


        const box = new THREE.Box3().setFromObject(meshs);
        const maxHeight = box.max.y; // 나무 모델의 최대 높이

        meshs.traverse((child: any) => {
            if (child.isMesh && child.material.isMeshStandardMaterial) {
                const originalOnBeforeCompile = child.material.onBeforeCompile;
                child.material.onBeforeCompile = (shader: any) => {
                    if(originalOnBeforeCompile) originalOnBeforeCompile(shader)

                    // 기존 유니폼들
                    // shader.uniforms.windFrequency = { value: windFrequency }; // -> 삭제
                    shader.uniforms.shakerMaxheight = { value: maxHeight };
                    // 새로운 유니폼: 충격에 의한 흔들림 강도
                    shader.uniforms.shakerImpactStrength = { value: 0 }; // 초기값 0

                    shader.vertexShader = shader.vertexShader
                        .replace('void main() {', `
                        // uniform float windFrequency; // -> 삭제
                        uniform float shakerMaxheight;
                        uniform float shakerImpactStrength; // 새로운 유니폼 선언
                        void main() {
                        `)
                        .replace('#include <begin_vertex>', `
                        #include <begin_vertex>
                        // vec3 transformed = vec3(position);
                        {
                        // 흔들림 세기 (나무 위로 갈수록 강해짐)
                        // position.y를 shakerMaxHeight로 나누어 0.0에서 1.0 사이의 값으로 정규화
                        // pow(..., 2.0)를 사용하여 아래쪽은 약하고 위쪽은 강하게 만듭니다.
                        float strength = pow(clamp(position.y / shakerMaxheight, 0.0, 1.0), 2.0);

                        // 전체 흔들림 강도: shakerImpactStrength만 사용
                        float totalSwayStrength = shakerImpactStrength; 

                        // 흔들림 계산: 시간, 위치, 그리고 전체 흔들림 강도를 사용
                        // 빈도는 이제 고정값 (예: 10.0) 또는 필요하면 새 유니폼으로 제어
                        // position.x * 0.5는 나무의 각 부분이 약간 다른 위상으로 흔들리게 하여 더 자연스러운 흔들림을 만듭니다.
                        float sway = sin(position.x * 0.5) * totalSwayStrength * strength; // windFrequency 대신 고정값 10.0 사용

                        // 계산된 흔들림을 x축 위치에 적용
                        transformed.x += sway;
                        }
                        `);

                    // 렌더 루프에서 shader.uniforms.time 업데이트 필요 (이 클래스 외부에서)
                    child.material.userData.shader = shader; 
                    this.shader.push(shader); 
                };
                // 재료가 이미 컴파일되었다면 강제로 재컴파일
                // @ts-ignore
                child.material.program = undefined;
                child.material.needsUpdate = true; // 셰이더 변경 사항 적용
            }
        });
    }
    trigger(user: IActionUser, triggerType: TriggerType) {
        if (this.triggerType !== triggerType) return

        this.applyImpactShake()
    }

    /**
     * 나무에 도끼 충격과 같은 강한 흔들림 효과를 적용합니다.
     * GSAP를 사용하여 impactStrength 유니폼을 애니메이션합니다.
     * @param duration 흔들림 효과가 지속되는 시간 (초)
     * @param maxImpactStrength 최대 흔들림 강도 (기존 windStrength에 더해질 값)
     */
    applyImpactShake(duration: number = 1, maxImpactStrength: number = 2) { // 기본값 조정
        this.shader.forEach(shader => {
            // 셰이더에 impactStrength 유니폼이 있는지 확인
            if ("shakerImpactStrength" in shader.uniforms) {
                // GSAP를 사용하여 impactStrength 값을 maxImpactStrength에서 0으로 빠르게 애니메이션합니다.
                gsap.fromTo(shader.uniforms.shakerImpactStrength,
                    { value: maxImpactStrength }, // 시작 값 (최대 충격 강도)
                    {
                        value: 0, // 종료 값 (0으로 돌아와 안정화)
                        duration: duration, // 애니메이션 지속 시간
                        ease: "power2.out", // 빠르게 시작하여 부드럽게 감쇠하는 이징 함수
                        onUpdate: () => {
                            // 애니메이션 중 값을 콘솔에 출력 (디버깅용, 실제 사용 시 제거)
                            // console.log('Impact Strength:', shader.uniforms.impactStrength.value);
                        }
                    }
                );
            }
        });
    }
}