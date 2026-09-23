# Labelled island and destination navigation

The capture page and CSS-only preview now offer Around the islands, Two Dozen,
About Me, SecretSeal, and Trapdoor VMs. Destination selection approaches its saved
building position over 1.6 seconds, reveals its information card, then moves the
card to the centre while the island returns to a common overview. The complete
sequence lasts 4.8 seconds and holds the centred card over the overview.
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
labels even without a page DOM. Cards are separate SVG text and shapes generated
by `card.js`, not rasterized into the camera frames. Their contents still come
from the shared catalogue. The capture page overlays the same SVG card markup.

`journey.js` shares the approach, hold and return timings. The SVG plays its
32 approach frames forwards, holds briefly, then reverses them, ending on frame
zero. Every destination's frame zero uses exactly the same camera, scene time,
and neutral label styling. This avoids an island jump when switching between
completed destinations without requiring a separate asset for every pair.

## Outputs and controls

Run `npm run capture`, open its HTTP address, then choose **Capture all views**.
The capture tool writes:

- `island.svg`: the 96-frame looping overview.
- `island-two-dozen.svg`, `island-homepage.svg`, `island-secretseal.svg` and
  `island-trapdoor.svg`: 32-frame approaches, reused in reverse for the return,
  with separately animated vector cards.
- `README.md`, `preview.html`, and `manifest.json` in the example directory.

Each view owns one embedded WebP atlas instead of sharing a large combined atlas.
The overview rotates at the existing 4.8 fps; destination approaches use about
20 fps on the approach and 13 fps on the slower return. Card movement is a smooth
CSS transform independent of those frames. The live capture page renders its
camera transitions at browser animation frame cadence. Asset sizes are recorded
in `manifest.json`; reversing existing frames adds no extra image atlas data.

The local CSS-only preview positions native grouped details summaries in a left
sidebar. GitHub strips that custom layout CSS, so the generated README uses
native stacked details and right-aligned images. Its 40px-per-summary artwork
offset compensates at a 600px image width; narrower layouts or wrapped summaries
still change the apparent alignment.

Reduced motion shows a static overview and centred card immediately.
An embedded SVG's animation may remain completed when a previously opened
details section is reopened; only the live capture tool guarantees a fresh
approach on each selection. Clicking before a return finishes can still cause an
island jump, as can leaving the rotating overview at a different angle. Switching
between completed destinations removes the previous card immediately; only the
island background is continuous, not the outgoing card. No JavaScript runs in
the SVG or preview. The live capture page demonstrates this same sequence;
true interruptible point-to-point travel on the full site remains separate work.

The old combined `island.svg#library` fixture is superseded by the named assets
on this branch; historical fixtures remain in earlier commits. Site deployment
and the personal profile are unchanged until the separately planned cutover.
