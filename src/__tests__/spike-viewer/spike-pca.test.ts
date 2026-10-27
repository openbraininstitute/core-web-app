import { describe, expect, it } from 'vitest';

import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import { pcaBins, spikePca } from '@/features/spike-viewer/spike-statistics/pca';
import {
  cholesky,
  ellipse,
  pcaFigure,
  spreadOf,
} from '@/features/spike-viewer/spike-statistics/pca-figure';

import type { SpikePca } from '@/features/spike-viewer/spike-statistics/pca';
import type { CellGroup } from '@/features/spike-viewer/spike-statistics/statistics';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

function population(pairs: [number, number][]): SpikePopulation {
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  return {
    name: 'test',
    timestamps: new Float32Array(sorted.map(([t]) => t)),
    nodeIds: new Float64Array(sorted.map(([, id]) => id)),
    nodeIdRange: { min: 0, max: Math.max(...sorted.map(([, id]) => id)) },
  } as SpikePopulation;
}

const range = (n: number) => Uint32Array.from({ length: n }, (_, i) => i);

/** The top eigenvalues of the centred counts' covariance, by power iteration with deflation. */
function denseExplained(counts: number[][], components: number): number[] {
  const n = counts.length;
  const bins = counts[0].length;
  const mean = Array.from({ length: bins }, (_, j) => counts.reduce((s, row) => s + row[j], 0) / n);
  const centred = counts.map((row) => row.map((v, j) => v - mean[j]));
  const cov = Array.from({ length: bins }, (_, a) =>
    Array.from(
      { length: bins },
      (_, b) => centred.reduce((s, row) => s + row[a] * row[b], 0) / (n - 1)
    )
  );
  const total = cov.reduce((s, row, j) => s + row[j], 0);
  const values: number[] = [];
  for (let c = 0; c < components; c++) {
    let v = Array.from({ length: bins }, (_, j) => Math.sin(j + 1 + c));
    let lambda = 0;
    for (let it = 0; it < 2000; it++) {
      const w = cov.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
      lambda = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      v = w.map((x) => x / lambda);
    }
    values.push(lambda / total);
    // Deflate: take the component found off the covariance.
    for (let a = 0; a < bins; a++) for (let b = 0; b < bins; b++) cov[a][b] -= lambda * v[a] * v[b];
  }
  return values;
}

