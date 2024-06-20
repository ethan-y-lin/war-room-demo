import { DragControls} from "./DragControls.js";

class DemoControls {
    constructor (camera, canvas, scene, objects, gridSize, gridScale, modelSize) {
        this.initialize(camera, canvas, scene, objects, gridSize, gridScale, modelSize);
    }

    initialize(camera, canvas, scene, objects, gridSize, gridScale, modelSize){
        this.canvas = canvas;
        this.camera = camera;
        this.scene = scene;
        this.objects = objects.furniture.concat(objects.walls).concat(objects.uploaded_objects);
        this.pass_through_objects = objects.doors.concat(objects.windows);
        this.draggableObjects = objects.furniture.concat(objects.uploaded_objects);
        this.gridSize = gridSize;
        this.gridScale = gridScale;
        this.modelSize = modelSize;
        this.mode = "regular";
        this.measurements = [];

        this.orbit = new THREE.OrbitControls(camera.outside, canvas);
        this.orbit.update();

        this.gumball = null;


        this.pointerLock = new THREE.PointerLockControls(camera.inside, canvas);
        this.prevTime = performance.now();
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.insideCameraBB = new THREE.Box3();
        this.boundingBoxes = this.getBoundingBoxes(this.objects);

        this.drag = new DragControls(this.draggableObjects, camera.ortho, canvas, this.gridSize, this.gridScale);
        this.mouse = new THREE.Vector2();
        this.raycaster1 = new THREE.Raycaster();
        // this.raycaster2 = new THREE.Raycaster();
        this.enableSelection;
        this.startColor;
        this.selectedGroup = new THREE.Group();
        this.scene.add(this.selectedGroup);
        this.drag_origin = new THREE.Vector3();
        this.switchControls("ortho", camera.ortho, canvas);
    }

    setCameraBB (insideCameraBB, insideCamera) {
        let minBox = new THREE.Vector3(insideCamera.position.x-0.01, 
            insideCamera.position.y-0.01,
            insideCamera.position.z-0.01);
        let maxBox = new THREE.Vector3(insideCamera.position.x+0.01, 
                insideCamera.position.y,
                insideCamera.position.z+0.01);  
        insideCameraBB.set(minBox, maxBox);
    }

    clearEventListeners() {
        this.drag.dispose();
        this.pointerLock.dispose();
        this.orbit.dispose();
        this.clearGumball();
        const instructions = document.getElementById( 'instructions' );
        instructions.removeEventListener( 'click', this.lock);
        this.pointerLock.removeEventListener('lock', this.hideBlocker);
        this.pointerLock.removeEventListener('unlock', this.showBlocker);
        document.removeEventListener('keydown', this.insideOnKeyDown);
        document.removeEventListener('keyup',this.insideOnKeyUp);
        document.removeEventListener('keyup', this.orthoOnKeyUp);
        document.removeEventListener('keydown', this.orthoOnKeyDown);
        document.removeEventListener('click', this.orthoOnClick);
        document.removeEventListener('click', this.outsideOnClick);
        this.drag.removeEventListener('dragstart', this.dragStartCallback);
        this.drag.removeEventListener('dragend', this.dragEndCallback);
        this.drag.removeEventListener('drag', this.dragCallback);
    }

    updateObjects(objects) {
        this.objects = objects.furniture.concat(objects.walls).concat(objects.uploaded_objects);
        this.draggableObjects = objects.furniture.concat(objects.uploaded_objects);
    }

