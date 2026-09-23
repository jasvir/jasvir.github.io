import { Vector3 } from "three";

// Screen-facing labels travel with their saved building anchors. Drawing happens
// after WebGL so the labels are captured in the SVG, not just the preview DOM.
export function drawMapLabels(context, camera, labels, width, height, selectedSite) {
  const projected = new Vector3();
  context.save();
  context.font = "600 12px system-ui, sans-serif";
  const candidates = labels.map(label => {
    projected.set(...label.point).project(camera);
    if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.15 || Math.abs(projected.y) > 1.15) return null;
    return { ...label, anchorX: (projected.x + 1) * width / 2, anchorY: (1 - projected.y) * height / 2,
      width: Math.ceil(context.measureText(label.text).width) + 22, height: 25 };
  }).filter(Boolean).sort((a, b) => Number(b.site === selectedSite) - Number(a.site === selectedSite));
  const placed = [];
  for (const label of candidates) {
    let best;
    for (const dy of [-32, -62, -92, 2, 32, 62, 92, -122]) {
      for (const dx of [0, -45, 45, -90, 90, -150, 150]) {
        const x = Math.max(6, Math.min(width - label.width - 6, label.anchorX - label.width / 2 + dx));
        const y = Math.max(6, Math.min(height - label.height - 6, label.anchorY + dy));
        const overlap = placed.reduce((sum, box) => sum + Math.max(0, Math.min(x + label.width + 4, box.x + box.width) - Math.max(x - 4, box.x)) * Math.max(0, Math.min(y + label.height + 4, box.y + box.height) - Math.max(y - 4, box.y)), 0);
        const cost = overlap * 1000 + Math.hypot(x + label.width / 2 - label.anchorX, y + label.height - label.anchorY);
        if (!best || cost < best.cost) best = { x, y, cost };
      }
    }
    placed.push({ ...label, ...best });
  }
  // Draw connectors first so none cut across a label.
  for (const label of placed) {
    context.strokeStyle = "rgba(70,85,77,.55)";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(label.anchorX, label.anchorY);
    context.lineTo(label.x + label.width / 2, label.y + label.height / 2); context.stroke();
  }
  for (const label of placed) {
    const selected = label.site === selectedSite;
    context.fillStyle = selected ? "#f9e9f6" : "rgba(255,253,248,.96)";
    context.strokeStyle = selected ? "#d00dad" : "#c6d1c5";
    context.lineWidth = selected ? 1.5 : 1;
    context.beginPath(); context.roundRect(label.x, label.y, label.width, label.height, 7); context.fill(); context.stroke();
    context.fillStyle = "#d00dad";
    context.beginPath(); context.arc(label.x + 8, label.y + 12.5, 2.5, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#21383a";
    context.textBaseline = "middle";
    context.fillText(label.text, label.x + 15, label.y + 12.5);
  }
  context.restore();
  return placed;
}
