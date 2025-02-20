import * as THREE from 'three';
import { gui } from '@Glibs/helper/helper';
import GUI from 'lil-gui';

export class ThreeGeometryViewer {
    private scene: THREE.Scene;
    private material: THREE.MeshStandardMaterial;
    private wireMaterial: THREE.MeshBasicMaterial;
    private mesh?: THREE.Mesh;
    private wireMesh?: THREE.Mesh;
    private gui: GUI;
    private geometryFolder?: GUI;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

        this.gui = gui;
    }

    private initGUI() {
        const shapeOptions = { shape: 'BoxGeometry', color: this.material.color.getHex() };
        const geometryTypes: Record<string, any> = {
            BoxGeometry: { width: 1, height: 1, depth: 1 },
            SphereGeometry: { radius: 1, widthSegments: 32, heightSegments: 32 },
            CylinderGeometry: { radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 32 },
            TorusGeometry: { radius: 1, tube: 0.4, radialSegments: 16, tubularSegments: 100 },
            PlaneGeometry: { width: 2, height: 2, widthSegments: 1, heightSegments: 1 },
            ConeGeometry: { radius: 1, height: 2, radialSegments: 32 },
            CircleGeometry: { radius: 1, segments: 32 },
            DodecahedronGeometry: { radius: 1, detail: 0 },
            IcosahedronGeometry: { radius: 1, detail: 0 },
            OctahedronGeometry: { radius: 1, detail: 0 },
            TetrahedronGeometry: { radius: 1, detail: 0 },
            RingGeometry: { innerRadius: 0.5, outerRadius: 1, thetaSegments: 32 },
            TorusKnotGeometry: { radius: 1, tube: 0.4, tubularSegments: 64, radialSegments: 8, p: 2, q: 3 }
        };

        this.gui.add(shapeOptions, 'shape', Object.keys(geometryTypes)).onChange((value: any) => {
            this.createGeometry(value, geometryTypes[value]);
        });
        this.gui.addColor(shapeOptions, 'color').onChange((value: any) => {
            this.material.color.setHex(value);
        });
    }

    private createGeometry(type: string, params: any) {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.scene.remove(this.wireMesh!);
        }

        let geometry: THREE.BufferGeometry;
        geometry = new (THREE as any)[type](...Object.values(params));

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.wireMesh = new THREE.Mesh(geometry, this.wireMaterial);
        this.scene.add(this.mesh);
        this.scene.add(this.wireMesh);

        if (this.geometryFolder) this.geometryFolder.destroy();
        this.geometryFolder = this.gui.addFolder('Parameters');

        Object.keys(params).forEach(key => {
            this.geometryFolder!.add(params, key, 0.1, 10).onChange(() => this.createGeometry(type, params));
        });
        this.geometryFolder.open();
    }
}

