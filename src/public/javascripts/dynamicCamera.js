import * as THREE from 'three';
/**
 * Represents a dynamic camera setup for a 3D scene with multiple camera views.
 * Provides methods to initialize and manage orthographic, inside perspective, 
 * and outside perspective cameras.
 * @constructor
 * @param {HTMLElement} canvas - The HTML canvas element where the scene is rendered.
 * @param {THREE.Vector3} modelSize - The size of the 3D model to adjust camera parameters.
 */
class DynamicCamera {
    /**
     * Constructs a new instance of DynamicCamera and initializes cameras.
     * @param {HTMLElement} canvas - The HTML canvas element where the scene is rendered.
     * @param {THREE.Vector3} modelSize - The size of the 3D model to adjust camera parameters.
     */
    constructor(canvas, modelSize) {
        this.initialize(canvas, modelSize);
    }

    /**
     * Initializes the DynamicCamera instance by setting up orthographic,
     * inside perspective, and outside perspective cameras.
     * @param {HTMLElement} canvas - The HTML canvas element where the scene is rendered.
     * @param {THREE.Vector3} modelSize - The size of the 3D model to adjust camera parameters.
     */
    initialize(canvas, modelSize) {
        console.log("Camera initialized");
        this.inside = null; // Inside perspective camera
        this.outside = null; // Outside perspective camera
        this.ortho = null; // Orthographic camera
        this.setOrthoCamera(canvas, modelSize, 2);
        this.setInsideCamera(canvas);
        this.setOutsideCamera(canvas);
        this.name = "ortho"; // Initial camera mode is orthographic
    }

    /**
     * Sets up an orthographic camera for top-down (ortho) view.
     * @param {HTMLElement} canvas - The HTML canvas element where the scene is rendered.
     * @param {THREE.Vector3} modelSize - The size of the 3D model to adjust camera parameters.
     * @param {number} padding - Padding around the model for the orthographic view.
     */
    setOrthoCamera(canvas, modelSize, padding) {
        console.log("after", canvas.offsetWidth, canvas.offsetHeight)
        const aspectRatio = canvas.offsetWidth / canvas.offsetHeight;
        console.log("aspect ratio: " , aspectRatio)
        const width = Math.max(modelSize.x, modelSize.z) + 2 * padding;
        const height = width / aspectRatio;
        console.log("height: ", height)
        // Orthographic camera setup
        let orthoCamera = new THREE.OrthographicCamera(
            -width / 2,
            width / 2,
            height / 2,
            -height / 2,
            0.1,
            1000
        );
        orthoCamera.position.set(0, 30, 0);
        orthoCamera.lookAt(0, 0, 0);
        orthoCamera.updateMatrixWorld();
        
        orthoCamera.name = Date.now();
        this.name = "ortho"; // Set camera mode to orthographic
        this.ortho = orthoCamera; // Store orthographic camera
    }

    /**
     * Sets up an inside perspective camera for interior view.
     * @param {HTMLElement} canvas - The HTML canvas element where the scene is rendered.
     */
    setInsideCamera(canvas) {
        // Inside perspective camera setup
        let insideCamera = new THREE.PerspectiveCamera(
            60,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        insideCamera.position.set(4, 1.7, -1);
        insideCamera.rotation.y = 90;
        insideCamera.name = Date.now();
        this.name = "inside"; // Set camera mode to inside perspective
        this.inside = insideCamera; // Store inside perspective camera
    }

    /**
     * Sets up an outside perspective camera for exterior view.
     * @param {HTMLElement} canvas - The HTML canvas element where the scene is rendered.
     */
    setOutsideCamera(canvas) {
        // Outside perspective camera setup
        let outsideCamera = new THREE.PerspectiveCamera(
            45,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        outsideCamera.position.set(-10, 3, 10);
        outsideCamera.name = Date.now();
        this.name = "outside";
        this.outside = outsideCamera;
    }
}

export { DynamicCamera };
