import chroma from 'chroma-js';

import { adaptColorToBackground, backgroundIsDark } from './contrast';

import type { ColumnValues } from '@/features/circuit-nodes/types';
import type { CategoricalLegendEntry, ColorMapping, ContinuousLegend } from './types';

/**
 * default neuron color when not coloring by a property. kept stable (never
 * random) and aligned with the viewer's native blue look.
 */
export const DEFAULT_NEURON_COLOR = '#2b5cd9';

/**
 * Per-section-type neuron colors, for a cell shown on its own.
 *
 * With one cell on screen there is nothing to tell apart, so color carries which part of the
 * neuron a branch belongs to. Several cells use a flat color each instead. Values match the
 * SONATA circuit loader.
 */
export const SECTION_TYPE_COLORS = {
  soma: '#aaa',
  axon: '#39F',
  apicalDendrite: '#b2f',
  basalDendrite: '#f55',
  myelin: '#ff0',
  unknown: '#f80',
} as const;

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

/** golden angle: rotating hue by this each step spreads colors evenly */
const GOLDEN_ANGLE = 137.508;
/** OKLCH lightness bands cycled through to separate colors sharing close hues */
const GENERATED_LIGHTNESS = [0.72, 0.55, 0.85];
/** OKLCH chroma for generated colors (moderate, stays legible on either bg) */
const GENERATED_CHROMA = 0.14;

/**
 * cap on distinct colors: the viewer bakes one palette texture column per
 * distinct color, so this keeps that texture well within WebGL's max size. 1024
 * is far beyond human color discrimination, so cycling past it is imperceptible.
 */
export const MAX_DISTINCT_COLORS = 1024;

/**
 * stable color for the Nth category. The first entries reuse the curated
 * colorblind-safe {@link CATEGORICAL_PALETTE}; beyond it we generate
 * perceptually-spread colors by rotating hue (golden angle) across a few
 * lightness bands, so large categorical properties get distinct colors instead
 * of recycling the base palette. Distinct colors are bounded by
 * {@link MAX_DISTINCT_COLORS}.
 */
export function categoricalColor(index: number): string {
  const base = CATEGORICAL_PALETTE.length;
  if (index < base) return CATEGORICAL_PALETTE[index];
  // wrap generated colors so the viewer's palette texture stays bounded
  const n = (index - base) % (MAX_DISTINCT_COLORS - base);
  const hue = (n * GOLDEN_ANGLE) % 360;
  const lightness = GENERATED_LIGHTNESS[n % GENERATED_LIGHTNESS.length];
  return chroma.oklch(lightness, GENERATED_CHROMA, hue).hex();
}

