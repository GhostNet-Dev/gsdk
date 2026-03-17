import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import { IWorldMapObject, MapEntryType } from '../worldmap/worldmaptypes';
import IEventController from '@Glibs/interface/ievent';

/**
 * 스타크래프트 스타일의 단층 지형 설정을 위한 데이터 구조
 */
export interface SteppedTerrainData {
    width: number;           // 지형 가로 크기
    depth: number;           // 지형 세로 크기
    segments: number;        // 격자 해상도
    stepHeight: number;      // 한 층의 높이
    noiseScale: number;      // 지형 굴곡 빈도
    maxLevel: number;        // 최대 층수
    flatness: number;        // 평지 비율
    seed?: number;           // 랜덤 시드
}

export default class SteppedTerrain implements IWorldMapObject {
    public Type = MapEntryType.SteppedTerrain;
    public Mesh?: THREE.Mesh;
    
    private geometry?: THREE.PlaneGeometry;
    private material?: THREE.MeshStandardMaterial;
    private noiseGen = new ImprovedNoise();
    private heightData?: Float32Array;
    private data?: SteppedTerrainData;

    // 다른 지형 모듈들과 일관성을 위해 생성자 인자 변경
    constructor(private scene: THREE.Scene, private eventCtrl: IEventController) {}

    /**
     * IWorldMapObject.Create 구현
     */
    public Create(data: SteppedTerrainData) {
        this.data = data;
        
        // 1. 지오메트리 및 재질 초기화
        this.geometry = new THREE.PlaneGeometry(
            data.width, data.depth, 
            data.segments, data.segments
        );
        this.geometry.rotateX(-Math.PI / 2);

        this.material = new THREE.MeshStandardMaterial({
            color: '#4a7c44',
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true,
        });

        this.Mesh = new THREE.Mesh(this.geometry, this.material);
        this.Mesh.receiveShadow = true;
        this.Mesh.castShadow = true;

        this.heightData = new Float32Array((data.segments + 1) * (data.segments + 1));
        
        this.generate();
        
        return this.Mesh;
    }

    /**
     * 지형 생성 알고리즘
     */
    private generate() {
        if (!this.geometry || !this.data || !this.heightData) return;

        const positions = this.geometry.attributes.position;
        const { width, depth, segments, stepHeight, noiseScale, maxLevel, flatness } = this.data;
        const seedOffset = this.data.seed !== undefined ? this.data.seed : Math.random() * 1000;

        for (let j = 0; j <= segments; j++) {
            for (let i = 0; i <= segments; i++) {
                const idx = j * (segments + 1) + i;
                const x = (i / segments - 0.5) * width;
                const z = (j / segments - 0.5) * depth;

                let noiseValue = this.noiseGen.noise(
                    (x + seedOffset) * noiseScale, 
                    0, 
                    (z + seedOffset) * noiseScale
                );
                
                let rawLevel = (noiseValue + 1) * 0.5 * maxLevel;
                const currentLevel = Math.floor(rawLevel);
                const fraction = rawLevel - currentLevel;

                let transition = 0;
                if (fraction > flatness) {
                    const t = (fraction - flatness) / (1.0 - flatness);
                    transition = t * t * (3 - 2 * t);
                }

                const finalY = (currentLevel + transition) * stepHeight;
                positions.setY(idx, finalY);
                this.heightData[idx] = finalY;
            }
        }

        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }

    /**
     * IWorldMapObject.CreateDone 구현 (물리 엔진 등록을 위해 메쉬 반환 필수)
     */
    public CreateDone() {
        return this.Mesh;
    }

    /**
     * IWorldMapObject.Delete 구현
     */
    public Delete() {
        if (this.Mesh) {
            this.scene.remove(this.Mesh);
            this.geometry?.dispose();
            this.material?.dispose();
        }
    }

    /**
     * IWorldMapObject.Save 구현
     */
    public Save() {
        return this.data;
    }

    /**
     * IWorldMapObject.Load 구현
     */
    public Load(data: SteppedTerrainData) {
        this.Create(data);
    }

    public getHeightAt(worldX: number, worldZ: number): number {
        if (!this.data || !this.heightData) return 0;
        const { width, depth, segments } = this.data;

        const lx = (worldX / width + 0.5) * segments;
        const lz = (worldZ / depth + 0.5) * segments;

        const i = Math.floor(THREE.MathUtils.clamp(lx, 0, segments - 1));
        const j = Math.floor(THREE.MathUtils.clamp(lz, 0, segments - 1));

        const s = segments + 1;
        const h00 = this.heightData[j * s + i];
        const h10 = this.heightData[j * s + (i + 1)];
        const h01 = this.heightData[(j + 1) * s + i];
        const h11 = this.heightData[(j + 1) * s + (i + 1)];

        const tx = lx - i;
        const tz = lz - j;
        const h0 = h00 * (1 - tx) + h10 * tx;
        const h1 = h01 * (1 - tx) + h11 * tx;

        return h0 * (1 - tz) + h1 * tz;
    }

    public isAreaFlat(centerX: number, centerZ: number, size: { width: number, depth: number }, threshold = 0.1): boolean {
        const halfW = size.width / 2;
        const halfD = size.depth / 2;

        const samples = [
            this.getHeightAt(centerX, centerZ),
            this.getHeightAt(centerX - halfW, centerZ - halfD),
            this.getHeightAt(centerX + halfW, centerZ - halfD),
            this.getHeightAt(centerX - halfW, centerZ + halfD),
            this.getHeightAt(centerX + halfW, centerZ + halfD)
        ];

        const minH = Math.min(...samples);
        const maxH = Math.max(...samples);

        return (maxH - minH) < threshold;
    }
}
