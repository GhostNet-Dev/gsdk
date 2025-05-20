import * as THREE from "three";
import oceanShader from "./shader/ocean"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IWorldMapObject, MapEntryType, OceanData } from "@Glibs/types/worldmaptypes";

export class Ocean implements ILoop, IWorldMapObject {
    Type: MapEntryType = MapEntryType.Ocean
    LoopId = 0
    _geometry?: THREE.PlaneGeometry
    _shader?: THREE.ShaderMaterial
    mesh?: THREE.Mesh
    meshs = new THREE.Group()
    startTime: number = 0

    //=====// Scene //========================================//     

    constructor(
        private eventCtrl: IEventController,
        private light: THREE.DirectionalLight,
        private path = "https://hons.ghostwebservice.com/",
    ) {
    }
    Create(...param: any) {
        const size = 1200
        this._geometry = new THREE.PlaneGeometry(size, size, size, size);
        this._geometry.rotateX(-Math.PI / 2);
        

        const texture = new THREE.TextureLoader().load(this.path + 'assets/texture/water.png')
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping

        const uniforms = {
            uMap: { type: 't', value: texture },
            uTime: { type: 'f', value: 0.0 },
            uColor: { type: 'f', value: new THREE.Color('#009dc4') },
        };

        this._shader = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: oceanShader.vert,
            fragmentShader: oceanShader.frag,
            vertexColors: true,
            side: THREE.DoubleSide,
        });
        this._shader.onBeforeCompile = (shader) => {
            // 유니폼 추가
            shader.uniforms.lightColor = { value: new THREE.Color(1, 1, 1) }; // 조명 색상
            shader.uniforms.lightIntensity = { value: 1.0 }; // 조명 강도

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                gl_FragColor.rgb *= lightColor * lightIntensity; // 시간에 따라 색상 변화 + 조명 강도 반영
                #include <dithering_fragment>
                `
            );

            this._shader!.userData.shader = shader; // shader 저장 (실시간 업데이트를 위해)
        };

        this.mesh = new THREE.Mesh(this._geometry, this._shader);
        this.mesh.position.y = -2
        this.mesh.scale.multiplyScalar(.1)
        this.meshs.add(this.mesh)
        this.meshs.userData.mapObj = this
        this.startTime = Date.now()
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        return this.meshs
    }
    Delete(...param: any) {
        return this.meshs
    }
    Load(data: OceanData): void {
        const mesh = this.Create()
        const p = data.position
        const r = data.rotation
        const s = data.scale
        mesh.position.set(p.x, p.y, p.z)
        mesh.rotation.set(p.x, p.y, p.z)
        mesh.scale.set(p.x, p.y, p.z)
    }
    Save() {
        const data: OceanData = {
            position: { ...this.meshs.position },
            rotation: { ...this.meshs.rotation },
            scale: this.meshs.scale.x,
        }
        return data
    }
    update() {
        const elapsedTime = Date.now() - this.startTime
        this._shader!.uniforms.uTime.value = elapsedTime * 0.001
        this._shader!.uniformsNeedUpdate = true;

        // 유니폼 값 업데이트
        if (this._shader!.userData.shader) {
            this._shader!.userData.shader.uniforms.lightColor.value.copy(this.light.color);
            this._shader!.userData.shader.uniforms.lightIntensity.value = this.light.intensity;
        }
    }
}

