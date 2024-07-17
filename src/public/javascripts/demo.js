import $ from 'jquery';
import { DynamicCamera } from "./dynamicCamera.js";
import { DemoControls } from "./demoControls.js";
import * as THREE from 'three';
import GUI from 'lil-gui';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import grassShader from '../shaders/grass.js'
import { Sky } from 'three/addons/objects/Sky.js';
import { generateFieldGeo } from './grass.js';
import SunCalc from 'suncalc';

const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const sphereGeometry = new THREE.SphereGeometry( 0.1, 32,16 ); 
const sphereMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} ); 
const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000
});
const ceilingMat = new THREE.MeshBasicMaterial({color: 0xedeae5});

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
     */
    #canvas; 

    /**
     * The ThreeJS scene object that is rendered.
     * @type {Scene}
     */
    #scene;

    /**
     * The ThreeJS renderer object that renders the scene.
     * @type {Renderer}
     */
    #renderer;

    /**
     * The ThreeJs objects in the scene. All the objects are separated
     * into distinct groups upon calling organizeObjects. 
     * The groups are the following:
     *  - walls 
     *  - floor
     *  - furniture 
     *  - doors
     *  - windows
     *  - uploaded
     * @type {Map<String, Array.<Object3D>>}
     */
    #objects;

    /**
     * An object containing information about the room including, _id, url, and name.
     * @type {Object}
     */
    #room; 
    
    /**
     * The loaded .glb/obj room/model.
     * @type {Object}
     */
    #model;

    /**
     * The dimensions of the scene.
     * @type {Vector3}
     */
    #modelSize;

    /**
     * The custom camera object that contains the camera information for each of the three views, "ortho", "outside", and "inside".
     * @type {DynamicCamera}
     */
    #camera;

    /**
     * The custom controls object that directs the controls for interacting with the scene depending on which view and mode.
     * @type {DemoControls}
     */
    #controls;

    /**
     * The vertices and edges generated in measure mode. Has two properties: .vertices, .edges, which correspond to the two points
     * and line created when measuring.
     */
    #measurement_objects;

    /**
     * Label Renderer object from 3js
     *  @type {CSS2DRenderer}
     */
    #labelRenderer;

    /**
     * Array of 3js light objects.
     */
    #lights;

    /**
     * Units that the scene uses. Affects, measurement mode displays and dimension displays.
     * @type {String}
     */
    #units;

    /**
     * Boolean that toggles bounding box visibility.
     * @type {boolean}
     */
    #showBoundingBoxes;

    // grass variables
    #grassUniforms;
    #grassMesh;
    #startTime;

    /**
     * Variable pointing to the Sky Object. See #initSky() for more details.
     */
    #sky;

    /**
     * Pointer to directional light that represents the sun.
     */
    #sun;
    #ground1;
    #ground2;
    #guiControllers;

    /**
     * Whether or not the scene is rotated
     */
    #rotated

    /**
     * Calls for the initialization the DemoScene object and then
     * calls the animation loop when initialization is completed.
     * @param {Object} room 
     */
    constructor(room, objects) {
        this.#initialize(room, objects).then(() => {
            this.#animate();
        });
    }

    /**
     * Initializes the DemoScene object given the room URL.  
     * @param {URL} room 
     */
    async #initialize(room, objects) {
        this.#rotated = false;
        this.sunSim = false;
        this.isFullScreen = false;
        this.resources = [];
        this.#canvas = document.getElementById("scene-container");
        this.#objects = {walls: [], 
                         floor: [],
                         furniture: [],
                         doors: [],
                         windows: [],
                         uploaded: []};
        this.#showBoundingBoxes = false;
        this.#lights = {};
        this.#scene = new THREE.Scene();
        this.#room = room;
        this.#units = "feet";

        // // initialize renderer
        this.#renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.#renderer.setPixelRatio( this.#canvas.devicePixelRatio );
        this.#renderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight);
        this.#renderer.shadowMap.enabled = true;
        this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.#renderer.outputEncoding = THREE.sRGBEncoding;
        this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.#renderer.toneMappingExposure = 0.5;
        this.#renderer.domElement.id = "3js-scene"
        this.#renderer.domElement.style = "";
        this.#canvas.appendChild( this.#renderer.domElement );

        this.current_camera = null;

        // initialize geometries
        await this.#initGeometries(this.#scene);

        // // initialize camera
        this.#camera = new DynamicCamera(this.#canvas, this.#modelSize); // initializes to orthoCamera
        this.current_camera = this.#camera.ortho;
        this.view = "ortho";

        // initialize controls 
        this.#controls = new DemoControls(this.#camera, this.#canvas, this.#scene, this.#objects, this.#modelSize, this.#showBoundingBoxes); // initializes to orthoControls
        this.#controls.units = this.#units;

        // initialize measurement objects
        this.#measurement_objects = {vertices: new THREE.Group(), edges: new THREE.Group()};
        this.#measurement_objects.vertices.name = "vertices";
        this.#measurement_objects.edges.name = "edges";
        this.#scene.add(this.#measurement_objects.vertices);
        this.#scene.add(this.#measurement_objects.edges);

        // initialize label renderer
        this.#labelRenderer = new CSS2DRenderer();
        this.#labelRenderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight );
        this.#labelRenderer.domElement.style.position = 'absolute';
        this.#labelRenderer.domElement.style.top = '0px';
        this.#labelRenderer.domElement.style.pointerEvents = 'none';
        this.#canvas.appendChild( this.#labelRenderer.domElement );

        // adding stored objects
        for (let objData of objects) {
            this.addObject(objData.object, objData.position, objData.rotation);
        }

        // initialize GUI
        this.gui = new GUI({autoPlace: false});
        this.#guiControllers = {};
        this.initGui(this.gui);

        //initialize event listeners
        this.#initListeners();
    }


    /**
     * Initializes the GUI for the object.
     * @param {GUI} gui 
     */
    initGui(gui){
        $("#gui-container").empty()

        // // Create input elements
        const dateInput = document.createElement('input');
        const timeInput = document.createElement('input');

        // Set attributes for the date input
        dateInput.type = 'date';
        dateInput.id = 'date-input';

        // Set attributes for the time input
        timeInput.type = 'time';
        timeInput.id = 'time-input';

        // Append inputs to the body (or any other desired parent element)
        $("#gui-container").append(dateInput);
        $("#gui-container").append(timeInput);
        const folderSky = gui.addFolder('Sky Conditions');
        // folderSky.add( this.skyController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( this.onSkyChange());
        // folderSky.add( this.skyController, 'rayleigh', 0.0, 4, 0.001 ).onChange( this.onSkyChange());
        // folderSky.add( this.skyController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( this.onSkyChange());
        // folderSky.add( this.skyController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( this.onSkyChange());
        // folderSky.add( this.skyController, 'exposure', 0, 1, 0.0001 ).onChange( this.onSkyChange());
        
        // Add latitude and longitude inputs to the GUI
        folderSky.add(this.skyController, 'latitude', -90, 90).onChange(this.onSkyChange()).disable();
        folderSky.add(this.skyController, 'longitude', -180, 180).onChange(this.onSkyChange()).disable();
        const sunSimToggle = {
            toggle: false
        }
        folderSky.add(sunSimToggle, 'toggle').name("Sun Simulation").onChange( (value) => this.sunSim = value).disable();
        this.#guiControllers.skyControls = folderSky;
        //toggling object controls (translate/rotate)
        const folderControls = gui.addFolder('Object Controls');
        const controlToggle = {
            'translate': () => {
                this.#controls.setGumballMode('translate');
            },
            'rotate': () => {
                this.#controls.setGumballMode('rotate');
            }
        }

        folderControls.add({selectedFunction: 'translate'}, 'selectedFunction', Object.keys(controlToggle))
        .name('Mode')
        .onChange((selectedFunction) => {
            if (controlToggle[selectedFunction]) {
                controlToggle[selectedFunction]();
            }
        });
        
        //toggling bounding boxes
        const boundingBoxToggle = {
            toggle: false
        }
        folderControls.add(boundingBoxToggle, 'toggle').name('Show bounding box').onChange(value => {
            this.#controls.toggleWallBB();
            this.toggleAllObjects(value, "bounding_box");
        });

        const showDimensions = {
            toggle: true
        }
        folderControls.add(showDimensions, 'toggle').name('Show Labels').onChange(value => {
            this.toggleAllObjects(value, "label");
        });
        //toggling grass
        const showGrass ={
            toggle: false
        }
        folderControls.add(showGrass, 'toggle').name('Show Grass').onChange(value => {
            this.#grassMesh.visible = value;
            this.#ground2.visible = value;
            this.#ground1.visible = !value;
        }).disable();
        this.#guiControllers.objControls = folderControls;
        //changing material color?
        // const folderColors = folderControls.addFolder('Furniture Colors');
        // folderColors.close();

        // Inside view controls
        const folderInsideControls = gui.addFolder('Inside Controls');
        // Inside view moving controls
        const setInsideMode = {
            keyboard: () => {
                this.#controls.insideMode = "keyboard";
                console.log(this.view)
                if (this.view == "inside") {
                    console.log("keyboard")
                    this.#controls.setToNonMobile();
                }
            },
            teleport: () =>  {
                this.#controls.insideMode = "teleport";
                if (this.view == "inside") {
                    console.log("teleport")
                    this.#controls.setToNonMobile();
                }
            },
            mobile: () => {
                this.#controls.insideMode = "mobile";
                if (this.view == "inside") {
                    console.log("mobile")
                    this.#controls.setToMobile();
                }
            }
        }

        folderInsideControls.add({selectedFunction: 'teleport'}, 'selectedFunction', Object.keys(setInsideMode))
        .name('Moving')
        .onChange((selectedFunction) => {
            if (setInsideMode[selectedFunction]) {
                setInsideMode[selectedFunction]();
            }
        }).disable();
        // Inside view lighting control
        const showRoomLight ={
            toggle: true
        }
        folderInsideControls.add(showRoomLight, 'toggle').name('Room Light').onChange(value => {
            this.#lights.room.visible = value;
        }).disable();
        this.#guiControllers.insideControls = folderInsideControls;

        //changing measurement units
        const folderMeasurements = gui.addFolder('Measurement');
        const measurementUnits = {
            'meter': () => {
                this.setUnits("meter")
            },
            'feet': () => {
                this.setUnits("feet");
            }
        }

        folderMeasurements.add({selectedFunction: 'feet'}, 'selectedFunction', Object.keys(measurementUnits))
            .name('unit')
            .onChange((selectedFunction) => {
                if (measurementUnits[selectedFunction]) {
                    measurementUnits[selectedFunction]();
                }
            });

        console.log(gui)

        gui.domElement.id = "gui";
        $("#gui-container").append(gui.domElement);

        gui.open();
    }
    
    /**
     * Initializes event listeners for the scene.
     */
    #initListeners() {

        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho) });
        
        const resizeObserer = new ResizeObserver(() => {
            this.#onWindowResize(this.current_camera);
        })
        resizeObserer.observe(this.#canvas);

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
            if (this.#controls.orthoMode != "measure") {
                this.#controls.orthoMode = "measure";
                $('#m').text("VIEW")
            } else {
                this.#controls.orthoMode = "drag";
                $('#m').text("MEASURE")
            }
        })
        
        $('#p3').on('click', () => {
            console.log("exporting");
            this.downloadScene();
        });

        $('#reset').on('click', () => {
            console.log("reset")
            this.reset();
        });

        $(document).on('keydown', (event)  => {
            if (event.key == "Escape") {
                event.preventDefault();
                this.isFullScreen = false;
                document.exitFullscreen();
            }
        });
        // $(window).on("fullscreenchange", (event) => {
        //     console.log("changed");
        //     if (this.isFullScreen) {
        //         console.log("change full screen true to false");
        //         this.isFullScreen = false;
        //     }
        // });

        $("#date-input").on('change', (event) => {
            console.log("changed")
            const time = document.getElementById('time-input').value;
            const date = event.target.value;
            if (date && time) {
                this.skyController.dateTime = new Date(`${date}T${time}:00`);
            }
            this.onSkyChange();
        });

        $('#time-input').on('change', (event) => {
            console.log("changed")
            const date = document.getElementById('date-input').value;
            const time = event.target.value;
            if (date && time) {
                this.skyController.dateTime = new Date(`${date}T${time}:00`);
            }
            this.onSkyChange();
        });

        $('#fullscreen-button').on('click', () => {
            // Clear event listeners
            this.#renderer.domElement.removeEventListener( 'mousemove', this.#controls.getLock());
            // set dom element
            let domElement;
            if (this.#camera.name == "inside") {
                domElement = this.#renderer.domElement;
            } else {
                domElement = this.#canvas;
            }
            if (!this.isFullScreen) {            
                // trigger full screen
                console.log("set to full screen")
                if (domElement.requestFullscreen){
                    domElement.requestFullscreen();
                    // console.log(domElement.offsetWidth, domElement.offsetHeight);
                } else if (domElement.webkitEnterFullscreen){
                    domElement.webkitEnterFullscreen();
                } else if (domElement.msRequestFullscreen){
                    domElement.msRequestFullscreen();
                } else if (domElement.mozRequestFullScreen){
                    domElement.mozRequestFullScreen();
                }
                if (this.#camera.name == "inside") {
                    this.#controls.hideBlocker();
                    this.#controls.getPointerLock().isLocked = true;
                    domElement.addEventListener( 'mousemove', this.#controls.getLock());
                }
                this.isFullScreen = true;
            } else if (this.isFullScreen){
                console.log("in full screen");
                this.isFullScreen = false;
                // console.log(domElement.offsetWidth, domElement.offsetHeight);
                if (document.exitFullscreen){
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen){
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen){
                    document.mozExitFullscreen();
                } else if (document.msExitFullscreen){
                    document.msExitFullscreen();
                }
            }            
        });
    }

    // shifted up
    openPosition = (obj) => {
        let bbox = new THREE.Box3().setFromObject(obj);
        const shift = bbox.min.y;
        return new THREE.Vector3(0, -shift + 0.01, 0);
    }

    /**
     * Adds a 3D object to the this.#scene from a specified URL, optionally setting its position and rotation.
     *
     * @param {Object} object - The object to be added, which must include an `obj_url` property.
     * @param {Object} [position=null] - The optional position to place the object. If null, an open position will be determined.
     *                                 - xyz coordinates can be accessed through position.x, position.y, etc... 
     * @param {Object} [rotation=null] - The optional rotation to apply to the object (in radians). 
     *                                 - xyz coordinates can be accessed through rotation.x, rotation.y, etc... 
     */
    addObject(object, position = null, rotation = null) {

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

            if (position == null) {
                const openPos = this.openPosition(newObject); // find an open position to display the box
                newObject.position.set(openPos.x, openPos.y, openPos.z);
                newObject.updateMatrixWorld(true);
            } else {
                newObject.position.set(position.x, position.y, position.z);
                newObject.updateMatrixWorld(true);
            }   

            if (rotation != null) {
                newObject.rotation.x = rotation.x;
                newObject.rotation.y = rotation.y;
                newObject.rotation.z = rotation.z;
                newObject.updateMatrixWorld(true);
            }

            // Compute the bounding box of the object
            const box = new THREE.Box3().setFromObject(newObject, true);

            const size = new THREE.Vector3(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z)
            // Create a box helper
            const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            this.resources.push(boxGeometry);
            const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);

            boundingBox.position.set(0, (box.max.y + box.min.y) / 2, 0);
            boundingBox.name = "bounding_box";
            boundingBox.visible = this.#showBoundingBoxes;
            newObject.add(boundingBox);

            // add label
            const text = document.createElement( 'div' );
            text.style.backgroundColor = 'rgba(50,50,50,0.5)';
            text.style.color = 'white';
            text.className = 'label';
            text.style.borderRadius = '5px';
            text.style.padding = '5px';
            text.textContent = addedObject.name;
    
            const label = new CSS2DObject( text );
            label.name = "label";
            newObject.add(label)

            this.#objects.uploaded.push(newObject);
            this.#controls.updateObjects(this.#objects);

        });
    }

    /**
     * Initializes the sky and sun. The Sky Object comes from a 3js add on that is based on a 
     * paper relating sky shading to various atmospheric constants and the position of the sun. 
     * In this implementation, this position of the sun is based on its latitude, longitude, and date/time.
     * The intensity of the sun is also based on date/time.
     * @param {*} scene 
     */
    #initSky(scene) {

        // Add Sky
        this.#sky = new Sky();
        this.#sky.scale.setScalar( 45000 );
        scene.add( this.#sky );

        // Add Sun 
        this.#sun = new THREE.DirectionalLight(0xffffff, 10);
        this.#sun.castShadow = true;
        this.#sun.shadow.mapSize.width = 2048;
        this.#sun.shadow.mapSize.height = 2048;
        this.#sun.shadow.bias = 0.0001;
        // Define the shadow camera's frustum size
        this.#sun.shadow.camera.left = -20;
        this.#sun.shadow.camera.right = 20;
        this.#sun.shadow.camera.top = 20;
        this.#sun.shadow.camera.bottom = -20;
        this.#sun.shadow.camera.near = -10;
        this.#sun.shadow.camera.far = 10;
        // scene.add(this.#sun);
        // const helper = new THREE.CameraHelper(this.#sun.shadow.camera);
        // scene.add(helper);
        this.skyController = {
            turbidity: 20,
            rayleigh: 0.558,
            mieCoefficient: 0.009,
            mieDirectionalG: 0.999998,
            elevation: 15,
            azimuth: -45,
            exposure: this.#renderer.toneMappingExposure,
            dateTime: new Date(),
            latitude: 42.4755, // Example latitude for New York City
            longitude: -76.4857, // Example longitude for New York City
          }

        this.onSkyChange();
    }

    /**
     * Changes the displayed sky and sun when parameters are altered.
     */
    onSkyChange = () => {

        const uniforms = this.#sky.material.uniforms;
        uniforms[ 'turbidity' ].value = this.skyController.turbidity;
        uniforms[ 'rayleigh' ].value = this.skyController.rayleigh;
        uniforms[ 'mieCoefficient' ].value = this.skyController.mieCoefficient;
        uniforms[ 'mieDirectionalG' ].value = this.skyController.mieDirectionalG;

        const sunPosition = SunCalc.getPosition(this.skyController.dateTime, this.skyController.latitude, this.skyController.longitude);
        const phi = Math.PI / 2 - sunPosition.altitude; // Altitude to polar angle
        const theta = Math.PI - sunPosition.azimuth; // Azimuth adjustment
        if (phi > Math.PI / 2) {
            this.#sun.intensity = 0;
        } else {
            this.#sun.intensity = this.#solar_intensity(this.#air_mass_kasten_young(sunPosition.altitude)) * 0.03;
        }

        const sun = new THREE.Vector3();
        sun.setFromSphericalCoords( 1, phi, theta );
        this.#sun.position.set(sun.x, sun.y, sun.z)
        this.#sun.updateMatrixWorld(true);
        uniforms[ 'sunPosition' ].value.copy( sun );

        this.#renderer.toneMappingExposure = this.skyController.exposure;
        if (this.current_camera) {
            this.#renderer.render( this.#scene, this.current_camera );
        }
    }

    #air_mass_kasten_young(solar_elevation) {
        const alpha = solar_elevation
        return 1 / (Math.sin(alpha) + 0.50572 * (6.07995 + alpha * 180 / Math.PI) ** -1.6364)
    }

    #solar_intensity(air_mass, kappa=0.14, solar_constant=1361) {
        return solar_constant * Math.exp(-kappa * air_mass);
    }

    /**
     * Initializes the geometries and lights in the given scene.
     * Adds various types of lights to the scene.
     * Loads a 3D model and adds it to the scene along with helper objects.
     *
     * @async
     * @param {THREE.Scene} scene - The scene to which the geometries and lights will be added.
     * @returns {Promise<void>} A promise that resolves when the geometries and model have been added to the scene.
     */
    async #initGeometries(scene) {
        const hemiLight = new THREE.HemisphereLight(0xffffff);
        hemiLight.position.set(0, 50, 0);
        this.#lights.hemi = hemiLight;
        scene.add(hemiLight);

        const ambientLight = new THREE.AmbientLight(0x7c7c7c, 1);
        this.#lights.ambi = ambientLight;
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xFFFFFF, 50000);
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
        
        // GRASS
        // Parameters
        const PLANE_SIZE = 15;
        const BLADE_COUNT = 80000;
        const BLADE_WIDTH = 0.05;
        const BLADE_HEIGHT = 0.15;
        const BLADE_HEIGHT_VARIATION = 0.3;

        // Grass Texture
        const grassTexture = new THREE.TextureLoader().load('../img/grass2.jpg');

        // Time Uniform
        this.#startTime = Date.now();
        const timeUniform = { type: 'f', value: 0.0 };

        // Grass Shader
        this.#grassUniforms = {
            textures: { value: [grassTexture] },
            iTime: timeUniform
        };

        const grassMaterial = new THREE.ShaderMaterial({
            uniforms: this.#grassUniforms,
            vertexShader: grassShader.vert,
            fragmentShader: grassShader.frag,
            vertexColors: true,
            side: THREE.DoubleSide
        });
        this.resources.push(grassMaterial);

        //ground
        const groundGeo = new THREE.PlaneGeometry(300, 300);
        this.resources.push(groundGeo);
        
        const groundMat1 = new THREE.MeshLambertMaterial({color: 0x1c150d});

        const groundTexture = new THREE.TextureLoader();
        const groundAO = groundTexture.load("../img/patchy-meadow1_ao.png");
        const groundColor = groundTexture.load("../img/patchy-meadow1_albedo.png");
        groundColor.wrapS = groundColor.wrapT = THREE.RepeatWrapping;
        groundColor.offset.set(0, 0);
        groundColor.repeat.set(12, 12);
        const groundHeight = groundTexture.load("../img/patchy-meadow1_height.png");
        groundHeight.wrapS = groundHeight.wrapT = THREE.RepeatWrapping;
        groundHeight.offset.set(0, 0);
        groundHeight.repeat.set(12, 12);
        const groundMetal = groundTexture.load("../img/patchy-meadow1_metallic.png");
        groundMetal.wrapS = groundMetal.wrapT = THREE.RepeatWrapping;
        groundMetal.offset.set(0, 0);
        groundMetal.repeat.set(12, 12);
        const groundNormal = groundTexture.load("../img/patchy-meadow1_normal-ogl.png");
        groundNormal.wrapS = groundNormal.wrapT = THREE.RepeatWrapping;
        groundNormal.offset.set(0, 0);
        groundNormal.repeat.set(12, 12);
        const groundRough = groundTexture.load("../img/patchy-meadow1_roughness.png");
        groundRough.wrapS = groundRough.wrapT = THREE.RepeatWrapping;
        groundRough.offset.set(0, 0);
        groundRough.repeat.set(12, 12);
        
        const groundMat2 = new THREE.MeshStandardMaterial({
            map: groundColor,
            
            normalMap: groundNormal,
            normalScale: new THREE.Vector2(1,1),
            
            displacementMap: groundHeight,
            displacementScale: 0.1,
            displacementBias: -0.05,
            
            roughnessMap: groundRough,
            roughness: 0.5,
            
            aoMap: groundAO,
            aoMapIntensity: 1,
            
            metalnessMap: groundMetal,
            metalness: 0,

        })
        //ground.geometry.attributes.uv2 = ground.geometry.attributes.uv;
        this.resources.push(groundMat2);
        
        const ground1 = new THREE.Mesh(groundGeo, groundMat1);
        ground1.rotation.x = -Math.PI/2;
        ground1.position.y = -0.2;
        ground1.receiveShadow = true;
        scene.add(ground1);
        this.#ground1 = ground1;
        const ground2 = new THREE.Mesh(groundGeo, groundMat2);
        ground2.rotation.x = -Math.PI/2;
        ground2.position.y = -0.2;
        ground2.receiveShadow = true;
        this.#ground2 = ground2;
        
        this.#initSky(scene);

        const assetLoader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            assetLoader.load(this.#room.room_url.href, (gltf) => {
                console.log("loading model");
                console.log(gltf.scene)
                this.#model = gltf.scene; // model

                // get model dimensions
                let bbox = new THREE.Box3().setFromObject(this.#model);
                this.#modelSize = bbox.getSize(new THREE.Vector3());
                if (this.#modelSize.x < this.#modelSize.z) {
                    this.#rotated = true;
                    this.#model.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI / 2);
                    this.#model.updateMatrixWorld(true);
                    const temp = this.#modelSize.x;
                    this.#modelSize.x = this.#modelSize.z;
                    this.#modelSize.z = temp;
                }
                // add model to scene
                scene.add(this.#model);
                this.#model.position.set(0, this.#modelSize.y / 2, 0); // makes the ground at y = 0;
                console.log(this.#model.children)
                this.#model.updateWorldMatrix(true, true)
                // initialize objects
                const objects = [...this.#model.children]; // must be copy because removing directly will cause some to be skipped.
                this.#organizeObjects(objects);

                // color floor and walls
                this.#addTextureToRoom();

                const NO_GRASS_RECT = [-this.#modelSize.x / 2, this.#modelSize.x / 2, -this.#modelSize.z / 2, this.#modelSize.z / 2, ]
                const grassGeo = generateFieldGeo(PLANE_SIZE, BLADE_COUNT, BLADE_WIDTH, BLADE_HEIGHT, BLADE_HEIGHT_VARIATION, NO_GRASS_RECT)
                this.resources.push(grassGeo)
                const grassMesh = new THREE.Mesh(grassGeo, grassMaterial);
                grassMesh.receiveShadow = true;
                grassMesh.castShadow = true;
                this.#grassMesh = grassMesh;

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
     * @param {Array<THREE.Object3D>} objects - The array of 3D objects to be organized.
     */
    #organizeObjects (objects) {
        console.log(objects);
        objects.forEach((obj) =>  {
            if (obj.name == '') {
                obj.name = obj.children[0].name;
            }
            if (obj.name.includes("door")) {
                this.#objects.doors.push(obj);
            } else if (obj.name.includes("window")) {
                this.#objects.windows.push(obj);
            } else if (obj.name.includes("wall")) {
                this.#addDimensionLabels(obj);
                this.#objects.walls.push(obj);
            } else if (obj.name.includes("floor")) {
                this.#objects.floor.push(obj);
            } else {
                this.#model.remove(obj);
            }
        });
    }

    /**
     * Adds correct textures and shadow maps to respective objects.
     * Shades walls white and floor brownish.
     */
    #addTextureToRoom() {
        this.#objects.walls.forEach( (wall) => {
            wall.children.forEach((child) => {
                if (child.material) {
                    child.material.color.setHex(0xedeae5);
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        })
        this.#objects.floor.forEach( (floor) => {
            floor.children.forEach((child) => {
                if (child.material) {
                    child.material.color.setHex(0x8b5a2b);
                    child.receiveShadow = true;
                }
            });
        })
    }

    /**
     * Add dimension CSS2D Labels to specified object. Currently intended just for walls as it
     * picks the longest dimension to add a label. However, could be generalized in the future.
     * @param {Object3D} obj 
     */
    #addDimensionLabels (obj) {
        obj.updateMatrixWorld(true)
        // get model dimensions
        let bbox = new THREE.Box3().setFromObject(obj);
        const boundingBoxHelper = new THREE.Box3Helper(bbox);
        this.#scene.add(boundingBoxHelper);
        const size = bbox.getSize(new THREE.Vector3());
        // Create a box helper
        
        const boxGeometry = new THREE.BoxGeometry(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
        if (size.x > 1) {
            // add label
            const text = document.createElement( 'div' );
            text.style.backgroundColor = 'rgba(50,50,50,0.5)';
            text.style.color = 'white';
            text.className = 'dim-label';
            text.style.borderRadius = '5px';
            text.style.padding = '5px';
            text.dataset.value = size.x;

            if (this.#units == "meters") {
                const roundDist = Math.round(size.x * 100) / 100;
                text.textContent = roundDist + " m";
            } else if (this.#units == "feet") {
                const feet = size.x * 3.281;
                const flooredFeet = Math.floor(feet);
                const inches = Math.round((feet - flooredFeet) * 12);  
                text.textContent = flooredFeet + " ft. " + inches + " in.";
            }
    
            const label = new CSS2DObject( text );
            label.name = "xlabel";
            if (this.#rotated) {
                label.position.set(-bbox.min.z, bbox.min.y, (bbox.min.x + bbox.max.x) / 2)
            } else {
                label.position.set((bbox.min.x + bbox.max.x) / 2, bbox.min.y, bbox.min.z)
            }
            obj.add(label)
        } 
        if (size.z > 1) {
            // add label
            const text = document.createElement( 'div' );
            text.style.backgroundColor = 'rgba(50,50,50,0.5)';
            text.style.color = 'white';
            text.className = 'dim-label';
            text.style.borderRadius = '5px';
            text.style.padding = '5px';
            text.dataset.value = size.z;

            if (this.#units == "meters") {
                const roundDist = Math.round(size.z * 100) / 100;
                text.textContent = roundDist + " m";
            } else if (this.#units == "feet") {
                const feet = size.z * 3.281;
                const flooredFeet = Math.floor(feet);
                const inches = Math.round((feet - flooredFeet) * 12);  
                text.textContent = flooredFeet + " ft. " + inches + " in.";
            }
            
            const label = new CSS2DObject( text );
            label.name = "zlabel";
            if (this.#rotated) {
                label.position.set(-(bbox.min.z + bbox.max.z) / 2, bbox.min.y, bbox.min.x)
            } else {
                label.position.set(bbox.min.x, bbox.min.y, (bbox.min.z + bbox.max.z) / 2)
            }
            obj.add(label)
        }
        boxGeometry.dispose()
    }

    /**
     * Updates the UI time and date input elements based on the inputted date.
     * @param {Date} date 
     */
    updateDateTime(date) {
        let day = date.getDate(),
            month = date.getMonth() + 1,
            year = date.getFullYear(),
            hour = date.getHours(),
            min  = date.getMinutes();

        month = (month < 10 ? "0" : "") + month;
        day = (day < 10 ? "0" : "") + day;
        hour = (hour < 10 ? "0" : "") + hour;
        min = (min < 10 ? "0" : "") + min;

        let today = year + "-" + month + "-" + day,
            displayTime = hour + ":" + min; 

        document.getElementById('date-input').value = today;      
        document.getElementById("time-input").value = displayTime;
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
     */
    #updateScene() {
        if (this.sunSim) {
            this.skyController.dateTime.setMinutes(this.skyController.dateTime.getMinutes() + 1);
            this.updateDateTime(this.skyController.dateTime);
            this.onSkyChange();
        }

        const displayModeElement = document.getElementById("display-mode");
        const displayDistanceElement = document.getElementById("measure-distance");
        if (this.#controls.orthoMode == "measure") {            
            displayModeElement.textContent = "Measurement: ";
            const measure_points = this.#controls.getMeasurePoints();
            if (measure_points.length > this.#measurement_objects.vertices.children.length) {
                const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial ); 
                const point = measure_points[measure_points.length-1];
                sphere.position.set(point.x, point.y, point.z);
                sphere.updateMatrixWorld(true);
                this.#measurement_objects.vertices.add( sphere );
                const lineGeometry = new THREE.BufferGeometry().setFromPoints( measure_points );
                this.resources.push(lineGeometry);
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
        if (this.#camera.name !== "ortho") {
            const elapsedTime = Date.now() - this.#startTime;
            this.#grassUniforms.iTime.value = elapsedTime;
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
     */
    #animate () {
        requestAnimationFrame(() => {
            this.#updateScene();
            this.#controls.updateControls(this.#camera);           
            this.#renderer.render(this.#scene, this.current_camera);
            this.#labelRenderer.render(this.#scene, this.current_camera);
            this.#animate();
        });
    }
    
    /**
     * Updates cameras correctly when window is resized.
     * @param {*} camera 
     */
    #onWindowResize(camera){            
        this.#renderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight, true);
        this.#labelRenderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight, true);
        if (this.#camera.name == "ortho") {
            this.#camera.setOrthoCamera(this.#canvas, this.#modelSize, 2 );
            this.current_camera = this.#camera.ortho;
        } else {
            camera.aspect = this.#canvas.offsetWidth / this.#canvas.offsetHeight;
            camera.updateProjectionMatrix();
        }

    }

    /**
     * Sets the scene view to inside mode by updating camera, controls, and objects.
     */
    setInsideViewMode() {
        this.view = "inside";
        this.#scene.remove(this.#lights.room);
        this.#scene.remove(this.#objects.ceiling);
        this.#scene.add(this.#grassMesh);
        this.#scene.remove(this.#lights.spot);
        this.#scene.add(this.#sun);
        this.#scene.add(this.#ground1);
        this.#scene.add(this.#ground2);
        this.#ground1.visible = false;
        this.#ground2.visible = true;
        this.#camera.setInsideCamera(this.#canvas);
        this.current_camera = this.#camera.inside;
        this.#controls.switchControls("inside");
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );

        // add ceiling to the inside view
        const ceilingGeo = new THREE.BoxGeometry(this.#modelSize.x, 0.1, this.#modelSize.z);
        this.resources.push(ceilingGeo)
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        if (this.#modelSize.x < this.#modelSize.z) {
            ceiling.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI / 2);
        }
        ceiling.position.y = this.#modelSize.y;
        ceiling.castShadow = true;
        ceiling.receiveShadow = true;
        this.#objects.ceiling = ceiling;
        this.#scene.add(ceiling);

        const roomLight = new THREE.DirectionalLight(0xe0f1ff, 20);
        roomLight.position.set(0, ceiling.position.y-0.1, 0);
        roomLight.castShadow = true;
        this.#scene.add(roomLight);
        this.#lights.room = roomLight;
        
        //enable inside control panel
        // console.log(this.gui.children[2]);
        this.#guiControllers.insideControls.children.forEach(child =>{
            child.enable();
        })
        //enable show grass checkbox + set it to true at first
        this.#guiControllers.objControls.children[3].enable().setValue(true);
        //disable dimension checkbox + set it to false
        this.#guiControllers.objControls.children[2].disable().setValue(false);
        
        //enable sky conditions control panel
        this.#guiControllers.skyControls.children.forEach(child =>{
            child.enable();
        })
    }
    /**
     * Sets the scene view to outside mode by updating camera, controls, and objects.
     */
    setOutsideViewMode() {
        this.view = "outside";
        this.#scene.add(this.#grassMesh);
        this.#scene.add(this.#ground1);
        this.#scene.add(this.#ground2);
        this.#grassMesh.visible = false;
        this.#ground1.visible = true;
        this.#ground2.visible = false;
        this.#scene.add(this.#sun);
        this.#scene.remove(this.#lights.spot);
        this.#camera.setOutsideCamera(this.#canvas);
        this.current_camera = this.#camera.outside;
        this.#controls.switchControls("outside");
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        this.#scene.remove(this.#objects.ceiling);
        this.#scene.remove(this.#lights.room);
        
        
        //enable show grass + set it to false at first
        this.#guiControllers.objControls.children[3].enable().setValue(false);
        //enable dimentsion + set it to true at first
        this.#guiControllers.objControls.children[2].enable().setValue(true);
        // console.log(this.gui.children[1].children[3]);
        //disable inside control panel
        this.#guiControllers.insideControls.children.forEach(child =>{
            child.disable();
        })
        //enable sky conditions control panel
        this.#guiControllers.skyControls.children.forEach(child =>{
            child.enable();
        })
    }

    /**
     * Sets the scene view to ortho mode by updating camera, controls, and objects.
     */
    setOrthoViewMode() {
        this.view = "ortho";
        this.#scene.remove(this.#grassMesh);
        this.#scene.remove(this.#sun);
        this.#scene.add(this.#lights.spot);
        this.#camera.setOrthoCamera(this.#canvas, this.#modelSize, 2);
        this.current_camera = this.#camera.ortho;
        this.#controls.switchControls("ortho");
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );
        this.#scene.remove(this.#objects.ceiling);
        this.#scene.remove(this.#lights.room);
        this.#scene.add(this.#ground1);
        this.#scene.remove(this.#ground2);
        this.#ground1.visible = true;
        
        //disable inside control panel
        this.#guiControllers.insideControls.children.forEach(child =>{
            child.disable();
        })
        //disable sky conditions control panel
        this.#guiControllers.skyControls.children.forEach(child =>{
            child.disable();
        })
        //disable show grass
        this.#guiControllers.objControls.children[3].disable().setValue(false);
        //enable dimentsion + set it to true at first
        this.#guiControllers.objControls.children[2].enable().setValue(true);
    }

    /**
     * Toggles the visibility of any child that includes the target name.
     * Intended for "bounding_box" and "label"
     * @param {boolean} value 
     * @param {String} target 
     */
    toggleAllObjects (value, target) {
        const allObjects = this.#objects.furniture.concat(this.#objects.walls)
                                                  .concat(this.#objects.uploaded)
                                                  .concat(this.#objects.windows)
                                                  .concat(this.#objects.floor);
        allObjects.forEach( (obj) => {
            obj.children.forEach((child) => {
                if (child.name.includes(target)) {
                    child.visible = value;
                }
            })
        });
        if (target == "bounding_box") {
            this.#showBoundingBoxes = value;
        }
    }

    /**
     * Updates all elements that rely on units based on the units input.
     * @param {String} units "meter" or "feet"
     */
    setUnits (units) {
        this.#units = units;
        const dimLabels = document.querySelectorAll(".dim-label");

        if (units == "meter"){
            dimLabels.forEach( (dimLabel) => {
                const roundDist = Math.round(dimLabel.dataset.value * 100) / 100;
                dimLabel.textContent = roundDist + " m";
            });
        } else if (units == "feet") {
            dimLabels.forEach( (dimLabel) => {
                const feet = dimLabel.dataset.value * 3.281;
                const flooredFeet = Math.floor(feet);
                const inches = Math.round((feet - flooredFeet) * 12);  
                dimLabel.textContent = flooredFeet 
                + " ft. " + inches + " in.";
            });
        }
        this.#controls.units = units;
    }

/**
 * Downloads the current 3D scene model as a GLB file.
 * 
 * This function uses the GLTFExporter to export the current scene's model to the GLB format.
 * It sets the model's position to the origin, updates the world matrix, exports the model,
 * creates a downloadable file, and triggers the download. After exporting, it resets the 
 * model's position.
 * @method downloadScene
 */
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
        this.#model.updateMatrixWorld(true);
    }

    /**
     * This function removes all objects that were added into the 
     * scene and resets the camera view.
     */
    reset () {
        this.#objects.uploaded.forEach( (obj) => {
            obj.clear();
            this.#model.remove(obj);
        });
        this.#objects.uploaded = [];
        if (this.#camera.name == "inside") {
            this.#camera.setInsideCamera();
        } else if (this.#camera.name == "outside") {
            this.#camera.setOutsideCamera();
        }
    }

