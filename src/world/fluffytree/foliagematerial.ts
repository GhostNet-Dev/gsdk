import * as THREE from 'three';
import { TextureLoader } from 'three';
import shader from "./shader/tree"
import CustomShaderMaterial from "three-custom-shader-material/vanilla"

// FoliageMaterial 클래스
export class FoliageMaterial {
    private windTime: number = 0.0;
    private windSpeed: number = 0.5;
    m: CustomShaderMaterial

    constructor(alphaMapUrl: string, color: string) {
        const alphaMap = new TextureLoader().load(alphaMapUrl);
        //const alphaMap = new TextureLoader().load('assets/texture/foliage/flat/sprite_0048.png');

        // 쉐이더 유니폼 설정
        const uniforms = {
            u_effectBlend: { value: 1.0 },
            u_inflate: { value: 0.0 },
            u_scale: { value: 1.0 },
            u_windSpeed: { value: 1.0 },
            u_windTime: { value: 0.0 },
        };

        this.m = new CustomShaderMaterial({
            alphaMap: alphaMap,
            alphaTest: 0.5,
            baseMaterial: THREE.MeshStandardMaterial,
            color:  new THREE.Color(color).convertLinearToSRGB(),
            uniforms: uniforms,
            vertexShader: shader.treeShader,
            shadowSide: THREE.FrontSide,
        })
    }

    // 프레임마다 호출될 함수
    update(delta: number) {
        this.windTime += this.windSpeed * delta;
        this.m.uniforms.u_windTime.value = this.windTime;
    }
}

