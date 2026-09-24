# Build the profile package

The website repo owns the exporter. The profile repo consumes generated files,
not a copy of the Three.js scene. Nothing here publishes a site, pushes commits,
or changes `jasvir/jasvir/README.md`.

## One-command build

One-time setup (Node.js 22 or newer):

```sh
npm ci --ignore-scripts
npx playwright install chromium
```

Then:

```sh
npm run build:profile
npm run verify:profile
```

The build starts an ephemeral loopback-only server, renders in an isolated,
pinned headless Chromium using the locally installed Three.js package, packages
the captures, validates them, and closes the browser/server. No CDN, GitHub API,
or live blog access is required after installing dependencies. Outbound browser
requests are blocked. On Linux use `npx playwright install --with-deps chromium`.

The manual **Build profile export** Actions workflow does the same work and
uploads a downloadable artifact. It has read-only repository permissions and
does not deploy or synchronize repositories.

## Inputs and ownership

- `profile/config.js`: ordered highlight IDs, dimensions, frame counts, quality,
  fixed scene time, alignment spacing, and size budgets.
- `dist/content.js`: all selected titles, descriptions and links, including the
  About Me paragraph shown in the SVG card.
- `dist/island-layout.js`, `dist/coastlines.js`, `dist/scene/`: the same island,
  positions, materials, textures and camera poses used by the interactive site.
- `profile/render.js`: shared capture host for the exporter and old prototype.
- `profile/card.js`, `labels.js`, `journey.js`, `output.mjs`: shared presentation,
  not a second scene. The prototype re-exports these modules.

The requested order is overview, Two Dozen, SecretSeal, Trapdoor VMs, About Me.
Changing text or links in the content catalogue updates the SVG card, generated
README and machine-readable content on the next build. Missing, duplicate or
unpublished selections fail rather than silently disappearing.

## Output contract

`build/profile/` is generated and ignored by git:

- `island.svg`: labelled rotating overview.
- `island-two-dozen.svg`, `island-secretseal.svg`, `island-trapdoor.svg`,
  `island-homepage.svg`: looping approaches, returns and vector cards.
- `README.md`: full-width relative image references and native details sections.
  Each body contains only its map, wrapped in a link to the corresponding
  full-site destination (including About Me). All visible content stays inside
  the details sections; images and summary labels share a left edge.
- `preview.html`: CSS-only local sidebar preview of those exact SVGs.
- `content.json`: selected content and saved label anchors.
- `manifest.json`: source hashes, source revision, browser version, configuration,
  selected views, frame counts, asset byte sizes, and output SHA-256 hashes.

Copy the whole package together when integrating the profile; otherwise adjust
the README's relative asset paths. Integration is a separate rollout step.
With `npm run capture` running, open
`http://127.0.0.1:8422/build/profile/preview.html` to inspect the generated package.

The build validates in a temporary directory before replacing an exporter-owned
previous build. It refuses an unrelated output directory or a symlink. A failed
render leaves the previous package intact. Verification detects source drift,
changed file contents, missing views, and resource/size budget violations.
Default budgets are 6 MiB per SVG and 12 MiB total; these are guardrails for this
stage, not a claim that the atlas format is fully optimized.

## Playback and reproducibility

The geometry and frames come from the live scene, but README playback is CSS
animation of embedded WebP frames. The overview makes one rotation every 40 seconds
(configured with `overviewSeconds`). Small labels are captured pixels; popup cards
are SVG text. Each destination approaches in 1.6 seconds, returns by 4.8 seconds,
holds its centred card for 15 seconds, fades for 0.6 seconds, and loops. The return
reuses the approach atlas in reverse. Reduced motion shows the static overview
and final card. Vehicles and water are frozen at the configured scene time.

Reopening a details section may resume mid-cycle rather than restart. GitHub
uses stacked summaries rather than the custom preview sidebar. Production SVGs
have no artwork-offset spacer: each is a 600 × 360 view displayed at 100% of the
available README width. The image sits directly below its summary; native GitHub
details cannot reproduce the preview's side-by-side layout without custom CSS.

Rendering uses fixed cameras, seeded scene textures, fixed time and a pinned
browser/dependency version. Source hashes are authoritative; a revision may have
uncommitted changes. Fonts, graphics drivers and OS rasterization can still
change pixel hashes across platforms, so byte-identical cross-platform output
is not promised. The manifest makes the inputs and actual assets auditable.
