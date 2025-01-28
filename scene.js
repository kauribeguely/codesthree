
console.log('scene js loaded');

import * as THREE from 'three';
// import { Scene } from 'three';
// import { PerspectiveCamera } from 'three';
// import { WebGLRenderer } from 'three';
// import { MeshBasicMaterial } from 'three';
// import { Mesh } from 'three';
// import { AmbientLight } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


export function initializeThreeJsScene(sceneData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    // const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );

    // Define frustum size based on container size
    // const aspectRatio = container.clientWidth / container.clientHeight;
    // const frustumSize = 5;  // This controls the scale of the scene, adjust as needed
    //
    // // Create Orthographic Camera
    // const camera = new THREE.OrthographicCamera(
    //     -frustumSize * aspectRatio / 2,   // left
    //     frustumSize * aspectRatio / 2,     // right
    //     frustumSize / 2,                  // top
    //     -frustumSize / 2,                 // bottom
    //     0.1,                              // near
    //     1000                               // far
    // );

    camera.position.set(0, 2, 5);
    scene.add( camera );

    // const renderer = new THREE.WebGLRenderer({antialias: true});
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(container.clientWidth, container.clientHeight);

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7; // Adjust for brightness


    container.appendChild(renderer.domElement);

    const alight = new THREE.AmbientLight(0xffffff, sceneData.lightIntensity);
    // let alightIntensity = sceneData.lightIntensity;
    // alight.position.set(5, 5, 5);
    scene.add(alight);


    let model;


    // Load 3D Model
    // const loader = new THREE.GLTFLoader();
    const loader = new GLTFLoader();

    loadModel(sceneData.modelUrl, sceneData);
    // loadModel('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', sceneData);

    function loadModel(url, sceneData)
    {
      loader.load(url, (gltf) =>
      {
          model = gltf.scene;
          scene.add(model);

          model.position.set(
              parseFloat(sceneData.positionX),
              parseFloat(sceneData.positionY),
              parseFloat(sceneData.positionZ)
          );

          model.rotation.set(
              parseFloat(THREE.MathUtils.degToRad(sceneData.rotationX)),
              parseFloat(THREE.MathUtils.degToRad(sceneData.rotationY)),
              parseFloat(THREE.MathUtils.degToRad(sceneData.rotationZ))
          );

          model.scale.set(sceneData.scale, sceneData.scale, sceneData.scale);


          renderer.render(scene, camera);
          window.addEventListener('mousemove', onMouseMove);
        });
    }

    const animate = function ()
    {
       requestAnimationFrame(animate);
       renderer.render(scene, camera);
     };

     animate();


   const rotationRange = 10; // Maximum rotation range in degrees
    const initialRotationX = parseFloat(sceneData.rotationX);
    const initialRotationY = parseFloat(sceneData.rotationY);
    // Mousemove listener
    const onMouseMove = (event) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalized between -1 and 1
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized between -1 and 1

      // Map mouse position to rotation range
      model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * rotationRange);
      model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * rotationRange);
      // console.log(initialRotationX + mouseY * rotationRange);
    };


    // Handle window resizing
      window.addEventListener('resize', onWindowResize, false);

      function onWindowResize() {
        // Update camera aspect ratio and renderer size on window resize
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }

    // Attach the mousemove event listener


    // Render loop
    // function animate() {
    //     requestAnimationFrame(animate);
    //     renderer.render(scene, camera);
    // }
    // animate();
}
