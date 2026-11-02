'use client';

import { useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import styles from './designs.module.css';
import {
  GROUP_COLORS,
  GROUP_TITLE,
  Place,
  PlaceIcon,
  useBoxSize,
  useShortcutGroups,
} from './shared';

import type { CSSProperties } from 'react';
import type { IShortcut } from '@/ui/segments/project/start/shortcuts';

type Pt = { x: number; y: number };

/** A cubic from `a` to `b`, leaving and arriving level, as a neurite or a dendrogram's branch. */
function bend(a: Pt, b: Pt): string {
  const mid = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
}

/** The same cubic, from `b` back to `a`, its control points swapped, without the move. */
function bendBack(a: Pt, b: Pt): string {
  const mid = (a.x + b.x) / 2;
  return `C ${mid} ${b.y}, ${mid} ${a.y}, ${a.x} ${a.y}`;
}

/**
 * A dendrogram: a neuron's soma on the left, a branch to each group, and a twig from it to each
 * place. A place pointed at sends a signal down its branch to the soma.
 */
export function DendrogramShortcuts() {
  const { groups, base } = useShortcutGroups();
  const [ref, { width, height }] = useBoxSize<HTMLDivElement>();
  const [lit, setLit] = useState<string | null>(null);
  const [signals, setSignals] = useState<Array<{ key: number; d: string }>>([]);
  const fired = useRef(0);

  const count = groups.reduce((n, group) => n + group.shortcuts.length, 0);
  const row = (height - 16) / (count + (groups.length - 1) * 0.9);
  const soma = { x: 16, y: height / 2 };
  const branchX = width * 0.3;
  const leafX = width * 0.5;
  let y = 8 + row / 2;
  const placed = groups.map((group, g) => {
    const leaves = group.shortcuts.map((shortcut) => {
      const leaf = { shortcut, id: `${g}/${shortcut.label}`, x: leafX, y };
      y += row;
      return leaf;
    });
    y += row * 0.9;
    const fork = { x: branchX, y: (leaves[0].y + leaves[leaves.length - 1].y) / 2 };
    return { group, g, fork, leaves };
  });

  return (
    <div ref={ref} className="absolute inset-0">
      {width > 0 && (
        <>
          <svg className="absolute inset-0" width={width} height={height} aria-hidden>
            {placed.map(({ g, fork, leaves }) => (
              <g key={g} stroke={GROUP_COLORS[g]} fill="none" strokeLinecap="round">
                <path
                  d={bend(soma, fork)}
                  strokeWidth={leaves.some((leaf) => leaf.id === lit) ? 3.5 : 2.5}
                  opacity={0.55}
                />
                {leaves.map((leaf) => (
                  <path
                    key={leaf.id}
                    d={bend(fork, leaf)}
                    strokeWidth={leaf.id === lit ? 2 : 1.25}
                    opacity={leaf.id === lit ? 0.95 : 0.4}
                    className="transition-[opacity,stroke-width] duration-200"
                  />
                ))}
              </g>
            ))}
            <circle cx={soma.x} cy={soma.y} r={10} fill="#002766" />
          </svg>
          {placed.map(({ group, g, fork }) => (
            <span
              key={group.title}
              className={cn(GROUP_TITLE, 'absolute -translate-y-full pb-[6px]')}
              style={{ left: fork.x - 40, top: fork.y - 4, color: GROUP_COLORS[g] }}
            >
              {group.title}
            </span>
          ))}
          {signals.map((signal) => (
            <span
              key={signal.key}
              className={styles.signal}
              style={{ offsetPath: `path('${signal.d}')` } as CSSProperties}
              onAnimationEnd={() =>
                setSignals((now) => now.filter((other) => other.key !== signal.key))
              }
            />
          ))}
          {placed.flatMap(({ g, fork, leaves }) =>
            leaves.map((leaf) => (
              <Place
                key={leaf.id}
                shortcut={leaf.shortcut}
                base={base}
                className="group absolute flex -translate-y-1/2 items-center gap-[10px]"
                style={{ left: leaf.x - 15, top: leaf.y }}
                onPoint={() => {
                  setLit(leaf.id);
                  const d = `M ${leaf.x} ${leaf.y} ${bendBack(fork, leaf)} ${bendBack(soma, fork)}`;
                  setSignals((now) => [...now, { key: ++fired.current, d }]);
                }}
                onLeave={() => setLit((now) => (now === leaf.id ? null : now))}
              >
                <span
                  className="flex size-[30px] items-center justify-center rounded-full border bg-white transition-colors duration-200 group-hover:text-white"
                  style={
                    {
                      borderColor: GROUP_COLORS[g],
                      color: GROUP_COLORS[g],
                      '--tw-hover': GROUP_COLORS[g],
                    } as CSSProperties
                  }
                >
                  <span className="flex size-full items-center justify-center rounded-full transition-colors group-hover:bg-(--tw-hover)">
                    <PlaceIcon icon={leaf.shortcut.icon} size={14} />
                  </span>
                </span>
                <span className="text-primary-9 text-[13px] leading-[16px] font-semibold whitespace-nowrap">
                  {leaf.shortcut.label}
                </span>
              </Place>
            ))
          )}
        </>
      )}
    </div>
  );
}

/** A pyramidal cell drawn small: an apical dendrite up from a triangle of a soma, and two basal ones down. */
function Pyramid({ color, lit }: { color: string; lit: boolean }) {
  return (
    <svg width={34} height={46} viewBox="0 0 34 46" aria-hidden className="overflow-visible">
      <g stroke={color} strokeLinecap="round" fill="none" strokeWidth={lit ? 1.8 : 1.2}>
        <path d="M17 26 L17 4 M17 9 L11 3 M17 13 L24 7" />
        <path d="M12 34 L5 43 M22 34 L29 43 M17 35 L17 45" />
      </g>
      <path
        d="M17 22 L24 35 L10 35 Z"
        stroke={color}
        strokeWidth={1.5}
        fill={lit ? color : '#fff'}
        className="transition-[fill] duration-200"
      />
    </svg>
  );
}

/**
 * Cortical layers: a band a group, one under another as a cortex's layers lie, and in each its
 * places as pyramidal cells, lit as they are pointed at.
 */
export function LayerShortcuts() {
  const { groups, base } = useShortcutGroups();
  const [lit, setLit] = useState<string | null>(null);
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[14px] border border-[#e6ecf4]">
      {groups.map((group, g) => (
        <section
          key={group.title}
          className={cn(
            'relative flex min-h-0 flex-1 items-center gap-[8px] border-[#e6ecf4] pr-[12px] pl-[16px]',
            g > 0 && 'border-t border-dashed',
            g % 2 === 0 ? 'bg-[#f7f9fc]' : 'bg-white'
          )}
        >
          <div className="flex w-[86px] shrink-0 flex-col gap-[2px]">
            <span className="font-serif text-[26px] leading-[28px] text-[#c3cedd]">L{g + 1}</span>
            <span className={cn(GROUP_TITLE, 'text-[10px] whitespace-normal')} style={{ color: GROUP_COLORS[g] }}>
              {group.title}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 items-end justify-around">
            {group.shortcuts.map((shortcut) => {
              const id = `${g}/${shortcut.label}`;
              return (
                <Place
                  key={id}
                  shortcut={shortcut}
                  base={base}
                  className="flex flex-col items-center gap-[4px]"
                  onPoint={() => setLit(id)}
                  onLeave={() => setLit((now) => (now === id ? null : now))}
                >
                  <Pyramid color={GROUP_COLORS[g]} lit={lit === id} />
                  <span className="text-primary-9 text-[12px] leading-[15px] font-semibold whitespace-nowrap">
                    {shortcut.label}
                  </span>
                </Place>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** How long each ring takes to go round, s, the inner the quickest, and which way. */
const ORBIT_TURN = [60, 85, 110];

/** An ellipse as a path, from its left, round, and back: for a place to travel along. */
function ellipse(cx: number, cy: number, rx: number, ry: number, clockwise: boolean): string {
  const sweep = clockwise ? 1 : 0;
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 ${sweep} ${cx + rx} ${cy} A ${rx} ${ry} 0 1 ${sweep} ${cx - rx} ${cy}`;
}

/**
 * Orbits: three rings round the platform, building and analysing innermost, then learning and
 * teaching, then the institute, each place gliding round its ring, upright; still while pointed at.
 */
export function OrbitShortcuts() {
  const { groups, base } = useShortcutGroups();
  const [ref, { width, height }] = useBoxSize<HTMLDivElement>();
  const centre = { x: width / 2, y: (height - 28) / 2 };
  const reach = { x: Math.max(0, width / 2 - 52), y: Math.max(0, (height - 28) / 2 - 30) };
  // innermost first: the groups from the last to the first
  const rings = [...groups.keys()].reverse().map((g, ring) => {
    const scale = [0.42, 0.71, 1][ring];
    const clockwise = ring % 2 === 0;
    return {
      g,
      group: groups[g],
      rx: reach.x * scale,
      ry: reach.y * scale,
      turn: ORBIT_TURN[ring],
      d: ellipse(centre.x, centre.y, reach.x * scale, reach.y * scale, clockwise),
    };
  });

  return (
    <div ref={ref} className={cn(styles.orbits, 'absolute inset-0')}>
      {width > 0 && (
        <>
          <svg className="absolute inset-0" width={width} height={height} aria-hidden>
            {rings.map(({ g, rx, ry }) => (
              <ellipse
                key={g}
                cx={centre.x}
                cy={centre.y}
                rx={rx}
                ry={ry}
                fill="none"
                stroke={GROUP_COLORS[g]}
                strokeOpacity={0.25}
                strokeDasharray="2 5"
              />
            ))}
          </svg>
          <div
            className="bg-primary-9 absolute flex size-[62px] -translate-1/2 items-center justify-center rounded-full text-center text-[10px] leading-[12px] font-semibold text-white shadow-[0_0_0_8px_rgba(0,39,102,0.08)]"
            style={{ left: centre.x, top: centre.y }}
          >
            Open Brain
            <br />
            Platform
          </div>
          {rings.flatMap(({ g, group, turn, d }) =>
            group.shortcuts.map((shortcut, i) => (
              <div
                key={shortcut.label}
                className={styles.orbiter}
                style={
                  {
                    offsetPath: `path('${d}')`,
                    animationDuration: `${turn}s`,
                    animationDelay: `${-((i + g * 0.37) / group.shortcuts.length) * turn}s`,
                  } as CSSProperties
                }
              >
                <OrbitPlace shortcut={shortcut} base={base} color={GROUP_COLORS[g]} />
              </div>
            ))
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-[18px]">
            {groups.map((group, g) => (
              <span key={group.title} className={cn(GROUP_TITLE, 'flex items-center gap-[6px] text-[10px]')}>
                <span className="size-[8px] rounded-full" style={{ background: GROUP_COLORS[g] }} />
                <span style={{ color: GROUP_COLORS[g] }}>{group.title}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** A place on an orbit: its icon in a disc of its group's colour, its name under it. */
function OrbitPlace({ shortcut, base, color }: { shortcut: IShortcut; base: string; color: string }) {
  return (
    <Place
      shortcut={shortcut}
      base={base}
      className="group flex translate-y-[12px] flex-col items-center gap-[3px]"
    >
      <span
        className="flex size-[34px] items-center justify-center rounded-full border-2 bg-white transition-transform duration-200 group-hover:scale-115"
        style={{ borderColor: color, color }}
      >
        <PlaceIcon icon={shortcut.icon} size={15} />
      </span>
      <span className="text-primary-9 rounded-full bg-white/85 px-[4px] text-[11px] leading-[14px] font-semibold whitespace-nowrap">
        {shortcut.label}
      </span>
    </Place>
  );
}
