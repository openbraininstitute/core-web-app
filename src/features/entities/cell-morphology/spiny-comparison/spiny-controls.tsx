'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import {
  DISTANCE_RAMP,
  LENGTH_RAMP,
  type SpineColouring,
  TYPE_COLOURS,
  TYPE_NAMES,
} from './engine/colours';
import { OVERLAY_OPACITY } from './engine/spiny-viewer';

import type {
  GridLabel,
  MeshMode,
  SpinyComparisonViewer,
  SpinyLayers,
  TourState,
} from './engine/spiny-viewer';
import type { SpinyLoad } from './use-spiny-morphology';

const COLOURINGS: { id: SpineColouring; label: string }[] = [
  { id: 'each', label: 'Each its own' },
  { id: 'length', label: 'Length' },
  { id: 'distance', label: 'Distance from soma' },
  { id: 'section', label: 'Section' },
];

const MESH_MODES: { id: MeshMode; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'glass', label: 'Glass' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'off', label: 'Off' },
];

const STAGE_NAMES = {
  download: 'Downloading the spiny H5',
  open: 'Opening the file',
  skeleton: 'Reading the skeleton',
  spines: 'Placing the spines',
  normals: 'Shading the spines',
  done: 'Spines ready',
} as const;

const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;
const count = (n: number) => n.toLocaleString('en-GB');

function Toggle({
  on,
  onClick,
  children,
  swatch,
}: {
  on: boolean;
  onClick(): void;
  children: string;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        on
          ? 'border-white/70 bg-white/90 text-slate-900'
          : 'border-white/25 bg-transparent text-white/70 hover:border-white/50'
      )}
    >
      {swatch && <span className="size-2.5 rounded-full" style={{ background: swatch }} />}
      {children}
    </button>
  );
}

/** A colour ramp's key: its two ends named either side. */
function Ramp({ stops, from, to }: { stops: readonly string[]; from: string; to: string }) {
  return (
    <span className="flex items-center gap-1">
      {from}
      <span
        className="h-2 w-16 rounded-full"
        style={{ background: `linear-gradient(90deg, ${stops.join(', ')})` }}
      />
      {to}
    </span>
  );
}

/** What the load of the spiny H5 has got to, or what is loaded. */
function status(load: SpinyLoad): string {
  if (load.error) return `Could not load the spines: ${load.error}`;
  if (load.counts) {
    const c = load.counts;
    return `${count(c.spines)} spines · ${count(c.spineTriangles)} triangles · ${count(c.sections)} sections`;
  }
  const p = load.progress;
  if (!p) return 'Fetching the spiny H5…';
  if (p.stage === 'download')
    return `${STAGE_NAMES.download}: ${mb(p.done)}${p.total ? ` of ${mb(p.total)}` : ''}`;
  if ((p.stage === 'spines' || p.stage === 'normals') && p.total)
    return `${STAGE_NAMES[p.stage]}: ${count(p.done)} of ${count(p.total)}`;
  return `${STAGE_NAMES[p.stage]}…`;
}

/**
 * The comparison's own controls, along the foot of the view: what is on show, the wipe, how the spines are coloured,
 * and the camera's flights; with the legend and what the spiny H5's load has got to.
 */
