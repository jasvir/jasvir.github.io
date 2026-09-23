# Canonical island source migration

## Provenance

- Imported from `jasvir/jasvir` commit
  `bd7f5199977f4c600cddf4bb26050d0fa54adc2c`.
- The island itself was last changed at source commit
  `48071770dd0b0f3b70b2b481a0127d9151edfda0`.
- Website repository baseline:
  `bc54afd72e39eeefc859ff28d8ba4c29cb7bc7a6`.
- The tracked `dist/`, `scripts/`, `tests/` and
  `examples/island-profile-spike/` files were imported byte-for-byte before
  migration documentation and compatibility tests were added.
- The source README is preserved as `docs/island-authoring.md`, with the
  repository name and deployment status clarified for its new home.

No untracked local experiments, ignored capture caches, credentials, or `.git`
metadata were imported. Original commits remain available in the source repo;
this migration records their exact IDs instead of rewriting either git history.

## Ownership from this point

Make new island changes in **`jasvir/jasvir.github.io`**. This includes geography,
scene models, site styling, content, and profile-export tooling.

**`jasvir/jasvir`** owns the personal profile README and will receive generated
assets/content. Its existing island files and step-1 demo branch remain a
historical safety copy until website cutover and profile integration are done;
they are not an independently maintained source branch.

## Preserved behavior

The interactive website's files are unchanged. Routes and hash-based popups,
hover previews, railway, water, flight and boat animation, social badges,
content catalogue and saved island geography are retained. The old website's
root cookie-test files are also untouched, and copies inside `dist/` preserve
the test as `/legacy-cookie-test/` and the script as `/setrandomcookie.js` after
cutover.

## Scope boundary

This step establishes the canonical repository and prepares deployment. It does
not switch the live Pages source, merge the migration branch, delete source
from the profile repo, extract a scene API, optimize the SVG, or automate
cross-repository profile updates. Those remain later steps in the agreed plan.

## Migration verification

- All 23 imported files matched the source byte-for-byte; no island rendering
  or interaction code was edited.
- Both original root entrypoints matched the website repository baseline.
- All 18 local checks passed (content/layout, the export fixture, and migration).
- Local browser smoke test: scene renders, SecretSeal opens with its project
  hash and links, zoom changes the view, pause changes to resume, and no browser
  errors were recorded during those checks.
