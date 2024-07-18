import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import { MobileControls } from './mobileControls';
import { OBB } from 'three/examples/jsm/math/OBB.js';

const blackMaterial = new THREE.MeshBasicMaterial( {color: 0x000000} ); 
const redMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} ); 
const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000
});

/**
 * This class contains the control logic for each of the views and modes. 
 * Using ThreeJS add-on controls, this class supports "drag controls" for 
 * orthographic view, "orbit controls" and "transform controls" for outside view,
 * and "pointer lock controls" for the inside view.
 */
class DemoControls {
    
    /**
     * The canvas HTML element with id: "#scene-container".
     * @type {object} (HTML DOM element)
     * @private 
     */
    #canvas; 

    /**
     * The custom camera object that contains the camera information
     * for each of the three views, "ortho", "outside", and "inside".
     * @type {DynamicCamera}
     * @private
     */
    #camera;

    /**
     * The ThreeJS scene object that is rendered.
     * @type {Scene}
     * @private
     */
    #scene;
    
    /**
     * All of the objects in the scene that are not pass through.
     * @type {Array.<Object3D>}
     * @private
     */
    #objects;

    ///Hopefully will change to constants
    /**
     * The current view of the scene.
     * Either: "ortho", "outside", or "inside"
     * @type {String}
     * @private
     */
    #view;
    /**
     * All of the objects in the scene that are can pass through.
     * Windows and doors.
     * @type {Array.<Object3D>}
     * @private
     */
    #pass_through_objects;

    /**
     * All of the objects in the scene that are can be dragged.
     * Furniture and uploaded.
     * @type {Array.<Object3D>}
     * @private
     */
    #draggableObjects;

    /**
     * The size of the model.
     * @type {THREE.Vector3}
     * @private
     */
    #modelSize;
    
    ///Hoping to change to constants
    /**
     * The control mode. Either: "regular" or "measure"
     * @type {String}
     */
    #mode;

    /**
     * The measure points for "measure" mode in ortho view.
     * @type {Array.<THREE.Vector3>}
     * REQUIRES: measure_points.length <= 2
     */
    #measure_points;

    ////// CONTROL OBJECTS //////

    // INVARIANT: Only one of these objects is allowed to be non-null valued at 
    // one time.
    /**
     * The orbit controls object.
     * @type {OrbitControls}
     * @private
     */
    #orbit;

    /**
     * The transform controls object.
     * @type {TransformControls}
     * @private
     */
    #gumball;

    /**
     * The last known state of the gumball.
     * Ex. {mode: 'rotate', }
     * @type {?}
     * @private
     */
    #gumballState;

    /**
     * The pointer lock controls object.
     * @type {PointerLockControls}
     * @private
     */
    #pointerLock;

    ////// ////// ////// //////

    // FOR POINTER LOCK CONTROLS (INSIDE CAMERA VIEW)

    /**
     * The time at the previous tick.
     * @type {?}
     * @private
     */
    #prev_time;

    /**
     * The velocity of the user.
     * @type {THREE.Vector3}
     * @private
     */
    #velocity;

    /**
     * The direction of the user.
     * @type {THREE.Vector3}
     * @private
     */
    #direction;

    /**
     * Boolean variables for whether the user is moving in a certain direction.
     * @type {boolean}
     * @private
     */
    #moveForward;
    #moveBackward;
    #moveLeft;
    #moveRight;

    /**
     * The bounding box for the user. 
     * @type {THREE.Box3}
     * @private
     */
    #insideCameraBB;

    /**
     * The bounding boxes for all non-pass-through objects
     * @type {Array.<THREE.Box3>}
     * @private
     */
    #wallBBs;
    #wallBBDisplays;

    /////// FOR DRAG CONTROLS (ORTHO VIEW) //////
    /**
     * The raycaster used by the object.
     * @type {THREE.Raycaster}
     * @private
     */
    #raycaster;
    

    /**
     * The dragged object's position at the start of a drag.
     * Necessary to revert the object's position if the drag 
     * is unsuccessful.
     * @type {THREE.Vector3}
     * @private
     */
    #dragOrigin;
    
    #measureGroup;
    #floorObject;
    #insidePointer;
    #moveToPoint;
    #moving;

    #mobile;
    ////// ////// ////// //////


    constructor (camera, canvas, scene, objects, modelSize) {
        this.#initialize(camera, canvas, scene, objects, modelSize);
    }

    /**
     * Initializes the DemoControls with the provided parameters.
     * 
     * This function sets up the scene, camera, objects, and various controls
     * for the demo. It initializes properties for the canvas, scene, objects, 
     * and control modes. It also sets up the initial state for different types 
     * of controls and prepares the scene for interaction.
     *
     * @private
     * @param {DynamicCamera} camera - The custom camera object containing camera information for various views.
     * @param {HTMLCanvasElement} canvas - The canvas HTML element with id: "#scene-container".
     * @param {THREE.Scene} scene - The ThreeJS scene object that is rendered.
     * @param {Object} objects - The object containing different categories of 3D objects.
     * @param {Array.<THREE.Object3D>} objects.furniture - The furniture objects in the scene.
     * @param {Array.<THREE.Object3D>} objects.walls - The wall objects in the scene.
     * @param {Array.<THREE.Object3D>} objects.uploaded - The uploaded objects in the scene.
     * @param {Array.<THREE.Object3D>} objects.doors - The door objects in the scene.
     * @param {Array.<THREE.Object3D>} objects.windows - The window objects in the scene.
     * @param {THREE.Vector3} modelSize - The size of the model.
     */
    #initialize(camera, canvas, scene, objects, modelSize, showBB){
        this.#canvas = canvas;
        this.#camera = camera;
        this.#scene = scene;
        this.#objects = objects;
        this.#modelSize = modelSize;
        this.orthoMode = "drag";
        this.insideMode = "teleport";
        this.#measure_points = [];

        this.#orbit = new OrbitControls(camera.outside, canvas);

