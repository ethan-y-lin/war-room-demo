import { DynamicCamera } from "./dynamicCamera.js";
import { DemoControls } from "./demoControls.js";

class DemoScene {
    
    constructor() {
        this.initialize().then(() => {
            this.animate();
        });
    }

    async initialize() {
        this.canvas = document.getElementById("scene-container");
        this.objects = {walls: [], 
                        furniture: [],
                        doors: [],
                        windows: [],
                        uploaded_objects: []};
        this.uploaded_objects_url = [];
        this.scene = new THREE.Scene();
        this.roomURL = new URL('../assets/warroom1.glb', import.meta.url);

        // initialize geometries
        this.model;
        this.modelSize;
        this.gridSize;
        this.gridScale = 0.1; // meter
        await this.initGeometries(this.scene);

        // // initialize camera
        this.camera = new DynamicCamera(this.canvas, this.modelSize); // initializes to orthoCamera
        this.currentCamera = this.camera.ortho;

        // // initialize renderer
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( this.canvas.devicePixelRatio );
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        this.canvas.appendChild( this.renderer.domElement );


        console.log(this.objects)
        // initialize controls 
        this.controls = new DemoControls(this.camera, this.canvas, this.scene, this.objects, this.gridSize, this.gridScale, this.modelSize); // initializes to orthoControls

        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
    }

    // shifted up
    openPosition = (obj) => {
        let bbox = new THREE.Box3().setFromObject(obj);
        const shift = bbox.min.y;
        return new THREE.Vector3(0, -shift, 0);
    }

