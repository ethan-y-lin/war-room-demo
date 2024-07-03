import {
	Euler,
	EventDispatcher,
	Vector3
} from 'three';

const _euler = new Euler( 0, 0, 0, 'YXZ' );
const _vector = new Vector3();

const _changeEvent = { type: 'change' };
const _doubleClickEvent = {type: 'dblclick'};
const _PI_2 = Math.PI / 2;

class MobileControls extends EventDispatcher {

	constructor( camera, domElement ) {

		super();

		this.camera = camera;
		this.domElement = domElement;

		// Set to constrain the pitch of the camera
		// Range is 0 to Math.PI radians
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		this.pointerSpeed = 2.0;

		this._onPointerMove = onPointerMove.bind( this );
        this._onTouchMove = onTouchMove.bind( this );
        this._onDoubleClick = onDoubleClick.bind(this);

		this.connect();

	}

	connect() {

		this.domElement.addEventListener( 'pointermove', this._onPointerMove );
        this.domElement.addEventListener( 'touchmove', this._onTouchMove );
        this.domElement.addEventListener('dblclick', this._onDoubleClick );

	}

	disconnect() {

		this.domElement.removeEventListener( 'pointermove', this._onPointerMove );
        this.domElement.removeEventListener( 'touchmove', this._onTouchMove );
        this.domElement.removeEventListener('dblclick', this._onDoubleClick );
	}

	dispose() {

		this.disconnect();

	}

	getObject() { // retaining this method for backward compatibility

		return this.camera;

	}

	getDirection( v ) {

		return v.set( 0, 0, - 1 ).applyQuaternion( this.camera.quaternion );

	}

	moveForward( distance ) {

		// move forward parallel to the xz-plane
		// assumes camera.up is y-up

		const camera = this.camera;

		_vector.setFromMatrixColumn( camera.matrix, 0 );

		_vector.crossVectors( camera.up, _vector );

		camera.position.addScaledVector( _vector, distance );

	}

	moveRight( distance ) {

		const camera = this.camera;

		_vector.setFromMatrixColumn( camera.matrix, 0 );

		camera.position.addScaledVector( _vector, distance );

	}


}

// event listeners

function onPointerMove( event ) {

	const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

	const camera = this.camera;
	_euler.setFromQuaternion( camera.quaternion );

	_euler.y -= movementX * 0.002 * this.pointerSpeed;
	_euler.x -= movementY * 0.002 * this.pointerSpeed;

	_euler.x = Math.max( _PI_2 - this.maxPolarAngle, Math.min( _PI_2 - this.minPolarAngle, _euler.x ) );

	camera.quaternion.setFromEuler( _euler );
    console.log("on pointer move")
	this.dispatchEvent( _changeEvent );

}

function onTouchMove( event ) {

	const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

	const camera = this.camera;
	_euler.setFromQuaternion( camera.quaternion );

	_euler.y -= movementX * 0.002 * this.pointerSpeed;
	_euler.x -= movementY * 0.002 * this.pointerSpeed;

	_euler.x = Math.max( _PI_2 - this.maxPolarAngle, Math.min( _PI_2 - this.minPolarAngle, _euler.x ) );

	camera.quaternion.setFromEuler( _euler );
    console.log("on touch move")
	this.dispatchEvent( _changeEvent );

}

function onDoubleClick(event) {
    this.dispatchEvent(_doubleClickEvent);
    console.log(event);
}

export { MobileControls };