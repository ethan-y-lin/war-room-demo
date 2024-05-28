import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import * as dat from 'dat.gui';
import { PointerLockControls } from 'three/examples/jsm/Addons.js';
import { outputStruct } from 'three/examples/jsm/nodes/Nodes.js';


let outsideCamera, insideCamera, insideCameraBB, scene, renderer, orbit, controls;
const canvas = document.getElementById("scene-container");
const cleanRoomURL = new URL('../assets/roommodemodel.glb', import.meta.url);
let objects = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let inside = false;
let modelSize = new THREE.Vector3();
let roof = new THREE.Mesh();

const onKeyDown = function ( event ) {

    switch ( event.code ) {

        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
    }

};

const onKeyUp = function ( event ) {

    switch ( event.code ) {

        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;

    }
};


function initGeometries(scene) {
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
        objects = model.children;
        console.log(model);
        let bbox = new THREE.Box3().setFromObject(model);
        modelSize = bbox.getSize(new THREE.Vector3());
        console.log(modelSize);
        scene.add(model);
        model.position.set(0, modelSize.y / 2, 0);
    });
}

function init() {
    scene = new THREE.Scene();
    // initialize renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( canvas.devicePixelRatio );
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    canvas.appendChild( renderer.domElement );
    canvas.addEventListener( 'resize', onWindowResize );
    // outside camera
    outsideCamera = new THREE.PerspectiveCamera(
        45, 
        canvas.offsetWidth / canvas.offsetHeight, 
        0.1, 
        1000
    );
    outsideCamera.position.set(-10, 30, 30);

    // inside camera
    insideCamera = new THREE.PerspectiveCamera(
        120, 
        canvas.offsetWidth / canvas.offsetHeight, 
        0.1, 
        1000
    );
    insideCamera.position.set(0, 1.71, 0);
                                    // let minBox = new THREE.Vector3(insideCamera.position.x-0.5, 
                                    //                                insideCamera.position.y-1.71,
                                    //                                insideCamera.position.z-0.5);
                                    // let maxBox = new THREE.Vector3(insideCamera.position.x+0.5, 
                                    //                                 insideCamera.position.y,
                                    //                                 insideCamera.position.z+0.5);                          
                                    // insideCameraBB = new THREE.Box3(minBox, maxBox);
    // outside controls
    orbit = new OrbitControls(outsideCamera, renderer.domElement);
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    orbit.update();

    // inside controls
    controls = new PointerLockControls(insideCamera, canvas);

    const blocker = document.getElementById( 'blocker' );

	const instructions = document.getElementById( 'instructions' );
    instructions.addEventListener( 'click', function () {

        controls.lock();

    } );

    controls.addEventListener( 'lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    } );

    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup',onKeyUp);
    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

    // initialize geometries
    initGeometries(scene);
}

function onWindowResize(){
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
}



function animateInside() {
    requestAnimationFrame( animate );

    const time = performance.now();

    if ( controls.isLocked === true ) {
        const delta = ( time - prevTime ) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;
        let temp = new THREE.Vector3(-velocity.x * delta + insideCamera.position.x, 
                                     insideCamera.position.y, 
                                     - velocity.z * delta + insideCamera.position.z);
        if (!checkCollisions(temp, objects)) {
            controls.moveRight( - velocity.x * delta );
            controls.moveForward( - velocity.z * delta );
        }
    }
    prevTime = time;
    renderer.render( scene, insideCamera );
}

function animate(time) {
    if (inside){
        animateInside();
    } else {
        renderer.render(scene, outsideCamera);
    }
}

function setInsideViewMode(){
    inside = true;
    const geometry = new THREE.BoxGeometry( modelSize.x, modelSize.y/20, modelSize.z ); 
    const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    roof = new THREE.Mesh( geometry, material );
    scene.add(roof);
    roof.position.set(0, modelSize.y, 0);
    renderer.render(scene, insideCamera);
    orbit.enabled = false;
    controls.enabled = true;
}

function setOutsideViewMode(){
    controls.enabled = false;
    inside=false;
    scene.remove(roof);
    renderer.render(scene, outsideCamera);
    orbit.enabled = true;
}

function checkCollisions(camera, objects){
    for (let i = 0; i < objects.length; i++) {
        const boundingBox = new THREE.Box3().setFromObject( objects[i] );
        if (boundingBox.containsPoint( camera.position )) {
            return true;
        }
    }
    return false;
}


const insideViewButton = document.getElementById('inside-view');
insideViewButton.addEventListener('click', setInsideViewMode);

const outsideViewButton = document.getElementById('outside-view');
outsideViewButton.addEventListener('click', setOutsideViewMode);

init();
renderer.setAnimationLoop(animate);