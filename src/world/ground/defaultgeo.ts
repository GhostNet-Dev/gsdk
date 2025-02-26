import * as THREE from 'three';
import { gui } from '@Glibs/helper/helper';
import GUI from 'lil-gui';

export default class GeometryGround {
    meshs = new THREE.Group()
    private material: THREE.MeshStandardMaterial;
    private mesh?: THREE.Mesh;
    private wireMaterial?: THREE.MeshBasicMaterial;
    private wireMesh?: THREE.Mesh;
    private gui: GUI;
    private geometryFolder?: GUI;
    private debugMode = true
    private callback?: Function
    private removeCallback?: Function

    constructor(private scene: THREE.Scene, { debug = true } = {}) {
        this.debugMode = debug
        this.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        if (debug) this.wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

        this.gui = gui;
    }
    show(add: Function, remove: Function) {
        this.callback = add
        this.removeCallback = remove
        this.gui.show()
        this.initGUI()
    }
    hide() {
        this.gui.hide()
        if (this.debugMode) this.scene.remove(this.wireMesh!);
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
            TorusKnotGeometry: { radius: 1, tube: 0.4, tubularSegments: 64, radialSegments: 8, p: 2, q: 3 },
            ExtrudeGeometry: { steps:2, depth: 32, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, 
                bevelOffset: 1, bevelSegments: 2, width: 1, height: 18
        }
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
            this.meshs.remove(this.mesh)
            if (this.debugMode) this.meshs.remove(this.wireMesh!);
            this.removeCallback?.(this.meshs)
        }

        let geometry: THREE.BufferGeometry;
        if (type == "ExtrudeGeometry") {
            const param = { ...params }
            delete param.width, param.height
            const shape = new THREE.Shape()
            shape.moveTo(0, 0)
            shape.lineTo(0, params.width)
            shape.lineTo(params.height, params.width)
            shape.lineTo(params.height, 0)
            shape.lineTo(0, 0)
            geometry = new (THREE as any)[type](...Object.values(param));
        } else {
            geometry = new (THREE as any)[type](...Object.values(params));
        }

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.meshs.add(this.mesh)

        if (this.debugMode) {
            this.wireMesh = new THREE.Mesh(geometry, this.wireMaterial);
            this.meshs.add(this.wireMesh);
        }

        this.scene.add(this.meshs);
        this.callback?.(this.meshs)

        if (this.geometryFolder) this.geometryFolder.destroy();
        this.geometryFolder = this.gui.addFolder('Parameters');

        Object.keys(params).forEach(key => {
            this.geometryFolder!.add(params, key, 0.1, 10).onChange(() => this.createGeometry(type, params));
        });
        this.geometryFolder.open();
    }
}

