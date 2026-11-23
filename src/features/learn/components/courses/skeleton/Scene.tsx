'use client';

/**
 * The skeleton figure's 3D view and what is drawn over it: one SkeletonViewer for as long as the
 * figure is mounted, which loads the cell once it has been on screen and is told each slide's view
 * and which part of the file is lit; a key to what it shows, the sections' labels, a scale bar, the
 * wipe's handle, and a caption and the cell's credit underneath. Outside its course, inside
 * `Embedded`, it is the view alone, turning.
 */

import { useContext, useEffect, useRef, useState } from 'react';

import { Embedded } from '@/features/learn/components/embedded';
import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

import { loadCell } from './engine/data';
import {
  AXIS_COLOURS,
  DIM,
  GLASS,
  HEIGHT_RAMP,
  LENGTH_RAMP,
  LIT,
  MEMBRANE,
  PLAIN,
  spinePalette,
  TYPE_COLOURS,
  TYPE_NAMES,
} from './engine/paint';
import {
  ARROW_COLOUR,
  CENTRE_COLOUR,
  OWN_SKELETON_COLOUR,
  ROOT_COLOUR,
  type SectionLabel,
  SkeletonViewer,
} from './engine/skeleton-viewer';
import { CELL } from './files';
import { frameClass } from './frame';

import type { ReactNode } from 'react';
import type { LoadedCell } from './engine/data';
import type { H5Part, Layers, Phase, ViewState } from './engine/view';

/** The scale bar's lengths, µm, and the most pixels it may be. */
const BAR_LENGTHS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
const BAR_PX = 96;

const fmt = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));

type Item =
  | { kind: 'swatch'; colour: string; label: string; ring?: boolean }
  | { kind: 'dot'; colour: string; label: string }
  | { kind: 'line'; colour: string; label: string; arrow?: boolean }
  | { kind: 'ramp'; stops: readonly string[]; label: string; from: string; to: string };

