import * as THREE from "three";
import { cameraPose } from "./camera-presets.js";
export { cameraPose } from "./camera-presets.js";

export function applyCameraPose(camera, pose) {
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.lookAt(...pose.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

export function createIslandCamera() {
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  applyCameraPose(camera, cameraPose());
  return camera;
}
