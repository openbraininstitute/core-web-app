/**
 * The spines laid out in a grid, each upright in its own frame: a block for each SWC type of the sections they sit on
 * (basal dendrite, apical dendrite, axon, …), side by side; in each block, by section and then by how far along it, row
 * by row. No three.js here.
 */

import type { SpineMeshes } from './types';

/** The order the blocks go in, left to right; any other type after them. */
const TYPE_ORDER = [3, 4, 2, 1];
/** How wide a block is for its height, about, in µm. */
const BLOCK_ASPECT = 1.6;
/** The gap between blocks, in columns. */
const BLOCK_GAP = 4;

export interface GridBlock {
  /** The SWC type of the sections its spines sit on (0 where the section is not in the skeleton). */
  type: number;
  count: number;
  /** Its top-left corner and size, µm, in the grid's plane: x right, y up, the whole grid centred on 0. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridLayout {
  /** Where each spine's root goes, x and y per spine, µm, in the grid's plane. */
  slots: Float32Array;
  /** Each spine's place in the grid's order, 0 to 1: what sets when it moves. */
  order: Float32Array;
  blocks: GridBlock[];
  width: number;
  height: number;
  /** A cell of the grid, µm: across, and up, room for all but the longest spines. */
  cell: { x: number; y: number };
}

function percentile(values: Float32Array, p: number): number {
  if (values.length === 0) return 0;
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
}

export function gridLayout(spines: SpineMeshes, sectionTypes: Uint8Array): GridLayout {
  const n = spines.vertexStart.length - 1;
  const cell = { x: 1.8, y: Math.max(2, percentile(spines.length, 0.95) + 0.6) };
  const typeOf = (i: number) => sectionTypes[spines.section[i]] ?? 0;
  const rank = (t: number) => {
    const r = TYPE_ORDER.indexOf(t);
    return r === -1 ? TYPE_ORDER.length + t : r;
  };
  const sorted = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) =>
      rank(typeOf(a)) - rank(typeOf(b)) ||
      spines.section[a] - spines.section[b] ||
      spines.somaDistance[a] - spines.somaDistance[b] ||
      a - b
  );

  // each block as near BLOCK_ASPECT wide for its height as its count allows
  const groups: { type: number; spines: number[] }[] = [];
  for (const i of sorted) {
    const t = typeOf(i);
    if (groups.at(-1)?.type !== t) groups.push({ type: t, spines: [] });
    (groups.at(-1) as { spines: number[] }).spines.push(i);
  }
  const shapes = groups.map((g) => {
    const columns = Math.max(
      1,
      Math.ceil(Math.sqrt((g.spines.length * BLOCK_ASPECT * cell.y) / cell.x))
    );
    const rows = Math.ceil(g.spines.length / columns);
    return { columns, rows };
  });
  const totalColumns =
    shapes.reduce((sum, s) => sum + s.columns, 0) + BLOCK_GAP * Math.max(0, shapes.length - 1);
  const width = totalColumns * cell.x;
  const height = Math.max(0, ...shapes.map((s) => s.rows)) * cell.y;

  const slots = new Float32Array(2 * n);
  const order = new Float32Array(n);
  const blocks: GridBlock[] = [];
  let column = 0;
  let k = 0;
  groups.forEach((g, b) => {
    const { columns, rows } = shapes[b];
    const left = -width / 2 + column * cell.x;
    const top = height / 2;
    g.spines.forEach((i, j) => {
      const c = j % columns;
      const r = Math.floor(j / columns);
      slots[2 * i] = left + (c + 0.5) * cell.x;
      slots[2 * i + 1] = top - (r + 1) * cell.y + 0.3;
      order[i] = n > 1 ? k / (n - 1) : 0;
      k++;
    });
    blocks.push({
      type: g.type,
      count: g.spines.length,
      x: left,
      y: top,
      width: columns * cell.x,
      height: rows * cell.y,
    });
    column += columns + BLOCK_GAP;
  });
  return { slots, order, blocks, width, height, cell };
}
