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
        this.objects = [];
        this.uploaded_objects = [];
        this.scene = new THREE.Scene();
        this.roomURL = new URL('../assets/warroom1.glb', import.meta.url);

        // initialize geometries
        this.model;
        this.modelSize;
        this.gridSize;
        this.gridScale = 0.1; // meter
        await this.initGeometries(this.scene);

        // initialize camera
        this.camera = new DynamicCamera(this.canvas, this.modelSize); // initializes to orthoCamera
        this.currentCamera = this.camera.ortho;

        // initialize renderer
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( this.canvas.devicePixelRatio );
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        this.canvas.appendChild( this.renderer.domElement );


        console.log(this.gridSize)
        console.log(this.gridScale)
        // initialize controls 
        this.controls = new DemoControls(this.camera, this.canvas, this.objects, this.gridSize, this.gridScale); // initializes to orthoControls

        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
    }

    updateObjects () {
        const addedObjects = JSON.parse(document.querySelector('.object-data').dataset.objects);
        addedObjects.forEach((object) => {
            if (! (object.obj_url == '' || this.uploaded_objects.includes(object.obj_url))) {      
                const loader = new THREE.GLTFLoader();
                loader.load(object.obj_url, (gltf) => {
                    this.scene.add(gltf.scene);
                    this.objects.push(gltf.scene);
                    this.uploaded_objects.push(object.obj_url);
                });
            }
        });
    }

    async initGeometries(scene) {

        const ambientLight = new THREE.AmbientLight(0xFFFFFF);
        scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        directionalLight.position.set(-30, 50, 0);
        directionalLight.shadow.camera.bottom = -12;
        // const dLightHelper = new THREE.DirectionalLightHelper(directionalLight);
        // scene.add(dLightHelper);
    
        // const dLightShadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // scene.add(dLightShadowHelper);
        const cubeGeo = new THREE.BoxGeometry();
        const cubeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        scene.add(cube);

        const spotLight = new THREE.SpotLight(0xFFFFFF);
        scene.add(spotLight);
        spotLight.position.set(100, 100, 0);
        spotLight.castShadow = true;
        spotLight.angle = 0.2;
    
        // const sLightHelper = new THREE.SpotLightHelper(spotLight);
        // scene.add(sLightHelper);
        const axesHelper = new THREE.AxesHelper( 5 );
        scene.add( axesHelper );
        const assetLoader = new THREE.GLTFLoader();

        return new Promise((resolve, reject) => {
            assetLoader.load(this.roomURL.href, (gltf) => {
                console.log("loading model");
                this.model = gltf.scene;
                this.objects = this.model.children;
                let bbox = new THREE.Box3().setFromObject(this.model);
                this.modelSize = bbox.getSize(new THREE.Vector3());
                console.log(this.modelSize);
                this.scene.add(this.model);
                this.model.position.set(0, this.modelSize.y / 2, 0);
                const size = Math.max(this.modelSize.x, this.modelSize.z);
                this.gridSize = size;
                const gridHelper = new THREE.GridHelper(size, size / this.gridScale, 0x000000, 0x00ff00);
                scene.add(gridHelper);
                resolve();
            }, undefined, (error) => {
                reject(error);
            });
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
        this.camera.setInsideCamera(this.canvas);
        this.currentCamera = this.camera.inside;
        this.controls.switchControls("inside" , this.objects, this.camera.inside, this.canvas);
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.outside) );
        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.inside) );
    }

    setOutsideViewMode() {
        this.camera.setOutsideCamera(this.canvas);
        this.currentCamera = this.camera.outside;
        this.controls.switchControls("outside", this.objects,this.camera.outside, this.canvas);
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.ortho) );
        this.canvas.removeEventListener( 'resize', this.onWindowResize(this.camera.inside) );
        this.canvas.addEventListener( 'resize', this.onWindowResize(this.camera.outside) );
    }

    setOrthoViewMode() {
        this.updateObjects();
        console.log(this.modelSize)
        this.camera.setOrthoCamera(this.canvas, this.modelSize, 2);
        this.currentCamera = this.camera.ortho;
        this.controls.switchControls("ortho", this.objects, this.camera.ortho, this.canvas);
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
    }
    console.log("set full screen")
});