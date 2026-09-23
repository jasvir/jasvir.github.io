import { createServer } from "node:http";
import { readFile, writeFile, readdir, mkdir, mkdtemp, rename, rm, lstat } from "node:fs/promises";
import { resolve, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { profileConfig } from "../profile/config.js";
import { profileContent } from "../profile/catalogue.js";
import { svgFor, assetName } from "../profile/output.mjs";
import { profileReadme, profilePreview, validateSvg, validateConfig } from "../profile/package.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "build/profile");
const owner = "jasvir-island-profile-v1";
const hash = data => createHash("sha256").update(data).digest("hex");
async function sources() {
  const files = ["dist/content.js", "dist/catalogue.js", "dist/island-layout.js", "dist/coastlines.js", "package-lock.json", "scripts/export-profile.mjs"];
  for (const directory of ["dist/scene", "profile"]) {
    for (const file of await readdir(resolve(root, directory))) if (/\.(?:js|mjs|html)$/.test(file)) files.push(`${directory}/${file}`);
  }
  const hashes = Object.fromEntries(await Promise.all(files.sort().map(async file => [file, hash(await readFile(resolve(root, file)))])));
  return { sourceHash: hash(JSON.stringify(hashes)), sources: hashes };
}

// Only exporter-owned directories may be replaced; never a README/repository root.
async function assertOwned() {
  try {
    if ((await lstat(output)).isSymbolicLink()) throw new Error("Refusing a symlink output directory");
  } catch (error) { if (error.code === "ENOENT") return false; throw error; }
  const manifest = JSON.parse(await readFile(resolve(output, "manifest.json")));
  if (manifest.exporter !== owner) throw new Error("Refusing to replace an unowned build/profile directory");
  return true;
}

async function verify(directory = output) {
  const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json")));
  if (manifest.exporter !== owner || manifest.sourceHash !== (await sources()).sourceHash) throw new Error("Profile export is stale; run npm run build:profile");
  const content = profileContent();
  if (JSON.stringify(manifest.views.map(view => view.id)) !== JSON.stringify(content.views.map(view => view.id))) throw new Error("Exported highlights do not match configuration");
  const expectedFiles = [...content.views.map(assetName), "README.md", "preview.html", "content.json"].sort();
  if (JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify(expectedFiles)) throw new Error("Unexpected export file list");
  let total = 0;
  for (const file of expectedFiles) {
    const data = await readFile(resolve(directory, file));
    if (hash(data) !== manifest.files[file].sha256 || data.length !== manifest.files[file].bytes) throw new Error(`Export integrity failure: ${file}`);
    if (file.endsWith(".svg")) { validateSvg(data.toString()); total += data.length; if (data.length > profileConfig.maxAssetBytes) throw new Error(`Asset over budget: ${file}`); }
  }
  if (total > profileConfig.maxTotalBytes || manifest.svgBytes !== total) throw new Error("Export total size mismatch or budget exceeded");
  if (await readFile(resolve(directory, "README.md"), "utf8") !== profileReadme(profileConfig, content)) throw new Error("README content does not match catalogue");
  return manifest;
}

async function serve() {
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const file = resolve(root, `.${path}`);
      const allowed = ["dist/", "profile/", "node_modules/three/build/"].some(prefix => relative(root, file).startsWith(prefix));
      if (request.method !== "GET" || !file.startsWith(root) || !allowed || relative(root, file).split(sep).some(part => part.startsWith("."))) { response.writeHead(404).end(); return; }
      response.setHeader("Content-Type", extname(file) === ".html" ? "text/html" : "text/javascript");
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", ok); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function build() {
  validateConfig(profileConfig);
  const content = profileContent();
  const provenance = await sources();
  const config = { ...profileConfig, views: content.views, sourceHash: provenance.sourceHash };
  const existed = await assertOwned();
  const { server, origin } = await serve();
  let browser, stage;
  try {
    browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 600, height: 360 }, deviceScaleFactor: 1 });
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/profile/host.html`);
    const files = new Map(); const views = [];
    for (const view of content.views) {
      console.log(`Rendering ${view.title} (${view.frames} frames)…`);
      const base64 = await page.evaluate(async ({ view, config, labels }) => {
        const { captureAtlas } = await import("/profile/render.js");
        return captureAtlas(view, config, labels);
      }, { view, config, labels: content.labels });
      const atlas = Buffer.from(base64, "base64");
      if (atlas.toString("ascii", 0, 4) !== "RIFF" || atlas.toString("ascii", 8, 12) !== "WEBP") throw new Error("Invalid captured atlas");
      const file = assetName(view); const svg = svgFor(view, atlas, config, content.views.indexOf(view));
      validateSvg(svg);
      if (Buffer.byteLength(svg) > config.maxAssetBytes) throw new Error(`Asset over budget: ${file}`);
      files.set(file, svg);
      views.push({ id: view.id, site: view.site, file, frames: view.frames, atlasBytes: atlas.length });
    }
    if (errors.length) throw new Error(errors.join("\n"));
    if ((await sources()).sourceHash !== provenance.sourceHash) throw new Error("Source changed during capture; please rerun");
    const svgBytes = [...files.values()].reduce((sum, svg) => sum + Buffer.byteLength(svg), 0);
    if (svgBytes > config.maxTotalBytes) throw new Error("Profile assets exceed total download budget");
    files.set("README.md", profileReadme(config, content));
    files.set("preview.html", profilePreview(config, content));
    files.set("content.json", JSON.stringify(content, null, 2) + "\n");
    let revision = null;
    try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { /* Source hashes work outside git too. */ }
    const manifest = { exporter: owner, ...provenance, sourceRevision: revision,
      browser: browser.version(), config: profileConfig, views, svgBytes,
      files: Object.fromEntries([...files].map(([file, data]) => [file, { bytes: Buffer.byteLength(data), sha256: hash(data) }])) };
    await mkdir(resolve(root, "build"), { recursive: true });
    stage = await mkdtemp(resolve(root, "build/.profile-export-"));
    for (const [file, data] of files) await writeFile(resolve(stage, file), data);
    await writeFile(resolve(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    await verify(stage);
    if (existed) {
      await assertOwned();
      const backup = `${stage}-previous`;
      await rename(output, backup);
      try { await rename(stage, output); stage = null; }
      catch (error) { await rename(backup, output); throw error; }
      await rm(backup, { recursive: true }); // Only the validated, generated previous build.
    } else { await rename(stage, output); stage = null; }
    console.log(`Built ${views.length} views (${(svgBytes / 1048576).toFixed(2)} MiB) in ${output}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    if (stage) await rm(stage, { recursive: true, force: true });
  }
}

try {
  if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== "--verify") throw new Error("Usage: npm run build:profile OR npm run verify:profile");
  if (process.argv[2] === "--verify") { await verify(); console.log("Profile export verified: source, content, assets and budgets match."); }
  else await build();
} catch (error) { console.error(`Profile export failed: ${error.message}`); process.exitCode = 1; }
