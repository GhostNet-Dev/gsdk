import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise"
import grassShader from "./shader/grass"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class ZeldaGrass implements ILoop {
    LoopId = 0
    startTime: number = 0
    grassMaterial?: THREE.ShaderMaterial

    PLANE_SIZE = 30
    BLADE_COUNT = 200_000
    BLADE_WIDTH = .1
    BLADE_HEIGHT = .5
    BLADE_HEIGHT_VARIATION = .3

    mesh: THREE.Mesh
    noise = new ImprovedNoise()

    constructor(eventCtrl: IEventController) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

        const grassTexture = new THREE.TextureLoader().load("assets/texture/grass.jpg")
        const cloudTexture = new THREE.TextureLoader().load("assets/texture/cloud.jpg")
        cloudTexture.wrapT = cloudTexture.wrapS = THREE.RepeatWrapping

        const grassUniforms = {
                textures: { value: [grassTexture, cloudTexture] },
                iTime: { value: 0.0 }
            }
        this.grassMaterial = new THREE.ShaderMaterial({
            uniforms: grassUniforms,
            vertexShader: grassShader.vert,
            fragmentShader: grassShader.frag,
            vertexColors: true,
            side: THREE.DoubleSide
        })
        this.mesh = this.generateField(this.grassMaterial)
        this.mesh.scale.set(1, 1, 1)

        this.startTime = Date.now()
    }

    convertRange(val: number, oldMin: number, oldMax: number, newMin: number, newMax: number) {
        return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
    }

    generateField(grassMaterial: THREE.ShaderMaterial) {
        const positions: any[] = [];
        const uvs: any[] = [];
        const indices: any[] = [];
        const colors: any[] = [];

        for (let i = 0; i < this.BLADE_COUNT; i++) {
            const VERTEX_COUNT = 5;
            const surfaceMin = this.PLANE_SIZE / 2 * -1;
            const surfaceMax = this.PLANE_SIZE / 2;
            const radius = this.PLANE_SIZE / 2;
            const r = radius * Math.sqrt(Math.random())
            const theta = Math.random() * 2 * Math.PI;
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);

            const pos = new THREE.Vector3(x, 0, y);

            const uv = [this.convertRange(pos.x, surfaceMin, surfaceMax, 0, 1),
                 this.convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)];

            const blade = this.generateBlade(pos, i * VERTEX_COUNT, uv);
            blade.verts.forEach(vert => {
                positions.push(...vert.pos);
                uvs.push(...vert.uv);
                colors.push(...vert.color);
            });
            blade.indices.forEach(indice => indices.push(indice));
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        //geom.computeFaceNormals();

        const mesh = new THREE.Mesh(geom, grassMaterial);
        return mesh
    }

    generateBlade(center: THREE.Vector3, vArrOffset: number, uv: any) {
        const MID_WIDTH = this.BLADE_WIDTH * 0.5 * 3;
        const TIP_OFFSET = 0.1;
        const height = this.BLADE_HEIGHT + (Math.random() * this.BLADE_HEIGHT_VARIATION);

        const yaw = Math.random() * Math.PI * 2;
        const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
        const tipBend = Math.random() * Math.PI * 2;
        const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

        // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
        const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((this.BLADE_WIDTH / 2) * 1));
        const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((this.BLADE_WIDTH / 2) * -1));
        const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
        const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
        const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));

        tl.y += height / 2;
        tr.y += height / 2;
        tc.y += height;

        // Vertex Colors
        const black = [0, 0, 0];
        const gray = [0.5, 0.5, 0.5];
        const white = [1.0, 1.0, 1.0];

        const verts = [
            { pos: bl.toArray(), uv: uv, color: black },
            { pos: br.toArray(), uv: uv, color: black },
            { pos: tr.toArray(), uv: uv, color: gray },
            { pos: tl.toArray(), uv: uv, color: gray },
            { pos: tc.toArray(), uv: uv, color: white }
        ];

        const indices = [
            vArrOffset,
            vArrOffset + 1,
            vArrOffset + 2,
            vArrOffset + 2,
            vArrOffset + 4,
            vArrOffset + 3,
            vArrOffset + 3,
            vArrOffset,
            vArrOffset + 2
        ];

        return { verts, indices };
    }

    update(): void {
        const elapsedTime = Date.now() - this.startTime
        if (this.grassMaterial) {
            this.grassMaterial.uniforms.iTime.value = elapsedTime / 2
            this.grassMaterial.uniformsNeedUpdate = true
        }
    }
}