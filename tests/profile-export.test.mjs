import test from "node:test";
import assert from "node:assert/strict";
import { entries } from "../dist/content.js";
import { islandLayout } from "../dist/island-layout.js";
import { profileConfig } from "../profile/config.js";
import { profileContent } from "../profile/catalogue.js";
import { profileReadme, profilePreview, validateConfig, validateSvg } from "../profile/package.mjs";
import { svgFor } from "../profile/output.mjs";

test("profile selects overview and four highlights with About Me last", () => {
  const content = profileContent();
  assert.deepEqual(content.views.map(view => view.id), ["overview", "two-dozen", "secretseal", "trapdoor", "homepage"]);
  assert.equal(content.introduction.description, entries.homepage.lede);
  for (const view of content.views.slice(1)) {
    assert.equal(view.site, entries[view.id].site);
    assert.equal(view.description, entries[view.id].summary || entries[view.id].lede);
    assert.deepEqual(view.links, entries[view.id].links);
  }
  assert.deepEqual(content.labels.find(label => label.site === "library").point, islandLayout.sites.library.label);
});

test("catalogue edits flow into cards while README uses full-island links only", () => {
  const updated = structuredClone(entries);
  updated.secretseal.summary = 'New <note> & "ideas"';
  updated.secretseal.links = [{ label: "New guide", url: "https://example.com/new?a=1&b=2" }];
  const content = profileContent(profileConfig, updated);
  const readme = profileReadme(profileConfig, content);
  assert.doesNotMatch(readme, /New &lt;note&gt;|example.com/);
  assert.match(readme, /https:\/\/jasvir.github.io\/#project-secretseal/);
  const view = content.views.find(view => view.id === "secretseal");
  const svg = svgFor(view, Buffer.from("fixture"), { ...profileConfig, views: content.views }, 2);
  assert.match(svg, /New &lt;note&gt; &amp; &quot;ideas&quot;/);
  validateSvg(svg);
});

test("invalid, duplicate and unpublished highlights fail before rendering", () => {
  assert.throws(() => profileContent({ ...profileConfig, highlights: ["missing"] }), /Unknown or unpublished/);
  assert.throws(() => profileContent({ ...profileConfig, highlights: ["secretseal", "secretseal"] }), /distinct/);
  const content = structuredClone(entries); content.secretseal.published = false;
  assert.throws(() => profileContent(profileConfig, content), /Unknown or unpublished/);
  assert.throws(() => profileContent({ ...profileConfig, highlights: [] }), /distinct/);
});

test("README has full-width maps and only an Expand link in each configured section", () => {
  const content = profileContent();
  const readme = profileReadme(profileConfig, content);
  assert.equal((readme.match(/<details /g) || []).length, 5);
  assert.equal((readme.match(/ open>/g) || []).length, 1);
  assert.equal(readme.replace(/<!--[^]*?-->|<details\b[^]*?<\/details>/g, "").trim(), "");
  assert.equal((readme.match(/<p align="left"><img/g) || []).length, 5);
  assert.doesNotMatch(readme, /align="right"/);
  assert.match(readme, /src="\.\/island-homepage.svg"/);
  assert.equal((readme.match(/width="100%"/g) || []).length, 5);
  assert.equal((readme.match(/>Expand\.\.\.<\/a>/g) || []).length, 5);
  for (const view of content.views) {
    const section = readme.split(`<summary>${view.title}</summary>`)[1].split("</details>")[0];
    assert.match(section, new RegExp(`<a href="${view.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">Expand\\.\\.\\.</a>`));
    assert.equal((section.match(/<p>/g) || []).length, 1);
  }
  const preview = profilePreview(profileConfig, content);
  assert.equal((preview.match(/>Expand\.\.\.<\/a>/g) || []).length, 5);
  assert.ok(!preview.includes(content.introduction.description));
  assert.ok(readme.indexOf("<summary>About Me") > readme.indexOf("<summary>Trapdoor VMs"));
});

test("production SVGs have no alignment spacer at any destination", () => {
  const content = profileContent();
  assert.equal(profileConfig.compensationPixels, 0);
  content.views.forEach((view, index) => {
    const svg = svgFor(view, Buffer.from("fixture"), { ...profileConfig, views: content.views }, index);
    assert.match(svg, /viewBox="0 0 600 360"/);
    assert.ok(svg.includes(`id="${view.id}" transform="translate(0 0)"`));
  });
});

test("export configuration and embedded-resource checks reject unsafe or oversized input", () => {
  validateConfig(profileConfig);
  for (const change of [{ width: 0 }, { highlightFrames: 1 }, { columns: 50 }, { quality: 2 }, { sceneTime: -1 }, { maxTotalBytes: 0 }, { siteUrl: "javascript:alert(1)" }]) {
    assert.throws(() => validateConfig({ ...profileConfig, ...change }));
  }
  assert.throws(() => validateSvg('<svg><script>bad</script></svg>'), /interactive/);
  assert.throws(() => validateSvg('<svg><image href="https://example.com/remote"/></svg>'), /self-contained/);
});
