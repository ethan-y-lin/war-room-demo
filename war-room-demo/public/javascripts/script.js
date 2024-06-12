let outsideCamera, insideCamera, insideCameraBB, scene, renderer, orbit, controls, orthoCamera;
const canvas = document.getElementById("scene-container");
const cleanRoomURL = new URL('../assets/warroom1.glb', import.meta.url);
let objects = [];
let boundingBoxes;
let model;
let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let inside = false;
let outside = false;
let ortho = true;
let modelSize = new THREE.Vector3();
let roof = new THREE.Mesh();
const blocker = document.getElementById( 'blocker' );
const instructions = document.getElementById( 'instructions' );

let dragControls;
let startColor;

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

    const assetLoader = new THREE.GLTFLoader();
    let modelSize = new THREE.Vector3();
    assetLoader.load(cleanRoomURL.href, (gltf) => {
        model = gltf.scene;
        objects = model.children;
        let bbox = new THREE.Box3().setFromObject(model);
        modelSize = bbox.getSize(new THREE.Vector3());
        scene.add(model);
        model.position.set(0, modelSize.y / 2, 0);
    });
}

function setCameraBB (insideCamera, insideCameraBB) {
    let minBox = new THREE.Vector3(insideCamera.position.x-0.01, 
        insideCamera.position.y-0.01,
        insideCamera.position.z-0.01);
    let maxBox = new THREE.Vector3(insideCamera.position.x+0.01, 
            insideCamera.position.y,
            insideCamera.position.z+0.01);  
    insideCameraBB.set(minBox, maxBox);
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
    insideCamera.position.set(5, 1.71, 5);
    insideCameraBB = new THREE.Box3();
    setCameraBB(insideCamera, insideCameraBB);

    // orthographic camera
    orthoCamera = new THREE.OrthographicCamera(
        -canvas.offsetWidth/128,
        canvas.offsetWidth/128,
        canvas.offsetHeight/128,
        -canvas.offsetHeight/128,
        0.1,
        1000
    );
    orthoCamera.position.set(0, 10, 0);
    orthoCamera.up.set (0, 0, -1);
    orthoCamera.lookAt(0, 0, 0);

    // outside controls
    orbit = new THREE.OrbitControls(outsideCamera, canvas);
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    orbit.update();

    // inside controls
    controls = new THREE.PointerLockControls(insideCamera, canvas);
    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

    initGeometries(scene);
    console.log(objects)
    //drag controls
    dragControls = new THREE.DragControls(objects, orthoCamera, canvas);
}

function onWindowResize(){
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
}

function dragStartCallback(event){
    console.log("drag start");
    startColor = event.object.material.color.getHex();
    event.object.material.color.setHex(0xff0000);
}
function dragEndCallback(event){
    console.log("drag end");
    event.object.material.color.setHex(startColor);
}


function animateInside() {
    const time = performance.now();

    if ( controls.isLocked === true ) {
        const delta = ( time - prevTime ) / 1000;

        velocity.x -= velocity.x * 20.0 * delta;
        velocity.z -= velocity.z * 20.0 * delta;

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( moveForward || moveBackward ) velocity.z -= direction.z * 50.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 50.0 * delta;
        controls.moveRight( - velocity.x * delta );
        controls.moveForward( - velocity.z * delta );
        setCameraBB(insideCamera, insideCameraBB);
        let collision = checkCollisions(insideCameraBB, boundingBoxes)
        if (collision.hasCollision && collision.collidedObject.name != "wall_11") {
            console.log(collision.collidedObject)
            controls.moveRight(velocity.x * delta );
            controls.moveForward(velocity.z * delta );
            console.log("collision")
            setCameraBB(insideCamera, insideCameraBB);
            velocity.x = 0;
            velocity.z = 0;
        }
    }
    prevTime = time;
    renderer.render( scene, insideCamera );
}

function animate(time) {
    if (inside){
        animateInside();
    } else if (outside){
        renderer.render(scene, outsideCamera);
        console.log("outside");
    } else if (ortho){
        renderer.render(scene, orthoCamera);
        console.log("ortho");
    }
}


function lock () {
    console.log("hi")
    controls.lock();
}

function hideBlocker(){
    instructions.style.display = 'none';
    blocker.style.display = 'none';
}

function showBlocker(){
    blocker.style.display = 'block';
    instructions.style.display = '';
}

