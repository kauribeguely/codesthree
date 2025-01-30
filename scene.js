
console.log('scene js loaded');

import * as THREE from 'three';
// import { Scene } from 'three';
// import { PerspectiveCamera } from 'three';
// import { WebGLRenderer } from 'three';
// import { MeshBasicMaterial } from 'three';
// import { Mesh } from 'three';
// import { AmbientLight } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


export function initializeThreeJsScene(sceneData, containerId)
{
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }


    const mouseRotationX = sceneData.mouseRotationX; // Maximum rotation range in degrees
    const mouseRotationY = sceneData.mouseRotationY; // Maximum rotation range in degrees
    const mouseRotationZ = sceneData.mouseRotationZ; // Maximum rotation range in degrees
    let mouseAnimationLink = sceneData.mouseAnimationLink === 'on';
    let scrollAnimationLink = sceneData.scrollAnimationLink === 'on';

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

    let cameraPos = [0, 2, 5];

    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);

    scene.add( camera );

    // const renderer = new THREE.WebGLRenderer({antialias: true});
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(container.clientWidth, container.clientHeight);

    renderer.outputEncoding = THREE.sRGBEncoding;
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // renderer.toneMappingExposure = 0.7; // Adjust for brightness


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
          if(mouseAnimationLink) window.addEventListener('mousemove', onMouseMove);
          applyScrollTransforms();
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
      // model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * rotationRange);
      // model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * rotationRange);
      model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
      model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
      model.rotation.z = THREE.MathUtils.degToRad(initialRotationX + -mouseX * mouseRotationZ);
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

      // Get the canvas container's distance to the top of the screen
      const getCanvasOffset = () => {
        const rect = container.getBoundingClientRect();
        const canvasTop = rect.top + window.scrollY;
        const screenHeight = window.innerHeight;
        // return canvasTop / screenHeight; // Returns a value between 0 and 1
        return rect.top / container.offsetHeight; // Returns a value between 0 and 1
      };

      // Handle the scroll event
      // window.addEventListener('scroll', (event) => {
      // document.querySelector('.edit-post-layout__metaboxes').addEventListener('scroll', (event) => {
      // container.closest('.edit-post-layout__metaboxes').addEventListener('scroll', (event) =>

      if(scrollAnimationLink)
      {
        window.addEventListener('scroll', (event) =>
        {
          applyScrollTransforms(event);
        });
      }


      let scrollMoveX = sceneData.scrollMoveX || 0;
      let scrollMoveY = sceneData.scrollMoveY || 0;
      let scrollMoveZ = sceneData.scrollMoveZ || 0;

      function applyScrollTransforms(event)
      {
        // Get the normalized scroll position (0 - 1)
        const scrollPos = getCanvasOffset();

        // Determine how much to move the camera based on scroll and position
        const scrollFactor = 0.1; // Adjust this value to change the sensitivity of the scroll

        // Calculate new camera position based on scroll distance
        // camera.position.x += scrollMoveX * scrollPos * scrollFactor;
        // camera.position.y += scrollMoveY * scrollPos * scrollFactor;
        // camera.position.z += scrollMoveZ * scrollPos * scrollFactor;
        camera.position.x = cameraPos[0] + scrollMoveX * scrollPos;
        camera.position.y = cameraPos[1] + scrollMoveY * scrollPos;
        camera.position.z = cameraPos[2] + scrollMoveZ * scrollPos;

        // Update the camera's position
        camera.updateProjectionMatrix();

        // Prevent the default scroll behavior
        event.preventDefault();
      }

    // Attach the mousemove event listener


    // Render loop
    // function animate() {
    //     requestAnimationFrame(animate);
    //     renderer.render(scene, camera);
    // }
    // animate();
}
