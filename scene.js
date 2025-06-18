
console.log('scene js loaded');

import * as THREE from 'three';
// import { Scene } from 'three';
// import { PerspectiveCamera } from 'three';
// import { WebGLRenderer } from 'three';
// import { MeshBasicMaterial } from 'three';
// import { Mesh } from 'three';
// import { AmbientLight } from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { RGBELoader } from 'three/addons/RGBELoader.js';



export function initializeThreeJsScene(allSceneData, containerId, pluginUrl)
{

  

  let numLoaded = 0;
    const container = document.getElementById(containerId);
    const loadScreen = container.querySelector('.loadScreen');
    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }


    //backward compatibility
    // if(allSceneData.models[1] == undefined)
    if(!Array.isArray(allSceneData.models[1]))    
    {
      const oldModels = allSceneData.models;
      allSceneData.models = [];
      allSceneData.models.push(oldModels);
      allSceneData.models.push([]);
    }

    let sceneData = allSceneData.globalSettings;
    let allModels = allSceneData.models[0];
    let allMobileModels = allSceneData.models[1];
    let allThreeJsObj = [];
    const MOBILE_BREAKPOINT_MAX_WIDTH = 768; 
    // Set the isMobile boolean based on the current window width
    let isMobile = window.innerWidth <= MOBILE_BREAKPOINT_MAX_WIDTH;
    // const MOBILE_BREAKPOINT_MAX_WIDTH = sceneData.breakPoint; 
    // console.log(pluginData.pluginUrl);
    // console.log(pluginUrl);
    const mouseRotationX = sceneData.mouseRotationX; // Maximum rotation range in degrees
    const mouseRotationY = sceneData.mouseRotationY; // Maximum rotation range in degrees
    const mouseRotationZ = sceneData.mouseRotationZ; // Maximum rotation range in degrees
    let mouseAnimationLink = sceneData.mouseAnimationLink;
    // Mousemove listener
    const targetRotation = new THREE.Vector3(); // Store the target rotation
    const currentRotation = new THREE.Vector3(); // Store the current rotation

    let scrollAnimationLink = sceneData.scrollAnimationLink;
    let isOrthoCamera = sceneData.isOrthoCamera;
    let loopActive = sceneData.loopActive;
    let useEnvLight = sceneData.useEnvLight;



    const scene = new THREE.Scene();
    let rotateGroup = new THREE.Group();
    scene.add(rotateGroup);
    let camera;
    const perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    let isoZoom = 250;
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

    let cameraPos = [0, 0, 5];

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
    // alight.position.set(5, 5, 5);
    scene.add(alight);


    const dlight = new THREE.DirectionalLight(0xffffff, sceneData.directionalLightIntensity);
    let ddirectionalLightIntes = 1;
    // dlight.position.set(5, 5, 5);
    dlight.position.set(sceneData.lightPosX, sceneData.lightPosY, sceneData.lightPosZ);
    scene.add(dlight);


    let model, loopGroup, loopable;
    // let allModels = [];
    let spacing = sceneData.itemSpacing;
    let fullLoopGroup = new THREE.Group();
    let objGroup = new THREE.Group();
    fullLoopGroup.add(objGroup);
    scene.add(fullLoopGroup);
    fullLoopGroup.scale.set(sceneData.loopGroupScale, sceneData.loopGroupScale, sceneData.loopGroupScale);


    // Load 3D Model
    // const loader = new THREE.GLTFLoader();
    const loader = new GLTFLoader();
    const rgbeLoader = new RGBELoader();
    const sphereGroup = new THREE.Group();
    updateEnvTexture();

    if(allModels.length != 0)
    {
      loadAllModels();
    }

    function loadAllModels()
    {
      allModels.forEach(function(model, index)
      {
        loadModel(model.modelUrl, model, allMobileModels[index]);
      });
    }

    // function loadAllMobileData()
    // {
    //   allMobileModels.forEach(function(model, index)
    //   {
    //     //only add their data to the relative model config
    //       //
    //     // loadModel(model.modelUrl, model, true);
    //     addMobDataToConfigRef(model, index);
    //   });
    //   // applyAllTransformsFromConfigs();
    // }

    // function addMobDataToConfigRef(data, index)
    // {
    //   //find related object 
    //   // const modelId = allThreeJsObj.findIndex(m => m.modelId === data.modelId);
    //   // const threeJsObject = selectObjectFromList(data.modelId);
    //   const threeJsObject = allThreeJsObj[index];
    //   threeJsObject.userData.modelConfigRefMob = ModelConfig.fromPlainObject(data);
    // }

    // if(loopActive)
    // {
    //   sceneDataLoop();
    // }
    // else
    // {
    //   loadModel(sceneData.modelUrl, sceneData);
    // }
    // loadModel('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', sceneData);

    // function loadModel(url, sceneData)
    let lastAddedObject;
    // TODO: change data to dataList = [] - can scale to many screen sizes easier
    function loadModel(url, objData, mobObjData)
    {
      loader.load(url, (gltf) =>
      {
          const newThreeJsObject = gltf.scene;
          lastAddedObject = newThreeJsObject;
          // model = gltf.scene;
          
          rotateGroup.add(newThreeJsObject);

          // const modelConfigInstance = ModelConfig.fromPlainObject(objData);
          // const modelConfigInstanceMob = ModelConfig.fromPlainObject(mobObjData);
          newThreeJsObject.userData.objData = objData; // Crucial for easy access
          newThreeJsObject.userData.mobObjData = mobObjData; // Crucial for easy access
          allThreeJsObj.push(newThreeJsObject);

          if(isMobile)
          {
            applyTransformFromConfig(newThreeJsObject, mobObjData);
          }
          else
          {
            applyTransformFromConfig(newThreeJsObject, objData);
          }

          // lastAddedObject.position.set(
          //     parseFloat(objData.positionX),
          //     parseFloat(objData.positionY),
          //     parseFloat(objData.positionZ)
          // );

          // lastAddedObject.rotation.set(
          //     parseFloat(THREE.MathUtils.degToRad(objData.rotationX)),
          //     parseFloat(THREE.MathUtils.degToRad(objData.rotationY)),
          //     parseFloat(THREE.MathUtils.degToRad(objData.rotationZ))
          // );
          currentRotation.copy(lastAddedObject.rotation); // The most direct way

          lastAddedObject.scale.set(objData.scale, objData.scale, objData.scale);

          // if(mouseAnimationLink) window.addEventListener('mousemove', onMouseMove);

          renderer.render(scene, camera);
          if(scrollAnimationLink) applyScrollTransforms();

          hideLoadScreen();

        });
    }

    function applyAllTransformsFromConfigs()
    {
      allThreeJsObj.forEach(function(obj)
      {
        let currentConfig = isMobile ? obj.userData.mobObjData : obj.userData.objData;
        applyTransformFromConfig(obj, currentConfig);
      });    
    }

    function applyTransformFromConfig(object, config)
    {
      object.position.set(config.positionX, config.positionY, config.positionZ);
      object.rotation.set(degToRad(config.rotationX), degToRad(config.rotationY), degToRad(config.rotationZ));
      object.scale.set(config.scale, config.scale, config.scale);
    }

    function degToRad(deg)
    {
      return deg * 0.0174533;
    }

    function hideLoadScreen()
    {
      numLoaded++;
      if(useEnvLight && numLoaded > 1)
      {
        loadScreen.style.display = "none";
      }

      if(!useEnvLight)
      {
        loadScreen.style.display = "none";
      }
    }

    const animate = function ()
    {
       requestAnimationFrame(animate);
       renderer.render(scene, camera);
       
      // rotateGroup.rotation.y += 0.01;
      // console.log(rotateGroup.rotation.y);

      //  sphereGroup.rotation.y += 0.02; // Rotate the entire group
   };
     animate();

   let initialRotationX = 0;
  let initialRotationY = 0;
  let initialRotationZ = 0;
   const rotationRange = 10; // Maximum rotation range in degrees
    // const initialRotationX = parseFloat(sceneData.rotationX);
    // const initialRotationY = parseFloat(sceneData.rotationY);
    // const initialRotationZ = parseFloat(sceneData.rotationZ);
    // Mousemove listener
    const onMouseMove = (event) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalized between -1 and 1
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized between -1 and 1

      // Map mouse position to rotation range
      // model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * rotationRange);
      // model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * rotationRange);
      const easing = 0.1 + (1 - 0.1) * 0.05; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

      targetRotation.x = degToRad(initialRotationX + -mouseY * mouseRotationX);
      targetRotation.y = degToRad(initialRotationY + -mouseX * mouseRotationY);
      targetRotation.z = degToRad(initialRotationZ + -mouseX * mouseRotationZ);


      currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, easing);
      currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, easing);
      currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.z, easing);

      // if(loopActive)
      // {
      //   fullLoopGroup.rotation.x = currentRotation.x;
      //   fullLoopGroup.rotation.y = currentRotation.y;
      //   fullLoopGroup.rotation.z = currentRotation.z;
      // }
      // else
      // {
        // const rotCalc = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
        // rotateGroup.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
        rotateGroup.rotation.x = currentRotation.x;
        rotateGroup.rotation.y = currentRotation.y;
        rotateGroup.rotation.z = currentRotation.z;
      // }
      // console.log(rotCalc, mouseY, rotateGroup.rotation.x, mouseRotationX, initialRotationX, mouseAnimationLink);

      // console.log(initialRotationX + mouseY * rotationRange);
    };
    if(mouseAnimationLink) window.addEventListener('mousemove', onMouseMove);




    // Handle window resizing
    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() 
    {
      // Update camera aspect ratio and renderer size on window resize
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);

      const belowBreakPoint = window.innerWidth <= MOBILE_BREAKPOINT_MAX_WIDTH;
      let changed = false;
      if(belowBreakPoint)
      {
        if(!isMobile)
        {
          isMobile = true;
          changed = true;
        }
      }
      else
      {
        if(isMobile)
        {
          isMobile = false;
          changed = true;
        }
      }
      if(changed)
      {
        applyAllTransformsFromConfigs();
      }
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
        hideLoadScreen();

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

    function updateEnvTexture()
    {
      if(useEnvLight)
      {
        loadEnvTexture('sunset.hdr');
      }
      else
      {
        scene.environment = null;
      }
    }

    function loadEnvTexture(url)
    {
      // rgbeLoader.load('../wp-content/plugins/codesthree/sunset.hdr', function (texture)
      // rgbeLoader.load('../wp-content/plugins/codesthree/'+ url, function (texture)
      // rgbeLoader.load(pluginData.pluginUrl+ url, function (texture)
      console.log(pluginUrl +'/codesthree/');
      rgbeLoader.load(pluginUrl +'/codesthree/'+ url, function (texture)
      {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        hideLoadScreen();
        // scene.background = texture;
      });
    }



}
