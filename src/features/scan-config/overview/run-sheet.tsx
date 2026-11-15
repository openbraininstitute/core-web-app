'use client';

import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { roundedPath, routeRunSheet } from './elk-layout';
import { layoutRunSheet, NodeKind, RUNS_NODE_ID } from './layout';

import type { Edge, EdgeProps, Node, NodeProps } from '@xyflow/react';
import type { ReactNode } from 'react';
import type { TPoint, TRoutedEdge } from './elk-layout';
import type { TLaidOutNode, TNodeKind } from './layout';
import type { BlockGraph, BlockGraphNode } from './settings-graph';

export type TSheetItem = { id: string; content: ReactNode };

type Props = {
  inputs: TSheetItem[];
  /** For an input card, the settings blocks it feeds. */
  inputTargets?: Record<string, string[]>;
  settings: BlockGraph;
  renderBlock: (block: BlockGraphNode) => ReactNode;
  runs: { content: ReactNode; height?: number };
  outputs: TSheetItem[];
  /** Whether the runs have produced anything yet: the edges into the outputs are drawn faint. */
  outputsReady: boolean;
};

const ACCENT: Record<TNodeKind, string> = {
  [NodeKind.Input]: 'border-sky-300',
  [NodeKind.Block]: 'border-gray-200',
  [NodeKind.Default]: 'border-dashed border-gray-300 bg-gray-50!',
  [NodeKind.Runs]: 'border-gray-300',
  [NodeKind.Output]: 'border-emerald-300',
};

type CardData = {
  kind: TNodeKind;
  width: number;
  height: number;
  content: ReactNode;
  /** An output that is not there yet, drawn without the outputs' colour. */
  muted?: boolean;
};

function CardNode({ data }: NodeProps<Node<CardData>>) {
  return (
    <div
      className={cn(
        'nodrag nopan flex cursor-default flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm',
        data.muted ? 'border-gray-200' : ACCENT[data.kind]
      )}
      style={{ width: data.width, height: data.height }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="opacity-0" />
      {data.content}
      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { card: CardNode };

type RoutedData = { points: TPoint[]; labelAt?: TPoint; label?: string };

/** An edge along the route ELK found for it, around the cards, its corners rounded. */
function RoutedEdge({ id, data, markerEnd, style }: EdgeProps<Edge<RoutedData>>) {
  if (!data?.points.length) return null;
  return (
    <>
      <BaseEdge id={id} path={roundedPath(data.points)} markerEnd={markerEnd} style={style} />
      {data.label && data.labelAt && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded bg-slate-50 px-1 text-[11px] text-slate-600"
            style={{
              transform: `translate(-50%, -50%) translate(${data.labelAt.x}px, ${data.labelAt.y}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { routed: RoutedEdge };

/** What decides a layout: the nodes, their sizes and columns, and the edges. */
const layoutKey = (layout: { nodes: TLaidOutNode[]; edges: { id: string }[] }) =>
  [
    ...layout.nodes.map((n) => `${n.id}:${n.x}:${n.width}x${n.height}`),
    ...layout.edges.map((e) => e.id),
  ].join('|');

/**
 * A campaign as a left-to-right graph, in the manner of a node editor: inputs → settings →
 * runs → outputs, each a card with what matters about it, joined where one feeds the next.
 * Read only: the cards hold their own links.
 */
function RunSheetCanvas({
  inputs,
  inputTargets,
  settings,
  renderBlock,
  runs,
  outputs,
  outputsReady,
}: Props) {
  const { fitView } = useReactFlow();
  const inputIds = inputs.map((i) => i.id);
  const outputIds = outputs.map((o) => o.id);
  const layout = layoutRunSheet({
    inputIds,
    inputTargets,
    settings,
    runsHeight: runs.height,
    outputIds,
  });

  const contentById = new Map<string, ReactNode>([
    ...inputs.map((i) => [i.id, i.content] as const),
    ...outputs.map((o) => [o.id, o.content] as const),
    [RUNS_NODE_ID, runs.content],
  ]);

  // ELK refines the column layout: the order within each column, and routes around the cards
  const key = layoutKey(layout);
  const [routed, setRouted] = useState<{
    key: string;
    result: { nodes: TLaidOutNode[]; edges: TRoutedEdge[] } | null;
  }>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: the layout is keyed by `key`
  useEffect(() => {
    let cancelled = false;
    routeRunSheet(layout)
      .then((result) => !cancelled && setRouted({ key, result }))
      // without a route, the column layout stands
      .catch(() => !cancelled && setRouted({ key, result: null }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  const ready = routed?.key === key;
  const shown = ready && routed.result ? routed.result : null;
  // hidden until the first route, so the cards do not jump into place
  const hidden = !routed;

  const positionOf = new Map((shown?.nodes ?? layout.nodes).map((n) => [n.id, n]));
  const nodes: Node<CardData>[] = layout.nodes.map((n) => {
    const at = positionOf.get(n.id) ?? n;
    return {
      id: n.id,
      type: 'card',
      position: { x: at.x, y: at.y },
      draggable: false,
      selectable: false,
      // React Flow lets the pointer through a node that is neither dragged nor selected; these
      // cards hold links and buttons, so they keep it
      style: { pointerEvents: 'all' },
      data: {
        kind: n.kind,
        width: n.width,
        height: n.height,
        content: n.block ? renderBlock(n.block) : contentById.get(n.id),
        muted: n.kind === NodeKind.Output && !outputsReady,
      },
    };
  });

  const routeOf = new Map((shown?.edges ?? []).map((e) => [e.id, e]));
  const edges: Edge[] = layout.edges.map((e) => {
    const faint = e.source === RUNS_NODE_ID && !outputsReady;
    const color = e.dashed || faint ? '#cbd5e1' : '#64748b';
    const route = routeOf.get(e.id);
    const style = {
      stroke: color,
      strokeWidth: 1.5,
      strokeDasharray: e.dashed ? '5 4' : undefined,
    };
    const markerEnd = { type: MarkerType.ArrowClosed, color, width: 16, height: 16 };
    return route
      ? {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'routed',
          data: { points: route.points, labelAt: route.labelAt, label: e.label },
          style,
          markerEnd,
        }
      : {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'default',
          label: e.label,
          labelStyle: { fontSize: 11, fill: '#475569' },
          labelBgStyle: { fill: '#f8fafc' },
          labelBgPadding: [4, 2],
          style,
          markerEnd,
        };
  });

  // the view follows the content until the user moves it: then it is theirs
  const userMoved = useRef(false);
  // refit when the shape changes: an output arrives, a run is added
  const shape = `${key}:${ready}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shape` is the trigger, not an input
  useEffect(() => {
    if (userMoved.current) return;
    const frame = requestAnimationFrame(() => fitView({ padding: 0.08, maxZoom: 1 }));
    return () => cancelAnimationFrame(frame);
  }, [shape, fitView]);

  // and when its box changes size: a tab opened on another first lays this one out at no size
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === 0 || userMoved.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitView({ padding: 0.08, maxZoom: 1 }));
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fitView]);

  return (
    <div
      ref={box}
      className={cn('h-full w-full transition-opacity duration-200', hidden && 'opacity-0')}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        // a move with an event is the user's (a fit has none)
        onMoveStart={(event) => {
          if (event) userMoved.current = true;
        }}
      >
        <Background gap={18} color="#e5e7eb" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function RunSheet(props: Props) {
  return (
    <ReactFlowProvider>
      <RunSheetCanvas {...props} />
    </ReactFlowProvider>
  );
}
