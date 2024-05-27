import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import * as dat from 'dat.gui';
import { FirstPersonControls } from './FirstPersonControls.js';
import { FirstPersonCamera } from './FirstPersonCamera.js';
const roomUrl = new URL('../assets/warroom.glb', import.meta.url);
const cleanRoomURL = new URL('../assets/roommodemodel.glb', import.meta.url);
const renderer = new THREE.WebGLRenderer();
const canvas = document.getElementById('scene-container');
renderer.shadowMap.enabled = true;
console.log(canvas);
renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
canvas.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45, 
    canvas.offsetWidth / canvas.offsetHeight, 
    0.1, 
    1000
);

const orbit = new OrbitControls(camera, renderer.domElement);
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

camera.position.set(-10, 30, 30);
orbit.update();

const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFFFFF,
    side: THREE.DoubleSide
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

const gridHelper = new THREE.GridHelper(30);
scene.add(gridHelper);

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.castShadow = true;
scene.add(directionalLight);
directionalLight.position.set(-30, 50, 0);
directionalLight.shadow.camera.bottom = -12;
const dLightHelper = new THREE.DirectionalLightHelper(directionalLight);
scene.add(dLightHelper);

const dLightShadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
scene.add(dLightShadowHelper);

const spotLight = new THREE.SpotLight(0xFFFFFF);
scene.add(spotLight);
spotLight.position.set(100, 100, 0);
spotLight.castShadow = true;
spotLight.angle = 0.2;

const sLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(sLightHelper);

const assetLoader = new GLTFLoader();
let modelSize = new THREE.Vector3();
assetLoader.load(cleanRoomURL.href, (gltf) => {
    model = gltf.scene;
    let bbox = new THREE.Box3().setFromObject(model);
    modelSize = bbox.getSize(new THREE.Vector3());
    console.log(modelSize);
    scene.add(model);
    model.position.set(0, modelSize.y / 2, 0);
});

const gui = new dat.GUI();

const options = {
    angle: 0.2,
    penumbra: 0,
    intensity: 1,
};
function feetToMeters(feetVector){
    return new THREE.Vector3(feetVector.x * 0.3048, feetVector.y * 0.3048, feetVector.z * 0.3048);
}
let inside = false;
let roof = new THREE.Mesh();

const insideCamera = new THREE.PerspectiveCamera(
    120, 
    canvas.offsetWidth / canvas.offsetHeight, 
    0.1, 
    1000
);
insideCamera.position.set(0, 1.71, 0);
const fpsCamera = new FirstPersonCamera(insideCamera, canvas);


// let controls = new FirstPersonControls(insideCamera, renderer.domElement);
// controls.lookSpeed = 0.1;
// controls.movementSpeed = 1;
// controls.constrainVertical = true;
function setInsideViewMode(){
    inside = true;
    const geometry = new THREE.BoxGeometry( modelSize.x, modelSize.y/20, modelSize.z ); 
    const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    roof = new THREE.Mesh( geometry, material );
    scene.add(roof);
    roof.position.set(0, modelSize.y, 0);
    renderer.render(scene, insideCamera);
    orbit.enabled = false;
    // controls.enabled = true;
}

function animateInside(){
    fpsCamera.update(0.02);
    renderer.render(scene, insideCamera);
}

function setOutsideViewMode(){
    // controls.enabled = false;
    inside=false;
    scene.remove(roof);
    renderer.render(scene, camera);
    orbit.enabled = true;
}
gui.add(options, 'angle', 0, 1);
gui.add(options, 'penumbra', 0, 1);
gui.add(options, 'intensity', 0, 1);

function animate(time) {
    if (inside){
        animateInside();
    } else {
        renderer.render(scene, camera);
        spotLight.angle = options.angle;
        spotLight.penumbra = options.penumbra;
        spotLight.intensity = options.intensity;
        sLightHelper.update();
    }
}


renderer.render(scene, camera);
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
});

const insideViewButton = document.getElementById('inside-view');
insideViewButton.addEventListener('click', setInsideViewMode);

const outsideViewButton = document.getElementById('outside-view');
outsideViewButton.addEventListener('click', setOutsideViewMode);