import * as THREE from 'three';

export default class Ground {
    obj: THREE.Mesh
    width = 0
    height = 0
    planSize = 256
    blendMapSize = 0
    blendMapData: Uint8Array
    blendMap: THREE.DataTexture
    geometry: THREE.PlaneGeometry
    constructor(private setNonGlow: Function, {
        color = new THREE.Color(0xA6C954),
        width = 1024 * 3, height = 1024 * 3, planeSize = 256,
    } = {}) {
        this.width = width
        this.height = height
        this.blendMapSize = width * height
        this.planSize = planeSize
        this.setNonGlow = setNonGlow
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
        const shaderMaterial = new THREE.MeshStandardMaterial({
            map: this.blendMap,
            side: THREE.DoubleSide,
            transparent: true,
        });

        // Mesh 생성 및 추가
        const ground = new THREE.Mesh(this.geometry, shaderMaterial);

        ground.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        ground.position.setY(-.01)
        ground.receiveShadow = true
        this.setNonGlow(ground)
        this.obj = ground
    }

    LoadMap(texture: THREE.DataTexture, geometry: THREE.PlaneGeometry) {
        this.blendMap = texture
        this.blendMapData = new Uint8Array(texture.image.data.buffer)
        this.width = texture.image.width
        this.height = texture.image.height
        this.blendMapSize = this.width * this.height
        this.geometry = geometry
        this.blendMap.needsUpdate = true;

        const shaderMaterial = new THREE.MeshStandardMaterial({
            map: this.blendMap,
            side: THREE.DoubleSide,
            transparent: true,
        });

        // Mesh 생성 및 추가
        const ground = new THREE.Mesh(this.geometry, shaderMaterial);
        ground.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전
        ground.position.setY(-.01)
        ground.receiveShadow = true
        this.setNonGlow(ground)
        this.obj = ground
    }
}