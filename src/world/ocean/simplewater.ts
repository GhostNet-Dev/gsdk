import { IWorldMapObject, MapEntryType, OceanData } from '@Glibs/types/worldmaptypes';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector'


export class SimpleWater implements IWorldMapObject {
    Type: MapEntryType = MapEntryType.SimpleWater
    meshs = new THREE.Group()
    waterReflector?: Reflector
    waterGeometry?: THREE.PlaneGeometry
    constructor(private scene: THREE.Scene) {
    }
    Create(...param: any) {
        this.waterGeometry = new THREE.PlaneGeometry(1024, 1024);
        const pixel = (window.devicePixelRatio >= 2) ? window.devicePixelRatio / 4 : window.devicePixelRatio / 2
        this.waterReflector = new Reflector(this.waterGeometry, {
            clipBias: .01,
            textureWidth: window.innerWidth * pixel,
            textureHeight: window.innerHeight * pixel,
        })
        this.waterReflector.rotation.x = -Math.PI * 0.5;
        this.waterReflector.position.y = -1
        this.meshs.add(this.waterReflector)
        this.meshs.userData.mapObj = this
        return this.meshs
    }
    Delete(...param: any) {
        return this.meshs
    }
    Load(data: OceanData): void {
        console.log("Load Ocean")
        const mesh = this.Create()
        const p = data.position
        const r = data.rotation
        const s = data.scale
        mesh.position.set(p.x, p.y, p.z)
        mesh.rotation.set(r.x, r.y, r.z)
        mesh.scale.set(s, s, s)
        this.scene.add(mesh)
    }
    Save() {
        const r = this.meshs.rotation
        const data: OceanData = {
            position: { ...this.meshs.position },
            rotation: { x: r.x, y: r.y, z: r.z },
            scale: this.meshs.scale.x,
        }
        return data
    }
    Dispose() {
        if (!this.waterReflector || !this.waterGeometry) return
        if (this.scene.children.indexOf(this.meshs) > -1) {
            this.scene.remove(this.meshs)
            this.waterReflector.dispose()
            this.waterGeometry.dispose()
        } else {
            throw new Error("bug!");
        }
    }
}