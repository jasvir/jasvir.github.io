import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { entries } from "../dist/content.js";
import { islandLayout } from "../dist/island-layout.js";
import { coastlines } from "../dist/coastlines.js";
import { createCatalogue } from "../dist/catalogue.js";
import { writingPosts } from "../dist/writing-posts.js";
import { parseWritingFeed, pinnedStoryUrls, refreshedSnapshot } from "../scripts/refresh-writing-posts.mjs";

const note = {
  site: "writing", kind: "article", title: "A new note", summary: "A small idea.",
  links: [{ label: "Read the article", url: "https://example.com/note" }],
};

test("the existing projects and destinations all resolve to saved buildings", () => {
  const catalogue = createCatalogue(entries, islandLayout.sites);
  const published = Object.entries(entries).filter(([, entry]) => entry.published !== false);
  assert.equal(catalogue.items.length, published.length);
  assert.deepEqual(catalogue.directory.map((item) => item.id),
    published.filter(([, entry]) => entry.directory !== false).map(([id]) => id));
  assert.equal(catalogue.bySite.size, Object.keys(islandLayout.sites).length);
  for (const item of catalogue.items) assert.ok(catalogue.bySite.get(item.site).includes(item));
});

test("all four repositories in the Featured list have project stops", () => {
  const projects = createCatalogue(entries, islandLayout.sites).directory
    .filter((item) => item.kind === "project");
  assert.deepEqual(projects.map((item) => item.id), ["secretseal", "trapdoor", "caja", "plush"]);
  assert.deepEqual(projects.map((item) => item.links[0].url), [
    "https://github.com/jasvir/secretseal",
    "https://github.com/jasvir/Trapdoor-Virtual-Machines",
    "https://github.com/jasvir/google-caja",
    "https://github.com/jasvir/plush",
  ]);
});

test("adding an article shares a building and leaves all geography untouched", () => {
  const before = JSON.stringify({ islandLayout, coastlines, entries });
  const baseline = createCatalogue(entries, islandLayout.sites);
  const catalogue = createCatalogue({ ...entries, "authoring-test-note": note }, islandLayout.sites);
  assert.equal(catalogue.directory.length, baseline.directory.length + 1);
  assert.equal(catalogue.bySite.size, baseline.bySite.size);
  assert.deepEqual(catalogue.bySite.get("writing").map((entry) => entry.id),
    [...baseline.bySite.get("writing").map((entry) => entry.id), "authoring-test-note"]);
  assert.equal(catalogue.byId.get("authoring-test-note").links.length, 1);
  assert.equal(JSON.stringify({ islandLayout, coastlines, entries }), before);
});

test("blog posts and simple links need no project-specific fields", () => {
  for (const kind of ["blog", "link", "article"]) {
    const catalogue = createCatalogue({ note: { ...note, kind } }, islandLayout.sites);
    assert.equal(catalogue.directory.length, 1);
    assert.equal(catalogue.items[0].github, undefined);
    assert.equal(catalogue.items[0].question, undefined);
  }
});

test("About Me can open as a self-contained stop", () => {
  const catalogue = createCatalogue(entries, islandLayout.sites);
  const about = catalogue.byId.get("homepage");
  assert.equal(about.kind, "about");
  assert.equal(about.title, "About Me");
  assert.deepEqual(about.links, []);
  assert.equal(about.directory, false);
});

test("drafts are hidden everywhere, while directory visibility is independent", () => {
  const catalogue = createCatalogue({
    draft: { ...note, published: false },
    tucked: { ...note, directory: false },
  }, islandLayout.sites);
  assert.equal(catalogue.byId.has("draft"), false);
  assert.equal(catalogue.bySite.get("writing").length, 1);
  assert.equal(catalogue.directory.length, 0);
});

