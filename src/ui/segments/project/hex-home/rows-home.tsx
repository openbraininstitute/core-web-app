'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { EXAMPLES, journeyHref } from '@/ui/segments/project/hex-home/content';
import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { FreeMedia, MeltFlier, TileMedia } from '@/ui/segments/project/hex-home/landing-example';
import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { VideoCard } from '@/ui/segments/project/hex-home/video-card';
import { cn } from '@/utils/css-class';

import { AgentMarks } from './agent-marks';
import { GREEN, wordsFor } from './hex-home-shared';
import styles from './hex-cloud.module.css';

import type { ReactNode, RefObject } from 'react';
import type { IExampleVideo, IJourneyCard, IJourneyGroup } from '@/ui/segments/project/hex-home/content';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

type TShown = { kind: 'example' | 'video' | 'place'; i: number };

/** Where an example flies to or from on show: its centre, its width there and the size its tile grows to. */
interface IOnShow {
  at: IPoint;
  width: number;
  heroR: number;
}

/**
 * A pick under way: the example flying out of its tile to be on show (where it lands is measured once it is laid
 * out there, unseen), and the one that was on show, if it was, flying into the tile it left, as on the desktop.
 */
interface IFlight {
  id: number;
  /** The row's tile the two trade through. */
  slot: number;
  inbound: number;
  from: IHexBox;
  to: IOnShow | null;
  outbound: { i: number; home: IOnShow } | null;
}

/** The width of the examples' hexagons in their row (px). */
const TILE_W = 108;

/** A box's size, for what has to be told it in px (the one on show). */
function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** A category's row: its name over its things, which scroll sideways. */
function Row({
  title,
  titled = true,
  twoRows = false,
  children,
}: {
  title: string;
  titled?: boolean;
  /** Its things in two rows, scrolling sideways together. */
  twoRows?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={title}>
      {titled && <h2 className="text-primary-9 px-1 text-[13px] font-bold tracking-[0.08em] uppercase">{title}</h2>}
      {/* fading out at the box's right edge rather than cut off there */}
      <div
        className={cn(
          'no-scrollbar -mx-1 gap-3 overflow-x-auto px-1 pt-1 pb-3 [mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]',
          twoRows ? 'grid auto-cols-max grid-flow-col grid-rows-2' : 'flex'
        )}
      >
        {children}
        {/* room at the end, so the last one clears the fade */}
        <span aria-hidden className="w-6 shrink-0" />
      </div>
    </section>
  );
}

/** The agents the platform can be driven from, by their marks, with AI's sparkles: the AI card's picture. */
function AgentsPicture({ className }: { className?: string }) {
  return (
    <span className={cn('absolute inset-0 bg-[#f4f7fc] text-[#13306f]', className)}>
      <AiSparkles className="absolute top-[12%] right-[7%] h-[24%] w-auto opacity-70" />
      <span className="absolute inset-x-0 top-[34%] flex h-[30%] justify-center opacity-80">
        <AgentMarks className="h-full gap-[9%]" markClassName="h-[70%] w-auto" />
      </span>
    </span>
  );
}

/**
 * One of Do science's cards, small and white (the user asked: no colours), its first stage's screenshot over its
 * name: a click shows it large on the right.
 */
