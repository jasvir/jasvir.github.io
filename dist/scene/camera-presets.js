import { islandLayout } from "../island-layout.js";

// Camera destinations use saved site keys, never a second set of coordinates.
export function cameraPose(view = "default", phase = 0, layout = islandLayout) {
  if (!Number.isFinite(phase) || phase < 0 || phase > 1) throw new RangeError("Camera phase must be between 0 and 1");
  if (view === "default") return { position: [...layout.camera.position], target: [...layout.camera.target], fov: 38 };
  const target = [...layout.camera.target];
  let bearing = phase * Math.PI * 2;
  let radius = 48;
  const elevation = 0.60;
  if (view !== "overview") {
    const site = layout.sites[view];
    if (!site) throw new Error(`Unknown camera site: ${view}`);
    const eased = phase * phase * (3 - 2 * phase);
    const destination = [...site.position];
    destination[1] += 0.5;
    for (let axis = 0; axis < 3; axis++) target[axis] += (destination[axis] - target[axis]) * eased;
    bearing = -0.55 * eased;
    radius = 48 + (12 - 48) * eased;
  }
  return {
    target, fov: 38,
    position: [
      target[0] + Math.sin(bearing) * Math.cos(elevation) * radius,
      target[1] + Math.sin(elevation) * radius,
      target[2] + Math.cos(bearing) * Math.cos(elevation) * radius,
    ],
  };
}
