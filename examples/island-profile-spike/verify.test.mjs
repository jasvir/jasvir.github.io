import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const svg = await readFile(new URL("./island.svg", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url)));
const readme = await readFile(new URL("./README.md", import.meta.url), "utf8");

test("export provenance matches the unchanged island source", async () => {
  const sources = await Promise.all(manifest.sourceFiles.map(file => readFile(new URL(`../../dist/${file}`, import.meta.url))));
  assert.equal(createHash("sha256").update(Buffer.concat(sources)).digest("hex"), manifest.sourceHash);
  assert.ok(svg.includes(manifest.sourceHash));
});

test("image is self-contained and script-free", () => {
  assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bon\w+=/i);
  const references = [...svg.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]);
  assert.equal(references.filter(ref => ref.startsWith("data:image/webp;base64,")).length, 2);
  assert.ok(references.every(ref => ref.startsWith("#") || ref.startsWith("data:image/webp;base64,")));
});

test("both fragment views and reduced-motion stills are present", () => {
  assert.match(svg, /#library:target~#overview\{display:none\}/);
  assert.match(svg, /@media\(prefers-reduced-motion:reduce\)\{\.orbit,\.approach\{animation:none\}\}/);
  assert.match(svg, /\.approach\{[^}]*transform:translate\(-4200px, -720px\)/);
  assert.ok(svg.indexOf('<g id="library"') < svg.indexOf('<g id="overview"'));
  assert.match(svg, /transform="translate\(0 40\)"/);
});

test("README has exclusive views and points at the generated fragments", () => {
  assert.equal((readme.match(/<details name="island-profile-view"/g) || []).length, 2);
  assert.equal((readme.match(/<details[^>]+\bopen>/g) || []).length, 1);
  for (const view of manifest.views) assert.ok(readme.includes(`island.svg?v=2#${view.id}`));
});

test("manifest reports exact asset sizes and a build-time compression measurement", () => {
  assert.equal(Buffer.byteLength(svg), manifest.svgBytes);
  const atlases = [...svg.matchAll(/<image id="atlas-([^"]+)"[^>]+href="data:image\/webp;base64,([^"]+)"/g)];
  assert.equal(atlases.length, manifest.views.length);
  for (const [, id, base64] of atlases) {
    assert.equal(Buffer.from(base64, "base64").length, manifest.views.find(view => view.id === id).atlasBytes);
  }
  // gzipBytes records the capture machine's measurement, not a portable hash:
  // different zlib versions may compress identical SVG bytes differently.
  assert.ok(Number.isInteger(manifest.gzipBytes) && manifest.gzipBytes > 0 && manifest.gzipBytes < manifest.svgBytes);
  const compressed = gzipSync(svg);
  assert.ok(compressed.length < manifest.svgBytes);
  assert.equal(gunzipSync(compressed).toString("utf8"), svg);
  assert.equal(manifest.views.reduce((sum, view) => sum + view.frames, 0), 128);
});
