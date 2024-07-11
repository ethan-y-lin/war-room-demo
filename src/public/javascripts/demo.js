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
     * An object containing information about the room
     * including, _id, url, and name.
     * @type {Object}
     * @private
     */
    #room; 
    
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

    #grassUniforms;
    #grassMesh;
    #startTime;

    #objectGroups;
    #sky;
    #sun;
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
        this.sunSim = false;
        this.resources = [];
        this.#canvas = document.getElementById("scene-container");
        this.#objects = {walls: [], 
                        furniture: [],
                        doors: [],
                        windows: [],
                        uploaded: []};
        this.#objectGroups = [];
        this.#showBoundingBoxes = false;
        this.#lights = {};
        this.#scene = new THREE.Scene();
        // this.room = new URL('../assets/warroom1.glb', import.meta.url);
        this.#room = room;
        this.#units = "feet";
        // initialize geometries
        this.#grid_scale = 0.1; // meter

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
        await this.#initGeometries(this.#scene);

        // // initialize camera
        this.#camera = new DynamicCamera(this.#canvas, this.#modelSize); // initializes to orthoCamera
        this.current_camera = this.#camera.ortho;
        this.view = "ortho";
        // initialize controls 
        this.#controls = new DemoControls(this.#camera, this.#canvas, this.#scene, this.#objects, this.#modelSize); // initializes to orthoControls
        this.#controls.units = this.#units;

        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho) });
        const hud = document.getElementById("hud");
        const resizeObserer = new ResizeObserver(() => {
            this.#onWindowResize(this.current_camera);
        })
        resizeObserer.observe(this.#canvas);

        this.#measurement_objects = {vertices: new THREE.Group(), edges: new THREE.Group()};
        this.#measurement_objects.vertices.name = "vertices";
        this.#measurement_objects.edges.name = "edges";
        this.#scene.add(this.#measurement_objects.vertices);
        this.#scene.add(this.#measurement_objects.edges);

        this.isFullScreen = false;

        this.#labelRenderer = new CSS2DRenderer();
        this.#labelRenderer.setSize(this.#canvas.offsetWidth, this.#canvas.offsetHeight );
        this.#labelRenderer.domElement.style.position = 'absolute';
        this.#labelRenderer.domElement.style.top = '0px';
        this.#labelRenderer.domElement.style.pointerEvents = 'none';
        this.#canvas.appendChild( this.#labelRenderer.domElement );

        for (let objData of objects) {
            this.addObject(objData.object, objData.position, objData.rotation);
        }

        this.gui = new GUI({autoPlace: false});
        this.initGui(this.gui);
        this.#initListeners();
    }

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
        folderSky.add( this.skyController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( this.onSkyChange());
        folderSky.add( this.skyController, 'rayleigh', 0.0, 4, 0.001 ).onChange( this.onSkyChange());
        folderSky.add( this.skyController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( this.onSkyChange());
        folderSky.add( this.skyController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( this.onSkyChange());
        folderSky.add( this.skyController, 'exposure', 0, 1, 0.0001 ).onChange( this.onSkyChange());
        // Add latitude and longitude inputs to the GUI
        folderSky.add(this.skyController, 'latitude', -90, 90).onChange(this.onSkyChange())
        folderSky.add(this.skyController, 'longitude', -180, 180).onChange(this.onSkyChange());
        const sunSimToggle = {
            toggle: false
        }
        folderSky.add(sunSimToggle, 'toggle').name("Sun Sim").onChange( (value) => this.sunSim = value);

        // toggling light sources
        const hLight = this.getHemiLight();
        const aLight = this.getAmbientLight();
        const dLight = this.getDirectionalLight();
        const sLight = this.getSpotLight();
        const folderLights = gui.addFolder('Light Conditions');

        const hToggle = {
            toggle: true
        };
        const aToggle = {
            toggle: true
        };
        const dToggle = {
            toggle: true
        };
        const sToggle = {
            toggle: true
        };

        folderLights.add(hToggle, 'toggle').name('Hemisphere light').onChange(value =>{
            hLight.visible = value;
        });
        folderLights.add(aToggle, 'toggle').name('Ambient light').onChange(value =>{
            aLight.visible = value;
        });
        folderLights.add(dToggle, 'toggle').name('Directional light').onChange(value =>{
            dLight.visible = value;
        });
        folderLights.add(sToggle, 'toggle').name('Spot light').onChange(value =>{
            sLight.visible = value;
        });

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
            this.toggleAllObjects(value, "bounding_box");
        });

        const showDimensions = {
            toggle: true
        }
        folderControls.add(showDimensions, 'toggle').name('Show Dimensions').onChange(value => {
            this.toggleAllObjects(value, "label");
        });

        //changing material color?
        // const folderColors = folderControls.addFolder('Furniture Colors');
        // folderColors.close();

        // Moving Controls
        const folderMoving = gui.addFolder('General Controls');
        // const setOrthoMode = {
        //     drag: () => {
        //         this.#controls.orthoMode = "drag";
        //     },
        //     measure: () => {
        //         this.#controls.orthoMode = "measure";
        //     }
        // }
        // folderMoving.add({selectedFunction: 'drag'}, 'selectedFunction', Object.keys(setOrthoMode))
        // .name('Orthographic').listen()
        // .onChange((selectedFunction) => {
        //     if (setOrthoMode[selectedFunction]) {
        //         setOrthoMode[selectedFunction]();
        //     }
        // });

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

        folderMoving.add({selectedFunction: 'teleport'}, 'selectedFunction', Object.keys(setInsideMode))
        .name('Inside')
        .onChange((selectedFunction) => {
            if (setInsideMode[selectedFunction]) {
                setInsideMode[selectedFunction]();
            }
        });
    
        //changing measurement units
        const folderMeasurements = gui.addFolder('Units');
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
    
    #initListeners() {

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
        $(window).on("fullscreenchange", (event) => {
            if (this.isFullScreen) {
                this.isFullScreen = false;
            }
        });

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
                } else if (domElement.mozRequestFullScreen){
                    domElement.mozRequestFullScreen();
                }

                if (this.#camera.name == "inside") {
                    this.#controls.hideBlocker();
                    this.#controls.getPointerLock().isLocked = true;
                    domElement.addEventListener( 'mousemove', this.#controls.getLock());
                }
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
        const shift = bbox.min.y;
        return new THREE.Vector3(0, -shift + 0.01, 0);
    }

    addObject (object, position = null, rotation = null) {

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
            } else {
                newObject.position.set(position.x, position.y, position.z);
            }   

            if (rotation != null) {
                newObject.rotation.x = rotation.x;
                newObject.rotation.y = rotation.y;
                newObject.rotation.z = rotation.z;
            }

            // Compute the bounding box of the object
            const box = new THREE.Box3().setFromObject(newObject, true);

            // Create a box helper
            const boxGeometry = new THREE.BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
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


    #initSky(scene) {

        // Add Sky
        this.#sky = new Sky();
        this.#sky.scale.setScalar( 45000 );
        scene.add( this.#sky );

        // Add Sun 
        this.#sun = new THREE.DirectionalLight(0xffffff, 10);
        this.#sun.castShadow = true;
        
        scene.add(this.#sun);

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
        // directionalLight.color.setHSL(0.1, 1, 0.95);
        directionalLight.castShadow = true;
        directionalLight.position.set(-20, 70, 100);
        directionalLight.shadow.camera.bottom = -12;
        this.#lights.direct = directionalLight;
        scene.add(directionalLight);

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

        // const lightHelper = new THREE.SpotLightHelper( spotLight );
        // scene.add( lightHelper );
        
        // GRASS
        // Parameters
        const PLANE_SIZE = 30;
        const BLADE_COUNT = 100000;
        const BLADE_WIDTH = 0.1;
        const BLADE_HEIGHT = 0.5;
        const BLADE_HEIGHT_VARIATION = 0.2;

        // Grass Texture
        const grassTexture = new THREE.TextureLoader().load('../img/grass.jpg');
        const cloudTexture = new THREE.TextureLoader().load('../img/cloud.jpg');
        cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping;

        // Time Uniform
        this.#startTime = Date.now();
        const timeUniform = { type: 'f', value: 0.0 };

        // Grass Shader
        this.#grassUniforms = {
            textures: { value: [grassTexture, cloudTexture] },
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
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        this.resources.push(groundGeo);
        const groundMat = new THREE.MeshLambertMaterial({color: 0x1c150d});
        this.resources.push(groundMat);
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI/2;
        ground.position.y = -0.2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        this.#initSky(scene);

        //skydome
        // const skyGeo = new THREE.SphereGeometry(800, 32, 15);
        // this.resources.push(skyGeo)
        // const textureLoader = new THREE.TextureLoader();
        // const skyTexture = textureLoader.load('../img/sky.png');
        // const skyMat = new THREE.MeshBasicMaterial({map: skyTexture, side: THREE.BackSide});
        // this.resources.push(skyMat);
        // const sky = new THREE.Mesh(skyGeo, skyMat);
        // scene.add(sky);
        
        // const axesHelper = new THREE.AxesHelper( 100 );
        // scene.add( axesHelper );
        const assetLoader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            assetLoader.load(this.#room.room_url.href, (gltf) => {
                console.log("loading model");
                this.#model = gltf.scene; // model

                // get model dimensions
                let bbox = new THREE.Box3().setFromObject(this.#model);
                this.#modelSize = bbox.getSize(new THREE.Vector3());
                if (this.#modelSize.x < this.#modelSize.z) {
                    this.#model.rotateOnAxis(new THREE.Vector3(0,1,0), Math.PI / 2);
                    const temp = this.#modelSize.x;
                    this.#modelSize.x = this.#modelSize.z;
                    this.#modelSize.z = temp;
                }
                // add model to scene
                scene.add(this.#model);
                this.#model.position.set(0, this.#modelSize.y / 2, 0); // makes the ground at y = 0;

                // initialize objects
                const objects = [...this.#model.children]; // must be copy because removing directly will cause some to be skipped.
                this.#organizeObjects(objects);

                const NO_GRASS_RECT = [-this.#modelSize.x / 2, this.#modelSize.x / 2, -this.#modelSize.z / 2, this.#modelSize.z / 2, ]
                const grassGeo = generateFieldGeo(PLANE_SIZE, BLADE_COUNT, BLADE_WIDTH, BLADE_HEIGHT, BLADE_HEIGHT_VARIATION, NO_GRASS_RECT)
                this.resources.push(grassGeo)
                const grassMesh = new THREE.Mesh(grassGeo, grassMaterial);
                this.#grassMesh = grassMesh;

                // initializes grid
                const size = Math.max(this.#modelSize.x, this.#modelSize.z);
                // const gridHelper = new THREE.GridHelper(size, size / this.#grid_scale, 0x000000, 0x097969);
                // //scene.add(gridHelper);
                resolve();
            }, undefined, (error) => {
                reject(error);
            });
        });
    }

    #getObjectInfo(name) {
        let type = "";
        let groupNum = "";
        let soloNum = "";
        let split1 = name.indexOf("_");
        let split2 = name.lastIndexOf("_");
        type = name.substring(0, split1);
        if (split1 + 1 < name.length) {
            if (split1 == split2) {
                groupNum = name.substring(split1 + 1, name.length);
                return {type: type, groupNum: groupNum, soloNum: "NA"};
            } else {
                groupNum = name.substring(split1 + 1, split2);
                if (split2 + 1 < name.length) {
                    soloNum = name.substring(split2 + 1, name.length);
                    return {type: type, groupNum: groupNum, soloNum: soloNum};
                }
            }
        }
        return {type: type, groupNum: "NA", soloNum: "NA"}; 
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
            const objInfo = this.#getObjectInfo(obj.name);
            if (objInfo.type == "door") {
                this.#objects.doors.push(obj);
            } else if (objInfo.type == "window") {
                this.#objects.windows.push(obj);
            } else if (objInfo.type == "wall" || objInfo.type == "floor") {
                const group = objInfo.type + objInfo.groupNum;
                if (! (this.#objectGroups.includes(group))) {
                    this.#objectGroups.push(group);
                    obj.clear();
                    this.#addDimensionLabels(obj);
                }
                this.#objects.walls.push(obj);
                if(objInfo.type == "floor"){
                    obj.material.color.setHex(0x8b5a2b);
                    obj.receiveShadow = true;
                } else if(objInfo.type == "wall"){
                    obj.material.color.setHex(0xedeae5);
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            } else {
                this.#model.remove(obj);
            }
            this.#model.remove(obj);
        });
    }

    #addDimensionLabels (obj) {
        // get model dimensions
        let bbox = new THREE.Box3().setFromObject(obj);
        const size = bbox.getSize(new THREE.Vector3());
        // Create a box helper
        const boxGeometry = new THREE.BoxGeometry(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
        this.resources.push(boxGeometry);
        const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);

        boundingBox.position.set((bbox.max.x + bbox.min.x) / 2, (bbox.max.y + bbox.min.y) / 2, (bbox.max.z + bbox.min.z) / 2);
        boundingBox.name = "bounding_box";
        boundingBox.visible = this.#showBoundingBoxes;
        obj.add(boundingBox);
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
            label.position.set((bbox.min.x + bbox.max.x) / 2, bbox.min.y, bbox.min.z)
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
            label.position.set(bbox.min.x, bbox.min.y, (bbox.min.z + bbox.max.z) / 2)
            obj.add(label)
        }
    }

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
     * @private
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
     *
     * @private
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
     * 
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
        this.#objects.ceiling = ceiling;
        this.#scene.add(ceiling);

        const roomLight = new THREE.DirectionalLight(0xe0f1ff, 8);
        roomLight.position.set(0, ceiling.position.y-0.1, 0);
        roomLight.castShadow = true;
        this.#scene.add(roomLight);
        this.#lights.room = roomLight;
    }
    /**
     * Sets the scene view to outside mode by updating camera, controls, and objects.
     */
    setOutsideViewMode() {
        this.view = "outside";
        // this.#scene.add(this.#grassMesh);
        this.#camera.setOutsideCamera(this.#canvas);
        this.current_camera = this.#camera.outside;
        this.#controls.switchControls("outside");
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
        this.view = "ortho";
        this.#scene.remove(this.#grassMesh);
        this.#camera.setOrthoCamera(this.#canvas, this.#modelSize, 2);
        this.current_camera = this.#camera.ortho;
        this.#controls.switchControls("ortho");
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.outside)} );
        window.removeEventListener( 'resize', () => {this.#onWindowResize(this.#camera.inside)} );
        window.addEventListener( 'resize', () => {this.#onWindowResize(this.#camera.ortho)} );

        this.#scene.remove(this.#objects.ceiling);
        this.#scene.remove(this.#lights.room);
    }

    toggleAllObjects (value, target) {
        const allObjects = this.#objects.furniture.concat(this.#objects.walls).concat(this.#objects.uploaded).concat(this.#objects.windows);
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
        this.#objects.uploaded.forEach( (obj) => {
            obj.clear();
            this.#model.remove(obj);
        });
    }

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

function convertRange (val, oldMin, oldMax, newMin, newMax) {
    return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}
  
function generateFieldGeo(
    PLANE_SIZE, 
    BLADE_COUNT, 
    BLADE_WIDTH, 
    BLADE_HEIGHT, 
    BLADE_HEIGHT_VARIATION,
    NO_GRASS_RECT // New parameter: [xMin, xMax, zMin, zMax] for the rectangular area where no grass should be placed
  ) {
    console.log("GENERATRING FIELD")
    const positions = [];
    const uvs = [];
    const indices = [];
    const colors = [];
  
    for (let i = 0; i < BLADE_COUNT; i++) {
      const VERTEX_COUNT = 5;
      const surfaceMin = PLANE_SIZE / 2 * -1;
      const surfaceMax = PLANE_SIZE / 2;
  
      let x = Math.random() * PLANE_SIZE - PLANE_SIZE / 2;
      let z = Math.random() * PLANE_SIZE - PLANE_SIZE / 2;
  
      // Check if the blade position is inside the no-grass rectangle
      if (x >= NO_GRASS_RECT[0] && x <= NO_GRASS_RECT[1] && z >= NO_GRASS_RECT[2] && z <= NO_GRASS_RECT[3]) {
        if (x > 0) {
            x = NO_GRASS_RECT[1] + Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[1])
        } else {
            x = NO_GRASS_RECT[0] - Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[1])
        }
        if (z > 0) {
            z = NO_GRASS_RECT[3] + Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[4]);
        } else {
            z = NO_GRASS_RECT[2] - Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[4]);
        }
      }
  
      const pos = new THREE.Vector3(x, 0, z);
      const uv = [convertRange(pos.x, surfaceMin, surfaceMax, 0, 1), convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)];
  
      const blade = generateBlade(pos, i * VERTEX_COUNT, uv, BLADE_WIDTH, BLADE_HEIGHT, BLADE_HEIGHT_VARIATION);
      blade.verts.forEach(vert => {
        positions.push(...vert.pos);
        uvs.push(...vert.uv);
        colors.push(...vert.color);
      });
      blade.indices.forEach(indice => indices.push(indice));
    }
  
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
  
    return geom;
  }
  
  
  function generateBlade (center, vArrOffset, uv, BLADE_WIDTH, BLADE_HEIGHT, BLADE_HEIGHT_VARIATION) {
    const MID_WIDTH = BLADE_WIDTH * 0.5;
    const TIP_OFFSET = 0.1;
    const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);
  
    const yaw = Math.random() * Math.PI * 2;
    const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const tipBend = Math.random() * Math.PI * 2;
    const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));
  
    // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
    const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1));
    const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1));
    const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
    const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
    const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));
  
    tl.y += height / 2;
    tr.y += height / 2;
    tc.y += height;
  
    // Vertex Colors
    const black = [0, 0, 0];
    const gray = [0.5, 0.5, 0.5];
    const white = [1.0, 1.0, 1.0];
  
    const verts = [
      { pos: bl.toArray(), uv: uv, color: black },
      { pos: br.toArray(), uv: uv, color: black },
      { pos: tr.toArray(), uv: uv, color: gray },
      { pos: tl.toArray(), uv: uv, color: gray },
      { pos: tc.toArray(), uv: uv, color: white }
    ];
  
    const indices = [
      vArrOffset,
      vArrOffset + 1,
      vArrOffset + 2,
      vArrOffset + 2,
      vArrOffset + 4,
      vArrOffset + 3,
      vArrOffset + 3,
      vArrOffset,
      vArrOffset + 2
    ];
  
    return { verts, indices };
  }

export {DemoScene}


