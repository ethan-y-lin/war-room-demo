class DynamicCamera {
    constructor(canvas) {
        this.intialize(canvas);
    }

    intialize(canvas) {
        this.inside = null;
        this.outside = null;
        this.ortho = null;
        this.setOrthoCamera(canvas);
        this.setInsideCamera(canvas);
        this.setOutsideCamera(canvas);
        this.name = "ortho";
    }

    setOrthoCamera(canvas) {
        // orthographic camera
        let orthoCamera = new THREE.OrthographicCamera(
            -canvas.offsetWidth/128,
            canvas.offsetWidth/128,
            canvas.offsetHeight/128,
            -canvas.offsetHeight/128,
            0.1,
            1000
        );
        orthoCamera.position.set(0, 10, 0);
        orthoCamera.up.set (0, 0, -1);
        orthoCamera.lookAt(0, 0, 0);
        this.name = "ortho";
        this.ortho = orthoCamera;
    }

    setInsidePosition (camera, position) {
        camera.position.set (position);
    }

    setInsideCamera(canvas) {
        // inside camera
        let insideCamera = new THREE.PerspectiveCamera(
            120, 
            canvas.offsetWidth / canvas.offsetHeight, 
            0.1, 
            1000
        );
        insideCamera.position.set(5, 1.71, 5);
        this.name = "inside";
        this.inside = insideCamera;
    }

    setOutsideCamera(canvas) {
         // outside camera
        let outsideCamera = new THREE.PerspectiveCamera(
            45, 
            canvas.offsetWidth / canvas.offsetHeight, 
            0.1, 
            1000
        );
        outsideCamera.position.set(-10, 30, 30);
        this.name = "outside";
        this.outside = outsideCamera;
    }
}

export {DynamicCamera}