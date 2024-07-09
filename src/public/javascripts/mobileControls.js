import {
	Euler,
	EventDispatcher,
	Vector3, 
    Vector2
} from 'three';

const _euler = new Euler( 0, 0, 0, 'YXZ' );
const _vector = new Vector3();

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };
const _doubleClickEvent = {type: 'dblclick'};
const _PI_2 = Math.PI / 2;
const pointers = [];
const pointerPositions = {};

const rotateStart = new Vector2();
const rotateEnd = new Vector2();
const rotateDelta = new Vector2();


class MobileControls extends EventDispatcher {

	constructor( camera, domElement ) {

		super();

		this.camera = camera;
		this.domElement = domElement;
        this.dragged = false;

		// Set to constrain the pitch of the camera
		// Range is 0 to Math.PI radians
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		this.pointerSpeed = 2.0;

		this.connect();

	}

	connect() {

		this.domElement.addEventListener( 'pointerdown', this.onPointerDown );
		this.domElement.addEventListener( 'pointercancel', this.onPointerUp );
        this.domElement.addEventListener('touchend', this.detectDoubleTapClosure());

	}

	disconnect() {

        this.domElement.removeEventListener( 'pointerdown', this.onPointerDown );
		this.domElement.removeEventListener( 'pointercancel', this.onPointerUp );
        this.domElement.removeEventListener('touchend', this.detectDoubleTapClosure() );
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

    onPointerDown = ( event ) => {
    
        if ( pointers.length === 0 ) {
    
            this.domElement.setPointerCapture( event.pointerId );
    
            this.domElement.addEventListener( 'pointermove', this.onPointerMove );
            this.domElement.addEventListener( 'pointerup', this.onPointerUp );
    
        }
    
        //
    
        if ( isTrackingPointer( event ) ) return;
    
        //
    
        addPointer( event );
    
        if ( event.pointerType === 'touch' ) {
    
            this.onTouchStart( event );
    
        } 
    
    }

    onPointerMove = ( event ) => {
    
        if ( event.pointerType === 'touch' ) {
            this.dragged = true;
            this.onTouchMove( event );
    
        } 
    
    }
    
    onPointerUp = ( event ) =>{
    
        removePointer( event );
    
        switch ( pointers.length ) {
    
            case 0:
    
                this.domElement.releasePointerCapture( event.pointerId );
    
                this.domElement.removeEventListener( 'pointermove', this.onPointerMove );
                this.domElement.removeEventListener( 'pointerup', this.onPointerUp );
    
                this.dispatchEvent( _endEvent );
    
                break;
    
            case 1:
    
                const pointerId = pointers[ 0 ];
                const position = pointerPositions[ pointerId ];
    
                // minimal placeholder event - allows state correction on pointer-up
                this.onTouchStart( { pointerId: pointerId, pageX: position.x, pageY: position.y } );
    
                break;
    
        }
    
    }

    onTouchStart = (event) => {
        trackPointer(event);
        if (pointers.length === 1) {
            rotateStart.set(event.pageX, event.pageY);
        } else {
            const position = getSecondPointerPosition( event );
    
            const x = 0.5 * ( event.pageX + position.x );
            const y = 0.5 * ( event.pageY + position.y );
    
            rotateStart.set( x, y );
        }
    }

    onTouchMove = (event) => {
        trackPointer(event);
        if ( pointers.length == 1 ) {
    
            rotateEnd.set( event.pageX, event.pageY );
    
        } else {
    
            const position = getSecondPointerPosition( event );
    
            const x = 0.5 * ( event.pageX + position.x );
            const y = 0.5 * ( event.pageY + position.y );
    
            rotateEnd.set( x, y );
    
        }
        rotateDelta.subVectors(rotateEnd, rotateStart)
        this.rotateCamera(rotateDelta.x, rotateDelta.y);
        rotateStart.copy(rotateEnd);
    }

    rotateCamera (movementX, movementY) {
        const camera = this.camera;
        _euler.setFromQuaternion( camera.quaternion );
    
        _euler.y -= movementX * 0.002 * this.pointerSpeed;
        _euler.x -= movementY * 0.002 * this.pointerSpeed;
    
        _euler.x = Math.max( _PI_2 - this.maxPolarAngle, Math.min( _PI_2 - this.minPolarAngle, _euler.x ) );
    
        camera.quaternion.setFromEuler( _euler );
        this.dispatchEvent( _changeEvent );
    }
    
    detectDoubleTapClosure() {
        let lastTap = 0;
        let timeout;
        const scope = this;
        
        return function detectDoubleTap(event) {
            if (!scope.dragged) {
                const curTime = new Date().getTime();
                const tapLen = curTime - lastTap;
                
                if (tapLen < 500 && tapLen > 0) {
                    console.log('Double tapped!');
                    event.preventDefault();
                    
                    // Ensure scope is an EventDispatcher
                    if (typeof scope.dispatchEvent === 'function') {
                        scope.dispatchEvent(_doubleClickEvent);
                        console.log('Event dispatched!');
                    } else {
                        console.error('Scope is not an EventDispatcher. Current scope:', scope);
                    }
                } else {
                    timeout = setTimeout(() => {
                        clearTimeout(timeout);
                    }, 500);
                }
                
                lastTap = curTime;
            } else {
                scope.dragged = false;
            }

        };
    }
}
// Pointer Functions

function trackPointer( event ) {
    
    let position = pointerPositions[ event.pointerId ];

    if ( position === undefined ) {

        position = new Vector2();
        pointerPositions[ event.pointerId ] = position;

    }

    position.set( event.pageX, event.pageY );

}

function addPointer( event ) {
    
    pointers.push( event.pointerId );

}

function removePointer( event ) {

    delete pointerPositions[ event.pointerId ];

    for ( let i = 0; i < pointers.length; i ++ ) {

        if ( pointers[ i ] == event.pointerId ) {

            pointers.splice( i, 1 );
            return;

        }

    }

}

function isTrackingPointer( event ) {

    for ( let i = 0; i < pointers.length; i ++ ) {

        if ( pointers[ i ] == event.pointerId ) return true;

    }

    return false;

}

function getSecondPointerPosition( event ) {

    const pointerId = ( event.pointerId === pointers[ 0 ] ) ? pointers[ 1 ] : pointers[ 0 ];

    return pointerPositions[ pointerId ];

}



export { MobileControls };