test("authoring mistakes fail with a useful entry-specific error", () => {
  for (const change of [
    { site: "missing" }, { title: "" }, { kind: "typo" },
    { summary: "" }, { links: [] },
    { links: [{ label: "Bad", url: "javascript:alert(1)" }] },
    { links: [{ label: "Bad", url: "not-a-url" }] },
  ]) {
    assert.throws(() => createCatalogue({ note: { ...note, ...change } }, islandLayout.sites), /Content “note”/);
  }
  assert.throws(() => createCatalogue({ "Bad ID": note }, islandLayout.sites), /URL-safe/);
});

test("the default view is north-up with About Me on the southern island", () => {
  const { position, target } = islandLayout.camera;
  assert.equal(position[0], target[0], "look due north, without an east/west viewing angle");
  assert.ok(position[1] > target[1], "keep the elevated 3D view");
  assert.ok(position[2] > target[2], "view from the south (+z)");
  const home = islandLayout.sites.home.position;
  assert.ok(home[2] > islandLayout.sites.writing.position[2]);
  assert.ok(home[2] > islandLayout.sites.video.position[2]);
});

test("the saved railway is a closed, connected route", () => {
  islandLayout.railway.forEach((segment, index, segments) => {
    assert.ok([2, 4].includes(segment.length));
    assert.deepEqual(segment.at(-1), segments[(index + 1) % segments.length][0]);
  });
  for (const site of Object.values(islandLayout.sites)) {
    assert.ok(["library", "observatory", "factory", "cottages", "station", "sign"].includes(site.model));
    for (const point of [site.position, site.label]) {
      assert.equal(point.length, 3);
      assert.ok(point.every(Number.isFinite));
    }
  }
});

test("writing previews separate the two series and keep three recent links each", () => {
  for (const category of ["regular", "twoDozen"]) {
    assert.equal(writingPosts[category].length, 3);
    assert.equal(new Set(writingPosts[category].map((post) => post.url)).size, 3);
    assert.ok(writingPosts[category].every((post) => post.url.startsWith("https://www.recursiverhymes.com/p/")));
    assert.ok(writingPosts[category].every((post) => !pinnedStoryUrls.has(post.url)));
  }
  const item = (title, path, description, date) => `<item><title><![CDATA[${title}]]></title><link>https://www.recursiverhymes.com/p/${path}</link><description><![CDATA[${description}]]></description><pubDate>${date}</pubDate></item>`;
  const xml = `<rss><channel>${item("New regular post", "new-regular", "An essay", "Thu, 24 Sep 2026 01:00:00 GMT")}${item("New poem", "new-poem", "Two Dozen Poems · Entry 15 of 24", "Thu, 24 Sep 2026 02:00:00 GMT")}</channel></rss>`;
  const parsed = parseWritingFeed(xml);
  assert.deepEqual(parsed.regular.map((post) => post.title), ["New regular post"]);
  assert.deepEqual(parsed.twoDozen.map((post) => post.title), ["New poem"]);
  const refreshed = refreshedSnapshot(xml, writingPosts, "2026-09-24T03:00:00.000Z");
  assert.equal(refreshed.regular[0].title, "New regular post");
  assert.equal(refreshed.twoDozen[0].title, "New poem");
  assert.equal(refreshed.regular.length, 3);
  assert.equal(refreshed.twoDozen.length, 3);
  assert.ok(refreshed.regular.every((post) => !pinnedStoryUrls.has(post.url)));
  assert.ok(refreshed.twoDozen.every((post) => !pinnedStoryUrls.has(post.url)));
});

test("the map has four icon controls, social badges, and no instruction footer", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const controls = html.match(/<nav class="island-controls"[\s\S]*?<\/nav>/)[0];
  assert.equal((controls.match(/<(?:button|a)\s/g) || []).length, 4);
  assert.ok(!html.includes("Drag the archipelago"));
  assert.ok(!html.includes('id="reset-view"'));
  const stage = html.slice(html.indexOf('<figure class="island-stage"'), html.indexOf("</figure>"));
  assert.ok(stage.includes('class="social-badges"'));
  assert.ok(stage.includes('class="island-controls"'));
});