function ScienceRowCard({
  card,
  selected,
  onPick,
}: {
  card: IJourneyCard;
  selected: boolean;
  onPick: () => void;
}) {
  const first = PLACE_DETAILS[card.icon]?.frames[0];
  return (
    // as wide as they were square, lower (the user asked)
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      title={`${card.label}: ${card.blurb}`}
      className={cn(
        'group border-neutral-2 relative flex h-[96px] w-[146px] shrink-0 flex-col overflow-hidden rounded-[14px] border bg-white text-left transition-shadow hover:shadow-md',
        selected ? 'shadow-[0_6px_16px_-6px_rgb(0_39_102/0.35)]' : 'shadow-[0_4px_12px_-6px_rgb(0_39_102/0.12)]'
      )}
    >
      <span className="border-neutral-2 relative block h-[54px] shrink-0 overflow-hidden border-b bg-neutral-50">
        {first ? (
          <img src={first.src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
        ) : (
          <AgentsPicture />
        )}
      </span>
      <span className="flex min-w-0 flex-col px-2.5 pt-1.5">
        <span className="text-primary-9 truncate text-[12.5px] leading-[15px] font-semibold">{card.label}</span>
        <span className="truncate text-[11px] leading-[14px] text-neutral-500">{card.blurb}</span>
      </span>
    </button>
  );
}

/** What each of Do science's places is for, and what can be done there, on its large card (the user asked). */
/** Its stages, each a screenshot of it in use (the user asked, as the Workflows page's types have theirs). */
type TFrames = Array<{ src: string; step: string }>;
const shots = (place: string, steps: string[]): TFrames =>
  steps.map((step, i) => ({ src: `/images/place-previews/${place}-${i + 1}.jpg`, step }));
const PLACE_DETAILS: Record<string, { intro: string; points: string[]; frames: TFrames }> = {
  data: {
    frames: shots('data', ['Find', 'Browse', 'Open']),
    intro: 'Experimental data and models from across species, found by brain region.',
    points: [
      'Browse neuron morphologies, electrophysiology recordings, ion channel and neuron models, circuits and more',
      'Pick a species and a brain region in the 3D atlas to see only what is there',
      'Open anything for its details, previews and files, and use it in your workflows',
      'Bring your own data into the project',
    ],
  },
  workflows: {
    frames: [
      { src: '/images/workflow-previews/configure.jpg', step: 'Configure' },
      { src: '/images/workflow-previews/results.jpg', step: 'Results' },
      { src: '/images/workflow-previews/analysis.jpg', step: 'Analyse' },
    ],
    intro: 'Build models and simulate them in guided steps, from single neurons to whole-brain circuits.',
    points: [
      'Build single-neuron models, synaptomes and circuits',
      'Set up simulations: stimuli, recordings and sweeps over their parameters',
      'Launch campaigns and follow them as they run',
      'Look through the results: voltage traces, spike rasters, statistics and 3D playback',
    ],
  },
  notebooks: {
    frames: shots('notebooks', ['Choose', 'Code', 'See']),
    intro: 'Python analyses in the browser, with the platform’s data and your results to hand.',
    points: [
      'Start from ready-made notebooks for common analyses',
      'Read entities and simulation results with the platform’s Python SDK',
      'Nothing to install: they run in your project’s own sandbox',
      'Keep them with the project, for your team to run too',
    ],
  },
  labs: {
    frames: shots('labs', ['Labs & projects', 'Project', 'Team']),
    intro: 'Your virtual labs and their projects: where your data, models and results live, and who you work with.',
    points: [
      'Make projects and invite your team to them',
      'See the credits your work runs on',
      'Keep your private work apart from what is public',
      'Move between labs and projects from the top bar',
    ],
  },
  reports: {
    frames: shots('reports', ['Logs', 'Read', 'Explore']),
    intro: 'Write up what you found, with figures from your simulations and analyses.',
    points: [
      'Research logs that grow as the work does',
      'Figures and results taken straight from the project',
      'Share them with your team',
    ],
  },
  ai: {
    frames: [],
    intro: 'Use the platform from the AI you already work with.',
    points: [
      'Ask the platform’s own assistant about data, models and workflows',
      'Connect Claude, ChatGPT and other agents through its MCP server',
      'Plugins and skills that find data, run simulations and analyse them for you',
    ],
  },
};

/** How long each stage's screenshot stays, and how long one takes to fade into the next (the Workflows page's). */
const HOLD_MS = 2200;
const FADE_MS = 700;

/**
 * One of Do science's places, large on the right, the pane's whole height and white, as the Workflows page shows a
 * type (the user asked): its stages' screenshots fading in turn with the step each shows, what it is for and what can
 * be done there, and the way in.
 */
function PlaceShown({ card, base }: { card: IJourneyCard; base: string }) {
  const { setState: setAi } = usePanelState();
  const details = PLACE_DETAILS[card.icon] ?? { intro: card.blurb, points: [], frames: [] };
  const { frames } = details;
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (frames.length < 2) return;
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), HOLD_MS + FADE_MS);
    return () => window.clearInterval(timer);
  }, [card.label, frames.length]);
  const go =
    'mt-1 flex h-[44px] w-max shrink-0 items-center rounded-full px-[22px] text-[15px] font-semibold text-white transition-[filter] hover:brightness-110';
  return (
    <div
      className={cn(
        styles.fadeIn,
        'flex h-full w-full flex-col gap-4 overflow-hidden rounded-[20px] border border-[rgb(19_48_111/0.08)] bg-white p-4 shadow-[0_18px_44px_rgb(20_40_90/0.18),0_2px_6px_rgb(20_40_90/0.08)]'
      )}
    >
      {/* no taller than nearly half the card, so its words and the way in fit under it on a short screen */}
      <div className="border-neutral-2 relative aspect-[1210/714] max-h-[44%] w-full shrink-0 overflow-hidden rounded-[12px] border bg-neutral-50">
        {frames.length ? (
          frames.map((f, i) => (
            <img
              key={f.src}
              src={f.src}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-top"
              style={{ opacity: frame === i ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
            />
          ))
        ) : (
          <AgentsPicture />
        )}
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1.5">
        {/* the step on show, the bar under it filling while it stays */}
        {frames.length > 0 && (
          <div className="flex shrink-0 gap-[18px]">
            {frames.map((f, i) => (
              <span key={f.step} className="flex flex-col gap-[5px]">
                <span
                  className={cn(
                    'text-[12.5px] leading-[16px] font-bold tracking-[0.08em] uppercase transition-colors duration-300',
                    frame === i ? 'text-[#008c05]' : 'text-neutral-400'
                  )}
                >
                  {i + 1} · {f.step}
                </span>
                <span className="h-[3px] w-full overflow-hidden rounded-full bg-neutral-200">
                  <span
                    key={frame === i ? `${card.label}-${frame}` : 'idle'}
                    className="block h-full rounded-full bg-[#008c05]"
                    style={frame === i ? { animation: `place-fill ${HOLD_MS + FADE_MS}ms linear both` } : { width: 0 }}
                  />
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-neutral-5 text-[12.5px] leading-[16px] font-semibold tracking-[0.08em] uppercase">
            Do science
          </span>
          <h3 className="text-primary-9 m-0 text-[26px] leading-[31px] font-bold">{card.label}</h3>
          <p className="m-0 text-[15.5px] leading-[22px] text-neutral-700">{details.intro}</p>
        </div>
        {details.points.length > 0 && (
          <ul className="m-0 flex flex-col gap-2 p-0">
            {details.points.map((point) => (
              <li key={point} className="flex gap-3 text-[14px] leading-[20px] text-neutral-600">
                <span aria-hidden className="mt-[7px] size-[6px] shrink-0 rounded-full bg-[#008c05]" />
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* the way in, kept in sight under the words, which scroll if they must */}
      <div className="shrink-0 px-1.5 pb-1">
        {card.action === 'ai' ? (
          <button type="button" onClick={() => setAi(PanelState.Expanded)} className={go} style={{ background: GREEN }}>
            Ask the assistant
          </button>
        ) : (
          card.href && (
            <Link href={journeyHref(card.href, base)} className={go} style={{ background: GREEN }}>
              Open {card.label}
            </Link>
          )
        )}
      </div>
      <style>{'@keyframes place-fill { from { width: 0 } to { width: 100% } }'}</style>
    </div>
  );
}

/**
 * Learn & teach as one card along the foot of the rows, a third of their width (the user asked, in place of its cards
 * among Do science's): what it is for, and its three places as hexagons at its right end, opening Learn (behind its
 * flag; still to come without it).
 */
function LearnCard({ base, learn }: { base: string; learn: boolean }) {
  const hexW = 30;
  const body = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] leading-[19px] font-semibold text-[#13306f]">Learn & teach</span>
        <span className="line-clamp-3 text-[11.5px] leading-[14px] text-neutral-600">
          {learn
            ? 'What you need, from neuroscience and simulating it to the platform and its data standard. Or teach a course.'
            : 'Neuroscience, simulation, the platform and its data standard · coming soon'}
        </span>
      </div>
      {/* its places, courses, glossary and teaching, as a little cluster of hexagons */}
      <div
        aria-hidden
        className="relative shrink-0"
        style={{ width: 2 * hexW + 4, height: (2 * hexW) / SQRT3 + hexW * 0.75 }}
      >
        {(['learning', 'glossary', 'teaching'] as const).map((icon, k) => (
          <span
            key={icon}
            className="absolute drop-shadow-[0_3px_6px_rgb(28_40_72/0.14)]"
            style={{
              width: hexW,
              height: (2 * hexW) / SQRT3,
              left: k === 2 ? hexW / 2 + 2 : k * (hexW + 4),
              top: k === 2 ? hexW * 0.75 + 1 : 0,
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center bg-white" style={{ clipPath: HEX_CLIP }}>
              <img src={`/images/vlab-home/icons/${icon}.svg`} alt="" width={15} height={15} />
            </span>
          </span>
        ))}
      </div>
    </>
  );
  const box =
    'relative mt-3 flex w-1/3 min-w-[240px] shrink-0 items-center gap-3 overflow-hidden rounded-[14px] py-3 pr-3 pl-4';
  const background = { background: 'linear-gradient(100deg, #e9efff 0%, #f1ecff 60%, #f8f1fb 100%)' };
  return learn ? (
    <Link
      href={`${base}/learn`}
      aria-label="Learn & teach"
      className={cn(box, 'transition-shadow hover:shadow-md')}
      style={background}
    >
      {body}
    </Link>
  ) : (
    <div aria-label="Learn & teach" className={cn(box, 'opacity-60')} style={background}>
      {body}
    </div>
  );
}

/** A box on the page, in its own coordinates. */
interface IRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A video picked: its card, from where it is in its row, growing into the player on the right (`to`, once known). */
interface IGrow {
  id: number;
  video: IExampleVideo;
  from: IRect;
  to: IRect | null;
}

const GROW_MS = 650;

/**
 * A video's card growing out of its row into the player's place, as the examples grow out of their hexagons (the
 * user asked): its poster under its navy veil, which the player (navy while it loads) then takes over from. It
 * follows the place as it moves (the rows narrow to 40% as it grows), rather than where the place was at the start.
 */
function VideoGrow({
  from,
  target,
  video,
  onDone,
}: {
  from: IRect;
  /** Where the player is now, measured afresh each frame. */
  target: () => IRect | null;
  video: IExampleVideo;
  onDone: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const start = performance.now();
    let last = from;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GROW_MS);
      const e = 1 - (1 - t) ** 3;
      last = target() ?? last;
      const at = (a: number, b: number) => a + (b - a) * e;
      el.style.left = `${at(from.x, last.x)}px`;
      el.style.top = `${at(from.y, last.y)}px`;
      el.style.width = `${at(from.w, last.w)}px`;
      el.style.height = `${at(from.h, last.h)}px`;
      el.style.borderRadius = `${at(8, 16)}px`;
      if (t < 1) frame = requestAnimationFrame(step);
      else onDone();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // one growth per mount
  }, []);
  return (
    <div
      ref={card}
      className="absolute overflow-hidden rounded-[8px] shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]"
      style={{ left: from.x, top: from.y, width: from.w, height: from.h }}
    >
      <img src={video.poster} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-linear-to-b from-[rgba(0,39,102,0.94)] to-[rgba(0,39,102,0.72)]" />
    </div>
  );
}

/** What is open on the right: the example picked, large, with what it is and what to do with it, or a video. */
function Shown({
  shown,
  videos,
  places,
  base,
  heroBox,
  landing,
}: {
  shown: TShown;
  videos: IExampleVideo[];
  places: IJourneyCard[];
  base: string;
  /** The example's picture, measured for its flight there. */
  heroBox: RefObject<HTMLDivElement | null>;
  /** Flying there out of its tile: kept in its place unseen, its words only after it lands. */
  landing: boolean;
}) {
  const [box, size] = useSize();
  const button =
    'flex h-[38px] items-center justify-center rounded-full px-[16px] text-[13px] font-semibold transition-colors';
  if (shown.kind === 'place') {
    const card = places[shown.i];
    return (
      <div ref={box} className="flex h-full min-h-0 flex-col">
        {card && <PlaceShown key={card.label} card={card} base={base} />}
      </div>
    );
  }
  if (shown.kind === 'video') {
    const video = videos[shown.i];
    return (
      <div ref={box} className="flex h-full min-h-0 flex-col justify-center gap-3">
        {video && (
          <div key={video.key} className={cn(styles.fadeIn, 'flex flex-col gap-3')}>
            {/* its title once it has grown into place, the player only then (it starts as it mounts) */}
            <div
              key={landing ? 'landing' : 'landed'}
              className={cn('flex flex-col', landing ? 'invisible' : styles.fadeIn)}
            >
              <span className="text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: GREEN }}>
                {video.kind}
              </span>
              <span className="text-primary-9 font-serif text-[28px] leading-[34px]">{video.title}</span>
            </div>
            <div
              ref={heroBox}
              className="aspect-video w-full overflow-hidden rounded-2xl shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]"
              style={landing ? { visibility: 'hidden' } : undefined}
            >
              {!landing && <VideoPlayer url={video.video ?? video.url} title={video.title} />}
            </div>
          </div>
        )}
      </div>
    );
  }
  const example = EXAMPLES[shown.i];
  const words = wordsFor(example);
  // as large as the pane allows above its words
  const width = Math.max(0, Math.min(size.w * 0.9, (size.h - 220) * example.aspect, 900));
  return (
    <div ref={box} className="flex h-full min-h-0 flex-col items-center justify-center gap-4">
      {width > 0 && (
        <div key={example.key} className={cn(styles.fadeIn, 'flex flex-col items-center gap-4')}>
          {/* no fade of its own once landed: the flight ends with it just as it is here */}
          <div ref={heroBox} style={landing ? { visibility: 'hidden' } : undefined}>
            <FreeMedia example={example} width={width} />
          </div>
          {/* laid out (so it lands where it will stay) but unseen while it flies, fading in once it is there */}
          <div
            key={landing ? 'landing' : 'landed'}
            className={cn('flex max-w-[560px] flex-col items-center gap-2 text-center', landing ? 'invisible' : styles.fadeIn)}
          >
            <h2 className="text-[26px] leading-[31px] font-light text-[#13306f]">{words.name}</h2>
            <p className="text-[14px] leading-[21px] text-neutral-600">{words.about}</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Link href={`${base}/workflows`} className={cn(button, 'text-white')} style={{ background: GREEN }}>
                Simulate this model
              </Link>
              <Link
                href={`${base}/notebooks`}
                className={cn(button, 'border-2 bg-white')}
                style={{ borderColor: GREEN, color: GREEN }}
              >
                Analyse in notebook
              </Link>
              <Link
                href={`${base}/data`}
                className={cn(button, 'border-2 bg-white')}
                style={{ borderColor: GREEN, color: GREEN }}
              >
                View in data
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The home's second design (the user asked for it beside the hexagons, chosen with the home's hidden menu): the
 * categories' things each in a row of their own down the left, scrolling sideways (Examples, the videos, Do science
 * in two rows; The institute left out), Learn & teach one card along their foot; an example, a video or one of Do
 * science's places clicked shows on the right (the places large, with the way in).
 */
export function RowsHome({
  groups,
  videos,
  base,
  titled = true,
}: {
  groups: IJourneyGroup[];
  videos: IExampleVideo[];
  base: string;
  /** Each row under its category's name; without, the rows alone (the menu's third design). */
  titled?: boolean;
}) {
  // The example on show (on the right, unless a video is) and which example each of the row's tiles holds: every one
  // but that, the two trading places when one is picked, as on the desktop (the user asked: no empty or ringed tile).
  const [hero, setHero] = useState(0);
  const [slots, setSlots] = useState(() => EXAMPLES.map((_, i) => i).filter((i) => i !== 0));
  // a video or one of Do science's places on show instead of the example
  const [side, setSide] = useState<TShown | null>(null);
  const shown: TShown = side ?? { kind: 'example', i: hero };
  const tileW = TILE_W;
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const heroBox = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<IFlight | null>(null);
  const [landed, setLanded] = useState({ inbound: true, outbound: true });
  const [grow, setGrow] = useState<IGrow | null>(null);

  // the page's own coordinates of a box on it
  const centreOf = (el: HTMLElement) => {
    const R = stage.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top, w: r.width };
  };
  const rectOf = (el: HTMLElement): IRect => {
    const R = stage.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height };
  };
  const tileOf = (slot: number): IHexBox | null => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (!el) return null;
    const { x, y, w } = centreOf(el);
    // its picture's hexagon, inside the tile's rim
    return { x, y, r: (0.95 * w) / SQRT3 };
  };
  const heroOn = (): IOnShow | null => {
    const el = heroBox.current;
    if (!el) return null;
    const { x, y, w } = centreOf(el);
    // as on the desktop, its tile grows to about two thirds of its width as it melts
    return { at: { x, y }, width: w, heroR: (0.65 * w) / SQRT3 };
  };

  // A click flies the example out of its tile, growing and its tile melting away, to be on show on the right, as the
  // one there shrinks back into the tile it left, the two trading places, as on the desktop (the user asked).
  const pick = (slot: number) => {
    if (flight) return;
    setGrow(null);
    const i = slots[slot];
    const from = stage.current && tileOf(slot);
    const home = side === null ? heroOn() : null;
    setSlots((all) => all.map((x, k) => (k === slot ? hero : x)));
    setHero(i);
    setSide(null);
    // from a video the rows widen back as it comes, so where it would land moves under it: it just fades in there
    if (!from || side?.kind === 'video') return;
    setFlight({ id: Date.now(), slot, inbound: i, from, to: null, outbound: home ? { i: hero, home } : null });
    setLanded({ inbound: false, outbound: !home });
  };
  // where it lands: its place on show, now laid out for it (before the page is painted, so nothing shows meanwhile)
  useLayoutEffect(() => {
    if (!flight || flight.to) return;
    const to = heroOn();
    if (to && to.width > 0) setFlight({ ...flight, to });
    else {
      setFlight(null);
      setLanded({ inbound: true, outbound: true });
    }
  }, [flight]);
  // both flights in: each is where it belongs
  useEffect(() => {
    if (flight && landed.inbound && landed.outbound) setFlight(null);
  }, [flight, landed]);
  // A video clicked grows out of its card into the player (the user asked), as an example grows out of its hexagon.
  const pickVideo = (i: number) => {
    if (side?.kind === 'video' && side.i === i) return;
    setFlight(null);
    setLanded({ inbound: true, outbound: true });
    setSide({ kind: 'video', i });
    const el = stage.current?.querySelector<HTMLElement>(`[data-video="${i}"]`);
    if (!el || !videos[i]) return setGrow(null);
    setGrow({ id: Date.now(), video: videos[i], from: rectOf(el), to: null });
  };
  // where it grows to: the player's place, now laid out for it, unseen
  useLayoutEffect(() => {
    if (!grow || grow.to) return;
    const el = heroBox.current;
    const to = el && rectOf(el);
    setGrow(to && to.w > 0 ? { ...grow, to } : null);
  }, [grow]);
  const pickPlace = (i: number) => {
    setGrow(null);
    setFlight(null);
    setLanded({ inbound: true, outbound: true });
    setSide({ kind: 'place', i });
  };
  // the tile they trade through, gone until both are in (the flights draw them), as on the desktop
  const trading = flight && !(landed.inbound && landed.outbound) ? flight.slot : undefined;

  return (
    <div ref={stage} className="relative flex h-full w-full min-w-0 gap-8 bg-white px-6 pt-5 pb-4">
      {/* the rows fade out at their right edge (no box round them: the user tried one), scrolling with no bar */}
      {/* 55:45, and 40:60 while a video plays, so it is larger (the user asked) */}
      <div
        className={cn(
          'flex min-w-0 shrink-0 flex-col transition-[width] duration-500 ease-in-out',
          side?.kind === 'video' ? 'w-[40%]' : 'w-[55%]'
        )}
      >
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
        <div ref={strip}>
        <Row title="Examples" titled={titled}>
          {slots.map((i, slot) => {
            const e = EXAMPLES[i];
            return (
              <button
                // eslint-disable-next-line react/no-array-index-key -- a tile is its place in the row
                key={slot}
                type="button"
                title={e.label}
                data-slot={slot}
                onClick={() => pick(slot)}
                className="group relative flex shrink-0 flex-col items-center"
                style={{ width: tileW, visibility: slot === trading ? 'hidden' : undefined }}
              >
                <span
                  className="relative block drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]"
                  style={{ width: tileW, height: (2 * tileW) / SQRT3 }}
                >
                  <span className="absolute inset-0 bg-white" style={{ clipPath: HEX_CLIP }}>
                    <span className="absolute inset-[5%]" style={{ clipPath: HEX_CLIP }}>
                      <TileMedia key={e.key} example={e} />
                    </span>
                  </span>
                </span>
                {/* its name only while pointed at (the user asked), over its foot, taking no room (under it, the row's
                    sideways scroll would cut it off) */}
                <span className="text-primary-9 pointer-events-none absolute bottom-[10px] left-1/2 z-10 w-max max-w-[150px] -translate-x-1/2 rounded-full bg-white/95 px-2 py-0.5 text-center text-[11.5px] leading-[14px] font-semibold opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {e.label}
                </span>
              </button>
            );
          })}
        </Row>
        </div>
        {/* the videos second, Do science third in two rows, no row for The institute (the user asked) */}
        <Row title="Tutorial videos" titled={titled}>
          {videos.map((v, i) => (
            <div key={v.key} data-video={i} className="w-[146px] shrink-0">
              <VideoCard
                small
                height={96}
                video={v}
                selected={shown.kind === 'video' && shown.i === i}
                delayMs={0}
                onPick={() => pickVideo(i)}
              />
            </div>
          ))}
        </Row>
        <Row title="Do science" titled={titled} twoRows>
          {groups[0].cards.map((card, i) => (
            <ScienceRowCard
              key={card.label}
              card={card}
              selected={shown.kind === 'place' && shown.i === i}
              onPick={() => pickPlace(i)}
            />
          ))}
        </Row>
      </div>
      {/* Learn & teach's places in one card along the foot, a third as wide (the user asked), not among Do science's */}
      <LearnCard base={base} learn={groups[1].cards.some((card) => card.icon === 'learning' && !!card.href)} />
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <Shown
          shown={shown}
          videos={videos}
          places={groups[0].cards}
          base={base}
          heroBox={heroBox}
          landing={(!!flight && !landed.inbound) || !!grow}
        />
      </div>
      {grow?.to && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <VideoGrow
            key={grow.id}
            from={grow.from}
            target={() => (heroBox.current ? rectOf(heroBox.current) : null)}
            video={grow.video}
            onDone={() => setGrow(null)}
          />
        </div>
      )}
      {flight?.to && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {/* each gone as it lands, so the one there is not drawn twice over itself */}
          {!landed.inbound && (
            <MeltFlier
              key={`in-${flight.id}`}
              tile={flight.from}
              to={flight.to.at}
              example={EXAMPLES[flight.inbound]}
              width={flight.to.width}
              heroR={flight.to.heroR}
              onDone={() => setLanded((l) => ({ ...l, inbound: true }))}
            />
          )}
          {flight.outbound && !landed.outbound && (
            <MeltFlier
              key={`out-${flight.id}`}
              tile={flight.from}
              to={flight.outbound.home.at}
              example={EXAMPLES[flight.outbound.i]}
              width={flight.outbound.home.width}
              heroR={flight.outbound.home.heroR}
              back
              onDone={() => setLanded((l) => ({ ...l, outbound: true }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
