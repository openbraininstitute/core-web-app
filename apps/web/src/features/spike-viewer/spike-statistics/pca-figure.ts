import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import {
  axisTitle,
  BASE_LAYOUT,
  cellCount,
  compact,
  GRID_COLOR,
  MEAN_INK,
  OTHER_COLOR,
} from '@/features/spike-viewer/spike-statistics/figure-kit';

import type { Data } from 'plotly.js-dist-min';
import type {
  Figure,
  HoverPoint,
  PlotTooltip,
} from '@/features/spike-viewer/spike-statistics/figures';
import type { SpikePca } from '@/features/spike-viewer/spike-statistics/pca';
import type { CellGroup } from '@/features/spike-viewer/spike-statistics/statistics';

/** How a PCA's cells are told apart: coloured by one property, grouped by another, perhaps the same. */
export type PcaSplit = {
  /** One group, "All", when nothing colours them. */
  colours: CellGroup[];
  colourLabel: string | undefined;
  /** A mean each when a property groups them. */
  groups: CellGroup[];
  groupLabel: string | undefined;
  /** How many standard deviations out each group's spread is drawn round its mean; 0 for none. */
  spread: number;
  /** Whether the cells are drawn under their groups' means; without a grouping they always are. */
  points: boolean;
};

/** Points round a ring, and rings and segments over an ellipsoid. */
const RING_STEPS = 72;
const SHELL_RINGS = 12;
const SHELL_SEGMENTS = 24;

/**
 * The cells placed by the principal components of their firing over time, two
 * or three of them, each axis naming its component and the share of the
 * variance it holds. A point per cell, in its colour group's hue; with a
 * grouping, each group's mean over them, and its spread round it - an ellipse,
 * or in 3D an ellipsoid, `spread` standard deviations out along the group's
 * own covariance, with the cells under them or not. Means take their cells'
 * hue when one property both colours and groups them, the palette when nothing
 * else carries colours, and ink over cells coloured by something else.
 */
