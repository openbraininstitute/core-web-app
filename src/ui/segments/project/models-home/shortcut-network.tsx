'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { config } from '@/config';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { categories, shortcutHref } from '@/ui/segments/project/start/shortcuts';
import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';
import type { IShortcut } from '@/ui/segments/project/start/shortcuts';

import styles from './shortcut-network.module.css';

/** A node's circle, px; the room for the group titles over the columns and the labels under the last row. */
const NODE = 46;
const TOP = 44;
const BOTTOM = 34;
/** Where each group's column stands, as a share of the width. */
const COLUMNS = [0.13, 0.5, 0.87];
/** Spikes travelling the connections at any time, unbidden. */
const AMBIENT = 10;

type TNode = IShortcut & { id: string; x: number; y: number };
type TEdge = { id: string; from: TNode; to: TNode; d: string };

/** A connection from one column to the next, curving like a neurite. */
function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const bend = (b.x - a.x) * 0.5;
  return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`;
}

/** The same numbers every render, for spikes that are not random on the server and again in the browser. */
const spread = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The first home's places as a small neural network: a column of nodes per group, each wired to
 * every node of the next, with spikes running the wires. A node pointed at lights its wires and
 * fires along each of them; a click goes to its place.
 */
export function NetworkShortcuts() {
  const { virtualLabId, projectId } = useWorkspace();
  const learn = useFlag(learnFlag.key) === true;
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const groups = useMemo(() => categories({ learn }), [learn]);

  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const sized = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    sized.observe(box);
    return () => sized.disconnect();
  }, []);

  const { width, height } = size;
  const { nodes, edges } = useMemo(() => {
    const placed: TNode[][] = groups.map((group, g) => {
      const room = height - TOP - BOTTOM;
      return group.shortcuts.map((shortcut, i) => ({
        ...shortcut,
        id: `${g}/${shortcut.label}`,
        x: COLUMNS[g] * width,
        y: TOP + ((i + 0.5) * room) / group.shortcuts.length,
      }));
    });
    const wires: TEdge[] = placed
      .slice(1)
      .flatMap((column, g) =>
        placed[g].flatMap((from) =>
          column.map((to) => ({ id: `${from.id}>${to.id}`, from, to, d: curve(from, to) }))
        )
      );
    return { nodes: placed.flat(), edges: wires };
  }, [groups, width, height]);

  // Spikes running unbidden: each its own wire, speed and moment.
  const ambient = useMemo(
    () =>
      edges.length === 0
        ? []
        : Array.from({ length: AMBIENT }, (_, i) => ({
            id: i,
            d: edges[Math.floor(spread(i, 1) * edges.length)].d,
            duration: 2.4 + spread(i, 2) * 2.2,
            delay: -spread(i, 3) * 4,
          })),
    [edges]
  );

  // The node pointed at, and the spikes it fired, each away from it along one of its wires.
  const [pointed, setPointed] = useState<string | null>(null);
  const [bursts, setBursts] = useState<Array<{ key: number; d: string }>>([]);
  const fired = useRef(0);
  const fire = (node: TNode) => {
    setPointed(node.id);
    const out = edges
      .filter((edge) => edge.from.id === node.id || edge.to.id === node.id)
      .map((edge) => ({
        key: ++fired.current,
        d: edge.from.id === node.id ? edge.d : curve(edge.to, edge.from),
      }));
    setBursts((now) => [...now, ...out]);
  };

  return (
    <div ref={boxRef} className="absolute inset-0">
        {width > 0 && (
          <>
            {groups.map((group, g) => (
              <span
                key={group.title}
                className="text-label absolute top-0 -translate-x-1/2 text-[11px] leading-[16px] font-semibold tracking-[1.2px] whitespace-nowrap uppercase"
                style={{ left: COLUMNS[g] * width }}
              >
                {group.title}
              </span>
            ))}
            <svg className="absolute inset-0" width={width} height={height} aria-hidden>
              {edges.map((edge) => (
                <path
                  key={edge.id}
                  d={edge.d}
                  className={cn(
                    styles.edge,
                    pointed !== null &&
                      (edge.from.id === pointed || edge.to.id === pointed) &&
                      styles.edgeLit
                  )}
                />
              ))}
            </svg>
            {ambient.map((spike) => (
              <span
                key={spike.id}
                className={styles.spike}
                style={
                  {
                    offsetPath: `path('${spike.d}')`,
                    animationDuration: `${spike.duration}s`,
                    animationDelay: `${spike.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
            {bursts.map((burst) => (
              <span
                key={burst.key}
                className={cn(styles.spike, styles.burst)}
                style={{ offsetPath: `path('${burst.d}')` } as CSSProperties}
                onAnimationEnd={() =>
                  setBursts((now) => now.filter((other) => other.key !== burst.key))
                }
              />
            ))}
            {nodes.map((node) => (
              <ShortcutNode
                key={node.id}
                node={node}
                base={base}
                onPoint={() => fire(node)}
                onLeave={() => setPointed((now) => (now === node.id ? null : now))}
              />
            ))}
          </>
        )}
    </div>
  );
}

/** A place as a node: its icon in a circle on the wires, its name under it. */
function ShortcutNode({
  node,
  base,
  onPoint,
  onLeave,
}: {
  node: TNode;
  base: string;
  onPoint: () => void;
  onLeave: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          styles.node,
          'flex items-center justify-center rounded-full border bg-white',
          node.href
            ? 'border-primary-3 group-hover:border-primary-9 group-hover:bg-primary-9 shadow-[0_2px_8px_rgba(0,39,102,0.08)] group-hover:scale-110 group-hover:shadow-[0_0_0_6px_rgba(22,119,255,0.12)]'
            : 'border-neutral-200'
        )}
        style={{ width: NODE, height: NODE }}
      >
        <img
          src={`/images/start/icons/${node.icon}.svg`}
          alt=""
          width={16}
          height={16}
          className={cn(
            'transition-[filter]',
            node.href ? 'group-hover:brightness-0 group-hover:invert' : 'opacity-40'
          )}
        />
      </span>
      <span
        className={cn(
          'mt-[6px] text-[12px] leading-[15px] font-semibold whitespace-nowrap',
          node.href ? 'text-primary-8' : 'text-neutral-400'
        )}
      >
        {node.label}
      </span>
    </>
  );
  const place = { left: node.x, top: node.y - NODE / 2 };
  const className = 'group absolute z-10 flex -translate-x-1/2 flex-col items-center';
  if (!node.href) {
    return (
      <span className={cn(className, 'cursor-default')} style={place} title="Coming soon">
        {content}
      </span>
    );
  }
  return (
    <Link
      href={shortcutHref(node.href, base)}
      className={className}
      style={place}
      onMouseEnter={onPoint}
      onMouseLeave={onLeave}
      onFocus={onPoint}
      onBlur={onLeave}
    >
      {content}
    </Link>
  );
}
