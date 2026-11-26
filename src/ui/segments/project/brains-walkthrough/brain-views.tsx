'use client';

import { useQuery } from '@tanstack/react-query';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { ViewOverlay } from '@/features/viewer-3d/bare';
import { getAdoptersContent } from '@/services/sanity/api/get-adopters-content';
import { ModelView } from '@/ui/segments/project/models/model-views';
import { PackView } from '@/ui/segments/project/models/pack-view';
import { FLY_PACK, L6_PACK, MICRONS_PACK } from '@/ui/segments/project/models/repo-packs';
import {
  useWalkthroughActions,
  useWalkthroughEntered,
} from '@/ui/segments/project/walkthrough/walkthrough';
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

import getStarted from './get-started.module.css';
import grid from './opening-grid.module.css';
import labs from './virtual-labs.module.css';

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
 * A simulation campaign being set up and generated on the Male CNS's LIF model, from the user's recording
 * "2. Simulation Configuration + Generation", its menu bar cropped, cut down to three moments of configuration at
 * 1.25x (10 s): naming the campaign, filtering a neuron set beside the 3D brain, then stimulus and recordings.
 */
export const CONFIGURATION_VIDEO = {
  src: '/images/start/walkthrough/simulation-configuration.mp4',
  poster: '/images/start/walkthrough/simulation-configuration.jpg',
};

/**
 * The Virtual Labs screen's working video, straight cuts of the user's recordings: a neuron skeletonized, then a
 * simulation's results (harness/labs_video/make.sh in the home_page group, which lists them).
 */
export const VIRTUAL_LABS_VIDEO = {
  src: '/images/start/walkthrough/virtual-labs.mp4',
  poster: '/images/start/walkthrough/virtual-labs.jpg',
};

/** A crisp platform recording with a soft shadow beneath it. */
export function VirtualLabsPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (preference.matches) {
        videoRef.current?.pause();
      }
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return (
    <figure data-chapter-media className={labs.preview}>
      <video
        ref={videoRef}
        src={VIRTUAL_LABS_VIDEO.src}
        poster={VIRTUAL_LABS_VIDEO.poster}
        autoPlay
        muted
        loop
        playsInline
        aria-label="Virtual Labs platform walkthrough"
        className={labs.video}
      />
    </figure>
  );
}

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
        labs.blendedVideo,
        'transition-opacity duration-700 ease-out',
        entered ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  );
}

const VIRTUAL_LABS_POINTS = [
  {
    title: 'Explore data across species',
    detail: 'Discover neurons, circuits and whole-brain models.',
  },
  {
    title: 'Build and simulate brain models',
    detail: 'Go from a scientific question to a simulation.',
  },
  {
    title: 'Share the results with your team',
    detail: 'Keep your data and discoveries in one shared lab.',
  },
];
/**
 * When the first point comes after the landing starts to leave, as the page comes to rest, and the gap to the next, ms.
 * For now, the three spread over the video's 9 s, not yet in time with what it shows.
 */
const POINTS_MS = { first: 1000, gap: 3000 };

/** What a Virtual Lab is for, as bullets coming one after another once the intro is over, and again if it comes back. */
export function VirtualLabsPoints() {
  const entered = useWalkthroughEntered();
  const actions = useWalkthroughActions();
  return (
    <div className={labs.content}>
      <p className={labs.introduction} data-chapter-introduction>
        A shared workspace for exploring, building and simulating the brain.
      </p>
      <ul className={labs.benefits}>
        {VIRTUAL_LABS_POINTS.map(({ title, detail }, i) => (
          <li
            key={title}
            className={labs.benefit}
            style={
              entered
                ? {
                    animation: `fade-in 600ms ease-out ${POINTS_MS.first + i * POINTS_MS.gap}ms both`,
                  }
                : { opacity: 0 }
            }
          >
            <p className={labs.benefitTitle}>{title}</p>
            <p className={labs.detail}>{detail}</p>
          </li>
        ))}
      </ul>
      <div className={labs.action} data-chapter-action>
        <button type="button" onClick={actions?.enter} className={labs.button}>
          Get Started
        </button>
      </div>
    </div>
  );
}

/** A classroom workshop on the platform, from the public homepage's tour (core-web-app#2032). */
export const TEACHING_VIDEO = {
  src: '/images/start/walkthrough/education.mp4',
  poster: '/images/start/walkthrough/education-poster.jpg',
};

/** A moment of a stage video and what it shows, from `from` seconds into it. */
export type TVideoTitle = { from: number; text: string };

/**
 * Data and models explored, then a simulation's results, each cropped to its viewer: from the user's recordings,
 * the species on the data page (1.4 s), then 1.8 s each at 1.33-1.5x of a morphology coloured by distance turning,
 * single-cell electrophysiology, a MICrONS EM mesh zoomed into, Kv6.2 ion channel recordings and the Allen V1
 * circuit by layer turning; last 2.6 s of rasters, activity in 3D and PSTHs from the analysis recording. 13 s.
 */
