import { DynamicCamera } from "./dynamicCamera.js";
import { DemoControls } from "./demoControls.js";
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

/**
 * This class represents a scene that is displayed on the HTML element 
 * with the id: "#scene-container". It handles the contents of the scene,
 * rendering the scene, and animating the scene using THREEJS and custom
 * camera and control classes.
*/

class DemoScene {

    /**
     * The canvas HTML element with id: "#scene-container".
     * @type {object} (HTML DOM element)
     * @private 
     */
    #canvas; 

    /**
     * The ThreeJS scene object that is rendered.
     * @type {Scene}
     * @private
     */
    #scene;

    /**
     * The ThreeJS renderer object that renders the scene.
     * @type {Renderer}
     * @private
     */
    #renderer;

    /**
     * The ThreeJs objects in the scene. All the objects are separated
     * into distinct groups upon calling organizeObjects. 
     * The groups are the following:
     *  - walls (includes walls and floors)
     *  - furniture 
     *  - doors
     *  - windows
     *  - uploaded
     * @type {Map<String, Array.<Object3D>>}
     * @private
     */
    #objects; // objects in the scene

    /**
     * The url of objects uploaded from MongoDB.
     * @type {Array.<String>}
     * @private
     */
    #uploaded_objects_url; 

    /**
     * URL object linking to the room/model .glb/obj file.
     * @type {URL}
     * @private
     */
    #roomURL; 
    
    /**
     * The loaded .glb/obj room/model.
     * @type {}
     * @private
     */
    #model;

    /**
     * The dimensions of the scene.
     * @type {Vector3}
     * @private
     */
    #modelSize;

    /**
     * 
     */
    #gridSize;
    #gridScale;

    /**
     * The custom camera object that contains the camera information
     * for each of the three views, "ortho", "outside", and "inside".
     * @type {DynamicCamera}
     * @private
     */
    #camera;

    #current_camera;

    /**
     * The custom controls object that directs the controls for 
     * interacting with the scene depending on which view and mode.
     * @type {DemoControls}
     * @private
     */
    #controls;

    /**
     * 
     */
    #measurement_objects;

