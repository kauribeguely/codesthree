import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
// document.addEventListener('DOMContentLoaded', () => {
window.onload = () =>
{

  console.log('Admin JS Codes 3D started');

  let mouseDown = false;
  let isTransforming = false;

  // Get the toggle elements (checkboxes)
  const mouseAnimationLinkInput = document.getElementById('mouseAnimationLink');
  const scrollAnimationLinkInput = document.getElementById('scrollAnimationLink');
  // Mousemove listener
  const targetRotation = new THREE.Vector3(); // Store the target rotation
  const currentRotation = new THREE.Vector3(); // Store the current rotation

  // Get the scroll move inputs
  const scrollXInput = document.getElementById('scrollMoveX');
  const scrollYInput = document.getElementById('scrollMoveY');
  const scrollZInput = document.getElementById('scrollMoveZ');
  // Get the camera's initial position and the scroll movement values from sceneData
  let scrollMoveX = sceneData.scrollMoveX || 0;
  let scrollMoveY = sceneData.scrollMoveY || 0;
  let scrollMoveZ = sceneData.scrollMoveZ || 0;

  // Get the mouse rotation inputs
  const mouseRotXInput = document.getElementById('mouseRotationX');
  const mouseRotYInput = document.getElementById('mouseRotationY');
  const mouseRotZInput = document.getElementById('mouseRotationZ');


  let mouseRotationX = sceneData.mouseRotationX || 5; // Maximum rotation range in degrees
  let mouseRotationY = sceneData.mouseRotationY || 5; // Maximum rotation range in degrees
  let mouseRotationZ = sceneData.mouseRotationZ || 0; // Maximum rotation range in degrees

  let mouseAnimationLink = sceneData.mouseAnimationLink === 'on';
  let scrollAnimationLink = sceneData.scrollAnimationLink === 'on';

  // oninput for scroll move values
  scrollXInput.oninput = () => {
    scrollMoveX = parseFloat(scrollXInput.value) || 0;
  };

  scrollYInput.oninput = () => {
    scrollMoveY = parseFloat(scrollYInput.value) || 0;
  };

  scrollZInput.oninput = () => {
    scrollMoveZ = parseFloat(scrollZInput.value) || 0;
  };

  // oninput for mouse rotation values
  mouseRotXInput.oninput = () => {
    mouseRotationX = parseFloat(mouseRotXInput.value) || 0;


  };

  mouseRotYInput.oninput = () => {
    mouseRotationY = parseFloat(mouseRotYInput.value) || 0;


  };

  mouseRotZInput.oninput = () => {
    mouseRotationZ = parseFloat(mouseRotZInput.value) || 0;


  };

  // oninput for toggle (checkbox)
  mouseAnimationLinkInput.oninput = () => {
    mouseAnimationLink = mouseAnimationLinkInput.checked;
    if(!mouseAnimationLink)
    {
      // model.rotation.set(
      //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationX)),
      //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationY)),
      //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationZ))
      // );
      transformObjectToSceneData(model);
      transformObjectToSceneData(fullLoopGroup);

    }
  };

  function resetObjRotation()
  {

  }

  scrollAnimationLinkInput.oninput = () => {
    scrollAnimationLink = scrollAnimationLinkInput.checked;
    if(!scrollAnimationLink)
    {
      camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    }
  };


  const posXInput = document.getElementById('threejs_position_x');
  const posYInput = document.getElementById('threejs_position_y');
  const posZInput = document.getElementById('threejs_position_z');

  posXInput.oninput = () => {
    // model.position.x = parseFloat(posXInput.value) || 0;
    sceneData.positionX = parseFloat(posXInput.value);

    transformObjectToSceneData(fullLoopGroup);
    transformObjectToSceneData(model);
  };

  posYInput.oninput = () => {
      // model.position.y = parseFloat(posYInput.value) || 0;
      sceneData.positionY = parseFloat(posYInput.value);

      transformObjectToSceneData(fullLoopGroup);
      transformObjectToSceneData(model);
  };

  posZInput.oninput = () => {
      // model.position.z = parseFloat(posZInput.value) || 0;
      sceneData.positionZ = parseFloat(posZInput.value);

      transformObjectToSceneData(fullLoopGroup);
      transformObjectToSceneData(model);
  };



  const rotXInput = document.getElementById('threejs_rotation_x');
  const rotYInput = document.getElementById('threejs_rotation_y');
  const rotZInput = document.getElementById('threejs_rotation_z');



  rotXInput.oninput = () => {
      model.rotation.x = THREE.MathUtils.degToRad(parseFloat(rotXInput.value) || 0);
      model.rotation.x = THREE.MathUtils.degToRad(parseFloat(rotXInput.value) || 0);

      sceneData.rotationX = parseFloat(rotXInput.value);
      initialRotationX = sceneData.rotationX;
      transformObjectToSceneData(fullLoopGroup);
      transformObjectToSceneData(model);
  };

  rotYInput.oninput = () => {
      model.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotYInput.value) || 0);
      model.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotYInput.value) || 0);

      sceneData.rotationY = parseFloat(rotYInput.value);
      initialRotationY = sceneData.rotationY;
      transformObjectToSceneData(fullLoopGroup);
      transformObjectToSceneData(model);
  };

  rotZInput.oninput = () => {
      model.rotation.z = THREE.MathUtils.degToRad(parseFloat(rotZInput.value) || 0);
      model.rotation.z = THREE.MathUtils.degToRad(parseFloat(rotZInput.value) || 0);

      sceneData.rotationZ = parseFloat(rotZInput.value);
      initialRotationZ = sceneData.rotationZ;
      transformObjectToSceneData(fullLoopGroup);
      transformObjectToSceneData(model);
  };



  const scaleInput = document.getElementById('codes_scale');
  scaleInput.oninput = () =>
  {
    model.scale.set(scaleInput.value, scaleInput.value, scaleInput.value);
    sceneData.scale = scaleInput.value;
    if(sceneData.loopActive)
    {
      refreshLoop();
    }
    else
    {

    }
  };


  let loopActive = sceneData.loopActive || false;
  let loopCountX = sceneData.loopCountX || 3;
  let loopCountY = sceneData.loopCountY || 3;
  let loopCountZ = sceneData.loopCountZ || 3;
  let itemSpacing = sceneData.itemSpacing || 1.0;
  let isOrthoCamera = sceneData.isOrthoCamera === 'on';

  const loopActiveInput = document.getElementById('loopActive');
  const loopCountXInput = document.getElementById('loopCountX');
  const loopCountYInput = document.getElementById('loopCountY');
  const loopCountZInput = document.getElementById('loopCountZ');
  const itemSpacingInput = document.getElementById('itemSpacing');
  const isOrthoCameraInput = document.getElementById('isOrthoCamera');


