import { createProfileRenderer } from "../../profile/render.js";
import { mapLabels, views } from "./views.js";
const host = createProfileRenderer({ canvas: document.querySelector("#island-canvas"), width: 600, height: 360, sceneTime: 7, labels: mapLabels });

export function renderExportFrame(view, phase) {
  const selected = views.find(item => item.id === view);
  if (!selected) throw new Error(`Unknown export view: ${view}`);
  return host.render(selected.site, phase);
}

renderExportFrame("overview", 0);