    /**
     * Calls for the initialization the DemoScene object and then
     * calls the animation loop when initialization is completed.
     * @param {URL} roomURL 
     */
    constructor(roomURL) {
        this.#initialize(roomURL).then(() => {
            this.#animate();
        });
    }

    /**
     * Initializes the DemoScene object given the room URL.  
     * @param {URL} roomURL 
     */
    async #initialize(roomURL) {
        this.#canvas = document.getElementById("scene-container");
        this.#objects = {walls: [], 
                        furniture: [],
                        doors: [],
                        windows: [],
                        uploaded: []};
        this.#uploaded_objects_url = [];
        this.#scene = new THREE.Scene();
        // this.roomURL = new URL('../assets/warroom1.glb', import.meta.url);
        this.#roomURL = roomURL;

        // initialize geometries
        this.#gridScale = 0.1; // meter
        await this.#initGeometries(this.#scene);

        // // initialize camera
        this.#camera = new DynamicCamera(this.#canvas, this.#modelSize); // initializes to orthoCamera
        this.#current_camera = this.#camera.ortho;

        // // initialize renderer
        this.#renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.#renderer.setPixelRatio( this.#canvas.devicePixelRatio );
        this.#renderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight);
        this.#canvas.appendChild( this.#renderer.domElement );
        
        console.log(this.#objects)
        // initialize controls 
        this.#controls = new DemoControls(this.#camera, this.#canvas, this.#scene, this.#objects, this.#gridSize, this.#gridScale, this.#modelSize); // initializes to orthoControls

        this.#canvas.addEventListener( 'resize', this.#onWindowResize(this.#camera.ortho) );
        this.#measurement_objects = {vertices: new THREE.Group(), edges: new THREE.Group()};
        this.#measurement_objects.vertices.name = "vertices";
        this.#measurement_objects.edges.name = "edges";
        this.#scene.add(this.#measurement_objects.vertices);
        this.#scene.add(this.#measurement_objects.edges);
    }

    // shifted up
    openPosition = (obj) => {
        let bbox = new THREE.Box3().setFromObject(obj);
        const shift = bbox.min.y;
        return new THREE.Vector3(0, -shift, 0);
    }

    // PROBABLY WILL HAVE TO CHANGE DRASTICALLY
    #updateObjects () {
        const addedObjects = JSON.parse(document.querySelector('.object-data').dataset.objects);
        addedObjects.forEach((object) => {
            if (! (object.obj_url == '' || this.#uploaded_objects_url.includes(object.obj_url))) {      
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

                    this.objects.uploaded.push(newObject);
                    this.uploaded_objects_url.push(object.obj_url);
                    this.controls.updateObjects(this.objects);
                });
            }
        });
    }

    /**
     * Initializes the geometries and lights in the given scene.
     * Adds various types of lights to the scene and sets up a GUI for toggling them.
     * Loads a 3D model and adds it to the scene along with helper objects.
     *
     * @async
     * @private
     * @param {THREE.Scene} scene - The scene to which the geometries and lights will be added.
     * @returns {Promise<void>} A promise that resolves when the geometries and model have been added to the scene.
     */
    async #initGeometries(scene) {
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x543b0e, 0.6);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const ambientLight = new THREE.AmbientLight(0x7c7c7c);
        scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
        directionalLight.color.setHSL(0.1, 1, 0.95);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        directionalLight.position.set(-30, 50, 0);
        directionalLight.shadow.camera.bottom = -12;

        const spotLight = new THREE.SpotLight(0xFFFFFF);
        scene.add(spotLight);
        spotLight.position.set(100, 100, 0);
        spotLight.castShadow = true;
        spotLight.angle = 0.2;

        const params = {
            toggleHemisphereLight: function() {
                hemiLight.visible = ! hemiLight.visible;
            },
            toggleAmbientLight: function() {
                ambientLight.visible = ! ambientLight.visible;
            },
            toggleDirectionalLight: function() {
                directionalLight.visible = ! directionalLight.visible;
            },
            toggleSpotLight: function (){
                spotLight.visible = ! spotLight.visible;
            }
        };

        const gui = new GUI();

        gui.add( params, 'toggleHemisphereLight' ).name( 'toggle hemisphere light' );
        gui.add( params, 'toggleAmbientLight' ).name( 'toggle ambient light' );
        gui.add( params, 'toggleDirectionalLight' ).name( 'toggle directional light' );
        gui.add( params, 'toggleSpotLight' ).name( 'toggle spot light' );
        gui.open();
        
        const axesHelper = new THREE.AxesHelper( 100 );
        scene.add( axesHelper );
        const assetLoader = new THREE.GLTFLoader();

        return new Promise((resolve, reject) => {
            assetLoader.load(this.#roomURL.href, (gltf) => {
                console.log("loading model");
                this.#model = gltf.scene; // model

                // get model dimensions
                let bbox = new THREE.Box3().setFromObject(this.#model);
                this.#modelSize = bbox.getSize(new THREE.Vector3());

                // add model to scene
                scene.add(this.#model);
                this.#model.position.set(0, this.#modelSize.y / 2, 0); // makes the ground at y = 0;

                // initialize objects
                const objects = [...this.#model.children]; // must be copy because removing directly will cause some to be skipped.
                this.#organizeObjects(objects);

                // initializes grid
                const size = Math.max(this.#modelSize.x, this.#modelSize.z);
                this.#gridSize = size;
                const gridHelper = new THREE.GridHelper(size, size / this.#gridScale, 0x000000, 0x00ffaa);
                scene.add(gridHelper);
                resolve();
            }, undefined, (error) => {
                reject(error);
            });
        });
    }

    /**
     * Organizes objects in the scene by categorizing them into doors, windows, walls, and removing irrelevant objects.
     * The organization is based on the names of the objects. 
     * If an object has children, it recursively organizes the child objects.
     *
     * @private
     * @param {Array<THREE.Object3D>} objects - The array of 3D objects to be organized.
     */
    #organizeObjects (objects) {
        objects.forEach((obj) =>  {
            if (obj.children.length > 0) {
                this.#organizeObjects(obj.children);
                return;
            }  
            if (obj.name.includes("door")) {
                this.#objects.doors.push(obj);
            } else if (obj.name.includes("window")) {
                this.#objects.windows.push(obj);
            } else if (obj.name.includes("wall") || obj.name.includes("floor")) {
                this.#objects.walls.push(obj);
                if(obj.name.includes("floor")){
                    obj.material.color.setHex(0x8b5a2b);
                } else if(obj.name.includes("floor")){
                    obj.material.color.setHex(0xedeae5);
                }
            } else {
                this.#model.remove(obj);
            }
        });
    }

    /**
     * Updates the scene based on the current control mode and measurements.
     * 
     * In "measure" mode, it adds or removes measurement points and lines in the scene, 
     * and updates the displayed measurement distance. If measurements are cleared or reset, 
     * it also clears the measurement objects from the scene.
     * 
     * If not in "measure" mode, it resets the measurement objects and the displayed distance.
     * 
     * @private
     */
    #updateScene() {
        const displayDistanceElement = document.getElementById("measure-distance");
        if (this.#controls.mode == "measure") {
            if (this.#controls.measurements.length > this.#measurement_objects.vertices.children.length) {

                const cubeGeometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 ); 
                const cubeMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff} ); 
                const cube = new THREE.Mesh( cubeGeometry, cubeMaterial ); 
                const point = this.#controls.measurements[this.#controls.measurements.length-1];
                cube.position.set(point.x, point.y, point.z);
                this.#measurement_objects.vertices.add( cube );
                const lineGeometry = new THREE.BufferGeometry().setFromPoints( this.#controls.measurements );
                const lineMaterial = new THREE.LineBasicMaterial({
                                        color: 0x0000ff
                                    });
                const line = new THREE.Line( lineGeometry, lineMaterial );
                this.#measurement_objects.edges.add( line );
            } else if (this.#controls.measurements.length < this.#measurement_objects.vertices.children.length) {
                displayDistanceElement.textContent = "0";
                this.#measurement_objects.vertices.clear();
                this.#measurement_objects.edges.clear();
                return;
            }
            if (this.#controls.measurements.length == 2) {
                const dist = this.#controls.measurements[0].distanceTo(this.#controls.measurements[1]);
                displayDistanceElement.textContent = dist + " meters";
            }
        } else {
            const displayDistanceElement = document.getElementById("measure-distance");
            displayDistanceElement.textContent = 0;
            this.#measurement_objects.vertices.clear();
            this.#measurement_objects.edges.clear();
        }


    }

    /**
     * Animates the scene by continuously updating and rendering it.
     * 
     * This function uses `requestAnimationFrame` to create a loop that:
     * 1. Updates the scene.
     * 2. Updates the controls based on the current camera.
     * 3. Renders the scene using the current camera.
     * 4. Recursively calls itself to continue the animation loop.
     *
     * @private
     */
    #animate () {
        requestAnimationFrame(() => {
            this.#updateScene();
            this.#controls.updateControls(this.#camera);
            this.#renderer.render(this.#scene, this.#current_camera);
            this.#animate();
        });
    }
    
    /**
     * 
     * @param {*} camera 
     */
    #onWindowResize(camera){
        console.log("window resized");
        const width = this.#canvas.offsetWidth;
        const height = this.#canvas.offsetHeight;
        // camera.aspect = this.canvas.offsetWidth / this.canvas.offsetHeight;
        camera.aspect = width/height;
        camera.updateProjectionMatrix();
        this.#renderer.setSize(width, height, false);
        console.log(width);
    }

    /**
     * Sets the scene view to inside mode by updaing camera, controls, and objects.
     */
    setInsideViewMode() {
        this.#updateObjects();
        this.#camera.setInsideCamera(this.#canvas);
        this.#current_camera = this.#camera.inside;
        this.#controls.switchControls("inside", this.#camera.inside, this.#canvas);
        this.#canvas.removeEventListener( 'resize', this.#onWindowResize(this.#camera.ortho) );
        this.#canvas.removeEventListener( 'resize', this.#onWindowResize(this.#camera.outside) );
        this.#canvas.addEventListener( 'resize', this.#onWindowResize(this.#camera.inside) );
    }
    /**
     * Sets the scene view to outside mode by updaing camera, controls, and objects.
     */
    setOutsideViewMode() {
        this.#camera.setOutsideCamera(this.#canvas);
        this.#current_camera = this.#camera.outside;
        this.#controls.switchControls("outside", this.#camera.outside, this.#canvas);
        this.#canvas.removeEventListener( 'resize', this.#onWindowResize(this.#camera.ortho) );
        this.#canvas.removeEventListener( 'resize', this.#onWindowResize(this.#camera.inside) );
        this.#canvas.addEventListener( 'resize', this.#onWindowResize(this.#camera.outside) );
    }
    /**
     * Sets the scene view to ortho mode by updaing camera, controls, and objects.
     */
    setOrthoViewMode() {
        this.#updateObjects();
        console.log(this.#modelSize)
        this.#camera.setOrthoCamera(this.#canvas, this.#modelSize, 2);
        this.#current_camera = this.#camera.ortho;
        this.#controls.switchControls("ortho", this.#camera.ortho, this.#canvas);
        this.#canvas.removeEventListener( 'resize', this.#onWindowResize(this.#camera.outside) );
        this.#canvas.removeEventListener( 'resize', this.#onWindowResize(this.#camera.inside) );
        this.#canvas.addEventListener( 'resize', this.#onWindowResize(this.#camera.ortho) );
    }

    getControlsMode() {
        return this.#controls.mode;
    }

    setControlsMode(mode) {
        this.#controls.mode = mode;
    }
    
    clear() {
        // unimplemented
    }
}

export {DemoScene}


