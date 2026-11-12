/**
 * The landing's logo and words are in the page's first HTML (`LandingFirstPaint`), so they come in at once,
 * before the app has loaded. The live landing takes over from that copy once its own words and logo are in
 * place under it and the copy's entrance is over, so the hand-over shows nothing.
 */

/** How long the logo and words take to come in, from the first of them starting, ms (first-paint and live CSS). */
export const LANDING_WORDS_IN_MS = 950;

const copy = () => document.querySelector<HTMLElement>('[data-landing-first-paint]');

/** Whether the first-paint copy is still showing (not on phones, where it is not drawn). */
export function firstPaintShown() {
  const el = copy();
  return !!el && !('handedOff' in el.dataset) && getComputedStyle(el).display !== 'none';
}

/** When the words began coming in on the performance clock: the copy's, else the given element's, else now. */
export function wordsBegan(live?: Element | null) {
  for (const el of [firstPaintShown() ? copy()?.querySelector('span') : null, live]) {
    // (not every browser, nor jsdom, has getAnimations)
    const start = el?.getAnimations?.()[0]?.startTime;
    if (typeof start === 'number') return start;
  }
  return performance.now();
}

/** Called by the live words and the live logo once each is in place; the copy goes when both are. */
export function firstPaintReady(part: 'words' | 'logo') {
  const el = copy();
  if (!el || 'handedOff' in el.dataset) return;
  el.dataset[part] = '';
  if (!('words' in el.dataset) || !('logo' in el.dataset)) return;
  const wait = Math.max(0, wordsBegan() + LANDING_WORDS_IN_MS - performance.now());
  // (what replaces it is laid out under it, hidden while it shows: landing-first-paint.module.css)
  window.setTimeout(() => {
    el.dataset.handedOff = '';
  }, wait);
}
