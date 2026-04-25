// Generated using Google Gemini

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

let scene, camera, renderer, controls, pulseLight;
let currentModel;

const defaultModelColor = new THREE.Color(0x00aaff);

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 60);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 20;
    controls.maxDistance = 200;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    pulseLight = new THREE.PointLight(0x00aaff, 5, 200);
    pulseLight.position.set(0, 0, -20);
    scene.add(pulseLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight1.position.set(50, 50, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-50, -50, -50);
    scene.add(dirLight2);

    window.loadSTL = () => loadModel('./assets/models/stl/tampa-devs.stl', defaultModelColor);
    window.loadOBJ = () => loadModel('./assets/models/obj/tdev.obj', defaultModelColor); 

    window.loadOBJ();

    window.addEventListener('resize', onWindowResize);

    animate();
}

function loadModel(filePath, fallbackColor = defaultModelColor) {
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        currentModel = null;
    }

    const fileName = filePath.split('/').pop();
    document.getElementById('model-name').innerText = `Loading: ${fileName}...`;

    const extension = fileName.split('.').pop().toLowerCase();

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const percent = ((itemsLoaded / itemsTotal) * 100).toFixed(2);
        document.getElementById('model-name').innerText = `Loading: ${fileName} (${percent}%)`;
    };
    loadingManager.onLoad = () => {
        document.getElementById('model-name').innerText = `Model: ${fileName}`;
        console.log(`Finished loading ${fileName}`);
    };
    loadingManager.onError = (url) => {
        console.error('Error loading ' + url);
        document.getElementById('model-name').innerText = `Error loading: ${fileName}`;
    };


    if (extension === 'stl') {
        const loader = new STLLoader(loadingManager);
        loader.load(filePath, function (geometry) {
            const material = new THREE.MeshStandardMaterial({
                color: fallbackColor,
                metalness: 0.7,
                roughness: 0.3
            });
            currentModel = new THREE.Mesh(geometry, material);
            processAndAdd(currentModel);
        });
    } else if (extension === 'obj') {
        const objLoader = new OBJLoader(loadingManager);
        const mtlPath = filePath.replace('.obj', '.mtl');

        const mtlLoader = new MTLLoader(loadingManager);
        mtlLoader.load(mtlPath,
            function (materials) {
                materials.preload(); // Preload textures/materials

                // This line passes the loaded materials object to the OBJLoader
                objLoader.setMaterials(materials);

                objLoader.load(filePath, function (object) {
                    currentModel = object;

                    let assignedMTLMaterials = 0;
                    // --- NEW LOGIC: Explicitly apply MeshStandardMaterial from parsed MTL properties ---
                    currentModel.traverse((child) => {
                        if (child.isMesh) {
                            // The child.material.name comes from the 'usemtl' in the OBJ file.
                            // The `materials` object from MTLLoader contains the parsed MTL materials.
                            const mtlMaterial = materials.materials[child.material.name];

                            if (mtlMaterial && mtlMaterial.isMaterial && mtlMaterial.color) {
                                // Create a new MeshStandardMaterial with the color from the MTL
                                child.material = new THREE.MeshStandardMaterial({
                                    color: mtlMaterial.color,
                                    map: mtlMaterial.map, // Apply texture map if present
                                    metalness: 0.7, // Maintain our desired PBR properties
                                    roughness: 0.3
                                });
                                assignedMTLMaterials++;
                                console.log(`[OBJ] Assigned MTL material '${mtlMaterial.name}' (color: ${mtlMaterial.color.getHexString()}) to mesh '${child.name}'.`);
                            } else {
                                // Fallback if no matching material found by name, or if MTL material lacks color
                                child.material = new THREE.MeshStandardMaterial({
                                    color: fallbackColor,
                                    metalness: 0.7,
                                    roughness: 0.3
                                });
                                console.warn(`[OBJ] Applying fallback material to mesh '${child.name}' as no suitable MTL material was found or color missing.`);
                            }
                        }
                    });

                    if (assignedMTLMaterials > 0) {
                        console.log(`[OBJ] Successfully applied colors to ${assignedMTLMaterials} meshes from MTL.`);
                    } else {
                        console.warn(`[OBJ] No meshes received explicit colors from MTL; fallback materials used for all parts.`);
                    }

                    processAndAdd(currentModel);
                });
            },
            undefined, // Progress callback is handled by loadingManager
            function (error) { // MTL loading error callback
                console.warn(`[OBJ/MTL] Could not load MTL for ${fileName} at ${mtlPath}:`, error);
                console.warn(`[OBJ/MTL] Attempting to load OBJ without MTL...`);
                // If MTL fails, load OBJ directly and apply a fallback material
                objLoader.load(filePath, function (object) {
                    currentModel = object;
                    currentModel.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: fallbackColor,
                                metalness: 0.7,
                                roughness: 0.3
                            });
                            console.warn(`[OBJ] Applying fallback material to mesh '${child.name}' because MTL file failed to load.`);
                        }
                    });
                    console.warn(`[OBJ] Model loaded without MTL materials; fallback materials used for all parts.`);
                    processAndAdd(currentModel);
                });
            }
        );
    } else {
        console.error('Unsupported file type: ' + extension);
        document.getElementById('model-name').innerText = `Unsupported file type: ${fileName}`;
        return;
    }
}

function processAndAdd(object) {
    scene.add(object);

    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    object.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 30;
    const scaleFactor = targetSize / maxDim;
    object.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const cameraDistance = maxDim * scaleFactor * 1.5;
    camera.position.set(cameraDistance, cameraDistance * 0.5, cameraDistance);
    controls.target.set(0, 0, 0);
    controls.update();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (pulseLight) {
        const time = performance.now() * 0.001;
        pulseLight.intensity = 5 + Math.sin(time * 2) * 2.5;
    }

    if (currentModel) {
        currentModel.rotation.z += 0.002;
    }

    renderer.render(scene, camera);
}

init();
