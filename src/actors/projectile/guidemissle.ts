/*
import * as THREE from 'three';
// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Missile
const missileGeometry = new THREE.ConeGeometry(0.1, 0.5, 32);
const missileMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const missile = new THREE.Mesh(missileGeometry, missileMaterial);
scene.add(missile);

// Target (enemy)
const targetGeometry = new THREE.SphereGeometry(0.2, 32, 32);
const targetMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const target = new THREE.Mesh(targetGeometry, targetMaterial);
target.position.set(3, 0, -5); // Set target at a distance
scene.add(target);

camera.position.z = 5;

let missileVelocity = new THREE.Vector3(0, 0.05, 0); // Initial upward velocity
let acceleration = 0.001; // Initial acceleration
const maxSpeed = 0.2; // Maximum speed missile can reach

function animate() {
    requestAnimationFrame(animate);

    // Calculate direction to the target
    const targetDirection = new THREE.Vector3().subVectors(target.position, missile.position).normalize();

    // Gradually adjust missile direction towards the target
    missileVelocity.lerp(targetDirection, 0.02); // Adjust missile direction smoothly

    // Accelerate missile towards target
    if (missileVelocity.length() < maxSpeed) {
        missileVelocity.multiplyScalar(1 + acceleration); // Increase speed gradually
    }

    // Update missile position
    missile.position.add(missileVelocity);

    // Rotate missile to face the target
    missile.lookAt(target.position);

    renderer.render(scene, camera);
}

animate();
*/