loopActiveInput.oninput = () =>
{
  loopActive = loopActiveInput.checked;

  toggleLoop();
};

function toggleLoop()
{
  sceneData.loopActive = loopActive;
  if(loopActive)
  {
    //run loop function with all sceneData values
    // scene.remove(model);
    model.visible = false;
    controls.visible = false;
    document.querySelector('#codesScaleButton').disabled = true;
    // scene.remove(controls);
    refreshLoop();
  }
  else
  {
    // scene.remove(groupControls);
    // scene.remove(fullLoopGroup);
    document.querySelector('#codesScaleButton').disabled = false;
    fullLoopGroup.visible = false;
    groupControls.visible = false;
    model.visible = true;
    controls.visible = true;


    // scene.add(model);
    // scene.add(controls);

  }
}

loopCountXInput.oninput = () => {
    // loopCountX = parseInt(loopCountXInput.value) || 3;
    if (loopCountXInput.value < 1) {
        loopCountXInput.value = 1;
    }
    sceneData.loopCountX = parseInt(loopCountXInput.value);
    refreshLoop();
};

loopCountYInput.oninput = () => {
    // loopCountY = parseInt(loopCountYInput.value);
    if (loopCountYInput.value < 1) {
        loopCountYInput.value = 1;
    }
    sceneData.loopCountY = parseInt(loopCountYInput.value);
    refreshLoop();

};

loopCountZInput.oninput = () => {
    // loopCountZ = parseInt(loopCountZInput.value);
    if (loopCountZInput.value < 1) {
        loopCountZInput.value = 1;
    }
    sceneData.loopCountZ = parseInt(loopCountZInput.value);
    refreshLoop();

};

itemSpacingInput.oninput = () => {
    sceneData.itemSpacing = parseFloat(itemSpacingInput.value);
    refreshLoop();
};

isOrthoCameraInput.oninput = () => {
    sceneData.isOrthoCamera = isOrthoCameraInput.checked;
    toggleCamera();
};

