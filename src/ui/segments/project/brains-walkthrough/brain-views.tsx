'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { ViewOverlay } from '@/features/viewer-3d/bare';
import { ModelView } from '@/ui/segments/project/models/model-views';
import { PackView } from '@/ui/segments/project/models/pack-view';
import { FLY_PACK, L6_PACK, MICRONS_PACK } from '@/ui/segments/project/models/repo-packs';
import { cn } from '@/utils/css-class';

import { BrainGlass } from './brain-glass';
import {
  brainFrame,
  COURSE_FRONT,
  FLY_COLOR,
  FLY_FRAME,
  FLY_PLACE,
  H01_MARK,
  IN_PLACE,
  L6_COLOR,
  MICRONS_COLOR,
  MICRONS_FRAME,
  MOUSE_FRAME,
  MOUSE_PLACE,
  RAT_FRAME,
  RAT_PLACE,
} from './brains';
import { Turntable } from './turntable';

import type { TBrainMesh } from './brains';

import grid from './opening-grid.module.css';

import '@/styles/learn.css';

/**
 * The FlyWire neurons nearest the surface of the fly's brain, turning together: their pack in the repo, framed on the
 * brain, with the course's fly brain as glass over it.
 */
export function FlyInBrain({
  spinning = true,
  onReady,
}: {
  spinning?: boolean;
  onReady?: () => void;
} = {}) {
  return (
    <ViewOverlay
      frame={FLY_FRAME}
      onBuilt={onReady}
      render={(view) => <BrainGlass view={view} brain="fly" place={FLY_PLACE} />}
    >
      <PackView pack={FLY_PACK} color={FLY_COLOR} frameZoom={1} spin={spinning} />
    </ViewOverlay>
  );
}

/**
 * The layer 6 microcircuit in the mouse's brain, in its right hindlimb somatosensory cortex, turning together: its pack
 * in the repo, framed on the brain, with the course's mouse brain as glass.
 */
export function MouseInBrain() {
  return (
    <ViewOverlay
      frame={MOUSE_FRAME}
      render={(view) => <BrainGlass view={view} brain="root" place={MOUSE_PLACE} />}
    >
      <PackView pack={L6_PACK} color={L6_COLOR} frameZoom={1} spin />
    </ViewOverlay>
  );
}

/**
 * The layer 6 microcircuit in a rat's brain, where it was built from, in its right hindlimb somatosensory cortex,
 * turning together: its pack in the repo, framed on the brain, with the Waxholm rat atlas's brain as glass.
 */
export function RatInBrain() {
  return (
    <ViewOverlay
      frame={RAT_FRAME}
      render={(view) => <BrainGlass view={view} brain="rat" place={RAT_PLACE} />}
    >
      <PackView pack={L6_PACK} color={L6_COLOR} frameZoom={1} spin />
    </ViewOverlay>
  );
}

const NOTHING_OVER = () => null;

/** MICrONS upright, turning about the cortex's depth: its pack in the repo, its somas and its proofread neurons whole. */
export function MicronsCircuit() {
  return (
    <ViewOverlay frame={MICRONS_FRAME} render={NOTHING_OVER}>
      <PackView pack={MICRONS_PACK} color={MICRONS_COLOR} frameZoom={0.85} spin />
    </ViewOverlay>
  );
}

/**
 * One of the course's brains on its own, turning as the 3D views do, from in front; `mark`ed where
 * asked; `turnable` by a drag too; `onLoaded` told once it is drawn.
 */
export function BrainAlone({
  brain,
  mark,
  onMark,
  turnable = false,
  onLoaded,
}: {
  brain: TBrainMesh;
  mark?: readonly [number, number, number];
  onMark?: (x: number, y: number) => void;
  turnable?: boolean;
  onLoaded?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Turntable | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const turntable = new Turntable(host, { turnable });
    turntable.setFrameBox(brainFrame(brain, IN_PLACE, COURSE_FRONT));
    setView(turntable);
    return () => turntable.dispose();
  }, [brain, turnable]);
  return (
    <div ref={hostRef} className="absolute inset-0">
      {view && (
        <BrainGlass
          view={view}
          brain={brain}
          place={IN_PLACE}
          mark={mark}
          onMark={onMark}
          onLoaded={onLoaded}
        />
      )}
    </div>
  );
}

/**
 * The H01 neuron with the human brain it came from: the brain turning, marked where the neuron was
 * taken, and the neuron itself in a lens, a line from the mark to it; too small to see at the brain's
 * scale, a millimetre in eighteen centimetres.
 */
