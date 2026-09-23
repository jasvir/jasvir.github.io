# Shared island scene

The interactive website and profile capture tool now use the same scene factory.
The layout, coastlines and content remain in their existing files. No separate
low-detail geometry or second set of building coordinates has been introduced.

## Module responsibilities

- `dist/scene/create-island-scene.js`: terrain, water, routes, lighting and scene
  assembly; returns a fresh scene and its animation/disposal methods.
- `dist/scene/models.js` and `primitives.js`: building/train models and geometry helpers.
- `dist/scene/materials.js` and `palette.js`: materials and seeded canvas textures.
- `dist/scene/animation.js`: deterministic animation of the train and wheels,
  river/ocean time, people, crane, aircraft and boat.
- `dist/scene/camera-presets.js`: pure camera poses for the default website view,
  the orbit, and named site approaches derived from `island-layout.js`.
- `dist/scene/camera.js` and `renderer.js`: the shared Three.js camera and renderer setup.
- `dist/script.js`: page controls, raycast selection, projected labels,
  reduced-motion preference, pause state and the interactive render loop.
- `examples/island-profile-spike/capture-adapter.js`: fixed-size capture host.
  It imports the scene directly. The server no longer edits the browser script
  or creates fake page controls for it.

## Scene API

```js
const island = createIslandScene({
  createCanvas: () => document.createElement("canvas"),
  maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
  // layout: optional alternative saved layout; defaults to islandLayout
});

island.update(7); // Absolute elapsed scene time, in seconds.
applyCameraPose(camera, cameraPose("library", 1));
renderer.render(island.scene, camera);
island.dispose();
```

The scene builder creates no camera, renderer, event handlers or animation loop.
The host owns those. `createCanvas` is injected, so geometry/motion tests run
without page DOM or WebGL. Real canvas textures are exercised in browser checks.

The returned `world`, `projectObjects` and `projectMeshes` let the interactive
host retain its existing picking and hover behavior. Each instance owns its
geometry, materials, textures and lights; `dispose()` releases them once and
clears the scene. The host must separately dispose its renderer and any controls
when replacing them. Do not render or update a scene after disposing it.

## Deterministic time

`update(t)` accepts finite, nonnegative seconds. Rendering 7, then 104, then 7
again produces the same object transforms for time 7. It does not accumulate
frame deltas or modify the saved layout. Each walker's starting phase and each
wheel's starting rotation are retained as immutable baselines.

The website still advances a clamped elapsed clock only while motion is enabled;
pause and reduced-motion therefore keep the last visible frame. Scene creation
initializes time 0, including the people on their walking paths. Previously,
people were placed at the path centers until the first unpaused frame; this
initialization difference is deliberate so still captures have defined positions.

The existing capture fixture freezes **all** motion at time 7. Unlike the first
prototype, its train and walkers use that same time as the water and journeys.
Frame count, image resolution, and the two camera sequences remain unchanged.
Adding three highlights or optimizing download size is step 4.

## Camera poses

`cameraPose("default")` preserves the website's saved north-up view.
`cameraPose("overview", phase)` completes an orbit for phase 0…1.
`cameraPose(siteKey, phase)` approaches the named site's current position, with
phase 1 giving the close-up. A moved building therefore moves its destination.
Unknown site keys and phases outside 0…1 throw useful errors.

`applyCameraPose(camera, pose)` sets position, target direction and field of view.
The host sets the camera aspect ratio and renderer dimensions. Browser controls
remain free to rotate/zoom afterward; the capture host renders specific poses.

## Verification and provenance

Run `npm ci --ignore-scripts` then `npm test`. The Three.js test dependency is
pinned to the same version as the website's import map; the website still runs
as static files with no runtime package install or bundler.

The scene tests cover independent instances, deterministic forward/backward
seeking, finite transforms at journey boundaries, disposal, camera/layout
coupling, and the absence of browser-control dependencies in shared modules.

The extraction was checked against the prior source: the primitive/model
function bodies, material/texture construction, and browser interaction handlers
are unchanged apart from module boundaries, indentation and dependency injection.
The full-site browser smoke test covered rendering, drag, zoom, pause, writing
previews and popups. A new 128-frame SVG fixture was generated using the shared
API, and its manifest fingerprints all shared rendering modules plus layout and
coastlines. This is visual/manual verification, not a pixel-exact screenshot test.

To regenerate after intentionally changing the scene, run `npm run capture`, open
the local address and choose **Capture both views**. Review the preview and
commit the SVG and manifest together. A stale fixture fails its provenance test.

This refactor is stacked on the source-migration branch. It does not enable
Pages deployment or modify the personal profile repo.
