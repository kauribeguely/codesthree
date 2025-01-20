import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
document.addEventListener('DOMContentLoaded', () => {



    const container = document.getElementById('threejs-canvas');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    let controls;

    // Load 3D Model
    // const loader = new THREE.GLTFLoader();
    const loader = new GLTFLoader();
    loader.load('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        // Allow rotation/repositioning
        controls = new TransformControls(camera, renderer.domElement);
        controls.attach(model);
        scene.add(controls);

        // Save model position/rotation
        document.getElementById('save-model-data').addEventListener('click', () => {
            const data = {
                position: model.position,
                rotation: model.rotation
            };
            fetch(ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_model_data',
                    model_data: data
                })
            }).then(response => response.json()).then(data => {
                alert('Model data saved!');
            });
        });
    });

    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();


    // Optional: Enable drag interaction with the transform controls
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 't': // Translate mode
                controls.setMode('translate');
                break;
            case 'r': // Rotate mode
                controls.setMode('rotate');
                break;
            case 's': // Scale mode
                controls.setMode('scale');
                break;
        }
    });
});
