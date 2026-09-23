# Jasvir’s island

This repository is the canonical home for Jasvir Nagra’s interactive Fiji island
portfolio and the source used to generate its GitHub profile presentation.

The full website lives in **`dist/`**. Its geography, buildings, content, textures,
and JavaScript interactions originated in `jasvir/jasvir`. The website and profile
capture tool now import the same reusable scene modules.
The profile repository will consume generated outputs; it should not become a
second independently maintained scene implementation.

## Work here

- Content and links: `dist/content.js`.
- Island layout and building positions: `dist/island-layout.js`.
- Coastlines: `dist/coastlines.js`.
- Scene construction, models, materials and motion: `dist/scene/`.
- Browser orbit controls, picking, label placement and motion toggle: `dist/script.js`.
- Browser labels, directory and popups: `dist/content-view.js`.
- Latest writing snapshot: `dist/writing-posts.js`.

[The authoring guide](docs/island-authoring.md) describes the existing content
format and layout. [The shared scene API](docs/shared-scene.md) explains how the
website and profile capture tool use the same models and animation.

## Preview and test

Serve **`dist/`**, not the repository root, with any static HTTP server. For example:

```sh
python3 -m http.server 8423 --directory dist --bind 127.0.0.1
```

The browser loads the pinned Three.js dependency from jsDelivr. No package install
or build is required for the website. Use Node.js 22 or newer for the tests:

```sh
npm ci --ignore-scripts
npm test
```

`node scripts/refresh-writing-posts.mjs` refreshes writing previews from the public
RSS feed. The checked-in snapshot is retained if the feed is unavailable.

## Profile export experiment

[`examples/island-profile-spike/`](examples/island-profile-spike/) retains the
labelled rotating overview and four destination views with their capture tool. It reads this
repository’s shared scene directly, without rewriting browser source. Its generated SVG is a compatibility fixture,
not the production profile asset; see the [findings](examples/island-profile-spike/FINDINGS.md).
The [navigation notes](docs/profile-navigation.md) describe the zoom-then-card
sequence, generated assets, read-more links and GitHub layout limitations.

## Publishing status

The Actions workflow publishes **only `dist/`**, and only from `main` with
`ISLAND_PAGES_ENABLED` set to `true`. It is deliberately gated during migration.
The existing root `index.html` and `setrandomcookie.js` remain untouched so the
current branch-based Pages site continues to work until the explicit cutover.

[Deployment and rollback instructions](docs/deployment.md) explain switching
Pages to GitHub Actions. Do not enable the switch merely to preview a branch.

The old cookie test is also included at `/legacy-cookie-test/` in the new site,
and its existing `/setrandomcookie.js` URL is preserved in the Pages artifact.

See [migration provenance and repository ownership](docs/migration.md).
