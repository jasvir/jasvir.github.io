import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { views, mapLabels } from "./views.js";
import { readmeFor, previewFor, offsetFor } from "./output.mjs";

const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url)));
const readme = await readFile(new URL("./README.md", import.meta.url), "utf8");
const assets = await Promise.all(manifest.views.map(async view => ({...view, svg: await readFile(new URL(view.file, import.meta.url), "utf8")})));

test("export provenance matches shared scene, content and label renderer", async () => {
  const sources = await Promise.all(manifest.sourceFiles.map(file => readFile(new URL(`../../dist/${file}`, import.meta.url))));
  assert.equal(createHash("sha256").update(Buffer.concat(sources)).digest("hex"), manifest.sourceHash);
  for(const asset of assets) assert.ok(asset.svg.includes(manifest.sourceHash));
  assert.equal(manifest.labelled, true);
  assert.equal(manifest.popupAfterApproach, true);
  assert.equal(manifest.commonOverviewReturn, true);
  assert.equal(manifest.vectorCards, true);
});

test("each destination is a self-contained script-free image", () => {
  assert.equal(assets.length,5);
  for(const {svg} of assets) {
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bon\w+=/i);
    const references=[...svg.matchAll(/\bhref="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(references.length,1);
    assert.ok(references[0].startsWith("data:image/webp;base64,"));
    assert.match(svg, /@media\(prefers-reduced-motion:reduce\)\{\.motion\{animation:none\}\}/);
  }
});

test("overview loops, approaches hold the final popup, and readme offsets match order", () => {
  const config={views,compensationPixels:40};
  assets.forEach((asset,index)=>{
    assert.ok(asset.svg.includes(`translate(0 ${offsetFor(index,config)})`));
    if(asset.id==="overview") assert.match(asset.svg,/20s steps\(1,end\) infinite/);
    else {
      assert.match(asset.svg,/4\.8s steps\(1,end\) 1 forwards/);
      assert.match(asset.svg,/100\.00000%\{transform:translate\(0px, 0px\)\}/);
      assert.match(asset.svg,/<g class="popup"/);
      assert.match(asset.svg,/<text /);
    }
  });
});

test("generated navigation and descriptions follow the shared catalogue", async () => {
  assert.deepEqual(views.map(view=>view.id),["overview","two-dozen","homepage","secretseal","trapdoor"]);
  assert.deepEqual(mapLabels.map(label=>label.text),["SecretSeal","Trapdoor VMs","Caja","Plush","About Me","Recursive Rhymes","Two Dozen","YouTube"]);
  const config={views,width:600,height:360,compensationPixels:40};
  assert.equal(readme,readmeFor(config));
  assert.equal(await readFile(new URL("./preview.html",import.meta.url),"utf8"),previewFor(config));
  assert.equal((readme.match(/<details name="island-profile-view"/g)||[]).length,5);
  assert.equal((readme.match(/<details[^>]+\bopen>/g)||[]).length,1);
  for(const view of assets) assert.ok(readme.includes(`./${view.file}#${view.id}`));
});

test("manifest reports exact asset sizes and valid compression measurements", () => {
  for(const asset of assets) {
    assert.equal(Buffer.byteLength(asset.svg),asset.svgBytes);
    const base64=asset.svg.match(/data:image\/webp;base64,([^"]+)/)[1];
    assert.equal(Buffer.from(base64,"base64").length,asset.atlasBytes);
    assert.ok(asset.gzipBytes>0&&asset.gzipBytes<asset.svgBytes);
    assert.equal(gunzipSync(gzipSync(asset.svg)).toString("utf8"),asset.svg);
  }
  assert.equal(assets.reduce((sum,view)=>sum+view.svgBytes,0),manifest.svgBytes);
  assert.equal(assets.reduce((sum,view)=>sum+view.frames,0),224);
});
