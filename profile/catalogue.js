import { entries } from "../dist/content.js";
import { islandLayout } from "../dist/island-layout.js";
import { createCatalogue, siteTitle } from "../dist/catalogue.js";
import { profileConfig } from "./config.js";

export function profileContent(config = profileConfig, content = entries, layout = islandLayout) {
  if (!config.highlights.length || new Set(config.highlights).size !== config.highlights.length) throw new Error("Choose distinct profile highlight IDs");
  const catalogue = createCatalogue(content, layout.sites);
  function get(id) {
    const entry = catalogue.byId.get(id);
    if (!entry) throw new Error(`Unknown or unpublished profile entry: ${id}`);
    return entry;
  }
  function present(entry) {
    const links = entry.links || [];
    for (const link of links) {
      if (!/^https?:\/\//i.test(link.url)) throw new Error(`Unsupported profile link: ${entry.id}`);
    }
    return { id: entry.id, site: entry.site, title: entry.mapTitle || entry.title,
      description: entry.summary || entry.lede, links,
      href: new URL(`#${entry.kind === "project" ? "project" : "entry"}-${entry.id}`, config.siteUrl).href };
  }
  const introduction = present(get(config.introduction));
  return {
    introduction,
    views: [
      { id: "overview", site: "overview", title: "Around the islands", frames: config.overviewFrames,
        description: introduction.description, href: config.siteUrl, links: [{ label: "Explore the interactive island", url: config.siteUrl }] },
      ...config.highlights.map(id => ({ ...present(get(id)), frames: config.highlightFrames })),
    ],
    labels: [...catalogue.bySite].filter(([, items]) => items.length).map(([site, items]) => ({
      site, text: siteTitle(items, layout.sites[site]), point: layout.sites[site].label,
    })),
  };
}
