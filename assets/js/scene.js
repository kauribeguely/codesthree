console.log('scene js loaded');
// let THREE, GLTFLoader, RGBELoader;
let THREE, GLTFLoader;


let allShortCodeContainers = document.querySelectorAll('.c33d_scene');
let threeJsLoaded = false;
let mutationObs;

const localisedData = window.c33dlocaliseddata;
// const isAdmin = localisedData.isAdmin === 'true';
const isAdmin = localisedData.isAdmin === 'true';

let blendModes;

if(allShortCodeContainers.length > 0)
{  
  initializeAllScenes();
}

if(isAdmin)
{
  if(mutationObs == undefined) addMutationObserverForShortcodes();
}

function initializeAllScenes()
{
  // allShortCodeContainers = document.querySelectorAll('.c33d_scene');
  allShortCodeContainers.forEach((shortCodeContainer) => 
  {
    const shortCodePostId = shortCodeContainer.dataset.sceneId;
    // Get all containers with same shortcode id (sometimes they get added multiple times)
    const duplicateContainers = document.querySelectorAll('[data-scene-id="'+shortCodePostId+'"]');

    duplicateContainers.forEach((container) => {
        initializeSceneFromContainer(container);
    });
  });
}

function addMutationObserverForShortcodes()
{
  console.log('adding observer for admin area');
  mutationObs = new MutationObserver(function(mutationsList) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // Ensure the node is an element and not just text
                if (node.nodeType === 1) {
                    if (node.classList.contains('c33d_scene')) {
                        initializeSceneFromContainer(node);
                    }
                    // Also check for scene containers within the added node's children
                    // (e.g., if a whole section containing scenes was added)
                    node.querySelectorAll('.c33d_scene').forEach(initializeSceneFromContainer);
                }
            });
        }
    }
  });
  
  mutationObs.observe(document.body, { childList: true, subtree: true });
}

async function loadThreeJs()
{
  if(!threeJsLoaded)
  {
    THREE = await import('three');
    const gltf = await import('three/addons/GLTFLoader.js');
    // const rgbe = await import('three/addons/RGBELoader.js');
    GLTFLoader = gltf.GLTFLoader;
    // RGBELoader = rgbe.RGBELoader;
    threeJsLoaded = true;
    blendModes = {
      NormalBlending: THREE.NormalBlending,
      AdditiveBlending: THREE.AdditiveBlending,
      SubtractiveBlending: THREE.SubtractiveBlending,
      MultiplyBlending: THREE.MultiplyBlending,
      NoBlending: THREE.NoBlending,
      CustomBlending: THREE.CustomBlending
    };
  }
}

async function initializeSceneFromContainer(container)
{
  await loadThreeJs();
  const containerID = container.id;
  const allSceneData = JSON.parse(container.dataset.sceneData);
console.log(allSceneData);

  const pluginUrl = container.dataset.pluginUrl;
  //may have to add to front end also if implementing lazy load of scenes
  // if (document.body.classList.contains('wp-admin')) 

  // Check if the scene has already been initialized for this container
  if (!container.hasAttribute('data-scene-initialized')) {
      container.setAttribute('data-scene-initialized', 'true');

      // Initialize the Three.js scene
    //   console.log(sceneData);
      if (typeof initializeThreeJsScene === "function") {
          initializeThreeJsScene(allSceneData, containerID, pluginUrl);
      }
  } else {
      console.log(`Scene for ${containerID} has already been initialized.`);
  }
}

