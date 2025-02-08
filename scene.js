
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
    let isOrthoCamera = sceneData.isOrthoCamera === 'on';
    let loopActive = sceneData.loopActive === 'on';

    const scene = new THREE.Scene();
    let camera;
    const perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    let isoZoom = 100;
    const orthoCamera = new THREE.OrthographicCamera( container.clientWidth / - isoZoom, container.clientWidth / isoZoom, container.clientHeight / isoZoom, container.clientHeight / - isoZoom, 1, 1000 );

    if(isOrthoCamera)
    {
      camera = orthoCamera;
    }
    else
    {
      camera = perspectiveCamera;
    }

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


    let model, loopGroup, loopable;
    let spacing = sceneData.itemSpacing;
    let fullLoopGroup = new THREE.Group();
    let objGroup = new THREE.Group();
    fullLoopGroup.add(objGroup);
    scene.add(fullLoopGroup);

    // Load 3D Model
    // const loader = new THREE.GLTFLoader();
    const loader = new GLTFLoader();


    if(loopActive)
    {
      sceneDataLoop();
    }
    else
    {
      loadModel(sceneData.modelUrl, sceneData);
    }
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

          if(mouseAnimationLink) window.addEventListener('mousemove', onMouseMove);

          renderer.render(scene, camera);
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
    const initialRotationZ = parseFloat(sceneData.rotationZ);
    // Mousemove listener
    const onMouseMove = (event) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalized between -1 and 1
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized between -1 and 1

      // Map mouse position to rotation range
      // model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * rotationRange);
      // model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * rotationRange);

      if(loopActive)
      {
        fullLoopGroup.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
        fullLoopGroup.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
        fullLoopGroup.rotation.z = THREE.MathUtils.degToRad(initialRotationZ + -mouseX * mouseRotationZ);
      }
      else
      {
        model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
        model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
        model.rotation.z = THREE.MathUtils.degToRad(initialRotationZ + -mouseX * mouseRotationZ);
      }

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
        if(event) event.preventDefault();
      }

    // Attach the mousemove event listener


    // Render loop
    // function animate() {
    //     requestAnimationFrame(animate);
    //     renderer.render(scene, camera);
    // }
    // animate();

    //LOOP CODE
    function sceneDataLoop()
    {
      loopDat(sceneData.modelUrl, sceneData.scale, sceneData.loopCountY, sceneData.loopCountX, sceneData.loopCountZ, objGroup, [sceneData.itemSpacing, 0, 0]);
      transformObjectToSceneData(fullLoopGroup);
    }

    function loopDat(objectUrl, objScale, rowCount, columnCount, zCount, group, distances)
    {
      // loader.load('obj/laptopIso.glb',	function ( gltf )
      // loader.load('obj/tabletIso.glb',	function ( gltf )
      loader.load(objectUrl,	function ( gltf )
      {
        // deskObj
        loopable = gltf.scene;
        loopable.scale.set(objScale, objScale, objScale);
        zLoop(loopable, rowCount, columnCount, zCount, group, distances);
        if(mouseAnimationLink) window.addEventListener('mousemove', onMouseMove);

      });
    }

    function zLoop(object, rowCount, columnCount, zCount, group, distances)
    {
      for(let i = 0; i < zCount; i++)
      {
        let zPlane = new THREE.Group();
        let zAdjust = zCount/2 - 0.5;

        zPlane.position.set(0, 0, i*sceneData.itemSpacing - zAdjust*sceneData.itemSpacing);
        group.add(zPlane);
        rowLoopGroup(loopable, rowCount, columnCount, zCount, zPlane, distances);


      }
    }

    function rowLoopGroup(object, rowCount, columnCount, zCount, group, distances)
    {
      for(let i = 0; i < rowCount; i++)
      {
        let row = new THREE.Group();
        let center = i - (0.5*rowCount);
        let iPercent = i/rowCount;
        // row.position.set(0.5 * center, 2 * center, 0);
        // row.position.set(0, center, 0);
        //TODO row offset

        // let xSpace = 0.5*spacing;
        // // let xSpace = 0.8*spacing;
        // if(i % 2 == 1)
        // {
        //   xSpace = 0;
        // }
        // row.position.set(xSpace, 1*i*spacing, 0);


        // row.position.set(xSpace, 0.5*i*spacing, 0);
        let yAdjust = rowCount/2 - 0.5;
        row.position.set(0, i*sceneData.itemSpacing - yAdjust*sceneData.itemSpacing, 0);
        // row.position.set(0, (iPercent-0.5)*(sceneData.itemSpacing*rowCount), 0);

        //just normal add distance between row no centering
        // row.position.set(0, i*sceneData.itemSpacing, 0);

        // row.position.set(0.5*center, center, 0);
        // scene.add(row);
        group.add(row);
        // loopCreate(object, 10, [1, 0, 1], row); //good for screen
        loopCreate(object, columnCount, distances, row);
        // loopCreate(object, 100, [0, 0, 0.5], row);

      }

    }

    function loopCreate(loopObject, loopCount, distances, group)
    {
      //todo, dont loop inside a template
      // let addToDiv = activeDiv;
      // let loopCount = 20;
      let randomMax = 1;
      for(let i = 0; i < loopCount; i++)
      {
        let centerMath = i-(0.5*loopCount);
        let y = centerMath * distances[0];

        //to go slightly off grid
        let xRandomness = (Math.random() - 0.5) * randomMax;
        let yRandomness = (Math.random() - 0.5) * randomMax;
        // console.log('calc: '+centerMath);
        // activeDiv = addToDiv; //should be the first one
        // activeDivObj = null;
        // addObj(loopObject);
        let loopedObject = loopObject.clone();

        //Screens
        // loopedObject.position.set(y, centerMath * distances[1], centerMath * distances[2]);
        loopedObject.position.set(y, centerMath * distances[1], centerMath * distances[2]);

        // Randomed
        // loopedObject.position.set(y + xRandomness, centerMath * distances[1] + yRandomness, centerMath * distances[2]);
        // selectedObj.setPosition(centerMath * distances[0], centerMath * distances[1], centerMath * distances[2]);
        group.add(loopedObject);
        // starGroup.push(loopedObject);
      }
    }

    function transformObjectToSceneData(object)
    {
      object.position.set(
          parseFloat(sceneData.positionX),
          parseFloat(sceneData.positionY),
          parseFloat(sceneData.positionZ)
      );

      object.rotation.set(
          parseFloat(THREE.MathUtils.degToRad(sceneData.rotationX)),
          parseFloat(THREE.MathUtils.degToRad(sceneData.rotationY)),
          parseFloat(THREE.MathUtils.degToRad(sceneData.rotationZ))
      );
    }

}
