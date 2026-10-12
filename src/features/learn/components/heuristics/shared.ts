/**
 * What the heuristic figures share: colour mixing, easing, a clock, neuron
 * drawing and paths, and a brain drawn from the side.
 */

export type RGB = [number, number, number];
export type Pt = { x: number; y: number };

export const mix = (a: RGB, b: RGB, k: number): RGB =>
  [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as RGB;
export const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** 0 → 1, eased, over a phase that starts `at` ms in and lasts `dur` ms. */
export const phase = (t: number, at: number, dur: number) => smooth((t - at) / dur);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const SERIF = "Georgia, 'Times New Roman', serif";

/** Every figure is this size, so switching between them never moves the slide. */
export const FIGURE_CLASS = 'h-[340px] w-full rounded-xl border border-slate-800';

/**
 * The slides the heuristic figures run across, one figure carrying on from each
 * to the next, in the order they come: a brain; closer in, the cells it is made
 * of; one of them, a neuron, whole; ten kinds of neuron side by side; the ten in
 * their places in the brain; closer in, one region's own kinds of neuron, each
 * at its depth in its cortex; the ten signalling to each other; the brain in a mouse; two of them changing as it
 * learns; the mouse going to the cheese it learned of; the diseases of the brain,
 * named; back to the one neuron, whole;
 * its dendrites, its soma and its axon, each picked out — inputs in, gathered,
 * and passed on; the neuron straightened out into a dendrogram; closer in, a
 * piece of one dendrite, a slide at a time — its membrane; the charge either
 * side of it, and the voltage that makes at each place along it; a synapse onto
 * it letting charge in, the voltage there rising; and that charge, and the
 * voltage with it, spreading along the dendrite; and, on the dendrogram, the
 * signals it takes in and passes on.
 */
export const STAGES = [
  'brain',
  'cells',
  'neurons',
  'gallery',
  'atlas',
  'area',
  'talk',
  'mouse',
  'learn',
  'seek',
  'disease',
  'whole',
  'dendrites',
  'soma',
  'axon',
  'dendrogram',
  'closer',
  'lipids',
  'membrane',
  'charges',
  'imbalance',
  'voltage',
  'synapse',
  'spread',
  'signals',
] as const;
export type Stage = (typeof STAGES)[number];
export const isStage = (w: unknown): w is Stage => STAGES.includes(w as Stage);
/** The slides the neuron cannot be switched on: the first, with no one neuron, and those close in on a piece of one. */
export const FIXED: readonly Stage[] = [
  'brain',
  'closer',
  'lipids',
  'membrane',
  'charges',
  'imbalance',
  'voltage',
  'synapse',
  'spread',
];

/** Time for animations that must keep moving: elapsed ms, or 0 where `t` is the finished picture. */
export const moving = (t: number) => (Number.isFinite(t) ? t : 0);
