import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { views } from "./views.js";
import { svgFor, readmeFor, previewFor, assetName } from "./output.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const cache = resolve(directory, ".cache");
const port = Number(process.env.PORT || 8422);
const config = {
  width: 600, height: 360, columns: 12, quality: 0.68, compensationPixels: 40,
  views,
};
const sourceFiles = ["island-layout.js", "coastlines.js", "content.js", "catalogue.js", "../examples/island-profile-spike/views.js", "../examples/island-profile-spike/labels.js", "../examples/island-profile-spike/capture-adapter.js", ...["palette", "primitives", "materials", "models", "create-island-scene", "animation", "camera-presets", "camera", "renderer"].map(name => `scene/${name}.js`)];
sourceFiles.push("../examples/island-profile-spike/card.js", "../examples/island-profile-spike/journey.js");
sourceFiles.push(...["card.js", "journey.js", "labels.js", "render.js"].map(file => `../profile/${file}`));
const sources = await Promise.all(sourceFiles.map(file => readFile(resolve(root, "dist", file))));
config.sourceHash = createHash("sha256").update(Buffer.concat(sources)).digest("hex");
await mkdir(cache, { recursive: true });

async function build() {
  const outputs = [];
  for (const [index, view] of config.views.entries()) {
    const data = await readFile(resolve(cache, `${view.id}.webp`));
    const svg = svgFor(view, data, config, index);
    const file = assetName(view);
    await writeFile(resolve(directory, file), svg);
    outputs.push({ id: view.id, site: view.site, frames: view.frames, file, atlasBytes: data.length, svgBytes: Buffer.byteLength(svg), gzipBytes: gzipSync(svg).length });
  }
  await writeFile(resolve(directory, "README.md"), readmeFor(config));
  await writeFile(resolve(directory, "preview.html"), previewFor(config));
  const manifest = {
    sourceHash: config.sourceHash, sourceFiles, width: config.width,
    height: config.height + (config.views.length - 1) * config.compensationPixels,
    svgBytes: outputs.reduce((sum, view) => sum + view.svgBytes, 0),
    frames: outputs.reduce((sum, view) => sum + view.frames, 0),
    views: outputs, sceneTime: 7, compensationPixels: config.compensationPixels,
    labelled: true, popupAfterApproach: true, commonOverviewReturn: true, vectorCards: true,
  };
  await writeFile(resolve(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".css": "text/css", ".json": "application/json", ".md": "text/plain" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (request.method === "POST") {
      if (request.headers.origin !== `http://127.0.0.1:${port}`) { response.writeHead(403).end("Local capture page only"); return; }
      if (url.pathname === "/capture/build") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(await build())); return;
      }
      const match = /^\/capture\/atlas\/([a-z0-9-]+)$/.exec(url.pathname);
      if (!match || !views.some(view => view.id === match[1])) { response.writeHead(404).end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 16 * 1048576) { response.writeHead(413).end("Atlas too large"); return; }
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);
      if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP") throw new Error("Expected WebP atlas");
      await writeFile(resolve(cache, `${match[1]}.webp`), data);
      response.end("Saved"); return;
    }
    response.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/capture/config") { response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify(config)); return; }
    const path = resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/examples/island-profile-spike/capture.html" : url.pathname));
    if (!path.startsWith(root + sep) || path.includes(sep + ".git" + sep)) { response.writeHead(403).end(); return; }
    const content = await readFile(path);
    response.setHeader("Content-Type", mime[extname(path)] || "application/octet-stream");
    response.end(content);
  } catch (error) { response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.message); }
});
if (process.argv.includes("--build")) {
  console.log(JSON.stringify(await build(), null, 2));
} else {
  server.listen(port, "127.0.0.1", () => console.log(`Capture: http://127.0.0.1:${port}/`));
}