export function initializeThreeJsScene(allSceneData, containerId, pluginUrl)
{
  let numLoaded = 0;
  let itemsLoaded = 0;
  let allGroups = [];
  let lastAddedObject;
    const container = document.getElementById(containerId);
    const loadScreen = container.querySelector('.loadScreen');
    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }

    if(container.clientWidth == 0)
    {
      container.style.width = "100%";
    }

    // Get the canvas container's distance to the top of the screen
    const getCanvasOffset = () => {
      const rect = container.getBoundingClientRect();
      const canvasTop = rect.top + window.scrollY;
      const screenHeight = window.innerHeight;
      // return canvasTop / screenHeight; // Returns a value between 0 and 1
      return rect.top / container.offsetHeight; // Returns a value between 0 and 1
    };


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
    const MOBILE_BREAKPOINT_MAX_WIDTH = sceneData.breakpoint; 
    // Set the isMobile boolean based on the current window width
    let isMobile = window.innerWidth <= MOBILE_BREAKPOINT_MAX_WIDTH;
    // const MOBILE_BREAKPOINT_MAX_WIDTH = sceneData.breakPoint; 
    // console.log(pluginData.pluginUrl);
    // console.log(pluginUrl);
    const mouseRotationX = sceneData.mouseRotationX; // Maximum rotation range in degrees
    const mouseRotationY = sceneData.mouseRotationY; // Maximum rotation range in degrees
    const mouseRotationZ = sceneData.mouseRotationZ; // Maximum rotation range in degrees
    let mouseAnimationLink = sceneData.mouseAnimationLink;

    let mouse = new THREE.Vector2();
    //only need if any object has link, also only need mouse down for that too
    const raycaster = new THREE.Raycaster();
    // Mousemove listener
    const targetRotation = new THREE.Vector3(); // Store the target rotation
    const currentRotation = new THREE.Vector3(); // Store the current rotation

    let scrollAnimationLink = sceneData.scrollAnimationLink;
    let isOrthoCamera = sceneData.isOrthoCamera;
    let loopActive = sceneData.loopActive;
    let useEnvLight = sceneData.useEnvLight;



    const scene = new THREE.Scene();
    if(allSceneData.globalSettings.bgColor !== undefined) {
      scene.background = new THREE.Color(allSceneData.globalSettings.bgColor);
    } else {
        // Fallback to a default color if bgColor is not defined
        // scene.background = new THREE.Color(0x000000); // Black
        scene.background = null;
    }

    if(allSceneData.globalSettings.noBackground == true)
    {
      scene.background = null;
    } 

    let rotateGroup = new THREE.Group();
    scene.add(rotateGroup);
    let camera;
    const perspectiveCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    let isoZoom = 250;
    const orthoCamera = new THREE.OrthographicCamera( container.clientWidth / - isoZoom, container.clientWidth / isoZoom, container.clientHeight / isoZoom, container.clientHeight / - isoZoom, 0.1, 1000 );

    console.log(container.clientWidth);

    if(isOrthoCamera)
    {
      camera = orthoCamera;
    }
    else
    {
      camera = perspectiveCamera;
    }

    let cameraPos = [0, 0, 5];

    // camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    loadCameraFromSceneData();
    scene.add( camera );

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, stencil:true});
    renderer.setSize(container.clientWidth, container.clientHeight);

    // renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // renderer.toneMappingExposure = 0.7; // Adjust for brightness



const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;

        if (width === 0 || height === 0) return;

        // 1. Update Renderer
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 2. Update Camera (merged logic)
        const aspect = width / height;
        
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.aspect = aspect;
            // Adjust FOV for "Zoom" on mobile
            camera.fov = (width < 767) ? 75 : 50; 
        } else if (camera instanceof THREE.OrthographicCamera) {
            // Use a dynamic isoZoom to prevent the "cropped" look
            let activeIso = (width < 767) ? 150 : isoZoom; 
            
            camera.left = width / -activeIso;
            camera.right = width / activeIso;
            camera.top = height / activeIso;
            camera.bottom = height / -activeIso;
        }
        camera.updateProjectionMatrix();

        // 3. Handle Mobile Breakpoint Logic (Moved from your old function)
        const belowBreakPoint = window.innerWidth <= MOBILE_BREAKPOINT_MAX_WIDTH;
        let changed = false;

        if (belowBreakPoint && !isMobile) {
            isMobile = true;
            changed = true;
        } else if (!belowBreakPoint && isMobile) {
            isMobile = false;
            changed = true;
        }

        // If we crossed the mobile/desktop threshold, re-apply transforms
        if (changed) {
            applyAllTransformsFromConfigs();
        }
    }
});

