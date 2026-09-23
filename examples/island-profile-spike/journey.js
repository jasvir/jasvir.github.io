// Shared timing for the live demonstration and script-free SVG playback.
export const journeySeconds = 4.8;
export const approachEnd = 1 / 3;
export const returnStart = 1 / 2;
export function journeyPhase(progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= approachEnd) return p / approachEnd;
  if (p <= returnStart) return 1;
  return (1 - p) / (1 - returnStart);
}
