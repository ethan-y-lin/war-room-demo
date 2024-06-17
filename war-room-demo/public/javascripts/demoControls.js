import { DragControls} from "./DragControls.js";

class DemoControls {
    constructor (camera, canvas, objects, gridSize, gridScale) {
        this.initialize(camera, canvas, objects, gridSize, gridScale);
    }

    initialize(camera, canvas, objects, gridSize, gridScale){
        this.canvas = canvas;
        this.camera = camera;
        this.objects = objects;
        this.gridSize = gridSize;
        this.gridScale = gridScale;

        this.orbit = new THREE.OrbitControls(camera.outside, canvas);
        this.orbit.update();

        this.pointerLock = new THREE.PointerLockControls(camera.inside, canvas);
        this.prevTime = performance.now();
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.insideCameraBB = new THREE.Box3();
        this.boundingBoxes = this.getBoundingBoxes(objects);

        this.drag = new DragControls(objects, camera.ortho, canvas, this.gridSize, this.gridScale);
        this.startColor;
        this.switchControls("ortho", objects, camera.ortho, canvas);
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

    setObjects(objects) {
        this.objects = objects;
    }

    clearEventListeners() {
        this.drag.dispose();
        this.pointerLock.dispose();
        this.orbit.dispose();
        const instructions = document.getElementById( 'instructions' );
        instructions.removeEventListener( 'click', this.lock);
        this.pointerLock.removeEventListener('lock', this.hideBlocker);
        this.pointerLock.removeEventListener('unlock', this.showBlocker);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup',this.onKeyUp);
        this.drag.removeEventListener('dragstart', this.dragStartCallback);
        this.drag.removeEventListener('dragend', this.dragEndCallback);
    }
    switchControls(newControl, objects, camera, canvas) {
        this.view = newControl;
        if (newControl == "ortho") {
            this.clearEventListeners();
            console.log(this.gridScale);
            console.log(this.gridSize);
            this.drag = new DragControls(objects, camera, canvas, this.gridSize, this.gridScale);
            console.log(this.drag);
            this.drag.addEventListener('dragstart', this.dragStartCallback);
            this.drag.addEventListener('dragend', this.dragEndCallback);
            console.log(this.drag._listeners);
            this.drag.enabled = true;
            this.pointerLock.enabled = false;
            this.orbit.enabled = false;
            this.hideBlocker();
        } else if (newControl == "outside") {
            this.clearEventListeners();
            this.orbit = new THREE.OrbitControls(camera, canvas);
            this.orbit.enabled = true;
            this.drag.enabled = false;
            this.pointerLock.enabled = false;
            this.hideBlocker();
        } else {
            this.clearEventListeners();
            this.boundingBoxes = this.getBoundingBoxes(objects);
            this.pointerLock = new THREE.PointerLockControls(camera, canvas);
            this.pointerLock.enabled = true;
            this.orbit.enabled = false;
            this.drag.enabled = false;
            const instructions = document.getElementById( 'instructions' );
            instructions.addEventListener( 'click', this.lock);
            this.showBlocker();
            this.pointerLock.addEventListener( 'lock', this.hideBlocker);
            this.pointerLock.addEventListener( 'unlock', this.showBlocker);
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup',this.onKeyUp);
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
                if (collision.hasCollision && collision.collidedObject.name != "wall_11") {
                    console.log(collision.collidedObject)
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

    dragStartCallback(event){
        console.log("drag start");
        this.startColor = event.object.material.color.getHex();
        console.log("startColor before dragStart" + this.startColor);
        console.log(event.object);
        event.object.material.color.setHex(0xff5733);
    }

    dragEndCallback(event){
        console.log("drag end");
        console.log("startColor after dragStart" + this.startColor);
        event.object.material.color.setHex(this.startColor);
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

    hasDoor (object) {
        if (object.name.includes("door")){
            return true;
        }
        if (object.children.length == 0) {
            return false;
        }
        let bool = false;
        for (let i = 0; i < object.children.length; i++) {
            bool = bool || this.hasDoor(object.children[i]);
        }
        return bool;
    } 

    getBoundingBoxes(objects) {
        this.objects = objects; // updates objects as well
        let boxes = [];
        for (let i = 0; i < objects.length; i++) {
            if (this.hasDoor(objects[i])){
                 for (let j = 0; j < objects[i].children.length; j++){
                    if (!objects[i].children[j].name.includes("door")){
                        const boundingBox = new THREE.Box3().setFromObject( objects[i].children[j] );
                        boxes.push([boundingBox,i]); 
                    }else{
                        console.log("door")
                    }
                 }
            }else {
                const boundingBox = new THREE.Box3().setFromObject( objects[i] );
                boxes.push([boundingBox, i]);
            }
    
        }
        return boxes;
    }
    
    checkCollisions(box, boundingBoxes){
        for (let i = 0; i < boundingBoxes.length; i++) {
            if (box.intersectsBox(boundingBoxes[i][0])) {
                return {hasCollision: true, collidedObject: this.objects[boundingBoxes[i][1]]};
            }
        }
        return false;
    }

    onKeyDown = ( event ) => {

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
    
    onKeyUp = ( event ) => {
    
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
}

export {DemoControls};
