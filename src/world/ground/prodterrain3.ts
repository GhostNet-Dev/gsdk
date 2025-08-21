import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { gui } from '@Glibs/helper/helper';
import { IWorldMapObject, MapEntryType, ProductGroundData } from '@Glibs/types/worldmaptypes';
import { EventTypes } from '@Glibs/types/globaltypes';
import IEventController from '@Glibs/interface/ievent';

export default class ProduceTerrain3 implements IWorldMapObject{
    Type: MapEntryType = MapEntryType.ProductGround
    terrain?: THREE.Mesh;
    private material = this.createMaterial()
    private water?: THREE.Mesh;
    private noise = new ImprovedNoise();
    terrainConfig = {
        heightScale: 1,
        frequency: .3,
        noiseStrength: 1,

        colorSand: '#ffe894',
        colorGrass: '#85d534',
        colorRock: '#bfbd8d',
        colorSnow: '#ffffff',
    };

    constructor(private scene: THREE.Scene, private eventCtrl: IEventController) {
    }
    
    private createMaterial(): THREE.MeshStandardMaterial {
        return new THREE.MeshStandardMaterial({
            vertexColors: true,
        });
    }
    Create({ scale = 50, debug = false } = {}) {
        const mesh = this.CreateTerrain(scale)
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, mesh)
        if (debug) {
            this.SetupGUI()
            this.Show()
        }
        return mesh
    }
    CreateDone() {
        this.Hide()
        return this.terrain!
    }
    Delete() {
       this.Dispose() 
        return this.terrain!
    }
    Load(data: ProductGroundData): void {
        this.terrainConfig = data.data
        const mesh = this.CreateTerrain()
        const p = data.position
        const r = data.rotation
        const s = data.scale
        mesh.position.set(p.x, p.y, p.z)
        mesh.rotation.set(r.x, r.y, r.z)
        mesh.scale.set(s.x, s.y, s.z)
        this.scene.add(mesh)
    }
    Save() {
        const t = this.terrain!
        const gData: ProductGroundData = {
            data: this.terrainConfig,
            position: { x: t.position.x, y: t.position.y, z: t.position.z },
            rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
            scale: t.scale,
        }
        return gData
    }

    CreateTerrain(scale = 50): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(10, 10, 100, 100);
        geometry.rotateX(-Math.PI * 0.5);

        this.modifyTerrainGeometry(geometry);

        const terrain = new THREE.Mesh(geometry, this.material);
        terrain.receiveShadow = true;
        terrain.scale.set(scale, scale, scale)
        this.terrain = terrain
        this.terrain.userData.mapObj = this
        return terrain;
    }

    private modifyTerrainGeometry(geometry: THREE.BufferGeometry): void {
        const positions = geometry.attributes.position;
        const count = positions.count;
        const colors = new Float32Array(count * 3);
        const colorSand = new THREE.Color(this.terrainConfig.colorSand);
        const colorGrass = new THREE.Color(this.terrainConfig.colorGrass);
        const colorRock = new THREE.Color(this.terrainConfig.colorRock);
        const colorSnow = new THREE.Color(this.terrainConfig.colorSnow);

        for (let i = 0; i < count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            // 노이즈에 작은 랜덤 값 추가하여 격자 패턴 감소
            const noiseFactor = this.noise.noise(
                (x + Math.random() * 0.1) * this.terrainConfig.frequency,
                (z + Math.random() * 0.1) * this.terrainConfig.frequency,
                0
            );

            let y = noiseFactor * this.terrainConfig.heightScale * this.terrainConfig.noiseStrength;

            // 부드러운 랜덤 노이즈 추가 (등고선 제거용)
            y += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.2;

            positions.setY(i, y);
            let finalColor = new THREE.Color(colorSand);

            if (y > -0.06) {
                finalColor.lerp(colorGrass, 0.5);
            }
            if (y > 0.5) {
                finalColor.lerp(colorRock, 0.5);
            }
            if (y > 0.8) {
                finalColor.lerp(colorSnow, 0.7);
            }
            
            colors[i * 3] = finalColor.r;
            colors[i * 3 + 1] = finalColor.g;
            colors[i * 3 + 2] = finalColor.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    }
    
    CreateWater(): THREE.Mesh {
        const waterMaterial = new THREE.MeshPhysicalMaterial({
            transmission: 1,
            roughness: 0.5,
            ior: 1.333,
            color: '#4db2ff'
        });
        const water = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 1, 1), waterMaterial);
        water.rotation.x = -Math.PI * 0.5;
        water.position.y = -0.1;
        this.water = water
        return water;
    }
    Dispose() {
        this.Hide()
    }
    SetupGUI(): void {
        if (!this.terrain) return
        const terrainGui = gui.addFolder('🏔️ Terrain');
        terrainGui.add(this.terrainConfig, 'heightScale', 0, 5, 0.01).name('Height Scale').onChange(() => this.updateTerrain());
        terrainGui.add(this.terrainConfig, 'frequency', 0, 5, 0.01).name('Frequency').onChange(() => this.updateTerrain());
        terrainGui.add(this.terrainConfig, 'noiseStrength', 0, 2, 0.1).name('Noise Strength').onChange(() => this.updateTerrain());

        terrainGui.addColor(this.terrainConfig, 'colorSand').name('Sand Color').onChange(() => this.updateTerrain());
        terrainGui.addColor(this.terrainConfig, 'colorGrass').name('Grass Color').onChange(() => this.updateTerrain());
        terrainGui.addColor(this.terrainConfig, 'colorRock').name('Rock Color').onChange(() => this.updateTerrain());
        terrainGui.addColor(this.terrainConfig, 'colorSnow').name('Snow Color').onChange(() => this.updateTerrain());
        

        if (!this.water) return
        const waterGui = gui.addFolder('💧 Water');
        waterGui.add(this.water.material, 'roughness', 0, 1, 0.01);
        waterGui.add(this.water.material, 'ior', 1, 2, 0.001);
        waterGui.addColor({ color: (this.water.material as THREE.MeshPhysicalMaterial).color.getHexString(THREE.SRGBColorSpace) }, 'color')
            .name('Water Color')
            .onChange((value: any) => (this.water!.material as THREE.MeshPhysicalMaterial).color.set(value));
    }
    Show() {
        gui.show()
    }
    Hide() {
        gui.hide()
    }
    private updateTerrain(): void {
        this.modifyTerrainGeometry(this.terrain!.geometry as THREE.BufferGeometry);
    }
}

