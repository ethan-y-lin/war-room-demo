import * as THREE from 'three';

/**
 * This file contains functions required to generate the dynamic grass geometry.
 */

function convertRange (val, oldMin, oldMax, newMin, newMax) {
    return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}
  
function generateFieldGeo(
    PLANE_SIZE, 
    BLADE_COUNT, 
    BLADE_WIDTH, 
    BLADE_HEIGHT, 
    BLADE_HEIGHT_VARIATION,
    NO_GRASS_RECT // New parameter: [xMin, xMax, zMin, zMax] for the rectangular area where no grass should be placed
  ) {
    console.log("GENERATRING FIELD")
    const positions = [];
    const uvs = [];
    const indices = [];
    const colors = [];
  
    for (let i = 0; i < BLADE_COUNT; i++) {
      const VERTEX_COUNT = 5;
      const surfaceMin = PLANE_SIZE / 2 * -1;
      const surfaceMax = PLANE_SIZE / 2;
  
      let x = Math.random() * PLANE_SIZE - PLANE_SIZE / 2;
      let z = Math.random() * PLANE_SIZE - PLANE_SIZE / 2;
  
      // Check if the blade position is inside the no-grass rectangle
      if (x >= NO_GRASS_RECT[0] && x <= NO_GRASS_RECT[1] && z >= NO_GRASS_RECT[2] && z <= NO_GRASS_RECT[3]) {
        if (x > 0) {
            x = NO_GRASS_RECT[1] + Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[1])
        } else {
            x = NO_GRASS_RECT[0] - Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[1])
        }
        if (z > 0) {
            z = NO_GRASS_RECT[3] + Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[4]);
        } else {
            z = NO_GRASS_RECT[2] - Math.random() * (PLANE_SIZE / 2 - NO_GRASS_RECT[4]);
        }
      }
  
      const pos = new THREE.Vector3(x, 0, z);
      const uv = [convertRange(pos.x, surfaceMin, surfaceMax, 0, 1), convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)];
  
      const blade = generateBlade(pos, i * VERTEX_COUNT, uv, BLADE_WIDTH, BLADE_HEIGHT, BLADE_HEIGHT_VARIATION);
      blade.verts.forEach(vert => {
        positions.push(...vert.pos);
        uvs.push(...vert.uv);
        colors.push(...vert.color);
      });
      blade.indices.forEach(indice => indices.push(indice));
    }
  
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
  
    return geom;
  }
  
  
  function generateBlade (center, vArrOffset, uv, BLADE_WIDTH, BLADE_HEIGHT, BLADE_HEIGHT_VARIATION) {
    const MID_WIDTH = BLADE_WIDTH * 0.5;
    const TIP_OFFSET = 0.1;
    const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);
  
    const yaw = Math.random() * Math.PI * 2;
    const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const tipBend = Math.random() * Math.PI * 2;
    const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));
  
    // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
    const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1));
    const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1));
    const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
    const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
    const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));
  
    tl.y += height / 2;
    tr.y += height / 2;
    tc.y += height;
  
    // Vertex Colors
    const black = [0, 0, 0];
    const gray = [0.5, 0.5, 0.5];
    const white = [1.0, 1.0, 1.0];
  
    const verts = [
      { pos: bl.toArray(), uv: uv, color: black },
      { pos: br.toArray(), uv: uv, color: black },
      { pos: tr.toArray(), uv: uv, color: gray },
      { pos: tl.toArray(), uv: uv, color: gray },
      { pos: tc.toArray(), uv: uv, color: white }
    ];
  
    const indices = [
      vArrOffset,
      vArrOffset + 1,
      vArrOffset + 2,
      vArrOffset + 2,
      vArrOffset + 4,
      vArrOffset + 3,
      vArrOffset + 3,
      vArrOffset,
      vArrOffset + 2
    ];
  
    return { verts, indices };
  }

  export {generateFieldGeo}