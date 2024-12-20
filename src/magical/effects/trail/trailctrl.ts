import * as THREE from "three";
import { IEffect } from "../ieffector";
import { TrailRenderer } from "./trailrenderer";

enum TrailTypes {
    Basic,
    Textured
}

enum TrailShapes {
    Plane,
    Star,
    Circle
}

export class TrailRendererVfx implements IEffect {
    processFlag = false
    trail: TrailRenderer
    baseTrailMaterial: THREE.ShaderMaterial
    texturedTrailMaterial?: THREE.ShaderMaterial
    trailMaterial?: THREE.ShaderMaterial
    options: any
    trailTarget = new THREE.Mesh(
        new THREE.CircleGeometry(5, 32), 
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    )
	obj = new THREE.Group()
    get Mesh() {return this.obj}

    constructor(private scene: THREE.Scene) {
        this.trail = new TrailRenderer(this.obj, false);
        this.trail.setAdvanceFrequency(30);
        this.baseTrailMaterial = TrailRenderer.createBaseMaterial({});
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load("textures/sparkle4.jpg", (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            this.texturedTrailMaterial = TrailRenderer.createTexturedMaterial({});
            this.texturedTrailMaterial.uniforms.trailTexture.value = tex;
            this.setTrailShapeFromOptions();
            this.setTrailTypeFromOptions();
            this.initializeTrail();
        });
    }
    Start() {
        this.processFlag = true
        this.scene.add(this.obj)
    }
    Complete() {
        this.processFlag = false
        this.scene.remove(this.obj)
    }
    Update(_: number) {
        if (!this.processFlag) return
    }

    setTrailTypeFromOptions() {
        switch (this.options.trailType) {
            case TrailTypes.Basic:
                this.trailMaterial = this.baseTrailMaterial;
                break;
            case TrailTypes.Textured:
                this.trailMaterial = this.texturedTrailMaterial;
                break;
        }
    }

    initializeTrail() {
        this.trail.initialize(
            this.trailMaterial ?? this.baseTrailMaterial,
            Math.floor(this.options.trailLength),
            this.options.dragTexture ? 1.0 : 0.0, 0, this.trailHeadGeometry,
            this.trailTarget
        );
        this.updateTrailColors();
        this.updateTrailTextureTileSize();
        this.updateTrailDepthWrite();
        this.trail.activate();
    }

    updateTrailShape() {
        this.setTrailShapeFromOptions();
        this.initializeTrail();
    }

    updateTrailTextureDrag() {
        this.initializeTrail();
    }

    updateTrailTextureTileSize() {
        this.trailMaterial?.uniforms.textureTileFactor.value.set(this.options.textureTileFactorS, this.options.textureTileFactorT);
    }

    updateTrailColors() {
        this.trailMaterial?.uniforms.headColor.value.set(this.options.headRed, this.options.headGreen, this.options.headBlue, this.options.headAlpha);
        this.trailMaterial?.uniforms.tailColor.value.set(this.options.tailRed, this.options.tailGreen, this.options.tailBlue, this.options.tailAlpha);
    }

    updateTrailDepthWrite() {
        if (this.trailMaterial) this.trailMaterial.depthWrite = this.options.depthWrite;
    }
    trailHeadGeometry: THREE.Vector3[] = []
    planePoints: THREE.Vector3[] = []
    circlePoints: THREE.Vector3[] = []
    setTrailShapeFromOptions() {
        switch (this.options.trailShape) {
            case TrailShapes.Plane:
                this.trailHeadGeometry = this.planePoints;
                break;
            case TrailShapes.Circle:
                this.trailHeadGeometry = this.circlePoints;
                break;
        }
    }
    initTrailOptions() {
        this.options = {
            headRed: 1.0,
            headGreen: 0.0,
            headBlue: 0.0,
            headAlpha: 1.0,
            tailRed: 1.0,
            tailGreen: 0.4,
            tailBlue: 1.0,
            tailAlpha: 1.0,
            trailLength: 700,
            trailType: TrailTypes.Textured,
            trailShape: TrailShapes.Star,
            textureTileFactorS: 10.0,
            textureTileFactorT: 0.8,
            dragTexture: true,
            depthWrite: true,
            pauseSim: false
        };
    }
    initTrailHeadGeometries() {
        this.planePoints = [];
        this.planePoints.push(new THREE.Vector3(-14.0, 4.0, 0.0), new THREE.Vector3(0.0, 4.0, 0.0), new THREE.Vector3(14.0, 4.0, 0.0));

        this.circlePoints = [];
        const twoPI = Math.PI * 2;
        let index = 0;
        const scale = 10.0;
        const inc = twoPI / 32.0;

        for (let i = 0; i <= twoPI + inc; i += inc) {
            const vector = new THREE.Vector3();
            vector.set(Math.cos(i) * scale, Math.sin(i) * scale, 0);
            this.circlePoints[index] = vector;
            index++;
        }
    }
}
