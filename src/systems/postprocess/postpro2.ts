import * as THREE from 'three'
import { EffectComposer, EffectPass, RenderPass,
    BloomEffect, SelectiveBloomEffect, ShaderPass, OutlineEffect, SMAAEffect, BlendFunction, SMAAPreset, EdgeDetectionMode
} from 'postprocessing'
import { IPostPro } from './postpro'


export class Postpro2 implements IPostPro {
    composer: EffectComposer
    outlinePass: OutlineEffect
    bloomeffect: SelectiveBloomEffect
    constructor(
        private scene: THREE.Scene,
        private camera: THREE.Camera,
        private renderer: THREE.WebGLRenderer,
        private object: THREE.Mesh
    ) {
        this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType })
        this.outlinePass = new OutlineEffect(this.scene, this.camera, {
            width: window.innerWidth, height: window.innerHeight, edgeStrength: 2.5, hiddenEdgeColor: 0,
        })
        this.bloomeffect = new SelectiveBloomEffect(this.scene, this.camera, {
            blendFunction: BlendFunction.ADD,
            intensity: 2, mipmapBlur: true, luminanceThreshold: 0.4, luminanceSmoothing: 0.2,
            radius: 0.618
        })
        this.bloomeffect.luminancePass.enabled = true
        this.bloomeffect.inverted = true
        this.bloomeffect.ignoreBackground = true
        this.bloomeffect.selection.toggle(object)
        const shader = new ShaderPass(new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
            }
        }), "baseTexture")
        const smaa = new SMAAEffect()
        //smaa.edgeDetectionMaterial.setEdgeDetectionThreshold(0.01)

        this.composer.addPass(new RenderPass(this.scene, this.camera))
        //this.composer.addPass(new EffectPass(this.camera, this.bloomeffect))
        this.composer.addPass(new EffectPass(this.camera, this.outlinePass))
        this.composer.addPass(new EffectPass(this.camera, smaa))
    }
    render(delta: number) {
        this.renderer.clearDepth()
        this.composer.render(delta)
    }
    resize(): void {
        
    }
    setGlow(target: THREE.Mesh) {
    }
    setNonGlow(target: THREE.Mesh) {
    }
}