/** The key to a view's layers; `pick` is the spine table's row picked. */
function keyOf(
  l: Layers,
  cell: LoadedCell,
  reach: { chosen: number; all: number } | null,
  pick: number
): Item[] {
  const items: Item[] = [];
  if (l.mesh === 'solid')
    items.push({ kind: 'swatch', colour: MEMBRANE, label: 'Membrane: the EM mesh' });
  if (l.mesh === 'glass')
    items.push({ kind: 'swatch', colour: GLASS, label: 'Membrane, see-through', ring: true });
  if (l.skeleton === 'type') {
    const types = new Set(cell.morphology.sections.map((s) => s.type));
    items.push({ kind: 'swatch', colour: TYPE_COLOURS[1], label: 'Soma' });
    for (const t of [...types].sort((a, b) => a - b))
      items.push({
        kind: 'swatch',
        colour: TYPE_COLOURS[t] ?? PLAIN,
        label: TYPE_NAMES[t] ?? `Type ${t}`,
      });
  }
  if (l.skeleton === 'plain') items.push({ kind: 'swatch', colour: PLAIN, label: 'Skeleton' });
  if (l.skeleton === 'section') {
    items.push({ kind: 'swatch', colour: LIT, label: `Section ${cell.info.chosen.section}` });
    items.push({ kind: 'swatch', colour: DIM, label: 'The rest' });
  }
  const n = cell.spines.spineVertexStart.length - 1;
  const palette = spinePalette(6);
  if (l.skeleton === 'sections')
    items.push({
      kind: 'ramp',
      stops: spinePalette(cell.morphology.sections.length),
      label: 'Sections, each its own colour, by afferent_section_id',
      from: '',
      to: '',
    });
  if (l.spines === 'sections')
    items.push({ kind: 'swatch', colour: palette[1], label: "Spines, in their section's colour" });
  if (l.spines === 'each' || l.spines === 'section')
    items.push({
      kind: 'ramp',
      stops: palette,
      label: l.spines === 'each' ? 'Spines, each its own colour' : 'Its spines',
      from: '',
      to: '',
    });
  if ((l.spines === 'one' || l.spines === 'height') && reach)
    items.push({
      kind: 'ramp',
      stops: HEIGHT_RAMP,
      label: 'Distance from the dendrite along the spine',
      from: '0',
      to: `${fmt(l.spines === 'one' ? reach.chosen : reach.all)} µm`,
    });
  if (l.spines === 'length') {
    const [lo, hi] = cell.info.spineLengthRange;
    items.push({
      kind: 'ramp',
      stops: LENGTH_RAMP,
      label: 'spine_length',
      from: `${fmt(lo)}`,
      to: `${fmt(hi)} µm`,
    });
  }
  if (l.spines === 'picked')
    items.push({ kind: 'swatch', colour: spinePalette(n)[pick], label: `Row ${pick}'s spine` });
  if (l.spines === 'one' || l.spines === 'picked' || l.spines === 'others')
    items.push({ kind: 'swatch', colour: DIM, label: 'Other spines' });
  if (l.spineSkeleton) {
    items.push({ kind: 'line', colour: OWN_SKELETON_COLOUR, label: 'Its own skeleton' });
    items.push({ kind: 'dot', colour: ROOT_COLOUR, label: 'Root, where it leaves the dendrite' });
    items.push({ kind: 'dot', colour: CENTRE_COLOUR, label: "Centre, on the dendrite's axis" });
    items.push({
      kind: 'line',
      colour: ARROW_COLOUR,
      label: 'Its direction, as long as the spine',
      arrow: true,
    });
  }
  if (l.markers && l.markers !== 'off') {
    items.push({ kind: 'dot', colour: ROOT_COLOUR, label: 'afferent_surface: its root' });
    items.push({ kind: 'dot', colour: CENTRE_COLOUR, label: 'afferent_center: on the axis' });
    items.push({
      kind: 'line',
      colour: ARROW_COLOUR,
      label: 'spine_orientation_vector, spine_length long',
      arrow: true,
    });
  }
  if (l.skeletons)
    items.push({ kind: 'line', colour: OWN_SKELETON_COLOUR, label: "Each spine's own skeleton" });
  if (l.frame) {
    if (reach)
      items.push({
        kind: 'ramp',
        stops: HEIGHT_RAMP,
        label: `Spine ${cell.info.chosen.spine}, moved from its own frame`,
        from: '0',
        to: `${fmt(reach.chosen)} µm`,
      });
    ['x', 'y: along the spine', 'z'].forEach((axis, k) => {
      items.push({
        kind: 'line',
        colour: AXIS_COLOURS[k],
        label: `Its frame's ${axis}`,
        arrow: true,
      });
    });
  }
  return items;
}

