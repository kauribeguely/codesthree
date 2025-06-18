import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { TransformControls } from 'three/addons/TransformControls.js';
import { RGBELoader } from 'three/addons/RGBELoader.js';


//Feel like i could just make a 2d array that links created threejs models to 
// utility functions could make this worth it: animate etc

class ModelConfig {
    constructor(data = {}) {
        this.modelId = data.modelId || crypto.randomUUID(); // Assign a new ID if not provided
        this.modelUrl = data.modelUrl || '';
        this.modelName = data.modelName || data.modelUrl.split('/').pop();; //Allow changable via object list, default to filename (like object list)

        // Store position, rotation, scale as THREE.Vector3/Euler for easier use with Three.js
        this.position = new THREE.Vector3(data.positionX || 0, data.positionY || 0, data.positionZ || 0);
        this.rotation = new THREE.Euler(
            THREE.MathUtils.degToRad(data.rotationX || 0),
            THREE.MathUtils.degToRad(data.rotationY || 0),
            THREE.MathUtils.degToRad(data.rotationZ || 0)
        );
        this.scale = new THREE.Vector3(data.scale || 1, data.scale || 1, data.scale || 1); // Assuming uniform scale

        this.loopActive = data.loopActive || false;
        this.loopCountX = data.loopCountX || 1;
        // ... other loop properties

        this.isMobileConfig = data.isMobileConfig || false;

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


let keyXRot = false, keyYRot = false, keyZRot = false, keyZTrans = false, keyScale = false;
let shiftDown = false;
let scrollMultiplier = 1;
let isInitialLoad = true;
let itemsLoaded = 0;
// document.addEventListener('DOMContentLoaded', () => {
window.onload = () =>
{

  let plane = new THREE.Plane();
  let isDragging = false;
  let offset = new THREE.Vector3(); // To store the offset between click point and object center
  let initialIntersectionPoint = new THREE.Vector3();

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
  console.log('Admin JS Codes 3D started');

  let mouseDown = false;
  let mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let isTransforming = false;
  
  const translateModeButton = document.getElementById('btnTranslateMode');
  const rotateModeButton = document.getElementById('btnRotateMode');
  const scaleModeButton = document.getElementById('codesScaleButton');

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
  let scrollMoveX = sceneData.scrollMoveX;
  let scrollMoveY = sceneData.scrollMoveY;
  let scrollMoveZ = sceneData.scrollMoveZ;

  // Get the mouse rotation inputs
  const mouseRotXInput = document.getElementById('mouseRotationX');
  const mouseRotYInput = document.getElementById('mouseRotationY');
  const mouseRotZInput = document.getElementById('mouseRotationZ');


  let mouseRotationX = sceneData.mouseRotationX || 0; // Maximum rotation range in degrees
  let mouseRotationY = sceneData.mouseRotationY || 0; // Maximum rotation range in degrees
  let mouseRotationZ = sceneData.mouseRotationZ || 0; // Maximum rotation range in degrees

  let mouseAnimationLink = sceneData.mouseAnimationLink;
  mouseAnimationLinkInput.checked = mouseAnimationLink;
  let scrollAnimationLink = sceneData.scrollAnimationLink;
  scrollAnimationLinkInput.checked = scrollAnimationLink;

  const lightIntensityInput = document.getElementById('lightIntensity');
  const lightPosXInput = document.getElementById('lightPosX');
  const lightPosYInput = document.getElementById('lightPosY');
  const lightPosZInput = document.getElementById('lightPosZ');
  const useEnvLightInput = document.getElementById('useEnvLight');


  const toggleButton = document.getElementById('toggleControls');
  let isControlsVisible = true;
  toggleButton.addEventListener('click', () => {
      isControlsVisible = !isControlsVisible;      

      toggleVisibility('.rightControls');
      toggleVisibility('.leftControls');
      toggleVisibility('.topTransforms');

      // controls.visible = isControlsVisible;
      groupControls.visible = isControlsVisible;
      axesHelper.visible = isControlsVisible;
      gridHelper.visible = isControlsVisible;
      lightHelper.visible = isControlsVisible;


      if(isControlsVisible)
      {
        if(loopActive)
        {
          // controls.visible = false;
          groupControls.visible = true;
        }
        else
        {
          // controls.visible = true;
          groupControls.visible = false;
        }
      }
      
  });

  let isMobileView = false;
  const toggleMobileButton = document.getElementById('mobileMode');
  const breakPoint = document.getElementById('breakPoint');
  breakPoint.oninput = () =>
  {
    sceneData.breakpoint = parseFloat(breakPoint.value);
    updateMobileOutlineWidth();
  };

  const mobileOutline = document.getElementById('mobileOutline');
  updateMobileOutlineWidth();
  toggleMobileButton.addEventListener('click', toggleMobile);
  function toggleMobile()
  {
    isMobileView = !isMobileView;
    //change transforms on screen to match current mode
    if(isMobileView)
    {      
      mobileOutline.style.display = 'block';
    }
    else
    {
      mobileOutline.style.display = 'none';
    }
    // console.log(allSceneData);
    applyAllTransformsFromConfigs();    
  }

  function updateMobileOutlineWidth()
  {
    mobileOutline.style.width = sceneData.breakpoint +'px';
  }

  function applyAllTransformsFromConfigs()
  {
    allThreeJsObj.forEach(function(obj)
    {
      let currentConfig = isMobileView ? obj.userData.modelConfigRefMob : obj.userData.modelConfigRef;
      applyTransformFromConfig(obj, currentConfig);
    });    
    updateTransforms();
  }

  function applyTransformFromConfig(object, config)
  {
    object.position.copy(config.position);
    object.rotation.copy(config.rotation);
    object.scale.copy(config.scale);
  }


  const toggleGizmoButton = document.getElementById('toggleGizmo');
  toggleGizmoButton.addEventListener('click', () => {
    gizmoVisible = !gizmoVisible;
    setGizmoVisible(gizmoVisible);
  });

  function setGizmoVisible(visible)
  {
    gizmoVisible = visible;
    controls.visible = gizmoVisible;
    controls.enabled = gizmoVisible;
    if(!visible)
    {
      document.querySelectorAll('.transModeButton').forEach(button => 
      {
        button.classList.remove('transButtonActive');
      });
    }
  }

  function toggleVisibility(selector) {
          document.querySelector(selector).style.display = isControlsVisible ? 'flex' : 'none';
      }

  const loopGroupScaleInput = document.getElementById('loopGroupScale');
  loopGroupScaleInput.oninput = () =>
  {
    sceneData.loopGroupScale = parseFloat(loopGroupScaleInput.value) || 1.0;
    fullLoopGroup.scale.set(loopGroupScaleInput.value, loopGroupScaleInput.value, loopGroupScaleInput.value);
  };

  let useEnvLight = sceneData.useEnvLight;
  useEnvLightInput.checked = useEnvLight;
  // let loopGroupScale = sceneData.loopGroupScale || 1.0;

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
  }

  useEnvLightInput.oninput = () => {
      
      useEnvLight = useEnvLightInput.checked;
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
  mouseAnimationLinkInput.oninput = () => 
  {
    refreshMouseAnimationLink();
  };

  function refreshMouseAnimationLink()
  {
    mouseAnimationLink = mouseAnimationLinkInput.checked;
    if(!mouseAnimationLink)
    {
      rotateGroup.rotation.set(0, 0, 0);
      // model.rotation.set(
      //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationX)),
      //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationY)),
      //     parseFloat(THREE.MathUtils.degToRad(sceneData.rotationZ))
      // );

      // reset movement to none
      // transformObjectToSceneData(model);
      // transformObjectToSceneData(fullLoopGroup);

    }
  }

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
    selectedObjData.position.x = parseFloat(posXInput.value);
    transformObjectToSceneData(selectedObj);
  };

  posYInput.oninput = () => {
    selectedObjData.position.y = parseFloat(posYInput.value);
    transformObjectToSceneData(selectedObj);
  
  };

  posZInput.oninput = () => {
    selectedObjData.position.z = parseFloat(posZInput.value);
    transformObjectToSceneData(selectedObj);
  };

  const rotXInput = document.getElementById('threejs_rotation_x');
  const rotYInput = document.getElementById('threejs_rotation_y');
  const rotZInput = document.getElementById('threejs_rotation_z');

  rotXInput.oninput = () => {
      selectedObjData.rotation.x = THREE.MathUtils.degToRad(parseFloat(rotXInput.value) || 0);
      transformObjectToSceneData(selectedObj);
  };

  rotYInput.oninput = () => {
      selectedObjData.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotYInput.value) || 0);
      transformObjectToSceneData(selectedObj);
  };

  rotZInput.oninput = () => {
      selectedObjData.rotation.z = THREE.MathUtils.degToRad(parseFloat(rotZInput.value) || 0);
      transformObjectToSceneData(selectedObj);
  };



  const scaleInput = document.getElementById('codes_scale');
  scaleInput.oninput = () =>
  {
    selectedObjData.scale.setScalar(parseFloat(scaleInput.value));
    transformObjectToSceneData(selectedObj);
    
    // model.scale.set(scaleInput.value, scaleInput.value, scaleInput.value);
    // sceneData.scale = scaleInput.value;
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
  let isOrthoCamera = sceneData.isOrthoCamera;

  const loopActiveInput = document.getElementById('loopActive');
  const loopCountXInput = document.getElementById('loopCountX');
  const loopCountYInput = document.getElementById('loopCountY');
  const loopCountZInput = document.getElementById('loopCountZ');
  const itemSpacingInput = document.getElementById('itemSpacing');
  const isOrthoCameraInput = document.getElementById('isOrthoCamera');
  isOrthoCameraInput.checked = isOrthoCamera;


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
    scaleModeButton.disabled = true;
    // scene.remove(controls);
    refreshLoop();
  }
  else
  {
    // scene.remove(groupControls);
    // scene.remove(fullLoopGroup);
    scaleModeButton.disabled = false;
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
    let rotateGroup = new THREE.Group();
    scene.add(rotateGroup);
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
    dlight.intensity = dlightIntensity;
    scene.add(dlight);

    const alight = new THREE.AmbientLight(0xffffff, 1);
    let alightIntensity = sceneData.ambientLightIntensity;
    alight.intensity = alightIntensity;

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


    //INIT()
    let controls, groupControls;


    let gizmoVisible = true;

    controls = new TransformControls(camera, renderer.domElement);
    scene.add(controls);
    controls.visible = gizmoVisible;
      

    let selectedObj, selectedObjData; //override model
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
      // 6. Add Helpers for Visualization (NEW ADDITION)
    // Axes Helper: Red = X, Green = Y, Blue = Z
    const axesHelper = new THREE.AxesHelper(5); // Size 5 units
    // scene.add(axesHelper);

    // Grid Helper: Grid on XZ plane
    const gridHelper = new THREE.GridHelper(10, 10); // 10x10 units, 10 divisions
    // scene.add(gridHelper);

    // Directional Light Helper (already there, just ensuring its log is here for context)
    const lightHelper = new THREE.DirectionalLightHelper(dlight, 2); // Helper size 2
    scene.add(lightHelper);

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
        showUploadPopup()
      }

      scene.add(groupControls);
      // if(sceneData.loopActive)
      // {
      //   sceneDataLoop();
      //   document.querySelector('#codesScaleButton').disabled = true;

      // }
      // else
      // {
      //   groupControls.visible = false;
      // }

      updateSaveField();
    }

    function showUploadPopup()
    {      
        popup.style.display = 'flex';
        popupOpen = true;
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
      allModels.forEach(function(model, index)
      {
        loadModel(model.modelUrl, model, false, index);
      });      
    }

    function loadAllMobileData()
    {
      allMobileModels.forEach(function(model, index)
      {
        //only add their data to the relative model config
          //
        // loadModel(model.modelUrl, model, true);
        addMobDataToConfigRef(model, index);
      });
    }

    function addMobDataToConfigRef(data, index)
    {
      //find related object 
      // const modelId = allThreeJsObj.findIndex(m => m.modelId === data.modelId);
      // const threeJsObject = selectObjectFromList(data.modelId);
      const threeJsObject = allThreeJsObj[index];
      // console.log(index, threeJsObject.userData.modelConfigRef.modelUrl, data.modelUrl);
      threeJsObject.userData.modelConfigRefMob = ModelConfig.fromPlainObject(data);
    }

    function duplicateObject(sceneObj)
    {
      const oldObjData = sceneObj.userData.modelConfigRef.toPlainObject();
      const objData = JSON.parse(JSON.stringify(oldObjData)); 
      
      const oldObjDataMob = sceneObj.userData.modelConfigRefMob.toPlainObject();
      const objDataMob = JSON.parse(JSON.stringify(oldObjDataMob)); 
      objData.modelId = crypto.randomUUID();
      objDataMob.modelId = objData.modelId;

      loadModel(objData.modelUrl, objData, function()
      {
        addMobDataToConfigRef(objDataMob, allThreeJsObj.length-1);
      });      
    }

    function cloneSelected()
    {
      duplicateObject(selectedObj);
    }

    // loadModel('http://localhost/wPpractice/wp-content/uploads/2025/01/first-room.glb', sceneData);

    //isNew checks if current url/model to be updated
    // function loadModel(url, sceneData, isNew)
    function loadModel(url, objData, callback, index)
    {
      loader.load(url, (gltf) =>
      {
          const newThreeJsObject = gltf.scene;
          let modelConfigInstance, modelConfigInstanceMob; // This will be our ModelConfig class instance

          // let modelList = allModels;
          // if(isMobile)
          // {
          //   modelList = allMobileModels;
          // }

          // --- Determine if this is a new model or an existing one being loaded/reloaded ---
          if (objData) 
          {
              // Scenario 2: Loading/Reloading an Existing Model
              // We're creating a ModelConfig instance from the plain data we loaded.
              modelConfigInstance = ModelConfig.fromPlainObject(objData);
              modelConfigInstance.modelUrl = url; // Ensure the URL is up-to-date in the instance

              // Before adding the new object, remove the old THREE.Object3D instance if it exists.
              // const oldThreeJsObject = allThreeJsObj.find(obj => obj.userData.modelConfigRef.modelId === modelConfigInstance.modelId);
              // if (oldThreeJsObject) {
              //     scene.remove(oldThreeJsObject);
              //     // Remove from our active tracking array
              //     allThreeJsObj = allThreeJsObj.filter(obj => obj.userData.modelId !== modelConfigInstance.modelId);
              //     console.log(`Removed old Three.js object for modelId: ${modelConfigInstance.modelId}`);
              // }

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

            } 
            else //no obj data provided i.e. new object
            {

                // Scenario 1: Loading a New Model (no existing config provided)
                // Create a completely new ModelConfig instance.
                modelConfigInstance = new ModelConfig({ modelUrl: url });
                modelConfigInstanceMob = new ModelConfig({ modelUrl: url, isMobileConfig: true});

                // Apply default (or initial UI) transforms to the new Three.js object.
                // The ModelConfig constructor already sets defaults for position, rotation, scale.
                newThreeJsObject.position.copy(modelConfigInstance.position);
                newThreeJsObject.rotation.copy(modelConfigInstance.rotation);
                newThreeJsObject.scale.copy(modelConfigInstance.scale);

                // Add the plain object representation of this new model to sceneData.models for saving.
                allModels.push(modelConfigInstance.toPlainObject());
                allMobileModels[allModels.length-1] = modelConfigInstanceMob.toPlainObject();
                // allMobileModels.push(modelConfigInstanceMob.toPlainObject());
                console.log("Added new model config to allModels:", modelConfigInstance.toPlainObject());
            }

            // --- Link the ModelConfig instance to the THREE.Object3D via userData ---
            newThreeJsObject.userData.modelId = modelConfigInstance.modelId;
            newThreeJsObject.userData.modelConfigRef = modelConfigInstance; // Crucial for easy access

            newThreeJsObject.userData.modelConfigRefMob = modelConfigInstanceMob; // Crucial for easy access

            // Link the THREE.Object3D back to the ModelConfig instance (optional but useful)
            modelConfigInstance.threeJsObject = newThreeJsObject;
            // modelConfigInstanceMob.threeJsObject = newThreeJsObject;

            // Add the new Three.js object to our active tracking array and the scene.
            selectedObj = newThreeJsObject;
            selectedObjData = modelConfigInstance;
            if(index == undefined)
            {
              allThreeJsObj.push(newThreeJsObject);
            }
            else
            {
              allThreeJsObj[index] = newThreeJsObject;              
            }
            // scene.add(newThreeJsObject);
            rotateGroup.add(newThreeJsObject);

            // Update the globally selected object (if applicable for UI/TransformControls).
            // This is often done externally after this function resolves.
            // For now, let's just make it the new selected object if controls exist.
            if (controls) {
                controls.detach(); // Detach from any previously selected object
                controls.attach(newThreeJsObject);
                controls.setSpace('local');
                controls.visible = gizmoVisible;
                // Ensure controls are in the scene (might be redundant if always there)
                // scene.add(controls);
            }

            if(allModels.length == allThreeJsObj.length)
            {
              updateObjectList();
            }
            // --- Crucially, update the hidden JSON field for saving ---
            updateSaveField();
            if(isInitialLoad)
            {
              itemsLoaded++;
              // console.log(itemsLoaded);
              if(itemsLoaded == allModels.length)
              {
                isInitialLoad = false;
                loadAllMobileData();
              }
            }

            if(callback)
            {
              callback();
            }
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
        return Math.round(value * multiplier) / multiplier;
    }

 

    //updates values of all inputs based on three object
    function updateTransforms()
    {
      let pos = selectedObj.position;
      let rot = selectedObj.rotation;
      let scale = selectedObj.scale;

      // if(sceneData.loopActive)
      // {
      //   pos = fullLoopGroup.position;
      //   // rot = objGroup.rotation;
      //   rot = new THREE.Euler().setFromQuaternion(fullLoopGroup.quaternion); // Handle group rotation correctly
      //   // scale = objGroup.scale;
      //   sceneData.loopGroupScale = fullLoopGroup.scale;
      //   loopGroupScaleInput.value = round(fullLoopGroup.scale.x, 2);
      //   // if(controls.mode === "scale" || groupControls.mode === "scale")
      //   // {
      //   //   refreshLoop();
      //   // }
      // }
      // else
      // {
      //   // pos = model.position;
      //   // rot = model.rotation;
      //   // scale = model.scale;
      // }

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
      

      let modelConfigInstance;
      if(isMobileView)
      {
        if(selectedObj.userData.modelConfigRefMob == null)
        {
          //create it
          const plainOriginalConfigData = selectedObj.userData.modelConfigRef.toPlainObject();
          const clonedModelConfig = ModelConfig.fromPlainObject(plainOriginalConfigData);
          selectedObj.userData.modelConfigRefMob = clonedModelConfig;
        }
        modelConfigInstance = selectedObj.userData.modelConfigRefMob;
      }
      else
      {
        modelConfigInstance = selectedObj.userData.modelConfigRef;
      }

      
      
      modelConfigInstance.position.copy(selectedObj.position);
      modelConfigInstance.rotation.copy(selectedObj.rotation);
      modelConfigInstance.scale.copy(selectedObj.scale);

      let existingModelIndex;
      if(isMobileView)
      {
        existingModelIndex = allMobileModels.findIndex(m => m.modelId === modelConfigInstance.modelId);
        allMobileModels[existingModelIndex] = modelConfigInstance.toPlainObject();
      }
      else
      {
        existingModelIndex = allModels.findIndex(m => m.modelId === modelConfigInstance.modelId);
        allModels[existingModelIndex] = modelConfigInstance.toPlainObject();
      }

      updateSaveField();
  };

  controls.addEventListener('change', updateTransforms);
  controls.addEventListener('mouseDown', transformDragStart);
  controls.addEventListener('mouseUp', transformDragEnd);
  
  document.querySelector('#btn_duplicate').addEventListener('mousedown', cloneSelected);
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
    const deleteModelButton = document.getElementById('delete_model_button');
    const popup = document.getElementById('newScenePopup');
    const modelUrlField = document.getElementById('threejs_model_url');
    const preview = document.getElementById('threejs_model_url_preview');


    let popupOpen = false;
    //TODO: check whether it's replace selected url or add new model
    deleteModelButton.addEventListener('click', deleteObject);


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
          loadModel(attachment.url, false, isMobileView);
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

          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          // Calculate target rotation
          targetRotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
          targetRotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
          targetRotation.z = THREE.MathUtils.degToRad(initialRotationZ + -mouseX * mouseRotationZ);

          if (mouseAnimationLink && !(isTransforming || keyXRot || keyYRot || keyZRot || isDragging)) {
              // Smoothly interpolate to the target rotation
              // const easing = 0.1; // Adjust this value for speed (lower = slower)
              const easing = 0.1 + (1 - 0.1) * 0.05; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

              currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, easing);
              currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, easing);
              currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.z, easing);

              rotateGroup.rotation.x = currentRotation.x;
              rotateGroup.rotation.y = currentRotation.y;
              rotateGroup.rotation.z = currentRotation.z;

              // scene.rotation.x = currentRotation.x;
              // scene.rotation.y = currentRotation.y;
              // scene.rotation.z = currentRotation.z;

              fullLoopGroup.rotation.x = currentRotation.x;
              fullLoopGroup.rotation.y = currentRotation.y;
              fullLoopGroup.rotation.z = currentRotation.z;
          }

          if(isDragging)
          {
            raycaster.setFromCamera(mouse, camera);

            // Project the new mouse position onto the plane
            const newIntersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, newIntersectPoint);

            const targetX = newIntersectPoint.x + offset.x;
            const targetY = newIntersectPoint.y + offset.y;

            // Apply the new X and Y, but keep the current Z
            selectedObj.position.set(targetX, targetY, selectedObj.position.z);
            updateTransforms();
            // selectedObj.position.copy(newIntersectPoint).add(offset);
            
            // console.log(newIntersectPoint, offset);
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

      // function updateSelectedObjectAndSceneData()
      // {
      //   //get the correct
      //   const selectedObjData = selectedObj.userData.modelConfigRef;
      //   const existingModelIndex = allModels.findIndex(m => m.modelId === modelConfigInstance.modelId);
      //   if (existingModelIndex !== -1) {
      //       allModels[existingModelIndex] = modelConfigInstance.toPlainObject();
      //   }
      // }

      // function transformObjectToSceneData(object, objData)
      function transformObjectToSceneData(object)
      {
        const objData = selectedObjData;
        object.position.set(
            parseFloat(objData.position.x),
            parseFloat(objData.position.y),
            parseFloat(objData.position.z)
        );

        object.rotation.set(
            parseFloat(objData.rotation.x),
            parseFloat(objData.rotation.y),
            parseFloat(objData.rotation.z)
        );

        object.scale.copy(objData.scale);

        // object.position.set(
        //     parseFloat(objData.positionX),
        //     parseFloat(objData.positionY),
        //     parseFloat(objData.positionZ)
        // );

        // object.rotation.set(
        //     parseFloat(THREE.MathUtils.degToRad(objData.rotationX)),
        //     parseFloat(THREE.MathUtils.degToRad(objData.rotationY)),
        //     parseFloat(THREE.MathUtils.degToRad(objData.rotationZ))
        // );
        updateLinkedObjData();
        currentRotation.copy(object.rotation); // The most direct way
        // console.log(object.position);
      }

         //requires selectedObj to be updated first
      function updateLinkedObjData()
      {
        const modelConfigInstance = selectedObj.userData.modelConfigRef;
        // modelConfigInstance.position.copy(selectedObj.position);
        // modelConfigInstance.rotation.copy(selectedObj.rotation);
        // modelConfigInstance.scale.copy(selectedObj.scale);
        const existingModelIndex = allModels.findIndex(m => m.modelId === modelConfigInstance.modelId);

        if (existingModelIndex !== -1) {
            // Replace the old plain object with the updated one from our ModelConfig instance.
            allModels[existingModelIndex] = modelConfigInstance.toPlainObject();
            // console.log(`Updated model config for ID: ${modelConfigInstance.modelId} in sceneData.models.`);
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
          case 'a': 
                if(event.altKey)
                {
                  mouseAnimationLinkInput.checked = !mouseAnimationLinkInput.checked;
                  refreshMouseAnimationLink();
                }
                break;  
          case 'q': 
                keyXRot = true;
                if(event.altKey)
                {
                  toggleMobile();
                }
                break;  
          case 'w': 
                keyYRot = true;
                break;  
          case 'e': 
                keyZRot = true;
                break;  
          case 'f': 
                keyZTrans = true;
                break;  
                break;  
          case 't': // Translate mode
                setTransformMode('translate');
                break;
            case 'r': // Rotate mode
                setTransformMode('rotate');
                break;
            case 'y': // Scale mode
                setTransformMode('scale');
                break;
            case 's': // save and scroll scale
                if(event.ctrlKey)
                {
                  event.preventDefault();
                  wpPublishButton.click();
                }
                else
                {
                  keyScale = true;
                }                
                break;
                // dont allow scaling of group, must be set via single or input
                // groupControls.setMode('scale');
            case 'd': //duplicate
                if(event.ctrlKey)
                {
                  event.preventDefault();
                  cloneSelected();
                }
            case 'o':
                orbitActive = !orbitActive;
                break;
            case 'Delete':
                deleteObject();
                break;
            case 'Shift':
                shiftDown = true;
                scrollMultiplier = 0.3;
                break;
                
            case 'l': // Scale mode
                loopActive = !loopActive;
                loopActiveInput.checked = loopActive;
                toggleLoop();
                break;
        }
    });

    window.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'q': 
              keyXRot = false;
              break;  
        case 'w': 
              keyYRot = false;
              break;  
        case 'e': 
              keyZRot = false;
              break;
        case 'f': 
              keyZTrans = false;
              break;
        case 's': 
              keyScale = false;
        case 'Shift':
              shiftDown = false;
              scrollMultiplier = 1;
              break;
      }
    });


    function stepScale(amount)
    {
      selectedObj.scale.x += amount;
      selectedObj.scale.y += amount;
      selectedObj.scale.z += amount;
    }


    const scrollRotAmount = THREE.MathUtils.degToRad(10);
    document.addEventListener('wheel', function(e)
    {
      if(keyXRot || keyYRot || keyZRot || keyZTrans || keyScale) 
      {
        e.preventDefault();
      }
      if(e.wheelDelta > 0) //scroll up, away,
      {
        if(keyZTrans) selectedObj.position.z -= scrollMultiplier*0.5;
        // if(keyXRot) selectedObjData.rotation.x -= THREE.MathUtils.degToRad(5);
        // if(keyYRot) selectedObjData.rotation.y -= THREE.MathUtils.degToRad(5);
        // if(keyZRot) selectedObjData.rotation.z -= THREE.MathUtils.degToRad(5);
        if(keyXRot) selectedObj.rotateX(scrollMultiplier*-scrollRotAmount);
        if(keyYRot) selectedObj.rotateY(scrollMultiplier*-scrollRotAmount);
        if(keyZRot) selectedObj.rotateZ(scrollMultiplier*-scrollRotAmount);
        // if(keyXRot) selectedObj.rotation.x -= scrollRotAmount;
        // if(keyYRot) selectedObj.rotation.y -= scrollRotAmount;
        // if(keyZRot) selectedObj.rotation.z -= scrollRotAmount;
        if(keyScale) stepScale(scrollMultiplier*-0.1);
        // scrollDirection = 'Scroll Up';
        // transformObjectToSceneData(selectedObj);
        updateTransforms();
      }
      else
      {
        if(keyZTrans) selectedObj.position.z += scrollMultiplier*0.5;
        // if(keyXRot) selectedObjData.rotation.x += THREE.MathUtils.degToRad(5);
        // if(keyYRot) selectedObjData.rotation.y += THREE.MathUtils.degToRad(5);
        // if(keyZRot) selectedObjData.rotation.z += THREE.MathUtils.degToRad(5);
        if(keyXRot) selectedObj.rotateX(scrollMultiplier*scrollRotAmount);
        if(keyYRot) selectedObj.rotateY(scrollMultiplier*scrollRotAmount);
        if(keyZRot) selectedObj.rotateZ(scrollMultiplier*scrollRotAmount);
        if(keyScale) stepScale(scrollMultiplier*0.1);
        // scrollDirection = 'Scroll Down';
        // transformObjectToSceneData(selectedObj);
        updateTransforms();
      }
    }, { passive: false });

    function setTransformMode(mode, e, clickedButton)
    {
      if(e) e.preventDefault();
      controls.setMode(mode);
      groupControls.setMode(mode);
      setGizmoVisible(true);
      if(mode != 'scale')
      {
        groupControls.setMode(mode);
      }

      document.querySelectorAll('.transModeButton').forEach(button => 
      {
        button.classList.remove('transButtonActive');
      });

      let buttonToUpdate;
      if(clickedButton)
      {
        buttonToUpdate = clickedButton;
      }
      else
      {
        if(mode == 'translate')
        {
          buttonToUpdate = translateModeButton;
        }
        else if(mode == 'rotate')
        {
          buttonToUpdate = rotateModeButton;
        }
        else if(mode == 'scale')
        {
          buttonToUpdate = scaleModeButton;
        }
      }
      buttonToUpdate.classList.add('transButtonActive');

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
        sceneOnMouseDown(e);
        mouseDown = true;
      }

      window.onmouseup = function(e)
      {
        isDragging = false;
        mouseDown = false;
        // console.log()
      }

      function sceneOnMouseDown(event)
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
            // controls.enabled = true;
            // controls.visible = true;

            isDragging = true;

            // console.log('planePreNormal: ' + plane.position + " rot:" + plane.rotation);
            

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


                plane.setFromNormalAndCoplanarPoint(
                camera.getWorldDirection(plane.normal), // Plane perpendicular to camera's view
                clickedObject.position // Or the intersection point itself, if you want a different drag feel
            );
            
            
            // const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, initialIntersectionPoint);



            const hit = raycaster.ray.intersectPlane(plane, initialIntersectionPoint);
            if (hit) {
              offset.copy(selectableObject.position).sub(initialIntersectionPoint);
            } else {
              console.warn("Ray did not intersect the plane");
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
                // console.log("Clicked empty space. Deselecting object.");
                // controls.detach();
                // controls.visible = false;
                // controls.enabled = false;
                // selectedObj = null;
                // Optionally, clear your UI fields here too
                // transformObjectToSceneData(null); // Or a function to clear fields
            }
        }
      }

      function selectModelForEditing(obj)
      {
        selectedObj = obj;
        if(isMobileView)
        {
          selectedObjData = selectedObj.userData.modelConfigRefMob;
        }
        else
        {
          selectedObjData = selectedObj.userData.modelConfigRef;
        }
        controls.attach(selectedObj);
        controls.visible = gizmoVisible;
        controls.enabled = gizmoVisible;
        highlightSelectedListItem(obj.uuid);
      }

      // Get references to your HTML elements