export const ANALYSIS_VIDEO = {
  src: '/images/start/walkthrough/explore-data-models.mp4',
  poster: '/images/start/walkthrough/explore-data-models.jpg',
  titles: [
    { from: 0, text: 'Explore multiple species data' },
    { from: 1.4, text: 'Neuron morphology' },
    { from: 3.2, text: 'Single-cell electrophysiology' },
    { from: 5.0, text: 'EM-reconstructed neuron · MICrONS' },
    { from: 6.8, text: 'Ion channel recordings · Kv6.2' },
    { from: 8.6, text: 'Circuit model · Allen V1' },
    { from: 10.4, text: 'Simulation results · rasters, 3D activity, PSTHs' },
  ],
};

/** A continuous band of customer logos, each linked to its organization. */
export function EarlyAdopters() {
  const { data: adopters = [] } = useQuery({
    queryKey: ['walkthrough', 'early-adopters'],
    queryFn: getAdoptersContent,
  });
  if (!adopters.length) return null;
  return (
    <div className={getStarted.customers}>
      <div className={getStarted.customerHeading}>
        <h2>Trusted by</h2>
      </div>
      <div className={getStarted.logoBand}>
        <div className={getStarted.logoTrack}>
          {[false, true].map((duplicate) => (
            <ul
              key={String(duplicate)}
              className={getStarted.logoGroup}
              aria-hidden={duplicate || undefined}
              inert={duplicate || undefined}
            >
              {adopters.map((adopter) => (
                <li key={adopter.name} className={getStarted.logoItem}>
                  <a
                    href={adopter.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={adopter.name}
                    className={getStarted.logoLink}
                  >
                    <span
                      role="img"
                      aria-label={adopter.name}
                      className={getStarted.logoMark}
                      style={{
                        maskImage: `url(${adopter.imageURL})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center bottom',
                        WebkitMaskImage: `url(${adopter.imageURL})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center bottom',
                      }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * A notebook opened from the platform's Notebooks page into JupyterLab: its code, then the interactive spine
 * viewer it builds. From the user's recording "notebooks", its first 3.6 s at 1.25x, the rest slowed to 7.2 s,
 * its frames interpolated. 10 s.
 */
export const NOTEBOOKS_VIDEO = {
  src: '/images/start/walkthrough/notebooks.mp4',
  poster: '/images/start/walkthrough/notebooks.jpg',
};

/**
 * A recording across the stage beside a screen's words, in the middle of its height, or on the public tour level
 * with its title; `className` to place it otherwise. Away from `near`, only its poster: the page need not load
 * every film before one is seen.
 */
export function StageVideo({
  video,
  presentation = 'recording',
  near = true,
  className,
}: {
  video: { src: string; poster: string; titles?: readonly TVideoTitle[] };
  presentation?: 'recording' | 'animation';
  near?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const title = useVideoTitle(videoRef, video.titles);
  const film = (
    <video
      ref={videoRef}
      src={near ? video.src : undefined}
      poster={video.poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      className={cn(
        labs.blendedVideo,
        labs.stageRecordingVideo,
        presentation === 'animation' && labs.animationVideo,
        video.titles && 'w-full!'
      )}
    />
  );
  return (
    <div
      data-chapter-media
      className={cn(
        'absolute top-[max(148px,18vh)] right-[24px] bottom-[max(100px,12vh)] left-0 flex items-center justify-center',
        // Upright, across the page, for a screen's words to start under it (`UNDER_VIDEO`).
        'stacked:inset-x-0 stacked:top-(--stage-video-top) stacked:bottom-auto stacked:h-(--stage-video-h)',
        className
      )}
    >
      {video.titles ? (
        // What each moment of the film shows, over its corner, the way the film's own frame holds it.
        <div className="relative mx-auto w-[88%]">
          {film}
          {title && (
            <p
              aria-live="polite"
              className="absolute bottom-[clamp(10px,1.6vw,20px)] left-[clamp(10px,1.6vw,20px)] rounded-full bg-[#002766]/88 px-[12px] py-[5px] text-[clamp(11px,0.95vw,14px)] leading-[1.3] font-medium text-white shadow-[0_4px_14px_rgba(0,39,102,0.2)]"
            >
              {title}
            </p>
          )}
        </div>
      ) : (
        film
      )}
    </div>
  );
}

/** The title of the moment a video is at, followed frame by frame while it plays. */
function useVideoTitle(
  videoRef: RefObject<HTMLVideoElement | null>,
  titles?: readonly TVideoTitle[]
) {
  const [title, setTitle] = useState(titles?.[0]?.text);
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !titles?.length) return;
    let frame = 0;
    const update = () => {
      const at = element.currentTime;
      setTitle(titles.findLast((moment) => moment.from <= at)?.text ?? titles[0].text);
    };
    // Each frame while the page draws them; the video's own time updates when it does not (in the background).
    const follow = () => {
      update();
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    element.addEventListener('timeupdate', update);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('timeupdate', update);
    };
  }, [videoRef, titles]);
  return title;
}

/** One clear next step into the platform's sign-in and account creation flow. */
export function StartNow() {
  const actions = useWalkthroughActions();
  return (
    <div className="pt-[10px]" data-chapter-action>
      <button type="button" onClick={actions?.enter} className={labs.button}>
        Get Started
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
