import { gui } from '@Glibs/helper/helper';
import * as THREE from 'three';

export default class ProduceTerrain2 {
    private terrain?: THREE.Mesh;
    private water?: THREE.Mesh;
    private material: THREE.ShaderMaterial;
    private waterMaterial = new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.5,
        ior: 1.333,
        color: '#4db2ff'
    });


    private offset: THREE.Vector2 = new THREE.Vector2(0, 0);
    private noiseIterations = 3;
    private positionFrequency = 0.175;
    private warpFrequency = 6;
    private warpStrength = 1;
    private strength = 10;
    private dragDown = false;
    private prevWorldCoords = new THREE.Vector3();
    private worldCoords = new THREE.Vector3();
    private colorSand = new THREE.Color('#ffe894');
    private colorGrass = new THREE.Color('#85d534');
    private colorSnow = new THREE.Color('#ffffff');
    private colorRock = new THREE.Color('#bfbd8d');
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private screenCoords: THREE.Vector2 = new THREE.Vector2();
    private hover: boolean = false;

    constructor() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uOffset: { value: this.offset },
                uNoiseIterations: { value: this.noiseIterations },
                uPositionFrequency: { value: this.positionFrequency },
                uWarpFrequency: { value: this.warpFrequency },
                uWarpStrength: { value: this.warpStrength },
                uStrength: { value: this.strength },
                uColorSand: { value: this.colorSand.toArray() },
                uColorGrass: { value: this.colorGrass.toArray() },
                uColorSnow: { value: this.colorSnow.toArray() },
                uColorRock: { value: this.colorRock.toArray() }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform vec2 uOffset;
                uniform float uNoiseIterations;
                uniform float uPositionFrequency;
                uniform float uWarpFrequency;
                uniform float uWarpStrength;
                uniform float uStrength;

                float random (vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }

                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    vec2 u = f*f*(3.0-2.0*f);
                    
                    return mix(mix(random(i + vec2(0.0,0.0)), random(i + vec2(1.0,0.0)), u.x),
                               mix(random(i + vec2(0.0,1.0)), random(i + vec2(1.0,1.0)), u.x), u.y);
                }

                void main() {
                    vec3 newPosition = position;
                    vec2 noisePosition = position.xz * uPositionFrequency + uOffset;
                    float elevation = 0.0;

                    for (float i = 1.0; i <= uNoiseIterations; i++) {
                        float scale = i * 2.0;
                        elevation += noise(noisePosition * scale) / scale;
                    }

                    elevation = pow(abs(elevation), 2.0) * uStrength;
                    newPosition.y += elevation;

                    vPosition = newPosition;
                    vNormal = vec3(0.0, 1.0, 0.0); // 기본 법선
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform vec3 uColorSand;
                uniform vec3 uColorGrass;
                uniform vec3 uColorSnow;
                uniform vec3 uColorRock;

                float noise(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }

                void main() {
                    vec3 finalColor;

                    // Snow (노이즈 기반 높이, 가장 먼저 적용하여 다른 색상으로 덮이지 않도록)
                    float snowThreshold = noise(vPosition.xz * 25.0) * 0.1 + 0.45;
                    if (vPosition.y > snowThreshold) {
                        finalColor = uColorSnow;
                    }
                    // Rock (경사가 높은 부분, 눈이 없는 경우에만 적용)
                    else if (dot(vNormal, vec3(0, 1, 0)) < 0.5 && vPosition.y > -0.06) {
                        finalColor = uColorRock;
                    }
                    // Grass (바위가 아닌 경우 적용)
                    else if (vPosition.y > -0.06) {
                        finalColor = uColorGrass;
                    }
                    // Default: Sand
                    else {
                        finalColor = uColorSand;
                    }

                    gl_FragColor = vec4(finalColor, 1.0);
                }

            `,
        });
    }
    CreateTerrain() {
        const geometry = new THREE.PlaneGeometry(100, 100, 500, 500);
        geometry.rotateX(-Math.PI * 0.5);

        this.terrain = new THREE.Mesh(geometry, this.material);
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;
        return this.terrain
    }

    CreateWater() {
        const waterGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
        waterGeometry.rotateX(-Math.PI * 0.5);

        this.water = new THREE.Mesh(waterGeometry, this.waterMaterial);
        this.water.position.y = 0.5;
        return this.water
    }

    SetupGUI() {
        const terrainGui = gui.addFolder('🏔️ Terrain');
        terrainGui.add(this, 'noiseIterations', 0, 10, 1).name('Noise Iterations').onChange((value: any) => this.material.uniforms.uNoiseIterations.value = value);
        terrainGui.add(this, 'positionFrequency', 0, 1, 0.001).name('Position Frequency').onChange((value: any) => this.material.uniforms.uPositionFrequency.value = value);
        terrainGui.add(this, 'strength', 0, 20, 0.001).name('Strength').onChange((value: any) => this.material.uniforms.uStrength.value = value);
        terrainGui.add(this, 'warpFrequency', 0, 20, 0.001).name('Warp Frequency').onChange((value: any) => this.material.uniforms.uWarpFrequency.value = value);
        terrainGui.add(this, 'warpStrength', 0, 2, 0.001).name('Warp Strength').onChange((value: any) => this.material.uniforms.uWarpStrength.value = value);

        const waterGui = gui.addFolder('💧 Water');
        waterGui.add(this.waterMaterial, 'roughness', 0, 1, 0.01);
        waterGui.add(this.waterMaterial, 'ior').min(1).max(2).step(0.001);
        waterGui.addColor({ color: this.waterMaterial.color.getHexString(THREE.SRGBColorSpace) }, 'color').name('color').onChange((value: any) => this.waterMaterial.color.set(value));
    }
    Show() {
        gui.show()
    }
    Hide() {
        gui.hide()
    }

    public onDragStart(worldCoords: THREE.Vector3) {
        this.dragDown = true;
        this.prevWorldCoords.copy(worldCoords);
    }

    public onDragMove(worldCoords: THREE.Vector3) {
        if (this.dragDown) {
            const delta = this.prevWorldCoords.clone().sub(worldCoords);
            this.offset.add(new THREE.Vector2(delta.x, delta.z));
            this.material.uniforms.uOffset.value.set(this.offset.x, this.offset.y);
            this.prevWorldCoords.copy(worldCoords);
        }
    }

    public onDragEnd() {
        this.dragDown = false;
    }
}



