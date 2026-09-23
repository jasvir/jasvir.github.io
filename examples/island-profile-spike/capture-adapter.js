// Appended by serve.mjs to the existing dist/script.js during this experiment.
// The website itself is not modified. No second copy of its geometry is kept.
controls.enabled = false;
controls.enableDamping = false;
renderer.setPixelRatio(1);
renderer.setSize(600, 360, false);
camera.aspect = 600 / 360;
camera.fov = 38;
camera.updateProjectionMatrix();

export function renderExportFrame(view, phase) {
  const target = defaultTarget.clone();
  let bearing = phase * Math.PI * 2;
  let radius = 48;
  const elevation = 0.60;
  if (view === "library") {
    const eased = phase * phase * (3 - 2 * phase);
    const site = new THREE.Vector3(...islandLayout.sites.library.position);
    site.y += 0.5;
    target.lerp(site, eased);
    bearing = -0.55 * eased;
    radius = THREE.MathUtils.lerp(48, 12, eased);
  }
  camera.position.set(
    target.x + Math.sin(bearing) * Math.cos(elevation) * radius,
    target.y + Math.sin(elevation) * radius,
    target.z + Math.cos(bearing) * Math.cos(elevation) * radius,
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  // Freeze scene time for this first camera/export proof. Moving transport is
  // a later export feature; all its geometry remains the original live scene.
  waterUniforms.time.value = 7;
  riverUniforms.time.value = 7;
  updateJourneys(7);
  renderer.render(scene, camera);
  return canvas;
}

renderExportFrame("overview", 0);
