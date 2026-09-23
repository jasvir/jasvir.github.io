export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function cardLayout(view, width = 600, height = 360) {
  const lines = [];
  let line = "";
  for (const word of view.description.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 46 && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  const cardWidth = 350, cardHeight = 60 + lines.length * 19;
  return { lines, width: cardWidth, height: cardHeight,
    x: (width - cardWidth) / 2, y: (height - cardHeight) / 2,
    startX: width - cardWidth * .78 - 12, startY: height - cardHeight * .78 - 12 };
}

export function cardMarkup(view, width = 600, height = 360) {
  const card = cardLayout(view, width, height);
  return `<g class="popup" style="--card-start:translate(${card.startX}px,${card.startY}px) scale(.78);--card-end:translate(${card.x}px,${card.y}px) scale(1)">
<rect width="${card.width}" height="${card.height}" rx="12" fill="#fffdf8" stroke="#d00dad" stroke-width="1.5"/>
<text x="20" y="31" fill="#a3088a" font-size="18" font-weight="700">${escapeHtml(view.title)}</text>
<text x="20" y="57" fill="#21383a" font-size="13">${card.lines.map((line, i) => `<tspan x="20" dy="${i ? 19 : 0}">${escapeHtml(line)}</tspan>`).join("")}</text>
</g>`;
}

export const cardStyles = `
.popup{font-family:system-ui,sans-serif;transform:var(--card-end);opacity:1;animation:card-arrival 4.8s linear 1 both}
@keyframes card-arrival{
0%,33.33333%{opacity:0;transform:var(--card-start);animation-timing-function:ease-out}
40%{opacity:1;transform:var(--card-start);animation-timing-function:ease-in-out}
60%,100%{opacity:1;transform:var(--card-end)}
}
@media(prefers-reduced-motion:reduce){.popup{animation:none}}
`;