    updateObjects () {
        const addedObjects = JSON.parse(document.querySelector('.object-data').dataset.objects);
        addedObjects.forEach((object) => {
            if (! (object.obj_url == '' || this.uploaded_objects_url.includes(object.obj_url))) {      
                const loader = new THREE.GLTFLoader();
                loader.load(object.obj_url, (gltf) => {
                    const newObject = gltf.scene;
                    newObject.name = object.name;
                    this.scene.add(newObject);

                    // Compute the bounding box of the object
                    const box = new THREE.Box3().setFromObject(newObject, true);

                    // Create a box helper
                    const boxGeometry = new THREE.BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
                    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
                    const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);

                    // const axesHelper = new THREE.AxesHelper(20);
                    // newObject.add(axesHelper);
                    boundingBox.position.set((box.max.x + box.min.x) / 2, (box.max.y + box.min.y) / 2, (box.max.z + box.min.z) / 2)
                    boundingBox.name = "bounding_box";
                    newObject.add(boundingBox);

                    const openPos = this.openPosition(newObject); // find an open position to display the box
                    console.log(openPos);
                    newObject.position.set(openPos.x, openPos.y, openPos.z);
                    console.log(newObject)

                    this.objects.uploaded_objects.push(newObject);
                    this.uploaded_objects_url.push(object.obj_url);
                    this.controls.updateObjects(this.objects);
                });
            }
        });
    }

    async initGeometries(scene) {

        const ambientLight = new THREE.AmbientLight(0x909090);
        scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        directionalLight.position.set(-30, 50, 0);
        directionalLight.shadow.camera.bottom = -12;
        // const dLightHelper = new THREE.DirectionalLightHelper(directionalLight);
        // scene.add(dLightHelper);
    
        // const dLightShadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // scene.add(dLightShadowHelper);

        const spotLight = new THREE.SpotLight(0xFFFFFF);
        scene.add(spotLight);
        spotLight.position.set(100, 100, 0);
        spotLight.castShadow = true;
        spotLight.angle = 0.2;
    
        // const sLightHelper = new THREE.SpotLightHelper(spotLight);
        // scene.add(sLightHelper);
        const axesHelper = new THREE.AxesHelper( 100 );
        scene.add( axesHelper );
        const assetLoader = new THREE.GLTFLoader();

        return new Promise((resolve, reject) => {
            assetLoader.load(this.roomURL.href, (gltf) => {
                console.log("loading model");
                this.model = gltf.scene; // model
                console.log(this.model)
                // get model dimensions
                let bbox = new THREE.Box3().setFromObject(this.model);
                this.modelSize = bbox.getSize(new THREE.Vector3());

                // add model to scene
                this.scene.add(this.model);
                this.model.position.set(0, this.modelSize.y / 2, 0); // makes the ground at y = 0;

                // initialize objects
                const objects = [...this.model.children]; // must be copy because removing direclty will cause some to be skipped.
                
                this.organizeObjects(objects);

                // initializes grid
                const size = Math.max(this.modelSize.x, this.modelSize.z);
                this.gridSize = size;
                const gridHelper = new THREE.GridHelper(size, size / this.gridScale, 0x000000, 0x00ffaa);
                scene.add(gridHelper);
                resolve();
            }, undefined, (error) => {
                reject(error);
            });
        });
    }

    organizeObjects (objects) {
        objects.forEach((obj) =>  {
            if (obj.name.includes("door") || obj.name.includes("wall_11_3") || obj.name.includes("wall_11_4")) {
                this.objects.doors.push(obj);
            } else if (obj.name.includes("window")) {
                this.objects.windows.push(obj);
            } else if (obj.name.includes("wall") || obj.name.includes("floor")) {
                if (obj.children.length > 0) {
                    this.organizeObjects(obj.children);
                } else {
                    this.objects.walls.push(obj);
                }
                this.objects.walls.push(obj);
            } else {
                this.model.remove(obj);
            }
        });
    }
    animate () {
        requestAnimationFrame(() => {
            this.controls.updateControls(this.camera);
            this.renderer.render(this.scene, this.currentCamera);
            this.animate();
        });
    }
    
    onWindowResize(camera){
        camera.aspect = this.canvas.offsetWidth / this.canvas.offsetHeight;
        camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
    }

    setInsideViewMode() {
        this.updateObjects();
        this.camera.setInsideCamera(this.canvas);
        this.currentCamera = this.camera.inside;
        this.controls.switchControls("inside", this.camera.inside, this.canvas);
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.outside) );
        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.inside) );
    }

    setOutsideViewMode() {
        this.camera.setOutsideCamera(this.canvas);
        this.currentCamera = this.camera.outside;
        this.controls.switchControls("outside", this.camera.outside, this.canvas);
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.inside) );
        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.outside) );
    }

    setOrthoViewMode() {
        this.updateObjects();
        console.log(this.modelSize)
        this.camera.setOrthoCamera(this.canvas, this.modelSize, 2);
        this.currentCamera = this.camera.ortho;
        this.controls.switchControls("ortho", this.camera.ortho, this.canvas);
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.outside) );
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.inside) );
        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
    }
}

const APP = new DemoScene();

$('#inside-view').on('click', function(){
    APP.setInsideViewMode();
})
$('#outside-view').on('click', function(){
    APP.setOutsideViewMode();
})
$('#ortho-view').on('click', function(){
    APP.setOrthoViewMode();
})

$('#fullscreen-button').on('click', function(){
    if (APP.renderer.domElement.requestFullscreen){
        APP.renderer.domElement.requestFullscreen();
    } else if (APP.renderer.domElement.webkitRequestFullscreen){
        APP.renderer.domElement.webkitRequestFullscreen();
    } else if (APP.renderer.domElement.msRequestFullscreen){
        APP.renderer.domElement.msRequestFullscreen();
    }
    if (APP.camera.name == "inside") {
        APP.controls.hideBlocker();
        APP.controls.pointerLock.isLocked = true;
        APP.renderer.domElement.addEventListener( 'mousemove', APP.controls.lock);
    } else if (APP.camera.name == "ortho") {
        APP.renderer.domElement.addEventListener('keyup', APP.controls.orthoOnKeyUp);
        APP.renderer.domElement.addEventListener('keydown', APP.controls.orthoOnKeyDown);
        APP.renderer.domElement.addEventListener('click', APP.controls.orthoOnClick);
    }
    console.log("set full screen")
});