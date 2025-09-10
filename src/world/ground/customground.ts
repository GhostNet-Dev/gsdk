import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise'; // Three.js의 ImprovedNoise 사용
import { IWorldMapObject, MapEntryType } from '../worldmap/worldmaptypes';
import { CustomGroundData } from '@Glibs/types/worldmaptypes';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export default class CustomGround implements IWorldMapObject {
    Type: MapEntryType = MapEntryType.CustomGround
    obj!: THREE.Mesh
    blendMap!: THREE.DataTexture
    shaderMaterial!: THREE.MeshStandardMaterial
    planSize = 256
    width = 1024 * 3;
    height = 1024 * 3;
    blendMapSize = this.width * this.height
    blendMapData!: Uint8Array
    noise = new ImprovedNoise();
    noiseScale = 20.0; // 노이즈의 세기 조정
    noiseStrength = .5
    scale = .5
    radius = 80 / this.scale
    geometry!: THREE.PlaneGeometry
    constructor(private scene: THREE.Scene, private eventCtrl: IEventController, 
        {
            color = new THREE.Color(0xA6C954),
            width = 1024 * 3, height = 1024 * 3, planeSize = 256,
        } = {}
    ) {
        this.Create({ color: color, width: width, height: height, planeSize: planeSize })
    }
    Create({ color = new THREE.Color(0xA6C954), width = 1024 * 3, height = 1024 * 3, planeSize = 256 } = {}) {
        this.width = width
        this.height = height
        this.blendMapSize = width * height
        this.planSize = planeSize
        // 텍스처 크기 설정
        this.blendMapData = new Uint8Array(4 * this.blendMapSize); // RGB 값
        for (let i = 0; i < this.height * this.width * 4;) {
            this.blendMapData[i++] = color.r * 255;
            this.blendMapData[i++] = color.g * 255;
            this.blendMapData[i++] = color.b * 255;
            this.blendMapData[i++] = 255;
        }

        this.blendMap = new THREE.DataTexture(this.blendMapData, this.width, this.height, THREE.RGBAFormat);
        this.blendMap.needsUpdate = true;

        this.geometry = new THREE.PlaneGeometry(this.planSize, this.planSize, this.planSize, this.planSize);
        this.shaderMaterial = new THREE.MeshStandardMaterial({
            map: this.blendMap,
            side: THREE.DoubleSide,
            transparent: true,
        });

        // Mesh 생성 및 추가
        const ground = new THREE.Mesh(this.geometry, this.shaderMaterial);

        ground.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        ground.position.setY(-.01)
        ground.receiveShadow = true
        ground.scale.set(this.scale, this.scale, this.scale)
        ground.userData.mapObj = this
        this.obj = ground
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLandPhysic, this.obj)

        return ground
    }
    Delete(...param: any) {
        return this.obj
    }
    /**
     * Loads a custom ground data.
     * @param data The custom ground data
     */

    Load(data: CustomGroundData, callback?: Function) {
        console.log("Load Custom Ground")
        if (this.obj) {
            this.scene.remove(this.obj)
        }
        const textureData = new Uint8Array(data.textureData);
        const texture = new THREE.DataTexture(textureData, data.textureWidth, data.textureHeight, THREE.RGBAFormat);
        texture.needsUpdate = true;

        // Restore PlaneGeometry
        const geometry = new THREE.PlaneGeometry(data.mapSize, data.mapSize, data.mapSize, data.mapSize);
        const vertices = geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < vertices.length; i++) {
            vertices[i] = data.verticesData[i];
        }
        geometry.attributes.position.needsUpdate = true;
        // this.Create({
        //     width: data.textureWidth,
        //     height: data.textureHeight,
        //     planeSize: data.mapSize,
        // })
        this.LoadMap(texture, geometry)
        const s = data.scale ?? this.scale
        this.obj.scale.set(s, s, s)
        this.scene.add(this.obj)
        callback?.(this.obj, this.Type)
    }
    LoadMap(texture: THREE.DataTexture, geometry: THREE.PlaneGeometry) {
        this.blendMap = texture
        this.blendMapData = new Uint8Array(texture.image.data.buffer)
        this.width = texture.image.width
        this.height = texture.image.height
        this.blendMapSize = this.width * this.height
        this.geometry = geometry
        this.blendMap.needsUpdate = true;

        this.shaderMaterial = new THREE.MeshStandardMaterial({
            map: this.blendMap,
            side: THREE.DoubleSide,
            transparent: true,
        });

        // Mesh 생성 및 추가
        const ground = new THREE.Mesh(this.geometry, this.shaderMaterial);
        ground.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        ground.position.setY(-.01)
        ground.receiveShadow = true
        this.obj = ground
    }
    Save() {
        const geometry = this.geometry
        const map = this.blendMap
        const textureData = Array.from(new Uint8Array(map.image.data.buffer)); // Uint8Array to number array
        const verticesData = Array.from(geometry.attributes.position.array); // Vertex data
        const gData: CustomGroundData = {
            textureData: textureData,
            textureWidth: map.image.width,
            textureHeight: map.image.height,
            verticesData: verticesData,
            mapSize: this.planSize,
            scale: this.scale,
        }
        return gData
    }
    GetColor(uv: THREE.Vector2) {
        const posX = Math.floor(uv.x * this.width);
        const posY = Math.floor(uv.y * this.height);
        const index = (posY * this.width + posX) * 4;
        const r = this.blendMapData[index] / 255
        const g = this.blendMapData[index + 1] / 255
        const b = this.blendMapData[index + 2] / 255
        return new THREE.Color(r, g, b)
    }
    Click(uv: THREE.Vector2) {
        const centerX = Math.floor(uv.x * this.width);
        const centerY = Math.floor(uv.y * this.height);

        // 클릭한 위치 주변에 노이즈를 적용하여 블렌드 맵 업데이트
        for (let y = -this.radius; y <= this.radius; y++) {
            for (let x = -this.radius; x <= this.radius; x++) {

                const posX = centerX + x;
                const posY = centerY + y;

                if (posX < 0 || posX >= this.width || posY < 0 || posY >= this.height) continue;

                // 중심에서의 거리 계산
                const distance = Math.sqrt(x * x + y * y);
                if (distance > this.radius) continue;

                // 노이즈 값을 이용해 경계선에 굴곡 적용
                const noiseValue = this.noise.noise(posX / this.noiseScale, posY / this.noiseScale, 0);
                const distortion = 1.0 + noiseValue * this.noiseStrength;
                const distortedDistance = distance * distortion;

                // 왜곡된 거리 기반 가중치 계산
                const gradient = Math.max(0, 1 - distortedDistance / this.radius);

                // 블렌드 양 계산
                const blendAmount = gradient;

                const index = (posY * this.width + posX) * 4;
                this.blendMapData[index] = Math.min(255, this.blendMapData[index] + blendAmount * 255); // R 채널
                this.blendMapData[index + 1] = Math.min(204, this.blendMapData[index + 1] + blendAmount * 255); // G 채널
                this.blendMapData[index + 2] = Math.min(102, this.blendMapData[index + 2] + blendAmount * 255); // B 채널
                this.blendMapData[index + 3] = 255; // A 채널 (풀의 불투명도)

            }
        }
        this.blendMap.needsUpdate = true;

    }
    ClickColor(uv: THREE.Vector2, color: THREE.Color) {
        const centerX = Math.floor(uv.x * this.width);
        const centerY = Math.floor(uv.y * this.height);
        const r = Math.floor(color.r * 255)
        const g = Math.floor(color.g * 255)
        const b = Math.floor(color.b * 255)

        // 클릭한 위치 주변에 노이즈를 적용하여 블렌드 맵 업데이트
        for (let y = -this.radius; y <= this.radius; y++) {
            for (let x = -this.radius; x <= this.radius; x++) {

                const posX = centerX + x;
                const posY = centerY + y;

                if (posX < 0 || posX >= this.width || posY < 0 || posY >= this.height) continue;

                // 중심에서의 거리 계산
                const distance = Math.sqrt(x * x + y * y);
                if (distance > this.radius) continue;

                // 노이즈 값을 이용해 경계선에 굴곡 적용
                const noiseValue = this.noise.noise(posX / this.noiseScale, posY / this.noiseScale, 0);
                const distortion = 1.0 + noiseValue * this.noiseStrength;
                const distortedDistance = distance * distortion;

                // 왜곡된 거리 기반 가중치 계산
                const blendAmount = Math.max(0, 1 - distortedDistance / this.radius);

                const index = (posY * this.width + posX) * 4;
                this.blendMapData[index] = (blendAmount > 0.5) ? r : this.blendMapData[index]
                this.blendMapData[index + 1] = (blendAmount > 0.5) ? g : this.blendMapData[index + 1]
                this.blendMapData[index + 2] = (blendAmount > 0.5) ? b : this.blendMapData[index + 2]
                this.blendMapData[index + 3] = 255; // A 채널 (풀의 불투명도)

            }
        }
        this.blendMap.needsUpdate = true;
    }
    depth = 3 / this.scale
    falloff = 3 / this.scale
    ClickUpDown(clickPoint: THREE.Vector3, up: boolean = false) {
        // 정점 배열에 접근
        const vertex = this.geometry.attributes.position.array;

        clickPoint.divideScalar(this.scale)

        // 모든 정점을 확인하여 거리 기반으로 깊이 조정
        for (let i = 0; i < vertex.length / 3; i++) {
            const x = vertex[i * 3];
            const z = vertex[i * 3 + 1];
            const y = (up) ? vertex[i * 3 + 2] : 0
            const distance = clickPoint.distanceTo(new THREE.Vector3(x, y, -z)); // 클릭한 위치까지의 거리

            // 최대 깊이를 초과하지 않도록 조정
            if (distance < this.depth) {
                // 거리 비율에 따라 깊이 조정
                const offset = (this.depth - distance) * (this.depth / this.falloff); // 거리 기반 오프셋
                if (up) {
                    vertex[i * 3 + 2] += offset; // Y 좌표 증가
                } else {
                    vertex[i * 3 + 2] -= offset; // Y 좌표 감소
                    if (vertex[i * 3 + 2] < -this.depth) vertex[i * 3 + 2] = -this.depth
                }
            }
        }

        this.geometry.attributes.position.needsUpdate = true; // 변경 사항 업데이트
        this.geometry.computeVertexNormals(); // 법선 재계산
    }
    applyPatternAtUV(uv: THREE.Vector2, pattern: THREE.DataTexture) {
        const patternData = new Uint8Array(pattern.image.data)

        const patternWidth = pattern.image.width;
        const patternHeight = pattern.image.height;

        // 클릭된 UV 좌표의 픽셀 위치를 찾음
        const centerX = Math.floor(uv.x * this.width);
        const centerY = Math.floor(uv.y * this.height);

        for (let y = -this.radius; y <= this.radius; y++) {
            for (let x = -this.radius; x <= this.radius; x++) {
                const targetX = centerX + x;
                const targetY = centerY + y;

                if (targetX < 0 || targetX >= this.width || targetY < 0 || targetY >= this.height) continue;
                // 중심에서의 거리 계산
                const distance = Math.sqrt(x * x + y * y);
                if (distance > this.radius) continue;

                // 노이즈 값을 이용해 경계선에 굴곡 적용
                const noiseValue = this.noise.noise(targetX / this.noiseScale, targetY / this.noiseScale, 0);
                const distortion = 1.0 + noiseValue * this.noiseStrength;
                const distortedDistance = distance * distortion;

                // 왜곡된 거리 기반 가중치 계산
                const gradient = Math.max(0, 1 - distortedDistance / this.radius);

                // 블렌드 양 계산
                const blendAmount = gradient;


                // 기본 텍스처의 픽셀 인덱스
                const baseIndex = (targetY * this.width + targetX) * 4;
                // 패턴 텍스처의 픽셀 인덱스
                const patternIndex = ((targetY % patternHeight) * patternWidth + 
                    (targetX % patternWidth)) * 4;

                // RGBA 값을 복사
                this.blendMapData[baseIndex] = Math.floor(smootherstep(this.blendMapData[baseIndex], patternData[patternIndex], blendAmount));       // R
                this.blendMapData[baseIndex + 1] = Math.floor(smootherstep(this.blendMapData[baseIndex + 1], patternData[patternIndex + 1], blendAmount));       // R; // G
                this.blendMapData[baseIndex + 2] = Math.floor(smootherstep(this.blendMapData[baseIndex + 2], patternData[patternIndex + 2], blendAmount));       // R; // B
            }
        }

        // 텍스처가 변경되었음을 알림
        this.blendMap.needsUpdate = true;
    }
    Dispose() {
        this.shaderMaterial.dispose()
        this.geometry.dispose()
    }
}

function smootherstep(edge0: number, edge1: number, x: number): number {
    // x는 [0, 1] 범위에서 입력됩니다.
    const t = Math.max(0, Math.min(1, x)); // [0, 1] 범위로 클램프
    const smoothed = t * t * t * (t * (t * 6 - 15) + 10); // smootherstep 계산
    // 결과를 edge0과 edge1 사이로 스케일링
    return edge0 + (edge1 - edge0) * smoothed;
}

