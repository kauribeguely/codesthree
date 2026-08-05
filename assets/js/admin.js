console.time('fullLoad');

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { TransformControls } from 'three/addons/TransformControls.js';
import { RGBELoader } from 'three/addons/RGBELoader.js';
import { CSS3DRenderer, CSS3DObject } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js';

import { getMouseChannels, mergeChannels } from './input-providers.js';
import { HandInputProvider, parseDistanceChannelKey, LANDMARK_NAMES } from './hand-input-provider.js';

const localisedData = window.c33dadminlocaliseddata;
let allSceneData = JSON.parse(localisedData.allSceneData);
const ajaxUrl = localisedData.ajax_url;
const ajaxNonce = localisedData.ajax_nonce;
console.log('C33D Transform Data:', allSceneData);
const importedDemoAssets = JSON.parse(localisedData.importedDemoAssets);
let downloadInProgress = false;
const blendModeSelect = document.getElementById('blendMode');
let orbitControls;
const gestureEngineUrl = localisedData.gestureEngineUrl;



let keyXRot = false, keyYRot = false, keyZRot = false, keyZTrans = false, keyScale = false;
let shiftDown = false;
let scrollMultiplier = 1;
let isInitialLoad = true;
let itemsLoaded = 0;
const hiddenInputField = document.getElementById('threejs_scene_config_json');
const saveButton = document.querySelector('#c3SaveButton');
// const materialListDiv = document.getElementById('material-list');
const bgColorPicker = document.getElementById('backgroundColor');
const noBackgroundToggle = document.getElementById('transparentBackgroundToggle');

const materialSelector = document.getElementById('materialSelector');
const propertiesPanel = document.getElementById('materialPropertiesPanel');
const materialColorPicker = document.getElementById('materialColor');
const materialTextureBtn = document.getElementById('materialTextureBtn');
const emissiveColorPicker = document.getElementById('emissiveColor');
const emissiveTextureBtn = document.getElementById('emissiveTextureBtn');
const stencilSendInput = document.getElementById('stencil-send');
const stencilReceiveInput = document.getElementById('stencil-receive');
const stencilShowHide = document.getElementById('stencilShowHide');
const lightSelector = document.getElementById('light-selector');
const lightColor = document.getElementById('lightColor');
const selectedLightInputs = document.getElementById('selectedLightInputs');

const castInput = document.getElementById('cast_shadows');
const recieveInput = document.getElementById('recieve_shadows');

let editingTextureType = null; // 'map' or 'emissiveMap'
let selectedMaterials = null;
let mediaModelOpen = false;

const deleteTextureBtn = document.getElementById('deleteTexture');
const deleteEmissiveBtn = document.getElementById('deleteEmissive');


const exportSceneBtn = document.getElementById('exportScene');
const importSceneBtn = document.getElementById('importScene');
const importSceneText = document.getElementById('importSceneText');


const animTriggerSource = document.getElementById('animTriggerSource');
const editBaseState = document.getElementById('editBaseState');
const editKeyframe1 = document.getElementById('editKeyframe1');
const previewAnimationToggle = document.getElementById('previewAnimationToggle');
const currentInputValue = document.getElementById('currentInputValue');

const animTriggerInvert = document.getElementById('animTriggerInvert');
const resetKeyframe1 = document.getElementById('resetKeyframe1');
let currentEditTarget = 'base';

let previewingAnimation = false;

let allLightHelpers = [];
let handInputProvider = null; // set externally once hand tracking starts; null = feature unused

let mouseFollowObj = [];

const targetZ = 3; // Fixed Z position for the light (how far it is from the scene)
const rangeX = 10; // How far the light can move horizontally (X-axis)
const rangeY = 10; // How far the light can move vertically (Y-axis)
let lastLight;
let lastLightFollow = false;

let isFullSceneInit = false;

let defaultLightTimer;


// --- new element refs, alongside animTriggerSource/animTriggerInvert/animTriggerDamping ---
const triggerSourceType = document.getElementById('triggerSourceType');
const mouseTriggerInputs = document.getElementById('mouseTriggerInputs');
const handTriggerInputs = document.getElementById('handTriggerInputs');
const handTriggerHand = document.getElementById('handTriggerHand');
const handTriggerMetric = document.getElementById('handTriggerMetric');
const handTriggerLandmarkSingle = document.getElementById('handTriggerLandmarkSingle');
const handTriggerLandmarkAxis = document.getElementById('handTriggerLandmarkAxis');
const handTriggerLandmarkA = document.getElementById('handTriggerLandmarkA');
const handTriggerAxis = document.getElementById('handTriggerAxis');
const handTriggerLandmarkPair = document.getElementById('handTriggerLandmarkPair');
const handTriggerLandmarkPairA = document.getElementById('handTriggerLandmarkPairA');
const handTriggerLandmarkPairB = document.getElementById('handTriggerLandmarkPairB');
const handTriggerPixelNote = document.getElementById('handTriggerPixelNote');
const animTriggerMinInput = document.getElementById('animTriggerMin');
const animTriggerMaxInput = document.getElementById('animTriggerMax');

const METRIC_DEFAULTS = {
  landmark: { min: 0, max: 1, pixelSpace: false },
  pinchDistance: { min: 0, max: 0.5, pixelSpace: false },
  pinchDistancePx: { min: 0, max: window.innerWidth || 1920, pixelSpace: true },
  rotation: { min: -90, max: 90, pixelSpace: false },
  rotationThumbIndex: { min: -90, max: 90, pixelSpace: false },
  distance: { min: 0, max: 1, pixelSpace: false },
  distancePx: { min: 0, max: window.innerWidth || 1920, pixelSpace: true },
};

// Populate landmark dropdowns once, on load
[handTriggerLandmarkA, handTriggerLandmarkPairA, handTriggerLandmarkPairB].forEach(select => {
  LANDMARK_NAMES.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
});


const directBindingsList = document.getElementById('directBindingsList');
const addDirectBindingBtn = document.getElementById('addDirectBindingBtn');
const directBindingRowTemplate = document.getElementById('directBindingRowTemplate');