function toggleCamera()
{
    if (sceneData.isOrthoCamera) {
        camera = orthoCamera;
    } else {
        camera = perspectiveCamera;
    }
    controls.camera = camera;
    groupControls.camera = camera;

    renderer.render(scene, camera);
}


    const container = document.getElementById('threejs-canvas');
    const labelContainer = document.getElementById('label'); // Label container for displaying object details

    let isoZoom = 100;
    const scene = new THREE.Scene();
    let camera;
    const perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    const orthoCamera = new THREE.OrthographicCamera( container.clientWidth / - isoZoom, container.clientWidth / isoZoom, container.clientHeight / isoZoom, container.clientHeight / - isoZoom, 1, 1000 );

    if(sceneData.isOrthoCamera)
    {
      camera = orthoCamera;
    }
    else
    {
      camera = perspectiveCamera;
    }

    let cameraPos = [0, 2, 5];

    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    renderer.outputEncoding = THREE.sRGBEncoding;


    const dlight = new THREE.DirectionalLight(0xffffff, 1);
    let dlightIntensity = 1;
    dlight.position.set(5, 5, 5);
    // scene.add(dlight);

    const alight = new THREE.AmbientLight(0xffffff, 1);
    let alightIntensity = 1;
    // alight.position.set(5, 5, 5);
    scene.add(alight);

    // Get the sliders by their IDs
    const ambientLightSlider = document.getElementById('ambient-light-slider');
    const lightValue = document.getElementById('light_intensity_value');


    const directionalLightSlider = document.getElementById('directional-light-slider');

    // Event listener to change the intensity of the ambient light
    ambientLightSlider.addEventListener('input', function() {
        alight.intensity = parseFloat(ambientLightSlider.value);
        setLightIntensity(alight, ambientLightSlider.value);
        lightValue.textContent = ambientLightSlider.value;
    });

    function setLightIntensity(light, intensity)
    {
      light.intensity = parseFloat(intensity);
    }

    setLightIntensity(alight, sceneData.lightIntensity);
    //
    // // Event listener to change the intensity of the directional light
    // directionalLightSlider.addEventListener('input', function() {
    //     dlight.intensity = parseFloat(directionalLightSlider.value);
    // });


    // // Update Light Intensity Value
    // const lightSlider = document.getElementById('threejs_light_intensity');
    // const lightValue = document.getElementById('light_intensity_value');
    //
    // lightSlider.addEventListener('input', function () {
    //     lightValue.textContent = lightSlider.value;
    // });

    //INIT
    let controls, groupControls;
    let model, loopGroup;


    // Load 3D Model
    // const loader = new THREE.GLTFLoader();
    const loader = new GLTFLoader();


    let loopable;
    // let spacing = 1.1;
    let spacing = sceneData.itemSpacing;
    let fullLoopGroup = new THREE.Group();
    let objGroup = new THREE.Group();
    fullLoopGroup.add(objGroup);
    // scene.add(objGroup);
    scene.add(fullLoopGroup);
    groupControls = new TransformControls(camera, renderer.domElement);
    // groupControls.attach(objGroup);
    groupControls.attach(fullLoopGroup);
    groupControls.setSpace('local');  // Ensure local space is used

    loadModel(sceneData.modelUrl, sceneData);


    if(sceneData.loopActive)
    {
      scene.add(groupControls);
      sceneDataLoop();
      document.querySelector('#codesScaleButton').disabled = true;

    }
    // loadModel('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', sceneData);

    function loadModel(url, sceneData)
    {
      loader.load(url, (gltf) =>
      {
          scene.remove(model);
          scene.remove(controls);

          model = gltf.scene;
          scene.add(model);

          transformObjectToSceneData(model);

          // model.position.set(
          //     parseFloat(sceneData.positionX),
          //     parseFloat(sceneData.positionY),
          //     parseFloat(sceneData.positionZ)
          // );
          //
          // model.rotation.set(
          //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationX)),
          //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationY)),
          //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationZ))
          // );

          model.scale.set(sceneData.scale, sceneData.scale, sceneData.scale);

          // Allow rotation/repositioning
          controls = new TransformControls(camera, renderer.domElement);
          controls.attach(model);
          controls.setSpace('local');  // Ensure local space is used

          scene.add(controls);
          // Listen for changes in the TransformControls
          controls.addEventListener('change', updateTransforms);
          controls.addEventListener('mouseDown', transformDragStart);
          controls.addEventListener('mouseUp', transformDragEnd);
          // if()
          window.addEventListener('mousemove', onMouseMove);

          if(sceneData.loopActive)
          {
            model.visible = false;
            controls.visible = false;
            // scene.remove(model);
            // scene.remove(controls);
          }

          // Save model position/rotation
          // document.getElementById('save-model-data').addEventListener('click', () => {
          //     const data = {
          //         position: model.position,
          //         rotation: model.rotation
          //     };
          //     fetch(ajaxurl, {
          //         method: 'POST',
          //         headers: { 'Content-Type': 'application/json' },
          //         body: JSON.stringify({
          //             action: 'save_model_data',
          //             model_data: data
          //         })
          //     }).then(response => response.json()).then(data => {
          //         alert('Model data saved!');
          //     });
          // });
        });
    }



    // const updateLabel = () => {
    //     const pos = model.position;
    //     const rot = model.rotation;
    //
    //     labelContainer.innerHTML = `
    //         <b>Position:</b> x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}<br>
    //         <b>Rotation:</b> x: ${THREE.MathUtils.radToDeg(rot.x).toFixed(2)}°,
    //                         y: ${THREE.MathUtils.radToDeg(rot.y).toFixed(2)}°,
    //                         z: ${THREE.MathUtils.radToDeg(rot.z).toFixed(2)}°
    //     `;
    // };

    function round(value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    const updateTransforms = () => {
      let pos = model.position;
      let rot = model.rotation;
      let scale = model.scale;

      if(sceneData.loopActive)
      {
        pos = fullLoopGroup.position;
        // rot = objGroup.rotation;
        rot = new THREE.Euler().setFromQuaternion(fullLoopGroup.quaternion); // Handle group rotation correctly
        // scale = objGroup.scale;

        // if(controls.mode === "scale" || groupControls.mode === "scale")
        // {
        //   refreshLoop();
        // }
      }
      else
      {
        // pos = model.position;
        // rot = model.rotation;
        // scale = model.scale;
      }

      // Update position fields
      posXInput.value = pos.x.toFixed(2);
      posYInput.value = pos.y.toFixed(2);
      posZInput.value = pos.z.toFixed(2);

      sceneData.positionX = pos.x;
      sceneData.positionY = pos.y;
      sceneData.positionZ = pos.z;


      if (isTransforming) {
        // Update rotation fields (converted from radians to degrees)
        rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
        rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
        rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);


        sceneData.rotationX = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
        sceneData.rotationY = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
        sceneData.rotationZ = THREE.MathUtils.radToDeg(rot.z).toFixed(2);



        // initialRotationX = parseFloat(THREE.MathUtils.radToDeg(rot.x).toFixed(2));
        // initialRotationY = parseFloat(THREE.MathUtils.radToDeg(rot.y).toFixed(2));
        // initialRotationZ = parseFloat(THREE.MathUtils.radToDeg(rot.z).toFixed(2));
        initialRotationX = parseFloat(sceneData.rotationX);
        initialRotationY = parseFloat(sceneData.rotationY);
        initialRotationZ = parseFloat(sceneData.rotationZ);

        // refreshLoop();

      }


      scaleInput.value = round(scale.x, 2);
      sceneData.scale = round(scale.x, 2);

      // console.log(scale, scale.x);

      // THREE.MathUtils.degToRad(sceneData.rotationX)
  };

  // Store the initial rotation when interacting starts
