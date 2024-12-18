/*
import * as THREE from 'three';
import { IViewer } from "@Models/iviewer";
import { Loader } from "@Loader/loader"

export class DropMesh implements IViewer {
    constructor(
        private loader: Loader
    ) {
    }
    update() { 
    }
}

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Item box
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const itemBox = new THREE.Mesh(geometry, material);
scene.add(itemBox);

// Ground
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = - Math.PI / 2;
ground.position.y = -1;
scene.add(ground);

camera.position.z = 5;

let velocity = new THREE.Vector3(0, 0.2, 0); // Initial velocity
const gravity = new THREE.Vector3(0, -0.01, 0); // Gravity
let bounces = 0; // Bounce count

function animate() {
    requestAnimationFrame(animate);

    // Apply gravity to velocity
    velocity.add(gravity);

    // Update item position
    itemBox.position.add(velocity);

    // Bounce effect
    if (itemBox.position.y <= 0) {
        itemBox.position.y = 0; // Reset to ground level
        velocity.y = -velocity.y * 0.7; // Reverse velocity with damping
        bounces++;

        // Stop after 2-3 bounces
        if (bounces >= 3) {
            velocity.y = 0;
        }
    }

    renderer.render(scene, camera);
}

animate();

 */
