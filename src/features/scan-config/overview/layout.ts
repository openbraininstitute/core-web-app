import type { BlockGraph, BlockGraphNode } from './settings-graph';

export const NodeKind = {
  Input: 'input',
  Block: 'block',
  Default: 'default',
  Runs: 'runs',
  Output: 'output',
} as const;
export type TNodeKind = (typeof NodeKind)[keyof typeof NodeKind];

export const NODE_SIZE: Record<TNodeKind, { width: number; height: number }> = {
  [NodeKind.Input]: { width: 270, height: 250 },
  [NodeKind.Block]: { width: 250, height: 150 },
  [NodeKind.Default]: { width: 250, height: 64 },
  [NodeKind.Runs]: { width: 270, height: 140 },
  [NodeKind.Output]: { width: 290, height: 250 },
};

const COLUMN_GAP = 90;
const ROW_GAP = 28;

export type TLaidOutNode = {
  id: string;
  kind: TNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The settings block it draws, for block and default nodes. */
  block?: BlockGraphNode;
};

export type TLaidOutEdge = {
  id: string;
  source: string;
  target: string;
  /** The referring field, on an edge between two settings blocks. */
  label?: string;
  dashed: boolean;
};

export const RUNS_NODE_ID = 'runs';

/**
 * Lays a campaign out in columns, left to right: its input entities, its settings blocks (by
 * how deep their references go: a neuron set before the stimulus that targets it), its runs,
 * and their outputs. Each column is centred on the tallest.
 *
 * Edges: each input feeds the blocks that name it, where `inputTargets` says which (else the
 * blocks nothing else feeds, or the runs without settings); a reference between blocks is an edge, dashed from a default; the blocks nothing
 * else depends on feed the runs; the runs feed each output.
 */
export function layoutRunSheet({
  inputIds,
  inputTargets,
  settings,
  runsHeight,
  outputIds,
}: {
  inputIds: string[];
  /** For an input, the settings blocks that name it. */
  inputTargets?: Record<string, string[]>;
  settings: BlockGraph;
  runsHeight?: number;
  outputIds: string[];
}): { nodes: TLaidOutNode[]; edges: TLaidOutEdge[] } {
  const columns: TLaidOutNode[][] = [];
  const place = (column: number, node: Omit<TLaidOutNode, 'x' | 'y'>) => {
    columns[column] ??= [];
    columns[column].push({ ...node, x: 0, y: 0 });
  };

  for (const id of inputIds) place(0, { id, kind: NodeKind.Input, ...NODE_SIZE.input });

  const settingsColumns = settings.nodes.length
    ? Math.max(...settings.nodes.map((n) => n.column)) + 1
    : 0;
  for (const block of settings.nodes) {
    const kind = block.isDefault ? NodeKind.Default : NodeKind.Block;
    place(1 + block.column, { id: block.id, kind, block, ...NODE_SIZE[kind] });
  }

  const runsColumn = 1 + settingsColumns;
  place(runsColumn, {
    id: RUNS_NODE_ID,
    kind: NodeKind.Runs,
    width: NODE_SIZE.runs.width,
    height: runsHeight ?? NODE_SIZE.runs.height,
  });
  for (const id of outputIds)
    place(runsColumn + 1, { id, kind: NodeKind.Output, ...NODE_SIZE.output });

  // x by the widest node of each column before it; y stacked, each column centred on the tallest
  const heights = columns.map((col = []) =>
    col.reduce((sum, n, i) => sum + n.height + (i ? ROW_GAP : 0), 0)
  );
  const tallest = Math.max(0, ...heights);
  let x = 0;
  columns.forEach((col = [], i) => {
    let y = (tallest - (heights[i] ?? 0)) / 2;
    for (const node of col) {
      node.x = x;
      node.y = y;
      y += node.height + ROW_GAP;
    }
    x += Math.max(0, ...col.map((n) => n.width)) + COLUMN_GAP;
  });

  const edges: TLaidOutEdge[] = settings.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.field.replaceAll('_', ' '),
    dashed: e.isDefault,
  }));
  const fed = new Set(settings.edges.map((e) => e.target));
  const feeding = new Set(settings.edges.map((e) => e.source));
  const blocks = settings.nodes.filter((n) => !n.isDefault);
  const roots = blocks.filter((n) => !fed.has(n.id));
  const sinks = blocks.filter((n) => !feeding.has(n.id));

  const placed = new Set(settings.nodes.map((n) => n.id));
  for (const input of inputIds) {
    const named = (inputTargets?.[input] ?? []).filter((id) => placed.has(id));
    // an input no block names feeds the runs themselves; without `inputTargets`, the unfed blocks
    const fallback = inputTargets || !roots.length ? [RUNS_NODE_ID] : roots.map((n) => n.id);
    for (const target of named.length ? named : fallback) edges.push(link(input, target));
  }
  for (const sink of sinks) edges.push(link(sink.id, RUNS_NODE_ID));
  for (const output of outputIds) edges.push(link(RUNS_NODE_ID, output));

  return { nodes: columns.flat().filter(Boolean), edges };
}

const link = (source: string, target: string): TLaidOutEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  dashed: false,
});

/** The settings worth drawing: all but the campaign's own name and description. */
export function withoutInfo(graph: BlockGraph): BlockGraph {
  const hidden = new Set(graph.nodes.filter((n) => n.rootElement === 'info').map((n) => n.id));
  return {
    nodes: graph.nodes.filter((n) => !hidden.has(n.id)),
    edges: graph.edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target)),
  };
}

/** About five round times from 0 to `end`, and `end` itself. */
export function timeTicks(end: number): number[] {
  const raw = end / 5;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = 0; t < end - step / 4; t += step) ticks.push(t);
  return [...ticks, end];
}
