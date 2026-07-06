import { adaptColorToBackground } from './contrast';

import type { ColumnKind } from '@/features/circuit-nodes/types';
import type { CategoricalLegendEntry, ColorMapping, ContinuousLegend } from './types';

/**
 * default neuron color when not coloring by a property. kept stable (never
 * random) and aligned with the viewer's native blue look.
 */
export const DEFAULT_NEURON_COLOR = '#2b5cd9';

/**
 * colorblind-safe categorical palette: the Okabe–Ito set (minus black, which
 * disappears on dark backgrounds) extended with a few Tableau-10 hues. Ordering
 * is fixed so the same category always maps to the same color across sessions
 */
export const CATEGORICAL_PALETTE: readonly string[] = [
  '#0072b2', // blue
  '#e69f00', // orange
  '#009e73', // bluish green
  '#cc79a7', // reddish purple
  '#d55e00', // vermillion
  '#56b4e9', // sky blue
  '#f0e442', // yellow
  '#8c564b', // brown (Tableau)
  '#e377c2', // pink (Tableau)
  '#17becf', // cyan (Tableau)
  '#bcbd22', // olive (Tableau)
  '#7f7f7f', // gray (Tableau)
];

/**
 * above this many distinct numeric categorical values we switch from a discrete
 * key to a continuous color range (per the acceptance criteria)
 */
export const NUMERIC_CATEGORICAL_MAX = 12;

/** viridis anchor stops (perceptually uniform, colorblind-friendly), low → high */
const VIRIDIS_STOPS: readonly [number, number, number][] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

/** number of quantization stops used to bound the palette for continuous data */
export const CONTINUOUS_STOPS = 64;

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** sample the viridis ramp at t in [0, 1] */
export function viridisColor(t: number): string {
  const clamped = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  const scaled = clamped * (VIRIDIS_STOPS.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = VIRIDIS_STOPS[i];
  const b = VIRIDIS_STOPS[Math.min(i + 1, VIRIDIS_STOPS.length - 1)];
  return rgbToHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

/** a coarse gradient used to render the continuous scale bar */
export function viridisGradient(steps = 10): string[] {
  return Array.from({ length: steps }, (_, i) => viridisColor(i / (steps - 1)));
}

export function categoricalColor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}

interface BuildArgs {
  property: string;
  kind: ColumnKind;
  /** property value per node, aligned by node index (string or number) */
  values: (string | number)[];
  /** optional user color overrides for this property (value → hex) */
  overrides?: Record<string, string>;
  /**
   * canvas background. when set (background-adaptive mode), every color is
   * lightness-adjusted to stay legible against it; when omitted, colors are the
   * fixed palette (default behavior).
   */
  background?: string;
}

/** the default neuron color, adapted to the background when adaptive mode is on */
export function defaultNeuronColor(background?: string): string {
  return background
    ? adaptColorToBackground(DEFAULT_NEURON_COLOR, background)
    : DEFAULT_NEURON_COLOR;
}

/** adapt `color` to `background` only when a background is provided */
function tune(color: string, background?: string): string {
  return background ? adaptColorToBackground(color, background) : color;
}

/**
 * turn a column of per-node property values into a stable color mapping plus the
 * legend needed to render the key. chooses a categorical key or a continuous
 * scale bar based on the property kind and cardinality. User `overrides` (value
 * → hex) are folded into both the legend and the per-node colors; a `background`
 * (adaptive mode) keeps every color legible against it
 */
export function buildColorMapping({
  property,
  kind,
  values,
  overrides,
  background,
}: BuildArgs): ColorMapping {
  const distinct = new Set(values.map((v) => String(v)));
  const treatAsContinuous = kind === 'numeric' && distinct.size > NUMERIC_CATEGORICAL_MAX;

  return treatAsContinuous
    ? buildContinuous(property, values, background)
    : buildCategorical(property, values, overrides, background);
}

function buildCategorical(
  property: string,
  values: (string | number)[],
  overrides?: Record<string, string>,
  background?: string
): ColorMapping {
  // deterministic order: sort distinct values (numeric-aware) so colors are stable
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ordered = [...counts.keys()].sort(compareValues);
  const colorByValue = new Map<string, string>();
  const categorical: CategoricalLegendEntry[] = ordered.map((value, index) => {
    const color = tune(overrides?.[value] ?? categoricalColor(index), background);
    colorByValue.set(value, color);
    return { value, color, count: counts.get(value) ?? 0 };
  });
  const fallback = defaultNeuronColor(background);
  const colorsByNode = values.map((v) => colorByValue.get(String(v)) ?? fallback);
  return { mode: 'categorical', property, colorsByNode, categorical };
}

function buildContinuous(
  property: string,
  values: (string | number)[],
  background?: string
): ColorMapping {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const nums = values.map((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) {
      min = Math.min(min, n);
      max = Math.max(max, n);
    }
    return n;
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const span = max - min || 1;
  // adapt the bounded ramp once (≤ CONTINUOUS_STOPS distinct colors), then reuse
  const rampCache = new Map<string, string>();
  const ramp = (raw: string): string => {
    const cached = rampCache.get(raw);
    if (cached) return cached;
    const tuned = tune(raw, background);
    rampCache.set(raw, tuned);
    return tuned;
  };
  // quantize into CONTINUOUS_STOPS colors so the viewer palette stays bounded
  const colorsByNode = nums.map((n) => {
    const t = Number.isFinite(n) ? (n - min) / span : 0;
    const step = Math.round(t * (CONTINUOUS_STOPS - 1)) / (CONTINUOUS_STOPS - 1);
    return ramp(viridisColor(step));
  });
  const gradient = viridisGradient().map((c) => tune(c, background));
  const continuous: ContinuousLegend = { min, max, gradient };
  return { mode: 'continuous', property, colorsByNode, continuous };
}

/** numeric-aware comparison so "2" sorts before "10" */
function compareValues(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}
