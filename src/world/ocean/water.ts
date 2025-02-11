import * as THREE from 'three';
import waterShader from './shader/ocean'
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class Water implements ILoop {
    LoopId = 0
    pixelRatio = this.renderer.getPixelRatio()
    renderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth * this.pixelRatio,
        window.innerHeight * this.pixelRatio
    );
    depthMaterial = new THREE.MeshDepthMaterial();
    water: THREE.Mesh
    waterMaterial: THREE.ShaderMaterial
    constructor (
        eventCtrl: IEventController,
        camera: THREE.PerspectiveCamera,
        private renderer: THREE.WebGLRenderer,
        private scene: THREE.Scene,
        path = "https://hons.ghostwebservice.com/",
    ) {

        const supportsDepthTextureExtension = !!this.renderer.extensions.get('WEBGL_depth_texture')
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.texture.generateMipmaps = false;
        this.renderTarget.stencilBuffer = false;

        if (supportsDepthTextureExtension === true) {
            this.renderTarget.depthTexture = new THREE.DepthTexture(256, 256);
            this.renderTarget.depthTexture.type = THREE.UnsignedShortType;
            this.renderTarget.depthTexture.minFilter = THREE.NearestFilter;
            this.renderTarget.depthTexture.magFilter = THREE.NearestFilter;
        }

        this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
        this.depthMaterial.blending = THREE.NoBlending;
        const loader = new THREE.TextureLoader();

        const noiseMap = loader.load(path + 'assets/texture/gPz7iPX.jpeg');
        const dudvMap = loader.load(path + 'assets/texture/hOIsXiZ.png');

        noiseMap.wrapS = noiseMap.wrapT = THREE.RepeatWrapping;
        noiseMap.minFilter = THREE.NearestFilter;
        noiseMap.magFilter = THREE.NearestFilter;
        dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;
        const waterUniforms = {
            time: {
                value: 0
            },
            threshold: {
                value: 0.1
            },
            tDudv: {
                value: null
            },
            tDepth: {
                value: null
            },
            cameraNear: {
                value: 0
            },
            cameraFar: {
                value: 0
            },
            resolution: {
                value: new THREE.Vector2()
            },
            foamColor: {
                value: new THREE.Color(0xffffff)
            },
            waterColor: {
                value: new THREE.Color(0x14c6a5)
            }
        }
        const waterGeometry = new THREE.PlaneGeometry(256, 256);
        this.waterMaterial = new THREE.ShaderMaterial({
            defines: {
                DEPTH_PACKING: supportsDepthTextureExtension === true ? 0 : 1,
                ORTHOGRAPHIC_CAMERA: 0
            },
            uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib['fog'], waterUniforms]),
            vertexShader: waterShader.vertexShaderWater,
            fragmentShader: waterShader.fragmentShaderWater,
            fog: true
        })

        this.waterMaterial.uniforms.cameraNear.value = camera.near;
        this.waterMaterial.uniforms.cameraFar.value = camera.far;
        this.waterMaterial.uniforms.resolution.value.set(
            window.innerWidth * this.pixelRatio,
            window.innerHeight * this.pixelRatio
        );
        this.waterMaterial.uniforms.tDudv.value = dudvMap;
        this.waterMaterial.uniforms.tDepth.value =
            supportsDepthTextureExtension === true ? this.renderTarget.depthTexture : this.renderTarget.texture;

        this.water = new THREE.Mesh(waterGeometry, this.waterMaterial);
        this.water.rotation.x = -Math.PI * 0.5;
        this.water.position.y = -1
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    time = 0
    update(delta: number) {
        this.time += delta
        this.waterMaterial.uniforms.time.value = this.time;
    }
    WaterRenderBefore() {
        this.water.visible = false
        this.scene.overrideMaterial = this.depthMaterial
        this.renderer.setRenderTarget(this.renderTarget)
    }
    WaterRenderAfter() {
        this.renderer.setRenderTarget(null)
        this.scene.overrideMaterial = null
        this.water.visible = true
    }
}