export function pcaFigure(pca: SpikePca, rowCount: number, split: PcaSplit, color: string): Figure {
  const { colours, colourLabel, groups, groupLabel, spread } = split;
  const threeD = pca.scores.length >= 3;
  const indexOf = new Int32Array(rowCount).fill(-1);
  pca.cells.forEach((cell, i) => {
    if (cell < rowCount) indexOf[cell] = i;
  });
  const membersOf = (group: CellGroup) =>
    Array.from(group.cells, (cell) => (cell < rowCount ? indexOf[cell] : -1)).filter((i) => i >= 0);
  const hueAt = (index: number) => (index < PICK_COLORS.length ? PICK_COLORS[index] : OTHER_COLOR);
  const coordinates = (columns: ArrayLike<number>[]) =>
    threeD ? { x: columns[0], y: columns[1], z: columns[2] } : { x: columns[0], y: columns[1] };

  const grouped = groupLabel !== undefined;
  const sameSplit = colourLabel === groupLabel;
  const showPoints = !grouped || split.points;
  // Whether the cells carry the colours: drawn, and coloured by a property.
  const pointColours = showPoints && colourLabel !== undefined;
  // Uncoloured, the cells are the population's colour, or grey behind the means that carry the colours.
  const pointHues = colours.map((_, c) => (colourLabel ? hueAt(c) : grouped ? OTHER_COLOR : color));
  const points = showPoints ? colours.map(membersOf) : [];
  const hueOfColour = new Map(colours.map((group, c) => [group.name, pointHues[c]]));
  const meanHues = groups.map((group, g) =>
    !pointColours ? hueAt(g) : sameSplit ? (hueOfColour.get(group.name) ?? OTHER_COLOR) : MEAN_INK
  );
  const members = grouped ? groups.map(membersOf) : [];
  const spreads = members.map((m) => spreadOf(pca.scores, m));
  const inked = pointColours && !sameSplit;
  // A legend entry toggles a group's cells, mean and spread together; ink means go as one.
  const legendGroup = (g: number) =>
    !pointColours ? `mean:${groups[g].name}` : sameSplit ? groups[g].name : 'means';

  type Trace =
    | { kind: 'cells'; colour: number }
    | { kind: 'mean'; group: number }
    | { kind: 'spread' };
  const kinds: Trace[] = [];
  const data: Record<string, unknown>[] = [];
  points.forEach((shown, c) => {
    const group = colours[c];
    kinds.push({ kind: 'cells', colour: c });
    data.push({
      type: threeD ? 'scatter3d' : 'scattergl',
      mode: 'markers',
      name: group.name,
      legendgroup: group.name,
      ...coordinates(pca.scores.map((score) => shown.map((i) => score[i]))),
      marker: { size: threeD ? 2.5 : 5, color: pointHues[c] },
      hoverinfo: 'none',
      showlegend: Boolean(colourLabel) && c < PICK_COLORS.length,
    });
  });
  if (grouped && spread > 0) {
    spreads.forEach(({ mean, covariance }, g) => {
      if (!covariance) return;
      const lower = cholesky(covariance);
      kinds.push({ kind: 'spread' });
      data.push({
        ...(threeD
          ? {
              type: 'mesh3d',
              ...ellipsoidMesh(mean, lower, spread),
              color: meanHues[g],
              opacity: 0.18,
            }
          : {
              type: 'scatter',
              mode: 'lines',
              ...ellipse(mean, lower, spread),
              line: { color: meanHues[g], width: 2 },
            }),
        name: groups[g].name,
        legendgroup: legendGroup(g),
        hoverinfo: 'skip',
        showlegend: false,
      });
    });
  }
  let inkNamed = false;
  spreads.forEach(({ mean }, g) => {
    if (members[g].length === 0) return;
    // Named by group where the means alone carry the colours, once among ink
    // means, and not at all where their cells' entries already name them.
    const named = !pointColours ? g < PICK_COLORS.length : inked && !inkNamed;
    if (named && inked) inkNamed = true;
    kinds.push({ kind: 'mean', group: g });
    data.push({
      type: threeD ? 'scatter3d' : 'scatter',
      mode: 'markers',
      name: inked ? `${groupLabel} means` : groups[g].name,
      legendgroup: legendGroup(g),
      ...coordinates(mean.map((m) => [m])),
      marker: {
        size: threeD ? 7 : 14,
        symbol: 'diamond',
        color: meanHues[g],
        line: { color: '#ffffff', width: threeD ? 1 : 2 },
      },
      hoverinfo: 'none',
      showlegend: named,
    });
  });

  // Each cell's group, for its card, where the grouping is not what colours it.
  const groupOf = new Int32Array(showPoints && grouped && !sameSplit ? rowCount : 0).fill(-1);
  if (groupOf.length > 0) {
    groups.forEach((group, g) => {
      for (const cell of group.cells) if (cell < rowCount) groupOf[cell] = g;
    });
  }
  const tooltip = (point: HoverPoint): PlotTooltip | null => {
    const kind = kinds[point.curveNumber ?? -1];
    const index = point.pointNumber;
    if (!kind || typeof index !== 'number') return null;
    if (kind.kind === 'mean') {
      const g = kind.group;
      const { mean, covariance } = spreads[g];
      return {
        title: `${groupLabel} ${groups[g].name}`,
        note: `mean of ${cellCount(members[g].length)}`,
        subtitle: covariance ? 'Mean ± SD' : undefined,
        swatch: meanHues[g],
        rows: mean.map((m, c) => ({
          label: `PC${c + 1}`,
          value: covariance
            ? `${compact(m)} ± ${compact(Math.sqrt(covariance[c][c]))}`
            : compact(m),
        })),
      };
    }
    if (kind.kind !== 'cells') return null;
    const i = points[kind.colour][index];
    if (i === undefined) return null;
    const cell = pca.cells[i];
    const g = groupOf.length > 0 ? groupOf[cell] : -1;
    return {
      title: `Node ${cell}`,
      note: colourLabel ? `${colourLabel} ${colours[kind.colour].name}` : undefined,
      swatch: pointHues[kind.colour],
      rows: [
        ...pca.scores.map((score, c) => ({ label: `PC${c + 1}`, value: compact(score[i]) })),
        ...(g >= 0 && groupLabel ? [{ label: groupLabel, value: groups[g].name }] : []),
      ],
    };
  };

  const names = pca.explained.map(
    (share, c) => `PC${c + 1} · ${Number((share * 100).toPrecision(2))}% of the variance`
  );
  const axis = (label: string) => ({
    title: axisTitle(label),
    automargin: true,
    gridcolor: GRID_COLOR,
    zeroline: false,
  });
  return {
    data: data as Data[],
    tooltip,
    layout: {
      ...BASE_LAYOUT,
      showlegend: data.some((trace) => trace.showlegend === true),
      // A new grouping redraws the same points; a new set of components starts the view afresh.
      uirevision: `pca:${pca.scores.length}`,
      ...(threeD
        ? {
            margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: { xaxis: axis(names[0]), yaxis: axis(names[1]), zaxis: axis(names[2]) },
          }
        : { xaxis: axis(names[0]), yaxis: axis(names[1]) }),
    },
  };
}

