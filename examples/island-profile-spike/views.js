import { entries } from "../../dist/content.js";
import { islandLayout } from "../../dist/island-layout.js";
import { createCatalogue, siteTitle } from "../../dist/catalogue.js";

const catalogue = createCatalogue(entries, islandLayout.sites);
export const mapLabels = [...catalogue.bySite].filter(([, contents]) => contents.length).map(([site, contents]) => ({
  site, text: siteTitle(contents, islandLayout.sites[site]), point: islandLayout.sites[site].label,
}));

// Keep the navigation order explicit; everything else comes from the catalogue.
export const views = [
  { id: "overview", site: "overview", title: "Around the islands", frames: 96, description: "A small collection of ideas, scattered across the islands.", href: "https://jasvir.github.io/" },
  ...["two-dozen", "homepage", "secretseal", "trapdoor"].map(id => {
    const entry = catalogue.byId.get(id);
    return {
      id, site: entry.site, frames: 32,
      title: entry.mapTitle || entry.title,
      description: entry.summary || entry.lede,
      href: `https://jasvir.github.io/#${entry.kind === "project" ? "project" : "entry"}-${id}`,
      links: entry.links,
    };
  }),
];
