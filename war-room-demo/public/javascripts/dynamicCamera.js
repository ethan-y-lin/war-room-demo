class DynamicCamera {

    constructor(canvas, modelSize) {
        this.intialize(canvas, modelSize);
    }

    intialize(canvas, modelSize) {
        console.log("camera initialized")
        this.inside = null;
        this.outside = null;
        this.ortho = null;
        this.setOrthoCamera(canvas, modelSize, 2);
        this.setInsideCamera(canvas);
        this.setOutsideCamera(canvas);
        this.name = "ortho";
    }

    setOrthoCamera(canvas, modelSize, padding) {
        // orthographic camera
        let orthoCamera = new THREE.OrthographicCamera(
            -modelSize.x/2-padding,
            modelSize.x/2+padding,
            modelSize.z/2+padding,
            -modelSize.z/2-padding,
            0.1,
            1000
        );
        orthoCamera.position.set(0, 30, 0);
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
            60, 
            canvas.offsetWidth / canvas.offsetHeight, 
            0.1, 
            1000
        );
        insideCamera.position.set(4, 1.7, -1);
        insideCamera.rotation.y = 90;
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
        outsideCamera.position.set(-10, 10, 10);
        this.name = "outside";
        this.outside = outsideCamera;
    }
}

export {DynamicCamera}