    /**
     * Assumes that this.objects and this.draggableObjects are up to date.
     * @param {*} newControl The control type to switch to. Requires either: "ortho", "inside", or "outside"
     * @param {*} camera The camera that the new view uses. Type should be THREE.Camera
     * @param {*} canvas The canvas for the view. Type: DOM element.
     */
    switchControls(newControl, camera, canvas) {
        this.view = newControl;
        if (newControl == "ortho") {
            this.clearEventListeners();
            this.drag = new DragControls([...this.draggableObjects], camera, canvas, this.gridSize, this.gridScale);
            this.drag.addEventListener('dragstart', this.dragStartCallback);
            this.drag.addEventListener('dragend', this.dragEndCallback);
            this.drag.addEventListener('drag', this.dragCallback);
            document.addEventListener('keyup', this.orthoOnKeyUp);
            document.addEventListener('keydown', this.orthoOnKeyDown);
            document.addEventListener('click', this.orthoOnClick);
            this.drag.enabled = true;
            this.pointerLock.enabled = false;
            this.orbit.enabled = false;
            this.hideBlocker();
        } else if (newControl == "outside") {
            this.clearEventListeners();
            document.addEventListener('click', this.outsideOnClick);
            this.orbit = new THREE.OrbitControls(camera, canvas);
            this.orbit.enabled = true;
            this.drag.enabled = false;
            this.pointerLock.enabled = false;
            this.hideBlocker();
        } else {
            this.clearEventListeners();
            this.boundingBoxes = this.getBoundingBoxes(this.objects);
            this.pointerLock = new THREE.PointerLockControls(camera, canvas);
            this.pointerLock.enabled = true;
            this.orbit.enabled = false;
            this.drag.enabled = false;
            const instructions = document.getElementById( 'instructions' );
            instructions.addEventListener( 'click', this.lock);
            this.showBlocker();
            this.pointerLock.addEventListener( 'lock', this.hideBlocker);
            this.pointerLock.addEventListener( 'unlock', this.showBlocker);
            document.addEventListener('keydown', this.insideOnKeyDown);
            document.addEventListener('keyup',this.insideOnKeyUp);
        }
    }

    updateControls(camera) {
        if (this.view == "inside") {
            const time = performance.now();
            if ( this.pointerLock.isLocked === true ) {
                const delta = ( time - this.prevTime ) / 1000;

                this.velocity.x -= this.velocity.x * 20.0 * delta;
                this.velocity.z -= this.velocity.z * 20.0 * delta;

                this.direction.z = Number( this.moveForward ) - Number( this.moveBackward );
                this.direction.x = Number( this.moveRight ) - Number( this.moveLeft );
                this.direction.normalize(); // this ensures consistent movements in all directions

                if ( this.moveForward || this.moveBackward ) this.velocity.z -= this.direction.z * 50.0 * delta;
                if ( this.moveLeft || this.moveRight ) this.velocity.x -= this.direction.x * 50.0 * delta;
                this.pointerLock.moveRight( - this.velocity.x * delta );
                this.pointerLock.moveForward( - this.velocity.z * delta );
                this.setCameraBB(this.insideCameraBB, camera.inside);
                let collision = this.checkCollisions(this.insideCameraBB, this.boundingBoxes)
                if (collision.hasCollision && collision.collidedBox.name != "wall_11_3" && collision.collidedBox.name != "wall_11_4" ) {
                    console.log(collision.collidedBox)
                    this.pointerLock.moveRight(this.velocity.x * delta );
                    this.pointerLock.moveForward(this.velocity.z * delta );
                    console.log("collision")
                    this.setCameraBB(this.insideCameraBB, camera.inside);
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                }
            }
            this.prevTime = time;
        } else if(this.view == "outside") {
            this.orbit.update();
        }
    }

    createGumball (object) {
        this.gumball = new THREE.TransformControls(this.camera.outside, this.canvas);
        
        // Add mousedown/up event handling  
        this.gumball.addEventListener("mouseDown", (event) => {
            if(this.orbit != null)
                this.orbit.enabled = false;
        });

        this.gumball.addEventListener("mouseUp", (event) => {
            if(this.orbit != null)
                this.orbit.enabled = true;
        });

        this.gumball.attach(object);
        this.scene.add(this.gumball);
    }

