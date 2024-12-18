import * as THREE from 'three'
import { IPostPro } from './postpro'


export class Postpro3 implements IPostPro {
  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer
  ) {
  }
  resize(): void {
  }
  setGlow(_: THREE.Mesh) {
  }
  setNonGlow(_: THREE.Mesh | THREE.Group) {
  }
  render(delta: number) {
    this.renderer.render(this.scene, this.camera)
  }
}
