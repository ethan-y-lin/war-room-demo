import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
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
    #boundingBoxes;

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
    #initialize(camera, canvas, scene, objects, modelSize){
        this.#canvas = canvas;
        this.#camera = camera;
        this.#scene = scene;
        this.#objects = objects.furniture.concat(objects.walls).concat(objects.uploaded);
        this.#pass_through_objects = objects.doors.concat(objects.windows);
        this.#draggableObjects = objects.furniture.concat(objects.uploaded);
        this.#modelSize = modelSize;
        this.orthoMode = "drag";
        this.insideMode = "keyboard";
        this.#measure_points = [];

    
        this.#orbit = new OrbitControls(camera.outside, canvas);

        this.#gumball = null;
        this.#gumballState = {mode: 'translate'}

        this.#pointerLock = new PointerLockControls(camera.inside, canvas);
        this.#prev_time = performance.now();
        this.#velocity = new THREE.Vector3();
        this.#direction = new THREE.Vector3();
        this.#moveForward = false;
        this.#moveBackward = false;
        this.#moveLeft = false;
        this.#moveRight = false;
        this.#insideCameraBB = new THREE.Box3();
        this.#boundingBoxes = this.#getBoundingBoxes(this.#objects);
        this.#raycaster = new THREE.Raycaster();
        this.#dragOrigin = new THREE.Vector3();
        this.#measureGroup = new THREE.Group();
        this.#scene.add(this.#measureGroup);
        this.switchControls("ortho", camera.ortho, canvas);
        this.units;
        this.#floorObject = null;
        const sphereGeometry = new THREE.SphereGeometry( 0.1, 32, 16 ); 
        const sphereMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff} ); 
        const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial ); 
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
        this.setToWASD();
        this.#pointerLock.dispose();
        this.#orbit.dispose();
        this.#clearGumball();
        const instructions = document.getElementById( 'instructions' );
        instructions.removeEventListener( 'click', this.#lock);
        this.#pointerLock.removeEventListener('lock', this.hideBlocker);
        this.#pointerLock.removeEventListener('unlock', this.#showBlocker);
        
        document.removeEventListener('keydown', this.#insideOnKeyDown);
        document.removeEventListener('keyup',this.#insideOnKeyUp);
        document.removeEventListener('click', this.#orthoOnClick);
        document.removeEventListener('click', this.#outsideOnClick);
        document.removeEventListener('click', this.#insideOnClick);
        this.#canvas.removeEventListener('mousemove', this.#orthoOnMove);
        this.#pointerLock.enabled = false;
        this.#orbit.enabled = false;

    }

    setToWASD() {
        if (this.#floorObject != null) {
            this.#colorObject(this.#floorObject, 0x000000);
            this.#scene.remove(this.#insidePointer);
        }
    }
    
    setToTeleport() {
        if (this.#view == "inside") {
            this.#scene.add(this.#insidePointer);       
        }
    }
    /**
     * Assumes that this.objects and this.draggableObjects are up to date.
     * @param {*} newControl The control type to switch to. Requires either: "ortho", "inside", or "outside"
     * @param {*} camera The camera that the new view uses. Type should be THREE.Camera
     * @param {*} canvas The canvas for the view. Type: DOM element.
     */
    switchControls(newControl, camera, canvas) {
        this.#view = newControl;
        if (newControl == "ortho") {
            this.#reset();
            this.#boundingBoxes = this.#getBoundingBoxes(this.#objects);
            document.addEventListener('keydown', this.#toggleGumball);
            document.addEventListener('click', this.#orthoOnClick);
            this.#canvas.addEventListener('mousemove', this.#orthoOnMove);
            this.hideBlocker();
        } else if (newControl == "outside") {
            this.#reset();
            this.#boundingBoxes = this.#getBoundingBoxes(this.#objects);
            document.addEventListener('click', this.#outsideOnClick);
            document.addEventListener('keydown', this.#toggleGumball);
            this.#orbit = new OrbitControls(camera, canvas);
            this.#orbit.enabled = true;
            this.hideBlocker();
        } else if (newControl == "inside"){
            this.#reset();
            if (this.insideMode == "teleport") {
                this.setToTeleport();
            }
            this.#boundingBoxes = this.#getBoundingBoxes(this.#objects);
            this.#pointerLock = new PointerLockControls(camera, canvas);
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
    }

    updateObjects(objects) {
        this.#objects = objects.furniture.concat(objects.walls).concat(objects.uploaded);
        this.#pass_through_objects = objects.doors.concat(objects.windows);
        this.#draggableObjects = objects.furniture.concat(objects.uploaded);
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
            if (this.insideMode == "keyboard") {

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
                    let collision = this.#checkCollisions(this.#insideCameraBB, this.#boundingBoxes)
                    if (collision.hasCollision && collision.collidedBox.name != "wall_11_3" && collision.collidedBox.name != "wall_11_4" ) {
                        console.log(collision.collidedBox)
                        this.#pointerLock.moveRight(this.#velocity.x * delta );
                        this.#pointerLock.moveForward(this.#velocity.z * delta );
                        console.log("collision")
                        this.#setCameraBB(this.#insideCameraBB, camera.inside);
                        this.#velocity.x = 0;
                        this.#velocity.z = 0;
                    }
                }
            } else if (this.insideMode == "teleport"){
                if (this.#pointerLock.isLocked) {
                    if (this.#moving) {
                        console.log("moving")
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
                        const intersects = newRaycaster.intersectObjects(this.#objects, true);
                        if (intersects.length > 0) {
                            const firstObject = intersects[0].object;
                            this.#insidePointer.position.x = intersects[0].point.x;
                            this.#insidePointer.position.y = intersects[0].point.y;
                            this.#insidePointer.position.z = intersects[0].point.z;

                            if (firstObject.name.includes("floor")) {
                                this.#colorObject(firstObject, 0xFF0000);
                                this.#floorObject = firstObject;
                            } else {
                                if (this.#floorObject != null) {
                                    this.#colorObject(this.#floorObject, 0x000000);
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
                const isCollided = this.#checkCollisions(boundingBox, this.#boundingBoxes);
                if (isCollided.hasCollision && isCollided.collidedBox.name != object.name) {
                    console.log("Collision!");
                    this.#colorObject(object, 0xFF0000);
                } else {
                    this.#colorObject(object, 0x000000);
                    this.#dragOrigin = object.position.clone();
                }
                this.#boundingBoxes = this.#getBoundingBoxes(this.#objects); // update boundingBoxes
            }
        }
    }


    #setToGroundHeight (object) {
        let boundingBox = new THREE.Box3().setFromObject( object);
        const newRaycaster = new THREE.Raycaster(new THREE.Vector3(0, boundingBox.max.y, 0 ), new THREE.Vector3(0,-1,0));
        const intersects = newRaycaster.intersectObjects(this.#objects,true);
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
            const intersects2 = newRaycaster.intersectObjects(this.#objects,true);
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

    #shiftCollidedObject (object, boundingBox) {

        const collidedBoxCenter = collidedBox.max.add(collidedBox.min).divideScalar(2);
        const difference = object.position.sub(collidedBoxCenter);
        // object.position.set(this.#dragOrigin.x, this.#dragOrigin.y, this.#dragOrigin.z)
    }

    /**
     * Initializes the gumball on a specific object.
     * @param {THREE.Object3D} object 
     * @private
     */
    #createGumball (object, camera) {
        this.#gumball = new TransformControls(camera, this.#canvas);
        this.#gumball.setMode(this.#gumballState.mode)
        if (this.#gumball.getMode() == 'rotate') {
            this.#gumball.showX = false;
            this.#gumball.showZ = false;
        } else {
            this.#gumball.showY = false;
        }
        // Add mousedown/up event handling  
        this.#gumball.addEventListener("mouseDown", (event) => {
            if(this.#orbit != null) {
                this.#orbit.enabled = false;
            }
        });

        this.#gumball.addEventListener("mouseUp", (event) => {
            if(this.#orbit != null)
                this.#orbit.enabled = true;
        });

        this.#gumball.attach(object);

        this.#scene.add(this.#gumball);
        
        // this.#updateGumballRotation(object);
    }

    #updateGumballRotation(object) {
        // Update gumball rotation based on the object's current rotation
        object.updateMatrixWorld();
        const localQuaternionRotation = object.quaternion.clone();
        this.#gumball.setSpace("local");
        this.#gumball.setRotationFromQuaternion(localQuaternionRotation.invert());
        this.#gumball.setSpace("global");
    }
    /**
     * Resets the gumball.
     * @private
     */
    #clearGumball() {
        if (this.#gumball == null) {
            return;
        }
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
        console.log(object)
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
        const intersections = this.#raycaster.intersectObjects( this.#draggableObjects, true );
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
                const intersects = newRaycaster.intersectObjects(this.#objects, true);
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
            object.material.emissive.set( color );
        } else if (object.children.length > 0){
            object.children.forEach((obj) => {
                this.#colorObject(obj, color);
            });
        }
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
    #getBoundingBoxes(objects) {
        let boxes = [];
        for (let i = 0; i < objects.length; i++) {
                const boundingBox = new THREE.Box3().setFromObject( objects[i] );
                boxes.push({box: boundingBox, name: objects[i].name, index: i});
    
        }
        return boxes;
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
    #checkCollisions(box, boundingBoxes){
        for (let i = 0; i < boundingBoxes.length; i++) {
            if (box.intersectsBox(boundingBoxes[i].box)) {
                return {hasCollision: true, collidedBox: boundingBoxes[i]};
            }
        }
        return {hasCollision: false, collidedObject: null} ;
    }

    #toggleGumball = (event) =>{
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
                if (this.#gumball != null) {
                    const object = this.#gumball.object
                    object.clear();
                    this.#clearGumball();
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
            const intersections = this.#raycaster.intersectObjects( this.#draggableObjects, true );
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
                    if (closestPoint.distanceTo(this.#measure_points[i]) < 1) {
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
                let intersections = this.#raycaster.intersectObjects( this.#objects, true );
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
            console.log("drag measure");
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
                const lineMaterial = new THREE.LineBasicMaterial({
                                        color: 0x0000ff
                                    });
                const line = new THREE.Line( lineGeometry, lineMaterial );
                const cubeGeometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 ); 
                const cubeMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff} ); 
                const cube = new THREE.Mesh( cubeGeometry, cubeMaterial ); 
                cube.position.set(point.x, point.y, point.z);
                this.#measureGroup.add(cube);
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
        this.#gumball.mode = mode;
    }

}

export {DemoControls};