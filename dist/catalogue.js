// Pure content indexing, shared by the page and the authoring checks.
export function createCatalogue(entries, sites) {
  const items = [];
  const bySite = new Map(Object.keys(sites).map((site) => [site, []]));
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.published === false) continue;
    const fail = (message) => { throw new Error(`Content “${id}”: ${message}`); };
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail("use a lowercase, URL-safe ID");
    if (!bySite.has(entry.site)) fail(`unknown site “${entry.site}”`);
    if (!["project", "article", "blog", "link", "about"].includes(entry.kind)) fail("unknown kind");
    if (!entry.title?.trim()) fail("a title is required");
    if (!(entry.lede || entry.summary)?.trim()) fail("a summary or lede is required");
    if (!Array.isArray(entry.links) || (!entry.links.length && entry.kind !== "about")) {
      fail("add at least one link");
    }
    entry.links.forEach((link) => {
      if (!link.label?.trim()) fail("every link needs a label");
      let url;
      try { url = new URL(link.url); } catch { fail(`invalid link “${link.url}”`); }
      if (!["https:", "http:"].includes(url.protocol)) fail("links must use http or https");
    });
    const item = { ...entry, id };
    items.push(item);
    bySite.get(entry.site).push(item);
  }
  return {
    items,
    byId: new Map(items.map((item) => [item.id, item])),
    bySite,
    directory: items.filter((item) => item.directory !== false),
  };
}
