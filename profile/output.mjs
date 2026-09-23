// One SVG formatter for the exporter and compatibility fixture.
import { escapeHtml, cardMarkup, cardStyles } from "./card.js";
import { journeySeconds, cycleSeconds, cardHoldSeconds, approachEnd, returnStart } from "./journey.js";
export { escapeHtml };
export const assetName = view => view.id === "overview" ? "island.svg" : `island-${view.id}.svg`;
export const offsetFor = (index, config) => (config.views.length - 1 - index) * config.compensationPixels;

export function svgFor(view, data, config, index) {
  const { width, height, columns } = config;
  const canvasHeight = height + (config.views.length - 1) * config.compensationPixels;
  const position = frame => `translate(${-(frame % columns) * width}px, ${-Math.floor(frame / columns) * height}px)`;
  const overview = view.id === "overview";
  const key = (time, frame) => `${(time * (overview ? 1 : journeySeconds / cycleSeconds) * 100).toFixed(5)}%{transform:${position(frame)}}`;
  const keys = overview
    ? Array.from({ length: view.frames + 1 }, (_, frame) => key(frame / view.frames, frame % view.frames)).join("")
    : Array.from({ length: view.frames }, (_, frame) => key(frame / (view.frames - 1) * approachEnd, frame)).join("")
      + Array.from({ length: view.frames }, (_, frame) => key(returnStart + frame / (view.frames - 1) * (1 - returnStart), view.frames - 1 - frame)).join("")
      + `100.00000%{transform:${position(0)}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${canvasHeight}" viewBox="0 0 ${width} ${canvasHeight}" role="img" aria-labelledby="title desc">
<title id="title">${escapeHtml(view.title)}</title>
<desc id="desc">${escapeHtml(view.description)} Zooms to the building, centres its card, then returns the island to a common overview.</desc>
<metadata>Source SHA-256: ${config.sourceHash}</metadata>
<style>
.motion{transform:${position(0)};animation:camera ${overview ? "20s" : `${cycleSeconds}s`} steps(1,end) infinite}
@keyframes camera{${keys}}
@media(prefers-reduced-motion:reduce){.motion{animation:none}}
${overview ? "" : cardStyles}
</style>
<defs><clipPath id="frame"><rect width="${width}" height="${height}"/></clipPath></defs>
<g id="${view.id}" transform="translate(0 ${offsetFor(index, config)})"><g clip-path="url(#frame)"><image class="motion" width="${columns * width}" height="${Math.ceil(view.frames / columns) * height}" href="data:image/webp;base64,${data.toString("base64")}"/>${overview ? "" : cardMarkup(view, width, height)}</g></g>
</svg>\n`;
}

function linksFor(view, config = {}) {
  if (config.expandOnly) return `<a href="${escapeHtml(view.href)}">Expand...</a>`;
  if (config.omitAboutLink && view.id === "homepage" && !view.links?.length) return "";
  return (view.links?.length ? view.links : [{ label: view.id === "overview" ? "Explore the full island" : "About Me on the full island", url: view.href }])
    .map(link => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join(" · ");
}

export function readmeFor(config) {
  return `# Around the islands

Pick a place to zoom in. Its card moves to the centre while the island returns to a shared overview behind it. Each journey repeats after a ${cardHoldSeconds}-second reading pause and a short fade. Use the links below to read more.

${config.views.map((view, index) => `<details name="island-profile-view"${index === 0 ? " open" : ""}>
<summary>${escapeHtml(view.title)}</summary>
<p align="right"><a href="${escapeHtml(view.href)}"><img src="./${assetName(view)}#${view.id}" width="600" alt="${escapeHtml(view.title)} — labelled island view"></a></p>
<p>${escapeHtml(view.description)}</p>
<p>${linksFor(view)}</p>
</details>`).join("\n\n")}

---

This generated README is a preview, not the live profile. The SVGs contain labels
and information cards, and play without JavaScript. Each destination has a separate
asset to avoid making every image decode the entire collection. Reduced motion
shows the shared overview and centred information card immediately.

The [local preview](preview.html) arranges these same grouped details as a left
sidebar. GitHub uses its native stacked details layout; it does not allow the
preview's custom CSS. The full-site destinations await the planned Pages cutover.

Run **npm run capture**, open the printed HTTP URL, then choose **Capture all views**
to rebuild images and this README from the shared scene and content catalogue.
See [the shared scene API](../../docs/shared-scene.md) and [original findings](FINDINGS.md).
`;
}

export function previewFor(config) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Island profile — places to explore</title>
<style>
body{max-width:980px;margin:40px auto;padding:0 24px;background:#fffdf8;color:#21383a;font:15px/1.55 system-ui}
h1{font-family:Georgia,serif;font-size:34px;margin-bottom:8px}a{color:#a3088a}main{position:relative;padding-left:190px;min-height:570px;margin-top:28px}
details>summary{position:absolute;left:0;top:calc(var(--index)*48px);width:160px;padding:10px 8px;cursor:pointer;border-radius:8px}
details[open]>summary{background:#f7e9f5;color:#96087c;font-weight:650}section{max-width:600px}
.viewport{position:relative;aspect-ratio:5/3;overflow:hidden;border-radius:12px;background:#fff}
.viewport img{position:absolute;left:0;top:var(--shift);width:100%;height:auto}p{margin:12px 0}footer{font-size:13px;color:#586b66}
@media(max-width:700px){main{padding-left:0;min-height:0}details>summary{position:static;width:auto;margin:5px 0}section{padding-bottom:16px}}
</style>
<h1>Around the islands</h1><p>Pick a place. Each journey loops, with a ${cardHoldSeconds}-second pause to read the card.</p>
<main aria-label="Island places">
${config.views.map((view, index) => `<details name="island-profile-view" style="--index:${index}"${index === 0 ? " open" : ""}>
<summary>${escapeHtml(view.title)}</summary><section>
<div class="viewport" style="--shift:${-offsetFor(index, config) / config.height * 100}%"><img src="./${assetName(view)}#${view.id}" alt="${escapeHtml(view.title)} — labelled island view" width="600"></div>
${config.expandOnly ? "" : `<p>${escapeHtml(view.description)}</p>`}<p>${linksFor(view, config)}</p>
</section></details>`).join("\n")}
</main><footer>No JavaScript in this preview. <a href="./README.md">README source</a> · GitHub uses stacked details instead of this sidebar.</footer></html>\n`;
}
