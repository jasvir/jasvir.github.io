# Step 1: README export feasibility

Tested on 23 September 2026 in the Codex in-app browser, using the actual
GitHub-rendered README on the `codex/island-profile-export-spike` branch.
Neither the live profile README nor the website was replaced.

## Result

The mechanism works: GitHub displays a self-contained SVG with CSS animation,
preserves the image URL fragment, and allows a named details group to switch
between the orbit and library approach. This is **CSS-only playback of captured
frames**, not live 3D or an all-vector reconstruction.

The capture adapter reuses the existing Three.js scene, materials, lighting,
terrain, buildings and saved layout. It adjusts the camera and scene clock;
it does not copy the scene into a second implementation. Source adaptation is
temporary/in-memory and fails explicitly if its expected hooks change.

## Measurements

| Item | Prototype |
| --- | --- |
| Visible frame | 600 × 360 |
| SVG canvas including alignment space | 600 × 400 |
| Overview | 96 frames / 20-second loop (4.8 frames/sec) |
| Library | 32 distinct frames, approach / dwell / return in 8 seconds |
| SVG file | 5,065,107 bytes (4.83 MiB) |
| Locally gzip-compressed SVG | 3,821,140 bytes (3.64 MiB); actual HTTP transfer may differ |
| Desktop summary-row compensation | 40 pixels at the intended 600-pixel image width |

## Checks

- Local image embed: orbit and approach both visibly animate.
- Actual GitHub README: embedded WebP atlases render inside the SVG;
  screenshots show different orbit angles and the library camera view.
- GitHub keeps `#overview` and `#library` on the image URLs.
- GitHub preserves the details group (prefixing its name with `user-content-`).
  Opening the library closes the overview.
- GitHub desktop measurement: the second view's image starts 40 pixels lower
  in document coordinates (24-pixel summary plus 16-pixel spacing).
  The overview artwork is shifted down by 40 SVG units to compensate.
- Generated SVG contains no scripts, foreignObject, or external image resources.
- Reduced-motion CSS selects a still overview and a fully zoomed library.
  The rule is checked automatically; an actual OS reduced-motion session has
  not been tested.

Run structural checks with
`node --test examples/island-profile-spike/verify.test.mjs`.
Repackage existing cached captures with
`node examples/island-profile-spike/serve.mjs --build`.

## Limits and next decision

- This proves compatibility, not production performance. The output is large
  and visibly frame-stepped. The two atlases total roughly 109 MiB of RGBA
  pixels before browser-specific caching/decoding behavior. More highlights
  should not simply be appended to this same atlas indefinitely.
- No shared camera state exists between separate SVG image instances. A new
  view starts its own animation; reopening it is not guaranteed to restart.
  It cannot smoothly continue from the currently visible orbit angle.
- The train, water, people, aircraft and boat are frozen at scene time 7 for
  this camera-only experiment. Capturing their motion later is possible,
  but needs additional loop/timing design.
- Artwork compensation is calibrated for unwrapped summaries and images at
  600 pixels. Narrow layouts scale the SVG offset but not the text spacing,
  so exact alignment on mobile is not guaranteed. Text-size changes can also
  affect it. It is a cosmetic trick, not true overlapping layout.
- Transparent pixels surround the rendered scene, but much of the water fades
  toward the original light palette. Dark GitHub themes need visual polish.
- The full-site links are future rollout destinations. The island website
  migration is deliberately outside this step.

**Recommendation:** proceed with a shared scene/export boundary, retaining
this as a compatibility fixture. Before replacing the profile, decide a
download/memory budget and reduce frame count/resolution or investigate a
more compact rendering approach. Do not treat the current 4.83 MiB atlas
prototype as the final profile asset.