function Key({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="pointer-events-none absolute top-3 left-3 flex max-w-[60%] flex-col gap-1.5 rounded-lg bg-[#07090d]/60 px-3 py-2.5 text-[11.5px] leading-tight text-[#cbd5e1] backdrop-blur-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          {item.kind === 'swatch' && (
            <span
              className={cn(
                'size-3 shrink-0 rounded-[3px]',
                item.ring && 'border-2 bg-transparent'
              )}
              style={item.ring ? { borderColor: item.colour } : { background: item.colour }}
            />
          )}
          {item.kind === 'dot' && (
            <span
              className="size-2.5 shrink-0 rounded-full ring-2 ring-[#0b0e14]"
              style={{ background: item.colour }}
            />
          )}
          {item.kind === 'line' && (
            <span className="relative flex h-3 w-4 shrink-0 items-center">
              <span className="h-[2px] w-full rounded" style={{ background: item.colour }} />
              {item.arrow && (
                <span
                  className="absolute -right-0.5 size-0 border-y-[4px] border-l-[6px] border-y-transparent"
                  style={{ borderLeftColor: item.colour }}
                />
              )}
            </span>
          )}
          {item.kind === 'ramp' ? (
            <span className="flex flex-col gap-1">
              <span>{item.label}</span>
              <span className="flex items-center gap-1.5 text-[10.5px] text-[#94a3b8]">
                {item.from && <span>{item.from}</span>}
                <span
                  className="h-2 w-24 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${item.stops.join(', ')})` }}
                />
                {item.to && <span>{item.to}</span>}
              </span>
            </span>
          ) : (
            <span>{item.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Load the cell into `viewer` once it has been on screen, and tell the figure; or that it failed.
 * Nothing, if the figure has made another viewer since, or none.
 */
function fetchCell(
  viewer: SkeletonViewer,
  current: { current: SkeletonViewer | null },
  done: (cell: LoadedCell) => void,
  failed: (failed: boolean) => void
) {
  viewer
    .seen()
    .then(loadCell)
    .then(
      (c) => {
        if (current.current !== viewer) return;
        viewer.setCell(c);
        done(c);
      },
      () => current.current === viewer && failed(true)
    );
}

export default function Scene({
  state,
  label,
  size = 'full',
  focus = null,
  caption,
}: {
  state: ViewState;
  label: string;
  /** Alone, or beside a panel: shorter on a narrow screen. */
  size?: 'full' | 'side';
  /** The part of the spiny H5 lit, the rest dimmed; or none. */
  focus?: H5Part | null;
  /** What to say under the view, over the cell's credit. */
  caption?: ReactNode;
}) {
  // outside its course, as on the Learn page: the view alone, turning, as tall as the card asks
  const embedded = useContext(Embedded);
  const host = useRef<HTMLDivElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const handle = useRef<HTMLDivElement | null>(null);
  const bar = useRef<HTMLSpanElement | null>(null);
  const barText = useRef<HTMLSpanElement | null>(null);
  const labelSpans = useRef<(HTMLSpanElement | null)[]>([]);
  const drag = useRef<number | null>(null);
  const shownOnce = useRef(false);
  const current = useRef<SkeletonViewer | null>(null);
  const [viewer, setViewer] = useState<SkeletonViewer | null>(null);
  const [cell, setCell] = useState<LoadedCell | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>(null);
  // known once the cell is in the viewer, which is before `cell` is set
  const labels: readonly SectionLabel[] = viewer && cell && !embedded ? viewer.sectionLabels : [];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const created = new SkeletonViewer(el);
    current.current = created;
    setViewer(created);
    return () => {
      current.current = null;
      setViewer(null);
      created.dispose();
    };
  }, []);

  // once on screen: a figure scrolled past, or on a tab in the background, fetches nothing
  useEffect(() => {
    if (viewer) fetchCell(viewer, current, setCell, setFailed);
  }, [viewer]);

  useEffect(() => viewer?.onPhase(setPhase), [viewer]);

  useEffect(
    () =>
      viewer?.onWipe((x) => {
        if (handle.current) handle.current.style.left = `${x * 100}%`;
      }),
    [viewer]
  );

  useEffect(
    () =>
      viewer?.onScale((umPerPx) => {
        const um = BAR_LENGTHS.reduce(
          (best, v) => (v / umPerPx <= BAR_PX ? v : best),
          BAR_LENGTHS[0]
        );
        if (bar.current) bar.current.style.width = `${Math.round(um / umPerPx)}px`;
        if (barText.current) barText.current.textContent = `${um} µm`;
      }),
    [viewer]
  );

  // the sections' labels follow the view, moved without React
  useEffect(() => {
    if (!viewer || !cell || embedded) return;
    return viewer.onLabels((places) => {
      labelSpans.current.forEach((span, k) => {
        if (!span) return;
        const at = places?.[k];
        span.style.display = at ? 'block' : 'none';
        if (at) span.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -50%)`;
      });
    });
  }, [viewer, cell, embedded]);

  // the first view as it is, at once; each one after, glided to
  useEffect(() => {
    if (!viewer || !cell) return;
    viewer.show(state, { instant: !shownOnce.current, spin: embedded || state.spin });
    shownOnce.current = true;
  }, [viewer, cell, state, embedded]);

  useEffect(() => viewer?.setFocus(focus), [viewer, focus]);

  const wiping = state.mesh === 'wipe' && !embedded;
  const onGrab = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer no longer down: the drag still works within the figure
    }
    drag.current = e.pointerId;
  };
  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = frame.current?.getBoundingClientRect();
    if (drag.current !== e.pointerId || !viewer || !box) return;
    viewer.setWipe((e.clientX - box.left) / box.width);
  };
  const onDrop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current === e.pointerId) drag.current = null;
  };

  const layers = phase !== null && state.cycle ? state.cycle[phase] : state;
  const pick = state.pick ?? cell?.info.chosen.spine ?? 0;
  const items = cell && !embedded ? keyOf(layers, cell, viewer?.heightReach ?? null, pick) : [];

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        ref={frame}
        className={frameClass(embedded, size)}
        // a drag across it turns the cell, rather than swiping on to another slide
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div
          ref={host}
          role="img"
          aria-label={label}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        />
        {labels.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {labels.map((l, k) => (
              <span
                key={l.text}
                ref={(el) => {
                  labelSpans.current[k] = el;
                }}
                className="absolute top-0 left-0 rounded-full border bg-[#07090d]/75 px-1.5 py-px font-mono text-[10.5px] leading-tight whitespace-nowrap"
                style={{ display: 'none', borderColor: l.colour, color: l.colour }}
              >
                {l.text}
              </span>
            ))}
          </div>
        )}
        {!cell && !failed && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-[#94a3b8]">
            Loading the cell…
          </p>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[13px] text-[#cbd5e1]">
            The cell could not be loaded.
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                if (viewer) fetchCell(viewer, current, setCell, setFailed);
              }}
              className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Try again
            </button>
          </div>
        )}
        {!embedded && <Key items={items} />}
        {!embedded && cell && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col items-start gap-1 text-[10.5px] text-[#cbd5e1]">
            <span ref={barText} />
            <span ref={bar} className="h-[3px] rounded-full bg-[#e2e8f0]" />
          </div>
        )}
        {!embedded && cell && (
          <span className="pointer-events-none absolute right-3 bottom-3 text-[10.5px] text-[#64748b]">
            Drag to turn · Ctrl + scroll to zoom
          </span>
        )}
        <div
          ref={handle}
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 w-10 -translate-x-1/2 cursor-ew-resize touch-none select-none',
            !(wiping && cell) && 'hidden'
          )}
          onPointerDown={onGrab}
          onPointerMove={onDrag}
          onPointerUp={onDrop}
          onPointerCancel={onDrop}
        >
          <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#f1f5f9]/85 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
          <span className="absolute top-1/2 right-1/2 mr-6 -translate-y-1/2 text-[11px] whitespace-nowrap text-[#f1f5f9] [text-shadow:0_1px_3px_#000]">
            EM mesh
          </span>
          <span className="absolute top-1/2 left-1/2 ml-6 -translate-y-1/2 text-[11px] whitespace-nowrap text-[#f1f5f9] [text-shadow:0_1px_3px_#000]">
            Skeleton and spines
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#f1f5f9]/80 bg-[#0b0e14]/80 text-[13px] text-[#f1f5f9] shadow-lg">
            ⇔
          </span>
        </div>
      </div>
      {!embedded && caption && (
        <p
          className="text-[12.5px] leading-snug text-slate-400 italic"
          style={{ fontFamily: SERIF }}
        >
          {caption}
        </p>
      )}
      {!embedded && <p className="text-[11px] leading-snug text-slate-500">{CELL.caption}</p>}
    </div>
  );
}
