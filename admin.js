import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';


class ModelConfig {
    constructor(data = {}) {
        this.modelId = data.modelId || crypto.randomUUID(); // Assign a new ID if not provided
        this.modelUrl = data.modelUrl || '';
        this.modelName = data.modelName || 'New Model';

        // Store position, rotation, scale as THREE.Vector3/Euler for easier use with Three.js
        this.position = new THREE.Vector3(data.positionX || 0, data.positionY || 0, data.positionZ || 0);
        this.rotation = new THREE.Euler(
            THREE.MathUtils.degToRad(data.rotationX || 0),
            THREE.MathUtils.degToRad(data.rotationY || 0),
            THREE.MathUtils.degToRad(data.rotationZ || 0)
        );
        this.scale = new THREE.Vector3(data.scale || 1, data.scale || 1, data.scale || 1); // Assuming uniform scale

        this.loopActive = data.loopActive || 'off';
        this.loopCountX = data.loopCountX || 1;
        // ... other loop properties

        this.threeJsObject = null; // Reference to the actual THREE.Object3D instance
    }

    // Method to convert this class instance back to a plain object for JSON stringification
    toPlainObject() {
        return {
            modelId: this.modelId,
            modelUrl: this.modelUrl,
            modelName: this.modelName,
            positionX: this.position.x,
            positionY: this.position.y,
            positionZ: this.position.z,
            rotationX: THREE.MathUtils.radToDeg(this.rotation.x),
            rotationY: THREE.MathUtils.radToDeg(this.rotation.y),
            rotationZ: THREE.MathUtils.radToDeg(this.rotation.z),
            scale: this.scale.x, // Assuming uniform scale
            loopActive: this.loopActive,
            loopCountX: this.loopCountX,
            // ... include all other properties
        };
    }

    // Static method to create a ModelConfig instance from a plain object (e.g., from loaded JSON)
    static fromPlainObject(obj) {
        return new ModelConfig({
            modelId: obj.modelId,
            modelUrl: obj.modelUrl,
            modelName: obj.modelName,
            positionX: obj.positionX,
            positionY: obj.positionY,
            positionZ: obj.positionZ,
            rotationX: obj.rotationX, // Already degrees in plain object
            rotationY: obj.rotationY,
            rotationZ: obj.rotationZ,
            scale: obj.scale,
            loopActive: obj.loopActive,
            loopCountX: obj.loopCountX,
            // ... include all other properties
        });
    }
}


