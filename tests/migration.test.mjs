import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy cookie-test entrypoints are preserved in the Pages artifact", async () => {
  assert.equal(await read("dist/legacy-cookie-test/index.html"), await read("index.html"));
  const original = await read("setrandomcookie.js");
  assert.equal(await read("dist/legacy-cookie-test/setrandomcookie.js"), original);
  assert.equal(await read("dist/setrandomcookie.js"), original);
});

test("the deployment is opt-in, restricted to main, and uploads only dist", async () => {
  const workflow = await read(".github/workflows/deploy-pages.yml");
  const gate = "if: github.ref == 'refs/heads/main' && vars.ISLAND_PAGES_ENABLED == 'true'";
  assert.equal(workflow.split(gate).length - 1, 2);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /path: dist\n/);
  assert.match(workflow, /run: node --test tests\/\*\.test\.mjs/);
});
