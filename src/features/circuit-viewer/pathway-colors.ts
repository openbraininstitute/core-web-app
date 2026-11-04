import chroma from 'chroma-js';

import { backgroundIsDark } from '@/features/scan-config/components/color-by/contrast';
import { fadedNeuronColor } from '@/features/scan-config/components/color-by/palette';

import type { NodeColors } from '@/features/scan-config/components/color-by/types';

/**
 * A pathway's neurons, on the light canvas and the dark: where it starts blue, where it ends
 * orange, and those that are both aqua. The data-viz palette's first three slots, which stay
 * apart in every pair under protan and deutan vision on both canvases, as red and green do not.
 */
const LIGHT = { start: '#2a78d6', end: '#eb6834', both: '#1baf7a' } as const;
const DARK = { start: '#3987e5', end: '#d95926', both: '#199e70' } as const;

export type PathwayColors = { start: string; end: string; both: string };

/** The colours of a pathway's neurons on the canvas `background`. */
export function pathwayColors(background: string): PathwayColors {
  return backgroundIsDark(background) ? DARK : LIGHT;
}
/** Opacity of the cells outside the pathway: barely there, so the pathway stands out. */
export const OUTSIDE_PATHWAY_OPACITY = 0.05;

/**
 * A population's cells coloured for a pathway between two groups of them, in
 * {@link pathwayColors}: the presynaptic neurons, the postsynaptic ones and a neuron in
 * both, and every other cell 5% opaque, in the background's shade.
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
  const colors = pathwayColors(background);
  return {
    palette: [
      chroma(fadedNeuronColor(background)).alpha(OUTSIDE_PATHWAY_OPACITY).css(),
      colors.start,
      colors.end,
      colors.both,
    ],
    columnByNode,
    flatColumns: [0],
  };
}
