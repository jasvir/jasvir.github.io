# Island authoring guide

Source for Jasvir Nagra’s interactive 3D Fiji archipelago: a rotatable, zoomable railway
portfolio with a carved river, an arched bridge, an open mountain tunnel, an island-hopping
aeroplane, and a boat that periodically leaves its dock for a coastal trip. The motion
toggle and reduced-motion preference apply to all scene animations. Project links also
remain available in the accessible station-board directory.

The four repositories in the public
[Featured GitHub list](https://github.com/stars/jasvir/lists/featured) are SecretSeal,
Trapdoor Virtual Machines, Caja, and Plush. Plush uses the railway station as its stop.

The canonical source now lives in `jasvir/jasvir.github.io`. The static site is
in `dist/`; `.github/workflows/deploy-pages.yml` publishes it through GitHub Actions
with `ISLAND_PAGES_ENABLED=true`. See [deployment instructions](deployment.md).

## Local preview

Serve the `dist/` directory with any static file server, then open its local URL.

## Adding a post, article, project, or link

Every building label reveals a left-aligned description on hover or keyboard
focus, using `hoverDescription`, then `summary`, then `lede`. Writing labels also
show their three recent posts in a dropdown aligned with the label card's left
edge. Hidden descriptions do not widen the resting label. Run
`node scripts/check-label-hovers.mjs` after label changes (requires the installed
Playwright Chromium); it checks all eight labels and saves screenshots in
`build/label-check/`.

Edit **`dist/content.js`**. Each entry is written once; the page makes its directory
row, links, and popup automatically. No build step or HTML edits are needed.
For example, add this inside `entries`, replacing the example title and URL:

```js
"a-new-note": {
  site: "writing",
  kind: "article",
  title: "A new note",
  summary: "A short description for the directory and popup.",
  links: [{ label: "Read the article", url: "https://example.com/my-note" }],
},
```

Choose an existing building using its stable `site` key:

| Site | Building |
| --- | --- |
| `library` | SecretSeal’s reading room |
| `research` | Trapdoor VM research annex |
| `factory` | Caja’s factory |
| `plush` | Plush at the railway station |
| `home` | About Me cottages |
| `writing` | Recursive Rhymes cottages |
| `twoDozen` | Two Dozen sign beside the writing house |
| `video` | YouTube cottages |

The Recursive Rhymes and Two Dozen signs show the three latest posts on hover and
keyboard focus, excluding the pinned introductory story. The other signs reveal a
one-line description on hover or keyboard focus. Clicking either writing sign
opens the same recent posts in a popup for touch screens. “Show more...” opens
the [full archive](https://www.recursiverhymes.com/archive);
“See more...” opens the [Two Dozen section](https://www.recursiverhymes.com/s/two-dozen).
`dist/writing-posts.js` contains a checked-in snapshot of the
[public RSS feed](https://www.recursiverhymes.com/feed). The GitHub Pages workflow refreshes
it twice daily during deployment, and `node scripts/refresh-writing-posts.mjs` refreshes
it locally. If the feed is unavailable, the checked-in posts remain visible.

Several entries can share a building. Its sign becomes a collection label and the
popup includes “Also in this building” buttons. The first entry in file order is
the building’s opening page; the directory follows file order too. Adding content
does not create new buildings, change the coastline, or move the camera.

- Required: a unique entry key, `site`, `kind`, `title`, `summary` (or `lede`),
  and at least one `{ label, url }` in `links` (except for `about`).
- `kind`: `project`, `article`, `blog`, `link`, or `about`. An `about` entry may
  have an empty `links` list so it opens as a self-contained popup.
- Optional: `lede` for a longer introduction; `question`, `work`, `mode`, and
  `signal` for extra detail. Omitted sections disappear cleanly.
- Optional: `mapTitle` for a shorter sign, `hoverDescription` for its hover line,
  `icon`, `type`, and `district`.
- `directory: false` keeps an entry in its building but off the directory.
- `published: false` hides an unfinished entry everywhere.
- Projects can have both GitHub and demo links; articles can have a single read link.
  Link URLs must begin with `https://` or `http://`. Text is plain text, not HTML.
- Keep entry keys stable: links use `#entry-a-new-note` (or `#project-secretseal`
  for projects), so existing bookmarks continue to work.

## Saved island structure

The scene and its contents are deliberately separate:

- `dist/coastlines.js`: saved island outlines and their relative positions.
- `dist/island-layout.js`: the camera, named building plots and sign anchors,
  landmarks, cobblestone paths, river, railway, boat route, and flight route.
- `dist/scene/`: reusable 3D models, materials, terrain details, camera presets, and animation.
- `dist/script.js`: browser controls, picking, projected labels, and the render loop.
- `dist/content.js`: the editable content catalogue; this is the usual place to work.
- `dist/content-view.js`: creates signs, directory entries, and popups from that catalogue.
- `dist/writing-posts.js`: the current writing preview snapshot.

Only change the layout when intentionally changing the geography or adding a new
building. Content can use any existing site without touching scene code.
The directory and popups load independently of the 3D library.

Run `npm ci --ignore-scripts` once, then `npm test` to check the catalogue,
shared-building behavior, saved layout, deterministic scene animation, and export
fixture before publishing. See [the shared scene API](shared-scene.md).

## Geography

`dist/coastlines.js` contains simplified public-domain Natural Earth coastlines from
[datasets/geo-countries](https://github.com/datasets/geo-countries). All islands share
one geographic projection and scale. Terrain, buildings, and transport are illustrative.

## Palette

The core colors are `#d00dad` and `#dec0de`, with small accents from the pleasantly
pronounceable `#c0ffee`, `#bada55`, and `#facade` families.