describe('spikePca', () => {
  it('splits cells that fire at different times along the first component', () => {
    const pairs: [number, number][] = [];
    for (let id = 0; id < 10; id++) pairs.push([50, id]);
    for (let id = 10; id < 20; id++) pairs.push([550, id]);
    const pca = spikePca(population(pairs), range(20), 20, [0, 1000], 100, 2);
    expect(pca).not.toBeNull();
    expect(pca?.explained[0]).toBeCloseTo(1, 6);
    expect(pca?.explained[1]).toBeCloseTo(0, 6);
    const early = Array.from(pca?.scores[0].subarray(0, 10) ?? []);
    const late = Array.from(pca?.scores[0].subarray(10, 20) ?? []);
    expect(Math.sign(early[0])).toBe(-Math.sign(late[0]));
    for (const score of [...early, ...late]) expect(Math.abs(score)).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('finds the same shares of the variance as a dense PCA', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const cells = 40;
    const bins = 12;
    const pairs: [number, number][] = [];
    const counts = Array.from({ length: cells }, () => new Array<number>(bins).fill(0));
    for (let id = 0; id < cells; id++) {
      const spikes = Math.floor(random() * 30);
      for (let s = 0; s < spikes; s++) {
        // Some cells favour the first half, so the components are not all alike.
        const t = id % 3 === 0 ? random() * 500 : random() * 1200;
        if (t >= 1200) continue;
        pairs.push([t, id]);
        counts[id][Math.min(bins - 1, Math.floor(t / 100))] += 1;
      }
    }
    const pca = spikePca(population(pairs), range(cells), cells, [0, 1200], 100, 3);
    const dense = denseExplained(counts, 3);
    expect(pca).not.toBeNull();
    pca?.explained.forEach((share, c) => {
      expect(share).toBeCloseTo(dense[c], 5);
    });
  });

  it('gives nothing for too few cells to find the components', () => {
    expect(spikePca(population([[10, 0]]), range(2), 2, [0, 100], 10, 2)).toBeNull();
  });

  it('leaves out a last bin the span cuts short, unless asked to count it', () => {
    // Ten cells alike but for the last 50 ms of a span ten and a half bins long.
    const pairs: [number, number][] = [];
    for (let id = 0; id < 10; id++) {
      pairs.push([50, id]);
      for (let k = 0; k < id % 3; k++) pairs.push([1010 + k, id]);
    }
    expect(pcaBins([0, 1050], 100)).toEqual({ width: 100, bins: 11, partialMs: 50 });
    expect(pcaBins([0, 1000], 100).partialMs).toBeNull();
    // 512.2 - 12.2 is 500.00000000000006: float error, not a 0 ms bin to offer.
    expect(pcaBins([12.2, 512.2], 5)).toMatchObject({ bins: 100, partialMs: null });
    expect(spikePca(population(pairs), range(10), 10, [0, 1050], 100, 2)).toBeNull();
    const counted = spikePca(population(pairs), range(10), 10, [0, 1050], 100, 2, true);
    expect(counted?.explained[0]).toBeCloseTo(1, 9);
  });
});

describe('pcaFigure', () => {
  // Two groups of three cells either side of the origin along PC1, spread along both components.
  const pca: SpikePca = {
    cells: range(6),
    scores: [Float64Array.from([-3, -2, -1, 1, 2, 3]), Float64Array.from([1, 0, -1, 2, 0, -2])],
    explained: [0.8, 0.2],
    width: 10,
  };
  const left: CellGroup = { name: 'left', cells: Uint32Array.from([0, 1, 2]) };
  const right: CellGroup = { name: 'right', cells: Uint32Array.from([3, 4, 5]) };
  const all: CellGroup = { name: 'All', cells: range(6) };
  type Trace = {
    x: number[];
    y: number[];
    mode?: string;
    showlegend?: boolean;
    marker?: { symbol?: string; color?: string };
  };
  const traces = (split: Parameters<typeof pcaFigure>[2]) =>
    pcaFigure(pca, 6, split, '#123456').data as unknown as Trace[];

  it('marks each group at its mean, with a ring along its own spread', () => {
    const data = traces({
      colours: [left, right],
      colourLabel: 'side',
      groups: [left, right],
      groupLabel: 'side',
      spread: 1,
      points: true,
    });
    const means = data.filter((t) => t.marker?.symbol === 'diamond');
    expect(means.map((t) => [t.x[0], t.y[0]])).toEqual([
      [-2, 0],
      [2, 0],
    ]);
    // One property both colours and groups them: each mean is its cells' hue.
    expect(means.map((t) => t.marker?.color)).toEqual([PICK_COLORS[0], PICK_COLORS[1]]);
    const rings = data.filter((t) => t.mode === 'lines');
    expect(rings).toHaveLength(2);
    // Left: variance 1 along PC1, 1 along PC2, covariance -1: the ring lies flat along a diagonal.
    const { covariance } = spreadOf(pca.scores, [0, 1, 2]);
    expect(covariance).toEqual([
      [1, -1],
      [-1, 1],
    ]);
    for (let s = 0; s < rings[0].x.length; s++) {
      expect(rings[0].x[s] + 2 + rings[0].y[s]).toBeCloseTo(0, 9);
    }
  });

  it('draws means grouped apart from the colours in ink, and with nothing colouring them in the palette', () => {
    const inked = traces({
      colours: [all],
      colourLabel: 'layer',
      groups: [left, right],
      groupLabel: 'side',
      spread: 0,
      points: true,
    });
    const inkMeans = inked.filter((t) => t.marker?.symbol === 'diamond');
    expect(new Set(inkMeans.map((t) => t.marker?.color)).size).toBe(1);
    expect(inkMeans[0].marker?.color).not.toBe(PICK_COLORS[0]);
    expect(inkMeans.filter((t) => t.showlegend)).toHaveLength(1);
    expect(inked.some((t) => t.mode === 'lines')).toBe(false);

    const plain = traces({
      colours: [all],
      colourLabel: undefined,
      groups: [left, right],
      groupLabel: 'side',
      spread: 2,
      points: true,
    });
    const means = plain.filter((t) => t.marker?.symbol === 'diamond');
    expect(means.map((t) => t.marker?.color)).toEqual([PICK_COLORS[0], PICK_COLORS[1]]);
    expect(means.every((t) => t.showlegend)).toBe(true);
  });

  it('leaves the cells out under their means unless asked, the means then carrying the colours', () => {
    const data = traces({
      colours: [left, right],
      colourLabel: 'layer',
      groups: [left, right],
      groupLabel: 'side',
      spread: 1,
      points: false,
    });
    expect(data.some((t) => t.marker?.symbol !== 'diamond' && t.mode === 'markers')).toBe(false);
    const means = data.filter((t) => t.marker?.symbol === 'diamond');
    expect(means.map((t) => t.marker?.color)).toEqual([PICK_COLORS[0], PICK_COLORS[1]]);
    expect(means.every((t) => t.showlegend)).toBe(true);
    expect(data.filter((t) => t.mode === 'lines')).toHaveLength(2);
  });

  it('shows no means without a grouping', () => {
    const data = traces({
      colours: [left, right],
      colourLabel: 'side',
      groups: [all],
      groupLabel: undefined,
      spread: 1,
      points: true,
    });
    expect(data.some((t) => t.marker?.symbol === 'diamond' || t.mode === 'lines')).toBe(false);
  });
});

describe('cholesky', () => {
  it('factors a covariance, keeping a direction with no spread flat', () => {
    const matrix = [
      [4, 2, 0.6],
      [2, 2, 0.5],
      [0.6, 0.5, 3],
    ];
    const lower = cholesky(matrix);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const product = lower[r].reduce((sum, l, p) => sum + l * lower[c][p], 0);
        expect(product).toBeCloseTo(matrix[r][c], 12);
      }
    }
    expect(
      cholesky([
        [1, 1],
        [1, 1],
      ])
    ).toEqual([
      [1, 0],
      [1, 0],
    ]);
  });

  it('puts a ring n standard deviations out along each axis of an upright spread', () => {
    const ring = ellipse(
      [1, 2],
      cholesky([
        [4, 0],
        [0, 9],
      ]),
      2
    );
    // At angles 0 and a quarter turn: 2 SD out along each axis.
    expect(ring.x[0]).toBeCloseTo(5, 12);
    expect(ring.y[0]).toBeCloseTo(2, 12);
    expect(ring.x[18]).toBeCloseTo(1, 12);
    expect(ring.y[18]).toBeCloseTo(8, 12);
  });
});