        this.#gumball = null;
        this.#gumballState = {mode: 'translate'}
        this.#mobile = new MobileControls(camera.inside, canvas);
        this.#pointerLock = new PointerLockControls(camera.inside, canvas);
        this.#prev_time = performance.now();
        this.#velocity = new THREE.Vector3();
        this.#direction = new THREE.Vector3();
        this.#moveForward = false;
        this.#moveBackward = false;
        this.#moveLeft = false;
        this.#moveRight = false;
        this.#insideCameraBB = new THREE.Box3();
        const wallBBInfo = this.#getWallBB(objects, scene);
        this.#wallBBs = wallBBInfo.boxes;
        this.#wallBBDisplays = wallBBInfo.displays;
        if (!this.showBB){
            this.toggleWallBB();
        }

        this.#raycaster = new THREE.Raycaster();
        this.#dragOrigin = new THREE.Vector3();
        this.#measureGroup = new THREE.Group();
        this.#scene.add(this.#measureGroup);
        this.switchControls("ortho");
        this.units;
        this.#floorObject = null;

        const sphereGeometry = new THREE.SphereGeometry( 0.1, 32, 16 ); 
        const sphere = new THREE.Mesh( sphereGeometry, blackMaterial ); 
        this.#insidePointer = sphere;
        this.#moveToPoint = null;
        this.#moving = false;
    }

    /**
     * Sets the bounding box (`insideCameraBB`) around the inside camera (`insideCamera`).
     * 
     * This function calculates and sets the bounding box (`insideCameraBB`) dimensions based on 
     * the position of the inside camera (`insideCamera`). It defines a minimum and maximum box 
     * around the camera position to encapsulate its spatial boundaries.
     *
     * @private
     * @param {THREE.Box3} insideCameraBB - The bounding box to be set around the inside camera.
     * @param {THREE.Camera} insideCamera - The inside camera whose position defines the bounding box.
     */
    #setCameraBB (insideCameraBB, insideCamera) {
        let minBox = new THREE.Vector3(insideCamera.position.x-0.01, 
            insideCamera.position.y-0.01,
            insideCamera.position.z-0.01);
        let maxBox = new THREE.Vector3(insideCamera.position.x+0.01, 
                insideCamera.position.y,
                insideCamera.position.z+0.01);  
        insideCameraBB.set(minBox, maxBox);
    }


    /**
     * This function resets all of the control objects, removes all event listeners, and 
     * sets control objects to null.
     */
    #reset() {
        // this.#drag.dispose();
        this.#scene.remove(this.#insidePointer);
        this.#pointerLock.dispose();
        this.#mobile.dispose();
        this.#orbit.dispose();
        this.#clearGumball();
        const instructions = document.getElementById( 'instructions' );
        instructions.removeEventListener( 'click', this.#lock);
        this.#pointerLock.removeEventListener('lock', this.hideBlocker);
        this.#pointerLock.removeEventListener('unlock', this.#showBlocker);
        document.removeEventListener('keydown', this.#toggleGumball);
        document.removeEventListener('keydown', this.#insideOnKeyDown);
        document.removeEventListener('keyup',this.#insideOnKeyUp);
        this.#canvas.removeEventListener('click', this.#orthoOnClick);
        this.#canvas.removeEventListener('click', this.#outsideOnClick);
        document.removeEventListener('click', this.#insideOnClick);
        this.#mobile.removeEventListener('dblclick', this.#insideOnDblClick);
        this.#canvas.removeEventListener('mousemove', this.#orthoOnMove);
        this.#pointerLock.enabled = false;
        this.#orbit.enabled = false;
        this.hideBlocker();
    }

    setToMobile() {
        this.#reset();
        console.log("mobile");
        this.#mobile = new MobileControls(this.#camera.inside, this.#canvas);
        this.#scene.add(this.#insidePointer);   
        this.#mobile.addEventListener('dblclick', this.#insideOnDblClick);
    }

    setToNonMobile() {
        this.#reset();
        if (this.insideMode == "teleport") {
            this.#scene.add(this.#insidePointer);   
        } else {
            const collisionObjects = this.#objects.walls;
        }
        console.log("Set to Non Mobile")
        this.#pointerLock = new PointerLockControls(this.#camera.inside, this.#canvas);
        this.#pointerLock.enabled = true;
        const instructions = document.getElementById( 'instructions' );
        instructions.addEventListener( 'click', this.#lock);
        this.#showBlocker();
        this.#pointerLock.addEventListener( 'lock', this.hideBlocker);
        this.#pointerLock.addEventListener( 'unlock', this.#showBlocker);
        document.addEventListener('keydown', this.#insideOnKeyDown);
        document.addEventListener('keyup',this.#insideOnKeyUp);
        document.addEventListener('click', this.#insideOnClick);
    }
    /**
     * Assumes that this.objects and this.draggableObjects are up to date.
     * @param {*} newControl The control type to switch to. Requires either: "ortho", "inside", or "outside"
     * @param {*} camera The camera that the new view uses. Type should be THREE.Camera
     * @param {*} canvas The canvas for the view. Type: DOM element.
     */
    switchControls(newControl) {
        this.#view = newControl;
        if (newControl == "ortho") {
            this.#reset();
            const allObjects = this.getAllObjects();
            document.addEventListener('keydown', this.#toggleGumball);
            this.#canvas.addEventListener('click', this.#orthoOnClick);
            this.#canvas.addEventListener('mousemove', this.#orthoOnMove);
            this.hideBlocker();
        } else if (newControl == "outside") {
            this.#reset();
            const allObjects = this.getAllObjects();
            this.#canvas.addEventListener('click', this.#outsideOnClick);
            document.addEventListener('keydown', this.#toggleGumball);
            this.#orbit = new OrbitControls(this.#camera.outside, this.#canvas);
            this.#orbit.enabled = true;
            this.hideBlocker();
        } else if (newControl == "inside"){
            if (this.insideMode == "mobile") {
                this.setToMobile();
            } else {
                this.setToNonMobile();
            }

        }
    }

    getAllObjects() {
        return this.#objects.furniture.concat(this.#objects.walls)
        .concat(this.#objects.uploaded)
        .concat(this.#objects.windows)
        .concat(this.#objects.floor);
    }

    getDraggableObjects() {
        return this.#objects.furniture.concat(this.#objects.uploaded);
    }

    updateObjects(objects) {
        this.#objects = objects;
    }
    /**
     * Updates the controls based on the current camera view mode.
     * 
     * If the current view mode is "inside":
     * - Updates the pointer lock controls to handle movement based on user input.
     * - Checks for collisions using bounding boxes and adjusts the camera position if collision occurs.
     * - Resets velocity to zero upon collision to prevent further movement.
     * 
     * If the current view mode is "outside":
     * - Updates the orbit controls for the outside view.
     * 
     * @param {DynamicCamera} camera - The camera object containing different views (inside, outside).
     */
    updateControls(camera) {
        if (this.#view == "inside") {
            const time = performance.now();
            if (this.insideMode == "mobile") {
                if (this.#moving) {
                    this.#mobile.pointerSpeed = 0;
                    const delta = ( time - this.#prev_time ) / 1000;
                    this.#moveToPoint.velocity += 5 * delta;
                    if (this.#moveToPoint.velocity * delta * 10 < this.#moveToPoint.distance) {
                        this.#mobile.moveForward(this.#moveToPoint.velocity * delta * 10);
                        this.#moveToPoint.distance -= this.#moveToPoint.velocity * delta * 10;
                    } else {
                        this.#mobile.moveForward (this.#moveToPoint.distance);
                        this.#moving = false;
                        this.#mobile.pointerSpeed = 2;
                    }
                } else {
                    const newRaycaster = new THREE.Raycaster();
                    newRaycaster.setFromCamera(new THREE.Vector2(), this.#camera.inside);
                    const intersects = newRaycaster.intersectObjects(this.getAllObjects(), true);
                    if (intersects.length > 0) {
                        const firstObject = intersects[0].object;
                        this.#insidePointer.position.x = intersects[0].point.x;
                        this.#insidePointer.position.y = intersects[0].point.y;
                        this.#insidePointer.position.z = intersects[0].point.z;

                        if (firstObject.name.includes("floor")) {
                            this.#colorObject(this.#insidePointer, 0x00FF00);
                            this.#floorObject = firstObject;
                        } else {
                            if (this.#floorObject != null) {
                                this.#colorObject(this.#insidePointer, 0xFF0000);
                            }
                        }
                    }
                }
            }
            else if (this.insideMode == "keyboard") {

                if ( this.#pointerLock.isLocked) {
                    const delta = ( time - this.#prev_time ) / 1000;
    
                    this.#velocity.x -= this.#velocity.x * 20.0 * delta;
                    this.#velocity.z -= this.#velocity.z * 20.0 * delta;
    
                    this.#direction.z = Number( this.#moveForward ) - Number( this.#moveBackward );
                    this.#direction.x = Number( this.#moveRight ) - Number( this.#moveLeft );
                    this.#direction.normalize(); // this ensures consistent movements in all directions
    
                    if ( this.#moveForward || this.#moveBackward ) this.#velocity.z -= this.#direction.z * 50.0 * delta;
                    if ( this.#moveLeft || this.#moveRight ) this.#velocity.x -= this.#direction.x * 50.0 * delta;
                    this.#pointerLock.moveRight( - this.#velocity.x * delta );
                    this.#pointerLock.moveForward( - this.#velocity.z * delta );
                    this.#setCameraBB(this.#insideCameraBB, camera.inside);
                    if (this.#checkWallCollisions(this.#insideCameraBB, this.#wallBBs)) {
                        this.#pointerLock.moveRight(this.#velocity.x * delta );
                        this.#pointerLock.moveForward(this.#velocity.z * delta );
                        this.#setCameraBB(this.#insideCameraBB, camera.inside);
                        this.#velocity.x = 0;
                        this.#velocity.z = 0;
                    }
                }
            } else if (this.insideMode == "teleport"){
                if (this.#pointerLock.isLocked) {
                    if (this.#moving) {
                        this.#pointerLock.pointerSpeed = 0;
                        const delta = ( time - this.#prev_time ) / 1000;
                        this.#moveToPoint.velocity += 5 * delta;
                        if (this.#moveToPoint.velocity * delta * 10 < this.#moveToPoint.distance) {
                            this.#pointerLock.moveForward(this.#moveToPoint.velocity * delta * 10);
                            this.#moveToPoint.distance -= this.#moveToPoint.velocity * delta * 10;
                        } else {
                            this.#pointerLock.moveForward (this.#moveToPoint.distance);
                            this.#moving = false;
                            this.#pointerLock.pointerSpeed = 1;
                        }
                    } else {
                        
                        const newRaycaster = new THREE.Raycaster();
                        newRaycaster.setFromCamera(new THREE.Vector2(), this.#camera.inside);
                        
                        const intersects = newRaycaster.intersectObjects(this.getAllObjects(), true);
                        if (intersects.length > 0) {
                            const firstObject = intersects[0].object;
                            this.#insidePointer.position.x = intersects[0].point.x;
                            this.#insidePointer.position.y = intersects[0].point.y;
                            this.#insidePointer.position.z = intersects[0].point.z;

                            if (firstObject.name.includes("floor")) {
                                this.#colorObject(this.#insidePointer, 0x00FF00);
                                this.#floorObject = firstObject;
                            } else {
                                if (this.#floorObject != null) {
                                    this.#colorObject(this.#insidePointer, 0xFF0000);
                                }
                            }
                        }
                    }
                }
            }
            this.#prev_time = time;

        } else if(this.#view == "outside" || this.#view == "ortho") {
            this.#orbit.update();
            if (this.#gumball != null) {
                const object = this.#gumball.object;
                this.#setToGroundHeight(object)
                const boundingBox = new THREE.Box3().setFromObject( object);
                if (this.#checkWallCollisions(boundingBox, this.#wallBBs) || 
                    this.#checkObjectCollisions(object, this.#objects.uploaded)) {
                    this.#colorObject(object, 0xFF0000);
                } else {
                    this.#colorObject(object, 0x000000);
                }
            }
            
        }
    }


    #setToGroundHeight (object) {
        let boundingBox = new THREE.Box3().setFromObject( object);
        const newRaycaster = new THREE.Raycaster(new THREE.Vector3(0, boundingBox.max.y, 0 ), new THREE.Vector3(0,-1,0));

        const intersects = newRaycaster.intersectObjects(this.getAllObjects(),true);
        if (intersects.length > 0) {
            let firstObject;
            if (intersects.length > 1) {
                firstObject = intersects[intersects.length - 2].object;
            } else if (intersects.length == 1) {
                firstObject = intersects[0].object;
            }
            const firstObjectBB = new THREE.Box3().setFromObject( firstObject);
            object.position.set(object.position.x, 
                firstObjectBB.max.y + (object.position.y - boundingBox.min.y) + 0.01,
                object.position.z);
        } else {
            const newRaycaster = new THREE.Raycaster(new THREE.Vector3(0, boundingBox.max.y, 0 ), new THREE.Vector3(0,1,0));
            const intersects2 = newRaycaster.intersectObjects(this.getAllObjects(),true);
            if (intersects2.length > 0) {
                let firstObject;
                if (intersects2.length > 1) {
                    firstObject = intersects2[1].object;
                } else if (intersects2.length == 1) {
                    firstObject = intersects2[0].object;
                }
                const firstObjectBB = new THREE.Box3().setFromObject( firstObject);
                object.position.set(object.position.x, 
                    firstObjectBB.max.y + (object.position.y - boundingBox.min.y) + 0.01,
                    object.position.z);
            }
        }

    }


    #getObjectLabel(object) {
        for (let child of object.children) {
            if (child.name == "label") {
                return child;
            }
        }
    }
    /**
     * Initializes the gumball on a specific object.
     * @param {THREE.Object3D} object 
     * @private
     */
    #createGumball (object, camera) {
        this.#gumball = new TransformControls(camera, this.#canvas);
        this.#gumball.mode = this.#gumballState.mode;
        if (this.#gumball.getMode() == 'rotate') {
            this.#gumball.showX = false;
            this.#gumball.showZ = false;
        } else {
            this.#gumball.showY = false;
        }
        // Add mousedown/up event handling  
        this.#gumball.addEventListener("mouseDown", (event) => {
            if (this.#orbit != null) {
                this.#orbit.enabled = false;
            }
        });

        this.#gumball.addEventListener("mouseUp", (event) => {
            if(this.#orbit != null)
                this.#orbit.enabled = true;
        });

        this.#gumball.attach(object);
        this.#getObjectLabel(object).visible = false;
        this.#scene.add(this.#gumball);
        
        // this.#updateGumballRotation(object);
    }

    /**
     * Resets the gumball.
     * @private
     */
    #clearGumball() {
        if (this.#gumball == null) {
            return;
        }

        this.#getObjectLabel(this.#gumball.object).visible = true;
        this.#gumballState.mode = this.#gumball.getMode();
        this.#scene.remove(this.#gumball);
        this.#gumball.dispose();
        this.#gumball = null;
    }

    /**
     * Handles the click event on an object.
     * 
     * If a gumball control is currently active and the clicked object matches the gumball's object,
     * returns the current gumball control.
     * 
     * If a gumball control is active but the clicked object is different from the gumball's object,
     * clears the current gumball control.
     * 
     * If no gumball control is active, creates a new gumball control for the clicked object.
     * 
     * @param {THREE.Object3D} object - The object that was clicked.
     * @returns {TransformControls | null} Returns the gumball control associated with the clicked object,
     * or null if no gumball control is active.
     */
    #clickObject(object, camera) {
        if (this.#gumball != null) {
            if (object == this.#gumball.object) {
                return this.#gumball;
            } else {
                this.#clearGumball();
            }
        }

        this.#createGumball(object, camera);
        return this.#gumball;
    }

    /**
     * Event handler for mouse click events in the outside view mode.
     * 
     * Computes the mouse position relative to the canvas, sets up a raycaster
     * to detect intersections with draggable objects, and performs actions based
     * on the intersections:
     * - If an object is clicked, invokes the click handling method (#clickObject).
     * - If no object is clicked, clears any active gumball control and enables orbit controls.
     * 
     * @private
     * @param {MouseEvent} event - The mouse click event object.
     */
    #outsideOnClick = (event) => {
        const rect = this.#canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
        mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;  
        this.#raycaster.setFromCamera( mouse, this.#camera.outside );
        const intersections = this.#raycaster.intersectObjects( this.getDraggableObjects(), true );
        if (intersections.length > 0) {
            if (intersections[0].object.parent != null) {
                this.#clickObject(intersections[0].object.parent, this.#camera.outside);
            } else {
                this.#clickObject(intersections[0].object, this.#camera.outside);
            }
        } else {
            this.#clearGumball();
            this.#orbit.enabled = true;
        }  
    }

    #insideOnClick = (event) => {
        if (this.insideMode == "teleport") {
            if (this.#pointerLock.isLocked) {
                const newRaycaster = new THREE.Raycaster();
                newRaycaster.setFromCamera(new THREE.Vector2(), this.#camera.inside);
                const intersects = newRaycaster.intersectObjects(this.getAllObjects(), true);
                if (intersects.length > 0) {
                    const firstObject = intersects[0].object;
                    if (firstObject.name.includes("floor")) {
                        this.#moving = true;
                        const totalDistance = intersects[0].distance;
                        const heightDiff = intersects[0].point.y - this.#camera.inside.position.y;
                        const forwardDist = Math.sqrt(totalDistance * totalDistance - heightDiff * heightDiff);
                        this.#moveToPoint = {distance: forwardDist, velocity: 0};
                        this.#colorObject(firstObject, 0x000000);
                    }
                }
            }
        }
    }

    #insideOnDblClick = (event) => {
        console.log("double click")
        const newRaycaster = new THREE.Raycaster();
        newRaycaster.setFromCamera(new THREE.Vector2(), this.#camera.inside);
        const intersects = newRaycaster.intersectObjects(this.getAllObjects(), true);
        if (intersects.length > 0) {
            const firstObject = intersects[0].object;
            if (firstObject.name.includes("floor")) {
                this.#moving = true;
                const totalDistance = intersects[0].distance;
                const heightDiff = intersects[0].point.y - this.#camera.inside.position.y;
                const forwardDist = Math.sqrt(totalDistance * totalDistance - heightDiff * heightDiff);
                this.#moveToPoint = {distance: forwardDist, velocity: 0};
                this.#colorObject(firstObject, 0x000000);
            }
        }
    }


    hideBlocker = () => {
        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    }
    
    #showBlocker = () => {
        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );
        blocker.style.display = 'block';
        instructions.style.display = '';
    }

    #lock = () => {
        this.#pointerLock.lock();
    }

    #colorObject(object, color) {
        if (object.type == "Mesh" && object.name != "bounding_box") {
            if (object.material.emissive) {
                object.material.emissive.set( color );
            } else {
                object.material.color = new THREE.Color (color);
            }

        } else if (object.children.length > 0){
            object.children.forEach((obj) => {
                this.#colorObject(obj, color);
            });
        }
    }

    #splitWallVertices(object, draw) {
        const geometry = object.geometry;
        const positionAttribute = geometry.attributes.position;
        const leftVertices = [];
        const rightVertices = [];
        const topVertices = [];
        const bottomVertices = [];
  

        // get vertices
        const vertices = [];
        for (let i = 0; i < positionAttribute.count; i++) {
            const localVertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
            const worldVertex = localVertex.applyMatrix4(object.matrixWorld);
            vertices.push(worldVertex);
        }

        // get standard bounding box
        const boundingBox = new THREE.Box3();
        boundingBox.setFromPoints(vertices)
        let isDirX = (boundingBox.max.z - boundingBox.min.z) < (boundingBox.max.x - boundingBox.min.x)
        if (!isDirX) {
            if (Math.abs(boundingBox.max.x - boundingBox.min.x) > 0.1) {
                return {top: topVertices, bottom: bottomVertices, right: rightVertices, left: leftVertices};
            }
            let x = boundingBox.max.x;
            const upperRightVertex = new THREE.Vector3(x, boundingBox.max.y, boundingBox.max.z);
            const upperLeftVertex = new THREE.Vector3(x, boundingBox.max.y, boundingBox.min.z);
            const lowerRightVertex = new THREE.Vector3(x, boundingBox.min.y, boundingBox.max.z);
            const lowerLeftVertex = new THREE.Vector3(x, boundingBox.min.y, boundingBox.min.z);
            
            let topEdge = null;
            let bottomEdge = null;
            let rightEdge = null;
            let leftEdge = null;
            for (let i = 0; i < vertices.length; i ++) {
                if (this.#eqV3(vertices[i], upperLeftVertex, 0.1) || 
                    this.#eqV3(vertices[i], upperRightVertex, 0.1) || 
                    this.#eqV3(vertices[i], lowerRightVertex, 0.1) ||
                    this.#eqV3(vertices[i], lowerLeftVertex, 0.1)  ) {
                        continue;
                }
                if (topEdge == null || vertices[i].y > topEdge) {
                    topEdge = vertices[i].y;
                }
                if (bottomEdge == null || vertices[i].y < bottomEdge) {
                    bottomEdge = vertices[i].y;
                }
                if (rightEdge == null || vertices[i].z > rightEdge) {
                    rightEdge = vertices[i].z;
                }
                if (leftEdge == null || vertices[i].z < leftEdge) {
                    leftEdge = vertices[i].z;
                }
            }
            if ((Math.abs(leftEdge - rightEdge) > 0.02) && (Math.abs(topEdge - bottomEdge) > 0.02)) {
                topVertices.push(upperRightVertex);
                topVertices.push(new THREE.Vector3(x, topEdge, upperRightVertex.z));
                topVertices.push(upperLeftVertex);
                topVertices.push(new THREE.Vector3(x, topEdge, upperLeftVertex.z));

                rightVertices.push(upperRightVertex);
                rightVertices.push(new THREE.Vector3(x, upperRightVertex.y, rightEdge));
                rightVertices.push(lowerRightVertex);
                rightVertices.push(new THREE.Vector3(x, lowerRightVertex.y, rightEdge));

                bottomVertices.push(lowerRightVertex);
                bottomVertices.push(new THREE.Vector3(x, bottomEdge, lowerRightVertex.z));
                bottomVertices.push(lowerLeftVertex);
                bottomVertices.push(new THREE.Vector3(x, bottomEdge, lowerLeftVertex.z));

                leftVertices.push(upperLeftVertex);
                leftVertices.push(new THREE.Vector3(x, upperLeftVertex.y, leftEdge));
                leftVertices.push(lowerLeftVertex);
                leftVertices.push(new THREE.Vector3(x, lowerLeftVertex.y, leftEdge));
            }
        } else {
            if (Math.abs(boundingBox.max.z - boundingBox.min.z) > 0.1) {
                return {top: topVertices, bottom: bottomVertices, right: rightVertices, left: leftVertices};
            }
            let z = boundingBox.max.z;
            const upperRightVertex = new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, z);
            const upperLeftVertex = new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, z);
            const lowerRightVertex = new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, z);
            const lowerLeftVertex = new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, z);
            
            let topEdge = null;
            let bottomEdge = null;
            let rightEdge = null;
            let leftEdge = null;
            for (let i = 0; i < vertices.length; i ++) {
                if (this.#eqV3(vertices[i], upperLeftVertex, 0.1) || 
                    this.#eqV3(vertices[i], upperRightVertex, 0.1) || 
                    this.#eqV3(vertices[i], lowerRightVertex, 0.1) ||
                    this.#eqV3(vertices[i], lowerLeftVertex, 0.1)  ) {
                        continue;
                }
                if (topEdge == null || vertices[i].y > topEdge) {
                    topEdge = vertices[i].y;
                }
                if (bottomEdge == null || vertices[i].y < bottomEdge) {
                    bottomEdge = vertices[i].y;
                }
                if (rightEdge == null || vertices[i].x > rightEdge) {
                    rightEdge = vertices[i].x;
                }
                if (leftEdge == null || vertices[i].x < leftEdge) {
                    leftEdge = vertices[i].x;
                }
            }
            if ((Math.abs(leftEdge - rightEdge)) > 0.02 && (Math.abs(topEdge - bottomEdge) > 0.02)) {
                topVertices.push(upperRightVertex);
                topVertices.push(new THREE.Vector3(upperRightVertex.x, topEdge, z));
                topVertices.push(upperLeftVertex);
                topVertices.push(new THREE.Vector3(upperLeftVertex.x, topEdge, z));

                rightVertices.push(upperRightVertex);
                rightVertices.push(new THREE.Vector3(rightEdge, upperRightVertex.y, z));
                rightVertices.push(lowerRightVertex);
                rightVertices.push(new THREE.Vector3(rightEdge, lowerRightVertex.y, z));

                bottomVertices.push(lowerRightVertex);
                bottomVertices.push(new THREE.Vector3(lowerRightVertex.x, bottomEdge, z));
                bottomVertices.push(lowerLeftVertex);
                bottomVertices.push(new THREE.Vector3(lowerLeftVertex.x, bottomEdge, z));
                
                leftVertices.push(upperLeftVertex);
                leftVertices.push(new THREE.Vector3(leftEdge, upperLeftVertex.y, z));
                leftVertices.push(lowerLeftVertex);
                leftVertices.push(new THREE.Vector3(leftEdge, lowerLeftVertex.y, z));
            }
        }
        if (draw) {
            this.#drawVertices(topVertices, 0x00ff00)
            this.#drawVertices(bottomVertices, 0x0000ff)
            this.#drawVertices(leftVertices, 0xff00ff)
            this.#drawVertices(rightVertices, 0x000000)
        }
        return {top: topVertices, bottom: bottomVertices, right: rightVertices, left: leftVertices};

    }

    #eqV3(v1, v2, epsilon) {
        return ( ( Math.abs( v1.x - v2.x ) < epsilon ) && ( Math.abs( v1.y - v2.y ) < epsilon ) && ( Math.abs( v1.z - v2.z ) < epsilon ) );
    }

    #drawVertices(vertices, color=0xff0000) {
        // Optionally visualize the vertices
        const pointsGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
        const pointsMaterial = new THREE.PointsMaterial({ color: color, size: 0.2 });
        const points = new THREE.Points(pointsGeometry, pointsMaterial);
        this.#scene.add(points);
    }
    
    #splitWall(wall) {
        let topVertices = [];
        let bottomVertices = [];
        let rightVertices = [];
        let leftVertices = [];

        wall.children.forEach((child) => {
            if (child.name.includes("wall")) {
                const split = this.#splitWallVertices(child, false);
                topVertices = topVertices.concat(split.top);
                bottomVertices = bottomVertices.concat(split.bottom);
                rightVertices = rightVertices.concat(split.right);
                leftVertices = leftVertices.concat(split.left);
            }
        })
        const leftGeometry = new THREE.BufferGeometry().setFromPoints(leftVertices);
        leftGeometry.computeBoundingBox();

        const rightGeometry = new THREE.BufferGeometry().setFromPoints(rightVertices);
        rightGeometry.computeBoundingBox();

        const topGeometry = new THREE.BufferGeometry().setFromPoints(topVertices);
        topGeometry.computeBoundingBox();

        const bottomGeometry = new THREE.BufferGeometry().setFromPoints(bottomVertices, 0x0000ff);
        bottomGeometry.computeBoundingBox();

        let displays = [];
        const leftBoxHelper = new THREE.Box3Helper(leftGeometry.boundingBox, 0xff00ff);
        displays.push(leftBoxHelper);
        const rightBoxHelper = new THREE.Box3Helper(rightGeometry.boundingBox, 0x000000);
        displays.push(rightBoxHelper);
        const topBoxHelper = new THREE.Box3Helper(topGeometry.boundingBox, 0x00ff00);
        displays.push(topBoxHelper);
        const bottomBoxHelper = new THREE.Box3Helper(bottomGeometry.boundingBox);
        displays.push(bottomBoxHelper);
        
        // if (topVertices.length != 0) {
        //     this.#scene.add(topBoxHelper);
        // }
        // if (bottomVertices.length != 0) {
        //     this.#scene.add(bottomBoxHelper);
        // }
        // if (leftVertices.length != 0) {
        //     this.#scene.add(leftBoxHelper);
        // }
        // if (rightVertices.length != 0) {
        //     this.#scene.add(rightBoxHelper);
        // }
        this.#scene.add(topBoxHelper);
        this.#scene.add(bottomBoxHelper);
        this.#scene.add(leftBoxHelper);
        this.#scene.add(rightBoxHelper);
        return {top: topGeometry.boundingBox, 
                bottom: bottomGeometry.boundingBox, 
                right: rightGeometry.boundingBox, 
                left: leftGeometry.boundingBox,
                displays: displays
               };
    }

    #normalWall(wall) {
        let count = 0;
        wall.children.forEach( (child) => {
            if (child.name.includes("wall")) {
                if (child.geometry.attributes.position.count != 4) {
                    if (child.geometry.attributes.position.count == 8) {
                        console.log(child.name)
                        console.log(child.geometry.attributes.position.count)
                    } else {
                        return false;
                    }

                }
                count += 1
            }
        });
        return count == 4;
    }
    /**
     * Computes and returns an array of bounding boxes for the given objects.
     * 
     * Creates a bounding box for each object in the provided array `objects`.
     * Each bounding box encapsulates the spatial dimensions of its respective object.
     * The resulting array contains objects with properties `box`, `name`, and `index`,
     * where `box` is the bounding box (`THREE.Box3`), `name` is the object's name,
     * and `index` is the index of the object in the original array.
     * 
     * @private
     * @param {THREE.Object3D[]} objects - The array of objects for which bounding boxes are computed.
     * @returns {Array<{ box: THREE.Box3, name: string, index: number }>} Array of objects containing bounding boxes, object names, and indices.
     */
    #getWallBB () {
        let boxes = [];
        let displays = [];
        for (let i = 0; i < this.#objects.walls.length; i++) {
            if (this.#normalWall(this.#objects.walls[i])) {
                const boundingBox = new THREE.Box3().setFromObject( this.#objects.walls[i] );
                const boundingBoxHelper = new THREE.Box3Helper(boundingBox);
                this.#scene.add(boundingBoxHelper);
                boxes.push(boundingBox)  
                displays.push(boundingBoxHelper)

            } else {
                const split = this.#splitWall(this.#objects.walls[i]);
                boxes.push(split.top);
                boxes.push(split.bottom);
                boxes.push(split.right);
                boxes.push(split.left);
                displays = displays.concat(split.displays);
            }
        }

        return {boxes: boxes, displays: displays};
        // let boxes = [];
        // for (let i = 0; i < objects.length; i++) {
        //     // if (objects.name.includes("wall"))
        //     if (objects[i].name.includes("wall")) {
                
        //         if (objects[i].geometry.attributes.position.count > 4) {

        //             const splitBoundingBoxes = this.#splitWallVertices(objects[i], objects[i].name.includes("11_4"));
        //             for (let i = 0; i < splitBoundingBoxes.length ; i++) {
        //                 if (objects[i].name.includes("11_4")) {
        //                     const boxHelper1 = new THREE.Box3Helper(splitBoundingBoxes[i]);
        //                     this.#scene.add(boxHelper1);
        //                 }

        //                 boxes.push({box: splitBoundingBoxes[i], name: objects[i].name, index: i})
        //             }
        //         }else{
        //             const boundingBox = objects[i].geometry.boundingBox.clone();
        //             boundingBox.min.y += (this.#modelSize.y / 2);
        //             boundingBox.max.y += (this.#modelSize.y / 2);
        //             if (objects[i].name.includes("11_4")) {
        //                 const boxHelper1 = new THREE.Box3Helper(boundingBox);
        //                 this.#scene.add(boxHelper1);
        //             }
        //             boxes.push({box: boundingBox, name: objects[i].name, index: i});
        //         }

                
        //     } else {
        //         const boundingBox = new THREE.Box3().setFromObject( objects[i] );
        //         boxes.push({box: boundingBox, name: objects[i].name, index: i})
        //     }
    
        // }
        // return boxes;
    }

    toggleWallBB(){
        this.#wallBBDisplays.forEach( (wallBB) => {
            wallBB.visible = !wallBB.visible
        });
    }
    /**
     * Checks for collisions between a given bounding box and an array of bounding boxes.
     * 
     * Iterates through the array of `boundingBoxes` and checks if `box` intersects with any of them.
     * If a collision is detected, returns an object indicating collision status and the collided bounding box.
     * If no collisions are detected, returns an object indicating no collision.
     * 
     * @private
     * @param {THREE.Box3} box - The bounding box to check for collisions.
     * @param {Array<{ box: THREE.Box3, name: string, index: number }>} boundingBoxes - Array of bounding boxes to check against.
     * @returns {{ hasCollision: boolean, collidedBox: { box: THREE.Box3, name: string, index: number } }} 
     * Object indicating collision status and details of the collided bounding box.
     */
    #checkWallCollisions(box, boundingBoxes){
        for (let i = 0; i < boundingBoxes.length; i++) {
            if (box.intersectsBox(boundingBoxes[i])) {
                return true;
            }
        }
        return false;
    }

    createBoundingBoxHelper(object, color = 0x0000ff) {
        const box = new THREE.Box3().setFromObject(object);
        const helper = new THREE.Box3Helper(box, color);
        return helper;
    }
    
    #checkObjectCollisions(object, objects){
        object.updateMatrixWorld(true);
        
        const obb = new OBB();
        // Update the OBBs to match the meshes
        obb.fromBox3(new THREE.Box3().setFromObject(object, true));
        for (let i = 0; i < objects.length; i++) {
            if (object == objects[i]) {
                continue;
            } 
            objects[i].updateMatrixWorld(true)
            const obb2 = new OBB();
            obb2.fromBox3(new THREE.Box3().setFromObject(objects[i], true));
            if (obb.intersectsOBB(obb2)) {
                console.log(object.position)
                console.log('Object OBB:', obb);
                console.log('Comparing with:', obb2);
                return true;
            }
        }
        return false;
    }

    #toggleGumball = (event) => {
        if (this.#gumball != null) {
            switch(event.code){
                case 'KeyT':
                    this.#gumball.mode = 'translate';
                    this.#gumball.showX = true;
                    this.#gumball.showZ = true;
                    this.#gumball.showY = false;
                    break;
                case 'KeyR':
                    this.#gumball.mode = 'rotate';
                    this.#gumball.showX = false;
                    this.#gumball.showZ = false;
                    this.#gumball.showY = true;
                    break;
                case 'Backspace':
                    const object = this.#gumball.object
                    this.#clearGumball();
                    object.clear();
                    this.#scene.remove(object)
            }
        }
     };
    
    #insideOnKeyDown = ( event ) => {

        switch ( event.code ) {
    
            case 'ArrowUp':
            case 'KeyW':
                this.#moveForward = true;
                break;
    
            case 'ArrowLeft':
            case 'KeyA':
                this.#moveLeft = true;
                break;
    
            case 'ArrowDown':
            case 'KeyS':
                this.#moveBackward = true;
                break;
    
            case 'ArrowRight':
            case 'KeyD':
                this.#moveRight = true;
                break;
        }
    
    };
    
    #insideOnKeyUp = ( event ) => {
    
        switch ( event.code ) {
    
            case 'ArrowUp':
            case 'KeyW':
                this.#moveForward = false;
                break;
    
            case 'ArrowLeft':
            case 'KeyA':
                this.#moveLeft = false;
                break;
    
            case 'ArrowDown':
            case 'KeyS':
                this.#moveBackward = false;
                break;
    
            case 'ArrowRight':
            case 'KeyD':
                this.#moveRight = false;
                break;
    
        }
    };

    /**
     * Event handler for mouse click events in the orthographic view mode.
     * 
     * Computes the mouse position relative to the canvas, sets up a raycaster
     * to detect intersections with draggable objects or measure points, and performs
     * actions based on the current mode ("regular" or "measure"):
     * - In "regular" mode:
     *   - Enables object selection/deselection if selection mode is enabled.
     *   - Adds or removes objects from the selected group based on click actions.
     * - In "measure" mode:
     *   - Adds measure points when clicking on objects or the ground plane.
     *   - Adjusts measure points based on proximity when clicking near existing points.
     * 
     * @private
     * @param {MouseEvent} event - The mouse click event object.
     */
    #orthoOnClick = (event) => {
        // event.preventDefault();
        console.log("ortho click")
        const rect = this.#canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
        mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;
        
        this.#raycaster.setFromCamera( mouse, this.#camera.ortho );

        if (this.orthoMode == "drag") {
            const rect = this.#canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
            mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;  
            this.#raycaster.setFromCamera( mouse, this.#camera.ortho );
            const intersections = this.#raycaster.intersectObjects( this.getDraggableObjects(), true );
            if (intersections.length > 0) {
                if (intersections[0].object.parent != null) {
                    this.#clickObject(intersections[0].object.parent, this.#camera.ortho);
                } else {
                    this.#clickObject(intersections[0].object, this.#camera.ortho);
                }
            } else {
                this.#clearGumball();
            } 
        } else if (this.orthoMode == "measure") {
            if (this.#measure_points.length > 0) {
                for (let i = 0 ; i < this.#measure_points.length; i++) {
                    let closestPoint = new THREE.Vector3();
                    this.#raycaster.ray.closestPointToPoint(this.#measure_points[i], closestPoint);
                    if (closestPoint.distanceTo(this.#measure_points[i]) < 0.1) {
                        if (i == 0) {
                            this.#measure_points.shift();
                            return;
                        } else {
                            this.#measure_points.pop();
                            return;
                        }
                    }
                }
            } 
            if (this.#measure_points.length < 2) {
                let intersections = this.#raycaster.intersectObjects( this.getAllObjects(), true );
                const planeIntersection = new THREE.Vector3();
                const originPlane = new THREE.Plane (new THREE.Vector3(0,1,0));
                this.#raycaster.ray.intersectPlane(originPlane, planeIntersection);
                if (intersections.length > 0) {
                    intersections[0].point.add(this.#raycaster.ray.direction.multiplyScalar(-0.05));
                    this.#measure_points.push(intersections[0].point);
                } else {
                    if (planeIntersection.length() < this.#modelSize.x / 2) {
                        planeIntersection.add(this.#raycaster.ray.direction.multiplyScalar(-0.05));
                        this.#measure_points.push(planeIntersection);
                    }

                }
            }
        }
    }

    #orthoOnMove = (event) => {
        if (this.orthoMode == "measure") {
            this.#measureGroup.clear();
            if (this.#measure_points.length == 1) {
                const displayDistanceElement = document.getElementById("measure-distance");
                // get raycaster
                const rect = this.#canvas.getBoundingClientRect();
                const mouse = new THREE.Vector2();
                mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
                mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;
                this.#raycaster.setFromCamera( mouse, this.#camera.ortho );

                let intersections = this.#raycaster.intersectObjects( this.#objects, true );
                const planeIntersection = new THREE.Vector3();
                const originPlane = new THREE.Plane (new THREE.Vector3(0,1,0));
                this.#raycaster.ray.intersectPlane(originPlane, planeIntersection);
                let point;
                if (intersections.length > 0) {
                    intersections[0].point.add(this.#raycaster.ray.direction.multiplyScalar(-0.05));
                    point = intersections[0].point; 
                } else {
                    if (planeIntersection.length() < this.#modelSize.x / 2) {
                        planeIntersection.add(this.#raycaster.ray.direction.multiplyScalar(-0.05));
                    }
                    point = planeIntersection;
                }

                const lineGeometry = new THREE.BufferGeometry().setFromPoints( [this.#measure_points[0], point] );

                const line = new THREE.Line( lineGeometry, lineMaterial );
                const sphereGeometry = new THREE.SphereGeometry( 0.1, 32, 16 ); 
                const sphere = new THREE.Mesh( sphereGeometry, redMaterial ); 
                sphere.position.set(point.x, point.y, point.z);
                this.#measureGroup.add(sphere);
                this.#measureGroup.add(line);
                const dist = this.#measure_points[0].distanceTo(point);
                if (this.units == "meters") {
                    const roundDist = Math.round(dist * 100) / 100;
                    displayDistanceElement.textContent = roundDist + " " + this.units;
                } else if (this.units == "feet") {
                    const feet = dist * 3.281;
                    const flooredFeet = Math.floor(feet);
                    const inches = Math.round((feet - flooredFeet) * 12);  
                    displayDistanceElement.textContent = flooredFeet + " ft. " + inches + " in.";
                }
            }
        }
    }

    getPointerLock() {
        return this.#pointerLock;
    }

    getLock() {
        return this.#lock;
    }

    getMeasurePoints() {
        return this.#measure_points;
    }

    setGumballMode(mode){
        this.#gumballState.mode = mode;
        if (this.#gumball != null) {
            this.#gumball.mode = mode;
            if (mode == "rotate") {
                this.#gumball.showX = false;
                this.#gumball.showZ = false;
                this.#gumball.showY = true;
            } else {
                this.#gumball.showX = true;
                this.#gumball.showZ = true;
                this.#gumball.showY = false;
            }
        }
    }

    dispose() {
        this.#reset();
    }
 }

export {DemoControls};