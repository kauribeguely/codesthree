import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
// document.addEventListener('DOMContentLoaded', () => {
window.onload = () => {

  console.log('Admin JS Codes 3D started');


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



    const container = document.getElementById('threejs-canvas');
    const labelContainer = document.getElementById('label'); // Label container for displaying object details

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const dlight = new THREE.DirectionalLight(0xffffff, 1);
    let dlightIntensity = 1;
    dlight.position.set(5, 5, 5);
    // scene.add(dlight);

    const alight = new THREE.AmbientLight(0xffffff, 1);
    let alightIntensity = 1;
    alight.position.set(5, 5, 5);
    scene.add(alight);

    // Get the sliders by their IDs
    const ambientLightSlider = document.getElementById('ambient-light-slider');
    const lightValue = document.getElementById('light_intensity_value');


    const directionalLightSlider = document.getElementById('directional-light-slider');

    // Event listener to change the intensity of the ambient light
    ambientLightSlider.addEventListener('input', function() {
        alight.intensity = parseFloat(ambientLightSlider.value);
        lightValue.textContent = ambientLightSlider.value;
    });
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

    loadModel('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', sceneData);



    // loader.load('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', (gltf) => {
    //     model = gltf.scene;
    //     scene.add(model);
    //
    //     // Allow rotation/repositioning
    //     controls = new TransformControls(camera, renderer.domElement);
    //     controls.attach(model);
    //     scene.add(controls);
    //     // Listen for changes in the TransformControls
    //     controls.addEventListener('change', updateLabel);
    //
    //     // Save model position/rotation
    //     document.getElementById('save-model-data').addEventListener('click', () => {
    //         const data = {
    //             position: model.position,
    //             rotation: model.rotation
    //         };
    //         fetch(ajaxurl, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 action: 'save_model_data',
    //                 model_data: data
    //             })
    //         }).then(response => response.json()).then(data => {
    //             alert('Model data saved!');
    //         });
    //     });
    // });


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
              parseFloat(sceneData.rotationX),
              parseFloat(sceneData.rotationY),
              parseFloat(sceneData.rotationZ)
          );

          // Allow rotation/repositioning
          controls = new TransformControls(camera, renderer.domElement);
          controls.attach(model);
          scene.add(controls);
          // Listen for changes in the TransformControls
          controls.addEventListener('change', updateLabel);

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

    const updateLabel = () => {
      const pos = model.position;
      const rot = model.rotation;

      // Update position fields
      posXInput.value = pos.x.toFixed(2);
      posYInput.value = pos.y.toFixed(2);
      posZInput.value = pos.z.toFixed(2);

      // Update rotation fields (converted from radians to degrees)
      rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
      rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
      rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);
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
            preview.innerHTML = `Current Model: <a href="${attachment.url}" target="_blank">${attachment.url}</a>`;
            console.log(attachment.url);
            loadModel(attachment.url);

        });

        mediaUploader.open();

    });



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
