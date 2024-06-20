import { DragControls} from "./DragControls.js";

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
     * @type {THREE.OrbitControls}
     * @private
     */
    #orbit;

    /**
     * The transform controls object.
     * @type {THREE.TransformControls}
     * @private
     */
    #gumball;

    /**
     * The pointer lock controls object.
     * @type {THREE.PointerLockControls}
     * @private
     */
    #pointerLock;

    /**
     * The drag controls object.
     * @type {THREE.DragControls}
     * @private
     */
    #drag;

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
     * Control variable for multi-select functionality.
     * @type {boolean}
     * @private
     */
    #enableSelection;

    /**
     * The multi-selected group.
     * @type {THREE.Group}
     * @private
     */
    #selectedGroup;

    /**
     * The dragged object's position at the start of a drag.
     * Necessary to revert the object's position if the drag 
     * is unsuccessful.
     * @type {THREE.Vector3}
     * @private
     */
    #dragOrigin;
    
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
        this.#mode = "regular";
        this.#measure_points = [];

    
        this.#orbit = null;
        this.#orbit.update();

        this.#gumball = null;


        this.#pointerLock = null;
        this.#prev_time = performance.now();
        this.#velocity = new THREE.Vector3();
        this.#direction = new THREE.Vector3();
        this.#moveForward = false;
        this.#moveBackward = false;
        this.#moveLeft = false;
        this.#moveRight = false;
        this.#insideCameraBB = new THREE.Box3();
        this.#boundingBoxes = this.#getBoundingBoxes(this.objects);

        this.#drag = null;
        this.#raycaster = new THREE.Raycaster();
        this.#selectedGroup = new THREE.Group();
        this.#scene.add(this.#selectedGroup);
        this.#dragOrigin = new THREE.Vector3();
        this.#switchControls("ortho", camera.ortho, canvas);
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
        this.#drag.dispose();
        this.#pointerLock.dispose();
        this.#orbit.dispose();
        this.#clearGumball();
        const instructions = document.getElementById( 'instructions' );
        instructions.removeEventListener( 'click', this.#lock);
        this.#pointerLock.removeEventListener('lock', this.#hideBlocker);
        this.#pointerLock.removeEventListener('unlock', this.#showBlocker);
        document.removeEventListener('keydown', this.#insideOnKeyDown);
        document.removeEventListener('keyup',this.#insideOnKeyUp);
        document.removeEventListener('keyup', this.#orthoOnKeyUp);
        document.removeEventListener('keydown', this.#orthoOnKeyDown);
        document.removeEventListener('click', this.#orthoOnClick);
        document.removeEventListener('click', this.#outsideOnClick);
        this.#drag.removeEventListener('dragstart', this.#dragStartCallback);
        this.#drag.removeEventListener('dragend', this.#dragEndCallback);
        this.#drag.removeEventListener('drag', this.#dragCallback);
        this.#drag = null;
        this.#orbit = null;
        this.#pointerLock = null;
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
            this.#drag = new DragControls([...this.#draggableObjects], camera, canvas);
            this.#drag.addEventListener('dragstart', this.#dragStartCallback);
            this.#drag.addEventListener('dragend', this.#dragEndCallback);
            this.#drag.addEventListener('drag', this.#dragCallback);
            document.addEventListener('keyup', this.#orthoOnKeyUp);
            document.addEventListener('keydown', this.#orthoOnKeyDown);
            document.addEventListener('click', this.#orthoOnClick);
            this.#drag.enabled = true;
            this.#pointerLock.enabled = false;
            this.#orbit.enabled = false;
            this.#hideBlocker();
        } else if (newControl == "outside") {
            this.#reset();
            document.addEventListener('click', this.#outsideOnClick);
            this.#orbit = new THREE.OrbitControls(camera, canvas);
            this.#orbit.enabled = true;
            this.#drag.enabled = false;
            this.#pointerLock.enabled = false;
            this.#hideBlocker();
        } else {
            this.#reset();
            this.#boundingBoxes = this.#getBoundingBoxes(this.#objects);
            this.#pointerLock = new THREE.PointerLockControls(camera, canvas);
            this.#pointerLock.enabled = true;
            this.#orbit.enabled = false;
            this.#drag.enabled = false;
            const instructions = document.getElementById( 'instructions' );
            instructions.addEventListener( 'click', this.#lock);
            this.#showBlocker();
            this.#pointerLock.addEventListener( 'lock', this.#hideBlocker);
            this.#pointerLock.addEventListener( 'unlock', this.#showBlocker);
            document.addEventListener('keydown', this.#insideOnKeyDown);
            document.addEventListener('keyup',this.#insideOnKeyUp);
        }
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
            if ( this.#pointerLock.isLocked === true ) {
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
            this.#prev_time = time;
        } else if(this.#view == "outside") {
            this.#orbit.update();
        }
    }

    /**
     * Initializes the gumball on a specific object.
     * @param {THREE.Object3D} object 
     * @private
     */
    #createGumball (object) {
        this.#gumball = new THREE.TransformControls(this.#camera.outside, this.#canvas);
        
        // Add mousedown/up event handling  
        this.#gumball.addEventListener("mouseDown", (event) => {
            if(this.#orbit != null)
                this.#orbit.enabled = false;
        });

        this.#gumball.addEventListener("mouseUp", (event) => {
            if(this.#orbit != null)
                this.#orbit.enabled = true;
        });

        this.#gumball.attach(object);
        this.#scene.add(this.#gumball);
    }

    /**
     * Resets the gumball.
     * @private
     */
    #clearGumball() {
        if (this.#gumball == null) {
            return;
        }
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
     * @returns {THREE.TransformControls | null} Returns the gumball control associated with the clicked object,
     * or null if no gumball control is active.
     */
    #clickObject(object) {
        if (this.#gumball != null) {
            if (object == this.#gumball.object) {
                return this.#gumball;
            } else {
                this.#clearGumball();
            }
        }
        
        this.#createGumball(object);
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
                this.#clickObject(intersections[0].object.parent);
            } else {
                this.#clickObject(intersections[0].object);
            }
        } else {
            this.#clearGumball();
            this.#orbit.enabled = true;
        }  
    }

    /**
     * Event handler for the 'dragstart' event.
     * 
     * Sets the this.#dragOrigin based on the 
     * clicked objects position.
     * @param {Event} event 
     */
    #dragStartCallback = (event) => {
        console.log("drag start");
        const object = event.object;
        this.#dragOrigin = object.position.clone();
        console.log(this.#dragOrigin);
    }

    /**
     * Event handler for the 'drag' event.
     * 
     * First ensures there is no bottom collision by raising
     * the object above the one below it.
     * 
     * Then if there is still a collision, it turns the 
     * dragged object red.
     * @param {Event} event 
     */
    dragCallback = (event) => {
        const object = event.object;
        let boundingBox = new THREE.Box3().setFromObject( object);
        
        const newRaycaster = new THREE.Raycaster(object.position, new THREE.Vector3(0,-1,0), object.position.y - boundingBox.min.y);
        // console.log(newRaycaster);
        const intersects = newRaycaster.intersectObjects(this.#objects,true);
        if (intersects.length > 0) {
            const firstObject = intersects[0].object;
            const firstObjectBB = new THREE.Box3().setFromObject( firstObject);
            object.position.set(object.position.x, 
                firstObjectBB.max.y + (object.position.y - boundingBox.min.y) + 0.01,
                object.position.z);
            this.#colorObject(object, 0x000000);
        }

        boundingBox = new THREE.Box3().setFromObject( object);
        const isCollided = this.#checkCollisions(boundingBox, this.boundingBoxes);
        if (isCollided.hasCollision && isCollided.collidedBox.name != object.name) {
            if (!isCollided.collidedBox.name.includes("wall")) {
                console.log("raise")
                // raise object above collidedBox
                object.position.set(object.position.x, 
                                    isCollided.collidedBox.box.max.y + (object.position.y - boundingBox.min.y) + 0.01,
                                    object.position.z);
            } else {
                console.log("Collision!");
                this.#colorObject(object, 0xff0000);
            }
        } else {
            this.#colorObject(object, 0x000000);
        }
    }

    /**
     * Event handler for 'dragend' event.
     * 
     * If there is a collision, resets the dragged object 
     * back to its origin, otherwise does nothing.
     * Also updates the boundingBoxes.
     * @param {*} event 
     */
    dragEndCallback = (event) => {
        console.log("drag end");
        console.log(this.#dragOrigin);
        const object = event.object;
        const boundingBox = new THREE.Box3().setFromObject( object);
        const isCollided = this.#checkCollisions(boundingBox, this.#boundingBoxes);
        console.log(isCollided);
        
        if (isCollided.hasCollision && isCollided.collidedBox.name != object.name) {
            console.log("Collision!");
            object.position.set(this.#dragOrigin.x, this.#dragOrigin.y, this.#dragOrigin.z);
            this.#colorObject(object, 0x000000);
        } else {
            console.log("Successful drag")
        }
        this.boundingBoxes = this.#getBoundingBoxes(this.#objects); // update boundingBoxes
        
    }


    #hideBlocker = () => {
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
        if (object.type == "Mesh") {
            object.material.emissive.set( color );
        } else if (object.type == "Group"){
            object.children.forEach((obj) => {
                if (obj.name != "bounding_box" || obj.type != "Mesh"){
                    obj.material.emissive.set(color);
                }
            });
        }
    }
    // hasDoor (object) {
    //     if (object.name.includes("door")){
    //         return true;
    //     }
    //     if (object.children.length == 0) {
    //         return false;
    //     }
    //     let bool = false;
    //     for (let i = 0; i < object.children.length; i++) {
    //         bool = bool || this.hasDoor(object.children[i]);
    //     }
    //     return bool;
    // } 

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

    #orthoOnKeyDown = ( event ) => {

        this.#enableSelection = ( event.keyCode === 16 ) ? true : false;
        
        if ( event.keyCode === 77 ) {

            this.#drag.mode = ( this.#drag.mode === 'translate' ) ? 'rotate' : 'translate';
    
        }

    }

    #orthoOnKeyUp = () => {

        this.#enableSelection = false;

    }

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

        if (this.#mode == "regular") {
            if ( this.#enableSelection === true ) {
                const draggableObjects = this.#drag.getObjects();
                draggableObjects.length = 0;
                const intersections = this.#raycaster.intersectObjects( this.draggableObjects, true );
                if ( intersections.length > 0 ) {
                    const bounding_box = intersections[ 0 ].object; // should be the bounding box
                    const object = bounding_box.parent;
                    if ( this.#selectedGroup.children.includes( object ) === true ) {
                        this.#colorObject(object, 0x000000);
                        this.#scene.attach( object );
                        this.#selectedGroup.remove(object);
                    } else {
                        this.#colorObject(object, 0x0000ff);                       
                        this.#selectedGroup.attach( object );
                        this.scene.remove(object);
                    }
                    this.#drag.transformGroup = true;
                    draggableObjects.push( this.#selectedGroup );
                }
                if ( this.#selectedGroup.children.length === 0 ) {
                    this.#drag.transformGroup = false;
                    draggableObjects.push( ...this.#draggableObjects );
                }
            }
        } else if (this.#mode == "measure") {
            if (this.#measure_points.length > 0) {
                for (let i = 0 ; i < this.#measure_points.length; i++) {
                    let closestPoint = new THREE.Vector3();
                    this.#raycaster.ray.closestPointToPoint(this.#measure_points[i], closestPoint);
                    console.log(closestPoint)
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
                let intersections = this.#raycaster.intersectObjects( this.objects, true );
                const planeIntersection = new THREE.Vector3();
                const originPlane = new THREE.Plane (new THREE.Vector3(0,1,0));
                this.#raycaster.ray.intersectPlane(originPlane, planeIntersection);
                console.log(this.#raycaster);
                if (intersections.length > 0) {
                    console.log(intersections);
                    intersections[0].point.add(this.#raycaster.ray.direction.multiplyScalar(-0.05));
                    this.#measure_points.push(intersections[0].point);
                } else {
                    console.log(planeIntersection);
                    if (planeIntersection.length() < this.#modelSize.x / 2) {
                        planeIntersection.add(this.#raycaster.ray.direction.multiplyScalar(-0.05));
                        this.#measure_points.push(planeIntersection);
                    }

                }
            }
        }
    }
}

export {DemoControls};
