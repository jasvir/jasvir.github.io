import * as THREE from "three";

export function setShadows(object, cast = true, receive = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return object;
}

export function addBox(parent, size, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

export function addCylinder(parent, radiusTop, radiusBottom, height, position, material, segments = 20) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

export function addSphere(parent, radius, position, material, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

export function createGableRoof(width, depth, height, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

export function makeIrregularCylinder(radiusTop, radiusBottom, height, segments, material) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const radius = Math.hypot(x, z);
    if (radius < 0.01) continue;
    const angle = Math.atan2(z, x);
    const wobble = 1 + Math.sin(angle * 5) * 0.025 + Math.cos(angle * 9) * 0.018;
    positions.setX(index, x * wobble);
    positions.setZ(index, z * wobble);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}