function setInsideViewMode(){
    inside = true;
    outside = false;
    ortho = false;
    const geometry = new THREE.BoxGeometry( modelSize.x, modelSize.y/20, modelSize.z ); 
    const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    roof = new THREE.Mesh( geometry, material );
    scene.add(roof);
    roof.position.set(0, modelSize.y, 0);
    renderer.render(scene, insideCamera);
    orbit.enabled = false;
    dragControls.enabled = false;
    controls.enabled = true;
    showBlocker();
    instructions.addEventListener( 'click', lock);
    controls.addEventListener( 'lock', hideBlocker);
    controls.addEventListener( 'unlock', showBlocker);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',onKeyUp);
    dragControls.removeEventListener('dragstart', dragStartCallback);
    dragControls.removeEventListener('dragend', dragEndCallback);
    boundingBoxes = getBoundingBoxes(objects);
}

function setOutsideViewMode(){
    dragControls.enabled = false;
    console.log(dragControls.enabled);
    controls.enabled = false;
    inside = false;
    outside = true;
    ortho = false;
    scene.remove(roof);
    renderer.render(scene, outsideCamera);
    orbit.enabled = true;
    console.log(orbit)
    hideBlocker();
    instructions.removeEventListener( 'click', lock);
    controls.removeEventListener('lock', hideBlocker);
    controls.removeEventListener('unlock', showBlocker);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup',onKeyUp);
    dragControls.removeEventListener('dragstart', dragStartCallback);
    dragControls.removeEventListener('dragend', dragEndCallback);
}

function updateObjects() {
    const addedObjects = JSON.parse(document.querySelector('.object-data').dataset.objects);
    console.log(addedObjects)
    console.log(typeof(addedObjects))
    addedObjects.forEach((object) => {
        if (object.obj_url != '') {        
            const loader = new THREE.GLTFLoader();
            loader.load(object.obj_url, function (gltf) {
                scene.add(gltf.scene);
                console.log(gltf.scene)
                objects.push(gltf.scene);
            });
        }
    });
}
function setOrthoViewMode(){
    updateObjects();
    dragControls = new THREE.DragControls(objects, orthoCamera, canvas);
    dragControls.addEventListener('dragstart', dragStartCallback);
    dragControls.addEventListener('dragend', dragEndCallback);
    dragControls.enabled = true;
    controls.enabled = false;
    inside = false;
    outside = false;
    ortho = true;
    scene.remove(roof);
    orbit.enabled = false;
    renderer.render(scene, orthoCamera);
    hideBlocker();
    instructions.removeEventListener( 'click', lock);
    controls.removeEventListener('lock', hideBlocker);
    controls.removeEventListener('unlock', showBlocker);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup',onKeyUp);
}


function hasDoor (object) {
    console.log(object)
    if (object.name.includes("door")){
        return true;
    }
    if (object.children.length == 0) {
        return false;
    }
    let bool = false;
    for (let i = 0; i < object.children.length; i++) {
        bool = bool || hasDoor(object.children[i]);
    }
    return bool;
} 

function getBoundingBoxes (objects) {
    console.log(objects);
    let boxes = [];
    for (let i = 0; i < objects.length; i++) {
        if (hasDoor(objects[i])){
             for (let j = 0; j < objects[i].children.length; j++){
                if (!objects[i].children[j].name.includes("door")){
                    const boundingBox = new THREE.Box3().setFromObject( objects[i].children[j] );
                    boxes.push([boundingBox,i]); 
                }else{
                    console.log("door")
                }
             }
        }else {
            const boundingBox = new THREE.Box3().setFromObject( objects[i] );
            boxes.push([boundingBox, i]);
        }

    }
    console.log(boxes)
    return boxes;
}

function checkCollisions(box, boundingBoxes){
    for (let i = 0; i < boundingBoxes.length; i++) {
        if (box.intersectsBox(boundingBoxes[i][0])) {
            return {hasCollision: true, collidedObject: objects[boundingBoxes[i][1]]};
        }
    }
    return false;
}

$('#inside-view').on('click', function(){
    setInsideViewMode();
})
$('#outside-view').on('click', function(){
    setOutsideViewMode();
})
$('#ortho-view').on('click', function(){
    setOrthoViewMode();
})

$('#fullscreen-button').on('click', function(){
    if (renderer.domElement.requestFullscreen){
        renderer.domElement.requestFullscreen();
    } else if (renderer.domElement.webkitRequestFullscreen){
        renderer.domElement.webkitRequestFullscreen();
    } else if (renderer.domElement.msRequestFullscreen){
        renderer.domElement.msRequestFullscreen();
    }
    if (inside) {
        hideBlocker();
        controls.isLocked = true;
        renderer.domElement.addEventListener( 'mousemove', lock);
    }
    console.log("set full screen")
});

init();
renderer.setAnimationLoop(animate);