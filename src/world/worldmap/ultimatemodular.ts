import * as THREE from 'three'
import { Loader } from "@Glibs/loader/loader";
import { Char } from '@Glibs/types/assettypes';
import { IAsset } from '@Glibs/interface/iasset';


export default class UltimateModular {
    assets = new Map<Char, IAsset>()
    platforms: { name: string, value: Char }[] = []
    constructor(private loader: Loader) {
        const platforms = Object.entries(Char)
            .filter(([key, value]) => isNaN(Number(key)) && key.startsWith("UltimateModPlatform"))
            .map(([key, value]) =>({name: key, value}) ); // 숫자 값만 추출

        // 필터링된 enum 값 순회
        platforms.forEach((entry) => {
            this.assets.set(entry.value as Char, this.loader.GetAssets(entry.value as Char))
            this.platforms.push({ name: entry.name, value: entry.value as Char })
        });

    }
    GetModularList() {
        const list: string[] = []
        this.platforms.forEach((entry) => {
            list.push(entry.name.slice("UltimateModPlatform".length))
        })
        return list
    }
    async Create({
        type = Char.UltimateModPlatform2DCubeDirt1x1Center,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 2,
    }) {

    }
}
