import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/OrbitControls.js';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { TransformControls } from 'three/addons/TransformControls.js';
// import { RGBELoader } from 'three/addons/RGBELoader.js';


const localisedData = window.c33dadminlocaliseddata;
let allSceneData = JSON.parse(localisedData.allSceneData);
const ajaxUrl = localisedData.ajax_url;
const ajaxNonce = localisedData.ajax_nonce;
console.log('C33D Transform Data:', allSceneData);
const importedDemoAssets = JSON.parse(localisedData.importedDemoAssets);
let downloadInProgress = false;            


class ModelConfig {
    constructor(data = {}) {
        this.modelId = data.modelId || crypto.randomUUID(); // Assign a new ID if not provided
        this.modelUrl = data.modelUrl || '';
        if(data.modelUrl || data.modelName)
        {
          this.modelName = data.modelName || data.modelUrl.split('/').pop();; //Allow changable via object list, default to filename (like object list)
        }

        this.planeUrl = data.planeUrl || '';
        if(data.planeUrl)
        {
          this.modelName = data.planeUrl.split('/').pop();
        }
        this.type = data.type;
        this.parentUuid = data.parentUuid || -1;
        // this.groupListId = ;
        // Store position, rotation, scale as THREE.Vector3/Euler for easier use with Three.js
        this.position = new THREE.Vector3(data.positionX || 0, data.positionY || 0, data.positionZ || 0);
        this.rotation = new THREE.Euler(
            THREE.MathUtils.degToRad(data.rotationX || 0),
            THREE.MathUtils.degToRad(data.rotationY || 0),
            THREE.MathUtils.degToRad(data.rotationZ || 0)
        );
        this.scale = new THREE.Vector3(data.scaleX || 1, data.scaleY || 1, data.scaleZ || 1);
        // this.scale = new THREE.Vector3(data.scale || 1, data.scale || 1, data.scale || 1); // Assuming uniform scale

        this.loopActive = data.loopActive || false;
        this.loopCountX = data.loopCountX || 1;
        // ... other loop properties

        this.isMobileConfig = data.isMobileConfig || false;

        this.threeJsObject = null; // Reference to the actual THREE.Object3D instance
    }

    // Method to convert this class instance back to a plain object for JSON stringification
    toPlainObject() {
      // for (const key of allowedKeys) {
      //       if (this.hasOwnProperty(key)) {
      //           plainObject[key] = this[key];
      //       }
      //   }
        return {
            modelId: this.modelId,
            modelUrl: this.modelUrl,
            planeUrl: this.planeUrl,
            modelName: this.modelName,
            positionX: this.position.x,
            positionY: this.position.y,
            positionZ: this.position.z,
            rotationX: THREE.MathUtils.radToDeg(this.rotation.x),
            rotationY: THREE.MathUtils.radToDeg(this.rotation.y),
            rotationZ: THREE.MathUtils.radToDeg(this.rotation.z),
            scaleX: this.scale.x,
            scaleY: this.scale.y,
            scaleZ: this.scale.z,
            loopActive: this.loopActive,
            loopCountX: this.loopCountX,
            type: this.type,
            parentUuid: this.parentUuid,
            // ... include all other properties
        };
    }

    // Static method to create a ModelConfig instance from a plain object (e.g., from loaded JSON)
    static fromPlainObject(obj) {
        return new ModelConfig({
            modelId: obj.modelId,
            modelUrl: obj.modelUrl,
            planeUrl: obj.planeUrl,
            modelName: obj.modelName,
            positionX: obj.positionX,
            positionY: obj.positionY,
            positionZ: obj.positionZ,
            rotationX: obj.rotationX, // Already degrees in plain object
            rotationY: obj.rotationY,
            rotationZ: obj.rotationZ,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            scaleZ: obj.scaleZ,
            loopActive: obj.loopActive,
            loopCountX: obj.loopCountX,
            parentUuid: obj.parentUuid,

            // ... include all other properties
        });
    }
}

let keyXRot = false, keyYRot = false, keyZRot = false, keyZTrans = false, keyScale = false;
let shiftDown = false;
let scrollMultiplier = 1;
let isInitialLoad = true;
let itemsLoaded = 0;
const hiddenInputField = document.getElementById('threejs_scene_config_json');
const saveButton = document.querySelector('#c3SaveButton');
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
  let allGroups = [];
  // console.log('Admin JS Code 3D started');

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
  let scrollMoveX;
  let scrollMoveY;
  let scrollMoveZ;

  // Get the mouse rotation inputs
  const mouseRotXInput = document.getElementById('mouseRotationX');
  const mouseRotYInput = document.getElementById('mouseRotationY');
  const mouseRotZInput = document.getElementById('mouseRotationZ');


  let mouseRotationX; 
  let mouseRotationY; 
  let mouseRotationZ; 

  let mouseAnimationLink;
  let scrollAnimationLink;

  let useEnvLight;

  let loopActive = sceneData.loopActive || false;
  let loopCountX = sceneData.loopCountX || 3;
  let loopCountY = sceneData.loopCountY || 3;
  let loopCountZ = sceneData.loopCountZ || 3;
  let itemSpacing = sceneData.itemSpacing || 1.0;
  let isOrthoCamera;

  const loopActiveInput = document.getElementById('loopActive');
  const loopCountXInput = document.getElementById('loopCountX');
  const loopCountYInput = document.getElementById('loopCountY');
  const loopCountZInput = document.getElementById('loopCountZ');
  const itemSpacingInput = document.getElementById('itemSpacing');
  const isOrthoCameraInput = document.getElementById('isOrthoCamera');
  

  const container = document.getElementById('threejs-canvas');
  const labelContainer = document.getElementById('label'); // Label container for displaying object details

  let isoZoom = 250;
  const scene = new THREE.Scene();
  let rotateGroup = new THREE.Group();
  scene.add(rotateGroup);
  let camera;
  const perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  const orthoCamera = new THREE.OrthographicCamera( container.clientWidth / - isoZoom, container.clientWidth / isoZoom, container.clientHeight / isoZoom, container.clientHeight / - isoZoom, 1, 1000 );

  
