import { createIslandScene } from "../../dist/scene/create-island-scene.js";
import { createIslandRenderer } from "../../dist/scene/renderer.js";
import { createIslandCamera, cameraPose, applyCameraPose } from "../../dist/scene/camera.js";
import { mapLabels, views } from "./views.js";
import { drawMapLabels } from "./labels.js";

const canvas = document.querySelector("#island-canvas");
canvas.width = 600;
canvas.height = 360;
const context = canvas.getContext("2d");
const renderCanvas = document.createElement("canvas");
const renderer = createIslandRenderer(renderCanvas);
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
  const selected = views.find(item => item.id === view);
  if (!selected) throw new Error(`Unknown export view: ${view}`);
  const { site } = selected;
  applyCameraPose(camera, cameraPose(site, phase));
  // Camera-only fixture: freeze every animated object at the same scene time.
  island.update(7);
  renderer.render(island.scene, camera);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(renderCanvas, 0, 0);
  // Identical overview frames at the start and end of every destination.
  drawMapLabels(context, camera, mapLabels, canvas.width, canvas.height, "overview");
  return canvas;
}

renderExportFrame("overview", 0);
