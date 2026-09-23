import { createIslandScene } from "../../dist/scene/create-island-scene.js";
import { createIslandRenderer } from "../../dist/scene/renderer.js";
import { createIslandCamera, cameraPose, applyCameraPose } from "../../dist/scene/camera.js";

const canvas = document.querySelector("#island-canvas");
const renderer = createIslandRenderer(canvas);
const island = createIslandScene({
  createCanvas: () => document.createElement("canvas"),
  maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
});
const camera = createIslandCamera();
renderer.setPixelRatio(1);
renderer.setSize(600, 360, false);
camera.aspect = 600 / 360;
camera.fov = 38;
camera.updateProjectionMatrix();

export function renderExportFrame(view, phase) {
  applyCameraPose(camera, cameraPose(view, phase));
  // Camera-only fixture: freeze every animated object at the same scene time.
  island.update(7);
  renderer.render(island.scene, camera);
  return canvas;
}

renderExportFrame("overview", 0);