export function SpinyControls({
  viewer,
  load,
}: {
  viewer: SpinyComparisonViewer;
  load: SpinyLoad;
}) {
  const [layers, setLayers] = useState<SpinyLayers>({
    mesh: 'solid',
    skeleton: true,
    spines: true,
  });
  const [wipe, setWipe] = useState(true);
  const [colouring, setColouring] = useState<SpineColouring>('each');
  const [spine, setSpine] = useState<number | null>(null);
  const [grid, setGrid] = useState(false);
  const [overlay, setOverlay] = useState(OVERLAY_OPACITY);
  const [tour, setTour] = useState<TourState | null>(null);
  useEffect(() => viewer.onTour(setTour), [viewer]);
  const ready = !!load.counts;
  const ranges = ready ? viewer.spineRanges : null;

  useEffect(() => viewer.setLayers(layers), [viewer, layers]);
  useEffect(() => viewer.setWipe(wipe), [viewer, wipe]);
  useEffect(() => viewer.setSpineColouring(colouring), [viewer, colouring]);
  useEffect(() => viewer.setOverlayOpacity(overlay), [viewer, overlay]);

  const flip = (k: 'skeleton' | 'spines') => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const toGrid = () => {
    setSpine(null);
    viewer.setGrid(!grid);
    setGrid(!grid);
  };

  return (
    <>
      <WipeHandle
        viewer={viewer}
        shown={ready && wipe && layers.mesh !== 'off' && layers.mesh !== 'overlay' && !grid}
      />
      {grid && <GridLabels viewer={viewer} />}
      <div className="pointer-events-none absolute inset-x-0 bottom-12 z-30 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-white shadow-lg backdrop-blur">
          <span className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="size-2.5 rounded-full bg-[#b9b2a8]" />
            EM mesh
          </span>
          {MESH_MODES.map((m) => (
            <Toggle
              key={m.id}
              on={layers.mesh === m.id}
              onClick={() => setLayers((l) => ({ ...l, mesh: m.id }))}
            >
              {m.label}
            </Toggle>
          ))}
          {layers.mesh === 'overlay' && (
            <label className="flex items-center gap-1.5 text-xs text-white/70">
              <input
                type="range"
                aria-label="How opaque the overlaid mesh is"
                min={0.05}
                max={0.9}
                step={0.05}
                value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="h-1 w-20 accent-white"
              />
              {Math.round(overlay * 100)}%
            </label>
          )}
          <span className="h-5 w-px bg-white/20" />
          <Toggle on={layers.skeleton} onClick={() => flip('skeleton')} swatch={TYPE_COLOURS[3]}>
            Skeleton
          </Toggle>
          <Toggle on={layers.spines} onClick={() => flip('spines')} swatch="#f472b6">
            Spines
          </Toggle>
          <span className="h-5 w-px bg-white/20" />
          <Toggle on={wipe} onClick={() => setWipe((w) => !w)}>
            Wipe
          </Toggle>
          <span className="h-5 w-px bg-white/20" />
          <span className="text-xs text-white/60">Spines by</span>
          {COLOURINGS.map((c) => (
            <Toggle key={c.id} on={colouring === c.id} onClick={() => setColouring(c.id)}>
              {c.label}
            </Toggle>
          ))}
          <span className="h-5 w-px bg-white/20" />
          <button
            type="button"
            disabled={!ready}
            aria-pressed={grid}
            onClick={toGrid}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              grid
                ? 'bg-white text-slate-900'
                : 'bg-fuchsia-500 text-white hover:bg-fuchsia-400 disabled:opacity-40'
            )}
          >
            {grid ? 'Spines back on the cell' : 'Spines to a grid'}
          </button>
          <button
            type="button"
            disabled={!ready || grid}
            onClick={() => setSpine(viewer.nextSpine())}
            className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-40"
          >
            {spine === null ? 'Zoom to a spine' : 'Next spine'}
          </button>
          <span className="h-5 w-px bg-white/20" />
          <span className="text-xs text-white/60">Fly through</span>
          <button
            type="button"
            disabled={!ready || grid}
            aria-pressed={tour?.kind === 'follow'}
            onClick={() => {
              setSpine(null);
              viewer.startFollow();
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40',
              tour?.kind === 'follow'
                ? 'border-amber-300 bg-amber-300 text-slate-900'
                : 'border-amber-300/70 text-amber-200 hover:bg-amber-300/15'
            )}
          >
            {tour?.kind === 'follow' ? 'Next dendrite' : 'Follow a dendrite'}
          </button>
          <button
            type="button"
            disabled={!ready || grid}
            aria-pressed={tour?.kind === 'cinematic'}
            onClick={() => {
              setSpine(null);
              if (tour?.kind === 'cinematic') viewer.stopTour();
              else viewer.startCinematic();
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40',
              tour?.kind === 'cinematic'
                ? 'border-amber-300 bg-amber-300 text-slate-900'
                : 'border-amber-300/70 text-amber-200 hover:bg-amber-300/15'
            )}
          >
            {tour?.kind === 'cinematic' ? 'Stop' : 'Cinematic'}
          </button>
          {tour?.kind === 'follow' && (
            <button
              type="button"
              onClick={() => viewer.stopTour()}
              className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/85 hover:border-white/60"
            >
              Stop
            </button>
          )}
          <span className="h-5 w-px bg-white/20" />
          <button
            type="button"
            disabled={grid}
            onClick={() => {
              setSpine(null);
              viewer.home();
            }}
            className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/85 hover:border-white/60"
          >
            Whole cell
          </button>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-slate-950/55 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
          <span className={cn(load.error && 'text-rose-300')}>{status(load)}</span>
          {[1, 2, 3, 4].map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: TYPE_COLOURS[t] }} />
              {TYPE_NAMES[t]}
            </span>
          ))}
          {colouring === 'length' && ranges && (
            <Ramp
              stops={LENGTH_RAMP}
              from={`${ranges.length[0].toFixed(1)} µm`}
              to={`${ranges.length[1].toFixed(1)} µm long`}
            />
          )}
          {colouring === 'distance' && ranges && (
            <Ramp
              stops={DISTANCE_RAMP}
              from="at the soma"
              to={`${Math.round(ranges.distance)} µm and more, along the dendrites`}
            />
          )}
          {spine !== null && <span>Spine {count(spine)} of the table</span>}
          {grid && <span>Grid: by the type of section, then by section and distance along it</span>}
          {tour && <span className="text-amber-200">{tour.label} · drag to take over</span>}
        </div>
      </div>
    </>
  );
}

