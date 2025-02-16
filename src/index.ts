import * as THREE from "three";
import { Canvas } from "./systems/event/canvas";
import { EventController } from "./systems/event/eventctrl";
import Input from "./systems/inputs/input";
import { GPhysics } from "./world/physics/gphysics";
import { GrassMaker } from "./world/grassmin/grassmaker";

export class Index {
    scene = new THREE.Scene()
    eventCtrl = new EventController()
    canvas = new Canvas(this.eventCtrl)
    input = new Input(this.eventCtrl)
    physics = new GPhysics(this.scene, this.eventCtrl)
    grassMaker = new GrassMaker(this.scene, this.eventCtrl)
}