import * as THREE from "three";


export class FloatingName extends THREE.Sprite {
  params_: string
  visible_: boolean
  element_: HTMLCanvasElement
  context2d_: CanvasRenderingContext2D | null

  constructor(params: string) {
    const element = document.createElement('canvas') as HTMLCanvasElement;
    const context2d = element.getContext('2d');
    if (context2d == null) {
      super()
    } else {
      context2d.canvas.width = 256;
      context2d.canvas.height = 128;
      context2d.fillStyle = '#FFF';
      context2d.font = "24pt Helvetica";
      context2d.shadowOffsetX = 3;
      context2d.shadowOffsetY = 3;
      context2d.shadowColor = "rgba(0,255,0,0.3)";
      context2d.shadowBlur = 2;
      context2d.textAlign = 'center';
      context2d.fillText(params, 128, 64);

      const map = new THREE.CanvasTexture(context2d.canvas);

      super(
        new THREE.SpriteMaterial({ 
          map: map, color: 0xffffff, fog: false,
          depthTest: false, 
        }));
      this.scale.set(2, 1, 1)
      this.position.y = 2
    }

    this.params_ = params;
    this.visible_ = true;
    this.element_ = element
    this.context2d_ = context2d
  }

  Destroy() {
    this.traverse(c => {
      if (c instanceof THREE.Mesh) {
        if (c.material) {
          let materials = c.material;
          if (!(c.material instanceof Array)) {
            materials = [c.material];
          }
          for (let m of materials) {
            m.dispose();
          }
        }

        if (c.geometry) {
          c.geometry.dispose();
        }
      }
    });
    if (this.parent) {
      this.parent.remove(this);
    }
  }

  InitComponent() {
  }

  OnDeath_() {
    this.Destroy();
  }

  SetText(text: string) {
    if (!this.visible_ || this.context2d_ == null) {
      return;
    }
    this.params_ = text

    this.context2d_.canvas.width = 256;
    this.context2d_.canvas.height = 128;
    this.context2d_.fillStyle = '#FFF';
    this.context2d_.font = "18pt Helvetica";
    this.context2d_.shadowOffsetX = 3;
    this.context2d_.shadowOffsetY = 3;
    this.context2d_.shadowColor = "rgba(0,0,0,0.5)";
    this.context2d_.shadowBlur = 4;
    this.context2d_.textAlign = 'center';
    this.context2d_.fillText(this.params_, 128, 64);

    /*
    const metrics = this.context2d_.measureText(this.params_)
    const fontheight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent

    this.context2d_.strokeStyle = "black"
    this.context2d_.fillStyle = "white"
    this.context2d_.beginPath()
    this.context2d_.roundRect((this.context2d_.canvas.width - metrics.width) / 2, 
      (this.context2d_.canvas.height - fontheight) / 2, 
      metrics.width, fontheight, [5])
    this.context2d_.stroke()
    */

    const map = new THREE.CanvasTexture(this.context2d_.canvas);

    this.material =
      new THREE.SpriteMaterial({ 
        map: map, color: 0xffffff, fog: false,
        depthTest: false, 
      });
    this.scale.set(4, 2, 1)
    this.position.y = 2
    //this.sprite_.position.y += modelData.nameOffset;
    //msg.model.add(this.sprite_);
  }
}