// Observe the container instead of the window
resizeObserver.observe(container);

    container.appendChild(renderer.domElement);

    // const alight = new THREE.AmbientLight(0xffffff, sceneData.lightIntensity);
    // scene.add(alight);


    // const dlight = new THREE.DirectionalLight(0xffffff, sceneData.directionalLightIntensity);
    // let ddirectionalLightIntes = 1;
    // dlight.position.set(sceneData.lightPosX, sceneData.lightPosY, sceneData.lightPosZ);
    // scene.add(dlight);


    let model, loopGroup, loopable;
    let spacing = sceneData.itemSpacing;
    let fullLoopGroup = new THREE.Group();
    let objGroup = new THREE.Group();
    fullLoopGroup.add(objGroup);
    scene.add(fullLoopGroup);
    fullLoopGroup.scale.set(sceneData.loopGroupScale, sceneData.loopGroupScale, sceneData.loopGroupScale);

    let lights = [];
    let hover1 = document.getElementById('hover1');
    let hover2 = document.getElementById('hover2');

    function toggleLight(light, isOn) 
    {
        // Use getObjectByName to find a specific light
        // const light = scene.getObjectByName(lightName);
        if (light) {
            light.intensity = isOn ? 3 : 0;
        }
    }

    function findLights()
    {
      scene.traverse((child) => {
          if (child.isLight) {
              lights.push(child);
          }
      });
    }

    if(hover1) hover1.addEventListener('mouseenter', () => toggleLight(lights[1], true));
    if(hover1) hover1.addEventListener('mouseleave', () => toggleLight(lights[1], false));

    if(hover2) hover2.addEventListener('mouseenter', () => toggleLight(lights[0], true));
    if(hover2) hover2.addEventListener('mouseleave', () => toggleLight(lights[0], false));

    // Load 3D Model
    const loader = new GLTFLoader();
    // const rgbeLoader = new RGBELoader();
    const sphereGroup = new THREE.Group();
    // updateEnvTexture();

    if(allModels.length != 0)
    {
      loadAllModels();
      findLights();
    }

    function loadAllModels()
    {
      allModels.forEach(function(model, index)
      {
        createObject(model.type, model, false, index);        
      });
    }

    function createObject(type, objData, callback, index)
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
                color: 0xffffff, // Green color
                side: THREE.DoubleSide // Render both sides of the plane
            });
        newThreeJsObject = new THREE.Mesh(planeGeo, planeMaterial);
      }
      else if(type == 'cube')
      {
        const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        // const cube = new Mesh(cubeGeo, cubeMaterial);
        newThreeJsObject = new THREE.Mesh(cubeGeo, cubeMaterial);
      }
      else if(type == 'model' )
      {
        loadModel(objData.modelUrl, objData, callback, index);
      }
      else if(type.startsWith('light') ) //e.g. lightA lightD lightP
      {
        newThreeJsObject = createLight(objData, type.slice(-1));
      }
      else
      {
        console.log('Type not defined/handled: ' + type);
      }     

      //model calls add after loaded
      if(type != 'model' && type != undefined && type != "imageplane")
      {
        newThreeJsObject.userData.type = type;
        addObject(newThreeJsObject, objData, false, index);
      }
    }

    function createLight(objData, lightType)
    {
      let newLight, newHelper;
      let intensity = 1;
      let color = 0xffffff;
      if(objData)
      {
        intensity = objData.lightSettings.intensity;
        color = objData.lightSettings.color;
      }
      if(lightType == 'A')
      // if(lightType == 'ambient')
      {
        newLight = new THREE.AmbientLight(color, intensity);  
        // newHelper = new THREE.PointLightHelper(newLight, 0.5);
      }
      else if(lightType == 'D')
      // else if(lightType == 'directional')
      {
        newLight = new THREE.DirectionalLight(color, intensity);  
        // newHelper = new THREE.DirectionalLightHelper(newLight, 0.5);
      }
      else if(lightType == 'S')
      // else if(lightType == 'spotlight')
      {
        newLight = new THREE.SpotLight(color, intensity);  
        // newHelper = new THREE.SpotLightHelper(newLight);
        // newLight.map = new THREE.TextureLoader().load( 'http://localhost/wpLocalEdge/wp-content/uploads/2025/09/alien-paper.jpg' );

      }
      else if(lightType == 'P')
      // else if(lightType == 'pointlight')
      {
        newLight = new THREE.PointLight(color, intensity);  
        // newHelper = new THREE.PointLightHelper(newLight, 0.5);
      }
      // newLight.add(newHelper);
      // scene.add(newHelper);
      return newLight;
    }
    

    function addObject(newThreeJsObject, objData, callback, index, url)
    {
          lastAddedObject = newThreeJsObject;
          
          rotateGroup.add(newThreeJsObject);

          let mobObjData = allMobileModels[index];
          newThreeJsObject.userData.objData = objData; 
          newThreeJsObject.userData.mobObjData = mobObjData; 
          allThreeJsObj.push(newThreeJsObject);

          if(objData.link != null)
          {
            newThreeJsObject.userData.link = objData.link;
          }

          if(isMobile)
          {
            applyTransformFromConfig(newThreeJsObject, mobObjData);
          }
          else
          {
            applyTransformFromConfig(newThreeJsObject, objData);
          }

          objData.threeJsObject = newThreeJsObject;
          if(objData && Object.keys(objData.materialProperties).length != 0) applyMaterialPropertiesToModel(newThreeJsObject, objData);
          newThreeJsObject.castShadow = objData.castShadow;
          newThreeJsObject.receiveShadow = objData.receiveShadow;
          if(objData.castShadow || objData.receiveShadow)
          {
            checkShadowsEnabled();
          }
          currentRotation.copy(lastAddedObject.rotation); // The most direct way

          renderer.render(scene, camera);


          itemsLoaded++;
          // console.log(itemsLoaded);
          if(itemsLoaded == allModels.length)
          {
            moveAllObjectsToGroups();
            if(scrollAnimationLink) applyScrollTransforms();

          }

          //TODO count properly, along with env texture if enabled
          hideLoadScreen();
    }

    function applyMaterialPropertiesToModel(threeJsObject, objData)
    {
      // Return early if there's no Three.js object or no material properties to apply.
            if (!threeJsObject || objData.materialProperties.length === 0) {
              console.warn('No Three.js object or explicit material properties available to apply.');
              return;
            }
      
            const textureLoader = new THREE.TextureLoader();
            const materialsByName = new Map();

            if(objData.renderOrder != 0) threeJsObject.renderOrder = objData.renderOrder;
      
            // First, build a map of materials by their name for quick lookup.
            // This part remains the same and is a good practice.
            threeJsObject.traverse((child) => {
              if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                  if (mat.name) {
                    materialsByName.set(mat.name, mat);
                  }
                  else
                  {
                    mat.name = 'Unnamed';
                    materialsByName.set(mat.name, mat);
                  }
                });
              }
            });

            objData.materialProperties.forEach(savedMaterial => {
              const { materialName, ...properties } = savedMaterial;
              const material = materialsByName.get(materialName);
      
              if (material) {
                // Iterate through the properties of the current material.
                for (const propName in properties) {
                  const propValue = properties[propName];
      
                  // Special handling for textureUrl
                  if (propName === 'map' || propName === 'emissiveMap') {
                    // console.log(`Loading texture for material name: ${materialName} from ${propValue}`);
                    textureLoader.load(
                      propValue,
                      (texture) => {
                        texture.flipY = false;
                        texture.colorSpace = THREE.SRGBColorSpace;
                        material[propName] = texture;
                        // material.map = texture;
                        material.needsUpdate = true;
                        // console.log(`Successfully applied texture to material name: ${materialName}`);
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
                  else if (propName in material) 
                  {
                    if(material[propName].isColor)
                    {
                      material[propName].setHex(propValue);
                    }
                    else
                    {
                      if(propName == 'opacity')
                      {
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

    function setBlendMode(material, blendModeString)
    {
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
      
    // TODO: change data to dataList = [] - can scale to many screen sizes easier
    // function loadModel(url, objData, mobObjData)
    function loadModel(url, objData, callback, index)
    {
      loader.load(url, (gltf) =>
      {
          gltf.scene.userData.type = 'model';
          addObject(gltf.scene, objData, callback, index, url);     
      });
    }

    function moveAllObjectsToGroups()
    {
      allThreeJsObj.forEach(function(model)
      {
        const parentModelId = model.userData.objData.parentUuid;
        // if(modelIndex != -1 && modelIndex != undefined)
        if(parentModelId != -1 && parentModelId != undefined)
        {
          moveObjectToGroup(model, getThreeJsObjectByUuid(parentModelId));
        }
      });
    }

    function moveObjectToGroup(model, groupObject)
    {
      model.parent.remove(model);
      groupObject.add(model);
    }

    function getThreeJsObjectByUuid(modelId)
    {
      // return scene.getObjectByProperty('uuid', uuid);
      for (let i = 0; i < allThreeJsObj.length; i++) {
            const modelConfigRef = allThreeJsObj[i].userData.objData; // Get the current item from the array
            if (modelConfigRef.modelId === modelId) {
                return modelConfigRef.threeJsObject; // Return the associated THREE.Object3D
            }
        }
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


    function applyAllTransformsFromConfigs()
    {
      // console.log(allThreeJsObj.length);
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
      object.scale.set(config.scaleX, config.scaleY, config.scaleZ);
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


  const easing = 0.15; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

    const animate = function ()
    {
      // Smoothly follow the target
      // 0.05 is the "damping" - lower is smoother/slower
      rotateGroup.rotation.x = THREE.MathUtils.lerp(rotateGroup.rotation.x, targetRotation.x, easing);
      rotateGroup.rotation.y = THREE.MathUtils.lerp(rotateGroup.rotation.y, targetRotation.y, easing);
      rotateGroup.rotation.z = THREE.MathUtils.lerp(rotateGroup.rotation.z, targetRotation.z, easing);      
      
      renderer.render(scene, camera);     

      requestAnimationFrame(animate);
    };
    animate();

  let initialRotationX = 0;
  let initialRotationY = 0;
  let initialRotationZ = 0;
  const rotationRange = 10; // Maximum rotation range in degrees
  // const easing = 0.1 + (1 - 0.1) * 0.05; // Increase easing slightly on each move to simulate ease-out.  Adjust 0.05 for strength.

    // Mousemove listener
  const onMouseMove = (event) => {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalized between -1 and 1
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized between -1 and 1

    // Map mouse position to rotation range
    // model.rotation.x = THREE.MathUtils.degToRad(initialRotationX + -mouseY * rotationRange);
    // model.rotation.y = THREE.MathUtils.degToRad(initialRotationY + -mouseX * rotationRange);
    
    targetRotation.x = degToRad(initialRotationX + -mouseY * mouseRotationX);
    targetRotation.y = degToRad(initialRotationY + -mouseX * mouseRotationY);
    targetRotation.z = degToRad(initialRotationZ + -mouseX * mouseRotationZ);


    // currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, easing);
    // currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, easing);
    // currentRotation.z = THREE.MathUtils.lerp(currentRotation.z, targetRotation.z, easing);

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
      // rotateGroup.rotation.x = currentRotation.x;
      // rotateGroup.rotation.y = currentRotation.y;
      // rotateGroup.rotation.z = currentRotation.z;
    // }
    // console.log(rotCalc, mouseY, rotateGroup.rotation.x, mouseRotationX, initialRotationX, mouseAnimationLink);

    // console.log(initialRotationX + mouseY * rotationRange);
  };

  if(mouseAnimationLink) window.addEventListener('mousemove', onMouseMove);




  

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
        const scrollPos = -getCanvasOffset();

        // Determine how much to move the camera based on scroll and position
        const scrollFactor = 0.1; // Adjust this value to change the sensitivity of the scroll

        // Calculate new camera position based on scroll distance
        // const savedCameraData = allSceneData.globalSettings.camera;
        // camera.position.x = savedCameraData.position.x + scrollMoveX * scrollPos;
        // camera.position.y = savedCameraData.position.y + scrollMoveY * scrollPos;
        // camera.position.z = savedCameraData.position.z + scrollMoveZ * scrollPos;

        rotateGroup.position.x = scrollMoveX * scrollPos;
        rotateGroup.position.y = scrollMoveY * scrollPos;
        rotateGroup.position.z = scrollMoveZ * scrollPos;


        // Update the camera's position
        // camera.updateProjectionMatrix();

        // Prevent the default scroll behavior
        if(event) event.preventDefault();
      }


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
      // console.log(pluginUrl +'/codesthree/');
      console.log(pluginUrl +'/'+ url);
      // rgbeLoader.load(pluginUrl +'/codesthree/'+ url, function (texture)
      rgbeLoader.load(pluginUrl +'/'+ url, function (texture)
      {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        hideLoadScreen();
        // scene.background = texture;
      });
    }

    function loadCameraFromSceneData() {
      const savedCameraData = allSceneData.globalSettings.camera;
      if(savedCameraData)
      {
        // Use .set() to apply the saved position and rotation
        camera.position.set(savedCameraData.position.x, savedCameraData.position.y, savedCameraData.position.z);
        camera.quaternion.set(savedCameraData.rotation.x, savedCameraData.rotation.y, savedCameraData.rotation.z, savedCameraData.rotation.w);
        camera.zoom = savedCameraData.zoom;
        camera.updateProjectionMatrix();

        // Crucially, update the controls to reflect the new camera state
        // orbitControls.update();

        console.log("Camera position and rotation loaded from allSceneData object.");
      }
      else
      {
        // Fallback: Set to default position and rotation
          camera.position.set(0, 0, 5);
          camera.quaternion.set(0, 0, 0, 1); // Identity quaternion (no rotation)
          camera.zoom = 1;
      }

      
  }

  function checkShadowsEnabled()
  {
    if (!renderer.shadowMap.enabled) 
    {
      // Only enable if the user is turning a shadow-related setting ON
      renderer.shadowMap.enabled = true;
    }
  }

  
    container.onmousedown = function(e)
    {
      sceneOnMouseDown(e);
    }

    function sceneOnMouseDown(event)
    {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(allThreeJsObj, true); // `true` for recursive (checks children)


      if (intersects.length > 0) {
          // An object was clicked! Get the first (closest) intersected object.
          let clickedObject = intersects[0].object;

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

          if(clickedObject.userData.link != null)
          {
            window.open(clickedObject.userData.link, '_blank');
          }
      }
    }

}
