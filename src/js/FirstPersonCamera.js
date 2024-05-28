import * as THREE from 'three'
import {MathUtils} from 'three';
const KEYS = {
    'a': 65,
    's': 83,
    'w': 87,
    'd': 68,
  };

class InputController {
    constructor(target) {
        this.canvas = target;
        this.target = target || document;
        this.initialize();
    }
    initialize() {
        console.log(this.target);
        console.log(this.canvas);
        this.current = {
            leftButton: false,
            rightButton: false,
            mouseX: 0,
            mouseY: 0
        }
        this.previous = null;
        this.keys = {};
        this.previousKeys = {};
        this.target.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        this.target.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        this.target.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
        this.target.addEventListener('click', (e) => this.onMouseClick(e),false)
        document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
    }

    onMouseDown(e) {
        switch (e.button) {
            case 0: {
                this.current.leftButton = true;
                break;
            }
            case 2: {
                this.current.rightButton = true;
                break;
            }
        }
    }

    onMouseUp(e) {
        switch (e.button) {
            case 0: {
                this.current.leftButton = false;
                break;
            }
            case 2: {
                this.current.rightButton = false;
                break;
            }
        }
    }

    onMouseMove(e){
        this.current.mouseX = e.pageX - this.canvas.offsetWidth / 2;
        this.current.mouseY = e.pageY - this.canvas.offsetHeight / 2;

        if (this.previous === null) {
            this.previous = {... this.current};
        }

        this.current.mouseXDelta = this.current.mouseX - this.previous.mouseX;
        this.current.mouseYDelta = this.current.mouseY - this.previous.mouseY;
    }
    
    onMouseClick(e){
        document.querySelector(".mainSection").classList.add("no-cursor");
    }

    onKeyDown(e){
        this.keys[e.keyCode] = true;
    }

    onKeyUp(e){
        this.keys[e.keyCode] = false;
    }

    key(keyCode){
        return !!this.keys[keyCode];
    }
    update(){
        if (this.previous !== null) {
            this.current.mouseXDelta = this.current.mouseX - this.previous.mouseX;
            this.current.mouseYDelta = this.current.mouseY - this.previous.mouseY;
      
            this.previous = {...this.current};
          }
    }
}

class FirstPersonCamera {
    constructor (camera, canvas) {
        this.canvas = canvas
        this.camera = camera;
        this.input = new InputController(canvas);
        this.rotation = new THREE.Quaternion();
        this.translation = new THREE.Vector3(0,1.71,0);
        this.phi = 0;
        this.theta = 0;
    }

    update(timeElaspedS) {
        this.updateRotation(timeElaspedS);
        this.updateCamera(timeElaspedS);
        this.updateTranslation(timeElaspedS);
        this.input.update(timeElaspedS);
    }
    
    updateCamera(){
        this.camera.quaternion.copy(this.rotation);
        this.camera.position.copy(this.translation);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.rotation);
    
        const dir = forward.clone();
    
        forward.multiplyScalar(100);
        forward.add(this.translation);

    }
    updateRotation(timeElaspedS) {
        const xh = this.input.current.mouseXDelta / this.canvas.offsetWidth;
        const yh = this.input.current.mouseYDelta / this.canvas.offsetHeight;

        this.phi += -xh * 5;
        this.theta = MathUtils.clamp(this.theta -yh*5, -Math.PI / 3, Math.PI / 3);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0,1,0), this.phi);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1,0,0), this.theta);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this.rotation.copy(q)
    }

    updateTranslation(timeElapsedS){
        const forwardVelocity = (this.input.key(KEYS.w) ? 1 : 0) + (this.input.key(KEYS.s) ? -1 : 0)
        console.log(forwardVelocity)
        const strafeVelocity = (this.input.key(KEYS.a) ? 1 : 0) + (this.input.key(KEYS.d) ? -1 : 0)
    
        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);
    
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * timeElapsedS * 2);
    
        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * timeElapsedS * 2);
    
        this.translation.add(forward);
        this.translation.add(left);
    }
}

export {FirstPersonCamera}