    clearGumball() {
        if (this.gumball == null) {
            return;
        }
        this.scene.remove(this.gumball);
        this.gumball.dispose();
        this.gumball = null;
    }

    clickObject(object) {
        if (this.gumball != null) {
            if (object == this.gumball.object) {
                return this.gumball;
            } else {
                this.clearGumball();
            }
        }
        
        this.createGumball(object);
        return this.gumball;
    }

    outsideOnClick = (event) => {
        const rect = this.canvas.getBoundingClientRect();

        this.mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
        this.mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;  
        this.raycaster1.setFromCamera( this.mouse, this.camera.outside );
        const intersections = this.raycaster1.intersectObjects( this.draggableObjects, true );
        if (intersections.length > 0) {
            console.log(intersections[0].object)
            if (intersections[0].object.parent != null) {
                this.clickObject(intersections[0].object.parent);
            } else {
                this.clickObject(intersections[0].object);
            }
        } else {
            this.clearGumball();
            this.orbit.enabled = true;
        }  
    }

    dragStartCallback = (event) => {
        console.log("drag start");
        const object = event.object;
        this.drag_origin = object.position.clone();
        console.log(this.drag_origin);
    }

    dragCallback = (event) => {
        const object = event.object;
        let boundingBox = new THREE.Box3().setFromObject( object);
        
        const newRaycaster = new THREE.Raycaster(object.position, new THREE.Vector3(0,-1,0), object.position.y - boundingBox.min.y);
        // console.log(newRaycaster);
        const intersects = newRaycaster.intersectObjects(this.objects,true);
        if (intersects.length > 0) {
            const firstObject = intersects[0].object;
            const firstObjectBB = new THREE.Box3().setFromObject( firstObject);
            object.position.set(object.position.x, 
                firstObjectBB.max.y + (object.position.y - boundingBox.min.y) + 0.01,
                object.position.z);
            this.colorObject(object, 0x000000);
        }

        boundingBox = new THREE.Box3().setFromObject( object);
        const isCollided = this.checkCollisions(boundingBox, this.boundingBoxes);
        if (isCollided.hasCollision && isCollided.collidedBox.name != object.name) {
            if (!isCollided.collidedBox.name.includes("wall")) {
                console.log("raise")
                // raise object above collidedBox
                object.position.set(object.position.x, 
                                    isCollided.collidedBox.box.max.y + (object.position.y - boundingBox.min.y) + 0.01,
                                    object.position.z);
            } else {
                console.log("Collision!");
                this.colorObject(object, 0xff0000);
            }
        } else {
            this.colorObject(object, 0x000000);
        }
    }

    dragEndCallback = (event) => {
        console.log("drag end");
        console.log(this.drag_origin);
        const object = event.object;
        const boundingBox = new THREE.Box3().setFromObject( object);
        const isCollided = this.checkCollisions(boundingBox, this.boundingBoxes);
        console.log(isCollided);
        
        if (isCollided.hasCollision && isCollided.collidedBox.name != object.name) {
            console.log("Collision!");
            object.position.set(this.drag_origin.x, this.drag_origin.y, this.drag_origin.z);
            this.colorObject(object, 0x000000);
        } else {
            console.log("Successful drag")
        }
        this.boundingBoxes = this.getBoundingBoxes(this.objects); // update boundingBoxes
        // console.log("startColor after dragStart" + this.startColor);
        // event.object.material.color.setHex(this.startColor);
        
    }

    hideBlocker = () => {

        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    }
    
