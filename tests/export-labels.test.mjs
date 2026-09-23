import test from "node:test";
import assert from "node:assert/strict";
import { createIslandCamera, applyCameraPose, cameraPose } from "../dist/scene/camera.js";
import { siteTitle } from "../dist/catalogue.js";
import { views, mapLabels } from "../examples/island-profile-spike/views.js";
import { drawMapLabels, drawInfoCard } from "../examples/island-profile-spike/labels.js";
import { escapeHtml } from "../examples/island-profile-spike/output.mjs";

function drawingContext() {
  const text = [];
  return {
    text, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() {}, fill() {}, roundRect() {}, arc() {},
    measureText: value => ({ width: value.length * 7 }),
    fillText: (...args) => text.push(args),
  };
}

test("the orbit keeps every project label in bounds without overlapping", () => {
  const camera = createIslandCamera(); camera.aspect = 600 / 360;
  for (const phase of [0, 0.25, 0.5, 0.75]) {
    applyCameraPose(camera, cameraPose("overview", phase));
    const context = drawingContext();
    const placed = drawMapLabels(context, camera, mapLabels, 600, 360, "overview");
    assert.equal(placed.length, mapLabels.length);
    for (const [index, label] of placed.entries()) {
      assert.ok(label.x >= 0 && label.y >= 0 && label.x + label.width <= 600 && label.y + label.height <= 360);
      for (const other of placed.slice(index + 1)) {
        const overlaps = label.x < other.x + other.width && label.x + label.width > other.x && label.y < other.y + other.height && label.y + label.height > other.y;
        assert.equal(overlaps, false, `${label.text} overlaps ${other.text}`);
      }
    }
  }
});

test("each close-up retains its selected label and renders its full card text", () => {
  const camera = createIslandCamera(); camera.aspect = 600 / 360;
  for (const view of views.slice(1)) {
    applyCameraPose(camera, cameraPose(view.site, 1));
    const placed = drawMapLabels(drawingContext(), camera, mapLabels, 600, 360, view.site);
    assert.ok(placed.some(label => label.site === view.site));
    const context = drawingContext();
    drawInfoCard(context, view, 600, 360);
    assert.equal(context.text[0][0], view.title);
    assert.equal(context.text.slice(1).map(([text]) => text).join(" "), view.description);
    assert.ok(context.text.every(([, x, y]) => x >= 0 && y >= 0 && x < 600 && y < 360));
  }
});

test("labels share website naming and generated markup escapes content", () => {
  assert.equal(siteTitle([{ title: "Long", mapTitle: "Short" }], { name: "Room" }), "Short");
  assert.equal(siteTitle([{ title: "One" }, { title: "Two" }], { name: "Room" }), "Room");
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});
