import chroma from 'chroma-js';

import { fadedNeuronColor } from '@/features/scan-config/components/color-by/palette';

import type { NodeColors } from '@/features/scan-config/components/color-by/types';

/** A pathway's neurons: where it starts, where it ends, and those that are both. */
export const PATHWAY_COLORS = { start: '#16a34a', end: '#dc2626', both: '#f59e0b' } as const;
/** Opacity of the cells outside the pathway: barely there, so the pathway stands out. */
export const OUTSIDE_PATHWAY_OPACITY = 0.05;

/**
 * A population's cells coloured for a pathway between two groups of them: the
 * presynaptic neurons green, the postsynaptic ones red, a neuron in both amber,
 * and every other cell 5% opaque, in the background's shade.
 */
export function pathwayNodeColors({
  pre,
  post,
  rowCount,
  background,
}: {
  /** Node indices of the population. */
  pre: ArrayLike<number>;
  post: ArrayLike<number>;
  rowCount: number;
  background: string;
}): NodeColors {
  const columnByNode = new Uint16Array(rowCount);
  for (let i = 0; i < pre.length; i++) if (pre[i] < rowCount) columnByNode[pre[i]] = 1;
  for (let i = 0; i < post.length; i++) {
    const cell = post[i];
    if (cell < rowCount) columnByNode[cell] = columnByNode[cell] === 1 ? 3 : 2;
  }
  return {
    palette: [
      chroma(fadedNeuronColor(background)).alpha(OUTSIDE_PATHWAY_OPACITY).css(),
      PATHWAY_COLORS.start,
      PATHWAY_COLORS.end,
      PATHWAY_COLORS.both,
    ],
    columnByNode,
    flatColumns: [0],
  };
}
