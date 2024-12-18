import { FlameSphere } from "../object/flameSphere";
import { FlameAnimation } from "./flameAnimation";
import { FlareParticle } from "../object/flareParticle";
import { Controller } from "../controller";

class ExplosionController {

  private objs: FlameAnimation[] = [];
  private objectPool: number[] = [];
  private spawnTime = 0;

  private flareParticle?: FlareParticle;

  private currentCol: any = {};
  constructor(
    private ctrl: Controller, 
    private scene: THREE.Group
  ) { }

  public init() {

    this.objs = [];
    this.objectPool = [];
    this.spawnTime = 0;
    this.flareParticle = new FlareParticle(this.ctrl, this.scene);

    this.spawnNewFlame();

    this.ctrl.attachEvent(this.ctrl.DARK_COLOR, (value: any) => {
      for(let i=0; i<this.objs.length; i++) {
        this.currentCol['colDark'] = value;
        this.objs[i].instance.setColor({ colDark: value });
      }
    });

    this.ctrl.attachEvent(this.ctrl.NORMAL_COLOR, (value: any) => {
      for(let i=0; i<this.objs.length; i++) {
        this.currentCol['colNormal'] = value;
        this.objs[i].instance.setColor({ colNormal: value });
      }
    });

    this.ctrl.attachEvent(this.ctrl.LIGHT_COLOR, (value: any) => {
      for(let i=0; i<this.objs.length; i++) {
        this.currentCol['colLight'] = value;
        this.objs[i].instance.setColor({ colLight: value });
      }
    });

    this.reset();
  }

  public reset() {
    for(let i=0; i<this.objs.length; i++) {
      this.objs[i].reset();
      this.scene.remove(this.objs[i].instance.getMesh());
    }
    this.objectPool = [];
    this.objs = [];

    this.flareParticle?.reset();
  }

  private spawnNewFlame() {
    let i = this.objs.length;

    if (this.objectPool.length > 0) {
      i = this.objectPool.shift() as number;
      this.objs[i].instance.getMesh().visible = true;
      this.objs[i].instance.setColor(this.currentCol);
      this.objs[i].reset();
    } else {
      let obj = new FlameAnimation(
        this.ctrl,
        new FlameSphere(Math.random() * 5 + 8),
        Math.random() * 7 - 4,
        Math.random() * 7 - 4,
        Math.random() * 0.4 + 0.35,
        Math.random() * 0.4 + 0.3
      );
      obj.instance.setColor(this.currentCol);
      this.objs.push(obj);
      this.scene.add(this.objs[i].instance.getMesh());
    }
  }

  public update(deltaTime: number) {

    let timeScale = this.ctrl.getParams().TimeScale;
    this.spawnTime += deltaTime * timeScale;
    if(this.spawnTime > 200) {
      while(this.spawnTime > 200) this.spawnTime -= 200;
      this.spawnNewFlame();
    }

    for(let i=0; i<this.objs.length; i++) {
      if(this.objs[i].isDie()) {
        if(this.objs[i].inPolling()) continue;

        this.objs[i].setInPolling(true);
        this.objs[i].instance.getMesh().visible = false;
        this.objectPool.push(i);
      } else {
        this.objs[i].update(deltaTime);
      }
    }

    this.flareParticle?.update(deltaTime * timeScale);
  }
  
}

export { ExplosionController }