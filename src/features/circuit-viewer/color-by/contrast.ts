import chroma from 'chroma-js';

/**
 * in-house flag: when true, node colors, the legend, and the scalebar adapt to
 * the canvas background so everything stays legible. Canvas background is
 * restricted to {@link CANVAS_LIGHT} or {@link CANVAS_DARK}.
 */
export const BACKGROUND_ADAPTIVE = true;

export const CANVAS_LIGHT = '#ffffff';
export const CANVAS_DARK = '#000000';

/** minimum WCAG contrast ratio a mark must keep against the background. */
const MIN_CONTRAST = 3;

const LIGHT_THEME: ViewerTheme = {
  isDark: false,
  foreground: 'rgb(64,64,64)',
  mutedForeground: 'rgb(115,115,115)',
  panelBackground: 'rgba(255,255,255,0.85)',
  panelRing: 'rgba(0,0,0,0.05)',
};

const DARK_THEME: ViewerTheme = {
  isDark: true,
  foreground: 'rgba(255,255,255,0.92)',
  mutedForeground: 'rgba(255,255,255,0.6)',
  panelBackground: 'rgba(20,20,25,0.65)',
  panelRing: 'rgba(255,255,255,0.14)',
};

/** chrome theme tokens for the viewer chrome, derived from the background. */
export interface ViewerTheme {
  isDark: boolean;
  foreground: string;
  mutedForeground: string;
  panelBackground: string;
  panelRing: string;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** coerce any stored value to one of the two supported canvas backgrounds */
export function normalizeCanvasBackground(color: string): typeof CANVAS_LIGHT | typeof CANVAS_DARK {
  const hex = color.trim().toLowerCase();
  if (hex === '#000' || hex === '#000000' || hex === 'black') return CANVAS_DARK;
  return CANVAS_LIGHT;
}

export function backgroundIsDark(background: string): boolean {
  return normalizeCanvasBackground(background) === CANVAS_DARK;
}

/**
 * keep a color's hue + chroma but push lightness toward the side that reads on
 * a black or white canvas. Cheap and deterministic; safe to call per color.
 */
export function adaptColorToBackground(color: string, background: string): string {
  let parsed: chroma.Color;
  try {
    parsed = chroma(color);
  } catch {
    return color;
  }

  const dark = backgroundIsDark(background);
  const [L, C, H] = parsed.oklch();
  const chromaC = Number.isFinite(C) ? C : 0;
  const hue = Number.isFinite(H) ? H : 0;
  const step = dark ? 0.06 : -0.06;
  let l = Number.isFinite(L) ? L : 0.5;

  for (let i = 0; i < 12; i++) {
    const candidate = chroma.oklch(clamp01(l), chromaC, hue);
    if (chroma.contrast(candidate, background) >= MIN_CONTRAST) return candidate.hex();
    const next = l + step;
    if (next <= 0 || next >= 1) break;
    l = next;
  }

  return chroma.oklch(clamp01(l), chromaC, hue).hex();
}

/** chrome theme for a black or white canvas background */
export function themeFromBackground(background: string): ViewerTheme {
  return viewerTheme(backgroundIsDark(background));
}

export function viewerTheme(isDark: boolean): ViewerTheme {
  return isDark ? DARK_THEME : LIGHT_THEME;
}
