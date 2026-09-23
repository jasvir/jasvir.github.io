# Labelled island and destination navigation

The capture page and CSS-only preview now offer Around the islands, Two Dozen,
About Me, SecretSeal, and Trapdoor VMs. Destination selection approaches its saved
building position over 1.6 seconds, then reveals its information card and holds.
Read-more links remain real HTML links outside the image; links inside an SVG
embedded as an image are not interactive in the README.

## One source for names and content

`examples/island-profile-spike/views.js` selects the four content IDs. Titles,
descriptions and links come from `dist/content.js`, while building anchors come
from `dist/island-layout.js`. The website and capture use `siteTitle` from the
catalogue for identical map label names.

`labels.js` projects each visible building anchor, positions screen-facing label
pills with collision avoidance, and draws connector lines. These are composited
over the WebGL render into the captured canvas, so the exported artwork includes
labels even without a page DOM. The final approach frame includes the card.

## Outputs and controls

Run `npm run capture`, open its HTTP address, then choose **Capture all views**.
The capture tool writes:

- `island.svg`: the 96-frame looping overview.
- `island-two-dozen.svg`, `island-homepage.svg`, `island-secretseal.svg` and
  `island-trapdoor.svg`: 32-frame approaches with final cards.
- `README.md`, `preview.html`, and `manifest.json` in the example directory.

Each view owns one embedded WebP atlas instead of sharing a large combined atlas.
The overview rotates at the existing 4.8 fps; destination approaches use about
20 fps. The live capture page renders its camera transitions at browser animation
frame cadence. This is not yet a production-size optimization: the five labelled
assets total roughly 9.13 MiB before transport compression.

The local CSS-only preview positions native grouped details summaries in a left
sidebar. GitHub strips that custom layout CSS, so the generated README uses
native stacked details and right-aligned images. Its 40px-per-summary artwork
offset compensates at a 600px image width; narrower layouts or wrapped summaries
still change the apparent alignment.

Reduced motion shows a static overview or the final close-up/card immediately.
An embedded SVG's animation may remain completed when a previously opened
details section is reopened; only the live capture tool guarantees a fresh
approach on each selection. On first opening, the tested browser plays the
approach before displaying the card. No JavaScript runs in the SVG or preview.

The old combined `island.svg#library` fixture is superseded by the named assets
on this branch; historical fixtures remain in earlier commits. Site deployment
and the personal profile are unchanged until the separately planned cutover.