// document.addEventListener('DOMContentLoaded', () => {
window.onload = () =>
{

  //allSceneData = This is set via main php file, contains globalSettings and models
  let sceneData = allSceneData.globalSettings;
  let allModels = allSceneData.models;
  let allThreeJsObj = [];
  // let globalSettings = allSceneData.globalSettings;
  console.log('Admin JS Codes 3D started');

  let mouseDown = false;
  let mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
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


  let mouseRotationX = sceneData.mouseRotationX || 0; // Maximum rotation range in degrees
  let mouseRotationY = sceneData.mouseRotationY || 0; // Maximum rotation range in degrees
  let mouseRotationZ = sceneData.mouseRotationZ || 0; // Maximum rotation range in degrees

  let mouseAnimationLink = sceneData.mouseAnimationLink === 'on';
  let scrollAnimationLink = sceneData.scrollAnimationLink === 'on';

  const lightIntensityInput = document.getElementById('lightIntensity');
  const lightPosXInput = document.getElementById('lightPosX');
  const lightPosYInput = document.getElementById('lightPosY');
  const lightPosZInput = document.getElementById('lightPosZ');
  const useEnvLightInput = document.getElementById('useEnvLight');


  const toggleButton = document.getElementById('toggleControls');
  let isControlsVisible = true;
  toggleButton.addEventListener('click', () => {
      isControlsVisible = !isControlsVisible;

      function toggleVisibility(selector) {
          document.querySelector(selector).style.display = isControlsVisible ? 'flex' : 'none';
      }

      toggleVisibility('.rightControls');
      toggleVisibility('.leftControls');
      toggleVisibility('.topTransforms');

      controls.visible = isControlsVisible;
      groupControls.visible = isControlsVisible;

      if(isControlsVisible)
      {
        if(loopActive)
        {
          controls.visible = false;
          groupControls.visible = true;
        }
        else
        {
          controls.visible = true;
          groupControls.visible = false;
        }
      }
  });

  const loopGroupScaleInput = document.getElementById('loopGroupScale');
  loopGroupScaleInput.oninput = () =>
  {
    sceneData.loopGroupScale = parseFloat(loopGroupScaleInput.value) || 1.0;
    fullLoopGroup.scale.set(loopGroupScaleInput.value, loopGroupScaleInput.value, loopGroupScaleInput.value);
  };

  // let lightIntensity = sceneData.lightIntensity || 1.0;
  // let lightPosX = sceneData.lightPosX || 0;
  // let lightPosY = sceneData.lightPosY || 10;
  // let lightPosZ = sceneData.lightPosZ || 0;
  let useEnvLight = sceneData.useEnvLight  === 'on';
  // let loopGroupScale = sceneData.loopGroupScale || 1.0;

  // directionalLightIntensityInput.oninput = () => {
  //   sceneData.directionalLightIntensity = parseFloat(directionalLightIntensityInput.value) || 1.0;
  // };

  lightPosXInput.oninput = () => {
      sceneData.lightPosX = parseFloat(lightPosXInput.value) || 0;
      updateDLightPos();
  };

  lightPosYInput.oninput = () => {
      sceneData.lightPosY = parseFloat(lightPosYInput.value) || 0;
      updateDLightPos();
  };

  lightPosZInput.oninput = () => {
      sceneData.lightPosZ = parseFloat(lightPosZInput.value) || 0;
      updateDLightPos();
  };

  function updateDLightPos()
  {
    dlight.position.set(sceneData.lightPosX, sceneData.lightPosY, sceneData.lightPosZ);
    updateSaveField();
  }

  useEnvLightInput.oninput = () => {
      sceneData.useEnvLight = useEnvLightInput.checked;
      useEnvLight = useEnvLightInput.checked;;
      updateEnvTexture();
  };

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

      // reset movement to none
      // transformObjectToSceneData(model);
      // transformObjectToSceneData(fullLoopGroup);

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
    groupControls.visible = true;
    if (groupControls.parent !== scene) { // Check if groupControls is NOT already a child of the scene
      scene.add(groupControls);
    }
    fullLoopGroup.visible = true;
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
  // perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  // orthoCamera = new THREE.OrthographicCamera( container.clientWidth / - isoZoom, container.clientWidth / isoZoom, container.clientHeight / isoZoom, container.clientHeight / - isoZoom, 1, 1000 );


  scene.remove(camera);
    if (sceneData.isOrthoCamera) {
        camera = orthoCamera;
    } else {
        camera = perspectiveCamera;
    }
    // controls.camera = camera;
    groupControls.camera = camera;

    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    scene.add(camera);

    renderer.render(scene, camera);
}


    const container = document.getElementById('threejs-canvas');
    const labelContainer = document.getElementById('label'); // Label container for displaying object details

    let isoZoom = 250;
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
// scene.add( camera );

    const rgbeLoader = new RGBELoader();

    updateEnvTexture();


    let cameraPos = [0, 0, 5];

    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    renderer.outputEncoding = THREE.sRGBEncoding;


    const dlight = new THREE.DirectionalLight(0xffffff, 1);
    let dlightIntensity = sceneData.directionalLightIntensity;
    dlight.position.set(sceneData.lightPosX, sceneData.lightPosY, sceneData.lightPosZ);
    scene.add(dlight);

    const alight = new THREE.AmbientLight(0xffffff, 1);
    let alightIntensity = sceneData.ambientLightIntensity;
    // alight.position.set(5, 5, 5);
    scene.add(alight);

    // Get the sliders by their IDs
    const ambientLightSlider = document.getElementById('ambient_light_intensity');
    const lightValue = document.getElementById('light_intensity_value');


    const directionalLightSlider = document.getElementById('directionalLightIntensity');
    const dirLightValue = document.getElementById('directional_intensity_value');

    // Event listener to change the intensity of the ambient light
    ambientLightSlider.addEventListener('input', function() {
        alight.intensity = parseFloat(ambientLightSlider.value);
        setLightIntensity(alight, ambientLightSlider.value);
        lightValue.textContent = ambientLightSlider.value;
    });

    directionalLightSlider.addEventListener('input', function() {
        dlight.intensity = parseFloat(directionalLightSlider.value);
        setLightIntensity(dlight, directionalLightSlider.value);
        dirLightValue.textContent = directionalLightSlider.value;
    });

    function setLightIntensity(light, intensity)
    {
      light.intensity = parseFloat(intensity);
    }

    console.log('Light: ' + sceneData.ambientLightIntensity);
    setLightIntensity(alight, sceneData.ambientLightIntensity);

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

    //INIT()
    let controls, groupControls;

    controls = new TransformControls(camera, renderer.domElement);
    scene.add(controls);
      

    let selectedObj; //override model
    // let allModels = [];
    let model, loopGroup;


    // Load 3D Model
    // const loader = new THREE.GLTFLoader();
    const loader = new GLTFLoader();


    let loopable;
    // let spacing = 1.1;
    let spacing = sceneData.itemSpacing;
    let fullLoopGroup = new THREE.Group();
    let objGroup = new THREE.Group();
    let orbitActive = false;
    // Load Environment Map (HDR)

    let orbit;
    // orbit = new OrbitControls(camera, renderer.domElement);
    function init()
    {
      fullLoopGroup.add(objGroup);
      fullLoopGroup.scale.set(sceneData.loopGroupScale, sceneData.loopGroupScale, sceneData.loopGroupScale);
      // scene.add(objGroup);
      scene.add(fullLoopGroup);

      // loadEnvTexture('sunset.hdr');
      // loadEnvTexture('studio.hdr');

      groupControls = new TransformControls(camera, renderer.domElement);
      // groupControls.attach(objGroup);
      groupControls.attach(fullLoopGroup);
      groupControls.setSpace('local');  // Ensure local space is used


      // if(sceneData.modelUrl != "")
      //check if any models exist
      if(allModels.length != 0)
      {
        loadAllModels();
        // loadModel(sceneData.allModels[0].modelUrl, sceneData.allModels[0], true);
        //loop all models and run loadModel
        // loadModel(sceneData.modelUrl, sceneData, true);
      }
      else
      {
        //when intiate new scene, show the open popup
        popup.style.display = 'flex';
        popupOpen = true;
      }

        
         // 5. Basic Test Cube (Sanity Check: Can we see anything at all?)
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green, needs lights
        // const testCube = new THREE.Mesh(geometry, material);
        // testCube.position.set(0, 0, 0); // Place it at the center
        // scene.add(testCube);
        // console.log("DEBUG: Basic green cube added to scene at (0,0,0). You should see this.");


        // 6. Add Helpers for Visualization (NEW ADDITION)
        // Axes Helper: Red = X, Green = Y, Blue = Z
        const axesHelper = new THREE.AxesHelper(5); // Size 5 units
        scene.add(axesHelper);
        console.log("DEBUG: AxesHelper added (5 units).");

        // Grid Helper: Grid on XZ plane
        const gridHelper = new THREE.GridHelper(10, 10); // 10x10 units, 10 divisions
        scene.add(gridHelper);
        console.log("DEBUG: GridHelper added (10x10 units).");

        // Directional Light Helper (already there, just ensuring its log is here for context)
        const lightHelper = new THREE.DirectionalLightHelper(dlight, 2); // Helper size 2
        scene.add(lightHelper);
        console.log("DEBUG: Directional Light Helper added.");


        // 7. Initialize TransformControls (Only once globally)
        // controls = new THREE.TransformControls(camera, renderer.domElement);
        // scene.add(controls);

      scene.add(groupControls);
      if(sceneData.loopActive)
      {
        sceneDataLoop();
        document.querySelector('#codesScaleButton').disabled = true;

      }
      else
      {
        groupControls.visible = false;
      }

      updateSaveField();
    }

    function loadEnvTexture(url)
    {
      // rgbeLoader.load('../wp-content/plugins/codesthree/sunset.hdr', function (texture)
      rgbeLoader.load('../wp-content/plugins/codesthree/'+ url, function (texture)
      {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        // scene.background = texture;
      });
    }

    function loadAllModels()
    {
      allModels.forEach(function(model)
      {
        loadModel(model.modelUrl, model, true);
      });
    }

    // loadModel('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', sceneData);

    //isNew checks if current url/model to be updated
    // function loadModel(url, sceneData, isNew)
    function loadModel(url, objData, isNew)
    {
      loader.load(url, (gltf) =>
      {
        const newThreeJsObject = gltf.scene;
            let modelConfigInstance; // This will be our ModelConfig class instance

            // --- Determine if this is a new model or an existing one being loaded/reloaded ---
            if (objData) {
                // Scenario 2: Loading/Reloading an Existing Model
                // We're creating a ModelConfig instance from the plain data we loaded.
                modelConfigInstance = ModelConfig.fromPlainObject(objData);
                modelConfigInstance.modelUrl = url; // Ensure the URL is up-to-date in the instance

                // Before adding the new object, remove the old THREE.Object3D instance if it exists.
                // This is crucial if we're reloading a model that's already in the scene (e.g., changing its URL).
                const oldThreeJsObject = allThreeJsObj.find(obj => obj.userData.modelId === modelConfigInstance.modelId);
                if (oldThreeJsObject) {
                    scene.remove(oldThreeJsObject);
                    // Remove from our active tracking array
                    allThreeJsObj = allThreeJsObj.filter(obj => obj.userData.modelId !== modelConfigInstance.modelId);
                    console.log(`Removed old Three.js object for modelId: ${modelConfigInstance.modelId}`);
                }

                // Apply saved transforms to the new Three.js object
                newThreeJsObject.position.copy(modelConfigInstance.position);
                newThreeJsObject.rotation.copy(modelConfigInstance.rotation);
                newThreeJsObject.scale.copy(modelConfigInstance.scale);

                // Find the corresponding plain object in sceneData.models and update it
                // This ensures sceneData.models is kept in sync with the current instance state
                // (e.g., if modelUrl changed).
                const existingModelIndex = allModels.findIndex(m => m.modelId === modelConfigInstance.modelId);
                if (existingModelIndex !== -1) {
                    allModels[existingModelIndex] = modelConfigInstance.toPlainObject();
                } else {
                    // This scenario suggests a logic error if objData was provided but not found.
                    // For robustness, add it as new.
                    console.warn(`ModelConfig with ID ${modelConfigInstance.modelId} not found in sceneData.models during update; adding as new.`);
                    allModels.push(modelConfigInstance.toPlainObject());
                }

            } else {
                // Scenario 1: Loading a New Model (no existing config provided)
                // Create a completely new ModelConfig instance.
                modelConfigInstance = new ModelConfig({ modelUrl: url });

                // Apply default (or initial UI) transforms to the new Three.js object.
                // The ModelConfig constructor already sets defaults for position, rotation, scale.
                newThreeJsObject.position.copy(modelConfigInstance.position);
                newThreeJsObject.rotation.copy(modelConfigInstance.rotation);
                newThreeJsObject.scale.copy(modelConfigInstance.scale);

                // Add the plain object representation of this new model to sceneData.models for saving.
                allModels.push(modelConfigInstance.toPlainObject());
                console.log("Added new model config to allModels:", modelConfigInstance.toPlainObject());
            }

            // --- Link the ModelConfig instance to the THREE.Object3D via userData ---
            newThreeJsObject.userData.modelId = modelConfigInstance.modelId;
            newThreeJsObject.userData.modelConfigRef = modelConfigInstance; // Crucial for easy access

            // Link the THREE.Object3D back to the ModelConfig instance (optional but useful)
            modelConfigInstance.threeJsObject = newThreeJsObject;

            // Add the new Three.js object to our active tracking array and the scene.
            selectedObj = newThreeJsObject;
            allThreeJsObj.push(newThreeJsObject);
            scene.add(newThreeJsObject);

            // Update the globally selected object (if applicable for UI/TransformControls).
            // This is often done externally after this function resolves.
            // For now, let's just make it the new selected object if controls exist.
            if (controls) {
                controls.detach(); // Detach from any previously selected object
                controls.attach(newThreeJsObject);
                controls.setSpace('local');
                // Ensure controls are in the scene (might be redundant if always there)
                // scene.add(controls);
            }

            // --- Crucially, update the hidden JSON field for saving ---
            updateSaveField();

          // scene.add(controls);
          // // Listen for changes in the TransformControls
          // controls.addEventListener('change', updateTransforms);
          // controls.addEventListener('mouseDown', transformDragStart);
          // controls.addEventListener('mouseUp', transformDragEnd);
          // // if()
          // window.addEventListener('mousemove', onMouseMove);

          // if(objData.loopActive)
          // {
          //   selectedObj.visible = false;
          //   controls.visible = false;
          //   // scene.remove(model);
          //   // scene.remove(controls);
          // }
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
        const ret = Math.round(value * multiplier) / multiplier;
        console.log(ret);
        return Math.round(value * multiplier) / multiplier;
    }

    const updateTransforms = () => {
      let pos = selectedObj.position;
      let rot = selectedObj.rotation;
      let scale = selectedObj.scale;

      if(sceneData.loopActive)
      {
        pos = fullLoopGroup.position;
        // rot = objGroup.rotation;
        rot = new THREE.Euler().setFromQuaternion(fullLoopGroup.quaternion); // Handle group rotation correctly
        // scale = objGroup.scale;
        sceneData.loopGroupScale = fullLoopGroup.scale;
        loopGroupScaleInput.value = round(fullLoopGroup.scale.x, 2);
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
      // posXInput.value = round(pos.x, 0.1).toFixed(2);
      // posYInput.value = round(pos.y, 0.1).toFixed(2);
      // posZInput.value = round(pos.z, 0.1).toFixed(2);

      
      
      // sceneData.positionX = pos.x;
      // sceneData.positionY = pos.y;
      // sceneData.positionZ = pos.z;
      
      const modelConfigInstance = selectedObj.userData.modelConfigRef;
      
      //why only in here?
      if (isTransforming) {
        // Update rotation fields (converted from radians to degrees)
        rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
        rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
        rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);
        // rotXInput.value = round(THREE.MathUtils.radToDeg(rot.x)).toFixed(2);
        // rotYInput.value = round(THREE.MathUtils.radToDeg(rot.y)).toFixed(2);
        // rotZInput.value = round(THREE.MathUtils.radToDeg(rot.z)).toFixed(2);
        

        // sceneData.rotationX = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
        // sceneData.rotationY = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
        // sceneData.rotationZ = THREE.MathUtils.radToDeg(rot.z).toFixed(2);
        
        
        
        // initialRotationX = parseFloat(THREE.MathUtils.radToDeg(rot.x).toFixed(2));
        // initialRotationY = parseFloat(THREE.MathUtils.radToDeg(rot.y).toFixed(2));
        // initialRotationZ = parseFloat(THREE.MathUtils.radToDeg(rot.z).toFixed(2));
        
        // initialRotationX = parseFloat(sceneData.rotationX);
        // initialRotationY = parseFloat(sceneData.rotationY);
        // initialRotationZ = parseFloat(sceneData.rotationZ);
        
        // refreshLoop();
        
      }
      
      rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
      rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
      rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);
      
      scaleInput.value = round(scale.x, 2);
      // sceneData.scale = round(scale.x, 2);
      
      modelConfigInstance.position.copy(selectedObj.position);
      modelConfigInstance.rotation.copy(selectedObj.rotation);
      modelConfigInstance.scale.copy(selectedObj.scale);
      const existingModelIndex = allModels.findIndex(m => m.modelId === modelConfigInstance.modelId);

      if (existingModelIndex !== -1) {
          // Replace the old plain object with the updated one from our ModelConfig instance.
          allModels[existingModelIndex] = modelConfigInstance.toPlainObject();
          // console.log(`Updated model config for ID: ${modelConfigInstance.modelId} in sceneData.models.`);
      }

      updateSaveField();
      // console.log(scale, scale.x);

      // THREE.MathUtils.degToRad(sceneData.rotationX)
  };

  controls.addEventListener('change', updateTransforms);
  controls.addEventListener('mouseDown', transformDragStart);
  controls.addEventListener('mouseUp', transformDragEnd);

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
    const popupMediaButton = document.getElementById('popup_media_button');
    const addModelButton = document.getElementById('add_model_button');
    const popup = document.getElementById('newScenePopup');
    const modelUrlField = document.getElementById('threejs_model_url');
    const preview = document.getElementById('threejs_model_url_preview');


    let popupOpen = false;
    //TODO: check whether it's replace selected url or add new model
    popupMediaButton.addEventListener('click', function (e) {
      e.preventDefault();
      mediaUploader.open();
    });

    mediaButton.addEventListener('click', function (e) {
        e.preventDefault();
        mediaUploader.open();
    });

    addModelButton.addEventListener('click', function (e) {
        e.preventDefault();
        mediaUploader.open();
    });


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
          loadModel(attachment.url, false, true);
        }

        if(popupOpen)
        {
          popupOpen = false;
          popup.style.display = 'none';
        }

    });


      let initialRotationX = 0;
      let initialRotationY = 0;
      let initialRotationZ = 0;
      // let initialRotationX = parseFloat(sceneData.rotationX);
      // let initialRotationY = parseFloat(sceneData.rotationY);
      // let initialRotationZ = parseFloat(sceneData.rotationZ);

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
              const easing = 0.1 + (1 - 0.1) * 0.05; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

              currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, easing);
              currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, easing);
              currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.z, easing);

              scene.rotation.x = currentRotation.x;
              scene.rotation.y = currentRotation.y;
              scene.rotation.z = currentRotation.z;

              fullLoopGroup.rotation.x = currentRotation.x;
              fullLoopGroup.rotation.y = currentRotation.y;
              fullLoopGroup.rotation.z = currentRotation.z;
          }
      };
      window.addEventListener('mousemove', onMouseMove);

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

      function transformObjectToSceneData(object, objData)
      {
        object.position.set(
            parseFloat(objData.positionX),
            parseFloat(objData.positionY),
            parseFloat(objData.positionZ)
        );

        object.rotation.set(
            parseFloat(THREE.MathUtils.degToRad(objData.rotationX)),
            parseFloat(THREE.MathUtils.degToRad(objData.rotationY)),
            parseFloat(THREE.MathUtils.degToRad(objData.rotationZ))
        );

        currentRotation.copy(object.rotation); // The most direct way
        console.log(object.position);
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
        // if(orbitActive) orbit.update(); // Call controls.update() in the animation loop
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
                break;
                // dont allow scaling of group, must be set via single or input
                // groupControls.setMode('scale');
            case 'o':
                orbitActive = !orbitActive;
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

      window.onmousedown = function(e)
      {
        selectObjWithClick(e);

        mouseDown = true;
      }

      window.onmouseup = function(e)
      {
        mouseDown = false;
      }

      function selectObjWithClick(event)
      {
        // 1. Calculate mouse position in normalized device coordinates (-1 to +1)
        //    relative to the viewport size.
        //    event.clientX/Y are screen coordinates.
        //    renderer.domElement.getBoundingClientRect() gives canvas position/size.
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 2. Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // 3. Find intersecting objects.
        //    Only intersect with objects you want to be selectable.
        //    `modelsInScene` should contain your top-level loaded models/groups.
        const intersects = raycaster.intersectObjects(allThreeJsObj, true); // `true` for recursive (checks children)

        // Check if TransformControls is active/dragging. If so, don't re-select.
        // This is important to prevent accidental re-selection when trying to drag an object.
        if (controls.dragging) {
            // console.log("Controls are dragging, ignoring mouse up for selection.");
            return;
        }

        if (intersects.length > 0) {
            // An object was clicked! Get the first (closest) intersected object.
            let clickedObject = intersects[0].object;
            // console.log("Clicked object (raw):", clickedObject);
            controls.enabled = true;
            controls.visible = true;

            // Find the top-level object in `modelsInScene` that this clicked object belongs to.
            // This is crucial because `TransformControls` needs to attach to the top-level group/model.
            let selectableObject = null;
            while (clickedObject) {
                if (allThreeJsObj.includes(clickedObject)) {
                    selectableObject = clickedObject;
                    break;
                }
                clickedObject = clickedObject.parent;
            }

              selectModelForEditing(selectableObject); // Call your existing selection function


            // if (selectableObject && selectableObject !== selectedObj) {
            //     // A new object is selected
            //     console.log("Selected a new object:", selectableObject.name || selectableObject.uuid);
            //     selectModelForEditing(selectableObject); // Call your existing selection function
            // } else if (selectableObject === selectedObj) {
            //     console.log("Clicked the currently selected object. No change.");
            //     // Optionally, you could toggle controls mode (translate/rotate/scale) here
            // }

        } else {
            // No object was clicked, so deselect the current one (optional)
            if (selectedObj) {
                console.log("Clicked empty space. Deselecting object.");
                // controls.detach();
                controls.visible = false;
                controls.enabled = false;
                // selectedObj = null;
                // Optionally, clear your UI fields here too
                // transformObjectToSceneData(null); // Or a function to clear fields
            }
        }
      }

      function selectModelForEditing(obj)
      {
        selectedObj = obj;
        controls.attach(selectedObj);
      }


      function updateSaveField()
      {
        const hiddenInputField = document.getElementById('threejs_scene_config_json');

        if (hiddenInputField) 
          {
                try {
                    // Stringify the entire sceneData object
                    hiddenInputField.value = JSON.stringify(allSceneData);
                    // console.log("Hidden config field updated successfully.");
                    // console.log("Current hidden field value (first 200 chars):", hiddenInputField.value.substring(0, 200));
                } catch (e) {
                    console.error("Error stringifying sceneData:", e);
                    // Optionally, clear the field or revert to a safe state if stringification fails
                    hiddenInputField.value = '';
                }
            } else {
                console.warn("Hidden input field with ID 'threejs_scene_config_json' not found!");
            }
        }

      init();

}



// });