// scene.add( camera );

    // const rgbeLoader = new RGBELoader();

    // updateEnvTexture();


    let cameraPos = [0, 0, 5];


    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    // renderer.outputEncoding = THREE.sRGBEncoding;
    // renderer.outputColorSpace = THREE.SRGBColorSpace;
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // renderer.toneMappingExposure = 0.5; // Adjust exposure as needed

    const dlight = new THREE.DirectionalLight(0xffffff, 1);    
    scene.add(dlight);

    const alight = new THREE.AmbientLight(0xffffff, 1);
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

    let controls, groupControls;
    let gizmoVisible = true;

 
      

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
    
    const lightIntensityInput = document.getElementById('lightIntensity');
    const lightPosXInput = document.getElementById('lightPosX');
    const lightPosYInput = document.getElementById('lightPosY');
    const lightPosZInput = document.getElementById('lightPosZ');

    const useEnvLightInput = document.getElementById('useEnvLight');

    
    const breakPoint = document.getElementById('breakPoint');

    let orbit;
    // orbit = new OrbitControls(camera, renderer.domElement);

  applyGlobalSettings();
  function applyGlobalSettings()
  {
    scrollMoveX = sceneData.scrollMoveX;
    scrollMoveY = sceneData.scrollMoveY;
    scrollMoveZ = sceneData.scrollMoveZ;

    mouseRotationX = sceneData.mouseRotationX || 0; 
    mouseRotationY = sceneData.mouseRotationY || 0; 
    mouseRotationZ = sceneData.mouseRotationZ || 0; 

    mouseAnimationLink = sceneData.mouseAnimationLink;
    scrollAnimationLink = sceneData.scrollAnimationLink;

    useEnvLight = sceneData.useEnvLight;

    isOrthoCamera = sceneData.isOrthoCamera;

    if(sceneData.isOrthoCamera)
    {
      camera = orthoCamera;
    }
    else
    {
      camera = perspectiveCamera;
    }
    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);

    dlight.position.set(sceneData.lightPosX, sceneData.lightPosY, sceneData.lightPosZ);
    dlight.intensity = sceneData.directionalLightIntensity;

    alight.intensity = sceneData.ambientLightIntensity;

    setLightIntensity(alight, sceneData.ambientLightIntensity);
    updateDLightPos(); //uses sceneData object values
    updateUiToFromData();
  }

  function updateUiToFromData()
  {
    scrollXInput.value = scrollMoveX;
    scrollYInput.value = scrollMoveY;
    scrollZInput.value = scrollMoveZ;
    mouseRotXInput.value = mouseRotationX;
    mouseRotYInput.value = mouseRotationY;
    mouseRotZInput.value = mouseRotationZ;
    mouseAnimationLinkInput.checked = mouseAnimationLink;
    scrollAnimationLinkInput.checked = scrollAnimationLink;
    // useEnvLightInput.checked = useEnvLight;
    isOrthoCameraInput.checked = isOrthoCamera;
    ambientLightSlider.value = sceneData.ambientLightIntensity;
    directionalLightSlider.value = sceneData.directionalLightIntensity;
    lightPosXInput.value = sceneData.lightPosX;
    lightPosYInput.value = sceneData.lightPosY;
    lightPosZInput.value = sceneData.lightPosZ;    
    breakPoint.value = sceneData.breakPoint;
  }

  function updateDataFromUi()
  {
    sceneData.scrollMoveX = parseFloat(scrollXInput.value);
    sceneData.scrollMoveY = parseFloat(scrollYInput.value);
    sceneData.scrollMoveZ = parseFloat(scrollZInput.value);
    sceneData.mouseRotationX = parseFloat(mouseRotXInput.value);
    sceneData.mouseRotationY = parseFloat(mouseRotYInput.value);
    sceneData.mouseRotationZ = parseFloat(mouseRotZInput.value);
    sceneData.mouseAnimationLink = mouseAnimationLinkInput.checked;
    sceneData.scrollAnimationLink = scrollAnimationLinkInput.checked;
    // sceneData.useEnvLight = useEnvLightInput.checked;
    sceneData.isOrthoCamera = isOrthoCameraInput.checked;
    sceneData.ambientLightIntensity = parseFloat(ambientLightSlider.value);
    sceneData.directionalLightIntensity = parseFloat(directionalLightSlider.value);
    sceneData.lightPosX = parseFloat(lightPosXInput.value);
    sceneData.lightPosY = parseFloat(lightPosYInput.value);
    sceneData.lightPosZ = parseFloat(lightPosZInput.value);  
    sceneData.breakPoint = parseFloat(breakPoint.value);
    updateSaveField();
  }


  controls = new TransformControls(camera, renderer.domElement);
  scene.add(controls);
  controls.visible = gizmoVisible;

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

  setupDemoModal();

  let isMobileView = false;
  const toggleMobileButton = document.getElementById('mobileMode');
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
      
      if(currentConfig == undefined)
      {
        //create a new empty one
        console.log('no userdata found for this view');
      }
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
    toggleGizmoButton.classList.toggle('transButtonActive');
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

  // useEnvLightInput.oninput = () => {
      
  //     useEnvLight = useEnvLightInput.checked;
  //     updateEnvTexture();
      
  // };

  function updateEnvTexture()
  {
    if(useEnvLight)
    {
      loadEnvTexture('sunset.hdr');
      // loadEnvTexture('night.hdr');
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



  const scaleInputX = document.getElementById('codes_scale_x');
  const scaleInputY = document.getElementById('codes_scale_y');
  const scaleInputZ = document.getElementById('codes_scale_z');
  scaleInputX.oninput = () =>
  {
    selectedObjData.scale.setScalar(parseFloat(scaleInputX.value));
    transformObjectToSceneData(selectedObj);
    if(sceneData.loopActive)
    {
      refreshLoop();
    }
    else
    {

    }
  };

  scaleInputY.oninput = () =>
  {
    selectedObjData.scale.setScalar(parseFloat(scaleInputY.value));
    transformObjectToSceneData(selectedObj);
    if(sceneData.loopActive)
    {
      refreshLoop();
    }
    else
    {

    }
  };

  scaleInputZ.oninput = () =>
  {
    selectedObjData.scale.setScalar(parseFloat(scaleInputZ.value));
    transformObjectToSceneData(selectedObj);
    if(sceneData.loopActive)
    {
      refreshLoop();
    }
    else
    {

    }
  };



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
    controls.camera = camera;
    // groupControls.camera = camera;

    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    scene.add(camera);

    renderer.render(scene, camera);
}


    
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
        isInitialLoad = false;
        showIntroPopup();
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

    function showIntroPopup()
    {      
        popup.style.display = 'flex';
        popupOpen = true;
    }

    function hideIntroPopup()
    {      
        popup.style.display = 'none';
        popupOpen = false;
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
        createObject(model.type, model, false, index);        
        // loadModel(model.modelUrl, model, false, index);
      });    
      updateParentList();  
    }
    
    function initFromJson(importJson)
    {
      // allSceneData = JSON.parse(importString);
      // const importedSceneData = JSON.parse(importJson.scene_data);
      // const importedSceneData = importJson.scene_data;
      // const importedSceneData = importJson;
      allSceneData = importJson; // Reassign the entire root object
      sceneData = allSceneData.globalSettings;
      allModels = allSceneData.models[0];
      allMobileModels = allSceneData.models[1];

      // Call other setup functions to apply global settings, lights, etc., from allSceneData
      applyGlobalSettings();
      // setupLights(allSceneData.lights);
      // ... and so on for other parts of your scene

      // Finally, ensure the UI reflects any changes, like updating the save field if auto-save is on.
      updateSaveField(); // Now this will save the *imported* scene data
      isInitialLoad = true; 
      itemsLoaded = 0;
      loadAllModels();
    }

    function loadAllMobileData()
    {
      allMobileModels.forEach(function(model, index)
      {
        addMobDataToConfigRef(model, index);
      });
    }

    function addMobDataToConfigRef(data, index)
    {
      //find related object 
      // const modelId = allThreeJsObj.findIndex(m => m.modelId === data.modelId);
      // const threeJsObject = selectObjectFromList(data.modelId);
      const threeJsObject = allThreeJsObj[index];
      threeJsObject.userData.modelConfigRefMob = ModelConfig.fromPlainObject(data);
      if(allMobileModels[index] == undefined)
      {
        allMobileModels[index] = data;
      }
    }

    function duplicateObject(sceneObj)
    {
      const oldObjData = sceneObj.userData.modelConfigRef.toPlainObject();
      const objData = JSON.parse(JSON.stringify(oldObjData)); 
      
      const oldObjDataMob = sceneObj.userData.modelConfigRefMob.toPlainObject();
      const objDataMob = JSON.parse(JSON.stringify(oldObjDataMob)); 

      objData.modelId = crypto.randomUUID();
      objDataMob.modelId = objData.modelId;

      //if duplicated from object in a group
      // if(objData.parentModelId != -1)
      // {

      // }

      createObject(objData.type, objData, function()
      {
        addMobDataToConfigRef(objDataMob, allThreeJsObj.length-1);
        // if(objData.parentUuid != -1 || objData.parentUuid != undefined)
        if(objData.parentUuid != -1)
        {
          const newParent = getThreeJsObjectByUuid(objData.parentUuid);
          // moveObjectToGroup(selectedObj, newParent);
          // duplicateObjectInGroup(selectedObj, newParent);
          moveToGroupKeepLocalPosition(selectedObj, newParent);
          updateModelData(modelConfigInstance);
        }
      });


    }

    function cloneSelected()
    {
      duplicateObject(selectedObj);
    }

    function loadModel(url, objData, callback, index)
    {
      loader.load(url, (gltf) =>
      {
          gltf.scene.userData.type = 'model';
          addObject(gltf.scene, objData, callback, index, {modelUrl:url});
          // const newThreeJsObject = gltf.scene;
          // let modelConfigInstance, modelConfigInstanceMob; // This will be our ModelConfig class instance

          // let modelList = allModels;
          // if(isMobile)
          // {
          //   modelList = allMobileModels;
          // }

          // --- Determine if this is a new model or an existing one being loaded/reloaded ---
          
        });
    }

    function addImageAsPlane(imageUrl, objData, callback)
    {
      return new Promise((resolve, reject) => {
        // Step 1: Load the image to get its dimensions
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Important for CORS if image is from a different domain
        img.src = imageUrl;

        img.onload = () => {
          const imageWidth = img.width;
          const imageHeight = img.height;
          const aspectRatio = imageWidth / imageHeight;

          // Step 2: Calculate plane dimensions based on aspect ratio and desired max height
          // const planeHeight = maxHeight;
          const planeHeight = 2;
          const planeWidth = planeHeight * aspectRatio;

          // Step 3: Create Plane Geometry
          // Parameters: width, height, widthSegments, heightSegments
          const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

          // Step 4: Load the texture using Three.js TextureLoader
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(
              imageUrl,
              // On load callback
              (texture) => {
                  // Step 5: Create a MeshBasicMaterial with the loaded texture
                  // MeshBasicMaterial is suitable for unlit surfaces.
                  // For lit surfaces (reacting to lights), consider THREE.MeshStandardMaterial
                  texture.colorSpace = THREE.SRGBColorSpace;
                  // texture.encoding = THREE.sRGBEncoding; // <-- Use this for your screenshot texture

                  // const material = new THREE.MeshStandardMaterial({
                    const material = new THREE.MeshBasicMaterial({
                      map: texture,
                      side: THREE.DoubleSide, 
                      transparent: true 
                  });

                  // Step 6: Create the Mesh
                  const planeMesh = new THREE.Mesh(geometry, material);

                  // Resolve the Promise with the created mesh
                  planeMesh.userData.type = 'imageplane';
                  resolve(planeMesh);
                  addObject(planeMesh, objData, callback, null, { planeUrl:imageUrl }); 
              },
              // On progress callback (optional)
              undefined,
              // On error callback
              (error) => {
                  console.error('An error occurred loading the texture:', error);
                  reject(new Error('Failed to load texture: ' + imageUrl));
              }
          );
      };

      img.onerror = () => {
          console.error('An error occurred loading the image to get dimensions:', imageUrl);
          reject(new Error('Failed to load image for dimensions: ' + imageUrl));
      };
    });
  }

    //adds new object to scene and sceneData
    // function addObject(type, objData, callback, index)

    async function createObject(type, objData, callback, index)
    {
      let newThreeJsObject;
      if(type == 'group')
      {
        //add to scene, add to sceneData
        newThreeJsObject = new THREE.Group();
        allGroups.push(newThreeJsObject);
      }
      else if(type == 'imageplane')
      {
          addImageAsPlane(objData.planeUrl, objData, callback).then(plane => {
            plane.userData.type = type;
        })
      }
      else if(type == 'plane')
      {
        //add to scene, add to sceneData
        const planeGeo = new THREE.PlaneGeometry(1, 1); 
        const planeMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00, // Green color
                side: THREE.DoubleSide // Render both sides of the plane
            });
        newThreeJsObject = new THREE.Mesh(planeGeo, planeMaterial);
      }
      else if(type == 'model' )
      {
        loadModel(objData.modelUrl, objData, callback, index);
      }
      else
      {
        // console.log('Type not defined/handled');
      }

      //model calls add after loaded
      if(type != 'model' && type != undefined && type != "imageplane")
      {
        newThreeJsObject.userData.type = type;
        addObject(newThreeJsObject, objData, false, index);
      }
    }

    //add to scene and scenedata
    //applies objData if exists
    // function addObject(newThreeJsObject, objData, callback, index, url)
    function addObject(newThreeJsObject, objData, callback, index, urlList)
    {
      // let newThreeJsObject;
      let modelConfigInstance, modelConfigInstanceMob; // This will be our ModelConfig class instance

      // let isModel = url != undefined;

      let isModel;
      let isPlaneImage;

      if(urlList != undefined)
      {        
        isModel = urlList.modelUrl != undefined;
        isPlaneImage = urlList.planeUrl != undefined;
      }
      // userData.type!!!!!!!!!!!!!!!!
      if(objData) 
      {
            // Scenario 2: Loading/Reloading an Existing Model
            // We're creating a ModelConfig instance from the plain data we loaded.
            modelConfigInstance = ModelConfig.fromPlainObject(objData);
            if(isModel) modelConfigInstance.modelUrl = urlList.modelUrl; // Ensure the URL is up-to-date in the instance
            if(isPlaneImage) modelConfigInstance.modelUrl = urlList.planeUrl; // Ensure the URL is up-to-date in the instance

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
            
            // modelConfigInstance = new ModelConfig({ modelUrl: urlList.modelUrl, planeUrl:  urlList.planeUrl});
            // modelConfigInstanceMob = new ModelConfig({ modelUrl: urlList.modelUrl, planeUrl: urlList.planeUrl, isMobileConfig: true});

            if(isModel)
            {
              modelConfigInstance = new ModelConfig({modelUrl:urlList.modelUrl });
              modelConfigInstanceMob = new ModelConfig({ modelUrl:urlList.modelUrl, isMobileConfig: true});
              modelConfigInstance.modelUrl = urlList.modelUrl;
              modelConfigInstanceMob.modelUrl = urlList.modelUrl;
            }
            else if(isPlaneImage)
            {
              modelConfigInstance = new ModelConfig({planeUrl:urlList.planeUrl });
              modelConfigInstanceMob = new ModelConfig({ planeUrl:urlList.planeUrl, isMobileConfig: true});
              modelConfigInstance.planeUrl = urlList.planeUrl;
              modelConfigInstanceMob.planeUrl = urlList.planeUrl;
            }
            else
            {
              modelConfigInstance = new ModelConfig({ });
              modelConfigInstanceMob = new ModelConfig({  isMobileConfig: true});
            }
            
            let type = newThreeJsObject.userData.type;
            if(type == 'model')
            {

            }
            else if(type == 'group')
            {
              //to do, loop all current names to see if find duplicate, if so plus one and try again
              //allGroups.forEach - remove self from a copy of this list to check others;
              modelConfigInstance.modelName = newThreeJsObject.type + allGroups.length;
            }
            else if(type == 'imageplane')
            {
              modelConfigInstance.modelName = 'Image' + allGroups.length;
            }
            else
            {
              modelConfigInstance.modelName = newThreeJsObject.type + allThreeJsObj.length;
            }
            // Apply default (or initial UI) transforms to the new Three.js object.
            // The ModelConfig constructor already sets defaults for position, rotation, scale.
            newThreeJsObject.position.copy(modelConfigInstance.position);
            newThreeJsObject.rotation.copy(modelConfigInstance.rotation);
            newThreeJsObject.scale.copy(modelConfigInstance.scale);     
            
            modelConfigInstance.type = type;
            if(modelConfigInstanceMob) modelConfigInstanceMob.type = type;
            // Add the plain object representation of this new model to sceneData.models for saving.
            allModels.push(modelConfigInstance.toPlainObject());
            allMobileModels[allModels.length-1] = modelConfigInstanceMob.toPlainObject();
            // allMobileModels.push(modelConfigInstanceMob.toPlainObject());
          }
          
          
        modelConfigInstance.type = newThreeJsObject.userData.type;
        if(modelConfigInstanceMob) modelConfigInstanceMob.type = newThreeJsObject.userData.type;

        // --- Link the ModelConfig instance to the THREE.Object3D via userData ---
        // newThreeJsObject.userData.modelId = modelConfigInstance.modelId;
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

        //when last model added (i.e. last in load all or adding a new one)
        if(allModels.length == allThreeJsObj.length)
        {
          updateParentList();
          updateSaveField(); //more for new objects
        }
        updateObjectList();
        if(isInitialLoad)
        {
          //can add scene size via here, add whenever new model loaded
          itemsLoaded++;
          if(itemsLoaded == allModels.length)
          {
            isInitialLoad = false;
            loadAllMobileData();
            moveAllObjectsToGroups();
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
      
      scaleInputX.value = round(scale.x, 2);
      scaleInputY.value = round(scale.y, 2);
      scaleInputZ.value = round(scale.z, 2);
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

      updateModelData(modelConfigInstance);

      updateSaveField();
  };

  //updates the allModel list so changes are saved
  function updateModelData(modelConfigInstance)
  {
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
  }

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
    // const popupMediaButton = document.getElementById('popup_media_button');
    // const popupMediaButton = document.getElementById('mediaLibraryBtn');
    const addModelButton = document.getElementById('add_model_button');
    const addImageButton = document.getElementById('add_image_button');
    const addGroupButton = document.getElementById('add_group_button');
    const deleteModelButton = document.getElementById('delete_model_button');
    const popup = document.getElementById('newScenePopup');
    const modelUrlField = document.getElementById('threejs_model_url');
    const preview = document.getElementById('threejs_model_url_preview');

    
    const closeModalBtn = document.getElementById('closeModalBtn');
    const mediaLibraryButtons = document.querySelectorAll('.c33d_media_library');
    
    const parentInput = document.getElementById('parentSelector');
    const currentGroupLabel = document.getElementById('current-group-label');


    let popupOpen = false;
    let demoModelPopupOpen = false;
    //TODO: check whether it's replace selected url or add new model
    deleteModelButton.addEventListener('click', deleteObject);


    mediaLibraryButtons.forEach(button => {
        button.addEventListener('click', handleMediaButtonClick);
    });

    function handleMediaButtonClick(e)
    {
      if(popupOpen)
      {
        hideIntroPopup();
      }
      if(demoModelPopupOpen)
      {
        toggleMediaModal();
      }
      openMediaUploader(e);
    }

    function openMediaUploader(e)
    {
      e.preventDefault();
      mediaUploader.open();
    }

    // popupMediaButton.addEventListener('click', function (e) {
    //     // openMediaUploader(e);
    //     if(popupOpen)
    //     {
    //       hideIntroPopup();
    //     }
    //     if(demoModelPopupOpen)
    //     {
    //     }
    //     toggleMediaModal();
    // });

    // mediaButton.addEventListener('click', function (e) {
    //     // openMediaUploader(e);
    //     toggleMediaModal();
    // });

    addModelButton.addEventListener('click', function (e) {
        toggleMediaModal();
    });
    
    addImageButton.addEventListener('click', function (e) {
        handleMediaButtonClick(e);
    });

    closeModalBtn.addEventListener('click', toggleMediaModal);
    // mediaLibraryBtn.addEventListener('click', openMediaUploader);

    addGroupButton.addEventListener('click', function (e) {
        createObject('group');
    });

    const mediaUploader = wp.media({
        title: 'Choose a 3d model or image',
        button: { text: 'Add to scene' },
        multiple: false
        //works for just 'image' but not models
        // library: {
        //         type: [
        //             'model/gltf+json', 
        //             'model/gltf-binary',
        //             'image'
        //         ]
        //     }
    });

    mediaUploader.on('select', function () 
    {
      const attachment = mediaUploader.state().get('selection').first().toJSON();
      modelUrlField.value = attachment.url;
      sceneData.modelUrl = attachment.url;
      const fileMimeType = attachment.mime;
      if (fileMimeType.startsWith('image/')) 
      {
        addImageAsPlane(attachment.url);
        // createObject('imageplane', {imageUrl: attachment.url});
      }
      else if (fileMimeType === 'model/glb-binary' || fileMimeType === 'model/gltf-binary' || fileMimeType === 'model/gltf+json' || fileMimeType === 'model/gltf') 
      {
        // preview.innerHTML = `Current Model: <a href="${attachment.url}" target="_blank">${attachment.url}</a>`;
        if(scene.loopActive)
        {
          // loopDat(sceneData.modelUrl, 0.3, 40, 80, objGroup, [2, 0, 0]);
          sceneDataLoop();
        }
        else
        {
          // loadModel(attachment.url, false, isMobileView);
          loadModel(attachment.url);
        }
      }
      else
      {
        //TODO: handle non supported filetypes, show popup/keep media library open
      }

      

      if(popupOpen)
      {
        hideIntroPopup();
      }
      if(demoModelPopupOpen)
      {
        toggleMediaModal();
      }

    });

    function setupDemoModal()
    {
        // Get references to modal elements (assuming your modal HTML is in the DOM)
        const modelImportModal = document.getElementById('modelImportModal');
        const downloadButtons = document.querySelectorAll('.c33-download'); // Select all download buttons

        // Close modal if user clicks outside the modal content
        modelImportModal.addEventListener('click', (event) => {
            if (event.target === modelImportModal) {
                modelImportModal.classList.add('hidden-modal');
            }
        });

        // Add event listeners to all download buttons
        downloadButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
              if(!downloadInProgress)
              {
                downloadInProgress = true;
                button.querySelector('.c3-loading-icon').style.display = 'block';
                const assetName = event.currentTarget.dataset.assetName;
                const downloadType = event.currentTarget.dataset.downloadType;
                if(downloadType == 'scene')
                {
                  await downloadInitFullScene(assetName, button);
                }
                else
                {
                  await downloadOrAddAsset(assetName, downloadType, button);
                }
              }
            });
          // console.log('Demo modal listeners setup complete.');
      });
    }

    //checks whether already downloaded
    async function downloadOrAddAsset(assetName, downloadType, button)
    {
      if(importedDemoAssets[assetName])
      {
          // console.log(assetName + ' already downloaded, loading');
          loadModel(importedDemoAssets[assetName].attachment_url);
          if(popupOpen)
          {
            hideIntroPopup();
          }
          if(demoModelPopupOpen)
          {
            toggleMediaModal();
          }
          downloadInProgress = false;
          button.querySelector('.c3-loading-icon').style.display = 'none';
      }
      else
      {
        // console.log(assetName + ' not downloaded, initiating download');
        try {
            // const downloadResult = await initiateAjaxDownload(fileUrl, demoObject, fileType, event.target);
            const downloadResult = await downloadAsset(assetName, downloadType);
                // alert(`"${assetName}" (${downloadType}) imported to Media Library successfully!`);
                if (downloadResult.asset.attachment_url) 
                {
                  loadModel(downloadResult.asset.attachment_url); // Call your model loader with the URL
                  // importedDemoAssets[assetName] = 
                  // {
                  //     imported_at: new Date().toISOString(), // Record current time
                  //     type: downloadType,
                  //     attachment_id: downloadResult.attachment_id || null,
                  //     attachment_url: downloadResult.attachment_url || null
                  // };
                  if(popupOpen)
                  {
                    hideIntroPopup();
                  }
                  if(demoModelPopupOpen)
                  {
                    toggleMediaModal();
                  }
                  downloadInProgress = false;
                  button.querySelector('.c3-loading-icon').style.display = 'none';
                  // console.log('loadModel() called with:', downloadResult.asset.attachment_url); // Specific log
              } 
              else 
              {
                  console.warn('Import successful, but no attachment URL received for individual asset.');
              }
            // Handle successful download result (e.g., show message, update UI, close modal)
            // alert(`"${demoObject}" imported successfully! Attachment ID: ${downloadResult.attachment_id}`);
            // modelImportModal.classList.add('hidden-modal'); // Hide modal on success
        } catch (error) {
            // initiateAjaxDownload already alerts/logs, but you can add more specific handling here
            console.error('Demo download failed in setupDemoModal:', error);
            // alert(`Failed to import "${demoObject}". Please try again.`);
        }
      }
    }

    // async function initiateAjaxDownload(fileUrl, demoId, fileType = '', buttonElement = null) {
    async function downloadAsset(assetName, downloadType) 
    {
        if (!ajaxUrl || !ajaxNonce) {
            console.error('AJAX URL or Nonce is missing from localized data. Cannot initiate download.');
            alert('Configuration error: Cannot initiate download. Missing AJAX URL or security token.');
            throw new Error('Missing AJAX URL or nonce.');
        }

        // const originalButtonText = buttonElement ? buttonElement.textContent : '';
        // if (buttonElement) {
        //     buttonElement.textContent = 'Downloading...';
        //     buttonElement.disabled = true;
        // }

        try {
              const response = await fetch(ajaxUrl, 
              {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                      action: 'c33d_download_asset', // This action matches your PHP AJAX hook
                      nonce: ajaxNonce,
                      download_type: downloadType,
                      asset_name: assetName,
                  })
              });

              const result = await response.json();

            if (result.success) {
                // console.log('Download successful:', result.data);
                importedDemoAssets[assetName] = 
                  {
                      imported_at: new Date().toISOString(), // Record current time
                      type: downloadType,
                      attachment_id: result.data.asset?.attachment_id || null,
                      attachment_url: result.data.asset?.attachment_url || null
                  };
                return result.data; // Return the 'data' part of the successful response
            } else {
                console.error('Download failed:', result.data.errors || result.data.message);
                throw new Error(result.data.message || 'Unknown download error');
            }
        } catch (error) {
            console.error('Network or parsing error during download:', error);
            throw error;
        }
    }


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

            // Compute the desired world position (apply offset in world space)
            const newWorldPosition = new THREE.Vector3(
              newIntersectPoint.x + offset.x,
              newIntersectPoint.y + offset.y,
              selectedObj.getWorldPosition(new THREE.Vector3()).z // Keep current world Z
            );

            // Convert world position to local position relative to selectedObj's parent
            const newLocalPosition = selectedObj.parent.worldToLocal(newWorldPosition.clone());

            // Apply new local position
            selectedObj.position.copy(newLocalPosition);

            // Update any necessary transforms
            updateTransforms();

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
      if(document.querySelector('#c33d-editor').closest('.edit-post-layout__metaboxes'))
      {
        scrollElement = document.querySelector('#c33d-editor').closest('.edit-post-layout__metaboxes');
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


        const targetElement = event.target;
        const targetTagName = targetElement.tagName.toUpperCase();

        if (
            targetTagName === 'INPUT' ||
            targetTagName === 'TEXTAREA' ||
            targetTagName === 'SELECT' ||
            targetElement.isContentEditable 
        ) {
            return;
        }

        switch (event.key.toLowerCase()) {
          case 'a': 
                if(event.altKey)
                {
                  mouseAnimationLinkInput.checked = !mouseAnimationLinkInput.checked;
                  refreshMouseAnimationLink();
                }
                if(event.shiftKey)
                {
                  // openMediaUploader(event);
                  toggleMediaModal();
                }                
                break;  
          case 'A':
                // if(event.shiftKey)
                // {
                //   openMediaUploader(event);
                // }
                // break;
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
          case 'g': 
                createObject('group');
                break;  
          case 'h': 
                // createObject('plane');
                createObject('imageplane', {planeUrl: "http://localhost/wpLocalEdge/wp-content/uploads/2025/07/lapimg.jpg"});
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
                  saveButtonClicked();
                  // wpPublishButton.click();
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
            case 'delete':
                deleteObject();
                break;
            case 'shift':
                shiftDown = true;
                scrollMultiplier = 0.3;
                break;
            case 'l': // Scale mode
                loopActive = !loopActive;
                loopActiveInput.checked = loopActive;
                toggleLoop();
                break;
            case 'p':
                copySceneDataToClipboard();
                break;
            case 'm':
              downloadInitFullScene('scene1', ['star', 'laptop']);
              // initiateSceneConfigImport('https://c33d.kaurib.com/scenes/scene1.json', 'scene1');  
              // initFromJson();
                break;
        }
    });

    window.addEventListener('keyup', (event) => {
      switch (event.key.toLowerCase()) {
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
        case 'shift':
              shiftDown = false;
              scrollMultiplier = 1;
              break;
      }
    });

    saveButton.addEventListener('click', saveButtonClicked);

    function saveButtonClicked()
    {
      saveButton.style.opacity = '0.5';
      saveButton.innerText = 'Saving...';
      wpPublishButton.click();
    }

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

      if(selectedObj != undefined)
      {
        let currentWorldPosition = new THREE.Vector3();    
        selectedObj.getWorldPosition(currentWorldPosition);
        const targetWorldPosition = currentWorldPosition.clone();

        if(e.wheelDelta > 0) //scroll up, away,
        {
          if(keyZTrans)
          {
            if (selectedObjData.parentUuid != -1) 
            { 
                targetWorldPosition.z -= scrollMultiplier * 0.5;
                selectedObj.parent.worldToLocal(targetWorldPosition);
                selectedObj.position.copy(targetWorldPosition);
            } 
            else 
            {
                // If there's no parent or the parent is the scene, the object's position is already in world coordinates.
                selectedObj.position.z -= scrollMultiplier * 0.5;
                // selectedObj.position.z = targetWorldPosition.z; // Directly set the world Z
            }
          }
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
          if(keyZTrans)
          {
            if (selectedObjData.parentUuid != -1) 
            { 
                targetWorldPosition.z += scrollMultiplier * 0.5;
                selectedObj.parent.worldToLocal(targetWorldPosition);
                selectedObj.position.copy(targetWorldPosition);
            } 
            else 
            {
                // If there's no parent or the parent is the scene, the object's position is already in world coordinates.
                selectedObj.position.z += scrollMultiplier * 0.5;
                // selectedObj.position.z = targetWorldPosition.z; // Directly set the world Z
            }
          }
          // if(keyZTrans) selectedObj.position.z += scrollMultiplier*0.5;
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
        //refactor
        // set modifier based on wheel data > 0 then multiply the transform
      }
    }, { passive: false });

    function setTransformMode(mode, e, clickedButton)
    {
      if(e) e.preventDefault();
      controls.setMode(mode);
      // groupControls.setMode(mode);
      setGizmoVisible(true);
      if(mode != 'scale')
      {
        // groupControls.setMode(mode);
      }
      else
      {
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
            return;
        }

        if (intersects.length > 0) {
            // An object was clicked! Get the first (closest) intersected object.
            let clickedObject = intersects[0].object;
            // controls.enabled = true;
            // controls.visible = true;

            isDragging = true;

            

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
            selectModelForEditing(selectableObject); // Call your existing selection function
            
            const worldPos = selectedObj.getWorldPosition(new THREE.Vector3());
            // const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, initialIntersectionPoint);



            const hit = raycaster.ray.intersectPlane(plane, initialIntersectionPoint);
            if (hit) {
              // offset.copy(selectableObject.position).sub(initialIntersectionPoint);
              offset.copy(worldPos).sub(initialIntersectionPoint);
            } else {
              console.warn("Ray did not intersect the plane");
            }





            // if (selectableObject && selectableObject !== selectedObj) {
            //     // A new object is selected
            //     selectModelForEditing(selectableObject); // Call your existing selection function
            // } else if (selectableObject === selectedObj) {
            //     // Optionally, you could toggle controls mode (translate/rotate/scale) here
            // }

        } else {
            // No object was clicked, so deselect the current one (optional)
            if (selectedObj) {
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
        updateParentList();
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

        // let objDisplayName;
        let objDisplayName = obj.userData.modelConfigRef.modelName;
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

function updateParentList()
{
  parentInput.innerHTML = '';
  const currentOption = document.createElement('option');
  currentOption.value = -1;
  currentOption.textContent = "Select a group";
  parentInput.appendChild(currentOption);

  const mainScene = document.createElement('option');
  mainScene.value = -2;
  mainScene.textContent = "No Group";
  if(selectedObj)
  {
    if(selectedObj.userData.modelConfigRef.parentUuid != -1)
    {
      parentInput.appendChild(mainScene);
    }
    else
    {
      currentGroupLabel.innerHTML = 'No Group';
    }
    // Add each found group as an option in the dropdown
    allGroups.forEach((group, index) => {
      if(selectedObj.parent != group && selectedObj != group)
      {
        const option = document.createElement('option');
        // option.value = group.uuid;
        option.value = group.userData.modelConfigRef.modelId;
        option.textContent = group.userData.modelConfigRef.modelName;
        parentInput.appendChild(option);
      }

      if(selectedObj.parent == group)
      {
        currentGroupLabel.innerHTML = group.userData.modelConfigRef.modelName;
      }
    });
  }
  

}

// .onchange
parentInput.addEventListener('change', () => {
  
  const groupUuid = parentInput.value;
  if(groupUuid == -1) return;
  let newParent;
  //back to top level scene
  if(groupUuid == -2)
  {
    newParent = scene.children[0];
    selectedObj.userData.modelConfigRef.parentUuid = -1;
  }
  else
  {
    // const newParent = allGroups[groupIndex];
    // const newParent = getThreeJsObjectByUuid(groupUuid);
    newParent = getThreeJsObjectByUuid(groupUuid);
    selectedObj.userData.modelConfigRef.parentUuid = newParent.userData.modelConfigRef.modelId;
  }
  moveObjectToGroup(selectedObj, newParent);
  updateModelData(selectedObjData);
  updateTransforms(); //relative transforms change
  updateParentList();
});

function moveAllObjectsToGroups()
{
  allThreeJsObj.forEach(function(model)
  {
    const parentModelId = model.userData.modelConfigRef.parentUuid;
    // if(modelIndex != -1 && modelIndex != undefined)
    if(parentModelId != -1)
    {
      moveToGroupKeepLocalPosition(model, getThreeJsObjectByUuid(parentModelId));
      // moveObjectToGroup(model, getThreeJsObjectByUuid(parentModelId));
      // duplicateObjectInGroup(model, getThreeJsObjectByUuid(parentModelId));
    }
  });
  updateTransforms();
}

function moveToGroupKeepLocalPosition(model, groupObject)
{
  model.parent.remove(model);
  groupObject.add(model);
}

function moveObjectToGroup(model, groupObject)
{
  //This method maintains it's world position
  groupObject.attach(model);
}


function duplicateObjectInGroup(object, newParent) {
  // 1. Copy the object's current local transforms
  const originalPosition = object.position.clone();
  const originalRotation = object.rotation.clone(); // Euler
  const originalScale = object.scale.clone();

  // 2. Reset transforms to identity (0 position, 0 rotation, 1 scale)
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);

  // 3. Add object to the new parent
  newParent.add(object);

  // 4. Reapply the original local transforms
  object.position.copy(originalPosition);
  object.rotation.copy(originalRotation);
  object.scale.copy(originalScale);
}



function getThreeJsObjectByUuid(modelId)
{
  // return scene.getObjectByProperty('uuid', uuid);
  for (let i = 0; i < allThreeJsObj.length; i++) {
        const modelConfigRef = allThreeJsObj[i].userData.modelConfigRef; // Get the current item from the array
        if (modelConfigRef.modelId === modelId) {
            return modelConfigRef.threeJsObject; // Return the associated THREE.Object3D
        }
    }
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
          selectedItem.style.backgroundColor = 'var(--c33d-v-light-blue)';
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

    function deleteObject(threeJsObject)
    {
      let objectToDelete = threeJsObject ? threeJsObject : selectedObj;
      let deleteObjData = threeJsObject ? threeJsObject.userData.modelConfigRef : selectedObjData;
      let threeJsObjectIndex = allThreeJsObj.indexOf(objectToDelete);
      const groupIndex = allGroups.indexOf(objectToDelete);
      if(groupIndex != -1)
      {
        allGroups.splice(groupIndex, 1);
      }
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
      if (rotateGroup && objectToDelete instanceof THREE.Object3D) { // Ensure 'scene' is a Three.js scene and 'selectedObj' is a Three.js object
        if(deleteObjData.parentUuid != -1)
        {
          objectToDelete.parent.remove(objectToDelete);
        } 
        else
        {
          if(deleteObjData.type == 'group')
          {
            //also delete all it's children
            const childrenToRemove = [...selectedObj.children];

            childrenToRemove.forEach(child => {
              deleteObject(child);
            });            
            //show a warning before hand

            // Refresh index after children removed
            threeJsObjectIndex = allThreeJsObj.indexOf(objectToDelete);
            rotateGroup.remove(objectToDelete);
          }
          else
          {
            rotateGroup.remove(objectToDelete);
          }
        } 
          // console.log(`Removed object from scene: ${objectToDelete.name || objectToDelete.uuid}`);
      } else {
          console.warn("Three.js scene not provided or selectedObj is not a valid Three.js object. Object might not be removed from the scene.");
      }

      // 5. Remove from allThreeJsObj
      allThreeJsObj.splice(threeJsObjectIndex, 1);

      // 6. Remove from allModels
      allModels.splice(modelConfigIndex, 1);
      allMobileModels.splice(modelConfigIndex, 1);

      // Optional: Dispose of Three.js geometry, material, and textures
      // This is crucial to prevent memory leaks, especially if you load many models.
      if (objectToDelete.geometry) {
          objectToDelete.geometry.dispose();
      }
      if (objectToDelete.material) {
          // If material is an array of materials
          if (Array.isArray(objectToDelete.material)) {
              objectToDelete.material.forEach(material => material.dispose());
          } else {
              objectToDelete.material.dispose();
          }
      }

      // TODO: if last object deleted, show first screen again
      if(allThreeJsObj.length == 0)
      {
        controls.attach(rotateGroup);
        showIntroPopup();
      }
      else
      {
        const lastObjectInList = allThreeJsObj[allThreeJsObj.length - 1];
        selectModelForEditing(lastObjectInList);
        updateObjectList();
        updateParentList();
      }
    }


      function updateSaveField()
      {
        // Enable this line to override mobile data with current .models, helpful if mobile data is corrupted
        // allSceneData.models[1] = allSceneData.models[0];
        if (hiddenInputField) 
          {
                try {
                    // Stringify the entire sceneData object
                    hiddenInputField.value = JSON.stringify(allSceneData);
                } catch (e) {
                    console.error("Error stringifying sceneData:", e);
                    // Optionally, clear the field or revert to a safe state if stringification fails
                    hiddenInputField.value = '';
                }
            } else {
                console.warn("Hidden input field with ID 'threejs_scene_config_json' not found!");
            }
        }

        const allTabs = document.querySelectorAll('.tab');
        const allTabsContent = document.querySelectorAll('.tabContent');
        let activeTab = 'object';
        tabClicked(activeTab);

        function tabClicked(tabName)
        {
          //show clicked, hide all rest
          hideAllTabs();
          activeTab = tabName;
          document.querySelector('.c'+tabName).style.display = 'flex';

          document.querySelector('.activeTab').classList.remove('activeTab');
          document.querySelector('#'+tabName+'Tab').classList.add('activeTab');
        }

        function hideAllTabs()
        {
          allTabsContent.forEach(tabContent => {
              tabContent.style.display = 'none';
          });
        }

        allTabs.forEach(tabElement => {
            const handleTabClick = (event) => {
                const fullTabId = event.currentTarget.id;
                const tabParameter = fullTabId.replace('Tab', '');
                
                tabClicked(tabParameter);
            };

            tabElement.addEventListener('mousedown', handleTabClick);
        });

      init();

      const shortcodeTextarea = document.querySelector('#shortcodeArea');
      shortcodeTextarea.addEventListener('mousedown', () => 
      {        
        copyShortcodeToClipboard();
      });

      function copyShortcodeToClipboard()
      {
        const shortCodeText = shortcodeTextarea.value;
        shortcodeTextarea.select();
        shortcodeTextarea.setSelectionRange(0, shortcodeTextarea.value.length);
        navigator.clipboard.writeText(shortcodeTextarea.value)
        shortcodeTextarea.value = 'Copied!';
        setTimeout(() => {
            shortcodeTextarea.value = shortCodeText;
        }, 1000);
      }

      //export scene data
      function copySceneDataToClipboard()
      {
        navigator.clipboard.writeText(JSON.stringify(allSceneData));
        // navigator.clipboard.writeText("'"+JSON.stringify(allSceneData)+"'");

      }

      function toggleMediaModal() 
      {
          modelImportModal.classList.toggle('hidden-modal');
          demoModelPopupOpen = !modelImportModal.classList.contains('hidden-modal');
      }

      // async function initiateSceneConfigImport(sceneUrl, sceneId, buttonElement = null) {
      // async function downloadInitFullScene(sceneName, modelList) 
      async function downloadInitFullScene(sceneName, button) 
      {

        // initiateSceneConfigImport('https://c33d.kaurib.com/scenes/scene1.json', 'scene1');  
        
        // let modelList = ['star', 'laptop'];  

        let sceneConfig = null;

        try {
            // 1. Download the scene JSON configuration
            const sceneResult = await downloadAsset(sceneName, 'scene');
            sceneConfig = sceneResult.scene_data;

            if (!sceneConfig) {
                throw new Error('Failed to retrieve scene configuration data.');
            }

            // const modelList = sceneConfig.models[0];
            // 2. Download all required models concurrently
            const modelsToProcess = sceneConfig.globalSettings.downloadModels
                                    .split(' ')
                                    .filter(name => name.trim() !== '');
            // if (modelList.length > 0) {
            let downloadedModelResults;
            if (modelsToProcess.length > 0) {
                // console.log('Models to download:', modelsToProcess);
                // if (buttonElement) buttonElement.textContent = `Downloading ${requiredModels.length} Models...`;

                //check if downloaded, if yes, return the downloaded model, if no, wait till downloaded then run init
                const downloadPromises = modelsToProcess.map(modelName => 
                  {
                    // downloadAsset(modelName, 'model')
                    if(!importedDemoAssets[modelName])
                    {
                      // downloadOrAddAsset(modelName, 'model')
                      return downloadAsset(modelName, 'model');
                    }
                    else
                    {
                      // return downloadAsset(modelName, 'model');   //enable to test downloading no matter what                   
                      return Promise.resolve({ modelName: modelName, asset: importedDemoAssets[modelName] });
                    }
                  }
                );
                downloadedModelResults = await Promise.all(downloadPromises);
                if(popupOpen)
                {
                  hideIntroPopup();
                }
                if(demoModelPopupOpen)
                {
                  toggleMediaModal();
                }
                downloadInProgress = false;
                button.querySelector('.c3-loading-icon').style.display = 'none';

                // sceneConfig = setSceneJsonModelUrls(sceneConfig, downloadedModelResults);
                setSceneJsonModelUrls(sceneConfig, downloadedModelResults);
            }
            // initGlobalSettings(sceneConfig.globalSettings);

            updateSaveField(); 
            isInitialLoad = true; 
            itemsLoaded = 0;
            initFromJson(sceneConfig);
          }
          catch (error) {
            console.error('Failed to download or initialize full scene:', error);
            alert(`Failed to import full scene "${sceneName}". Please try again. Error: ${error.message}`);
          } 
          // finally {
          //     if (buttonElement) {
          //         buttonElement.textContent = originalButtonText; // Reset text
          //         buttonElement.disabled = false;
          //     }
          // }
        }
            
        function setSceneJsonModelUrls(sceneData, downloadedModelResults)
        {
          //get all models urls (will just set to basic asset name e.g. phone, laptop) 
          //    and update their url to the local version of them
          sceneData.models.forEach((deviceModels) =>
          {
            deviceModels.forEach((model) =>
            {
              const modelName = model.modelUrl;
              downloadedModelResults.forEach((downloadModel) =>
              {
                if(downloadModel.modelName == modelName)
                {
                  model.modelUrl = downloadModel.asset.attachment_url;
                }
              });
            });
          });
        }


        // if (!ajaxUrl || !ajaxNonce) {
        //     console.error('AJAX URL or Scene Import Nonce is missing. Cannot import scene config.');
        //     alert('Configuration error: Cannot import scene. Missing AJAX URL or security token.');
        //     throw new Error('Missing AJAX URL or nonce.');
        // }

        // const originalButtonText = buttonElement ? buttonElement.textContent : '';
        // if (buttonElement) {
        //     buttonElement.textContent = 'Importing...';
        //     buttonElement.disabled = true;
        // }

        // try {
        //     const response = await fetch(ajaxUrl, {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/x-www-form-urlencoded',
        //         },
        //         body: new URLSearchParams({
        //             action: 'codesthree_import_scene_config',
        //             nonce: ajaxNonce,
        //             scene_id: sceneId,
        //             scene_url: sceneUrl
        //         })
        //     });

        //     const result = await response.json();

        //     if (result.success) {
        //         initFromJson(result.data);
        //         return result.data; // Return the entire data object from PHP, including scene_data
        //     } else {
        //         console.error('Scene import failed:', result.data.errors || result.data.message);
        //         throw new Error(result.data.message || 'Unknown scene import error');
        //     }
        // } catch (error) {
        //     console.error('Network or parsing error during scene import:', error);
        //     throw error;
        // } finally {
        //     if (buttonElement) {
        //         buttonElement.textContent = originalButtonText;
        //         buttonElement.disabled = false;
        //     }
        // }
    // }
}



