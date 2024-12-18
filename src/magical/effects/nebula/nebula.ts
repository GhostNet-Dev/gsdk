import * as THREE from "three";
import { IEffect } from "../effector";
import Nebula, { SpriteRenderer } from "three-nebula";
import Json from "./json/defaultparticle.json";

export class NebulaVfx implements IEffect {
  processFlag = false
  nebula?: Nebula
  obj = new THREE.Group()
  get Mesh() { return this.obj }

  constructor(private game: THREE.Scene, _: any) {
    return
  }
  Start() {
    this.processFlag = true

    Nebula.fromJSONAsync(Json, THREE).then(loaded => {
      const nebulaRenderer = new SpriteRenderer(this.obj as unknown as THREE.Scene, THREE);
      this.nebula = loaded.addRenderer(nebulaRenderer);
      this.game.add(this.obj)
      const scale = .5
      this.obj.position.set(2, 0, 2)
      this.obj.scale.set(scale, scale, scale)
    });
  }
  Complete() {
    this.processFlag = false
  }
  Update(_: number) {
    if (!this.processFlag) return
    this.nebula?.update();
  }
}
/*
import "reset-css";
import * as THREE from "three";
import getThreeApp from "./three-app";
import json from "./my-particle-system.json";

function animate(nebula, app) {
requestAnimationFrame(() => animate(nebula, app));

nebula.update();
app.renderer.render(app.scene, app.camera);
}

Nebula.fromJSONAsync(json, THREE).then(loaded => {
const app = getThreeApp();
const nebulaRenderer = new SpriteRenderer(app.scene, THREE);
const nebula = loaded.addRenderer(nebulaRenderer);

animate(nebula, app);
});
*/

