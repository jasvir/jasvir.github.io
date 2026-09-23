import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createIslandScene } from "../dist/scene/create-island-scene.js";
import { cameraPose } from "../dist/scene/camera-presets.js";
import { islandLayout } from "../dist/island-layout.js";

// Geometry/motion tests need canvas drawing commands, not pixel rasterization.
// The real 2D canvas textures and WebGL output are also checked in the browser.
function createCanvas() {
  const context = Object.fromEntries(["arc", "beginPath", "ellipse", "fill", "fillRect", "lineTo", "moveTo", "stroke"].map(key => [key, () => {}]));
  return { width: 0, height: 0, getContext: () => context };
}

function snapshot(island) {
  const result = [];
  island.scene.traverse(object => {
    result.push({
      type: object.type,
      position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(),
      vertices: object.geometry?.attributes.position.count,
      instanceCount: object.count,
      time: object.material?.uniforms?.time?.value,
    });
  });
  return result;
}

test("scene construction needs no page DOM and uses the saved building plots", () => {
  const before = JSON.stringify(islandLayout);
  const island = createIslandScene({ createCanvas });
  try {
    const buildingSites = Object.entries(islandLayout.sites).filter(([, site]) => site.model !== "sign");
    assert.deepEqual(Object.keys(island.projectObjects), buildingSites.map(([key]) => key));
    for (const [key, site] of buildingSites) assert.deepEqual(island.projectObjects[key].position.toArray(), site.position);
    assert.ok(island.projectMeshes.length > 100);
    assert.equal(JSON.stringify(islandLayout), before);
  } finally { island.dispose(); }
});

test("absolute-time animation is repeatable, seekable, and independent of frame order", () => {
  const island = createIslandScene({ createCanvas });
  try {
    const initial = snapshot(island);
    island.update(7);
    const frame7 = snapshot(island);
    assert.notDeepEqual(frame7, initial);
    island.update(104.5); island.update(7);
    assert.deepEqual(snapshot(island), frame7);
    island.update(7);
    assert.deepEqual(snapshot(island), frame7);
    island.update(0);
    assert.deepEqual(snapshot(island), initial);
    for (const time of [14, 34, 89.999, 90, 104, 10000]) {
      island.update(time);
      for (const object of snapshot(island)) assert.ok([...object.position, ...object.rotation.slice(0, 3)].every(Number.isFinite));
    }
    const unchanged = snapshot(island);
    for (const invalid of [-1, NaN, Infinity]) assert.throws(() => island.update(invalid), RangeError);
    assert.deepEqual(snapshot(island), unchanged);
  } finally { island.dispose(); }
});

test("two consumers own independent scenes and disposal is idempotent", () => {
  const first = createIslandScene({ createCanvas });
  const second = createIslandScene({ createCanvas });
  const resources = new Set();
  first.scene.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of [].concat(object.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  const disposed = new Map([...resources].map(resource => [resource, 0]));
  resources.forEach(resource => resource.addEventListener("dispose", () => disposed.set(resource, disposed.get(resource) + 1)));
  try {
    first.update(19); second.update(19);
    assert.deepEqual(snapshot(first), snapshot(second));
    const before = snapshot(second);
    first.update(40);
    assert.deepEqual(snapshot(second), before);
    first.dispose(); first.dispose();
    assert.equal(first.scene.children.length, 0);
    for (const count of disposed.values()) assert.equal(count, 1);
    assert.deepEqual(snapshot(second), before);
  } finally { first.dispose(); second.dispose(); }
});

test("default camera and export presets share the saved layout", () => {
  assert.deepEqual(cameraPose().position, islandLayout.camera.position);
  assert.deepEqual(cameraPose().target, islandLayout.camera.target);
  assert.deepEqual(cameraPose("library", 0), cameraPose("overview", 0));
  const end = cameraPose("library", 1);
  [-3.4, 1.5, 0.2].forEach((value, i) => assert.ok(Math.abs(end.target[i] - value) < 1e-10));
  assert.ok(Math.abs(Math.hypot(...end.position.map((v, i) => v - end.target[i])) - 12) < 1e-10);
  const moved = structuredClone(islandLayout);
  moved.sites.library.position[0] += 5;
  assert.ok(Math.abs(cameraPose("library", 1, moved).target[0] - end.target[0] - 5) < 1e-10);
  const start = cameraPose("overview", 0), loop = cameraPose("overview", 1);
  start.position.forEach((value, i) => assert.ok(Math.abs(value - loop.position[i]) < 1e-10));
  for (const phase of [-1, 2, NaN]) assert.throws(() => cameraPose("overview", phase), RangeError);
  assert.throws(() => cameraPose("missing"), /Unknown camera site/);
});

test("both hosts import the shared scene without rewriting browser source", async () => {
  const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const browser = await read("dist/script.js");
  const capture = await read("examples/island-profile-spike/capture-adapter.js");
  const server = await read("examples/island-profile-spike/serve.mjs");
  for (const host of [browser, capture]) assert.match(host, /import \{ createIslandScene \} from/);
  assert.doesNotMatch(server, /replaceOnce|sceneSource|animate\(\)/);
  for (const module of ["animation", "camera", "camera-presets", "create-island-scene", "materials", "models", "primitives"]) {
    assert.doesNotMatch(await read(`dist/scene/${module}.js`), /document\.|window\.|requestAnimationFrame|addEventListener|querySelector/);
  }
  const pkg = JSON.parse(await read("package.json"));
  assert.ok((await read("dist/index.html")).includes(`three@${pkg.devDependencies.three}/`));
});