function transformDragStart() {
    isTransforming = true;
    // initialRotationX = parseFloat(sceneData.rotationX);
    // initialRotationY = parseFloat(sceneData.rotationY);
    // initialRotationZ = parseFloat(sceneData.rotationZ);
}

// Re-enable mouse rotation when interaction ends
function transformDragEnd(){
    isTransforming = false;
}




    // Handle WordPress Media Library for Model URL
    const mediaButton = document.getElementById('threejs_model_url_button');
    const modelUrlField = document.getElementById('threejs_model_url');
    const preview = document.getElementById('threejs_model_url_preview');

    mediaButton.addEventListener('click', function (e) {
        e.preventDefault();

        const mediaUploader = wp.media({
            title: 'Select 3D Model',
            button: { text: 'Use this model' },
            multiple: false
        });

        mediaUploader.on('select', function () {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            modelUrlField.value = attachment.url;
            sceneData.modelUrl = attachment.url;
            preview.innerHTML = `Current Model: <a href="${attachment.url}" target="_blank">${attachment.url}</a>`;
            console.log(attachment.url);
            if(scene.loopActive)
            {
              // loopDat(sceneData.modelUrl, 0.3, 40, 80, objGroup, [2, 0, 0]);
              sceneDataLoop();
            }
            else
            {
              loadModel(attachment.url, sceneData);
            }


        });

        mediaUploader.open();

    });




      let initialRotationX = parseFloat(sceneData.rotationX);
      let initialRotationY = parseFloat(sceneData.rotationY);
      let initialRotationZ = parseFloat(sceneData.rotationZ);

      const onMouseMove = (event) => {
          const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
          const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

          // Calculate target rotation
          targetRotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
          targetRotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
          targetRotation.z = THREE.MathUtils.degToRad(initialRotationZ + -mouseX * mouseRotationZ);

          if (mouseAnimationLink && !isTransforming) {
              // Smoothly interpolate to the target rotation
              // const easing = 0.1; // Adjust this value for speed (lower = slower)
              const easing = 1 + (1 - 0.1) * 0.05; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

              currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, easing);
              currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, easing);
              currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.z, easing);

              model.rotation.x = currentRotation.x;
              model.rotation.y = currentRotation.y;
              model.rotation.z = currentRotation.z;

              fullLoopGroup.rotation.x = currentRotation.x;
              fullLoopGroup.rotation.y = currentRotation.y;
              fullLoopGroup.rotation.z = currentRotation.z;
          }
      };

      // Initialize currentRotation (important!)
      // currentRotation.copy(model.rotation); // Or set to initial values

      function refreshLoop()
      {
        // scene.remove(groupControls);
        // scene.remove(fullLoopGroup);
        fullLoopGroup.remove(objGroup);
        // scene.add(fullLoopGroup);
        fullLoopGroup.visible = true;
        groupControls.visible = true;

        objGroup = new THREE.Group();
        fullLoopGroup.add(objGroup);
        // groupControls = new TransformControls(camera, renderer.domElement);
        // groupControls.attach(fullLoopGroup);
        // groupControls.addEventListener('change', updateTransforms);
        // groupControls.addEventListener('mouseDown', transformDragStart);
        // groupControls.addEventListener('mouseUp', transformDragEnd);

        transformObjectToSceneData(fullLoopGroup);


        // scene.add(groupControls);

        // loopDat(sceneData.modelUrl, sceneData.scale, 40, 80, objGroup, [2, 0, 0]);
        sceneDataLoop();
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

        currentRotation.copy(object.rotation); // The most direct way
      }

      // Get the canvas container element
      // const canvasContainer = document.getElementById('threejs-scene-container'); // Update the ID accordingly



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
      let scrollElement;
      if(document.querySelector('#threejs-editor-container').closest('.edit-post-layout__metaboxes'))
      {
        scrollElement = document.querySelector('#threejs-editor-container').closest('.edit-post-layout__metaboxes');
      }
      else
      {
        // scrollElement = document.querySelector('html');
        scrollElement = window;
      }


      scrollElement.addEventListener('scroll', (event) =>
      {
        if(scrollAnimationLink)
        {
          applyScrollTransforms(event);
        }
      });

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

      // if(scene.loopActive)
      // {
      //   // loopDat(sceneData.modelUrl, 0.3, 40, 80, objGroup, [2, 0, 0]);
      //   sceneDataLoop();
      // }
      // else
      // {
      //   loadModel(sceneData.modelUrl, sceneData);
      // }
      // loopDat(sceneData.modelUrl, sceneData.scale, 40, 80, objGroup, [2, 0, 0]);

      // loopDat('obj/phoneIso.glb', 0.3, 40, 80, objGroup, [2, 0, 0]);

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





    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
    // updateLabel();//show initial values



    // Optional: Enable drag interaction with the transform controls
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 't': // Translate mode
                setTransformMode('translate');
                break;
            case 'r': // Rotate mode
                setTransformMode('rotate');
                break;
            case 's': // Scale mode
                setTransformMode('scale');

                // dont allow scaling of group, must be set via single or input
                // groupControls.setMode('scale');
                break;
            case 'l': // Scale mode
                loopActive = !loopActive;
                loopActiveInput.checked = loopActive;
                toggleLoop();
                break;
        }
    });

    function setTransformMode(mode)
    {

      controls.setMode(mode);
      groupControls.setMode(mode);
      if(mode != 'scale')
      {
        groupControls.setMode(mode);
      }

    }
    window.setTransformMode = setTransformMode;

    // Handle window resizing
      window.addEventListener('resize', onWindowResize, false);

      function onWindowResize() {
        // Update camera aspect ratio and renderer size on window resize
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }

      window.onmousedown = function()
      {
        mouseDown = true;
      }

      window.onmouseup = function()
      {
        mouseDown = false;
      }

}



// });
