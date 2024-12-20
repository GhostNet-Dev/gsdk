import * as THREE from "three";
import {
    Bezier,
    ColorRange,
    ConstantValue,
    IntervalValue,
    PiecewiseBezier,
    ColorOverLife,
    RenderMode,
    SizeOverLife,
    ParticleSystem,
    RandomColorBetweenGradient,
    ParticleEmitter,
    BatchedParticleRenderer,
    ConeEmitter,
    ApplyForce,
    ApplyCollision,
    Gradient,
} from 'three.quarks';
import { IEffect } from "../ieffector";

export class Trail implements IEffect {
    totalTime = 0;
    refreshIndex = 0;
    refreshTime = 5;
    processFlag = false
    batchRenderer = new BatchedParticleRenderer();
    loaded = false
    target?: THREE.Vector3
    textureloader = new THREE.TextureLoader()   
    texture?: THREE.Texture
    groups: THREE.Object3D[] = []
    obj = new THREE.Group()
    get Mesh() { return this.obj }

    async initTrailEffect(pos: THREE.Vector3, game: THREE.Scene) {
        if(this.loaded) return
        this.texture = await this.textureloader.loadAsync('assets/vfx/textures/texture1.png');
        this.texture.name = 'assets/vfx/textures/texture1.png';

        this.loaded = true
        const group = new THREE.Group();

        const beam = new ParticleSystem({
            duration: 5,
            looping: false,
            startLife: new IntervalValue(3.8, 4.4),
            startSpeed: new IntervalValue(10, 15),
            startSize: new ConstantValue(0.2),
            startColor: new ColorRange(new THREE.Vector4(1, 1, 1, 1), new THREE.Vector4(1, 1, 1, 1)),
            worldSpace: true,

            emissionOverTime: new ConstantValue(0),
            emissionBursts: [
                {
                    time: 0,
                    count: new ConstantValue(100),
                    cycle: 1,
                    interval: 0.01,
                    probability: 1,
                },
            ],

            shape: new ConeEmitter({radius: 0.1, angle: 1}),
            material: new THREE.MeshBasicMaterial({
                map: this.texture,
                blending: THREE.AdditiveBlending,
                transparent: true,
                side: THREE.DoubleSide,
            }),
            renderMode: RenderMode.Trail,
            rendererEmitterSettings: {
                startLength: new ConstantValue(20),
            },
            startTileIndex: new ConstantValue(0),
            uTileCount: 10,
            vTileCount: 10,
            renderOrder: 0,
        });
        beam.emitter.name = 'beam';
        beam.addBehavior(new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.95, 0.75, 0), 0]])));
        //beam.addBehavior(new ColorOverLife(new ColorRange(new Vector4(1, 1, 1, 1), new Vector4(0.6, 0.6, 0.6, 1))));
        beam.addBehavior(
            new ColorOverLife(
                new RandomColorBetweenGradient(
                    new Gradient(
                        [
                            [new THREE.Vector3(1, 0, 0), 0],
                            [new THREE.Vector3(1, 0, 0), 0],
                        ],
                        [
                            [1, 0],
                            [1, 1],
                        ]
                    ),
                    new Gradient(
                        [
                            [new THREE.Vector3(0, 1, 0), 0],
                            [new THREE.Vector3(0, 1, 0), 1],
                        ],
                        [
                            [1, 0],
                            [1, 1],
                        ]
                    )
                )
            )
        );
        beam.addBehavior(new ApplyForce(new THREE.Vector3(0, -1, 0), new ConstantValue(20)));
        beam.addBehavior(
            new ApplyCollision(
                {
                    resolve(pos, normal) {
                        if (pos.y <= -6) {
                            normal.set(0, 1, 0);
                            return true;
                        } else {
                            return false;
                        }
                    },
                },
                0.6
            )
        );
        beam.emitter.rotation.x = -Math.PI / 2;
        group.add(beam.emitter);
        this.batchRenderer.addSystem(beam);

        this.target = pos
        group.visible = true;
        game.add(this.batchRenderer, group)
        this.groups.push(group);
    }

    Start(): void {
        if(this.processFlag || !this.target) return
        this.groups[this.refreshIndex].traverse((object) => {
            if (object instanceof ParticleEmitter) {
                object.system.restart();
            }
        });
        this.groups[this.refreshIndex].position.copy(this.target)
        console.log(this.target)

        this.processFlag = true
    }

    Update(delta: number): void {
        if(!this.processFlag) return
        this.groups.forEach((group) =>
            group.traverse((object) => {
                if (object.userData && object.userData.func) {
                    object.userData.func.call(object, delta);
                }
            })
        );
        this.totalTime += delta;
        if (this.totalTime > this.refreshTime) {
            this.totalTime = 0;
            this.processFlag = false
        }
        if (this.batchRenderer) this.batchRenderer.update(delta);
    }
    Complete(): void {
        
    }
}