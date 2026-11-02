'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { ViewOverlay } from '@/features/viewer-3d/bare';
import { ModelView } from '@/ui/segments/project/models/model-views';
import {
  useWalkthroughActions,
  useWalkthroughEntered,
} from '@/ui/segments/project/walkthrough/walkthrough';
import { getAdoptersContent } from '@/services/sanity/api/get-adopters-content';
import { getClient } from '@/services/sanity/client';
import {
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import { BrainGlass } from './brain-glass';
import grid from './opening-grid.module.css';
import {
  brainFrame,
  COURSE_FRONT,
  FLY_COLOR,
  FLY_FRAME,
  FLY_PLACE,
  H01_MARK,
  IN_PLACE,
  L6_COLOR,
  MICRONS_FRAME,
  MOUSE_FRAME,
  MOUSE_PLACE,
  RAT_FRAME,
  RAT_PLACE,
} from './brains';
import { Turntable } from './turntable';

import type { OwnPack } from '@/features/viewer-3d/bare';
import type { TBrainMesh } from './brains';

import '@/styles/learn.css';

/**
 * The FlyWire neurons inside the fly's brain, turning together: the circuit's own 3D view, framed
 * on the brain, with the course's fly brain as glass over it; colour-by goes in `colorSlot`.
 */
export function FlyInBrain({ colorSlot = null }: { colorSlot?: HTMLElement | null }) {
  return (
    <ViewOverlay
      frame={FLY_FRAME}
      render={(view) => <BrainGlass view={view} brain="fly" place={FLY_PLACE} />}
    >
      <ModelView model="fly" colorSlot={colorSlot} frameZoom={1} color={FLY_COLOR} />
    </ViewOverlay>
  );
}

/**
 * The layer 6 microcircuit in the mouse's brain, in its right hindlimb somatosensory cortex, turning
 * together: the circuit's own 3D view, framed on the brain, with the course's mouse brain as glass.
 */
export function MouseInBrain({ colorSlot = null }: { colorSlot?: HTMLElement | null }) {
  return (
    <ViewOverlay
      frame={MOUSE_FRAME}
      render={(view) => <BrainGlass view={view} brain="root" place={MOUSE_PLACE} />}
    >
      <ModelView model="l6" colorSlot={colorSlot} frameZoom={1} color={L6_COLOR} />
    </ViewOverlay>
  );
}

/**
 * The layer 6 microcircuit in a rat's brain, where it was built from, in its right hindlimb
 * somatosensory cortex, turning together: the circuit's own 3D view, framed on the brain, with the
 * Waxholm rat atlas's brain as glass.
 */
export function RatInBrain({ colorSlot = null }: { colorSlot?: HTMLElement | null }) {
  return (
    <ViewOverlay
      frame={RAT_FRAME}
      render={(view) => <BrainGlass view={view} brain="rat" place={RAT_PLACE} />}
    >
      <ModelView model="l6" colorSlot={colorSlot} frameZoom={1} color={L6_COLOR} />
    </ViewOverlay>
  );
}

/**
 * MICrONS_v1's pack, served by the app, as the circuit has none stored and its project is not ours to store one in:
 * its 877 proofread neurons whole, every neurite (all typed dendrite in its skeletons), at one coarse level (1 µm),
 * and its other 50,071 neurons as somas (build_microns_pack.py in the home_page group, with obi-one's pack writer,
 * from the circuit's open-data files). 7.0 MB, 1.05M segments.
 */
const MICRONS_PACK: OwnPack = {
  id: 'microns',
  url: '/static/walkthrough/microns.mpack',
  size: 7046502,
  sha256: '0c919739cdd7f2e799b7c09e4fc8049df6cae2cdeeb3f71da1414aa703787899',
};

const NOTHING_OVER = () => null;

/** MICrONS as a circuit, upright, turning about the cortex's depth: its somas, and its proofread neurons whole. */
export function MicronsCircuit({ colorSlot = null }: { colorSlot?: HTMLElement | null }) {
  return (
    <ViewOverlay frame={MICRONS_FRAME} render={NOTHING_OVER} pack={MICRONS_PACK}>
      <ModelView model="microns" colorSlot={colorSlot} frameZoom={0.85} />
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
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
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
  { brain: 'root', name: 'Mouse', neurons: '~70 million neurons', inside: 'A cortical microcircuit' },
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
 * A simulation campaign being set up and generated on the Male CNS's LIF model, from the user's recording
 * "2. Simulation Configuration + Generation", its menu bar cropped.
 */
export const CONFIGURATION_VIDEO = {
  src: '/images/start/walkthrough/simulation-configuration.mp4',
  poster: '/images/start/walkthrough/simulation-configuration.jpg',
};

/** The recording of a simulation being set up, in a column of words, coming in once the intro is over. */
export function ConfigurationRecording({ className }: { className?: string }) {
  const entered = useWalkthroughEntered();
  return (
    <video
      src={CONFIGURATION_VIDEO.src}
      poster={CONFIGURATION_VIDEO.poster}
      autoPlay
      muted
      loop
      playsInline
      className={cn(
        'rounded-[12px] border border-neutral-200 shadow-[0_18px_44px_rgba(0,39,102,0.14)] transition-opacity duration-700 ease-out',
        entered ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  );
}


/** A classroom workshop on the platform, from the public homepage's tour (core-web-app#2032). */
export const TEACHING_VIDEO = {
  src: '/images/start/walkthrough/education.mp4',
  poster: '/images/start/walkthrough/education-poster.jpg',
};

/**
 * A simulation's results explored: voltages, rasters, PSTHs and spike statistics beside the circuit in 3D,
 * from the user's recording "3 extra. Intereactive analyze sims", 2:00 to 4:22, its menu bar cut off.
 */
export const ANALYSIS_VIDEO = {
  src: '/images/start/walkthrough/interactive-analysis.mp4',
  poster: '/images/start/walkthrough/interactive-analysis.jpg',
};

/**
 * The platform's early adopters, by their logos, as the public landing on main has them (Sanity's adopters), in
 * white cards on the stage, four to a row and the last row centred; each to its own site.
 */
export function EarlyAdopters() {
  const { data: adopters = [] } = useQuery({
    queryKey: ['walkthrough', 'early-adopters'],
    queryFn: getAdoptersContent,
  });
  return (
    <div className="absolute inset-y-[10vh] right-[clamp(110px,12vw,210px)] left-[2%] flex items-center justify-center">
      <ul className="flex w-full flex-wrap justify-center gap-[clamp(14px,1.6vw,24px)]">
        {adopters.map((adopter, i) => (
          <li
            key={adopter.name}
            className="w-[calc((100%-3*clamp(14px,1.6vw,24px))/4)]"
            style={{ animation: `fade-in 600ms ease-out ${i * 90}ms both` }}
          >
            <a
              href={adopter.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={adopter.name}
              className="group flex aspect-[3/2] items-center justify-center rounded-[16px] border border-neutral-200 bg-white p-[clamp(16px,1.8vw,26px)] shadow-[0_10px_30px_rgba(0,39,102,0.08)] transition-transform duration-300 hover:-translate-y-[3px]"
            >
              {/* White marks made for a dark page, drawn here in the page's ink through their shapes. */}
              <span
                role="img"
                aria-label={adopter.name}
                className="block size-full bg-[#3b4f6e] transition-colors duration-300 group-hover:bg-[#002766]"
                style={{
                  maskImage: `url(${adopter.imageURL})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(${adopter.imageURL})`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The notebooks' animation, as the platform's home shows it on its Notebooks card: from Sanity, whose Get Started
 * cards carry it.
 */
export function NotebooksVideo() {
  const client = getClient();
  const { data: home } = useQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () =>
      client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery, {}, { next: { revalidate: 0 } }),
  });
  const src = home?.getStarted?.find(
    (card) => card.title === 'Notebooks' && card.thumbnailType === 'video'
  )?.video;
  if (!src) return null;
  return <StageVideo video={{ src, poster: '' }} />;
}

/** A recording across the stage beside a screen's words, in the middle of its height. */
export function StageVideo({ video }: { video: { src: string; poster: string } }) {
  return (
    <div className="absolute inset-y-[10vh] right-[clamp(110px,12vw,210px)] left-[2%] flex items-center justify-center">
      <video
        src={video.src}
        poster={video.poster || undefined}
        autoPlay
        muted
        loop
        playsInline
        className="max-h-full max-w-full rounded-[14px] border border-neutral-200 object-contain shadow-[0_24px_60px_rgba(0,39,102,0.14)]"
      />
    </div>
  );
}

/** Into the platform, or a sign-up first: the walkthrough's own buttons, large. */
export function StartNow() {
  const actions = useWalkthroughActions();
  return (
    <div className="flex flex-wrap items-center gap-[14px] pt-[10px]">
      <button
        type="button"
        onClick={actions?.signUp}
        className="bg-green-main rounded-full px-[30px] py-[14px] text-[17px] leading-[22px] font-semibold text-white shadow-[0_6px_18px_rgba(0,140,5,0.28)] transition-[filter] hover:brightness-110"
      >
        Sign up
      </button>
      <button
        type="button"
        onClick={actions?.enter}
        className="rounded-full border-2 border-[#002766] px-[28px] py-[12px] text-[17px] leading-[22px] font-semibold text-[#002766] transition-colors hover:bg-[#002766] hover:text-white"
      >
        Enter the platform
      </button>
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
        className={cn(grid.caption, 'flex flex-col items-center gap-[3px] text-center text-[#1e293b] italic')}
        style={{ fontFamily: SERIF }}
      >
        <span className="text-[22px] leading-[28px]">Fly brain and central nervous system</span>
        <span className="text-[17px] leading-[22px] opacity-75">164,606 neurons</span>
      </p>
    </div>
  );
}
