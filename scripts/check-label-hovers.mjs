// Browser regression check for the real island page, using only local assets.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "dist");
const output = resolve(root, "build/label-check");
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    const file = resolve(dist, `.${path === "/" ? "/index.html" : path}`);
    if (!file.startsWith(dist + "/")) { response.writeHead(404).end(); return; }
    response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css" })[extname(file)] || "application/octet-stream");
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    const prefix = "/npm/three@0.167.1/";
    if (url.origin === origin) return route.continue();
    if (url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith(prefix)) {
      const file = resolve(root, "node_modules/three", url.pathname.slice(prefix.length));
      return route.fulfill({ body: await readFile(file), contentType: "text/javascript" });
    }
    return route.abort();
  });
  await page.goto(origin);
  await page.locator("#scene-loader").waitFor({ state: "hidden" });
  await page.locator("#motion-toggle").click();
  const signs = page.locator(".building-sign");
  assert.equal(await signs.count(), 8);
  for (let i = 0; i < await signs.count(); i++) {
    await page.mouse.move(10, 10);
    await page.evaluate(() => document.activeElement?.blur());
    const sign = signs.nth(i);
    const id = await sign.getAttribute("id");
    const description = sign.locator(".sign-description");
    assert.equal(await description.count(), 1, id);
    assert.equal(await description.isVisible(), false, `${id}: description leaks into compact label`);
    const compact = await sign.boundingBox();
    await sign.hover();
    assert.equal(await description.isVisible(), true, `${id}: hover description missing`);
    assert.ok((await description.textContent()).trim(), id);
    const expanded = await sign.boundingBox();
    assert.ok(expanded.height > compact.height, `${id}: label did not expand`);
    for (const selector of [".sign-copy", ".sign-description"]) {
      assert.equal(await sign.locator(selector).evaluate(el => getComputedStyle(el).textAlign), "left", id);
    }
    const preview = sign.locator(".post-preview");
    if (await preview.count()) {
      assert.equal(await preview.isVisible(), true, id);
      assert.equal(await preview.locator("li").count(), 3, id);
      assert.equal(await preview.evaluate(el => getComputedStyle(el).textAlign), "left", id);
      const card = await sign.locator(".sign-copy").boundingBox();
      const dropdown = await preview.boundingBox();
      assert.ok(Math.abs(card.x - dropdown.x) < 1, `${id}: dropdown left edge differs from card`);
      await preview.locator("a").first().hover();
      assert.equal(await preview.isVisible(), true, `${id}: dropdown disappears when entering links`);
    }
    if (["sign-two-dozen", "sign-homepage"].includes(id)) await page.screenshot({ path: `${output}/${id}.png` });
    await page.mouse.move(10, 10);
    const trigger = await sign.getAttribute("type") === "button" ? sign : sign.locator(".sign-trigger");
    await trigger.focus();
    assert.equal(await description.isVisible(), true, `${id}: keyboard description missing`);
    if (await preview.count()) assert.equal(await preview.isVisible(), true, `${id}: keyboard post list missing`);
  }
  assert.deepEqual(errors, []);
  console.log("Passed: all 8 labels expand on hover and focus, with left-aligned descriptions and both three-post dropdowns.");
} finally {
  await browser?.close();
  await new Promise(ok => server.close(ok));
}
