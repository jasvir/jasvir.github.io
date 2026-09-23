# Deployment and rollback

## Current migration state

On 23 September 2026, `jasvir/jasvir.github.io` uses GitHub Pages' legacy
branch-based publishing from `main` at `/`. The island migration branch has not
changed that setting. Its root cookie-test files remain intact.

The new workflow is prepared but gated by the repository Actions variable
`ISLAND_PAGES_ENABLED=true` and the `main` branch. PRs and other branches run
read-only tests; they cannot publish through this workflow.

## Explicit cutover, when ready

1. Merge the reviewed migration into `main`. The old root site remains served
   while the current branch-based Pages configuration is unchanged.
2. In repository Settings → Pages, change the publishing source to **GitHub Actions**.
3. Ensure the `github-pages` environment allows deployment from `main`.
4. Set the repository Actions variable `ISLAND_PAGES_ENABLED` to `true`.
5. Run **Deploy island to GitHub Pages** on `main` and inspect the successful
   deployment before announcing the replacement.
6. Visit the site root, open a building popup, test drag/zoom/pause and writing
   previews, and check `/legacy-cookie-test/` and `/setrandomcookie.js`.

The artifact contains only `dist/`: not tests, documentation, capture tools,
or the large experimental SVG. Writing previews are refreshed twice daily and
on each deployment; a feed failure retains the saved snapshot. A failed test
prevents upload/deployment and leaves the last successful site in place.

Official reference: [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Rollback

- For an island regression after cutover, revert the offending source commit
  on `main`, then run the gated deployment workflow again.
- To restore the pre-island cookie-test site, set `ISLAND_PAGES_ENABLED=false`,
  wait for or cancel any in-flight island deployment, and restore Pages'
  **Deploy from a branch → main → /(root)** source. The original root files are
  still present. Disabling the variable alone does not roll back published content.
- Do not delete the prior profile repo's island copy or disable its deployment
  until the new site's cutover has been confirmed. Retirement is a separate
  profile integration task, not part of this source migration.
