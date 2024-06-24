const _plane = new THREE.Plane();
const _raycaster = new THREE.Raycaster();

const _pointer = new THREE.Vector2();
const _offset = new THREE.Vector3();
const _diff = new THREE.Vector2();
const _previousPointer = new THREE.Vector2();
const _intersection = new THREE.Vector3();
const _worldPosition = new THREE.Vector3();
const _inverseMatrix = new THREE.Matrix4();

const _up = new THREE.Vector3();
const _right = new THREE.Vector3();

class DragControls extends THREE.EventDispatcher {

	constructor( _objects, _camera, _domElement) {

		super();

		_domElement.style.touchAction = 'none'; // disable touch scroll

		let _selected = null, _hovered = null;

		const _intersections = [];

		this.mode = 'translate';

		this.rotateSpeed = 1;

		//

		const scope = this;

		function activate() {
			_domElement.addEventListener( 'pointermove', onPointerMove);
			_domElement.addEventListener( 'pointerdown', onPointerDown );
			_domElement.addEventListener( 'pointerup', onPointerCancel );
			_domElement.addEventListener( 'pointerleave', onPointerCancel );

		}

		function deactivate() {

			_domElement.removeEventListener( 'pointermove', onPointerMove );
			_domElement.removeEventListener( 'pointerdown', onPointerDown );
			_domElement.removeEventListener( 'pointerup', onPointerCancel );
			_domElement.removeEventListener( 'pointerleave', onPointerCancel );

			_domElement.style.cursor = '';

		}

		function dispose() {

			deactivate();

		}

		function getObjects() {

			return _objects;

		}

		function setObjects( objects ) {

			_objects = objects;

		}

		function getRaycaster() {

			return _raycaster;

		}

		function onPointerMove( event) {

			if ( scope.enabled === false ) return;

			updatePointer( event );

			_raycaster.setFromCamera( _pointer, _camera );

			if ( _selected ) {
				if ( scope.mode === 'translate' ) {

					if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
						const y_pos = _selected.position.y;
						_selected.position.copy( _intersection.sub( _offset ).applyMatrix4( _inverseMatrix ) );
                        const gridSize = 10.040862083435059;
                        const gridScale = 0.1;
                        const gridCellDim = gridScale;
					
                        _selected.position.divideScalar(gridCellDim).floor().multiplyScalar(gridCellDim).addScalar(gridCellDim/2);
						_selected.position.y = y_pos;
                        // _selected.position.y = 0; // can make more dynamic in the future.
                        if(_selected.position.x + _offset.x < -gridSize / 2) _selected.position.x = -gridSize / 2 - _offset.x;
                        if(_selected.position.x + _offset.x > gridSize / 2) _selected.position.x = gridSize / 2 - _offset.x;
                        if(_selected.position.z + _offset.z < -gridSize / 2) _selected.position.z = -gridSize / 2 - _offset.z;
                        if(_selected.position.z + _offset.z > gridSize / 2) _selected.position.z = gridSize / 2 - _offset.z;
					}

				} else if ( scope.mode === 'rotate' ) {

					_diff.subVectors( _pointer, _previousPointer ).multiplyScalar( scope.rotateSpeed );
					_selected.rotateOnWorldAxis( _up, _diff.x );
					console.log(_selected)
					_selected.rotateOnWorldAxis( _right.normalize(), - _diff.y );

				}

				scope.dispatchEvent( { type: 'drag', object: _selected } );

				_previousPointer.copy( _pointer );

			} else {

				// hover support

				if ( event.pointerType === 'mouse' || event.pointerType === 'pen' ) {

					_intersections.length = 0;

					_raycaster.setFromCamera( _pointer, _camera );
					_raycaster.intersectObjects( _objects, scope.recursive, _intersections );

					if ( _intersections.length > 0 ) {

						const object = _intersections[ 0 ].object;

						_plane.setFromNormalAndCoplanarPoint( _camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( object.matrixWorld ) );

						if ( _hovered !== object && _hovered !== null ) {

							scope.dispatchEvent( { type: 'hoveroff', object: _hovered } );

							_domElement.style.cursor = 'auto';
							_hovered = null;

						}

						if ( _hovered !== object ) {

							scope.dispatchEvent( { type: 'hoveron', object: object } );

							_domElement.style.cursor = 'pointer';
							_hovered = object;

						}

					} else {

						if ( _hovered !== null ) {

							scope.dispatchEvent( { type: 'hoveroff', object: _hovered } );

							_domElement.style.cursor = 'auto';
							_hovered = null;

						}

					}

				}

			}

			_previousPointer.copy( _pointer );

		}

		function onPointerDown( event ) {

			if ( scope.enabled === false ) return;

			updatePointer( event );

			_intersections.length = 0;

			_raycaster.setFromCamera( _pointer, _camera );
			_raycaster.intersectObjects( _objects, scope.recursive, _intersections );

			if ( _intersections.length > 0 ) {

				if ( scope.transformGroup === true ) {

					// look for the outermost group in the object's upper hierarchy

					_selected = findGroup( _intersections[ 0 ].object );

				} else {
					if (_intersections[0].object.parent != null && _intersections[0].object.parent.type == "Group") {
						_selected = findGroup(_intersections[0].object.parent);
					} else {
						_selected = _intersections[ 0 ].object;
					}
					
					console.log("Not transform Group")
				}

				_plane.setFromNormalAndCoplanarPoint( _camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

				if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

					if ( scope.mode === 'translate' ) {

						_inverseMatrix.copy( _selected.parent.matrixWorld ).invert();
						_offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

					} else if ( scope.mode === 'rotate' ) {

						// the controls only support Y+ up
						_up.set( 0, 0, 1 ).applyQuaternion( _camera.quaternion ).normalize();
						_right.set( 0, 0, 1 ).applyQuaternion( _camera.quaternion ).normalize();

					}

				}

				_domElement.style.cursor = 'move';

				scope.dispatchEvent( { type: 'dragstart', object: _selected } );

			}

			_previousPointer.copy( _pointer );

		}

		function onPointerCancel() {

			if ( scope.enabled === false ) return;

			if ( _selected ) {

				scope.dispatchEvent( { type: 'dragend', object: _selected } );

				_selected = null;

			}

			_domElement.style.cursor = _hovered ? 'pointer' : 'auto';

		}

		function updatePointer( event ) {

			const rect = _domElement.getBoundingClientRect();

			_pointer.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
			_pointer.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;

		}

		function findGroup( obj, group = null ) {

			if ( obj.isGroup ) group = obj;

			if ( obj.parent === null ) return group;

			return findGroup( obj.parent, group );

		}

		activate();

		// API

		this.enabled = true;
		this.recursive = true;
		this.transformGroup = false;

		this.activate = activate;
		this.deactivate = deactivate;
		this.dispose = dispose;
		this.getObjects = getObjects;
		this.getRaycaster = getRaycaster;
		this.setObjects = setObjects;

	}

}

export { DragControls };
