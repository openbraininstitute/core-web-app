/**
 * The site's two looks: the original dark one, and the Open Brain Institute's
 * white and blue, as in core-web-app.
 *
 * The page is themed in CSS, keyed off the course root's data-theme — see
 * src/styles/learn.css; settings.ts saves the choice and puts it there. OBI's is
 * the default, here in the platform. Canvases can't
 * read CSS, so the colours they share with it (the screen every widget draws
 * on) come from here instead, looked up at draw time so a switch shows on the
 * very next frame.
 */

export type Theme = 'dark' | 'obi';

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'obi';
  return document.querySelector<HTMLElement>('[data-learn-root]')?.dataset.theme === 'dark'
    ? 'dark'
    : 'obi';
}

type RGB = readonly [number, number, number];

/**
 * What widgets draw on. Dark in both themes, because the voltage scale and the
 * glows are built for a dark background — at rest a neuron is drawn in a navy
 * that would vanish into OBI's own #002766 — so OBI's is its darkest navy.
 * `--screen` in learn.css mirrors `base`, for the canvases framed in CSS.
 */
const SCREEN: Record<Theme, { base: RGB; raised: RGB; top: string }> = {
  dark: { base: [7, 10, 19], raised: [15, 23, 42], top: '#0a0f1c' },
  obi: { base: [0, 16, 38], raised: [8, 32, 72], top: '#031a3d' },
};

const rgba = ([r, g, b]: RGB, alpha: number) =>
  alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;

/** The background a widget draws on — and the labels and outlines cut out of it. */
export function screen(alpha = 1): string {
  return rgba(SCREEN[getTheme()].base, alpha);
}

/** A shade lighter than the screen, for boxes that sit on it. */
export function raised(alpha = 1): string {
  return rgba(SCREEN[getTheme()].raised, alpha);
}

/** Top of the neuron view's gradient, which runs down into the screen colour. */
export function screenTop(): string {
  return SCREEN[getTheme()].top;
}