export function HumanWithBrain({ compact = false }: { compact?: boolean }) {
  const brainRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  // From the mark, as the brain view draws it, to the lens's rim, in the box both are in.
  const onMark = useCallback((x: number, y: number) => {
    const brain = brainRef.current;
    const lens = lensRef.current;
    const line = lineRef.current;
    if (!brain || !lens || !line) return;
    const from = { x: brain.offsetLeft + x, y: brain.offsetTop + y };
    const r = lens.offsetWidth / 2;
    const centre = { x: lens.offsetLeft + r, y: lens.offsetTop + r };
    const away = Math.hypot(from.x - centre.x, from.y - centre.y) || 1;
    line.setAttribute('x1', `${from.x}`);
    line.setAttribute('y1', `${from.y}`);
    line.setAttribute('x2', `${centre.x + ((from.x - centre.x) * r) / away}`);
    line.setAttribute('y2', `${centre.y + ((from.y - centre.y) * r) / away}`);
  }, []);
  return (
    <div className="absolute inset-0">
      <div
        ref={brainRef}
        className={cn('absolute bottom-0 left-0', compact ? 'h-[78%] w-full' : 'h-[80%] w-[66%]')}
      >
        <BrainAlone brain="human" mark={H01_MARK} onMark={onMark} />
      </div>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
        <line ref={lineRef} stroke="#d6336c" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
      <div
        ref={lensRef}
        className={cn(
          'absolute aspect-square overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(214,51,108,0.45),0_12px_32px_rgba(0,39,102,0.12)]',
          compact ? 'top-0 right-[18%] w-[30%]' : 'top-[6%] right-[4%] w-[38%]'
        )}
      >
        <ModelView model="human" />
      </div>
    </div>
  );
}

const TRIO = [
  { brain: 'fly', name: 'Fruit fly', neurons: '~140,000 neurons', inside: 'FlyWire neurons' },
  {
    brain: 'root',
    name: 'Mouse',
    neurons: '~70 million neurons',
    inside: 'A cortical microcircuit',
  },
  { brain: 'human', name: 'Human', neurons: '~86 billion neurons', inside: 'An H01 neuron' },
] as const;

/** How wide each brain's view is, a share of the row: more than its third, so that neighbours overlap. */
const TRIO_VIEW = 0.5;
/** Where along the row each brain and its name are centred: the outer two a little in from the edges. */
const TRIO_AT = [0.2, 0.5, 0.8];

/**
 * The course's three brains side by side, each turning, with what of it the platform holds inside. Each
 * brain's view is wider than its third of the row and runs into its neighbours'; laid over each other
 * as ink on paper (multiplied), their white falls away and where they overlap they show through each
 * other. Their names stay in a row of thirds underneath.
 */
export function BrainTrio() {
  return (
    <div className="absolute inset-0">
      {TRIO.map(({ brain }, i) => (
        <div
          key={brain}
          className="absolute top-0 bottom-[140px] mix-blend-multiply"
          style={{ left: `${(TRIO_AT[i] - TRIO_VIEW / 2) * 100}%`, width: `${TRIO_VIEW * 100}%` }}
        >
          {brain === 'fly' && <FlyInBrain />}
          {brain === 'root' && <MouseInBrain />}
          {brain === 'human' && <HumanWithBrain compact />}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-x-0 bottom-[64px] h-[76px]">
        {TRIO.map(({ brain, name, neurons, inside }, i) => (
          // Set as the course sets its own row of brains: italic serif, in its ink.
          <p
            key={brain}
            className="absolute top-0 flex w-[30%] -translate-x-1/2 flex-col items-center gap-[3px] text-center text-[#1e293b] italic"
            style={{ left: `${TRIO_AT[i] * 100}%`, fontFamily: SERIF }}
          >
            <span className="text-[22px] leading-[28px]">{name}</span>
            <span className="text-[17px] leading-[22px] opacity-75">{neurons}</span>
            {inside && <span className="text-[14px] leading-[18px] opacity-60">{inside}</span>}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * The walkthrough's first screen's own layer under its words: white behind them, fading out towards the
 * model floating over the right, which fades out behind it as it turns or is turned into it; and the
 * model's name under it.
 */
export function BrainsOpening() {
  return (
    <div className={cn(grid.grid, 'absolute inset-0')}>
      <div aria-hidden className={grid.fade} />
      {/* Set as the brain modelling course names its brains on its first slide: italic serif, in its ink. */}
      <p
        className={cn(
          grid.caption,
          'flex flex-col items-center gap-[3px] text-center text-[#1e293b] italic'
        )}
        style={{ fontFamily: SERIF }}
      >
        <span className="text-[22px] leading-[28px]">Fly brain and central nervous system</span>
        <span className="text-[17px] leading-[22px] opacity-75">164,606 neurons</span>
      </p>
    </div>
  );
}

export {
  ANALYSIS_VIDEO,
  CONFIGURATION_VIDEO,
  ConfigurationRecording,
  EarlyAdopters,
  NOTEBOOKS_VIDEO,
  StageVideo,
  StartNow,
  TEACHING_VIDEO,
  type TVideoTitle,
  VIRTUAL_LABS_VIDEO,
  VirtualLabsPoints,
  VirtualLabsPreview,
} from './recorded-views';