/** Over each block of the grid, what it holds: the type of section its spines sit on, and how many. */
function GridLabels({ viewer }: { viewer: SpinyComparisonViewer }) {
  const [labels, setLabels] = useState<GridLabel[] | null>(null);
  useEffect(() => viewer.onGridLabels(setLabels), [viewer]);
  if (!labels) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {labels.map(({ block, x, y }) => (
        <span
          key={block.type}
          className="absolute text-xs font-semibold whitespace-nowrap text-white [text-shadow:0_1px_3px_#000]"
          style={{ transform: `translate(${x}px, ${y}px) translateY(-100%)` }}
        >
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ background: TYPE_COLOURS[block.type] ?? '#8d99ad' }}
          />
          {TYPE_NAMES[block.type] ?? 'Other'} · {count(block.count)} spines
        </span>
      ))}
    </div>
  );
}

/** The wipe's line across the view, dragged left and right: the EM mesh left of it, the skeleton and spines right. */
export function WipeHandle({ viewer, shown }: { viewer: SpinyComparisonViewer; shown: boolean }) {
  const handle = useRef<HTMLDivElement | null>(null);
  const drag = useRef<number | null>(null);

  useEffect(
    () =>
      viewer.onWipe((x) => {
        if (handle.current) handle.current.style.left = `${x * 100}%`;
      }),
    [viewer]
  );

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = handle.current?.parentElement?.getBoundingClientRect();
    if (drag.current !== e.pointerId || !box) return;
    viewer.setWipe(true, (e.clientX - box.left) / box.width);
  };

  return (
    <div
      ref={handle}
      aria-hidden="true"
      className={cn(
        'absolute inset-y-0 z-20 w-10 -translate-x-1/2 cursor-ew-resize touch-none select-none',
        !shown && 'hidden'
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = e.pointerId;
      }}
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/85 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
      <span className="absolute top-1/3 right-1/2 mr-6 text-[11px] whitespace-nowrap text-white [text-shadow:0_1px_3px_#000]">
        EM mesh
      </span>
      <span className="absolute top-1/3 left-1/2 ml-6 text-[11px] whitespace-nowrap text-white [text-shadow:0_1px_3px_#000]">
        Skeleton and spines
      </span>
      <span className="absolute top-1/3 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-slate-950/80 text-[13px] text-white shadow-lg">
        ⇔
      </span>
    </div>
  );
}