interface BuildArgs {
  property: string;
  /** the whole column, in the compact form the worker hands back */
  column: ColumnValues;
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
 * turn a whole column into a stable color mapping plus the legend needed to
 * render the key. chooses a categorical key or a continuous scale bar based on
 * the column kind and cardinality. User `overrides` (value → hex) are folded
 * into both the legend and the palette; a `background` (adaptive mode) keeps
 * every color legible against it. The per-node side is a palette column per
 * node — nothing here allocates a JS value per node.
 */
export function buildColorMapping({
  property,
  column,
  overrides,
  background,
}: BuildArgs): ColorMapping {
  if (column.kind === 'categorical') {
    return buildCategoricalColumn(property, column.library, column.indices, overrides, background);
  }
  if (column.kind === 'numeric') {
    return exceedsDistinct(column.values, NUMERIC_CATEGORICAL_MAX)
      ? buildContinuous(property, column.values, background)
      : buildNumericKey(property, column.values, overrides, background);
  }
  return buildStringKey(property, column.values, overrides, background);
}

type NumericColumn = Float32Array | Float64Array | Uint32Array;

/**
 * the categorical key: a legend entry per distinct value (in `ordered` order,
 * which is what fixes each value's color), plus the bounded palette and each
 * value's column in it. Values whose colors coincide — the generated palette
 * cycles past MAX_DISTINCT_COLORS — share a column, which keeps the palette (a
 * texture in the viewer) bounded however many values the column holds.
 */
function buildKey(
  ordered: readonly { value: string; count: number }[],
  overrides?: Record<string, string>,
  background?: string
): {
  categorical: CategoricalLegendEntry[];
  palette: string[];
  columnByValue: Map<string, number>;
} {
  // background-adapt each *palette* color at most once. Palette colors repeat
  // every MAX_DISTINCT_COLORS, so this stays cheap even for huge cardinality.
  const tuneCache = new Map<string, string>();
  const tuned = (raw: string): string => {
    const cached = tuneCache.get(raw);
    if (cached) return cached;
    const out = tune(raw, background);
    tuneCache.set(raw, out);
    return out;
  };
  const palette: string[] = [];
  const columnByColor = new Map<string, number>();
  const columnByValue = new Map<string, number>();
  const categorical = ordered.map(({ value, count }, index) => {
    // rawColor is what the user owns/edits (their override or the base palette
    // color); color is its background-adapted display used by the swatch + 3D.
    const rawColor = overrides?.[value] ?? categoricalColor(index);
    const color = tuned(rawColor);
    let column = columnByColor.get(color);
    if (column === undefined) {
      column = palette.length;
      columnByColor.set(color, column);
      palette.push(color);
    }
    columnByValue.set(value, column);
    return { value, color, rawColor, count };
  });
  return { categorical, palette, columnByValue };
}

/** a categorical column: the key from its library, the per-node pass on its indices */
function buildCategoricalColumn(
  property: string,
  library: string[],
  indices: Uint32Array,
  overrides?: Record<string, string>,
  background?: string
): ColorMapping {
  // occurrences per library slot. Indices past the library (malformed files)
  // count under their own `String(slot)` name, as they always have.
  let slotCount = library.length;
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] >= slotCount) slotCount = indices[i] + 1;
  }
  const counts = new Uint32Array(slotCount);
  for (let i = 0; i < indices.length; i++) counts[indices[i]] += 1;

  // distinct *present* values, merged by name in case a library repeats one
  const slotsByName = new Map<string, { count: number; slots: number[] }>();
  for (let slot = 0; slot < slotCount; slot++) {
    if (counts[slot] === 0) continue;
    const name = library[slot] ?? String(slot);
    const entry = slotsByName.get(name);
    if (entry) {
      entry.count += counts[slot];
      entry.slots.push(slot);
    } else {
      slotsByName.set(name, { count: counts[slot], slots: [slot] });
    }
  }
  // deterministic order: sort distinct values (numeric-aware) so colors are stable
  const ordered = [...slotsByName.entries()]
    .map(([value, entry]) => ({ value, ...entry }))
    .sort((a, b) => compareValues(a.value, b.value));

  const { categorical, palette, columnByValue } = buildKey(ordered, overrides, background);
  const slotToColumn = new Uint16Array(slotCount);
  for (const { value, slots } of ordered) {
    const column = columnByValue.get(value) ?? 0;
    for (const slot of slots) slotToColumn[slot] = column;
  }
  const columnByNode = new Uint16Array(indices.length);
  for (let i = 0; i < indices.length; i++) columnByNode[i] = slotToColumn[indices[i]];
  return { mode: 'categorical', property, palette, columnByNode, categorical };
}

/** a numeric column below the cardinality threshold: keyed, like a categorical one */
function buildNumericKey(
  property: string,
  values: NumericColumn,
  overrides?: Record<string, string>,
  background?: string
): ColorMapping {
  const counts = new Map<number, number>();
  for (let i = 0; i < values.length; i++) {
    counts.set(values[i], (counts.get(values[i]) ?? 0) + 1);
  }
  // deterministic order: sort distinct values (numeric-aware) so colors are stable
  const ordered = [...counts.entries()]
    .map(([key, count]) => ({ key, value: String(key), count }))
    .sort((a, b) => compareValues(a.value, b.value));

  const { categorical, palette, columnByValue } = buildKey(ordered, overrides, background);
  const columnByKey = new Map<number, number>();
  for (const { key, value } of ordered) columnByKey.set(key, columnByValue.get(value) ?? 0);
  const columnByNode = new Uint16Array(values.length);
  for (let i = 0; i < values.length; i++) columnByNode[i] = columnByKey.get(values[i]) ?? 0;
  return { mode: 'categorical', property, palette, columnByNode, categorical };
}

