import test from "node:test";
import assert from "node:assert/strict";
import { createIslandCamera, applyCameraPose, cameraPose } from "../dist/scene/camera.js";
import { siteTitle } from "../dist/catalogue.js";
import { views, mapLabels } from "../examples/island-profile-spike/views.js";
import { drawMapLabels } from "../examples/island-profile-spike/labels.js";
import { cardLayout, cardMarkup } from "../examples/island-profile-spike/card.js";
import { journeyPhase, approachEnd, returnStart, loopJourneyProgress, cycleSeconds, journeySeconds, cardHoldSeconds } from "../examples/island-profile-spike/journey.js";
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
    const card = cardLayout(view);
    assert.equal(card.lines.join(" "), view.description);
    assert.ok(card.x >= 0 && card.y >= 0 && card.x + card.width <= 600 && card.y + card.height <= 360);
    assert.ok(cardMarkup(view).includes(escapeHtml(view.title)));
  }
});

test("each journey approaches, holds for the card, and returns to the identical overview", () => {
  assert.equal(journeyPhase(0), 0);
  assert.equal(journeyPhase(approachEnd), 1);
  assert.equal(journeyPhase(returnStart), 1);
  assert.equal(journeyPhase(1), 0);
  assert.equal(journeyPhase(-1), 0);
  assert.equal(journeyPhase(2), 0);
  const overview = cameraPose("overview", 0);
  for (const view of views.slice(1)) {
    assert.deepEqual(cameraPose(view.site, journeyPhase(0)), overview);
    assert.deepEqual(cameraPose(view.site, journeyPhase(1)), overview);
    assert.ok(journeyPhase(.2) > journeyPhase(.1));
    assert.ok(journeyPhase(.9) < journeyPhase(.8));
  }
});

test("labels share website naming and generated markup escapes content", () => {
  assert.equal(siteTitle([{ title: "Long", mapTitle: "Short" }], { name: "Room" }), "Short");
  assert.equal(siteTitle([{ title: "One" }, { title: "Two" }], { name: "Room" }), "Room");
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});

test("journeys hold for fifteen seconds and replay instead of remaining finished", () => {
  assert.equal(cardHoldSeconds, 15);
  assert.equal(loopJourneyProgress(-1), 0);
  for (const time of [journeySeconds, journeySeconds + 7, journeySeconds + cardHoldSeconds]) {
    assert.equal(loopJourneyProgress(time), 1);
  }
  assert.equal(loopJourneyProgress(cycleSeconds), 0);
  assert.ok(Math.abs(loopJourneyProgress(cycleSeconds + 1.6) - approachEnd) < 1e-10);
});
