import $ from 'jquery';
import { DynamicCamera } from "./dynamicCamera.js";
import { DemoControls } from "./demoControls.js";
import GUI from 'lil-gui';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { round } from 'three/examples/jsm/nodes/Nodes.js';
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

    #labelRenderer;
    #grid_scale;
    #lights;
    #units;
    #showBoundingBoxes;

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
        this.#lights = {};
        this.#uploaded_objects_url = [];
        this.#scene = new THREE.Scene();
        // this.roomURL = new URL('../assets/warroom1.glb', import.meta.url);
        this.#roomURL = roomURL;

        // initialize geometries
        this.#grid_scale = 0.1; // meter
        await this.#initGeometries(this.#scene);

        // // initialize renderer
        this.#renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.#renderer.setPixelRatio( this.#canvas.devicePixelRatio );
        this.#renderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight);
        this.#renderer.shadowMap.enabled = true;
        this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.#renderer.domElement.style = "";
        this.#canvas.appendChild( this.#renderer.domElement );

        // // initialize camera
        this.#camera = new DynamicCamera(this.#canvas, this.#modelSize); // initializes to orthoCamera
        this.#current_camera = this.#camera.ortho;
        
        console.log(this.#objects)
        // initialize controls 
        this.#controls = new DemoControls(this.#camera, this.#canvas, this.#scene, this.#objects, this.#modelSize); // initializes to orthoControls

        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho) });
        console.log(window)
        this.#measurement_objects = {vertices: new THREE.Group(), edges: new THREE.Group()};
        this.#measurement_objects.vertices.name = "vertices";
        this.#measurement_objects.edges.name = "edges";
        this.#scene.add(this.#measurement_objects.vertices);
        this.#scene.add(this.#measurement_objects.edges);

        this.isFullScreen = false;
        this.#initListeners();

        this.#labelRenderer = new CSS2DRenderer();
        this.#labelRenderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight );
        this.#labelRenderer.domElement.style.position = 'absolute';
        this.#labelRenderer.domElement.style.top = '0px';
        this.#labelRenderer.domElement.style.pointerEvents = 'none';
        this.#canvas.appendChild( this.#labelRenderer.domElement );
        
        this.#units = "feet";
        this.#controls.units = this.#units;
        this.#showBoundingBoxes = false;
        this.guiControls();
        console.log(this.#modelSize);
    }

    #initListeners() {
        $('#inside-view').off('click');
        $('#outside-view').off('click');
        $('#ortho-view').off('click');
        $('#fullscreen-button').off('click');

        $('#inside-view').on('click', () => {
            this.setInsideViewMode();
        })
        $('#outside-view').on('click', () => {
            this.setOutsideViewMode();
        })
        $('#ortho-view').on('click', () => {
            this.setOrthoViewMode();
        })

        $('#m').on('click', () => {
            if (this.#controls.mode != "measure") {
                this.#controls.mode = "measure";
            } else {
                this.#controls.mode = "regular";
            }
        })
        
        $('#p3').on('click', () => {
            console.log("exporting");
            this.downloadScene();
        });

        $(document).on('keydown', (event)  => {
            if (event.key == "Escape") {
                event.preventDefault();
                this.isFullScreen = false;
                document.exitFullscreen();
            }
        });
        window.addEventListener("fullscreenchange", (event) => {
            if (this.isFullScreen) {
                this.isFullScreen = false;
            }
        });
        $('#fullscreen-button').on('click', () => {
            // Clear event listeners
            this.#renderer.domElement.removeEventListener( 'mousemove', this.#controls.getLock());

            if (!this.isFullScreen) {
                // set dom element
                let domElement;
                if (this.#camera.name == "inside") {
                    domElement = this.#renderer.domElement;
                } else {
                    domElement = this.#canvas;
                }

                // trigger full screen
                console.log("full screen")
                if (domElement.requestFullscreen){
                    domElement.requestFullscreen();
                } else if (domElement.webkitRequestFullscreen){
                    domElement.webkitRequestFullscreen();
                } else if (domElement.msRequestFullscreen){
                    domElement.msRequestFullscreen();
                }

                if (this.#camera.name == "inside") {
                    this.#controls.hideBlocker();
                    this.#controls.getPointerLock().isLocked = true;
                    domElement.addEventListener( 'mousemove', this.#controls.getLock());
                }
                console.log("set full screen")
                this.isFullScreen = true;
            } else {
                this.isFullScreen = false;
                document.exitFullscreen();
            }


            
        });
    }
    // shifted up
    openPosition = (obj) => {
        let bbox = new THREE.Box3().setFromObject(obj);
        console.log(bbox)
        const shift = bbox.min.y;
        return new THREE.Vector3(0, -shift + 0.01, 0);
    }

    // PROBABLY WILL HAVE TO CHANGE DRASTICALLY
    addObject (object) {

        const addedObject = object;
        const loader = new GLTFLoader();
        loader.load(addedObject.obj_url, (gltf) => {
            const newObject = gltf.scene;
            newObject.name = addedObject.name;
            this.#model.add(newObject);
            
            newObject.traverse(function(node){
                if (node.isMesh){
                    node.castShadow = true;
                    node.receiveShadow = true;}
            })
            // Compute the bounding box of the object
            const box = new THREE.Box3().setFromObject(newObject, true);

            // Create a box helper
            const boxGeometry = new THREE.BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
            const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
            const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);

            boundingBox.position.set((box.max.x + box.min.x) / 2, (box.max.y + box.min.y) / 2, (box.max.z + box.min.z) / 2)
            boundingBox.name = "bounding_box";
            boundingBox.visible = this.#showBoundingBoxes;
            newObject.add(boundingBox);

            const openPos = this.openPosition(newObject); // find an open position to display the box
            console.log(newObject.position)
            newObject.position.set(openPos.x, openPos.y, openPos.z);
            console.log(newObject)

            // add label
            const text = document.createElement( 'div' );
            text.style.backgroundColor = 'rgba(50,50,50,0.5)';
            text.style.color = 'white';
            text.className = 'label';
            text.style.borderRadius = '5px';
            text.style.padding = '5px';
            text.textContent = addedObject.name;
    
            const label = new CSS2DObject( text );
            console.log(label);
            newObject.add(label)

            this.#objects.uploaded.push(newObject);
            this.#controls.updateObjects(this.#objects);

        });


        // root.add( label );
    }
    // #updateObjects () {
    //     const addedObjects = JSON.parse(document.querySelector('.object-data').dataset.objects);
    //     addedObjects.forEach((object) => {
    //         if (! (object.obj_url == '' || this.#uploaded_objects_url.includes(object.obj_url))) {      
    //             const loader = new GLTFLoader();
    //             loader.load(object.obj_url, (gltf) => {
    //                 const newObject = gltf.scene;
    //                 newObject.name = object.name;
    //                 this.#scene.add(newObject);

    //                 // Compute the bounding box of the object
    //                 const box = new THREE.Box3().setFromObject(newObject, true);

    //                 // Create a box helper
    //                 const boxGeometry = new THREE.BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
    //                 const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    //                 const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);

    //                 boundingBox.position.set((box.max.x + box.min.x) / 2, (box.max.y + box.min.y) / 2, (box.max.z + box.min.z) / 2)
    //                 boundingBox.name = "bounding_box";
    //                 newObject.add(boundingBox);

    //                 const openPos = this.openPosition(newObject); // find an open position to display the box
    //                 console.log(openPos);
    //                 newObject.position.set(openPos.x, openPos.y, openPos.z);
    //                 console.log(newObject)

    //                 this.#objects.uploaded.push(newObject);
    //                 this.#uploaded_objects_url.push(object.obj_url);
    //                 this.#controls.updateObjects(this.#objects);
    //             });
    //         }
    //     });
    // }

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
        const hemiLight = new THREE.HemisphereLight(0xffffff, 2);
        hemiLight.position.set(0, 50, 0);
        this.#lights.hemi = hemiLight;
        scene.add(hemiLight);

        const ambientLight = new THREE.AmbientLight(0x7c7c7c, 8);
        this.#lights.ambi = ambientLight;
        scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xfdfbd3, 10);
        directionalLight.color.setHSL(0.1, 1, 0.95);
        directionalLight.castShadow = true;
        directionalLight.position.set(-20, 70, 100);
        directionalLight.shadow.camera.bottom = -12;
        this.#lights.direct = directionalLight;
        scene.add(directionalLight);
        
        const dLightHelper = new THREE.DirectionalLightHelper(directionalLight);
        //scene.add(dLightHelper);

        const spotLight = new THREE.SpotLight(0xFFFFFF, 10000);
        spotLight.angle = 0.2;
        spotLight.position.set( 0, 80, 0 );
        spotLight.penumbra = 1;
        spotLight.decay = 2;
        spotLight.distance = 0;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        spotLight.shadow.camera.near = 1;
        spotLight.shadow.camera.far = 10;
        spotLight.shadow.focus = 1;
        this.#lights.spot = spotLight;
        scene.add( spotLight );

        const lightHelper = new THREE.SpotLightHelper( spotLight );
        scene.add( lightHelper );
        
        //ground
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.MeshLambertMaterial({color: 0x1c150d});
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI/2;
        ground.position.y = -0.2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        //skydome
        const skyGeo = new THREE.SphereGeometry(800, 32, 15);
        const skyMat = new THREE.MeshLambertMaterial({color: 0x87ceeb, side: THREE.BackSide});
        const sky = new THREE.Mesh(skyGeo, skyMat);
        scene.add(sky);
        
        // const axesHelper = new THREE.AxesHelper( 100 );
        // scene.add( axesHelper );
        const assetLoader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            assetLoader.load(this.#roomURL.href, (gltf) => {
                console.log("loading model");
                this.#model = gltf.scene; // model

                // get model dimensions
                let bbox = new THREE.Box3().setFromObject(this.#model);
                this.#modelSize = bbox.getSize(new THREE.Vector3());
                if (this.#modelSize.x < this.#modelSize.z) {
                    this.#model.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI / 2);
                }
                // add model to scene
                scene.add(this.#model);
                this.#model.position.set(0, this.#modelSize.y / 2, 0); // makes the ground at y = 0;

                console.log(this.#model.children)
                // initialize objects
                const objects = [...this.#model.children]; // must be copy because removing directly will cause some to be skipped.
                this.#organizeObjects(objects);

                // initializes grid
                const size = Math.max(this.#modelSize.x, this.#modelSize.z);
                const gridHelper = new THREE.GridHelper(size, size / this.#grid_scale, 0x000000, 0x097969);
                //scene.add(gridHelper);
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
                    obj.receiveShadow = true;
                } else if(obj.name.includes("wall")){
                    obj.material.color.setHex(0xedeae5);
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            } else {
                this.#model.remove(obj);
            }
        });
    }

    /**
     * Updates the scene based on the current control view and mode.
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
        const displayModeElement = document.getElementById("display-mode");
        const displayDistanceElement = document.getElementById("measure-distance");
        if (this.#controls.mode == "measure") {            
            displayModeElement.textContent = "Measurement: ";
            const measure_points = this.#controls.getMeasurePoints();
            if (measure_points.length > this.#measurement_objects.vertices.children.length) {
                const cubeGeometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 ); 
                const cubeMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff} ); 
                const cube = new THREE.Mesh( cubeGeometry, cubeMaterial ); 
                const point = measure_points[measure_points.length-1];
                cube.position.set(point.x, point.y, point.z);
                this.#measurement_objects.vertices.add( cube );
                const lineGeometry = new THREE.BufferGeometry().setFromPoints( measure_points );
                const lineMaterial = new THREE.LineBasicMaterial({
                                        color: 0x0000ff
                                    });
                const line = new THREE.Line( lineGeometry, lineMaterial );
                this.#measurement_objects.edges.add( line );
                         
            } else if (measure_points.length < this.#measurement_objects.vertices.children.length) {
                displayDistanceElement.textContent = "";   
                this.#measurement_objects.vertices.clear();
                this.#measurement_objects.edges.clear();
                return;
            }
            if (measure_points.length == 2) {
                const dist = measure_points[0].distanceTo(measure_points[1]);
                if (this.#units == "meters") {
                    const roundDist = Math.round(dist * 100) / 100;
                    displayDistanceElement.textContent = roundDist + " " + this.#units;
                } else if (this.#units == "feet") {
                    const feet = dist * 3.281;
                    const flooredFeet = Math.floor(feet);
                    const inches = Math.round((feet - flooredFeet) * 12);  
                    displayDistanceElement.textContent = flooredFeet + " ft. " + inches + " in.";
                }


            }
        } else {
            const displayModeElement = document.getElementById("display-mode");
            displayModeElement.textContent = "Viewing";
            displayDistanceElement.textContent = "";
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
            this.#labelRenderer.render(this.#scene, this.#current_camera);
            this.#animate();
        });
    }
    
    /**
     * 
     * @param {*} camera 
     */
    #onWindowResize(camera){            
        console.log("window resized");
        this.#renderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight, false);
        this.#labelRenderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight, false);
        if (this.#camera.name == "ortho") {
            console.log("ortho camera")
            this.#camera.setOrthoCamera(this.#canvas, this.#modelSize, 2 );
            this.#current_camera = this.#camera.ortho;
        } else {
            camera.aspect = this.#canvas.offsetWidth / this.#canvas.offsetHeight;
            camera.updateProjectionMatrix();
        }

    }

    /**
     * Sets the scene view to inside mode by updating camera, controls, and objects.
     */
    setInsideViewMode() {
        this.#camera.setInsideCamera(this.#canvas);
        this.#current_camera = this.#camera.inside;
        this.#controls.switchControls("inside", this.#camera.inside, this.#canvas);
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );
        //add ceiling to the inside view
        const ceilingGeo = new THREE.BoxGeometry(this.#modelSize.x, 0.1, this.#modelSize.z);
        const ceilingMat = new THREE.MeshBasicMaterial({color: 0xedeae5});
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        if (this.#modelSize.x < this.#modelSize.z) {
            ceiling.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI / 2);
        }
        ceiling.position.y = this.#modelSize.y;
        ceiling.castShadow = true;
        this.#objects.ceiling = ceiling;
        this.#scene.add(ceiling);

        const roomLight = new THREE.DirectionalLight(0xe0f1ff, 2);
        roomLight.position.set(0, ceiling.position.y, 0);
        //const roomLightHelper = new THREE.DirectionalLightHelper(roomLight);
        roomLight.castShadow = true;
        // roomLight.lookAt(2, 0, 1);
        this.#scene.add(roomLight);
        this.#lights.room = roomLight;
        //this.#scene.add(roomLightHelper);
    }
    /**
     * Sets the scene view to outside mode by updating camera, controls, and objects.
     */
    setOutsideViewMode() {
        this.#camera.setOutsideCamera(this.#canvas);
        this.#current_camera = this.#camera.outside;
        this.#controls.switchControls("outside", this.#camera.outside, this.#canvas);
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        this.#scene.remove(this.#objects.ceiling);
        this.#scene.remove(this.#lights.room);
    }
    /**
     * Sets the scene view to ortho mode by updating camera, controls, and objects.
     */
    setOrthoViewMode() {
        this.#camera.setOrthoCamera(this.#canvas, this.#modelSize, 2);
        this.#current_camera = this.#camera.ortho;
        this.#controls.switchControls("ortho", this.#camera.ortho, this.#canvas);
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );
        this.#scene.remove(this.#objects.ceiling);
        this.#scene.remove(this.#lights.room);
    }

    guiControls(){
        const gui = new GUI();
        // console.log(this.#scene);
        
        // toggling light sources
        const hLight = this.getHemiLight();
        const aLight = this.getAmbientLight();
        const dLight = this.getDirectionalLight();
        const sLight = this.getSpotLight();
        const folderLights = gui.addFolder('Light');
        //folderLights.close();

        const lights = {
            toggleHemisphereLight: function() {
                hLight.visible = ! hLight.visible;
            },
            toggleAmbientLight: function() {
                aLight.visible = ! aLight.visible;
            },
            toggleDirectionalLight: function() {
                dLight.visible = ! dLight.visible;
                console.log("toggling");
            },
            toggleSpotLight: function (){
                sLight.visible = ! sLight.visible;
            }
        };
        folderLights.add( lights, 'toggleHemisphereLight' ).name( 'Hemisphere light' );
        folderLights.add( lights, 'toggleAmbientLight' ).name( 'Ambient light' );
        folderLights.add( lights, 'toggleDirectionalLight' ).name( 'Directional light' );
        folderLights.add( lights, 'toggleSpotLight' ).name( 'Spot light' );

        //toggling object controls (translate/rotate)
        const folderControls = gui.addFolder('Object Controls');
        //folderControls.close();
        const control = this.#controls;
        const controlToggle = {
            translate: function(){
                control.setControlMode('translate');
            },
            rotate: function(){
                control.setControlMode('rotate');
            }
        }
        
        folderControls.add(controlToggle, 'translate').name('Translate');
        folderControls.add(controlToggle, 'rotate').name('Rotate');
        // Moving Controls
        const folderMoving = gui.addFolder('Moving Controls');
        const controlMoving = {
            keyboard: () => {
                this.#controls.setMode("regular");
            },
            teleport: () => {
                this.#controls.setMode("teleport");
            }
        }
        folderMoving.add(controlMoving, 'keyboard').name('WASD');
        folderMoving.add(controlMoving, 'teleport').name('Teleport');
        
        //toggling bounding boxes
        const folderBoundingBox = gui.addFolder('Bounding Box');
        const boundingBoxToggle = {
            toggle: false
        }
        folderBoundingBox.add(boundingBoxToggle, 'toggle').name('Show bounding boxes').onChange(value => {
            this.#objects.uploaded.forEach( (obj) => {
                obj.children.forEach( (child) => {
                    if (child.name == "bounding_box") {
                        child.visible = value;
                    }
                })
            });
            this.#showBoundingBoxes = value;
        });


        //changing material color?
        const folderColors = gui.addFolder('Change Colors');
        folderColors.close();
        
        //changing measurement units
        const folderMeasurements = gui.addFolder('Units');
        const measurementUnits = {
            meter: () => {
                this.#units = "meters";
                this.#controls.units = "meters";
            },
            feet: () => {
                this.#units = "feet";
                this.#controls.units = "feet";
            }
        }
        folderMeasurements.add(measurementUnits, 'meter').name('Meters');
        folderMeasurements.add(measurementUnits, 'feet').name("Feet");
        //folderMeasurements.close();

        //changing the display of bounding boxes around furnitures
        

        gui.open();
    }

    // getBoundingBox(){
    //     return this.#objects.boundingBox;
    // }
    downloadScene() {
        const exporter = new GLTFExporter();
        this.#model.position.set(0,0,0);
        this.#model.updateMatrixWorld(true);
        exporter.parse(this.#model, function(result) {
            const output = JSON.stringify(result, null, 2);
            const blob = new Blob([output], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = 'scene.glb';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, { binary: true });
        this.#model.position.set(0, this.#modelSize.y / 2, 0);
    }

    getControls() {
        return this.#controls;
    }
    getRenderer() {
        return this.#renderer;
    }
    getHemiLight(){
        return this.#lights.hemi;
    }
    getAmbientLight(){
        return this.#lights.ambi;
    }
    getDirectionalLight(){
        return this.#lights.direct;
    }
    getSpotLight(){
        return this.#lights.spot;
    }
    clear() {
        // unimplemented
    }
}

export {DemoScene}