/** a string column: keyed whatever its cardinality — a ramp over names means nothing */
function buildStringKey(
  property: string,
  values: string[],
  overrides?: Record<string, string>,
  background?: string
): ColorMapping {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  // deterministic order: sort distinct values (numeric-aware) so colors are stable
  const ordered = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => compareValues(a.value, b.value));

  const { categorical, palette, columnByValue } = buildKey(ordered, overrides, background);
  const columnByNode = new Uint16Array(values.length);
  for (let i = 0; i < values.length; i++) columnByNode[i] = columnByValue.get(values[i]) ?? 0;
  return { mode: 'categorical', property, palette, columnByNode, categorical };
}

function buildContinuous(
  property: string,
  values: NumericColumn,
  background?: string
): ColorMapping {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const span = max - min || 1;
  // the quantized ramp *is* the palette: every node samples one of its stops,
  // which keeps the viewer's palette texture bounded however many distinct
  // values the column holds
  const palette = new Array<string>(CONTINUOUS_STOPS);
  for (let stop = 0; stop < CONTINUOUS_STOPS; stop++) {
    palette[stop] = tune(viridisColor(stop / (CONTINUOUS_STOPS - 1)), background);
  }
  const columnByNode = new Uint16Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    // non-finite values sit on the low stop, as they always have
    if (Number.isFinite(value)) {
      columnByNode[i] = Math.round(((value - min) / span) * (CONTINUOUS_STOPS - 1));
    }
  }
  const gradient = viridisGradient().map((c) => tune(c, background));
  const continuous: ContinuousLegend = { min, max, gradient };
  return { mode: 'continuous', property, palette, columnByNode, continuous };
}
/**
 * More than `limit` distinct values, answered without a pass over the column.
 *
 * The threshold is the only thing that ever asks, and on a continuous property
 * the thirteenth distinct value arrives within the first few nodes, so this
 * stops there — deciding by looking at the whole column would take longer than
 * everything the answer is used for.
 */
function exceedsDistinct(values: NumericColumn, limit: number): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < values.length; i++) {
    seen.add(values[i]);
    if (seen.size > limit) return true;
  }
  return false;
}

/** numeric-aware comparison so "2" sorts before "10" */
function compareValues(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

/** Palette slot for a block name: its trailing ordinal, else a hash. */
export function blockPaletteIndex(name: string, slotCount: number): number {
  const ordinal = /(\d+)\s*$/.exec(name);
  if (ordinal) return Number(ordinal[1]) % slotCount;
  return hashName(name) % slotCount;
}

/** FNV-1a. */
function hashName(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Push a marker back when its block is not selected.
 *
 * Not grey: a small grey marker loses the cue that says which block it is. Stays opaque —
 * a translucent marker lets the circuit show through it.
 */
export function recedeMarkerColor(color: string, background: string): string {
  try {
    return chroma.mix(chroma(color).desaturate(1.4), background, 0.18, 'oklab').hex();
  } catch {
    return color;
  }
}

/**
 * Paint for a population that is drawn but not the one on show.
 *
 * The default neuron colour drained of its saturation and pushed most of the
 * way to the background: still a shape the eye can find and click, no longer a
 * colour competing with the population on show. Opaque, like
 * {@link recedeMarkerColor}, and for the same reason.
 */
export function recededNeuronColor(background: string): string {
  try {
    // Two steps, not one: contrast is not symmetric, and a dark grey on black
    // disappears long before the same step of light grey on white does.
    const step = backgroundIsDark(background) ? 0.3 : 0.55;
    return chroma.mix(chroma(DEFAULT_NEURON_COLOR).desaturate(3), background, step, 'oklab').hex();
  } catch {
    return DEFAULT_NEURON_COLOR;
  }
}

/** Colour for a block's morphology-location markers. */
export function morphologyLocationsColor(entry: string): string {
  return categoricalColor(blockPaletteIndex(entry, MORPHOLOGY_LOCATION_COLOR_SLOTS));
}

/** Bounded so the viewer's palette texture stays small. */
const MORPHOLOGY_LOCATION_COLOR_SLOTS = 12;