    showBlocker = () => {
        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );
        blocker.style.display = 'block';
        instructions.style.display = '';
    }

    lock = () => {
        this.pointerLock.lock();
    }

    colorObject(object, color) {
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

    getBoundingBoxes(objects) {
        let boxes = [];
        for (let i = 0; i < objects.length; i++) {
                const boundingBox = new THREE.Box3().setFromObject( objects[i] );
                boxes.push({box: boundingBox, name: objects[i].name, index: i});
    
        }
        return boxes;
    }
    
    checkCollisions(box, boundingBoxes){
        for (let i = 0; i < boundingBoxes.length; i++) {
            if (box.intersectsBox(boundingBoxes[i].box)) {
                return {hasCollision: true, collidedBox: boundingBoxes[i]};
            }
        }
        return {hasCollision: false, collidedObject: null} ;
    }

    insideOnKeyDown = ( event ) => {

        switch ( event.code ) {
    
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
    
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
    
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
    
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
        }
    
    };
    
    insideOnKeyUp = ( event ) => {
    
        switch ( event.code ) {
    
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
    
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
    
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
    
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
    
        }
    };

    orthoOnKeyDown = ( event ) => {

        this.enableSelection = ( event.keyCode === 16 ) ? true : false;
        
        if ( event.keyCode === 77 ) {

            this.drag.mode = ( this.drag.mode === 'translate' ) ? 'rotate' : 'translate';
    
        }

    }

    orthoOnKeyUp = () => {

        this.enableSelection = false;

    }

    orthoOnClick = (event) => {
        event.preventDefault();
        console.log(event.button);
        // event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();

        this.mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
        this.mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;
        
        this.raycaster1.setFromCamera( this.mouse, this.camera.ortho );
        // switch (event.button) {
        //     case 0: 
        if (this.mode == "regular") {
            if ( this.enableSelection === true ) {
                const draggableObjects = this.drag.getObjects();
                draggableObjects.length = 0;
                const intersections = this.raycaster1.intersectObjects( this.draggableObjects, true );
                if ( intersections.length > 0 ) {
                    const bounding_box = intersections[ 0 ].object; // should be the bounding box
                    const object = bounding_box.parent;
                    if ( this.selectedGroup.children.includes( object ) === true ) {
                        this.colorObject(object, 0x000000);
                        this.scene.attach( object );
                        this.selectedGroup.remove(object);
                    } else {
                        this.colorObject(object, 0x0000ff);                       
                        this.selectedGroup.attach( object );
                        this.scene.remove(object);
                    }
                    this.drag.transformGroup = true;
                    draggableObjects.push( this.selectedGroup );
                }
                if ( this.selectedGroup.children.length === 0 ) {
                    this.drag.transformGroup = false;
                    draggableObjects.push( ...this.draggableObjects );
                }
            }
        } else if (this.mode == "measure") {
            if (this.measurements.length > 0) {
                for (let i = 0 ; i < this.measurements.length; i++) {
                    let closestPoint = new THREE.Vector3();
                    this.raycaster1.ray.closestPointToPoint(this.measurements[i], closestPoint);
                    console.log(closestPoint)
                    if (closestPoint.distanceTo(this.measurements[i]) < 1) {
                        if (i == 0) {
                            this.measurements.shift();
                            return;
                        } else {
                            this.measurements.pop();
                            return;
                        }
                    }
                }
            } 
            if (this.measurements.length < 2) {
                let intersections = this.raycaster1.intersectObjects( this.objects, true );
                const planeIntersection = new THREE.Vector3();
                const originPlane = new THREE.Plane (new THREE.Vector3(0,1,0));
                this.raycaster1.ray.intersectPlane(originPlane, planeIntersection);
                console.log(this.raycaster1);
                if (intersections.length > 0) {
                    console.log(intersections);
                    intersections[0].point.add(this.raycaster1.ray.direction.multiplyScalar(-0.05));
                    this.measurements.push(intersections[0].point);
                } else {
                    console.log(planeIntersection);
                    if (planeIntersection.length() < this.gridSize / 2) {
                        planeIntersection.add(this.raycaster1.ray.direction.multiplyScalar(-0.05));
                        this.measurements.push(planeIntersection);
                    }

                }
            }
        }
    }
}

export {DemoControls};
