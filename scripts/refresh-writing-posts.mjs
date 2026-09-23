import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writingPosts as savedPosts } from "../dist/writing-posts.js";

const feedUrl = "https://www.recursiverhymes.com/feed";
const output = new URL("../dist/writing-posts.js", import.meta.url);
// This introduction is pinned on the publication, not a recent story.
export const pinnedStoryUrls = new Set(["https://www.recursiverhymes.com/p/coming-soon"]);

function decodeEntities(value) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(
      code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code),
    ))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ({
      amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    })[name]);
}

function tag(block, name) {
  return decodeEntities(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseWritingFeed(xml) {
  const regular = [];
  const twoDozen = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = tag(block, "title");
    const url = tag(block, "link");
    const description = tag(block, "description");
    const date = new Date(tag(block, "pubDate"));
    if (!title || !url.startsWith("https://www.recursiverhymes.com/p/") || Number.isNaN(date.valueOf())) continue;
    const post = { title, url, publishedAt: date.toISOString() };
    (/(^|\W)Two Dozen(\W|$)/i.test(description) ? twoDozen : regular).push(post);
  }
  return { regular, twoDozen };
}

function newestThree(fresh, saved) {
  const byUrl = new Map([...saved, ...fresh].map((post) => [post.url, post]));
  return [...byUrl.values()]
    .filter((post) => !pinnedStoryUrls.has(post.url))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, 3);
}

export function refreshedSnapshot(feed, saved = savedPosts, refreshedAt = new Date().toISOString()) {
  const parsed = parseWritingFeed(feed);
  if (!parsed.regular.length && !parsed.twoDozen.length) throw new Error("No usable posts in the RSS feed");
  return {
    refreshedAt,
    regular: newestThree(parsed.regular, saved.regular),
    twoDozen: newestThree(parsed.twoDozen, saved.twoDozen),
  };
}

async function refresh() {
  const response = await fetch(feedUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`RSS feed returned ${response.status}`);
  const snapshot = refreshedSnapshot(await response.text());
  const previous = await readFile(output, "utf8");
  const next = `// Generated from ${feedUrl}; the checked-in copy is the offline fallback.\nexport const writingPosts = ${JSON.stringify(snapshot, null, 2)};\n`;
  if (next !== previous) await writeFile(output, next);
  process.stdout.write(`Updated writing previews: ${snapshot.regular.length} regular, ${snapshot.twoDozen.length} Two Dozen.\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  refresh().catch((error) => {
    // Keep the checked-in snapshot if the remote feed is temporarily unavailable.
    process.stderr.write(`Using saved writing previews: ${error.message}\n`);
  });
}