/**
 * Retrieves the data of the current 3D scene, including object positions and rotations, and the room ID.
 * 
 * This function iterates through the uploaded objects in the scene and collects their name, position, and
 * rotation data into an array. It also checks for the room ID and includes it in the returned data.
 * 
 * @method getSceneData
 * @returns {Object} An object containing:
 *  - objectsData: {Array} An array of objects, each containing:
 *      - name: {string} The name of the object.
 *      - position: {Object} The position of the object with properties x, y, and z.
 *      - rotation: {Object} The rotation of the object with properties x, y, and z.
 *  - roomID: {string|null} The ID of the room if it exists, otherwise null.
 */
    getSceneData() {
        const objectsData = []
        this.#objects.uploaded.forEach( (obj) => {
            const objData = {};
            objData.name = obj.name;
            objData.position = {};
            objData.position.x = obj.position.x;
            objData.position.y = obj.position.y;
            objData.position.z = obj.position.z;

            objData.rotation = {};
            objData.rotation.x = obj.rotation.x;
            objData.rotation.y = obj.rotation.y;
            objData.rotation.z = obj.rotation.z;
            objectsData.push(objData);
        });
        let roomID;
        if ("_id" in this.#room) {
            roomID = this.#room._id;
        } else {
            roomID = null;
        }
        return {objectsData: objectsData, roomID: roomID};
    }

    getControls() {
        return this.#controls;
    }
    getRenderer() {
        return this.#renderer;
    }

    /**
     * Disposes all resources possible to free GPU memory.
     */
    dispose () {
        console.log(this.resources)
        this.#scene.clear();
        const allObjects = this.#objects.furniture.concat(this.#objects.walls).concat(this.#objects.uploaded).concat(this.#objects.windows);
        allObjects.forEach( (obj) => {
            obj.clear();
            this.#model.remove(obj);
        });
        for (let i = this.resources.length - 1; i >= 0; i--) {
            console.log(this.resources[i])
            this.resources[i].dispose();
            delete this.resources[i];
        }
        this.resources = [];
        this.#controls.dispose();
        $('#inside-view').off('click');
        $('#outside-view').off('click');
        $('#ortho-view').off('click');
        $('#m').off('click')
        $('#p3').off('click')
        $('#reset').off('click')
        $(document).off('keydown')
        $(window).off("fullscreenchange")
        $("#date-input").off('change')
        $('#time-input').off('change')
        $('#fullscreen-button').off('click');
        $(document).off('')
        $("#gui-container").empty()
    }
}



export {DemoScene}


