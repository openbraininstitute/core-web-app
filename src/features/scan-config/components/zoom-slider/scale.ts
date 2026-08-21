/**
 * Zoom range the viewer allows, restated rather than imported.
 *
 * Importing from the package would pull `@tolokoban/tgd` — which touches `document` at
 * module scope — into server renders.
 */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 100;

/** Keep a zoom inside the range the viewer allows. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/**
 * A zoom as the ruler shows it: `0.25x`, `2.4x`, `48x`.
 *
 * Decimals only below 10x, where they are the difference between two readable views.
 */
export function formatZoom(zoom: number): string {
  const clamped = clampZoom(zoom);
  if (clamped >= 10) return `${Math.round(clamped)}x`;
  if (clamped < 1) return `${Number(clamped.toFixed(2))}x`;
  return `${Number(clamped.toFixed(1))}x`;
}
