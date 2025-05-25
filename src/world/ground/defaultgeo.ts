import * as THREE from 'three';
import { gui } from '@Glibs/helper/helper';
import GUI from 'lil-gui';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { GeometryGroundData, IWorldMapObject, MapEntryType } from '@Glibs/types/worldmaptypes';

export default class GeometryGround implements IWorldMapObject {
    Type: MapEntryType = MapEntryType.GeometryGround
    meshs = new THREE.Group()
    currColor = 0
    private material: THREE.MeshStandardMaterial;
    private mesh?: THREE.Mesh;
    private wireMaterial?: THREE.MeshBasicMaterial;
    private wireMesh?: THREE.Mesh;
    private gui: GUI;
    private geometryFolder?: GUI;
    private debugMode = true
    private currType = ""
    private geometryTypes: Record<string, any> = {
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
        ExtrudeGeometry: {
            steps: 2, depth: 32, bevelEnabled: true, bevelThickness: 3, bevelSize: 2,
            bevelOffset: 1, bevelSegments: 2, width: 1, height: 18
        }
    };
    constructor(private scene: THREE.Scene, private eventCtrl: IEventController, { debug = true } = {}) {
        this.debugMode = debug
        this.material = new THREE.MeshStandardMaterial({ color: 0xffcc66 });
        if (debug) this.wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

        this.gui = gui;
    }
    Create() {
        this.initGUI()
        this.Show()
        return this.meshs
    }
    CreateDone() {
        this.Hide()
        return this.meshs
    }
    Delete(): void {
        this.Dispose()
    }
    Show() {
        this.gui.show()
        this.initGUI()
    }
    Hide() {
        this.gui.hide()
        if (this.debugMode) this.scene.remove(this.wireMesh!);
    }
    Dispose() {
        this.scene.remove(this.meshs);
        if (this.debugMode) this.scene.remove(this.wireMesh!);
    }
    Load(data: GeometryGroundData): void {
        this.LoadData(data.data.type, data.data.value)
        this.meshs.position.set(data.position.x, data.position.y, data.position.z)
        this.meshs.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z)
        this.meshs.scale.set(data.scale.x, data.scale.y, data.scale.z)
        this.scene.add(this.meshs)
    }
    Save() {
        const t = this.meshs
        const gData: GeometryGroundData = {
            data: this.GetData(),
            position: { x: t.position.x, y: t.position.y, z: t.position.z },
            rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
            scale: t.scale,
            color: this.currColor
        }
        return gData
    }

    private initGUI() {
        const shapeOptions = { shape: 'BoxGeometry', color: this.material.color.getHex() };
        this.createGeometry(shapeOptions.shape, this.geometryTypes[shapeOptions.shape])

        this.gui.add(shapeOptions, 'shape', Object.keys(this.geometryTypes)).onChange((value: any) => {
            this.createGeometry(value, this.geometryTypes[value]);
        });
        this.gui.addColor(shapeOptions, 'color').onChange((value: any) => {
            this.material.color.setHex(value);
            this.currColor = value
        });
    }
    GetData() {
        return { type: this.currType, value: this.geometryTypes[this.currType] }
    }
    LoadData(type: string, params: any) {
        this.createGeometry(type, params)
    }
    private createGeometry(type: string, params: any) {
        this.currType = type
        if (this.mesh) {
            this.meshs.remove(this.mesh)
            if (this.debugMode) {
                this.meshs.remove(this.wireMesh!);
                this.wireMesh!.geometry.dispose()
            }
            this.mesh.geometry.dispose()
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
            geometry = new THREE.ExtrudeGeometry(shape, param);
        } else {
            geometry = new (THREE as any)[type](...Object.values(params));
        }

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, this.mesh)
        this.meshs.add(this.mesh)
        this.meshs.userData.mapObj = this

        if (this.debugMode) {
            this.wireMesh = new THREE.Mesh(geometry, this.wireMaterial);
            this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, this.wireMesh)
            this.meshs.add(this.wireMesh);
        }

        this.scene.add(this.meshs);

        if (this.geometryFolder) this.geometryFolder.destroy();
        this.geometryFolder = this.gui.addFolder('Parameters');

        Object.keys(params).forEach(key => {
            this.geometryFolder!.add(params, key, 0.1, 10, 1).onChange(() => this.createGeometry(type, params));
        });
        this.geometryFolder.open();
    }
}

