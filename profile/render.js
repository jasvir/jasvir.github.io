import { createIslandScene } from "../dist/scene/create-island-scene.js";
import { createIslandRenderer } from "../dist/scene/renderer.js";
import { createIslandCamera, cameraPose, applyCameraPose } from "../dist/scene/camera.js";
import { drawMapLabels } from "./labels.js";

export function createProfileRenderer({ canvas, width, height, sceneTime, labels }) {
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  const renderCanvas = document.createElement("canvas");
  const renderer = createIslandRenderer(renderCanvas);
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  const island = createIslandScene({ createCanvas: () => document.createElement("canvas"), maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
  const camera = createIslandCamera(); camera.aspect = width / height; camera.fov = 38; camera.updateProjectionMatrix();
  return {
    render(site, phase) {
      applyCameraPose(camera, cameraPose(site, phase));
      island.update(sceneTime); renderer.render(island.scene, camera);
      context.clearRect(0, 0, width, height); context.drawImage(renderCanvas, 0, 0);
      drawMapLabels(context, camera, labels, width, height, "overview");
      return canvas;
    },
    dispose() { island.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

export async function captureAtlas(view, config, labels) {
  const canvas = document.createElement("canvas");
  const host = createProfileRenderer({ canvas, ...config, labels });
  const atlas = document.createElement("canvas");
  atlas.width = config.columns * config.width;
  atlas.height = Math.ceil(view.frames / config.columns) * config.height;
  const context = atlas.getContext("2d");
  try {
    await document.fonts.ready;
    for (let frame = 0; frame < view.frames; frame++) {
      host.render(view.site, frame / (view.id === "overview" ? view.frames : view.frames - 1));
      context.drawImage(canvas, frame % config.columns * config.width, Math.floor(frame / config.columns) * config.height);
    }
    const url = atlas.toDataURL("image/webp", config.quality);
    if (!url.startsWith("data:image/webp;base64,")) throw new Error("WebP encoding unavailable");
    return url.slice(url.indexOf(",") + 1);
  } finally { host.dispose(); atlas.width = atlas.height = 1; }
}
