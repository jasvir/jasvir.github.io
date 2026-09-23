// Shared timing for profile exports, the live demonstration and SVG playback.
export const journeySeconds = 4.8;
export const cardHoldSeconds = 15;
export const cardFadeSeconds = 0.6;
export const cycleSeconds = Number((journeySeconds + cardHoldSeconds + cardFadeSeconds).toFixed(3));
export const cyclePercent = seconds => `${(seconds / cycleSeconds * 100).toFixed(5)}%`;
export function loopJourneyProgress(elapsedSeconds) {
  const elapsed = Math.max(0, elapsedSeconds);
  return Math.min(1, (elapsed % cycleSeconds) / journeySeconds);
}
export const approachEnd = 1 / 3;
export const returnStart = 1 / 2;
export function journeyPhase(progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= approachEnd) return p / approachEnd;
  if (p <= returnStart) return 1;
  return (1 - p) / (1 - returnStart);
}
