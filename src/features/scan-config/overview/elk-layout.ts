import ELK from 'elkjs/lib/elk.bundled.js';

import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { TLaidOutEdge, TLaidOutNode } from './layout';

export type TPoint = { x: number; y: number };

export type TRoutedEdge = TLaidOutEdge & {
  /** The edge's route, from source to target, around the boxes. */
  points: TPoint[];
  /** Where its label goes, its centre. */
  labelAt?: TPoint;
};

const elk = new ELK();

const LABEL_HEIGHT = 16;
const labelWidth = (text: string) => Math.ceil(text.length * 6.2) + 10;

/**
 * The column layout, refined by ELK's layered algorithm: each node stays in its column (inputs,
 * settings by depth, runs, outputs), but the order within a column is chosen to cross as few
 * edges as possible, and each edge is routed orthogonally around the boxes, its label placed
 * where it does not cover one.
 */
export async function routeRunSheet(base: {
  nodes: TLaidOutNode[];
  edges: TLaidOutEdge[];
}): Promise<{ nodes: TLaidOutNode[]; edges: TRoutedEdge[] }> {
  // the columns, by the base layout's x
  const columnXs = [...new Set(base.nodes.map((n) => n.x))].sort((a, b) => a - b);
  const columnOf = (n: TLaidOutNode) => columnXs.indexOf(n.x);

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.partitioning.activate': 'true',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '28',
      'elk.spacing.edgeNode': '18',
      'elk.spacing.edgeEdge': '10',
      'elk.layered.spacing.edgeNodeBetweenLayers': '24',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.mergeEdges': 'false',
      'elk.edgeLabels.placement': 'CENTER',
    },
    children: base.nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
      layoutOptions: { 'elk.partitioning.partition': String(columnOf(n)) },
    })),
    edges: base.edges.map(
      (e): ElkExtendedEdge => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        labels: e.label
          ? [
              {
                id: `${e.id}:label`,
                text: e.label,
                width: labelWidth(e.label),
                height: LABEL_HEIGHT,
              },
            ]
          : [],
      })
    ),
  };

  const laid = await elk.layout(graph);
  const placed = new Map((laid.children ?? []).map((c) => [c.id, c]));
  const nodes = base.nodes.map((n) => {
    const c = placed.get(n.id);
    return c ? { ...n, x: c.x ?? n.x, y: c.y ?? n.y } : n;
  });

  const routed = new Map((laid.edges ?? []).map((e) => [e.id, e]));
  const edges = base.edges.map((e): TRoutedEdge => {
    const section = routed.get(e.id)?.sections?.[0];
    const label = routed.get(e.id)?.labels?.[0];
    const points = section
      ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
      : [];
    return {
      ...e,
      points,
      labelAt:
        label && label.x !== undefined && label.y !== undefined
          ? { x: label.x + (label.width ?? 0) / 2, y: label.y + (label.height ?? 0) / 2 }
          : undefined,
    };
  });
  return { nodes, edges };
}

/**
 * An SVG path through `points`, its corners rounded by up to `radius`: the look of a routed
 * edge rather than a staircase.
 */
export function roundedPath(points: TPoint[], radius = 10): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let path = `M ${first.x} ${first.y}`;
  for (let i = 0; i < rest.length; i += 1) {
    const corner = rest[i];
    const next = rest[i + 1];
    const prev = points[i];
    if (!corner || !prev) continue;
    if (!next) {
      path += ` L ${corner.x} ${corner.y}`;
      continue;
    }
    const inLength = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const before = {
      x: corner.x - ((corner.x - prev.x) / (inLength || 1)) * r,
      y: corner.y - ((corner.y - prev.y) / (inLength || 1)) * r,
    };
    const after = {
      x: corner.x + ((next.x - corner.x) / (outLength || 1)) * r,
      y: corner.y + ((next.y - corner.y) / (outLength || 1)) * r,
    };
    path += ` L ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y}`;
  }
  return path;
}