const objectListContainer = document.getElementById('objectListContainer');
const sceneObjectList = document.getElementById('sceneObjectList');

// Function to update the list of objects
//TODO: only run after allModels.length amount of .load has run
function updateObjectList() {
    // Clear existing list items
    sceneObjectList.innerHTML = '';

    allThreeJsObj.forEach(obj => {
        // Create the list item for each object
        const listItem = document.createElement('li');
        listItem.classList.add('object-list-item'); // Add a class for styling

        // Get a display name for the object (use its 'name' property, or fallback to 'uuid')
        // const objDisplayName = obj.name || obj.uuid.substring(0, 8); // Shorten UUID for display
        const modelUrl = obj.userData.modelConfigRef.modelUrl;
        const lastPart = modelUrl.split('/').pop();
        const objDisplayName = lastPart; 
        // const objDisplayName = obj.userData.modelConfigRef.modelName; 

        // --- Create the clickable text (for selection) ---
        const objectNameSpan = document.createElement('span');
        objectNameSpan.textContent = objDisplayName;
        objectNameSpan.classList.add('object-name-span');
        objectNameSpan.style.cursor = 'pointer'; // Indicate it's clickable

        // Attach the Three.js object directly to the DOM element for easy access
        objectNameSpan.dataset.objectId = obj.uuid; // Store UUID for lookup

        // --- Create the Eye button (for visibility toggle) ---
        const eyeButton = document.createElement('button');
        eyeButton.classList.add('eye-button');
        eyeButton.textContent = '👁️'; // Eye emoji or an icon
        eyeButton.style.background = 'none';
        eyeButton.style.border = 'none';
        eyeButton.style.color = 'white';
        eyeButton.style.cursor = 'pointer';
        eyeButton.style.fontSize = '1.2em';

        // Set initial eye button state based on object visibility
        if (!obj.visible) {
            eyeButton.textContent = '🙈'; // Hidden eye emoji
            eyeButton.style.color = 'gray'; // Indicate it's hidden
        }

        eyeButton.dataset.objectId = obj.uuid; // Store UUID for lookup


        // Append elements to the list item
        listItem.appendChild(objectNameSpan);
        listItem.appendChild(eyeButton);

        // Add to the main list
        sceneObjectList.appendChild(listItem);

        // Add click listener to the object name span
        objectNameSpan.addEventListener('click', () => {
            selectObjectFromList(obj.uuid); // Call our selection function
        });

        // Add click listener to the eye button
        eyeButton.addEventListener('click', (e) => {
          e.preventDefault(); // Prevents the default action (e.g., form submission, page reload)
  
          toggleObjectVisibility(obj.uuid, e.target); // Pass the button element to update its text
        });
    });
}

  // Function to select an object when its name in the list is clicked
  function selectObjectFromList(uuid) {
      const objToSelect = allThreeJsObj.find(obj => obj.uuid === uuid);
      if (objToSelect) {
          selectModelForEditing(objToSelect); // Use your existing selectModelForEditing function
          // Optional: Add visual feedback to the list item itself
          highlightSelectedListItem(uuid);
      }
  }

  // Function to toggle object visibility
  function toggleObjectVisibility(uuid, eyeButtonElement) {
      const objToToggle = allThreeJsObj.find(obj => obj.uuid === uuid);
      if (objToToggle) {
          objToToggle.visible = !objToToggle.visible; // Toggle visibility

          // Update the eye button's text/style
          if (objToToggle.visible) {
              eyeButtonElement.textContent = '👁️';
              eyeButtonElement.style.color = 'white';
          } else {
              eyeButtonElement.textContent = '🙈';
              eyeButtonElement.style.color = 'gray';
          }
      }
  }

  // Optional: Function to visually highlight the selected item in the list
  function highlightSelectedListItem(uuid) {
      // Remove highlight from previously selected
      document.querySelectorAll('.object-list-item').forEach(item => {
          item.style.fontWeight = 'normal';
          item.style.backgroundColor = 'transparent';
      });

      // Add highlight to the new selection
      const selectedItem = sceneObjectList.querySelector(`[data-object-id="${uuid}"]`).parentNode;
      if (selectedItem) {
          selectedItem.style.fontWeight = 'bold';
          selectedItem.style.backgroundColor = 'rgba(255,255,255,0.2)';
      }
  }



    const wpPostForm = document.getElementById('post'); // The main post/page edit form
    const wpSaveDraftButton = document.getElementById('save-post'); // The "Save Draft" button
    const wpPublishButton = document.getElementById('publish'); // The "Publish" or "Update" button

    if (wpPostForm) {
        wpPostForm.addEventListener('submit', updateDataFromUi);
    }

    if (wpSaveDraftButton) {
        wpSaveDraftButton.addEventListener('click', updateDataFromUi);
    }
    if (wpPublishButton) {
        wpPublishButton.addEventListener('click', updateDataFromUi);
    }

    function deleteObject()
    {
      const threeJsObjectIndex = allThreeJsObj.indexOf(selectedObj);

      if (threeJsObjectIndex === -1) {
          console.warn("Selected Three.js object not found in allThreeJsObj array.");
          return;
      }

      // 2. Get the modelId from the corresponding modelConfigInstance in allModels
      const modelConfigToDelete = allModels[threeJsObjectIndex];
      const modelConfigMobToDelete = allMobileModels[threeJsObjectIndex];

      if (!modelConfigToDelete || !modelConfigToDelete.modelId) {
          console.error("Corresponding model configuration or modelId not found for the selected Three.js object.");
          return;
      }

      const modelIdToDelete = modelConfigToDelete.modelId;
      // const modelIdToDelete = modelConfigMobToDelete.modelId;

      // 3. Find the index in allModels using the modelId
      const modelConfigIndex = allModels.findIndex(m => m.modelId === modelIdToDelete);

      if (modelConfigIndex === -1) {
          console.warn("Corresponding model configuration not found in allModels array.");
          return;
      }

      // 4. Remove from the Three.js scene
      if (rotateGroup && selectedObj instanceof THREE.Object3D) { // Ensure 'scene' is a Three.js scene and 'selectedObj' is a Three.js object
          rotateGroup.remove(selectedObj);
          console.log(`Removed object from scene: ${selectedObj.name || selectedObj.uuid}`);
      } else {
          console.warn("Three.js scene not provided or selectedObj is not a valid Three.js object. Object might not be removed from the scene.");
      }

      // 5. Remove from allThreeJsObj
      allThreeJsObj.splice(threeJsObjectIndex, 1);
      console.log(`Removed Three.js object from allThreeJsObj at index ${threeJsObjectIndex}`);

      // 6. Remove from allModels
      allModels.splice(modelConfigIndex, 1);
      allMobileModels.splice(modelConfigIndex, 1);
      console.log(`Removed model config from allModels at index ${modelConfigIndex} (modelId: ${modelIdToDelete})`);

      // Optional: Dispose of Three.js geometry, material, and textures
      // This is crucial to prevent memory leaks, especially if you load many models.
      if (selectedObj.geometry) {
          selectedObj.geometry.dispose();
          console.log(`Disposed geometry for object: ${selectedObj.name || selectedObj.uuid}`);
      }
      if (selectedObj.material) {
          // If material is an array of materials
          if (Array.isArray(selectedObj.material)) {
              selectedObj.material.forEach(material => material.dispose());
          } else {
              selectedObj.material.dispose();
          }
          console.log(`Disposed material(s) for object: ${selectedObj.name || selectedObj.uuid}`);
      }

      // TODO: if last object deleted, show first screen again
      if(allThreeJsObj.length == 0)
      {
        controls.attach(rotateGroup);
        showUploadPopup();
      }
      else
      {
        const lastObjectInList = allThreeJsObj[allThreeJsObj.length - 1];
        selectModelForEditing(lastObjectInList);
        updateObjectList();
      }
    }

      function updateDataFromUi()
      {
        console.log('saving');
        sceneData.scrollMoveX = parseFloat(scrollXInput.value);
        sceneData.scrollMoveY = parseFloat(scrollYInput.value);
        sceneData.scrollMoveZ = parseFloat(scrollZInput.value);
        sceneData.mouseRotationX = parseFloat(mouseRotXInput.value);
        sceneData.mouseRotationY = parseFloat(mouseRotYInput.value);
        sceneData.mouseRotationZ = parseFloat(mouseRotZInput.value);
        sceneData.ambientLightIntensity = parseFloat(ambientLightSlider.value);
        sceneData.directionalLightIntensity = parseFloat(directionalLightSlider.value);
        sceneData.mouseAnimationLink = mouseAnimationLinkInput.checked;
        sceneData.scrollAnimationLink = scrollAnimationLinkInput.checked;
        sceneData.useEnvLight = useEnvLightInput.checked;
        sceneData.isOrthoCamera = isOrthoCameraInput.checked;
        sceneData.breakPoint = parseFloat(breakPoint.value);
        updateSaveField();
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
