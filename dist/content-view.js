import { entries } from "./content.js";
import { islandLayout } from "./island-layout.js";
import { createCatalogue } from "./catalogue.js";
import { writingPosts } from "./writing-posts.js";

const catalogue = createCatalogue(entries, islandLayout.sites);
const dialog = document.querySelector("#project-dialog");
const closeButton = dialog.querySelector(".dialog-close");
const fields = Object.fromEntries(
  ["stop", "district", "icon", "type", "title", "lede", "question", "work", "mode", "signal"]
    .map((name) => [name, dialog.querySelector(`#dialog-${name}`)]),
);
let lastTrigger = null;
let returnHash = "#top";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function linkElement(link) {
  const node = element("a", "", link.label);
  node.href = link.url;
  node.target = "_blank";
  node.rel = "noreferrer";
  return node;
}

function recentPosts(site) {
  if (site === "writing") return writingPosts.regular;
  if (site === "twoDozen") return writingPosts.twoDozen;
  return null;
}

function moreLink(site) {
  return site === "writing"
    ? { label: "Show more...", url: "https://www.recursiverhymes.com/archive" }
    : { label: "See more...", url: "https://www.recursiverhymes.com/s/two-dozen" };
}

function postList(posts) {
  const list = element("ol");
  list.append(...posts.slice(0, 3).map((post) => {
    const item = element("li");
    item.append(linkElement({ label: post.title, url: post.url }));
    return item;
  }));
  return list;
}

function postPreview(site) {
  const preview = element("nav", "post-preview");
  preview.setAttribute("aria-label", `Recent ${site === "writing" ? "Recursive Rhymes" : "Two Dozen"} posts`);
  preview.append(
    element("h3", "post-preview-heading", "Latest posts"),
    postList(recentPosts(site)),
    linkElement(moreLink(site)),
  );
  preview.lastChild.className = "post-preview-more";
  return preview;
}

function entryButton(entry, text = entry.title) {
  const button = element("button", "", text);
  button.type = "button";
  button.dataset.project = entry.id;
  button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", () => openProject(entry.id, button));
  return button;
}

export function openSite(site, trigger = document.querySelector(`[data-site="${site}"]`)) {
  const first = catalogue.bySite.get(site)?.[0];
  if (first) openProject(first.id, trigger);
}

export function openProject(id, trigger = null) {
  const entry = catalogue.byId.get(id);
  if (!entry) return;
  // Keep the original map/directory trigger when switching entries inside the popup.
  if (!dialog.open) {
    lastTrigger = trigger;
    returnHash = /^#(?:entry|project)-/.test(location.hash) ? "#projects" : location.hash || "#top";
  }
  const site = islandLayout.sites[entry.site];
  fields.stop.textContent = entry.stop || entry.kind;
  fields.district.textContent = entry.district || site.name;
  fields.icon.textContent = entry.icon || site.icon || "✦";
  fields.type.textContent = entry.type || entry.kind;
  fields.title.textContent = entry.title;
  fields.lede.textContent = entry.lede || entry.summary;
  for (const name of ["question", "work", "mode", "signal"]) {
    fields[name].textContent = entry[name] || "";
    fields[name].parentElement.hidden = !entry[name];
  }
  dialog.querySelector(".dialog-details").hidden = !(entry.question || entry.work);
  dialog.querySelector(".dialog-facts").hidden = !(entry.mode || entry.signal);
  const actions = dialog.querySelector(".dialog-actions");
  actions.replaceChildren(...entry.links.map(linkElement));
  actions.hidden = !entry.links.length || entry.site === "twoDozen";
  const recent = dialog.querySelector(".dialog-recent");
  const posts = recentPosts(entry.site);
  recent.hidden = !posts;
  if (posts) {
    const more = linkElement(moreLink(entry.site));
    more.className = "dialog-recent-more";
    recent.replaceChildren(element("h3", "", "Latest posts"), postList(posts), more);
  }

  const neighbors = catalogue.bySite.get(entry.site).filter((item) => item.id !== id);
  const shelf = dialog.querySelector(".dialog-shelf");
  shelf.hidden = !neighbors.length;
  shelf.querySelector(".shelf-entries").replaceChildren(...neighbors.map((item) => entryButton(item)));

  if (!dialog.open) dialog.showModal();
  document.body.classList.add("dialog-open");
  history.replaceState(null, "", `#${entry.kind === "project" ? "project" : "entry"}-${id}`);
  dialog.scrollTop = 0;
  closeButton.focus({ preventScroll: true });
}

closeButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  history.replaceState(null, "", `${location.pathname}${location.search}${returnHash}`);
  lastTrigger?.focus({ preventScroll: true });
});

// One sign per building, regardless of how many articles it holds.
const labelLayer = document.querySelector(".scene-label-layer");
for (const [key, site] of Object.entries(islandLayout.sites)) {
  const contents = catalogue.bySite.get(key);
  if (!contents.length) continue;
  const first = contents[0];
  const hasPreview = Boolean(recentPosts(key));
  const sign = element(hasPreview ? "div" : "button",
    `building-sign${["cottages", "sign"].includes(site.model) ? " place-sign" : ""}${hasPreview ? " writing-sign" : ""}`);
  if (!hasPreview) sign.type = "button";
  sign.id = `sign-${first.id}`;
  sign.dataset.site = key;
  sign.dataset.world = site.label.join(",");
  const trigger = hasPreview ? element("button", "sign-trigger") : sign;
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-label", `Visit ${contents.length > 1 ? site.name : first.title}`);
  const pin = element("span", "sign-pin", site.icon || "✦");
  pin.setAttribute("aria-hidden", "true");
  const copy = element("span", "sign-copy");
  if (contents.length > 1 || !["cottages", "sign"].includes(site.model)) {
    copy.append(element("small", "", contents.length > 1 ? `${contents.length} things to explore` : site.name));
  }
  copy.append(element("strong", "", contents.length > 1 ? site.name : first.mapTitle || first.title));
  if (!hasPreview && first.hoverDescription) {
    const description = element("span", "sign-description", first.hoverDescription);
    description.id = `sign-description-${first.id}`;
    trigger.setAttribute("aria-describedby", description.id);
    copy.append(description);
  }
  trigger.append(pin, copy);
  if (hasPreview) sign.append(trigger, postPreview(key));
  sign.addEventListener("click", (event) => {
    if (event.target.closest(".post-preview")) return;
    openSite(key, trigger);
  });
  labelLayer.append(sign);
}
islandLayout.constructionLabels.forEach(({ position, text }) => {
  const sign = element("div", "construction-label");
  const icon = element("span", "", "⌁ ");
  icon.setAttribute("aria-hidden", "true");
  sign.dataset.world = position.join(",");
  sign.append(icon, document.createTextNode(text));
  labelLayer.append(sign);
});

const board = document.querySelector(".station-board");
catalogue.directory.forEach((entry, index) => {
  const row = element("article", "board-row");
  const button = entryButton(entry, "");
  button.className = "project-select";
  const copy = element("span", "board-copy");
  copy.append(
    element("small", "", `${islandLayout.sites[entry.site].name} · ${entry.kind}`),
    element("strong", "", entry.title),
    element("span", "", entry.summary || entry.lede),
  );
  const arrow = element("span", "open-mark", "↗");
  arrow.setAttribute("aria-hidden", "true");
  button.append(element("span", "route-number", String(index + 1).padStart(2, "0")), copy, arrow);
  const links = element("div", "board-links");
  links.append(...entry.links.map(linkElement));
  row.append(button, links);
  board.append(row);
});

function openRequestedEntry() {
  const id = location.hash.match(/^#(?:project|entry)-(.+)$/)?.[1];
  if (id) openProject(id);
}
window.addEventListener("hashchange", openRequestedEntry);
document.querySelectorAll("[data-open-site]").forEach((button) => {
  button.addEventListener("click", () => openSite(button.dataset.openSite, button));
});
openRequestedEntry();