// document.addEventListener('DOMContentLoaded', () => {
window.onload = () => {

  class ModelConfig {
    static schema = {
      modelId: () => crypto.randomUUID(),
      modelUrl: '',
      planeUrl: '',
      modelName: '',
      type: null,
      parentUuid: -1,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      width: 300,
      height: 200,
      shortcodeStr: '',
      shortcodeHtml: '',
      loopActive: false,
      loopCountX: 1,
      isMobileConfig: false,
      materialProperties: {},
      renderOrder: 0,
      stencilRef: null,
      isStencil: false,
      link: null,
      lightSettings: {},
      castShadow: false,
      receiveShadow: false,
      animTriggerSource: 'mouseX',
      animTriggerInvert: false,
      animTriggerSource: 'mouseX',
      animTriggerInvert: false,
      animTriggerMin: 0,
      animTriggerMax: 1,
      animDamping: 1.0,
      keyframe1: null,
      directBindings: () => [],
    };

    constructor(data = {}) {
      for (const [key, defaultValue] of Object.entries(ModelConfig.schema)) {
        if (data[key] !== undefined) {
          this[key] = data[key]; // use provided value
        } else {
          this[key] = (typeof defaultValue === "function" ? defaultValue() : defaultValue);
        }
      }

      // === Special logic for modelName ===
      if (data.modelUrl || data.modelName) {
        this.modelName = data.modelName || data.modelUrl.split('/').pop();
      }
      if (data.planeUrl) {
        this.modelName = data.planeUrl.split('/').pop();
      }

      this.lightSettings = data.lightSettings ? { ...data.lightSettings } : {};

      // Keep special derived properties
      this.position = new THREE.Vector3(this.positionX, this.positionY, this.positionZ);
      this.rotation = new THREE.Euler(
        THREE.MathUtils.degToRad(this.rotationX),
        THREE.MathUtils.degToRad(this.rotationY),
        THREE.MathUtils.degToRad(this.rotationZ)
      );
      this.scale = new THREE.Vector3(this.scaleX, this.scaleY, this.scaleZ);

      // Deserialize keyframe1 plain data back into THREE objects
      if (data.keyframe1 && data.keyframe1.position && data.keyframe1.rotation) {
        this.keyframe1 = {
          position: new THREE.Vector3(data.keyframe1.position.x, data.keyframe1.position.y, data.keyframe1.position.z),
          rotation: new THREE.Euler(data.keyframe1.rotation.x, data.keyframe1.rotation.y, data.keyframe1.rotation.z),
          scale: data.keyframe1.scale
            ? new THREE.Vector3(data.keyframe1.scale.x, data.keyframe1.scale.y, data.keyframe1.scale.z)
            : new THREE.Vector3(this.scale.x, this.scale.y, this.scale.z), // fallback: old saves without scale keep current scale, no jump
        };
      } else {
        this.keyframe1 = null;
      }

      this.threeJsObject = null;
    }


    applyStencilProperties() {
      if (this.stencilRef != null) {
        if (this.isStencil) {

        }
        else {

        }
      }
    }

    setMaterialProperties(materialName, properties) {
      if (!materialName || !properties) {
        console.error('Material name and properties object are required to set material properties.');
        return;
      }

      // Initialize materialProperties as an array if it doesn't exist.
      if (!Array.isArray(this.materialProperties)) {
        this.materialProperties = [];
      }

      // Find if an object for this materialName already exists.
      let materialPropsObject = this.materialProperties.find(item => item.materialName === materialName);

      // If a matching object is found, merge the new properties into it.
      if (materialPropsObject) {
        Object.assign(materialPropsObject, properties);
      } else {
        // If not found, create a new object and push it into the array.
        this.materialProperties.push({
          materialName: materialName,
          ...properties, // Use the spread operator to add all properties from the 'properties' object
        });
      }
    }


    applyMaterialPropertiesToModel() {
      // Return early if there's no Three.js object or no material properties to apply.
      if (!this.threeJsObject || this.materialProperties.length === 0) {
        console.warn('No Three.js object or explicit material properties available to apply.');
        return;
      }
      const textureLoader = new THREE.TextureLoader();
      const materialsByName = new Map();

      if (this.renderOrder != 0) this.threeJsObject.renderOrder = this.renderOrder;

      // First, build a map of materials by their name for quick lookup.
      // This part remains the same and is a good practice.
      this.threeJsObject.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            if (mat.name) {
              materialsByName.set(mat.name, mat);
            }
            else {
              mat.name = 'Unnamed';
              materialsByName.set(mat.name, mat);
            }
          });
        }
      });

      this.materialProperties.forEach(savedMaterial => {
        const { materialName, ...properties } = savedMaterial;
        const material = materialsByName.get(materialName);

        if (material) {
          // Iterate through the properties of the current material.

          for (const propName in properties) {
            const propValue = properties[propName];

            // Special handling for textureUrl
            if (propName === 'map' || propName === 'emissiveMap') {
              textureLoader.load(
                propValue,
                (texture) => {
                  texture.flipY = false;
                  texture.colorSpace = THREE.SRGBColorSpace;
                  material[propName] = texture;
                  // material.map = texture;
                  material.needsUpdate = true;
                },
                undefined,
                (error) => {
                  console.error(`Error loading texture from URL: ${propValue} for material name: ${materialName}`, error);
                }
              );
            }
            else if (propName === 'blending') {
              setBlendMode(material, propValue);
            }
            // else if (propName === 'materialColor' && material.color) {
            //   // Specific handling for color
            //   material.color.setHex(propValue);
            //   material.needsUpdate = true;
            // } 
            // else if (propName === 'emissiveColor' && material.emissive) {
            //   // Specific handling for color
            //   material.color.setHex(propValue);
            //   material.needsUpdate = true;
            // } 
            else if (propName in material) {
              // For all other properties, apply them directly
              // console.log(`Applying property '${propName}' to material '${materialName}' with value: ${propValue}`);
              if (material[propName].isColor) {
                material[propName].setHex(propValue);
              }
              else {
                // console.log(propName, propValue);
                if (propName == 'opacity') {
                  material.transparent = true;
                }
                material[propName] = propValue;
              }
              material.needsUpdate = true;
            } else {
              console.warn(`Property '${propName}' is not a valid property for material '${materialName}'.`);
            }
          }
        } else {
          console.warn(`Could not find a material with name: ${materialName} on the loaded object.`);
        }
      });

    }
    // updateSavedMaterials() {
    //     const textureData = [];
    //     const uniqueMaterials = new Set();

    //     this.threeJsObject.traverse((child) => {
    //         if (child.isMesh && child.material) {
    //             const materials = Array.isArray(child.material) ? child.material : [child.material];
    //             materials.forEach(mat => uniqueMaterials.add(mat));
    //         }
    //     });

    //     uniqueMaterials.forEach(material => {
    //         if (material.map && material.map.source && material.map.source.data) {
    //             // We're storing the material's UUID and the texture's source URL
    //             textureData.push({
    //                 materialUuid: material.uuid,
    //                 textureUrl: material.map.source.data.src
    //             });
    //         }
    //     });

    //     this.materialTextures = textureData;
    //     return textureData;
    // }


    // Method to convert this class instance back to a plain object for JSON stringification
    toPlainObject() {
      const obj = {};
      for (const key of Object.keys(ModelConfig.schema)) {
        if (key.startsWith("position")) {
          const axis = key.charAt(8).toLowerCase(); // X → 'x'
          obj[key] = this.position[axis];
        } else if (key.startsWith("scale")) {
          const axis = key.charAt(5).toLowerCase();
          obj[key] = this.scale[axis];
        } else if (key.startsWith("rotation")) {
          const axis = key.charAt(8).toLowerCase();
          obj[key] = THREE.MathUtils.radToDeg(this.rotation[axis]);
        } else if (key === 'keyframe1') {
          if (this.keyframe1 && this.keyframe1.position && this.keyframe1.rotation) {
            obj[key] = {
              position: { x: this.keyframe1.position.x, y: this.keyframe1.position.y, z: this.keyframe1.position.z },
              rotation: { x: this.keyframe1.rotation.x, y: this.keyframe1.rotation.y, z: this.keyframe1.rotation.z },
              scale: this.keyframe1.scale
                ? { x: this.keyframe1.scale.x, y: this.keyframe1.scale.y, z: this.keyframe1.scale.z }
                : { x: this.scale.x, y: this.scale.y, z: this.scale.z },
            };
          } else {
            obj[key] = null;
          }
        } else { //all others
          if (key !== 'shortcodeHtml') {
            obj[key] = (key === 'directBindings') ? JSON.parse(JSON.stringify(this[key])) : this[key];
          }
        }
      }
      return obj;
    }

    static fromPlainObject(obj) {
      return new ModelConfig({
        ...obj,
        positionX: obj.positionX,
        positionY: obj.positionY,
        positionZ: obj.positionZ,
        rotationX: obj.rotationX,
        rotationY: obj.rotationY,
        rotationZ: obj.rotationZ,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        scaleZ: obj.scaleZ,
        width: obj.width !== undefined ? obj.width : 300,
        height: obj.height !== undefined ? obj.height : 200,
        shortcodeStr: obj.shortcodeStr !== undefined ? obj.shortcodeStr : '',
        shortcodeHtml: obj.shortcodeHtml !== undefined ? obj.shortcodeHtml : '',
        lightSettings: obj.lightSettings
      });
    }

    addDirectBinding(binding) {
      if (!Array.isArray(this.directBindings)) this.directBindings = [];
      this.directBindings.push({ id: crypto.randomUUID(), invert: false, damping: 1.0, ...binding });
    }

    removeDirectBinding(id) {
      this.directBindings = this.directBindings.filter(b => b.id !== id);
    }

    updateDirectBinding(id, changes) {
      const binding = this.directBindings.find(b => b.id === id);
      if (binding) Object.assign(binding, changes);
    }

  }


  let plane = new THREE.Plane();
  let isDragging = false;
  let offset = new THREE.Vector3(); // To store the offset between click point and object center
  let initialIntersectionPoint = new THREE.Vector3();

  //backward compatibility
  // if(allSceneData.models[1] == undefined)

  if (!Array.isArray(allSceneData.models[1])) {
    const oldModels = allSceneData.models;
    allSceneData.models = [];
    allSceneData.models.push(oldModels);
    allSceneData.models.push([]);
  }

  let sceneData = allSceneData.globalSettings;
  let allModels = allSceneData.models[0];
  let allMobileModels = allSceneData.models[1];

  let initialCamera = { ...allSceneData.globalSettings.camera };

  // Map the string values from the HTML to the Three.js constants
  const blendModes = {
    NormalBlending: THREE.NormalBlending,
    AdditiveBlending: THREE.AdditiveBlending,
    SubtractiveBlending: THREE.SubtractiveBlending,
    MultiplyBlending: THREE.MultiplyBlending,
    NoBlending: THREE.NoBlending,
    CustomBlending: THREE.CustomBlending
  };

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

  let isSaving = false;

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

  const arEnabledInput = document.getElementById('arEnabled');
  let arEnabled = sceneData.arEnabled || false;


  // const showLightHelpers = document.getElementById('showLightHelpers');


  const container = document.getElementById('threejs-canvas');
  const labelContainer = document.getElementById('label'); // Label container for displaying object details

  let isoZoom = 250;
  const scene = new THREE.Scene();
  // scene.background = new THREE.Color(0x000000); 
  if (allSceneData.globalSettings.bgColor !== undefined) {
    scene.background = new THREE.Color(allSceneData.globalSettings.bgColor);
  } else {
    // Fallback to a default color if bgColor is not defined
    // scene.background = new THREE.Color(0x000000); // Black
    scene.background = null;
  }
  // scene.background = new THREE.Color(allSceneData.globalSettings.bgColor) || new THREE.Color(0x000000); 
  if (allSceneData.globalSettings.bgColor) bgColorPicker.value = '#' + allSceneData.globalSettings.bgColor.toString(16).padStart(6, '0');
  if (allSceneData.globalSettings.noBackground == true) {
    noBackgroundToggle.checked = true;
    scene.background = null;
  }


  let rotateGroup = new THREE.Group();
  scene.add(rotateGroup);
  let camera;
  const perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  const orthoCamera = new THREE.OrthographicCamera(container.clientWidth / - isoZoom, container.clientWidth / isoZoom, container.clientHeight / isoZoom, container.clientHeight / - isoZoom, 0.1, 1000);

  // camera: {
  //               position: { x: 10, y: 10, z: 10 },
  //               rotation: { x: 0, y: 0, z: 0, w: 1 },
  //               zoom: 1
  //           }

  // scene.add( camera );

  const rgbeLoader = new RGBELoader();

  // updateEnvTexture();


  // let cameraData = sceneData.cameraData;


  //should set stencil true only when it's used i.e. after first material set to stencil
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
  // renderer.shadowMap.enabled = true;
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(container.clientWidth, container.clientHeight);
  cssRenderer.domElement.style.position = 'absolute';
  cssRenderer.domElement.style.top = '0px';
  cssRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(cssRenderer.domElement);

  // renderer.outputEncoding = THREE.sRGBEncoding;
  // renderer.outputColorSpace = THREE.SRGBColorSpace;
  // renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // renderer.toneMappingExposure = 0.5; // Adjust exposure as needed

  // const dlight = new THREE.DirectionalLight(0xffffff, 1);    
  // scene.add(dlight);

  // const alight = new THREE.AmbientLight(0xffffff, 1);
  // scene.add(alight);

  // Get the sliders by their IDs
  const lightIntensitySlider = document.getElementById('light_intensity');
  const lightIntValue = document.getElementById('light_intensity_span');

  // Event listener to change the intensity of the ambient light
  lightIntensitySlider.addEventListener('input', function () {
    if (selectedObj && selectedObj.isLight) {
      selectedObj.intensity = parseFloat(lightIntensitySlider.value);
      // setLightIntensity(alight, lightIntensitySlider.value);
      lightIntValue.textContent = lightIntensitySlider.value;
      selectedObjData.lightSettings.intensity = lightIntensitySlider.value;
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });


  function setAnimTriggerSourceValue(composedKey) {
    // animTriggerSource is a <select>; ensure a matching option exists, then select it
    let opt = Array.from(animTriggerSource.options).find(o => o.value === composedKey);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = composedKey;
      opt.textContent = composedKey;
      animTriggerSource.appendChild(opt);
    }
    animTriggerSource.value = composedKey;
    animTriggerSource.dispatchEvent(new Event('change')); // reuses the single existing listener
  }

  function updateHandTriggerFieldVisibility() {
    const metric = handTriggerMetric.value;
    const isSingleLandmark = metric === 'landmark';
    const isPair = metric === 'distance' || metric === 'distancePx';

    handTriggerLandmarkSingle.style.display = isSingleLandmark ? 'flex' : 'none';
    handTriggerLandmarkAxis.style.display = isSingleLandmark ? 'flex' : 'none';
    handTriggerLandmarkPair.style.display = isPair ? 'block' : 'none';

    const defaults = METRIC_DEFAULTS[metric];
    handTriggerPixelNote.style.display = defaults?.pixelSpace ? 'block' : 'none';
  }

  function composeHandTriggerKey() {
    const hand = handTriggerHand.value;
    const metric = handTriggerMetric.value;

    switch (metric) {
      case 'landmark':
        return `hand.${hand}.landmark.${handTriggerLandmarkA.value}.${handTriggerAxis.value}`;
      case 'distance':
        return `hand.${hand}.distance.${handTriggerLandmarkPairA.value}-${handTriggerLandmarkPairB.value}`;
      case 'distancePx':
        return `hand.${hand}.distancePx.${handTriggerLandmarkPairA.value}-${handTriggerLandmarkPairB.value}`;
      default: // pinchDistance, pinchDistancePx, rotation, rotationThumbIndex
        return `hand.${hand}.${metric}`;
    }
  }

  function applyHandTriggerDefaults() {
    const defaults = METRIC_DEFAULTS[handTriggerMetric.value];
    if (!defaults) return;
    animTriggerMinInput.value = defaults.min;
    animTriggerMaxInput.value = defaults.max;
  }

  function commitHandTriggerSelection() {
    applyHandTriggerDefaults();
    setAnimTriggerSourceValue(composeHandTriggerKey());
  }

  [handTriggerHand, handTriggerMetric, handTriggerLandmarkA, handTriggerAxis,
    handTriggerLandmarkPairA, handTriggerLandmarkPairB].forEach(el => {
      el.addEventListener('change', () => {
        updateHandTriggerFieldVisibility();
        commitHandTriggerSelection();
      });
    });

  // Min/Max are their own persisted fields, not part of animTriggerSource — separate listeners,
  // same pattern as the existing animTriggerInvert/animTriggerDamping listeners
  animTriggerMinInput.addEventListener('change', () => {
    if (selectedObjData) {
      selectedObjData.animTriggerMin = parseFloat(animTriggerMinInput.value);
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });

  animTriggerMaxInput.addEventListener('change', () => {
    if (selectedObjData) {
      selectedObjData.animTriggerMax = parseFloat(animTriggerMaxInput.value);
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });

  triggerSourceType.addEventListener('change', () => {
    const isHand = triggerSourceType.value === 'hand';
    mouseTriggerInputs.style.display = isHand ? 'none' : 'flex';
    handTriggerInputs.style.display = isHand ? 'block' : 'none';

    if (isHand) {
      updateHandTriggerFieldVisibility();
      commitHandTriggerSelection(); // writes an initial valid value immediately on switch
    } else {
      setAnimTriggerSourceValue(animTriggerSource.options[0]?.value ?? 'mouseX');
    }
  });


  function setLightIntensity(light, intensity) {
    light.intensity = parseFloat(intensity);
  }


  exportSceneBtn.addEventListener('mousedown', copySceneDataToClipboard);

  importSceneBtn.addEventListener('mousedown', function () {
    initFromJson(JSON.parse(importSceneText.value));
  });


  const materialOpacitySlider = document.getElementById('material_opacity');
  const materialOpacityValue = document.getElementById('material_opacity_span');

  // Event listener to change the intensity of the ambient light
  materialOpacitySlider.addEventListener('input', function () {
    const opacityFloat = parseFloat(materialOpacitySlider.value);
    selectedObjData.setMaterialProperties(selectedMaterial.name, { opacity: opacityFloat });
    materialOpacityValue.textContent = opacityFloat;
    selectedMaterial.transparent = true;
    selectedMaterial.opacity = opacityFloat;
    updateModelData(selectedObjData);
    updateSaveField();
  });



  const shadowIntensitySlider = document.getElementById('shadow_intensity');
  const shadowIntensityValue = document.getElementById('shadow_intensity_span');
  shadowIntensitySlider.addEventListener('input', function () {
    if (selectedObj && selectedObj.isLight) {
      selectedObj.shadow.intensity = parseFloat(shadowIntensitySlider.value);
      shadowIntensityValue.textContent = shadowIntensitySlider.value;
      selectedObjData.lightSettings.shadowIntensity = shadowIntensitySlider.value;
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });

  const shadowRadiusSlider = document.getElementById('shadow_radius');
  const shadowRadiusValue = document.getElementById('shadow_radius_span');
  shadowRadiusSlider.addEventListener('input', function () {
    if (selectedObj && selectedObj.isLight) {
      selectedObj.shadow.radius = parseFloat(shadowRadiusSlider.value);
      shadowRadiusValue.textContent = shadowRadiusSlider.value;
      selectedObjData.lightSettings.shadowRadius = shadowRadiusSlider.value;
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });

  //potential helper function for inputs
  // e.g. valueSliderInput(shadowRadiusSlider, shadowRadiusValue, selectedObjData.lightSettings.shadowRadius, (selectedObj && selectedObj.isLight))
  function valueSliderInput(slider, valueDisplay, objectProperty, condition) {
    if (condition) {
      selectedObj.shadow.radius = parseFloat(slider.value);
      valueDisplay.textContent = slider.value;
      //this part harder
      objectProperty = slider.value;
      updateModelData(selectedObjData);
      updateSaveField();
    }
  }



  let controls, groupControls;
  let gizmoVisible = true;
  let lightHelpersVisbile = true;




  let selectedObj, selectedObjData, selectedMaterial; //override model
  // let allModels = [];
  let model, loopGroup;


  // Load 3D Model
  // const loader = new THREE.GLTFLoader();
  const loader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();


  let loopable;
  // let spacing = 1.1;
  let spacing = sceneData.itemSpacing;
  let fullLoopGroup = new THREE.Group();
  let objGroup = new THREE.Group();
  let orbitActive = false;
  // 6. Add Helpers for Visualization (NEW ADDITION)
  // Axes Helper: Red = X, Green = Y, Blue = Z
  const axesHelper = new THREE.AxesHelper(5); // Size 5 units
  scene.add(axesHelper);

  // Grid Helper: Grid on XZ plane
  const gridHelper = new THREE.GridHelper(10, 10); // 10x10 units, 10 divisions
  scene.add(gridHelper);

  // Directional Light Helper (already there, just ensuring its log is here for context)
  // const lightHelper = new THREE.DirectionalLightHelper(dlight, 2); // Helper size 2
  // scene.add(lightHelper);

  axesHelper.visible = false;
  gridHelper.visible = false;
  //  lightHelper.visible = false;
  // Load Environment Map (HDR)

  const lightIntensityInput = document.getElementById('lightIntensity');

  const useEnvLightInput = document.getElementById('useEnvLight');


  const breakPoint = document.getElementById('breakPoint');



  applyGlobalSettings();
  function applyGlobalSettings() {
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

    arEnabled = sceneData.arEnabled || false;

    if (sceneData.isOrthoCamera) {
      camera = orthoCamera;
    }
    else {
      camera = perspectiveCamera;
    }

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enabled = false;
    orbitControls.addEventListener('change', () => {
      // Only synchronize if we are currently using the perspective camera
      if (camera === perspectiveCamera) {
        syncCameras(perspectiveCamera, orthoCamera);
      }
      else {
        syncCameras(orthoCamera, perspectiveCamera);
      }
    });
    loadCameraFromSceneData();

    // dlight.position.set(sceneData.lightPosX, sceneData.lightPosY, sceneData.lightPosZ);
    // dlight.intensity = sceneData.directionalLightIntensity;

    // alight.intensity = sceneData.ambientLightIntensity;

    // setLightIntensity(alight, sceneData.ambientLightIntensity);
    // updateDLightPos(); //uses sceneData object values
    updateUiToFromData();
  }

  function updateUiToFromData() {
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
    breakPoint.value = sceneData.breakPoint;
    arEnabledInput.checked = arEnabled;
  }

  function updateDataFromUi() {
    isSaving = true;
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
    sceneData.breakPoint = parseFloat(breakPoint.value);
    updateSaveField();
  }


  controls = new TransformControls(camera, renderer.domElement);
  controls.renderOrder = 33;
  scene.add(controls);
  controls.visible = gizmoVisible;

  const toggleControlsButton = document.getElementById('toggleControls');
  let isControlsVisible = true;
  toggleControlsButton.addEventListener('click', () => {
    isControlsVisible = !isControlsVisible;


    toggleVisibility('.rightControls');
    toggleVisibility('.leftControls');
    toggleVisibility('.topTransforms');

    // controls.visible = isControlsVisible;
    groupControls.visible = isControlsVisible;
    // axesHelper.visible = isControlsVisible;
    // gridHelper.visible = isControlsVisible;
    // lightHelper.visible = isControlsVisible;

    lightHelpersVisbile = !lightHelpersVisbile;
    switchLightHelpers(isControlsVisible);
    toggleLightHelpers.classList.toggle('transButtonActive');
    // showLightHelpers.checked = isControlsVisible;

    if (isControlsVisible) {
      if (loopActive) {
        // controls.visible = false;
        groupControls.visible = true;
      }
      else {
        // controls.visible = true;
        groupControls.visible = false;
      }
    }

  });

  function toggleHelpers() {
    axesHelper.visible = !axesHelper.visible;
    gridHelper.visible = !gridHelper.visible;
  }

  setupDemoModal();

  let isMobileView = false;
  const toggleMobileButton = document.getElementById('mobileMode');
  breakPoint.oninput = () => {
    sceneData.breakpoint = parseFloat(breakPoint.value);
    updateMobileOutlineWidth();
  };

  const mobileOutline = document.getElementById('mobileOutline');
  updateMobileOutlineWidth();
  toggleMobileButton.addEventListener('click', toggleMobile);
  function toggleMobile() {
    isMobileView = !isMobileView;
    //change transforms on screen to match current mode
    if (isMobileView) {
      mobileOutline.style.display = 'block';
    }
    else {
      mobileOutline.style.display = 'none';
    }
    applyAllTransformsFromConfigs();
  }

  function updateMobileOutlineWidth() {
    mobileOutline.style.width = sceneData.breakpoint + 'px';
  }

  function applyAllTransformsFromConfigs() {
    allThreeJsObj.forEach(function (obj) {
      let currentConfig = isMobileView ? obj.userData.modelConfigRefMob : obj.userData.modelConfigRef;

      if (currentConfig == undefined) {
        //create a new empty one
        console.log('no userdata found for this view');
      }
      applyTransformFromConfig(obj, currentConfig);
    });
    updateTransforms();
  }

  function applyTransformFromConfig(object, config) {
    object.position.copy(config.position);
    object.rotation.copy(config.rotation);
    object.scale.copy(config.scale);
  }


  const toggleGizmoButton = document.getElementById('toggleGizmo');
  toggleGizmoButton.addEventListener('click', () => {
    if (!orbitControls.enabled) {
      gizmoVisible = !gizmoVisible;
      setGizmoVisible(gizmoVisible);
      toggleGizmoButton.classList.toggle('transButtonActive');
    }
  });

  const toggleLightHelpers = document.getElementById('toggleLights');
  toggleLightHelpers.addEventListener('click', () => {
    if (!orbitControls.enabled) {
      lightHelpersVisbile = !lightHelpersVisbile;
      switchLightHelpers(lightHelpersVisbile);
      toggleLightHelpers.classList.toggle('transButtonActive');
    }
  });

  function setGizmoVisible(visible) {
    gizmoVisible = visible;
    controls.visible = gizmoVisible;
    controls.enabled = gizmoVisible;
    if (!visible) {
      document.querySelectorAll('.transModeButton').forEach(button => {
        button.classList.remove('transButtonActive');
      });
    }
  }

  function toggleVisibility(selector) {
    document.querySelector(selector).style.display = isControlsVisible ? 'flex' : 'none';
  }

  const loopGroupScaleInput = document.getElementById('loopGroupScale');
  loopGroupScaleInput.oninput = () => {
    sceneData.loopGroupScale = parseFloat(loopGroupScaleInput.value) || 1.0;
    fullLoopGroup.scale.set(loopGroupScaleInput.value, loopGroupScaleInput.value, loopGroupScaleInput.value);
  };



  // useEnvLightInput.oninput = () => {

  //     useEnvLight = useEnvLightInput.checked;
  //     updateEnvTexture();

  // };

  function updateEnvTexture() {
    if (useEnvLight) {
      loadEnvTexture('sunset.hdr');
      // loadEnvTexture('night.hdr');
    }
    else {
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
    refreshMouseAnimationLink();
  };

  function refreshMouseAnimationLink() {
    mouseAnimationLink = mouseAnimationLinkInput.checked;
    if (!mouseAnimationLink) {
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

  function resetObjRotation() {

  }

  scrollAnimationLinkInput.oninput = () => {
    scrollAnimationLink = scrollAnimationLinkInput.checked;
    //reset camera back to initial position
    if (!scrollAnimationLink) {
      // camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
      // loadCameraFromSceneData();
      rotateGroup.position.x = 0;
      rotateGroup.position.y = 0;
      rotateGroup.position.z = 0;
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



  const css3dWidthInput = document.getElementById('css3d_width');
  const css3dHeightInput = document.getElementById('css3d_height');
  const css3dShortcodeInput = document.getElementById('css3d_shortcode');
  const css3dDimensionsFieldset = document.getElementById('css3d_dimensions_fieldset');

  function debounce(func, timeout = 500) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  const renderShortcodeAjax = debounce((shortcodeStr, obj) => {
    jQuery.ajax({
      url: localisedData.ajax_url,
      type: 'POST',
      data: {
        action: 'c33d_render_shortcode',
        nonce: localisedData.ajax_nonce,
        shortcode: shortcodeStr
      },
      success: function (response) {
        if (response.success) {
          obj.userData.modelConfigRef.shortcodeHtml = response.data.html;
          updateCss3dDimensions(obj);
          transformObjectToSceneData(obj);
        }
      }
    });
  }, 500);

  if (css3dWidthInput && css3dHeightInput) {
    css3dWidthInput.oninput = () => {
      if (selectedObj && selectedObj.userData.modelConfigRef && selectedObj.userData.modelConfigRef.type === 'css3d') {
        selectedObjData.width = parseFloat(css3dWidthInput.value) || 1;
        updateCss3dDimensions(selectedObj);
        transformObjectToSceneData(selectedObj);
      }
    };
    css3dHeightInput.oninput = () => {
      if (selectedObj && selectedObj.userData.modelConfigRef && selectedObj.userData.modelConfigRef.type === 'css3d') {
        selectedObjData.height = parseFloat(css3dHeightInput.value) || 1;
        updateCss3dDimensions(selectedObj);
        transformObjectToSceneData(selectedObj);
      }
    };
    if (css3dShortcodeInput) {
      css3dShortcodeInput.oninput = () => {
        if (selectedObj && selectedObj.userData.modelConfigRef && selectedObj.userData.modelConfigRef.type === 'css3d') {
          selectedObjData.shortcodeStr = css3dShortcodeInput.value;
          updateCss3dDimensions(selectedObj);
          transformObjectToSceneData(selectedObj);

          if (css3dShortcodeInput.value.trim().length > 0) {
            renderShortcodeAjax(css3dShortcodeInput.value, selectedObj);
          } else {
            selectedObjData.shortcodeHtml = '';
            updateCss3dDimensions(selectedObj);
            transformObjectToSceneData(selectedObj);
          }
        }
      };
    }
  }

  function updateCss3dDimensions(obj) {
    const objData = obj.userData.modelConfigRef;
    if (!objData) return;
    const width = objData.width || 300;
    const height = objData.height || 200;

    let cssObject = null;
    obj.children.forEach(child => {
      if (child.isCSS3DObject) cssObject = child;
    });

    if (cssObject && cssObject.element) {
      cssObject.element.style.width = width + 'px';
      cssObject.element.style.height = height + 'px';
      if (objData.shortcodeHtml || objData.shortcodeStr) {
        cssObject.element.innerHTML = objData.shortcodeHtml || objData.shortcodeStr;
        cssObject.element.style.backgroundColor = 'transparent';
      } else {
        cssObject.element.innerHTML = '<h2 style="color:white;text-align:center;padding-top:20px;margin:0;">Basic Div</h2>';
        cssObject.element.style.backgroundColor = 'rgba(0,127,255,0.8)';
      }
    }

    if (obj.geometry) {
      obj.geometry.dispose();
      obj.geometry = new THREE.PlaneGeometry(width * 0.01, height * 0.01);
    }
  }

  const scaleInputX = document.getElementById('codes_scale_x');
  const scaleInputY = document.getElementById('codes_scale_y');
  const scaleInputZ = document.getElementById('codes_scale_z');
  scaleInputX.oninput = () => {
    selectedObjData.scale.setScalar(parseFloat(scaleInputX.value));
    transformObjectToSceneData(selectedObj);
    if (sceneData.loopActive) {
      refreshLoop();
    }
    else {

    }
  };

  scaleInputY.oninput = () => {
    selectedObjData.scale.setScalar(parseFloat(scaleInputY.value));
    transformObjectToSceneData(selectedObj);
    if (sceneData.loopActive) {
      refreshLoop();
    }
    else {

    }
  };

  scaleInputZ.oninput = () => {
    selectedObjData.scale.setScalar(parseFloat(scaleInputZ.value));
    transformObjectToSceneData(selectedObj);
    if (sceneData.loopActive) {
      refreshLoop();
    }
    else {

    }
  };



  loopActiveInput.oninput = () => {
    loopActive = loopActiveInput.checked;

    toggleLoop();
  };

  function toggleLoop() {
    sceneData.loopActive = loopActive;
    if (loopActive) {
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
    else {
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

  arEnabledInput.oninput = async () => {
    arEnabled = arEnabledInput.checked;
    sceneData.arEnabled = arEnabled; // persisted global setting, same shape as isOrthoCamera
    updateSaveField();

    if (arEnabled && !handInputProvider) {
      handInputProvider = new HandInputProvider();
      try {
        await handInputProvider.start(gestureEngineUrl, { debug: false, previewPosition: 'bottom-left' });
        refreshActiveHandChannels(); // picks up any trigger sources already saved on objects
      } catch (err) {
        console.error('Failed to start hand tracking:', err);
        arEnabled = false;
        arEnabledInput.checked = false;
        sceneData.arEnabled = false;
        handInputProvider = null;
      }
    } else if (!arEnabled && handInputProvider) {
      handInputProvider.dispose();
      handInputProvider = null;
    }
  };

  function toggleCamera() {
    scene.remove(camera);
    if (sceneData.isOrthoCamera) {
      camera = orthoCamera;

    } else {
      camera = perspectiveCamera;
    }
    controls.camera = camera;
    orbitControls.camera = camera;
    orbitControls.object = camera;

    onWindowResize();

    orbitControls.update();

    // camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    // loadCameraFromSceneData();
    scene.add(camera);

    renderer.render(scene, camera);
  }

  // showLightHelpers.oninput = () => {
  //     switchLightHelpers(showLightHelpers.checked);
  // };

  function syncCameras(sourceCamera, targetCamera) {
    // Copy the position
    targetCamera.position.copy(sourceCamera.position);

    // Copy the rotation (or lookAt vector)
    targetCamera.rotation.copy(sourceCamera.rotation);

    targetCamera.lookAt(orbitControls.target);
  }




  function init() {
    fullLoopGroup.add(objGroup);
    fullLoopGroup.scale.set(sceneData.loopGroupScale, sceneData.loopGroupScale, sceneData.loopGroupScale);
    // scene.add(objGroup);
    scene.add(fullLoopGroup);

    // loadEnvTexture('https://ileana.kaurib.com/wp-content/uploads/2025/11/sunset.hdr');
    // loadEnvTexture('sunset.hdr');
    // loadEnvTexture('studio.hdr');

    groupControls = new TransformControls(camera, renderer.domElement);
    // groupControls.attach(objGroup);
    groupControls.attach(fullLoopGroup);
    groupControls.setSpace('local');  // Ensure local space is used


    // if(sceneData.modelUrl != "")
    //check if any models exist
    if (allModels.length != 0) {
      loadAllModels();
      refreshActiveHandChannels();
      // loadModel(sceneData.allModels[0].modelUrl, sceneData.allModels[0], true);
      //loop all models and run loadModel
      // loadModel(sceneData.modelUrl, sceneData, true);
    }
    else {
      //when intiate new scene, show the open popup
      isInitialLoad = false;

      showIntroPopup();
    }
    // applyGlobalSettings();

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
    animate();



    console.groupEnd();

  }

  function addDefaultLights() {
    createObject('lightD')
      .then(dlight => {
        dlight.position.set(1.66, 1.66, 0);
        // You can now use dlight here, as it's guaranteed to be created
      })
      .catch(error => {
        console.error("Failed to create light object:", error);
      });
    createObject('lightA');
  }

  function showIntroPopup() {
    popup.style.display = 'flex';
    popupOpen = true;
  }

  function hideIntroPopup() {
    popup.style.display = 'none';
    popupOpen = false;
  }

  function loadEnvTexture(url) {
    // rgbeLoader.load('../wp-content/plugins/codesthree/sunset.hdr', function (texture)
    // rgbeLoader.load('https://ileana.kaurib.com/wp-content/uploads/2025/11/sunset.hdr', function (texture)
    // rgbeLoader.load(url, function (texture)
    rgbeLoader.load('../wp-content/plugins/codesthree/' + url, function (texture) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      // scene.background = texture;
    });
  }

  function loadAllModels() {
    allModels.forEach(function (model, index) {
      createObject(model.type, model, false, index);
      // loadModel(model.modelUrl, model, false, index);
    });
    updateParentList();
  }

  function initFromJson(importJson) {
    isFullSceneInit = true;
    deleteAllObjects();
    // allSceneData = JSON.parse(importString);
    // const importedSceneData = JSON.parse(importJson.scene_data);
    // const importedSceneData = importJson.scene_data;
    // const importedSceneData = importJson;
    allSceneData = importJson; // Reassign the entire root object
    sceneData = allSceneData.globalSettings;
    allModels = allSceneData.models[0];
    checkModelEmptyUrls();
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
    isFullSceneInit = false;
    refreshActiveHandChannels();
    renderDirectBindings();
  }

  function checkModelEmptyUrls(allModels) {

  }

  function deleteAllObjects() {

    // Use forEach for a clean, direct iteration
    [...allThreeJsObj].forEach(objectToDelete => {
      // This loops over a copy of the array.
      deleteObject(objectToDelete);
    });

    // Optionally, clear the array after all objects have been deleted
    // allThreeJsObj.length = 0; 

  }

  function loadAllMobileData() {
    allMobileModels.forEach(function (model, index) {
      if (model != null) addMobDataToConfigRef(model, index);
    });
  }

  function addMobDataToConfigRef(data, index) {
    //find related object 
    // const modelId = allThreeJsObj.findIndex(m => m.modelId === data.modelId);
    // const threeJsObject = selectObjectFromList(data.modelId);
    const threeJsObject = allThreeJsObj[index];
    // if(threeJsObject.userData.modelConfigRefMob != undefined)
    // {
    if (threeJsObject) threeJsObject.userData.modelConfigRefMob = ModelConfig.fromPlainObject(data);
    // }
    // else
    // {
    //   
    // }


    if (allMobileModels[index] == undefined) {
      allMobileModels[index] = data;
    }
  }

  function duplicateObject(sceneObj) {
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

    const type = sceneObj.userData.type;

    //only needs callback if needs to wait for loading e.g. texture, model
    if (type != 'model' && type != "imageplane") {
      createObject(objData.type, objData);
      postDuplicateUpdates(objData, objDataMob);
    }
    else {
      createObject(objData.type, objData, function () {
        postDuplicateUpdates(objData, objDataMob);
      });
    }
  }

  function postDuplicateUpdates(objData, objDataMob) {
    addMobDataToConfigRef(objDataMob, allThreeJsObj.length - 1);
    // if(objData.parentUuid != -1 || objData.parentUuid != undefined)
    if (objData.parentUuid != -1) {
      const newParent = getThreeJsObjectByUuid(objData.parentUuid);
      // moveObjectToGroup(selectedObj, newParent);
      // duplicateObjectInGroup(selectedObj, newParent);
      moveToGroupKeepLocalPosition(selectedObj, newParent);
      updateModelData(modelConfigInstance);
    }
  }

  function cloneSelected() {
    duplicateObject(selectedObj);
  }

  function randomAllLightIntensities() {
    // Loop through every object in your array
    allThreeJsObj.forEach(threeJsObject => {

      // Check if the object is a type of light that has an 'intensity' property.
      // The property 'isLight' is a standard feature in most Three.js light classes (e.g., PointLight, DirectionalLight).
      if (threeJsObject.isLight) {

        // Get a new random intensity value
        const newIntensity = Math.random() * (3 - 0) + 0;

        // Apply the new intensity
        threeJsObject.intensity = newIntensity;
      }
    });
  }

  function loadModel(url, objData, callback, index) {

    // if(allThreeJsObj.length == 0 && !type.startsWith('light'))
    // if(allThreeJsObj.length == 0 && !isFullSceneInit)
    // {
    //   addDefaultLights();
    // }
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        gltf.scene.userData.type = 'model';
        addObject(gltf.scene, objData, callback, index, { modelUrl: url });
        // const newThreeJsObject = gltf.scene;
        // let modelConfigInstance, modelConfigInstanceMob; // This will be our ModelConfig class instance

        // let modelList = allModels;
        // if(isMobile)
        // {
        //   modelList = allMobileModels;
        // }

        // --- Determine if this is a new model or an existing one being loaded/reloaded ---
        resolve(gltf.scene);
      },
        undefined,
        (error) => {
          // console.error(`Failed to load model from ${url}:`, error);
          reject(error);
        });
    });
  }

  function addImageAsPlane(imageUrl, objData, callback, index) {
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
              transparent: true,
            });
            //   const material = new THREE.MeshBasicMaterial({
            //     map: texture,
            //     side: THREE.DoubleSide, 
            //     transparent: true 
            // });

            // Step 6: Create the Mesh
            const planeMesh = new THREE.Mesh(geometry, material);

            // Resolve the Promise with the created mesh
            planeMesh.userData.type = 'imageplane';
            resolve(planeMesh);
            addObject(planeMesh, objData, callback, index, { planeUrl: imageUrl });
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

  //All default geo and material for basic shapes
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White color
    side: THREE.DoubleSide // Render both sides of the plane
  });

  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const sphereGeo = new THREE.SphereGeometry(1, 32, 16);
  const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

  async function createObject(type, objData, callback, index) {
    let newThreeJsObject;


    if (type == 'group') {
      //add to scene, add to sceneData
      newThreeJsObject = new THREE.Group();
      allGroups.push(newThreeJsObject);
    }
    else if (type == 'imageplane') {
      addImageAsPlane(objData.planeUrl, objData, callback, index).then(plane => {
        plane.userData.type = type;
      })
    }
    else if (type == 'plane') {
      newThreeJsObject = new THREE.Mesh(planeGeo, planeMaterial);
    }
    else if (type == 'cube') {
      newThreeJsObject = new THREE.Mesh(cubeGeo, cubeMaterial);
    }
    else if (type == 'sphere') {
      newThreeJsObject = new THREE.Mesh(sphereGeo, sphereMaterial);
    }
    else if (type == 'css3d') {
      const width = objData ? (objData.width || 300) : 300;
      const height = objData ? (objData.height || 200) : 200;

      // CSS3D Div setup
      const div = document.createElement('div');
      div.style.width = width + 'px';
      div.style.height = height + 'px';
      div.style.pointerEvents = 'none'; // Fix Gizmo interaction issues

      if (objData && (objData.shortcodeHtml || objData.shortcodeStr)) {
        div.innerHTML = objData.shortcodeHtml || objData.shortcodeStr;
        div.style.backgroundColor = 'transparent';
      } else {
        div.innerHTML = '<h2 style="color:white;text-align:center;padding-top:20px;margin:0;">Basic Div</h2>';
        div.style.backgroundColor = 'rgba(0,127,255,0.8)';
      }

      const cssObject = new CSS3DObject(div);
      cssObject.position.set(0, 0, 0);
      cssObject.scale.set(0.01, 0.01, 0.01);

      // Transparent WebGL Mesh for hitting/TransformControls
      const geometry = new THREE.PlaneGeometry(width * 0.01, height * 0.01);
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0,
        transparent: true,
        side: THREE.DoubleSide
      });

      newThreeJsObject = new THREE.Mesh(geometry, material);
      newThreeJsObject.add(cssObject);
    }
    else if (type == 'model') {
      loadModel(objData.modelUrl, objData, callback, index);
    }
    else if (type.startsWith('light')) //e.g. lightA lightD lightP
    {
      newThreeJsObject = createLight(objData, type.slice(-1));
    }
    else {
      console.log('Type not defined/handled');
    }

    //these call add after resources loaded
    if (type != 'model' && type != undefined && type != "imageplane") {
      newThreeJsObject.userData.type = type;
      addObject(newThreeJsObject, objData, false, index);
    }
    else {

    }
    return newThreeJsObject;
  }

  function createLight(objData, lightType, callback) {
    let newLight, newHelper;
    let intensity = 1;
    let shadowIntensity = 1;
    let shadowRadius = 1;
    let color = 0xffffff;
    if (objData) {
      intensity = objData.lightSettings.intensity;
      color = objData.lightSettings.color;
      shadowIntensity = objData.lightSettings.shadowIntensity;
      shadowRadius = objData.lightSettings.shadowRadius;
    }
    if (lightType == 'A')
    // if(lightType == 'ambient')
    {
      newLight = new THREE.AmbientLight(color, intensity);
      newHelper = new THREE.PointLightHelper(newLight, 0.5);
    }
    else if (lightType == 'D')
    // else if(lightType == 'directional')
    {
      newLight = new THREE.DirectionalLight(color, intensity);
      newHelper = new THREE.DirectionalLightHelper(newLight, 0.5);
    }
    else if (lightType == 'S')
    // else if(lightType == 'spotlight')
    {
      newLight = new THREE.SpotLight(color, intensity);
      newHelper = new THREE.SpotLightHelper(newLight);
      // newLight.map = new THREE.TextureLoader().load( 'http://localhost/wpLocalEdge/wp-content/uploads/2025/09/alien-paper.jpg' );

    }
    else if (lightType == 'P')
    // else if(lightType == 'pointlight')
    {
      newLight = new THREE.PointLight(color, intensity);
      newLight.angle = 0.2;
      newLight.penumbra = 0.5;
      newHelper = new THREE.PointLightHelper(newLight, 0.5);
    }

    if (lightType != 'A') {
      newLight.shadow.intensity = shadowIntensity;
      newLight.shadow.radius = shadowRadius;
    }

    newLight.helper = newHelper;
    // newLight.add(newHelper);
    scene.add(newHelper);
    allLightHelpers.push(newHelper);
    lastLight = newLight;
    return newLight;
  }

  //add to scene and scenedata
  //applies objData if exists
  // function addObject(newThreeJsObject, objData, callback, index, url)
  function addObject(newThreeJsObject, objData, callback, index, urlList) {
    // let newThreeJsObject;
    let modelConfigInstance, modelConfigInstanceMob; // This will be our ModelConfig class instance

    // let isModel = url != undefined;

    let isModel;
    let isPlaneImage;

    if (urlList != undefined) {
      isModel = urlList.modelUrl != undefined;
      isPlaneImage = urlList.planeUrl != undefined;
    }
    // userData.type!!!!!!!!!!!!!!!!
    if (objData) {
      // Scenario 2: Loading/Reloading an Existing Model
      // We're creating a ModelConfig instance from the plain data we loaded.
      modelConfigInstance = ModelConfig.fromPlainObject(objData);
      if (isModel) modelConfigInstance.modelUrl = urlList.modelUrl; // Ensure the URL is up-to-date in the instance
      if (isPlaneImage) modelConfigInstance.modelUrl = urlList.planeUrl; // Ensure the URL is up-to-date in the instance

      // Before adding the new object, remove the old THREE.Object3D instance if it exists.
      // const oldThreeJsObject = allThreeJsObj.find(obj => obj.userData.modelConfigRef.modelId === modelConfigInstance.modelId);
      // if (oldThreeJsObject) {
      //     scene.remove(oldThreeJsObject);
      //     // Remove from our active tracking array
      //     allThreeJsObj = allThreeJsObj.filter(obj => obj.userData.modelId !== modelConfigInstance.modelId);
      //     
      // }

      // Apply saved transforms to the new Three.js object
      newThreeJsObject.position.copy(modelConfigInstance.position);
      newThreeJsObject.rotation.copy(modelConfigInstance.rotation);
      newThreeJsObject.scale.copy(modelConfigInstance.scale);

      newThreeJsObject.castShadow = objData.castShadow;
      if (newThreeJsObject.children && newThreeJsObject.children.length > 0) {
        applyShadowProperties(newThreeJsObject, 'castShadow', objData.castShadow);
      }

      newThreeJsObject.receiveShadow = objData.receiveShadow;
      if (newThreeJsObject.children && newThreeJsObject.children.length > 0) {
        applyShadowProperties(newThreeJsObject, 'receiveShadow', objData.receiveShadow);
      }

      if (objData.castShadow || objData.receiveShadow) {
        checkShadowsEnabled();
      }
      // Find the corresponding plain object in sceneData.models and update it
      // This ensures sceneData.models is kept in sync with the current instance state
      // (e.g., if modelUrl changed).



      // if(!isInitialLoad)
      // {
      const existingModelIndex = allModels.findIndex(m => m.modelId === modelConfigInstance.modelId);
      if (existingModelIndex !== -1) {
        allModels[existingModelIndex] = modelConfigInstance.toPlainObject();
      } else {
        // This scenario suggests a logic error if objData was provided but not found.
        // For robustness, add it as new.
        console.warn(`ModelConfig with ID ${modelConfigInstance.modelId} not found in sceneData.models during update; adding as new.`);
        allModels.push(modelConfigInstance.toPlainObject());
      }
      // }



      if (modelConfigInstance.keyframe1) {


        // Quick sanity check: Are the rotation values massive? (Indicating radians saved as degrees)
        if (Math.abs(modelConfigInstance.keyframe1.rotation?.x) > 360) {
          console.warn("⚠️ WARNING: Keyframe 1 rotation X is abnormally large. Was it saved as radians by mistake?");
        }
      } else {
        console.warn("⚠️ Keyframe 1 is NULL or MISSING for this object.");
      }
    }
    else //no obj data provided i.e. new object
    {

      // Scenario 1: Loading a New Model (no existing config provided)
      // Create a completely new ModelConfig instance.

      // modelConfigInstance = new ModelConfig({ modelUrl: urlList.modelUrl, planeUrl:  urlList.planeUrl});
      // modelConfigInstanceMob = new ModelConfig({ modelUrl: urlList.modelUrl, planeUrl: urlList.planeUrl, isMobileConfig: true});

      if (isModel) {
        modelConfigInstance = new ModelConfig({ modelUrl: urlList.modelUrl });
        modelConfigInstanceMob = new ModelConfig({ modelUrl: urlList.modelUrl, isMobileConfig: true });
        modelConfigInstance.modelUrl = urlList.modelUrl;
        modelConfigInstanceMob.modelUrl = urlList.modelUrl;
      }
      else if (isPlaneImage) {
        modelConfigInstance = new ModelConfig({ planeUrl: urlList.planeUrl });
        modelConfigInstanceMob = new ModelConfig({ planeUrl: urlList.planeUrl, isMobileConfig: true });
        modelConfigInstance.planeUrl = urlList.planeUrl;
        modelConfigInstanceMob.planeUrl = urlList.planeUrl;
      }
      else {
        modelConfigInstance = new ModelConfig({});
        modelConfigInstanceMob = new ModelConfig({ isMobileConfig: true });
      }

      let type = newThreeJsObject.userData.type;
      if (type == 'model') {

      }
      else if (type == 'group') {
        //to do, loop all current names to see if find duplicate, if so plus one and try again
        //allGroups.forEach - remove self from a copy of this list to check others;
        modelConfigInstance.modelName = newThreeJsObject.type + allGroups.length;
      }
      else if (type == 'imageplane') {
        // modelConfigInstance.modelName = 'Image' + allGroups.length;
      }
      else if (type.startsWith('light')) {
        modelConfigInstance.modelName = newThreeJsObject.type + allThreeJsObj.length;
        // if(type == 'lightD') newLight.position.set(1.66, 1.66, 1);
        if (type == 'lightD') modelConfigInstance.position.set(1.66, 1.66, 1);

      }
      else {
        modelConfigInstance.modelName = type + allThreeJsObj.length;
        // modelConfigInstance.modelName = newThreeJsObject.type + allThreeJsObj.length;
      }
      // Apply default (or initial UI) transforms to the new Three.js object.
      // The ModelConfig constructor already sets defaults for position, rotation, scale.

      newThreeJsObject.position.copy(modelConfigInstance.position);
      newThreeJsObject.rotation.copy(modelConfigInstance.rotation);
      newThreeJsObject.scale.copy(modelConfigInstance.scale);

      modelConfigInstance.type = type;
      if (modelConfigInstanceMob) modelConfigInstanceMob.type = type;
      // Add the plain object representation of this new model to sceneData.models for saving.
      allModels.push(modelConfigInstance.toPlainObject());
      allMobileModels[allModels.length - 1] = modelConfigInstanceMob.toPlainObject();
      // allMobileModels.push(modelConfigInstanceMob.toPlainObject());
    }


    modelConfigInstance.type = newThreeJsObject.userData.type;
    if (modelConfigInstanceMob) modelConfigInstanceMob.type = newThreeJsObject.userData.type;

    // --- Link the ModelConfig instance to the THREE.Object3D via userData ---
    // newThreeJsObject.userData.modelId = modelConfigInstance.modelId;
    newThreeJsObject.userData.modelConfigRef = modelConfigInstance; // Crucial for easy access

    newThreeJsObject.userData.modelConfigRefMob = modelConfigInstanceMob; // Crucial for easy access

    // Link the THREE.Object3D back to the ModelConfig instance (optional but useful)
    modelConfigInstance.threeJsObject = newThreeJsObject;
    // modelConfigInstanceMob.threeJsObject = newThreeJsObject;

    // Load any changed textures
    // if(newThreeJsObject.userData.type == 'model' && objData) modelConfigInstance.applyMaterialPropertiesToModel();
    if (objData && objData.materialProperties) {
      if (Object.keys(objData.materialProperties).length != 0) modelConfigInstance.applyMaterialPropertiesToModel();
    }

    // Add the new Three.js object to our active tracking array and the scene.
    selectedObj = newThreeJsObject;
    selectedObjData = modelConfigInstance;



    if (index == undefined) {
      allThreeJsObj.push(newThreeJsObject);
    }
    else {
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
    //performance issue (tried as last object for initial load but bugs if not the last)
    // renderMaterialList(getMaterialsFromObject(selectedObj));
    selectedMaterials = getMaterialsFromObject(selectedObj);
    populateMaterialSelector(selectedMaterials);
    if (selectedObj.isLight) updateLightUI(true);

    //when last model added (i.e. last in load all or adding a new one)
    if (allModels.length == allThreeJsObj.length) {
      updateParentList();
      updateSaveField(); //more for new objects
      refreshActiveHandChannels();
    }

    if (isInitialLoad) {
      //can add scene size via here, add whenever new model loaded
      itemsLoaded++;
      if (itemsLoaded == allModels.length) {
        isInitialLoad = false;
        loadAllMobileData();
        moveAllObjectsToGroups();
        updateObjectList();
        renderDirectBindings();

      }
    }
    else {
      updateObjectList();
    }

    if (callback) {
      callback();
    }

    if (allThreeJsObj.length == 0 && !isFullSceneInit) {
      // Check if the timer already exists. If it doesn't, set it.
      if (!defaultLightTimer) {
        // Set the timer and save the timer ID to the variable.
        defaultLightTimer = setTimeout(function () {
          addDefaultLights();

          // Clear the timer after it runs to ensure it's a one-time operation
          // and resets the variable so the check (!defaultLightTimer) works again later.
          clearTimeout(defaultLightTimer);
          defaultLightTimer = null;
        }, 1000); // Use a short delay (e.g., 10ms) or adjust as needed
      }
    }

    // scene.add(controls);
    // // Listen for changes in the TransformControls
    // controls.addEventListener('change', updateTransforms);
    // controls.addEventListener('mouseDown', transformDragStart);
    // controls.addEventListener('mouseUp', transformDragEnd);
    // // if()

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
  //aka updatetransforms
  function updateTransforms() {
    if (previewingAnimation) return; // never persist transforms while preview animation is driving them

    let pos = selectedObj.position;
    let rot = selectedObj.rotation;
    let scale = selectedObj.scale;

    // Update position fields
    posXInput.value = pos.x.toFixed(2);
    posYInput.value = pos.y.toFixed(2);
    posZInput.value = pos.z.toFixed(2);

    //why only in here?
    if (isTransforming) {
      // Update rotation fields (converted from radians to degrees)
      rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
      rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
      rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);
    }

    rotXInput.value = THREE.MathUtils.radToDeg(rot.x).toFixed(2);
    rotYInput.value = THREE.MathUtils.radToDeg(rot.y).toFixed(2);
    rotZInput.value = THREE.MathUtils.radToDeg(rot.z).toFixed(2);

    scaleInputX.value = round(scale.x, 2);
    scaleInputY.value = round(scale.y, 2);
    scaleInputZ.value = round(scale.z, 2);

    if (selectedObj.isLight) {
      selectedObj.helper.update();
    }

    let modelConfigInstance;
    if (isMobileView) {
      if (selectedObj.userData.modelConfigRefMob == null) {
        //create it
        const plainOriginalConfigData = selectedObj.userData.modelConfigRef.toPlainObject();
        const clonedModelConfig = ModelConfig.fromPlainObject(plainOriginalConfigData);
        selectedObj.userData.modelConfigRefMob = clonedModelConfig;
      }
      modelConfigInstance = selectedObj.userData.modelConfigRefMob;
    }
    else {
      modelConfigInstance = selectedObj.userData.modelConfigRef;
    }

    // === KEY FIX: write to the correct target depending on edit mode ===
    if (currentEditTarget === 'keyframe1') {
      if (!modelConfigInstance.keyframe1) modelConfigInstance.keyframe1 = {};
      modelConfigInstance.keyframe1.position = {
        x: selectedObj.position.x, y: selectedObj.position.y, z: selectedObj.position.z
      };
      modelConfigInstance.keyframe1.rotation = {
        x: THREE.MathUtils.radToDeg(selectedObj.rotation.x),
        y: THREE.MathUtils.radToDeg(selectedObj.rotation.y),
        z: THREE.MathUtils.radToDeg(selectedObj.rotation.z)
      };
      modelConfigInstance.keyframe1.scale = {
        x: selectedObj.scale.x, y: selectedObj.scale.y, z: selectedObj.scale.z
      };
    }
    else {
      modelConfigInstance.position.copy(selectedObj.position);
      modelConfigInstance.rotation.copy(selectedObj.rotation);
      modelConfigInstance.scale.copy(selectedObj.scale);

      modelConfigInstance.positionX = selectedObj.position.x;
      modelConfigInstance.positionY = selectedObj.position.y;
      modelConfigInstance.positionZ = selectedObj.position.z;

      modelConfigInstance.rotationX = THREE.MathUtils.radToDeg(selectedObj.rotation.x);
      modelConfigInstance.rotationY = THREE.MathUtils.radToDeg(selectedObj.rotation.y);
      modelConfigInstance.rotationZ = THREE.MathUtils.radToDeg(selectedObj.rotation.z);
    }

    // Scale isn't currently keyframed, so this stays unconditional
    // modelConfigInstance.scale.copy(selectedObj.scale);

    if (selectedObjData.link) linkInput.value = selectedObjData.link;

    updateModelData(modelConfigInstance);

    updateSaveField();
  };

  //updates the allModel list so changes are saved
  function updateModelData(modelConfigInstance) {
    let existingModelIndex;
    if (isMobileView) {
      existingModelIndex = allMobileModels.findIndex(m => m.modelId === modelConfigInstance.modelId);
      allMobileModels[existingModelIndex] = modelConfigInstance.toPlainObject();
    }
    else {
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
  function transformDragEnd() {
    isTransforming = false;
  }




  // Handle WordPress Media Library for Model URL
  const mediaButton = document.getElementById('threejs_model_url_button');
  // const popupMediaButton = document.getElementById('popup_media_button');
  // const popupMediaButton = document.getElementById('mediaLibraryBtn');
  const addModelButton = document.getElementById('add_model_button');
  const addImageButton = document.getElementById('add_image_button');
  const addPlaneButton = document.getElementById('add_plane_button');
  const addCubeButton = document.getElementById('add_cube_button');
  const addSphereButton = document.getElementById('add_sphere_button');
  const addGroupButton = document.getElementById('add_group_button');
  const deleteModelButton = document.getElementById('delete_model_button');
  const popup = document.getElementById('newScenePopup');
  const modelUrlField = document.getElementById('threejs_model_url');
  const preview = document.getElementById('threejs_model_url_preview');


  const closeModalBtn = document.getElementById('closeModalBtn');
  const mediaLibraryButtons = document.querySelectorAll('.c33d_media_library');

  const parentInput = document.getElementById('parentSelector');
  const currentGroupLabel = document.getElementById('current-group-label');
  const linkInput = document.getElementById('link_input');


  let popupOpen = false;
  let demoModelPopupOpen = false;
  //TODO: check whether it's replace selected url or add new model
  deleteModelButton.addEventListener('click', function () {
    deleteObject(selectedObj);
  });


  mediaLibraryButtons.forEach(button => {
    button.addEventListener('click', handleMediaButtonClick);
  });

  function handleMediaButtonClick(e) {
    if (popupOpen) {
      hideIntroPopup();
    }
    if (demoModelPopupOpen) {
      toggleMediaModal();
    }
    openMediaUploader(e);
  }

  function openMediaUploader(e) {
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

  addPlaneButton.addEventListener('click', function (e) {
    createObject('plane');
  });

  addCubeButton.addEventListener('click', function (e) {
    createObject('cube');
  });

  addSphereButton.addEventListener('click', function (e) {
    createObject('sphere');
  });

  const addCss3dButton = document.getElementById('add_css3d_button');
  if (addCss3dButton) {
    addCss3dButton.addEventListener('click', function (e) {
      createObject('css3d');
    });
  }

  closeModalBtn.addEventListener('click', toggleMediaModal);
  // mediaLibraryBtn.addEventListener('click', openMediaUploader);

  addGroupButton.addEventListener('click', function (e) {
    createObject('group');
  });

  const textureUploader = wp.media({
    title: 'Select an image for your material',
    button: { text: 'Set texture' },
    multiple: false,
    library: {
      type: 'image'
    }
  });

  linkInput.oninput = function () {
    selectedObjData.link = linkInput.value;
    updateModelData(selectedObjData);
    updateSaveField();
  }

  stencilSendInput.oninput = function () {
    setAsStencil(selectedMaterial, parseInt(this.value));
  }

  stencilReceiveInput.oninput = function () {
    // setAsReciever(selectedMaterial, parseInt(this.value), THREE.EqualStencilFunc);
    setAllMatAsReceiver(selectedObj, parseInt(this.value), getStencilFuncFromCheckbox());
  }

  stencilShowHide.onchange = function () {
    setAllMatAsReceiver(selectedObj, parseInt(stencilReceiveInput.value), getStencilFuncFromCheckbox());
  }

  function getStencilFuncFromCheckbox() {
    let stencilFunc;
    if (stencilShowHide.checked) {
      // If the checkbox is checked, set the function to Equal
      stencilFunc = THREE.EqualStencilFunc;
    } else {
      // If unchecked, set it to NotEqual
      stencilFunc = THREE.NotEqualStencilFunc;
    }
    return stencilFunc;
  }


  textureUploader.on('select', function () {
    const attachment = textureUploader.state().get('selection').first().toJSON();
    const imageUrl = attachment.url;


    if (selectedMaterial) {
      // Use the globally scoped 'selectedMaterial' variable

      textureLoader.load(imageUrl,
        (texture) => {
          texture.flipY = false;
          texture.colorSpace = THREE.SRGBColorSpace;

          let hasColor = false;

          if (Object.keys(selectedObjData.materialProperties).length != 0) hasColor = selectedObjData.materialProperties.find(m => m.materialName === selectedMaterial.name)?.color !== undefined;

          // Apply the texture to the correct material property based on which button was clicked
          if (editingTextureType === 'map') {
            selectedMaterial.map = texture;
            // Reset the color to white since a texture is now applied
            if (!hasColor) {
              selectedMaterial.color.setHex(0xffffff);
              materialColorPicker.value = '#ffffff';
              selectedObjData.setMaterialProperties(selectedMaterial.name, { color: 0xffffff });

            }

            selectedObjData.setMaterialProperties(selectedMaterial.name, { map: imageUrl });

          } else if (editingTextureType === 'emissiveMap') {
            selectedMaterial.emissiveMap = texture;
            // If set to black will not be visible
            // if(emissiveColorPicker.value = '#000000' && selectedObjData.materialProperties.emissive == undefined)
            if (emissiveColorPicker.value == '#000000') {
              selectedMaterial.emissive.setHex(0xFFFFFF);
              emissiveColorPicker.value = '#FFFFFF';
              selectedObjData.setMaterialProperties(selectedMaterial.name, { emissive: 0xffffff });
            }

            if (materialColorPicker.value == '#ffffff') {
              selectedMaterial.color.setHex(0x000000);
              materialColorPicker.value = '#000000';
              selectedObjData.setMaterialProperties(selectedMaterial.name, { color: 0x000000 });
            }
            selectedObjData.setMaterialProperties(selectedMaterial.name, { emissiveMap: imageUrl });

          }

          selectedMaterial.needsUpdate = true;

          // Applies to selected object
          // selectedObj.userData.modelConfigRef.setMaterialProperties(selectedMaterial.name, { textureUrl: imageUrl });
          // selectedObjData.setMaterialProperties(selectedMaterial.name, { textureUrl: imageUrl });
          updateModelData(selectedObjData);
          updateSaveField();

        },
        undefined, // Progress callback
        (error) => {
          console.error(`Error loading texture for material "${selectedMaterial.name}":`, error);
        }
      );
    } else {
      console.error('No material selected to apply the texture to.');
    }
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

  mediaUploader.on('select', function () {
    const attachment = mediaUploader.state().get('selection').first().toJSON();
    modelUrlField.value = attachment.url;
    sceneData.modelUrl = attachment.url;
    const fileMimeType = attachment.mime;
    if (fileMimeType.startsWith('image/')) {
      addImageAsPlane(attachment.url);
      // createObject('imageplane', {imageUrl: attachment.url});
    }
    else if (fileMimeType === 'model/glb-binary' || fileMimeType === 'model/gltf-binary' || fileMimeType === 'model/gltf+json' || fileMimeType === 'model/gltf') {
      // preview.innerHTML = `Current Model: <a href="${attachment.url}" target="_blank">${attachment.url}</a>`;
      if (scene.loopActive) {
        // loopDat(sceneData.modelUrl, 0.3, 40, 80, objGroup, [2, 0, 0]);
        sceneDataLoop();
      }
      else {
        // loadModel(attachment.url, false, isMobileView);
        loadModel(attachment.url);
      }
    }
    else {
      //TODO: handle non supported filetypes, show popup/keep media library open
    }



    if (popupOpen) {
      hideIntroPopup();
    }
    if (demoModelPopupOpen) {
      toggleMediaModal();
    }

  });

  function setupDemoModal() {
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
        if (!downloadInProgress) {
          downloadInProgress = true;
          button.querySelector('.c3-loading-icon').style.display = 'block';
          const assetName = event.currentTarget.dataset.assetName;
          const downloadType = event.currentTarget.dataset.downloadType;
          if (downloadType == 'scene') {
            await downloadInitFullScene(assetName, button);
          }
          else {
            await downloadOrAddAsset(assetName, downloadType, button);
          }
        }
      });
    });
  }

  //checks whether already downloaded
  async function downloadOrAddAsset(assetName, downloadType, button) {
    if (importedDemoAssets[assetName]) {
      // console.log(assetName + ' already downloaded, loading');

      try {
        const loadedObject = await loadModel(importedDemoAssets[assetName].attachment_url);
        if (popupOpen) {
          hideIntroPopup();
        }
        if (demoModelPopupOpen) {
          toggleMediaModal();
        }
        downloadInProgress = false;
        button.querySelector('.c3-loading-icon').style.display = 'none';
      } catch (error) {
        if (error.response.status == 404) {
          downloadModel(assetName, downloadType, button);
          console.log('downloaded asset url changed or deleted, redownloading...');
        }

      }
    }
    else {
      downloadModel(assetName, downloadType, button);
    }
  }

  async function downloadModel(assetName, downloadType, button) {
    try {
      // const downloadResult = await initiateAjaxDownload(fileUrl, demoObject, fileType, event.target);
      const downloadResult = await downloadAsset(assetName, downloadType);
      // alert(`"${assetName}" (${downloadType}) imported to Media Library successfully!`);
      if (downloadResult.asset.attachment_url) {
        loadModel(downloadResult.asset.attachment_url); // Call your model loader with the URL
        // importedDemoAssets[assetName] = 
        // {
        //     imported_at: new Date().toISOString(), // Record current time
        //     type: downloadType,
        //     attachment_id: downloadResult.attachment_id || null,
        //     attachment_url: downloadResult.attachment_url || null
        // };
        if (popupOpen) {
          hideIntroPopup();
        }
        if (demoModelPopupOpen) {
          toggleMediaModal();
        }
        downloadInProgress = false;
        button.querySelector('.c3-loading-icon').style.display = 'none';
        // console.log('loadModel() called with:', downloadResult.asset.attachment_url); // Specific log
      }
      else {
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

  // async function initiateAjaxDownload(fileUrl, demoId, fileType = '', buttonElement = null) {
  async function downloadAsset(assetName, downloadType) {
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

    // Pre-calculate the base 0-1 values to keep code clean
    // const rawMouseXNorm = (mouseX + 1) / 2;
    // const rawMouseYNorm = (mouseY + 1) / 2;


    // Calculate target rotation

    if (!orbitControls.enabled) {
      //Animation link
      if (mouseAnimationLink && !(isTransforming || keyXRot || keyYRot || keyZRot || isDragging || keyZTrans)) {
        targetRotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * mouseRotationX);
        targetRotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * mouseRotationY);
        targetRotation.z = THREE.MathUtils.degToRad(initialRotationZ + -mouseX * mouseRotationZ);
        // Smoothly interpolate to the target rotation
        // const easing = 0.1; // Adjust this value for speed (lower = slower)
        // const easing = 0.1 + (1 - 0.1) * 0.05; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

        // currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, easing);
        // currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, easing);
        // currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.z, easing);

        // rotateGroup.rotation.x = currentRotation.x;
        // rotateGroup.rotation.y = currentRotation.y;
        // rotateGroup.rotation.z = currentRotation.z;

        // // scene.rotation.x = currentRotation.x;
        // // scene.rotation.y = currentRotation.y;
        // // scene.rotation.z = currentRotation.z;

        // fullLoopGroup.rotation.x = currentRotation.x;
        // fullLoopGroup.rotation.y = currentRotation.y;
        // fullLoopGroup.rotation.z = currentRotation.z;
      }

      //ez drag function
      if (isDragging) {
        raycaster.setFromCamera(mouse, camera);

        // Project the new mouse position onto the plane
        const newIntersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, newIntersectPoint);

        // Compute the desired world position (apply offset in world space)
        const newWorldPosition = new THREE.Vector3(
          newIntersectPoint.x + offset.x,
          newIntersectPoint.y + offset.y,
          newIntersectPoint.z + offset.z
        );

        if (selectedObjData.link != null) {
          //set to pointer cursor, must reset if no intersects, check if = cursor reset

        }
        // selectedObj.getWorldPosition(new THREE.Vector3()).z // Keep current world Z
        // Convert world position to local position relative to selectedObj's parent
        const newLocalPosition = selectedObj.parent.worldToLocal(newWorldPosition.clone());


        // Apply new local position
        selectedObj.position.copy(newLocalPosition);

        // Update any necessary transforms
        updateTransforms();


      }


      if (lastLightFollow) {
        // light link to mouse
        const newX = mouse.x * (rangeX / 2);
        // 2. Map the mouse.y (-1 to 1) to the scene's Y range (Z-axis in scene space)
        // We use the scene's Z-axis to move the light forward/backward relative to the camera
        const newZ = mouse.y * (rangeY / 2);
        lastLight.position.x = newX;
        // lastLight.position.z = newZ + targetZ; 
        lastLight.position.y = newZ;
      }

    }
  };
  window.addEventListener('mousemove', onMouseMove);

  // Initialize currentRotation (important!)
  // currentRotation.copy(model.rotation); // Or set to initial values

  function refreshLoop() {
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
  function transformObjectToSceneData(object) {
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
  function updateLinkedObjData() {
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
  if (document.querySelector('#c33d-editor').closest('.edit-post-layout__metaboxes')) {
    scrollElement = document.querySelector('#c33d-editor').closest('.edit-post-layout__metaboxes');
  }
  else {
    // scrollElement = document.querySelector('html');
    scrollElement = window;
  }


  scrollElement.addEventListener('scroll', (event) => {
    if (scrollAnimationLink) {
      applyScrollTransforms(event);
    }
  });

  function applyScrollTransforms(event) {
    // Get the normalized scroll position (0 - 1)
    const scrollPos = -getCanvasOffset();
    // const scrollPos = getCanvasOffset();

    // Determine how much to move the camera based on scroll and position
    const scrollFactor = 0.1; // Adjust this value to change the sensitivity of the scroll

    // Calculate new camera position based on scroll distance
    // camera.position.x += scrollMoveX * scrollPos * scrollFactor;
    // camera.position.y += scrollMoveY * scrollPos * scrollFactor;
    // camera.position.z += scrollMoveZ * scrollPos * scrollFactor;
    // const savedCameraData = allSceneData.globalSettings.camera;
    // const savedCameraData = initialCamera;
    // camera.position.x = savedCameraData.position.x + scrollMoveX * scrollPos;
    // camera.position.y = savedCameraData.position.y + scrollMoveY * scrollPos;
    // console.log(savedCameraData.position.y, scrollPos, (savedCameraData.position.y + scrollMoveY * scrollPos));
    // camera.position.z = savedCameraData.position.z + scrollMoveZ * scrollPos;
    // Update the camera's position
    // camera.updateProjectionMatrix();

    rotateGroup.position.x = scrollMoveX * scrollPos;
    rotateGroup.position.y = scrollMoveY * scrollPos;
    rotateGroup.position.z = scrollMoveZ * scrollPos;



    // camera.position.x = cameraPos[0] + scrollMoveX * scrollPos;
    // camera.position.y = cameraPos[1] + scrollMoveY * scrollPos;
    // camera.position.z = cameraPos[2] + scrollMoveZ * scrollPos;



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

  function sceneDataLoop() {
    loopDat(sceneData.modelUrl, sceneData.scale, sceneData.loopCountY, sceneData.loopCountX, sceneData.loopCountZ, objGroup, [sceneData.itemSpacing, 0, 0]);
    transformObjectToSceneData(fullLoopGroup);
  }

  function loopDat(objectUrl, objScale, rowCount, columnCount, zCount, group, distances) {
    loader.load(objectUrl, function (gltf) {
      // deskObj
      loopable = gltf.scene;
      loopable.scale.set(objScale, objScale, objScale);
      zLoop(loopable, rowCount, columnCount, zCount, group, distances);
    });
  }

  function zLoop(object, rowCount, columnCount, zCount, group, distances) {
    for (let i = 0; i < zCount; i++) {
      let zPlane = new THREE.Group();
      let zAdjust = zCount / 2 - 0.5;

      zPlane.position.set(0, 0, i * sceneData.itemSpacing - zAdjust * sceneData.itemSpacing);
      group.add(zPlane);
      rowLoopGroup(loopable, rowCount, columnCount, zCount, zPlane, distances);


    }
  }

  function rowLoopGroup(object, rowCount, columnCount, zCount, group, distances) {
    for (let i = 0; i < rowCount; i++) {
      let row = new THREE.Group();
      let center = i - (0.5 * rowCount);
      let iPercent = i / rowCount;
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
      let yAdjust = rowCount / 2 - 0.5;
      row.position.set(0, i * sceneData.itemSpacing - yAdjust * sceneData.itemSpacing, 0);
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

  function loopCreate(loopObject, loopCount, distances, group) {
    //todo, dont loop inside a template
    // let addToDiv = activeDiv;
    // let loopCount = 20;
    let randomMax = 1;
    for (let i = 0; i < loopCount; i++) {
      let centerMath = i - (0.5 * loopCount);
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




  const easing = 0.15;
  // Render loop
  function animate() {

    if (previewAnimationToggle && previewAnimationToggle.checked) {
      if (!(isTransforming || keyXRot || keyYRot || keyZRot || isDragging || keyZTrans)) {

        // 1. Build one merged channel dict per frame: mouse channels + (if active) hand channels.
        //    mergeChannels/getMouseChannels come from input-providers.js; hand channels come
        //    from HandInputProvider.getChannels(), which is a no-op-safe {} when AR isn't active.
        const inputChannels = mergeChannels(
          getMouseChannels(mouse),
          handInputProvider ? handInputProvider.getChannels() : {}
        );

        // 2. Update the global UI Readout based on the dropdown
        if (animTriggerSource && currentInputValue) {
          let uiTarget = inputChannels[animTriggerSource.value] ?? 0;
          if (animTriggerInvert && animTriggerInvert.checked) uiTarget = 1 - uiTarget;
          currentInputValue.textContent = uiTarget.toFixed(2);
        }

        // 3. Loop through all objects and apply damped animation
        if (typeof allThreeJsObj !== 'undefined') {
          allThreeJsObj.forEach((child) => {
            const config = child.userData ? (isMobileView ? child.userData.modelConfigRefMob : child.userData.modelConfigRef) : null;

            if (config && config.keyframe1) {
              // Determine Target Alpha (where the input actually is)
              let targetAlpha = 0;
              const triggerSource = config.animTriggerSource || 'mouseX';
              const triggerInvert = config.animTriggerInvert || false;
              const damping = config.animDamping !== undefined ? config.animDamping : 1.0;

              const rawValue = inputChannels[triggerSource];
              if (rawValue !== undefined) {
                const min = config.animTriggerMin !== undefined ? config.animTriggerMin : 0;
                const max = config.animTriggerMax !== undefined ? config.animTriggerMax : 1;
                // Remap raw channel value onto a 0-1 alpha. For mouse channels min/max stay
                // 0/1 by default, so this is a no-op and preserves existing behavior exactly.
                targetAlpha = THREE.MathUtils.clamp(
                  THREE.MathUtils.inverseLerp(min, max, rawValue),
                  0, 1
                );
              }

              if (triggerInvert) targetAlpha = 1 - targetAlpha;

              if (child.userData.currentAnimAlpha === undefined) {
                child.userData.currentAnimAlpha = targetAlpha;
              }

              child.userData.currentAnimAlpha = THREE.MathUtils.lerp(child.userData.currentAnimAlpha, targetAlpha, damping);

              const currentAlpha = child.userData.currentAnimAlpha;

              // Interpolate Position
              child.position.x = THREE.MathUtils.lerp(config.positionX, config.keyframe1.position.x, currentAlpha);
              child.position.y = THREE.MathUtils.lerp(config.positionY, config.keyframe1.position.y, currentAlpha);
              child.position.z = THREE.MathUtils.lerp(config.positionZ, config.keyframe1.position.z, currentAlpha);


              // Interpolate Scale (falls back to current scale if this object has no
              // keyframe1.scale saved yet — old scenes keep constant scale as before)
              if (config.keyframe1.scale) {
                child.scale.x = THREE.MathUtils.lerp(config.scaleX, config.keyframe1.scale.x, currentAlpha);
                child.scale.y = THREE.MathUtils.lerp(config.scaleY, config.keyframe1.scale.y, currentAlpha);
                child.scale.z = THREE.MathUtils.lerp(config.scaleZ, config.keyframe1.scale.z, currentAlpha);
              }

              const lerpedRotX = THREE.MathUtils.lerp(config.rotationX, config.keyframe1.rotation.x, currentAlpha);
              const lerpedRotY = THREE.MathUtils.lerp(config.rotationY, config.keyframe1.rotation.y, currentAlpha);
              const lerpedRotZ = THREE.MathUtils.lerp(config.rotationZ, config.keyframe1.rotation.z, currentAlpha);

              child.rotation.set(
                THREE.MathUtils.degToRad(lerpedRotX),
                THREE.MathUtils.degToRad(lerpedRotY),
                THREE.MathUtils.degToRad(lerpedRotZ)
              );
            }
          });
        }
      }
    }

    applyDirectBindings();

    rotateGroup.rotation.x = THREE.MathUtils.lerp(rotateGroup.rotation.x, targetRotation.x, easing);
    rotateGroup.rotation.y = THREE.MathUtils.lerp(rotateGroup.rotation.y, targetRotation.y, easing);
    rotateGroup.rotation.z = THREE.MathUtils.lerp(rotateGroup.rotation.z, targetRotation.z, easing);

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
    requestAnimationFrame(animate);
    // if(orbitActive) orbit.update(); // Call controls.update() in the animation loop
  }
  // updateLabel();//show initial values


  function applyDirectBindings() {
    if (typeof allThreeJsObj === 'undefined' || allThreeJsObj.length === 0) return;

    // Build the merged channel dict once per frame — same as the keyframe block does,
    // just computed here too since this runs independently of the preview toggle.
    const inputChannels = mergeChannels(
      getMouseChannels(mouse),
      handInputProvider ? handInputProvider.getChannels() : {}
    );

    const writtenThisFrame = new Set(); // detects two bindings on the same object targeting the same property

    allThreeJsObj.forEach((child) => {
      const config = child.userData
        ? (isMobileView ? child.userData.modelConfigRefMob : child.userData.modelConfigRef)
        : null;
      if (!config || !Array.isArray(config.directBindings) || config.directBindings.length === 0) return;

      config.directBindings.forEach((binding) => {
        const rawValue = inputChannels[binding.channel];
        if (rawValue === undefined) return; // channel not currently available (e.g. hand out of frame) — hold last applied value, do nothing

        const inputMin = binding.inputMin ?? 0;
        const inputMax = binding.inputMax ?? 1;
        const outputMin = binding.outputMin ?? 0;
        const outputMax = binding.outputMax ?? 1;

        let alpha = THREE.MathUtils.clamp(
          THREE.MathUtils.inverseLerp(inputMin, inputMax, rawValue),
          0, 1
        );
        if (binding.invert) alpha = 1 - alpha;

        const targetValue = THREE.MathUtils.lerp(outputMin, outputMax, alpha);
        const damping = binding.damping ?? 1.0;

        const dedupeKey = `${config.modelId}:${binding.property}`;
        if (writtenThisFrame.has(dedupeKey)) {
          console.warn(`Multiple direct bindings target ${binding.property} on ${config.modelName} — last one wins.`);
        }
        writtenThisFrame.add(dedupeKey);

        applyBoundProperty(child, binding.property, targetValue, damping);
      });
    });
  }

  function applyBoundProperty(object3d, property, targetValue, damping) {
    if (property === 'scaleUniform') {
      const newScale = THREE.MathUtils.lerp(object3d.scale.x, targetValue, damping);
      object3d.scale.set(newScale, newScale, newScale);
      return;
    }

    const [group, axis] = [property.slice(0, -1), property.slice(-1).toLowerCase()];

    if (group === 'position' || group === 'scale') {
      object3d[group][axis] = THREE.MathUtils.lerp(object3d[group][axis], targetValue, damping);
    } else if (group === 'rotation') {
      const targetRad = THREE.MathUtils.degToRad(targetValue);
      object3d.rotation[axis] = THREE.MathUtils.lerp(object3d.rotation[axis], targetRad, damping);
    }
  }


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
        if (event.altKey) {
          togglePreviewKeyframeAnim();
          // mouseAnimationLinkInput.checked = !mouseAnimationLinkInput.checked;
          // refreshMouseAnimationLink();
        }
        if (event.shiftKey) {
          // openMediaUploader(event);
          toggleMediaModal();
        }
        else if (mediaModelOpen) {
          handleMediaButtonClick(event);
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
        if (event.altKey) {
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
        // createObject('lightP');
        // createObject('plane');
        // createObject('cube');
        setInterval(randomAllLightIntensities, 100);
        // createObject('imageplane', {planeUrl: "http://localhost/wpLocalEdge/wp-content/uploads/2025/07/lapimg.jpg"});
        break;
      case 'i':
        lastLightFollow = !lastLightFollow;
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
        if (event.ctrlKey) {
          event.preventDefault();
          saveButtonClicked();
          // wpPublishButton.click();
        }
        else {
          keyScale = true;
        }
        break;
      // dont allow scaling of group, must be set via single or input
      // groupControls.setMode('scale');
      case 'd': //duplicate
        if (event.ctrlKey) {
          event.preventDefault();
          cloneSelected();
        }

        if (mediaModelOpen) {
          createObject('lightD')
            .then(dlight => {
              dlight.position.set(1.66, 1.66, 1);
              toggleMediaModal();
              // You can now use dlight here, as it's guaranteed to be created
            });
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
      case 'c':
        if (event.altKey) {
          toggleOrbitControls();
        }
        break;
      case 'm':
        downloadInitFullScene('scene1', ['star', 'laptop']);
        // initiateSceneConfigImport('https://c33d.kaurib.com/scenes/scene1.json', 'scene1');  
        // initFromJson();
        break;
      case 'z':
        // selectedObj.material = recMAt;
        // selectedMaterial.stencilWrite = true;
        // selectedMaterial.stencilRef = 1;
        // selectedMaterial.stencilFunc = THREE.EqualStencilFunc;
        // selectedObj.renderOrder = 2;
        // console.log(selectedMaterial);
        // selectedMaterialial.stencilWrite = true;
        // selectedObj.material.stencilRef = 1;
        // selectedObj.material.stencilFunc = THREE.EqualStencilFunc;
        setAsReciever();
        break;
      case 'x':
        // selectedObj.material = recMAt;
        // setAsStencil();
        stencilFullMatReplace(selectedMaterial, 1);
        // selectedMaterial.colorWrite = false;
        // selectedMaterial.depthWrite = false;
        // selectedMaterial.stencilWrite = true;
        // selectedMaterial.stencilRef = 1;
        // selectedMaterial.stencilFunc = THREE.AlwaysStencilFunc;
        // selectedMaterial.stencilZPass = THREE.ReplaceStencilOp;
        // selectedObj.renderOrder = 1;
        // console.log(selectedMaterial);
        break;
      case 'v':
        // toggleHelpers();
        selectedMaterial.stencilWrite = true;
        selectedMaterial.stencilRef = 1;
        selectedMaterial.stencilFunc = THREE.NotEqualStencilFunc;
        break;
    }
  });

  function setAllMaterialsAsStencilReceiver(object, stencilRef) {

  }

  // traverseAndModifyMaterials(threeobject, setAsReceiver, stencilRef, stencilFunc);

  function traverseAndModifyMaterials(object, callback) {
    // The .traverse() method will visit the object itself and all its children.
    object.traverse(child => {
      // Check if the child has a material property and is a mesh.
      // It's important to check .isMesh to ensure it's a renderable object.
      if (child.isMesh) {
        // Check if the material is an array (for multi-material objects)
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => callback(mat, ...args));
        } else {
          // Or if it's a single material
          callback(child.material, ...args);
        }
      }
    });
  }


  function setAllMatAsReceiver(object, stencilRef, stencilFunc) {
    object.traverse((node) => {
      // We only want to modify materials, so we check if the node is a Mesh.
      if (node.isMesh) {
        // A mesh can have a single material or an array of materials.
        const materials = Array.isArray(node.material) ? node.material : [node.material];

        materials.forEach(material => {
          if (material) { // Ensure the material exists
            setAsReciever(material, stencilRef, stencilFunc);
          }
        });
      }
    });
    // if (object.material) {
    //   // If it's an array, loop through each material
    //   if (Array.isArray(object.material)) {
    //     object.material.forEach(mat => {
    //       setAsReciever(mat, stencilRef);
    //     });
    //   } else {
    //     // If it's a single material, apply properties directly
    //     setAsReciever(object.material, stencilRef);
    //   }
    // }
  }


  function setAsStencil(material, stencilRef) {
    // let stencilMat = new THREE.MeshPhongMaterial({ color: 'green' });
    // selectedObj.material = stencilMat;
    // selectedMaterial = selectedObj.material;
    material.colorWrite = false;
    material.depthWrite = false;
    material.stencilWrite = true;
    // selectedMaterial.stencilRef = 1;
    material.stencilRef = stencilRef;
    material.stencilFunc = THREE.AlwaysStencilFunc;
    material.stencilZPass = THREE.ReplaceStencilOp;

    selectedObjData.setMaterialProperties(material.name, { colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: stencilRef, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
    selectedObjData.renderOrder = 1;
    selectedObj.renderOrder = 1;

    // material.transparent = false;

    updateModelData(selectedObjData);
    updateSaveField();
    // console.log(material.name, material.type);
    // console.log(selectedObj);
    // console.log(material);

    return material;
  }

  // function setAsReciever(object)
  function setAsReciever(material, stencilRef, stencilFunc) {
    material.stencilWrite = true;
    material.stencilRef = stencilRef;
    material.stencilFunc = stencilFunc;
    // material.stencilFunc = THREE.EqualStencilFunc;
    material.transparent = true;
    material.colorWrite = true;
    material.depthWrite = true;
    // material.stencilZPass = THREE.ReplaceStencilOp;
    // selectedMaterial.stencilFunc = THREE.EqualStencilFunc;
    selectedObjData.setMaterialProperties(material.name, { stencilWrite: true, stencilRef: stencilRef, stencilFunc: stencilFunc, transparent: true, colorWrite: true, depthWrite: true });

    selectedObjData.renderOrder = 2;
    selectedObj.renderOrder = 2;


    // material.depthWrite = false;

    // console.log(material.name, material.type);
    // console.log(selectedObj);
    // console.log(material);

    updateModelData(selectedObjData);
    updateSaveField();
  }

  function stencilFullMatReplace(material, stencilRef) {
    let stencilMat = new THREE.MeshPhongMaterial({ color: 'green' });
    stencilMat.colorWrite = false;
    stencilMat.depthWrite = false;
    stencilMat.stencilWrite = true;
    stencilMat.stencilRef = stencilRef;
    stencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    stencilMat.stencilZPass = THREE.ReplaceStencilOp;
    selectedObj.material = stencilMat;
    selectedMaterial = stencilMat;
    // selectedObjData.setMaterialProperties(material.name, {colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: stencilRef, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp} );
    // selectedObjData.renderOrder = 1;    
    selectedObj.renderOrder = 1;
    console.log(material.type);
  }


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

  function saveButtonClicked() {
    console.log("🚨 --- INITIATING SAVE SEQUENCE --- 🚨");

    if (previewAnimationToggle && previewAnimationToggle.checked) {
      console.log("⚠️ Preview was active. Forcing OFF to snap to base...");
      previewAnimationToggle.checked = false;
      if (typeof togglePreviewKeyframeAnim === 'function') {
        togglePreviewKeyframeAnim();
      }
    }

    // 1. Force a final save of the currently selected object just in case
    console.log("💾 Forcing final save of currently selected object...");
    saveCurrentState();

    // 2. DIAGNOSTIC LOOP: Let's check exactly what is about to be sent to WordPress
    console.log("📦 VERIFYING ALL OBJECT DATA BEFORE WP SUBMIT:");
    if (typeof allThreeJsObj !== 'undefined') {
      allThreeJsObj.forEach((child, index) => {
        const config = child.userData ? (isMobileView ? child.userData.modelConfigRefMob : child.userData.modelConfigRef) : null;
        if (config) {
          console.log(`Object ${index} (${config.modelId}):`, {
            hasKeyframe: !!config.keyframe1,
            animTrigger: config.animTriggerSource,
            kfData: config.keyframe1 ? {
              posX: config.keyframe1.position.x.toFixed(2),
              rotX: config.keyframe1.rotation.x.toFixed(2) // Should be DEGREES
            } : 'NULL'
          });
        }
      });
    }

    isSaving = true;
    saveButton.style.opacity = '0.5';
    saveButton.innerText = 'Saving...';
    wpPublishButton.click();
  }

  function stepScale(amount) {
    const scaleSensitivity = 0.5;

    let scaleFactor = 1 + (amount * scaleSensitivity);

    selectedObj.scale.x *= scaleFactor;
    selectedObj.scale.y *= scaleFactor;
    selectedObj.scale.z *= scaleFactor;
  }


  const scrollRotAmount = THREE.MathUtils.degToRad(10);
  document.addEventListener('wheel', function (e) {

    if (orbitControls.enabled) return;

    if (scrollAnimationLink) return;

    if (keyXRot || keyYRot || keyZRot || keyZTrans || keyScale) {
      e.preventDefault();
    }

    if (selectedObj != undefined) {
      let currentWorldPosition = new THREE.Vector3();
      selectedObj.getWorldPosition(currentWorldPosition);
      // const targetWorldPosition = currentWorldPosition.clone();
      const direction = e.deltaY > 0 ? 1 : -1;

      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      // 2. Scale the direction vector by the desired speed and scroll direction
      const moveVector = cameraDirection.multiplyScalar(-direction * scrollMultiplier * 0.5);

      // 3. Get the selected object's current world position
      const targetWorldPosition = new THREE.Vector3();
      selectedObj.getWorldPosition(targetWorldPosition);

      // 4. Add the movement vector to the world position
      targetWorldPosition.add(moveVector);

      if (keyZTrans) {
        if (selectedObjData.parentUuid != -1) {
          // targetWorldPosition.z -= scrollMultiplier * 0.5;
          selectedObj.parent.worldToLocal(targetWorldPosition);
          selectedObj.position.copy(targetWorldPosition);
        }
        else {
          // If there's no parent or the parent is the scene, the object's position is already in world coordinates.
          // selectedObj.position.z -= scrollMultiplier * 0.5;
          selectedObj.position.copy(targetWorldPosition);
          // selectedObj.position.z = targetWorldPosition.z; // Directly set the world Z
        }
      }


      if (e.wheelDelta > 0) //scroll up, away,
      {
        if (keyXRot) selectedObj.rotateX(scrollMultiplier * -scrollRotAmount);
        if (keyYRot) selectedObj.rotateY(scrollMultiplier * -scrollRotAmount);
        if (keyZRot) selectedObj.rotateZ(scrollMultiplier * -scrollRotAmount);
        // if(keyXRot) selectedObj.rotation.x -= scrollRotAmount;
        // if(keyYRot) selectedObj.rotation.y -= scrollRotAmount;
        // if(keyZRot) selectedObj.rotation.z -= scrollRotAmount;
        if (keyScale) stepScale(scrollMultiplier * -0.1);
        // scrollDirection = 'Scroll Up';
        // transformObjectToSceneData(selectedObj);
        updateTransforms();
      }
      else {

        if (keyXRot) selectedObj.rotateX(scrollMultiplier * scrollRotAmount);
        if (keyYRot) selectedObj.rotateY(scrollMultiplier * scrollRotAmount);
        if (keyZRot) selectedObj.rotateZ(scrollMultiplier * scrollRotAmount);
        if (keyScale) stepScale(scrollMultiplier * 0.1);
        // scrollDirection = 'Scroll Down';
        // transformObjectToSceneData(selectedObj);
        updateTransforms();
      }

      //refactor
      // set modifier based on wheel data > 0 then multiply the transform
    }
  }, { passive: false });

  function setTransformMode(mode, e, clickedButton) {
    if (e) e.preventDefault();
    if (orbitControls.enabled) return;
    controls.setMode(mode);
    // groupControls.setMode(mode);
    setGizmoVisible(true);
    if (mode != 'scale') {
      // groupControls.setMode(mode);
    }
    else {
    }

    document.querySelectorAll('.transModeButton').forEach(button => {
      button.classList.remove('transButtonActive');
    });

    let buttonToUpdate;
    if (clickedButton) {
      buttonToUpdate = clickedButton;
    }
    else {
      if (mode == 'translate') {
        buttonToUpdate = translateModeButton;
      }
      else if (mode == 'rotate') {
        buttonToUpdate = rotateModeButton;
      }
      else if (mode == 'scale') {
        buttonToUpdate = scaleModeButton;
      }
    }
    buttonToUpdate.classList.add('transButtonActive');

  }
  window.setTransformMode = setTransformMode;

  // Handle window resizing
  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {
    // 1. Get new dimensions from the container element
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    // 2. Check the camera type and apply the appropriate update logic
    if (camera instanceof THREE.PerspectiveCamera) {
      // PERSPECTIVE CAMERA: Only needs the aspect ratio updated.
      camera.aspect = aspect;
    } else if (camera instanceof THREE.OrthographicCamera) {
      // ORTHOGRAPHIC CAMERA (Isocamera): Updates the frustum planes (left, right, top, bottom)
      // using the container's pixel dimensions divided by the isoZoom factor.
      camera.left = width / -isoZoom;
      camera.right = width / isoZoom;
      camera.top = height / isoZoom;
      camera.bottom = height / -isoZoom;
    }

    // 3. The projection matrix MUST be updated after changing any camera parameters
    camera.updateProjectionMatrix();

    // 4. Update renderer size
    renderer.setSize(width, height);
  }

  container.onmousedown = function (e) {
    sceneOnMouseDown(e);
    mouseDown = true;
  }

  container.onmouseup = function (e) {
    isDragging = false;
    mouseDown = false;
  }


  function sceneOnMouseDown(event) {
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
    // const intersects = raycaster.intersectObjects(allThreeJsObj, true); // `true` for recursive (checks children)

    // Combine your selectable models and light helpers for intersection testing
    const selectableObjects = [...allThreeJsObj, ...allLightHelpers];
    const intersects = raycaster.intersectObjects(selectableObjects, true); // true for recursive

    // Check if TransformControls is active/dragging. If so, don't re-select.
    // This is important to prevent accidental re-selection when trying to drag an object.
    if (controls.dragging) {
      return;
    }

    if (intersects.length > 0) {
      // Check if TransformControls is active/dragging. If so, don't re-select. 
      if (controls.dragging) {
        return;
      }

      // controls.enabled = true;
      // controls.visible = true;
      isDragging = true;

      if (previewingAnimation) togglePreviewKeyframeAnim();

      let selectableObject = null;
      let selectedIntersection = null;

      // Iterate through all intersections to find the first selectable object.
      for (let i = 0; i < intersects.length; i++) {
        let intersectedSubObject = intersects[i].object;
        let currentObject = intersectedSubObject;

        // Traverse up the parent chain to find the top-level object or helper
        while (currentObject) {

          // 1. **Check for Light Helper:**
          if (allLightHelpers.includes(currentObject)) {

            // If light helpers are CHECKED, select the light and break the loop.
            // if (showLightHelpers.checked) {
            if (lightHelpersVisbile) {
              selectableObject = currentObject.light;
              selectedIntersection = intersects[i];
            }
            // If light helpers are NOT checked, we IGNORE this intersection 
            // and break the INNER (while) loop to check the next object in the intersects array.
            break;
          }

          // 2. **Check for Model/Group:**
          if (allThreeJsObj.includes(currentObject)) {
            selectableObject = currentObject;
            selectedIntersection = intersects[i];
            break;
          }

          // Move up the scene graph
          currentObject = currentObject.parent;
        }

        // If we found a selectable object (light OR model), stop searching
        if (selectableObject) {
          break;
        }
      }

      // Process the selected object
      if (selectableObject) {

        // Use the position of the selected object for the plane
        plane.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(plane.normal), // Plane perpendicular to camera's view
          selectableObject.position
        );

        // Your selection/editing function
        selectModelForEditing(selectableObject);
      }


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

  function selectModelForEditing(obj) {
    if (selectedObj != obj) {

      //start keyframe

      // --- Save current keyframe state to the outgoing object before switching ---
      if (selectedObj) {
        saveCurrentState();
      }

      selectedObj = obj;
      selectedObjData = isMobileView
        ? selectedObj.userData.modelConfigRefMob
        : selectedObj.userData.modelConfigRef;

      // DO NOT reset currentEditTarget! Keep whatever state we are currently in.
      // But ensure the UI text matches the current state
      if (currentEditTarget === 'base') {
        editBaseState.textContent = 'Editing';
        editKeyframe1.textContent = 'Edit';
      } else {
        editBaseState.textContent = 'Edit';
        editKeyframe1.textContent = 'Editing';
      }

      // Uncheck preview if switching objects so it doesn't immediately warp
      if (previewAnimationToggle && previewAnimationToggle.checked) {
        previewAnimationToggle.checked = false;
        editBaseState.disabled = false;
        editKeyframe1.disabled = false;
        if (typeof resetKeyframe1 !== 'undefined') resetKeyframe1.disabled = false;

        // Snap everything back to the current edit mode
        snapAllObjectsToState(currentEditTarget);
      }

      // Sync UI
      if (selectedObjData) {
        if (selectedObjData.animTriggerSource) animTriggerSource.value = selectedObjData.animTriggerSource;
        if (typeof animTriggerInvert !== 'undefined') animTriggerInvert.checked = !!selectedObjData.animTriggerInvert;
        if (typeof animTriggerDamping !== 'undefined') animTriggerDamping.value = selectedObjData.animDamping !== undefined ? selectedObjData.animDamping : 1.0;

        animTriggerMinInput.value = selectedObjData.animTriggerMin ?? 0;
        animTriggerMaxInput.value = selectedObjData.animTriggerMax ?? 1;

        const isHandSource = selectedObjData.animTriggerSource?.startsWith('hand.');
        if (isHandSource) reversePopulateHandTriggerFields(selectedObjData.animTriggerSource);
        triggerSourceType.value = isHandSource ? 'hand' : 'mouse';
        mouseTriggerInputs.style.display = isHandSource ? 'none' : 'flex';
        handTriggerInputs.style.display = isHandSource ? 'block' : 'none';
        // Note: this does NOT reverse-populate the hand/metric/landmark sub-dropdowns from the
        // saved string — see caveat below.
        renderDirectBindings();
      }

      // Ensure object visually snaps to the active mode (and initializes Keyframe 1 if you are in that mode but it's a new object)
      loadSavedState(currentEditTarget);

      //end keyframe


      controls.attach(selectedObj);
      controls.visible = gizmoVisible;
      controls.enabled = gizmoVisible;

      if (selectedObj.userData.modelConfigRef.type == "model" ||
        selectedObj.userData.modelConfigRef.type == "imageplane" ||
        selectedObj.userData.modelConfigRef.type == "plane" ||
        selectedObj.userData.modelConfigRef.type == "cube" ||
        selectedObj.userData.modelConfigRef.type == "sphere") {
        // renderMaterialList(getMaterialsFromObject(selectedObj));
        selectedMaterials = getMaterialsFromObject(selectedObj);
        switchMaterialPanel(true);
        populateMaterialSelector(selectedMaterials);
      }
      else //light, group
      {
        switchMaterialPanel(false);
        // materialListDiv.innerHTML = 'None'; 
      }

      updateShadowUI();

      updateLightUI(selectedObj.isLight);

      if (selectedObj.userData.modelConfigRef.type == "css3d") {
        if (css3dDimensionsFieldset) {
          css3dDimensionsFieldset.style.display = 'block';
          if (css3dWidthInput) css3dWidthInput.value = selectedObj.userData.modelConfigRef.width || 300;
          if (css3dHeightInput) css3dHeightInput.value = selectedObj.userData.modelConfigRef.height || 200;
          if (css3dShortcodeInput) css3dShortcodeInput.value = selectedObj.userData.modelConfigRef.shortcodeStr || '';
        }
      } else {
        if (css3dDimensionsFieldset) css3dDimensionsFieldset.style.display = 'none';
      }

      highlightSelectedListItem(obj.uuid);
      updateParentList();
    }
  }

  function reversePopulateHandTriggerFields(source) {
    if (!source?.startsWith('hand.')) return;
    const parts = source.split('.');
    const hand = parts[1];
    handTriggerHand.value = hand;

    const distMatch = parseDistanceChannelKey(source);
    if (distMatch) {
      handTriggerMetric.value = distMatch.pixels ? 'distancePx' : 'distance';
      handTriggerLandmarkPairA.value = distMatch.landmarkA;
      handTriggerLandmarkPairB.value = distMatch.landmarkB;
    } else if (parts[2] === 'landmark') {
      handTriggerMetric.value = 'landmark';
      handTriggerLandmarkA.value = parts[3];
      handTriggerAxis.value = parts[4];
    } else {
      handTriggerMetric.value = parts[2]; // pinchDistance, pinchDistancePx, rotation, rotationThumbIndex
    }
    updateHandTriggerFieldVisibility();
  }

  function updateLightUI(lightSelected) {
    if (!lightSelected) {
      lightColor.value = '#000000';
      lightIntensitySlider.value = 0;
      lightIntValue.value = 0;
      selectedLightInputs.style.display = 'none';
      shadowIntensitySlider.value = 1;
      shadowIntensityValue.value = 1;
      shadowRadiusSlider.value = 1;
      shadowRadiusValue.value = 1;
    }
    else {
      lightColor.value = '#' + selectedObj.color.getHexString();
      lightIntensitySlider.value = selectedObj.intensity;
      lightIntValue.value = selectedObj.intensity;
      selectedLightInputs.style.display = 'block';
      shadowIntensitySlider.value = selectedObj.lightSettings?.shadowIntensity ?? 1;
      shadowIntensityValue.value = selectedObj.lightSettings?.shadowIntensity ?? 1;
      shadowRadiusSlider.value = selectedObj.lightSettings?.shadowRadius ?? 1;
      shadowRadiusValue.value = selectedObj.lightSettings?.shadowRadius ?? 1;
    }
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
      listItem.classList.add('object-list-item');
      listItem.draggable = true; // ✅ Make list item draggable

      let objDisplayName = obj.userData.modelConfigRef.modelName;

      const objectNameSpan = document.createElement('span');
      objectNameSpan.textContent = objDisplayName;
      objectNameSpan.classList.add('object-name-span');
      objectNameSpan.style.cursor = 'pointer';

      objectNameSpan.dataset.objectId = obj.uuid;
      listItem.dataset.modelId = obj.userData.modelConfigRef.modelId; // ✅ store stable modelId
      listItem.dataset.objectId = obj.uuid;

      // Eye button
      const eyeButton = document.createElement('button');
      eyeButton.classList.add('eye-button');
      eyeButton.textContent = obj.visible ? '👁️' : '🙈';
      eyeButton.style.background = 'none';
      eyeButton.style.border = 'none';
      eyeButton.style.color = obj.visible ? 'white' : 'gray';
      eyeButton.style.cursor = 'pointer';
      eyeButton.style.fontSize = '1.2em';
      eyeButton.dataset.modelId = obj.userData.modelConfigRef.modelId;

      // Append
      listItem.appendChild(objectNameSpan);
      listItem.appendChild(eyeButton);
      sceneObjectList.appendChild(listItem);

      // Selection
      objectNameSpan.addEventListener('click', () => {
        selectObjectFromList(obj.uuid);
      });

      // Toggle visibility
      eyeButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleObjectVisibility(obj.uuid, e.target);
      });

      // Prevent children from being draggable
      objectNameSpan.addEventListener("dragstart", (e) => e.preventDefault());
      eyeButton.addEventListener("dragstart", (e) => e.preventDefault());

      // === DRAG EVENTS ===
      listItem.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData("text/plain", obj.uuid);
      });

      listItem.addEventListener('dragover', (e) => {
        e.preventDefault(); // Needed to allow drop
      });

      listItem.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedUuid = e.dataTransfer.getData("text/plain");
        const targetUuid = obj.uuid;
        if (!draggedUuid || draggedUuid === targetUuid) return;

        // Get the actual Three.js objects
        const draggedObj = allThreeJsObj.find(o => o.uuid === draggedUuid);
        const targetObj = allThreeJsObj.find(o => o.uuid === targetUuid);

        if (targetObj && targetObj.isGroup && draggedObj) {
          // Move in 3D scene
          moveObjectToGroup(draggedObj, targetObj);

          // Get LI of dragged object
          const draggedElement = sceneObjectList.querySelector(`[data-object-id="${draggedUuid}"]`);

          // Also collect its children (all lis whose parentUuid == draggedObj.modelId)
          const draggedModelId = draggedObj.userData.modelConfigRef.modelId;
          const childElements = Array.from(sceneObjectList.querySelectorAll('li'))
            .filter(li => {
              const liModelId = li.dataset.modelId;
              const liObj = allThreeJsObj.find(o => o.userData.modelConfigRef.modelId === liModelId);
              return liObj?.userData?.modelConfigRef?.parentUuid === draggedModelId;
            });

          // Insert dragged LI after target LI
          listItem.insertAdjacentElement('afterend', draggedElement);
          draggedElement.style.paddingLeft = "20px";

          // Insert children immediately after dragged element, preserving hierarchy
          childElements.forEach(child => {
            draggedElement.insertAdjacentElement('afterend', child);
            child.style.paddingLeft = "40px";
          });

          // Update parentUuid reference
          draggedObj.userData.modelConfigRef.parentUuid = targetObj.userData.modelConfigRef.modelId;

        }
      });
    });

    updateGroupsInObjList();
  }


  function updateGroupsInObjList() {
    const items = Array.from(sceneObjectList.querySelectorAll('li'));

    items.forEach(item => {
      const modelId = item.dataset.modelId; // we'll store modelId instead of uuid
      const obj = allThreeJsObj.find(o => o.userData?.modelConfigRef?.modelId === modelId);
      if (!obj) return;

      const parentId = obj.userData?.modelConfigRef?.parentUuid;
      if (!parentId || parentId === -1) return; // no parent → skip

      const parentItem = sceneObjectList.querySelector(`li[data-model-id="${parentId}"]`);
      if (parentItem && parentItem !== item) {
        // ✅ Move child directly after its parent in the list
        parentItem.insertAdjacentElement("afterend", item);

        // ✅ Optional: indent children visually
        item.style.paddingLeft = "20px";
      }
    });
  }


  function refreshActiveHandChannels() {
    if (!handInputProvider) return;
    const keys = allThreeJsObj.flatMap(obj => {
      const config = isMobileView ? obj.userData.modelConfigRefMob : obj.userData.modelConfigRef;
      if (!config) return [];
      const triggerKeys = config.animTriggerSource ? [config.animTriggerSource] : [];
      const bindingKeys = (config.directBindings ?? []).map(b => b.channel);
      return [...triggerKeys, ...bindingKeys];
    });
    handInputProvider.setActiveDistanceChannels(keys);
  }

  function updateParentList() {
    parentInput.innerHTML = '';
    const currentOption = document.createElement('option');
    currentOption.value = -1;
    currentOption.textContent = "Select a group";
    parentInput.appendChild(currentOption);

    const mainScene = document.createElement('option');
    mainScene.value = -2;
    mainScene.textContent = "No Group";
    if (selectedObj) {
      if (selectedObj.userData.modelConfigRef.parentUuid != -1) {
        parentInput.appendChild(mainScene);
      }
      else {
        currentGroupLabel.innerHTML = 'No Group';
      }
      // Add each found group as an option in the dropdown
      allGroups.forEach((group, index) => {
        if (selectedObj.parent != group && selectedObj != group) {
          const option = document.createElement('option');
          // option.value = group.uuid;
          option.value = group.userData.modelConfigRef.modelId;
          option.textContent = group.userData.modelConfigRef.modelName;
          parentInput.appendChild(option);
        }

        if (selectedObj.parent == group) {
          currentGroupLabel.innerHTML = group.userData.modelConfigRef.modelName;
        }
      });
    }


  }

  // .onchange
  parentInput.addEventListener('change', () => {

    const groupUuid = parentInput.value;
    if (groupUuid == -1) return;
    let newParent;
    //back to top level scene
    if (groupUuid == -2) {
      newParent = scene.children[0];
      selectedObj.userData.modelConfigRef.parentUuid = -1;
    }
    else {
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

  function moveAllObjectsToGroups() {
    allThreeJsObj.forEach(function (model) {
      const parentModelId = model.userData.modelConfigRef.parentUuid;
      // if(modelIndex != -1 && modelIndex != undefined)
      if (parentModelId != -1) {
        moveToGroupKeepLocalPosition(model, getThreeJsObjectByUuid(parentModelId));
        // moveObjectToGroup(model, getThreeJsObjectByUuid(parentModelId));
        // duplicateObjectInGroup(model, getThreeJsObjectByUuid(parentModelId));
      }
    });
    updateTransforms();
  }

  function moveToGroupKeepLocalPosition(model, groupObject) {
    model.parent.remove(model);
    groupObject.add(model);
  }

  function moveObjectToGroup(model, groupObject) {
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



  function getThreeJsObjectByUuid(modelId) {
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
    // const selectedItem = sceneObjectList.querySelector(`[data-object-id="${uuid}"]`).parentNode;
    const selectedItem = sceneObjectList.querySelector(`[data-object-id="${uuid}"]`);
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

  function deleteObject(threeJsObject) {
    let objectToDelete = threeJsObject ? threeJsObject : selectedObj;
    let deleteObjData = threeJsObject ? threeJsObject.userData.modelConfigRef : selectedObjData;
    let threeJsObjectIndex = allThreeJsObj.indexOf(objectToDelete);
    const groupIndex = allGroups.indexOf(objectToDelete);
    if (groupIndex != -1) {
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
      if (deleteObjData.parentUuid != -1) {
        objectToDelete.parent.remove(objectToDelete);
      }
      else {
        if (deleteObjData.type == 'group') {
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
        else {
          if (deleteObjData.type.startsWith('light')) {
            // objectToDelete.helper.geometry.dispose();
            // objectToDelete.helper.material.dispose();


            const helperIndex = allLightHelpers.indexOf(objectToDelete.helper);
            if (helperIndex > -1) {
              allLightHelpers.splice(helperIndex, 1);
            }
            scene.remove(objectToDelete.helper);
            rotateGroup.remove(objectToDelete);

          }
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
    if (allThreeJsObj.length == 0) {
      controls.attach(rotateGroup);
      directBindingsList.innerHTML = '';
      showIntroPopup();
    }
    else {
      const lastObjectInList = allThreeJsObj[allThreeJsObj.length - 1];
      selectModelForEditing(lastObjectInList);
      updateObjectList();
      updateParentList();
    }
    refreshActiveHandChannels();
  }

  function switchLightHelpers(on) {
    for (const helper of allLightHelpers) {
      helper.visible = on;
    }
  }


  function updateSaveField() {
    // Enable this line to override mobile data with current .models, helpful if mobile data is corrupted
    // allSceneData.models[1] = allSceneData.models[0];
    saveCameraToSceneData();
    if (hiddenInputField) {
      // if(hiddenInputField.value) console.log('bb', JSON.parse(hiddenInputField.value).models[0][1].lightSettings);
      try {
        // Stringify the entire sceneData object
        hiddenInputField.value = JSON.stringify(allSceneData);
        // console.log('aa', JSON.parse(hiddenInputField.value).models[0][1].lightSettings);
      } catch (e) {
        console.error("Error stringifying sceneData:", e);
        // Optionally, clear the field or revert to a safe state if stringification fails
        hiddenInputField.value = '';
      }
    } else {
      console.warn("Hidden input field with ID 'threejs_scene_config_json' not found!");
    }
    // console.log(hiddenInputField.value);
  }

  const allTabs = document.querySelectorAll('.tab');
  const allTabsContent = document.querySelectorAll('.tabContent');
  let activeTab = 'object';
  tabClicked(activeTab);

  function tabClicked(tabName) {
    //show clicked, hide all rest
    hideAllTabs();
    activeTab = tabName;
    document.querySelector('.c' + tabName).style.display = 'flex';

    document.querySelector('.activeTab').classList.remove('activeTab');
    document.querySelector('#' + tabName + 'Tab').classList.add('activeTab');
  }

  function hideAllTabs() {
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
  shortcodeTextarea.addEventListener('mousedown', () => {
    copyShortcodeToClipboard();
  });

  function copyShortcodeToClipboard() {
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
  function copySceneDataToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(allSceneData));
    // navigator.clipboard.writeText("'"+JSON.stringify(allSceneData)+"'");

  }

  function toggleMediaModal() {
    mediaModelOpen = !mediaModelOpen;
    modelImportModal.classList.toggle('hidden-modal');
    demoModelPopupOpen = !modelImportModal.classList.contains('hidden-modal');
  }

  // async function initiateSceneConfigImport(sceneUrl, sceneId, buttonElement = null) {
  // async function downloadInitFullScene(sceneName, modelList) 
  async function downloadInitFullScene(sceneName, button) {

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
        // if (buttonElement) buttonElement.textContent = `Downloading ${requiredModels.length} Models...`;

        //check if downloaded, if yes, return the downloaded model, if no, wait till downloaded then run init
        const downloadPromises = modelsToProcess.map(modelName => {
          // downloadAsset(modelName, 'model')
          if (!importedDemoAssets[modelName]) {
            // downloadOrAddAsset(modelName, 'model')
            return downloadAsset(modelName, 'model');
          }
          else {
            // return downloadAsset(modelName, 'model');   //enable to test downloading no matter what                   
            return Promise.resolve({ modelName: modelName, asset: importedDemoAssets[modelName] });
          }
        }
        );
        downloadedModelResults = await Promise.all(downloadPromises);
        if (popupOpen) {
          hideIntroPopup();
        }
        if (demoModelPopupOpen) {
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

  function setSceneJsonModelUrls(sceneData, downloadedModelResults) {
    //get all models urls (will just set to basic asset name e.g. phone, laptop) 
    //    and update their url to the local version of them
    sceneData.models.forEach((deviceModels) => {
      deviceModels.forEach((model) => {
        const modelName = model.modelUrl;
        downloadedModelResults.forEach((downloadModel) => {
          if (downloadModel.modelName == modelName) {
            model.modelUrl = downloadModel.asset.attachment_url;
          }
        });
      });
    });
  }

  bgColorPicker.addEventListener('input', (event) => {
    const newColor = hexToThreeColor(event.target.value);
    scene.background = new THREE.Color(newColor);
    allSceneData.globalSettings.bgColor = newColor;
    updateSaveField();
  });

  noBackgroundToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
      scene.background = null;
      allSceneData.globalSettings.noBackground = true;
    }
    else {
      const newColor = hexToThreeColor(bgColorPicker.value);
      scene.background = new THREE.Color(newColor);
      allSceneData.globalSettings.bgColor = newColor;
    }
    updateSaveField();

  });

  function getMaterialsFromObject(object) {
    const materials = [];

    // Use a Set to ensure we only get unique material instances
    const uniqueMaterials = new Set();

    // The traverse method is the best way to iterate through an object and its children
    object.traverse((child) => {
      if (child.isMesh) {
        // Check if the child has a material property
        if (child.material) {
          // A mesh can have a single material or an array of materials
          if (Array.isArray(child.material)) {
            // If it's a MultiMaterial, add all of them
            child.material.forEach(mat => uniqueMaterials.add(mat));
          } else {
            // Otherwise, just add the single material
            uniqueMaterials.add(child.material);
          }
        }
      }
    });

    const materialsArray = Array.from(uniqueMaterials);

    // --- Commented lines for filtering materials by name ---
    // const nameStartsWith = 'c33d_'; // The string to filter by
    // const filteredMaterials = materialsArray.filter(mat => mat.name && mat.name.startsWith(nameStartsWith));
    // console.log(`Found ${filteredMaterials.length} filtered materials:`, filteredMaterials);
    // return filteredMaterials;

    // Log the JSON object of all materials found
    // const materialsJson = materialsArray.map(mat => {
    //     return {
    //         name: mat.name,
    //         uuid: mat.uuid,
    //         type: mat.type,
    //         color: mat.color ? `#${mat.color.getHexString()}` : 'N/A'
    //     };
    // });
    // console.log('JSON object of all materials:', JSON.stringify(materialsJson, null, 2));

    return materialsArray;
  }

  /**
   * Populates the material dropdown with a list of materials.
   * Auto-selects the first material and shows the properties panel.
   * @param {Array<Object>} materials The array of material objects to display.
   */
  function populateMaterialSelector(materials) {
    // Clear existing options
    materialSelector.innerHTML = '';

    if (materials.length > 0) {
      materials.forEach(mat => {
        const option = document.createElement('option');
        if (mat.name == "") mat.name = 'Unnamed';
        option.value = mat.name;
        option.textContent = mat.name;
        // if(mat.name == "") option.textContent = 'Unnamed';
        materialSelector.appendChild(option);
      });

      // Auto-select the first material
      selectMaterial(materials[0].name);
    } else {
      // propertiesPanel.classList.add('hidden');
      switchMaterialPanel(false);
      console.warn('No materials available to populate the selector.');
    }
  }

  //false turn off
  function switchMaterialPanel(on) {
    if (on) {
      propertiesPanel.classList.remove('hidden');
    }
    else {
      propertiesPanel.classList.add('hidden');
    }
  }

  /**
   * Selects a material by name, updates the UI, and the selectedMaterial object.
   * @param {string} materialName The name of the material to select.
   */
  function selectMaterial(materialName) {
    selectedMaterial = selectedMaterials.find(mat => mat.name === materialName);
    if (selectedMaterial) {
      // Update color pickers with the selected material's values
      const mainColorHex = selectedMaterial.color && selectedMaterial.color.getHexString
        ? selectedMaterial.color.getHexString()
        : 'ffffff'; // Fallback to white if color is not a THREE.Color object
      const emissiveColorHex = selectedMaterial.emissive && selectedMaterial.emissive.getHexString
        ? selectedMaterial.emissive.getHexString()
        : '000000'; // Fallback to black
      materialColorPicker.value = `#${mainColorHex}`;
      emissiveColorPicker.value = `#${emissiveColorHex}`;
      for (const key in blendModes) {
        if (blendModes[key] === selectedMaterial.blending) {
          // Found a match! Set the dropdown's value to the key (the string name)
          blendModeSelect.value = key;
          break; // Exit the loop once a match is found
        }
      }
      materialOpacitySlider.value = selectedMaterial.opacity;
      materialOpacityValue.textContent = selectedMaterial.opacity;

      if (selectedObj.renderOrder == 1) //stencil/sender
      {
        stencilSendInput.value = selectedMaterial.stencilRef;
        stencilReceiveInput.value = 0;
      }
      else if (selectedObj.renderOrder == 2) {
        stencilSendInput.value = 0;
        stencilReceiveInput.value = selectedMaterial.stencilRef;
        if (selectedMaterial.stencilFunc == THREE.EqualStencilFunc) {
          stencilShowHide.checked = true;
        }
        else {
          stencilShowHide.checked = false;
        }
      }
      else {
        stencilSendInput.value = selectedMaterial.stencilRef;
        stencilReceiveInput.value = selectedMaterial.stencilRef;
      }


      propertiesPanel.classList.remove('hidden');
    } else {
      propertiesPanel.classList.add('hidden');
    }
  }


  // Event listeners
  // This listener replaces the need for the old `renderMaterialList`'s button clicks.
  materialSelector.addEventListener('change', (event) => {
    selectMaterial(event.target.value);
  });

  materialColorPicker.addEventListener('input', (event) => {
    if (selectedMaterial) {
      selectedMaterial.color.setHex(hexToThreeColor(event.target.value));
      selectedObjData.setMaterialProperties(selectedMaterial.name, { color: hexToThreeColor(event.target.value) });

      // console.log(`Updated material color for ${selectedMaterial.materialName} to ${event.target.value}`);
    }
  });

  emissiveColorPicker.addEventListener('input', (event) => {
    if (selectedMaterial) {
      selectedMaterial.emissive.setHex(hexToThreeColor(event.target.value));
      selectedObjData.setMaterialProperties(selectedMaterial.name, { emissive: hexToThreeColor(event.target.value) });

      // console.log(`Updated emissive color for ${selectedMaterial.materialName} to ${event.target.value}`);
    }
  });

  materialColorPicker.addEventListener('input', updateModelAndSavefield);
  emissiveColorPicker.addEventListener('input', updateModelAndSavefield);

  function updateModelAndSavefield() {
    updateModelData(selectedObjData);
    updateSaveField();
  }

  // When a texture button is clicked, set the type and open the media frame.
  // The `editingTextureType` variable ensures the `on('select', ...)` function
  // knows which property to update.
  materialTextureBtn.addEventListener('click', () => {
    editingTextureType = 'map';
    textureUploader.open();
  });

  emissiveTextureBtn.addEventListener('click', () => {
    editingTextureType = 'emissiveMap';
    textureUploader.open();
  });

  function hexToThreeColor(hexString) {
    return parseInt(hexString.substring(1), 16);
  }



  // Add an event listener to the dropdown
  blendModeSelect.addEventListener('change', (event) => {
    // Get the selected blend mode string
    const selectedModeString = event.target.value;

    // Find the corresponding THREE.js constant
    // const selectedBlendMode = blendModes[selectedModeString];

    setBlendMode(selectedMaterial, selectedModeString);
    // selectedMaterial.blending = selectedBlendMode;
    selectedObjData.setMaterialProperties(selectedMaterial.name, { blending: selectedModeString });


  });

  deleteTextureBtn.addEventListener('click', () => {
    selectedMaterial.map = null;
    selectedMaterial.needsUpdate = true;
    let materialPropsObject = selectedObjData.materialProperties.find(item => item.materialName === selectedMaterial.name);

    delete materialPropsObject.map;
  });

  deleteEmissiveBtn.addEventListener('click', () => {
    selectedMaterial.emissiveMap = null;
    selectedMaterial.needsUpdate = true;
    let materialPropsObject = selectedObjData.materialProperties.find(item => item.materialName === selectedMaterial.name);
    delete materialPropsObject.emissiveMap;
  });


  function setBlendMode(material, blendModeString) {
    const selectedBlendMode = blendModes[blendModeString];
    material.blending = selectedBlendMode;
    material.premultipliedAlpha = true;
    // scene.background = new THREE.Color(0x333333);
    // You might need to set material.transparent to true for some blending modes to work correctly
    if (selectedBlendMode !== THREE.NoBlending) {
      material.transparent = true;
    } else {
      material.transparent = false;
    }

    // A material.needsUpdate = true might be necessary depending on the Three.js version and material type
    material.needsUpdate = true;

    // console.log('Blend mode changed to:', blendModeString);
  }

  document.querySelector('#orbitToggle').addEventListener('click', toggleOrbitControls);
  document.querySelector('#toggleCameraMove').addEventListener('click', toggleOrbitControls);

  function toggleOrbitControls() {

    orbitControls.enabled = !orbitControls.enabled;
    document.querySelector('#orbitToggle').classList.toggle('transButtonActive');
    document.querySelector('#toggleCameraMove').classList.toggle('transButtonActive');
    setGizmoVisible(!orbitControls.enabled);
    axesHelper.visible = orbitControls.enabled;
    gridHelper.visible = orbitControls.enabled;
    // lightHelper.visible = orbitControls.enabled;
    if (orbitControls.enabled) {
      // toggleControlsButton.textContent = 'Disable Controls';
      console.log('Controls enabled');
      document.querySelector('.topTransforms').style.display = 'none';

    } else {
      // toggleControlsButton.textContent = 'Enable Controls';
      console.log('Controls disabled');
      document.querySelector('.topTransforms').style.display = 'flex';
    }
  }

  function loadCameraFromSceneData() {
    const savedCameraData = allSceneData.globalSettings.camera;
    if (savedCameraData) {
      // Use .set() to apply the saved position and rotation
      camera.position.set(savedCameraData.position.x, savedCameraData.position.y, savedCameraData.position.z);
      camera.quaternion.set(savedCameraData.rotation.x, savedCameraData.rotation.y, savedCameraData.rotation.z, savedCameraData.rotation.w);
      camera.zoom = savedCameraData.zoom;

      // Crucially, update the controls to reflect the new camera state

      if (savedCameraData.target) {
        orbitControls.target.set(savedCameraData.target.x, savedCameraData.target.y, savedCameraData.target.z);
        orbitControls.update();
      }

      camera.updateProjectionMatrix();

      console.log("Camera position and rotation loaded from allSceneData object.");
    }
    else {
      // Fallback: Set to default position and rotation
      camera.position.set(0, 0, 5);
      camera.quaternion.set(0, 0, 0, 1); // Identity quaternion (no rotation)
      camera.zoom = 1;
    }


  }


  function saveCameraToSceneData() {
    // Convert Vector3 and Quaternion to simple objects
    const cameraPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };
    // console.log('before', allSceneData.globalSettings.camera.position.x, 'after', cameraPos.x);
    // Use the camera's quaternion for rotation
    const cameraRot = {
      x: camera.quaternion.x,
      y: camera.quaternion.y,
      z: camera.quaternion.z,
      w: camera.quaternion.w
    };

    const target = {
      x: orbitControls.target.x,
      y: orbitControls.target.y,
      z: orbitControls.target.z
    };

    // Update the allSceneData object
    allSceneData.globalSettings.camera = {
      position: cameraPos,
      rotation: cameraRot,
      target: target,
      zoom: camera.zoom
    };

    // console.log("Camera position and rotation saved to allSceneData object.");
  }



  lightSelector.addEventListener('change', (event) => {
    const selectedType = event.target.value;
    if (selectedType) {
      createObject(selectedType);
      // Reset the dropdown to its initial state
      event.target.value = '';
    }
  });


  lightColor.addEventListener('input', (event) => {
    // Check if a light object is selected
    // The .isLight property is a standard THREE.js way to identify a light object
    if (selectedObj && selectedObj.isLight) {
      selectedObj.color.set(event.target.value);
      // console.log('b1', allSceneData.models[0][1].lightSettings);
      selectedObjData.lightSettings.color = event.target.value;
      // selectedObj.helper.color.set(event.target.value);
      selectedObj.helper.update();
      updateModelData(selectedObjData);
      updateSaveField();
      // console.log('b2', allSceneData.models[0][1].lightSettings);

    }
  });

  castInput.addEventListener('change', function () {
    const isCasting = this.checked;

    selectedObj.castShadow = isCasting;

    selectedObjData.castShadow = isCasting;

    if (selectedObj.material) {
      selectedObj.material.needsUpdate = true;
    }

    if (selectedObj.children && selectedObj.children.length > 0) {
      applyShadowProperties(selectedObj, 'castShadow', isCasting);
    }

    // console.log(`Three.js Object Shadow Update: castShadow set to ${isCasting}`);
    updateModelData(selectedObjData);
    updateSaveField();
    if (isCasting) {
      checkShadowsEnabled();
    }
  });

  recieveInput.addEventListener('change', function () {
    const isReceiving = this.checked;
    selectedObj.receiveShadow = isReceiving;
    selectedObjData.receiveShadow = isReceiving;

    if (selectedObj.material) {
      selectedObj.material.needsUpdate = true;
    }

    if (selectedObj.children && selectedObj.children.length > 0) {
      applyShadowProperties(selectedObj, 'receiveShadow', isReceiving);
    }

    // console.log(`Three.js Object Shadow Update: receive shadow set to ${isReceiving}`);
    updateModelData(selectedObjData);
    updateSaveField();
    if (isReceiving) {
      checkShadowsEnabled();
    }
  });

  function updateShadowUI() {
    recieveInput.checked = selectedObj.receiveShadow;
    castInput.checked = selectedObj.castShadow;
  }


  // todo, disable if all shadow settings set back to false
  function checkShadowsEnabled() {
    if (!renderer.shadowMap.enabled) {
      // Only enable if the user is turning a shadow-related setting ON
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }

  function applyShadowProperties(object, propertyName, value) {
    object.traverse((child) => {
      if (child.isMesh) {
        // 💡 Use bracket notation to access the property by its string name
        child[propertyName] = value;

        // Log for debugging 
        // console.log(`Setting ${child.name}.${propertyName} to ${value}`);

        // Always set needsUpdate when changing object visibility/shadow properties
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }

  //are you sure before closing
  //   window.addEventListener('beforeunload', function (event) {
  //   // Set the returnValue property to show a generic confirmation dialog
  //     if(allThreeJsObj.length > 3 && !isSaving)
  //     {
  //       event.preventDefault();
  //       event.returnValue = ''; // Required for older browsers
  //     }
  // });


  //keyframe stuff

  // Temporary storage for our keyframes
  const tempKeyframes = {
    base: null,
    keyframe1: null
  };

  // Track which keyframe is currently active
  // Track which keyframe is currently active



  function saveCurrentState() {
    if (!selectedObj || !selectedObjData) return;

    if (previewAnimationToggle && previewAnimationToggle.checked) {
      return;
    }

    if (currentEditTarget === 'base') {
      selectedObjData.positionX = selectedObj.position.x;
      selectedObjData.positionY = selectedObj.position.y;
      selectedObjData.positionZ = selectedObj.position.z;
      // Convert Three.js radians back to Config degrees
      selectedObjData.rotationX = THREE.MathUtils.radToDeg(selectedObj.rotation.x);
      selectedObjData.rotationY = THREE.MathUtils.radToDeg(selectedObj.rotation.y);
      selectedObjData.rotationZ = THREE.MathUtils.radToDeg(selectedObj.rotation.z);

      selectedObjData.scaleX = selectedObj.scale.x;
      selectedObjData.scaleY = selectedObj.scale.y;
      selectedObjData.scaleZ = selectedObj.scale.z;

      // console.log(selectedObjData.modelName + "2. Saved to Base (Converted to Degrees):", {
      //   x: selectedObjData.rotationX,
      //   y: selectedObjData.rotationY,
      //   z: selectedObjData.rotationZ
      // });

    } else if (currentEditTarget === 'keyframe1') {
      selectedObjData.keyframe1 = {
        position: { x: selectedObj.position.x, y: selectedObj.position.y, z: selectedObj.position.z },
        rotation: {
          x: THREE.MathUtils.radToDeg(selectedObj.rotation.x),
          y: THREE.MathUtils.radToDeg(selectedObj.rotation.y),
          z: THREE.MathUtils.radToDeg(selectedObj.rotation.z)
        },
        scale: { x: selectedObj.scale.x, y: selectedObj.scale.y, z: selectedObj.scale.z }
      };

      // console.log("2. Saved to Keyframe 1 (Converted to Degrees):", {
      //   x: selectedObjData.keyframe1.rotation.x,
      //   y: selectedObjData.keyframe1.rotation.y,
      //   z: selectedObjData.keyframe1.rotation.z
      // });
    }

    updateModelData(selectedObjData);
    updateSaveField();
  }

  // Helper: Apply a saved transform back to the object (CONVERTING TO RADIANS)
  function loadSavedState(target) {
    if (!selectedObj || !selectedObjData) return;

    if (target === 'base') {
      selectedObj.position.set(selectedObjData.positionX, selectedObjData.positionY, selectedObjData.positionZ);
      // Convert Config degrees to Three.js radians
      selectedObj.rotation.set(
        THREE.MathUtils.degToRad(selectedObjData.rotationX),
        THREE.MathUtils.degToRad(selectedObjData.rotationY),
        THREE.MathUtils.degToRad(selectedObjData.rotationZ)
      );
    } else if (target === 'keyframe1') {
      if (selectedObjData.keyframe1) {
        selectedObj.position.set(selectedObjData.keyframe1.position.x, selectedObjData.keyframe1.position.y, selectedObjData.keyframe1.position.z);
        selectedObj.rotation.set(
          THREE.MathUtils.degToRad(selectedObjData.keyframe1.rotation.x),
          THREE.MathUtils.degToRad(selectedObjData.keyframe1.rotation.y),
          THREE.MathUtils.degToRad(selectedObjData.keyframe1.rotation.z)
        );
        if (selectedObjData.keyframe1.scale) {
          selectedObj.scale.set(selectedObjData.keyframe1.scale.x, selectedObjData.keyframe1.scale.y, selectedObjData.keyframe1.scale.z);
        }
      } else {
        saveCurrentState();
      }
    }
  }

  // Main function to handle switching
  function switchEditMode(newTarget) {
    if (currentEditTarget === newTarget) return;

    // 1. Save current state to the outgoing target
    saveCurrentState();

    // 2. Update tracker
    currentEditTarget = newTarget;

    // 3. Update button UI
    if (currentEditTarget === 'base') {
      editBaseState.textContent = 'Editing';
      editKeyframe1.textContent = 'Edit';
    } else {
      editBaseState.textContent = 'Edit';
      editKeyframe1.textContent = 'Editing';
    }

    // 4. Snap ALL objects to the new visual state
    snapAllObjectsToState(currentEditTarget);

    // 5. Ensure the currently selected object initializes its keyframe1 data if it's missing
    loadSavedState(currentEditTarget);
  }

  // Event Listeners
  editBaseState.addEventListener('click', () => switchEditMode('base'));
  editKeyframe1.addEventListener('click', () => switchEditMode('keyframe1'));

  // Persist animTriggerSource whenever it changes
  animTriggerSource.addEventListener('change', () => {
    if (selectedObjData) {
      selectedObjData.animTriggerSource = animTriggerSource.value;
      updateModelData(selectedObjData);
      updateSaveField();
      refreshActiveHandChannels();
    }
  });

  // Initialize UI state on load
  editBaseState.textContent = 'Editing';
  editKeyframe1.textContent = 'Edit';

  // Optional: If selectedObj is already defined when this runs, initialize the base state
  if (selectedObj) {
    saveCurrentState();
  }

  // Handle Preview Toggle
  previewAnimationToggle.addEventListener('change', (e) => {
    togglePreviewKeyframeAnim();
  });

  function togglePreviewKeyframeAnim() {
    if (!previewingAnimation) {
      saveCurrentState();
    }

    previewingAnimation = !previewingAnimation;
    previewAnimationToggle.checked = previewingAnimation;

    editBaseState.disabled = previewingAnimation;
    editKeyframe1.disabled = previewingAnimation;
    if (typeof resetKeyframe1 !== 'undefined') resetKeyframe1.disabled = previewingAnimation;

    if (previewingAnimation) {
      // Turning preview ON — safe to hide gizmo immediately, nothing to restore
      if (gizmoVisible) {
        setGizmoVisible(false);
        gizmoVisible = false;
      }
    }
    else {
      // Turning preview OFF — restore saved state BEFORE the gizmo re-attaches,
      // so updateTransforms() never fires against a mid-interpolation transform
      if (typeof snapAllObjectsToState === 'function') {
        snapAllObjectsToState(currentEditTarget);
      }
      loadSavedState(currentEditTarget);
      if (typeof allThreeJsObj !== 'undefined') {
        allThreeJsObj.forEach((child) => {
          if (child.userData) child.userData.currentAnimAlpha = undefined;
        });
      }

      setGizmoVisible(true);
      gizmoVisible = true;
    }
  }



  resetKeyframe1.addEventListener('click', () => {
    if (!selectedObj || !selectedObjData) return;

    saveCurrentState();

    // Overwrite keyframe1 with exact base state values (already in degrees)
    selectedObjData.keyframe1 = {
      position: { x: selectedObjData.positionX, y: selectedObjData.positionY, z: selectedObjData.positionZ },
      rotation: { x: selectedObjData.rotationX, y: selectedObjData.rotationY, z: selectedObjData.rotationZ },
      scale: { x: selectedObjData.scaleX, y: selectedObjData.scaleY, z: selectedObjData.scaleZ }
    };

    updateModelData(selectedObjData);
    updateSaveField();

    if (currentEditTarget === 'keyframe1') {
      loadSavedState('keyframe1');
    }
  });


  // Persist the invert toggle whenever it changes
  animTriggerInvert.addEventListener('change', () => {
    if (selectedObjData) {
      selectedObjData.animTriggerInvert = animTriggerInvert.checked;
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });

  const animTriggerDamping = document.getElementById('animTriggerDamping');

  // Save damping on change
  animTriggerDamping.addEventListener('change', () => {
    if (selectedObjData) {
      selectedObjData.animDamping = parseFloat(animTriggerDamping.value);
      updateModelData(selectedObjData);
      updateSaveField();
    }
  });


  function snapAllObjectsToState(target) {
    if (typeof allThreeJsObj === 'undefined') return;
    allThreeJsObj.forEach((child) => {
      const config = child.userData ? (isMobileView ? child.userData.modelConfigRefMob : child.userData.modelConfigRef) : null;
      if (!config) return;
      if (target === 'base') {
        child.position.set(config.positionX, config.positionY, config.positionZ);
        child.rotation.set(
          THREE.MathUtils.degToRad(config.rotationX),
          THREE.MathUtils.degToRad(config.rotationY),
          THREE.MathUtils.degToRad(config.rotationZ)
        );
      } else if (target === 'keyframe1' && config.keyframe1) {
        child.position.set(config.keyframe1.position.x, config.keyframe1.position.y, config.keyframe1.position.z);
        child.rotation.set(
          THREE.MathUtils.degToRad(config.keyframe1.rotation.x),
          THREE.MathUtils.degToRad(config.keyframe1.rotation.y),
          THREE.MathUtils.degToRad(config.keyframe1.rotation.z)
        );
      }
    });
  }



  addDirectBindingBtn.addEventListener('click', () => {
    if (!selectedObjData) return;
    selectedObjData.addDirectBinding({
      channel: 'mouseX',
      property: 'rotationY',
      inputMin: 0, inputMax: 1,
      outputMin: 0, outputMax: 360,
    });
    updateModelData(selectedObjData);
    updateSaveField();
    renderDirectBindings();
  });

  function renderDirectBindings() {
    directBindingsList.innerHTML = '';
    if (!selectedObjData || !Array.isArray(selectedObjData.directBindings)) return;

    selectedObjData.directBindings.forEach((binding) => {
      const row = directBindingRowTemplate.content.cloneNode(true);
      const rowEl = row.querySelector('.direct-binding-row');
      rowEl.dataset.bindingId = binding.id;

      populateLandmarkSelects(rowEl); // fills db-landmarkA / db-landmarkPairA / db-landmarkPairB

      // Parse the saved channel string back into UI state
      applyChannelToRowUI(rowEl, binding.channel);

      rowEl.querySelector('.db-property').value = binding.property;
      rowEl.querySelector('.db-inputMin').value = binding.inputMin;
      rowEl.querySelector('.db-inputMax').value = binding.inputMax;
      rowEl.querySelector('.db-outputMin').value = binding.outputMin;
      rowEl.querySelector('.db-outputMax').value = binding.outputMax;
      rowEl.querySelector('.db-invert').checked = !!binding.invert;
      rowEl.querySelector('.db-damping').value = binding.damping ?? 1.0;

      wireRowEvents(rowEl, binding.id);
      directBindingsList.appendChild(row);
    });
  }

  function populateLandmarkSelects(rowEl) {
    const selects = [
      rowEl.querySelector('.db-landmarkA'),
      rowEl.querySelector('.db-landmarkPairA'),
      rowEl.querySelector('.db-landmarkPairB'),
    ];
    selects.forEach(select => {
      LANDMARK_NAMES.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    });
  }

  function applyChannelToRowUI(rowEl, channel) {
    const isHand = channel.startsWith('hand.');
    rowEl.querySelector('.db-sourceType').value = isHand ? 'hand' : 'mouse';
    rowEl.querySelector('.db-mouseInputs').style.display = isHand ? 'none' : 'flex';
    rowEl.querySelector('.db-handInputs').style.display = isHand ? 'block' : 'none';

    if (!isHand) {
      rowEl.querySelector('.db-mouseAxis').value = channel; // 'mouseX' or 'mouseY'
      return;
    }

    const parts = channel.split('.');
    rowEl.querySelector('.db-hand').value = parts[1];

    const distMatch = parseDistanceChannelKey(channel);
    if (distMatch) {
      rowEl.querySelector('.db-metric').value = distMatch.pixels ? 'distancePx' : 'distance';
      rowEl.querySelector('.db-landmarkPairA').value = distMatch.landmarkA;
      rowEl.querySelector('.db-landmarkPairB').value = distMatch.landmarkB;
    } else if (parts[2] === 'landmark') {
      rowEl.querySelector('.db-metric').value = 'landmark';
      rowEl.querySelector('.db-landmarkA').value = parts[3];
      rowEl.querySelector('.db-axis').value = parts[4];
    } else {
      rowEl.querySelector('.db-metric').value = parts[2];
    }
    updateRowFieldVisibility(rowEl);
  }

  function updateRowFieldVisibility(rowEl) {
    const metric = rowEl.querySelector('.db-metric').value;
    const isSingle = metric === 'landmark';
    const isPair = metric === 'distance' || metric === 'distancePx';
    rowEl.querySelector('.db-landmarkSingle').style.display = isSingle ? 'flex' : 'none';
    rowEl.querySelector('.db-landmarkAxis').style.display = isSingle ? 'flex' : 'none';
    rowEl.querySelector('.db-landmarkPair').style.display = isPair ? 'block' : 'none';
  }

  function composeChannelFromRow(rowEl) {
    if (rowEl.querySelector('.db-sourceType').value === 'mouse') {
      return rowEl.querySelector('.db-mouseAxis').value;
    }
    const hand = rowEl.querySelector('.db-hand').value;
    const metric = rowEl.querySelector('.db-metric').value;
    switch (metric) {
      case 'landmark':
        return `hand.${hand}.landmark.${rowEl.querySelector('.db-landmarkA').value}.${rowEl.querySelector('.db-axis').value}`;
      case 'distance':
        return `hand.${hand}.distance.${rowEl.querySelector('.db-landmarkPairA').value}-${rowEl.querySelector('.db-landmarkPairB').value}`;
      case 'distancePx':
        return `hand.${hand}.distancePx.${rowEl.querySelector('.db-landmarkPairA').value}-${rowEl.querySelector('.db-landmarkPairB').value}`;
      default:
        return `hand.${hand}.${metric}`;
    }
  }

  function wireRowEvents(rowEl, bindingId) {
    const commit = (changes) => {
      if (!selectedObjData) return;
      selectedObjData.updateDirectBinding(bindingId, changes);
      updateModelData(selectedObjData);
      updateSaveField();
      // update this binding's active-channel registration for distance metrics
      refreshActiveHandChannels();
    };

    rowEl.querySelector('.db-sourceType').addEventListener('change', (e) => {
      const isHand = e.target.value === 'hand';
      rowEl.querySelector('.db-mouseInputs').style.display = isHand ? 'flex' : 'none';
      rowEl.querySelector('.db-handInputs').style.display = isHand ? 'block' : 'none';
      if (isHand) updateRowFieldVisibility(rowEl);
      commit({ channel: composeChannelFromRow(rowEl) });
    });

    ['.db-mouseAxis', '.db-hand', '.db-metric', '.db-landmarkA', '.db-axis', '.db-landmarkPairA', '.db-landmarkPairB']
      .forEach(sel => {
        rowEl.querySelector(sel).addEventListener('change', () => {
          updateRowFieldVisibility(rowEl);
          commit({ channel: composeChannelFromRow(rowEl) });
        });
      });

    rowEl.querySelector('.db-property').addEventListener('change', (e) => {
      const property = e.target.value;
      const changes = { property };

      if (property.startsWith('rotation') || property === 'rotationUniform') {
        changes.outputMin = 0;
        changes.outputMax = 360;
        rowEl.querySelector('.db-outputMin').value = 0;
        rowEl.querySelector('.db-outputMax').value = 360;
      }

      commit(changes);
    });
    rowEl.querySelector('.db-inputMin').addEventListener('change', (e) => commit({ inputMin: parseFloat(e.target.value) }));
    rowEl.querySelector('.db-inputMax').addEventListener('change', (e) => commit({ inputMax: parseFloat(e.target.value) }));
    rowEl.querySelector('.db-outputMin').addEventListener('change', (e) => commit({ outputMin: parseFloat(e.target.value) }));
    rowEl.querySelector('.db-outputMax').addEventListener('change', (e) => commit({ outputMax: parseFloat(e.target.value) }));
    rowEl.querySelector('.db-invert').addEventListener('change', (e) => commit({ invert: e.target.checked }));
    rowEl.querySelector('.db-damping').addEventListener('input', (e) => commit({ damping: parseFloat(e.target.value) }));

    rowEl.querySelector('.db-remove').addEventListener('click', () => {
      selectedObjData.removeDirectBinding(bindingId);
      updateModelData(selectedObjData);
      updateSaveField();
      refreshActiveHandChannels();
      renderDirectBindings();
    });

    rowEl.querySelector('.db-calibrate').addEventListener('click', () => {
      runCalibration(rowEl, bindingId);
    });
  }

  function runCalibration(rowEl, bindingId) {
    const channel = composeChannelFromRow(rowEl);
    const statusEl = rowEl.querySelector('.db-calibrateStatus');
    const calibrateBtn = rowEl.querySelector('.db-calibrate');

    let observedMin = Infinity;
    let observedMax = -Infinity;
    const durationMs = 4000;
    const startTime = performance.now();

    calibrateBtn.disabled = true;
    statusEl.style.display = 'block';
    statusEl.textContent = 'Move through the full range now...';

    const sampleInterval = setInterval(() => {
      const channels = mergeChannels(
        getMouseChannels(mouse),
        handInputProvider ? handInputProvider.getChannels() : {}
      );
      const val = channels[channel];
      if (val !== undefined) {
        observedMin = Math.min(observedMin, val);
        observedMax = Math.max(observedMax, val);
        statusEl.textContent = `Sampling... current range: ${observedMin.toFixed(2)} to ${observedMax.toFixed(2)}`;
      }

      if (performance.now() - startTime >= durationMs) {
        clearInterval(sampleInterval);
        calibrateBtn.disabled = false;

        if (observedMin === Infinity) {
          statusEl.textContent = 'No data received — is the input active?';
          return;
        }

        rowEl.querySelector('.db-inputMin').value = observedMin.toFixed(3);
        rowEl.querySelector('.db-inputMax').value = observedMax.toFixed(3);
        statusEl.textContent = `Done. Range set to ${observedMin.toFixed(2)} – ${observedMax.toFixed(2)}.`;

        selectedObjData.updateDirectBinding(bindingId, { inputMin: observedMin, inputMax: observedMax });
        updateModelData(selectedObjData);
        updateSaveField();
      }
    }, 100);
  }


  window.c33dDebug = {
    getHandChannels: () => handInputProvider?.getChannels() ?? null,
    getActiveDistanceChannels: () => handInputProvider?.activeDistanceChannels ?? [],
    getSelectedObjData: () => selectedObjData,
    getAllModels: () => allModels,
    testAddDirectBinding: (binding) => {
      if (!selectedObjData) {
        console.warn('No object selected');
        return;
      }
      selectedObjData.addDirectBinding(binding);
      updateModelData(selectedObjData);
      updateSaveField();
      console.log('Binding added:', selectedObjData.directBindings);
    },
  };
} //end onload

// console.timeEnd('fullLoad');