/** A group's mean over the components, and their covariance round it; a lone cell has none. */
export function spreadOf(
  scores: Float64Array[],
  members: readonly number[]
): { mean: number[]; covariance: number[][] | null } {
  const n = members.length;
  const mean = scores.map((score) => members.reduce((sum, i) => sum + score[i], 0) / n);
  if (n < 2) return { mean, covariance: null };
  const covariance = scores.map((a, p) =>
    scores.map((b, q) => {
      let sum = 0;
      for (const i of members) sum += (a[i] - mean[p]) * (b[i] - mean[q]);
      return sum / (n - 1);
    })
  );
  return { mean, covariance };
}

/**
 * The lower triangle L with L Lᵀ the covariance, which carries a unit circle
 * or sphere onto its spread. A direction the group does not vary along stays
 * flat, rather than failing as a strict Cholesky would.
 */
export function cholesky(matrix: number[][]): number[][] {
  const k = matrix.length;
  const largest = Math.max(...matrix.map((row, r) => row[r]), 0);
  const tiny = Math.sqrt(largest) * 1e-9;
  const lower = matrix.map(() => new Array<number>(k).fill(0));
  for (let r = 0; r < k; r++) {
    for (let c = 0; c <= r; c++) {
      let sum = matrix[r][c];
      for (let p = 0; p < c; p++) sum -= lower[r][p] * lower[c][p];
      if (r === c) lower[r][r] = Math.sqrt(Math.max(sum, 0));
      else lower[r][c] = lower[c][c] > tiny ? sum / lower[c][c] : 0;
    }
  }
  return lower;
}

/** `mean` + `scale` L u for a unit vector u. */
function carried(mean: number[], lower: number[][], scale: number, unit: number[]): number[] {
  return mean.map((m, r) => m + scale * lower[r].reduce((sum, l, c) => sum + l * unit[c], 0));
}

/** The ring `scale` standard deviations out round a 2D mean. */
export function ellipse(
  mean: number[],
  lower: number[][],
  scale: number
): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (let s = 0; s <= RING_STEPS; s++) {
    const angle = (2 * Math.PI * s) / RING_STEPS;
    const [px, py] = carried(mean, lower, scale, [Math.cos(angle), Math.sin(angle)]);
    x.push(px);
    y.push(py);
  }
  return { x, y };
}

/** The shell `scale` standard deviations out round a 3D mean, as Plotly's triangles. */
function ellipsoidMesh(mean: number[], lower: number[][], scale: number) {
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  for (let r = 0; r <= SHELL_RINGS; r++) {
    const polar = (Math.PI * r) / SHELL_RINGS;
    for (let s = 0; s < SHELL_SEGMENTS; s++) {
      const azimuth = (2 * Math.PI * s) / SHELL_SEGMENTS;
      const unit = [
        Math.sin(polar) * Math.cos(azimuth),
        Math.sin(polar) * Math.sin(azimuth),
        Math.cos(polar),
      ];
      const [px, py, pz] = carried(mean, lower, scale, unit);
      x.push(px);
      y.push(py);
      z.push(pz);
    }
  }
  const i: number[] = [];
  const j: number[] = [];
  const k: number[] = [];
  for (let r = 0; r < SHELL_RINGS; r++) {
    for (let s = 0; s < SHELL_SEGMENTS; s++) {
      const a = r * SHELL_SEGMENTS + s;
      const b = r * SHELL_SEGMENTS + ((s + 1) % SHELL_SEGMENTS);
      i.push(a, a);
      j.push(a + SHELL_SEGMENTS, b + SHELL_SEGMENTS);
      k.push(b + SHELL_SEGMENTS, b);
    }
  }
  return { x, y, z, i, j, k };
}
