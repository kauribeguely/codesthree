import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
// document.addEventListener('DOMContentLoaded', () => {
window.onload = () =>
{

  console.log('Admin JS Codes 3D started');


  // Get the toggle elements (checkboxes)
  const mouseAnimationLinkInput = document.getElementById('mouseAnimationLink');
  const scrollAnimationLinkInput = document.getElementById('scrollAnimationLink');

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
      model.rotation.set(
          parseFloat(THREE.MathUtils.degToRad(sceneData.rotationX)),
          parseFloat(THREE.MathUtils.degToRad(sceneData.rotationY)),
          parseFloat(THREE.MathUtils.degToRad(sceneData.rotationZ))
      );
    }
  };

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
    model.position.x = parseFloat(posXInput.value) || 0;
  };
  posYInput.oninput = () => {
      model.position.y = parseFloat(posYInput.value) || 0;
  };
  posZInput.oninput = () => {
      model.position.z = parseFloat(posZInput.value) || 0;
  };



  const rotXInput = document.getElementById('threejs_rotation_x');
  const rotYInput = document.getElementById('threejs_rotation_y');
  const rotZInput = document.getElementById('threejs_rotation_z');



  rotXInput.oninput = () => {
      model.rotation.x = THREE.MathUtils.degToRad(parseFloat(rotXInput.value) || 0);
  };
  rotYInput.oninput = () => {
      model.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotYInput.value) || 0);
  };
  rotZInput.oninput = () => {
      model.rotation.z = THREE.MathUtils.degToRad(parseFloat(rotZInput.value) || 0);
  };



  const scaleInput = document.getElementById('codes_scale');
  scaleInput.oninput = () => {
      model.scale.set(scaleInput.value, scaleInput.value, scaleInput.value);
  };



    const container = document.getElementById('threejs-canvas');
    const labelContainer = document.getElementById('label'); // Label container for displaying object details

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
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


    let controls;
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
          scene.remove(model);
          scene.remove(controls);

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

          // Allow rotation/repositioning
          controls = new TransformControls(camera, renderer.domElement);
          controls.attach(model);
          scene.add(controls);
          // Listen for changes in the TransformControls
          controls.addEventListener('change', updateTransforms);
          // if()
          window.addEventListener('mousemove', onMouseMove);

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

    const updateTransforms = () => {
      const pos = model.position;
      const rot = model.rotation;
      const scale = model.scale;

      // Update position fields
      posXInput.value = pos.x.toFixed(2);
      posYInput.value = pos.y.toFixed(2);
      posZInput.value = pos.z.toFixed(2);

      sceneData.positionX = pos.x;
      sceneData.positionY = pos.y;
      sceneData.positionZ = pos.z;


      // Update rotation fields (converted from radians to degrees)
      rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
      rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
      rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);

      sceneData.rotationX = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
      sceneData.rotationY = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
      sceneData.rotationZ = THREE.MathUtils.radToDeg(rot.z).toFixed(2);

      initialRotationX = parseFloat(sceneData.rotationX);
      initialRotationY = parseFloat(sceneData.rotationY);
      initialRotationZ = parseFloat(sceneData.rotationZ);


      scaleInput.value = scale.x;
      sceneData.scale = scale.x;

      // console.log(scale, scale.x);

      // THREE.MathUtils.degToRad(sceneData.rotationX)
  };




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
            loadModel(attachment.url, sceneData);

        });

        mediaUploader.open();

    });




      let initialRotationX = parseFloat(sceneData.rotationX);
      let initialRotationY = parseFloat(sceneData.rotationY);
      let initialRotationZ = parseFloat(sceneData.rotationZ);
      // Mousemove listener
      const onMouseMove = (event) =>
      {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalized between -1 and 1
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized between -1 and 1

        // Map mouse position to rotation range
        // model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * rotationRange);
        // model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * rotationRange);
        if(mouseAnimationLink)
        {
          model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
          model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
          model.rotation.z = THREE.MathUtils.degToRad(initialRotationZ + -mouseX * mouseRotationZ);
        }
        // console.log(initialRotationX + mouseY * rotationRange);

      };

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
}
// });
