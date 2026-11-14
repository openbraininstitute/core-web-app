'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { EXAMPLES, journeyHref } from '@/ui/segments/project/hex-home/content';
import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { FreeMedia, MeltFlier, TileMedia } from '@/ui/segments/project/hex-home/landing-example';
import { Hexagon } from '@/ui/segments/project/hex-home/hex-tile';
import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { VideoCard } from '@/ui/segments/project/hex-home/video-card';
import { cn } from '@/utils/css-class';

import { AgentMarks } from './agent-marks';
import { GREEN, placeColours, wordsFor } from './hex-home-shared';
import styles from './hex-cloud.module.css';

import type { CSSProperties, ReactNode, RefObject } from 'react';
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
// a little larger (the user asked)
const TILE_W = 120;

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
/** A row's name over it, and the gap under the name (px, as are the rows' paddings: this app's rem is 14 px): fixed, so the rows can share the column's height exactly. */
const ROW_TITLE_H = 16;
const ROW_TITLE_GAP = 8;
/** The gap between Platform's cards, and between the videos (px). */
const CARD_GAP = 14;

function Row({
  title,
  titled = true,
  twoRows = false,
  grid = false,
  share,
  children,
}: {
  title: string;
  titled?: boolean;
  /** Its things in two rows, scrolling sideways together. */
  twoRows?: boolean;
  /** Its things three to a row, filling the width, not scrolling, three shares of the height left. */
  grid?: boolean;
  /**
   * Its part of the height the other rows leave: the videos one share and Platform's three rows three, so a video is
   * as large as a Platform card (the user asked).
   */
  share?: number;
  children: ReactNode;
}) {
  const head = titled ? ROW_TITLE_H + ROW_TITLE_GAP : 0;
  const name = titled && (
    <h2 className="text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase">{title}</h2>
  );
  if (grid)
    return (
      // three shares of the room the rows above leave, so the column needs no scroll (the user asked)
      <section
        className="flex min-h-0 min-w-0 flex-col gap-[8px]"
        aria-label={title}
        style={{ flex: `3 1 ${head + 4 + 4 + 2 * CARD_GAP}px` }}
      >
        {name}
        <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-[repeat(3,minmax(0,1fr))] pt-[4px] pb-[4px]" style={{ gap: CARD_GAP }}>
          {children}
        </div>
      </section>
    );
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-[8px]', share && 'min-h-0')}
      aria-label={title}
      style={share ? { flex: `${share} 1 ${head + 4 + 12}px` } : undefined}
    >
      {name}
      {/* fading a little at the box's right edge rather than cut off there (softer, the user asked); sideways only,
          never up and down (the user asked: a sideways scroll lets the other way scroll too, by a pixel or so) */}
      <div
        className={cn(
          'no-scrollbar -mx-1 overflow-x-auto overflow-y-hidden px-1 pt-[4px] pb-[12px] [mask-image:linear-gradient(to_right,#000_calc(100%-28px),rgb(0_0_0/0.3))]',
          twoRows ? 'grid auto-cols-max grid-flow-col grid-rows-2' : 'flex',
          share ? 'min-h-0 flex-1' : 'gap-3'
        )}
        style={share ? { gap: CARD_GAP } : undefined}
      >
        {children}
        {/* room at the end, so the last one clears the fade */}
        <span aria-hidden className="w-6 shrink-0" />
      </div>
    </section>
  );
}

/** The OBI wordmark in Do science's bottom left corner (the user asked), in a cell the size of the cards. */
function ObiCell() {
  return (
    <div title="Open Brain Institute" className="flex h-full w-full items-center justify-center p-[8%]">
      <ObiLogo className="text-primary-9 h-auto max-h-full w-[70%]" />
    </div>
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
 * One of Do science's cards, small, in its colours (the user asked to keep them, white only on the right): a click
 * shows it large on the right (the user asked).
 */
/** `hex` (#rrggbb) mixed towards `to` by `t` (0 to 1), as #rrggbb. */
function mix(hex: string, to: string, t: number) {
  const c = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(c(hex, i) + (c(to, i) - c(hex, i)) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The Platform cards' looks, chosen with the home's second hidden menu (the user asked): the palette as it was, the
 * softer one, and ten white ones with a flourish of the card's colour. */
export const PLATFORM_CARD_STYLES = [
  { key: 'bold', label: 'Colour (before)' },
  { key: 'subtle', label: 'Soft colour (now)' },
  { key: 'top-bar', label: 'White, colour bar on top' },
  { key: 'left-edge', label: 'White, colour edge on the left' },
  { key: 'corner-hex', label: 'White, coloured corner hexagon' },
  { key: 'dot', label: 'White, coloured dot by the name' },
  { key: 'tinted', label: 'White, picture in its colour' },
  { key: 'wash', label: 'White, colour wash in a corner' },
  { key: 'underline', label: 'White, coloured underline' },
  { key: 'outline', label: 'White, coloured outline' },
  { key: 'hexes', label: 'White, faint coloured hexagons' },
  { key: 'glow', label: 'White, coloured glow' },
] as const;
export type TCardStyle = (typeof PLATFORM_CARD_STYLES)[number]['key'];
export const DEFAULT_CARD_STYLE: TCardStyle = 'subtle';

/** A pointy-topped hexagon's outline, `w` wide, for the faint pattern in a card's corner. */
function HexOutline({ w, color, x, y }: { w: number; color: string; x: number; y: number }) {
  const h = (2 * w) / SQRT3;
  const pts = [
    [w / 2, 0],
    [w, h / 4],
    [w, (3 * h) / 4],
    [w / 2, h],
    [0, (3 * h) / 4],
    [0, h / 4],
  ]
    .map((pt) => pt.join(','))
    .join(' ');
  return (
    <svg aria-hidden className="absolute" style={{ right: x, bottom: y }} width={w} height={h} viewBox={`-1 -1 ${w + 2} ${h + 2}`}>
      <polygon points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

/**
 * One of Platform's cards, small, in the look chosen (the user asked for options): a click shows it large on the
 * right. The coloured looks fill it with its colour (the palette's, or paled towards white with its name in a deep
 * shade of it, as the user asked for more subtle); the white ones keep its picture faint along its top and add a
 * flourish of its colour.
 */
function ScienceRowCard({
  card,
  index,
  selected,
  onPick,
  look = DEFAULT_CARD_STYLE,
}: {
  card: IJourneyCard;
  index: number;
  selected: boolean;
  onPick: () => void;
  look?: TCardStyle;
}) {
  const base = placeColours(index);
  const pale = mix(base.bg, '#ffffff', 0.42);
  const deep = mix(base.bg, '#14203f', 0.68);
  const box = 'group relative block h-full w-full overflow-hidden rounded-[14px] text-left';
  const marks = (color: string, className: string) => (
    <span className={cn('absolute inset-0 transition-opacity duration-300', className)} style={{ color }}>
      <AiSparkles className="absolute top-[9%] right-[8%] h-[20%] w-auto" />
      <span className="absolute inset-x-0 top-[14%] flex h-[24%] justify-center">
        <AgentMarks className="h-full gap-[9%]" markClassName="h-[70%] w-auto" />
      </span>
    </span>
  );

  if (look === 'bold' || look === 'subtle') {
    const { bg, ink } = look === 'bold' ? base : { bg: pale, ink: deep };
    const [rest, on] = look === 'bold' ? ['opacity-45', 'opacity-80'] : ['opacity-35', 'opacity-70'];
    return (
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        title={`${card.label}: ${card.blurb}`}
        className={box}
        style={{ background: bg }}
      >
        {card.img ? (
          <img
            src={card.img}
            alt=""
            className={cn(
              'absolute inset-0 h-full w-full object-cover mix-blend-luminosity grayscale transition-opacity duration-300 group-hover:opacity-80',
              selected ? on : rest
            )}
            style={{ objectPosition: card.imgAt ?? 'center' }}
          />
        ) : (
          marks(ink, cn('group-hover:opacity-85', selected ? 'opacity-85' : 'opacity-55'))
        )}
        <span
          className="absolute inset-x-0 bottom-0 flex flex-col gap-[2px] px-3.5 pt-8 pb-3"
          style={{ backgroundImage: `linear-gradient(to top, ${bg} 50%, ${bg}00)` }}
        >
          <span className="text-[14px] leading-[17px] font-semibold" style={{ color: ink }}>
            {card.label}
          </span>
        </span>
      </button>
    );
  }

  // white, its picture faint along its top and fading out, a flourish of its colour
  const tinted = look === 'tinted';
  const frame: CSSProperties = {
    background: '#fff',
    border: look === 'outline' ? `1.5px solid ${mix(base.bg, '#ffffff', 0.15)}` : '1px solid #e6e9f0',
    boxShadow:
      look === 'glow'
        ? `0 10px 24px -10px ${base.bg}, 0 0 0 1px ${mix(base.bg, '#ffffff', 0.7)}`
        : selected
          ? `inset 0 0 0 2px ${base.bg}`
          : undefined,
  };
  if (look === 'glow' && selected) frame.boxShadow = `${frame.boxShadow}, inset 0 0 0 2px ${base.bg}`;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      title={`${card.label}: ${card.blurb}`}
      className={box}
      style={frame}
    >
      {look === 'wash' && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 100% 100%, ${pale} 0%, ${mix(base.bg, '#ffffff', 0.8)} 38%, #fff0 70%)` }}
        />
      )}
      <span
        className="absolute inset-x-0 top-0 h-[64%] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]"
        style={tinted ? { background: pale } : undefined}
      >
        {card.img ? (
          <img
            src={card.img}
            alt=""
            className={cn(
              'absolute inset-0 h-full w-full object-cover grayscale transition-opacity duration-300 group-hover:opacity-70',
              tinted ? 'mix-blend-luminosity' : '',
              selected ? 'opacity-60' : tinted ? 'opacity-55' : 'opacity-30'
            )}
            style={{ objectPosition: card.imgAt ?? 'center' }}
          />
        ) : (
          marks(deep, cn('group-hover:opacity-75', selected ? 'opacity-75' : 'opacity-45'))
        )}
      </span>
      {look === 'top-bar' && <span aria-hidden className="absolute inset-x-0 top-0 h-[5px]" style={{ background: base.bg }} />}
      {look === 'left-edge' && <span aria-hidden className="absolute inset-y-0 left-0 w-[5px]" style={{ background: base.bg }} />}
      {look === 'corner-hex' && (
        <span
          aria-hidden
          className="absolute top-2.5 right-2.5 h-[23px] w-[20px]"
          style={{ background: base.bg, clipPath: HEX_CLIP }}
        />
      )}
      {look === 'hexes' && (
        <>
          <HexOutline w={34} color={pale} x={-8} y={-6} />
          <HexOutline w={22} color={pale} x={22} y={10} />
          <HexOutline w={14} color={mix(base.bg, '#ffffff', 0.25)} x={8} y={34} />
        </>
      )}
      <span className={cn('absolute bottom-0 left-0 flex flex-col gap-[5px] pb-3', look === 'left-edge' ? 'pl-[18px]' : 'pl-3.5')}>
        <span
          className="flex items-center gap-[7px] text-[14px] leading-[17px] font-semibold"
          style={{ color: look === 'outline' ? deep : '#13306f' }}
        >
          {look === 'dot' && <span aria-hidden className="size-[8px] shrink-0 rounded-full" style={{ background: base.bg }} />}
          {card.label}
        </span>
        {look === 'underline' && <span aria-hidden className="h-[3px] w-[26px] rounded-full" style={{ background: base.bg }} />}
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
  learning: {
    frames: shots('learn', ['Courses', 'Glossary', 'Tutorials', 'Standard']),
    intro: 'Learn what you need: the neuroscience, simulating it, the platform and its data standard.',
    points: [
      'Free courses, from an introduction to brain modeling to synapses and compartmental models',
      'Slides with live figures and simulations to try as you go',
      'Video tutorials on each part of the platform',
      'A glossary of the terms, and the Data & Workflows Standard the platform follows',
    ],
  },
  teaching: {
    frames: shots('teach', ['Teach', 'Practise', 'Explore']),
    intro: 'Run a course on the platform: real data, models and simulations in the browser, for a whole class.',
    points: [
      'A virtual lab for the course, and a project for each student or group',
      'The free courses, glossary and tutorials as course material, or your own',
      'Exercises and notebooks students run with nothing to install',
      'The class’s credits shared, with a budget for each project if you want one',
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
export function PlaceShown({ card, base }: { card: IJourneyCard; base: string }) {
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
        // on a bordered card, not raised (the user asked; flat and a raised one were tried)
        'flex h-full w-full flex-col gap-4 overflow-hidden rounded-[20px] border border-[rgb(19_48_111/0.12)] bg-white p-4'
      )}
    >
      {/* no taller than nearly half the card, so its words and the way in fit under it on a short screen */}
      {/* no frame round it, flat as the rest (the user asked) */}
      <div className="relative aspect-[1210/714] max-h-[44%] w-full shrink-0 overflow-hidden rounded-[10px]">
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
          // wrapping on a phone's width
          <div className="flex shrink-0 flex-wrap gap-x-[18px] gap-y-2">
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
            Platform
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

/** Where the hexagons behind the example sit, in % of its pane, and how wide each is (px). */
const SCATTER: Array<[number, number, number]> = [
  [3, 6, 86],
  [18, 64, 118],
  [1, 38, 54],
  [80, 4, 104],
  [91, 32, 62],
  [83, 68, 126],
  [42, 0, 58],
  [62, 84, 78],
  [30, 90, 50],
  [72, 46, 46],
  [10, 86, 64],
];

/**
 * A few hexagons scattered behind the example or video on show (the user asked), drawn as the landing's field is: white,
 * outlined and raised, rising in one after another.
 */
function ScatteredHexes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SCATTER.map(([x, y, w], i) => (
        <span
          key={`${x}-${y}`}
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: w, height: (2 * w) / SQRT3 }}
        >
          <span
            className={cn(styles.appear, 'absolute inset-0 block')}
            style={
              {
                '--appear-delay': `${200 + i * 70}ms`,
                filter: 'drop-shadow(-6px 10px 14px rgb(28 40 72 / 0.14))',
              } as CSSProperties
            }
          >
            <Hexagon className={styles.base} />
            <Hexagon className={styles.outline} />
          </span>
        </span>
      ))}
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
      <div ref={box} className="relative flex h-full min-h-0 flex-col justify-center gap-3">
        {/* the same hexagons behind it as behind an example (the user asked) */}
        <ScatteredHexes />
        {video && (
          <div key={video.key} className={cn(styles.fadeIn, 'relative flex flex-col gap-4')}>
            <div
              ref={heroBox}
              className="aspect-video w-full overflow-hidden rounded-2xl shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]"
              style={landing ? { visibility: 'hidden' } : undefined}
            >
              {/* the player only once it has grown into place (it starts as it mounts) */}
              {!landing && <VideoPlayer url={video.video ?? video.url} title={video.title} />}
            </div>
            {/* what it is under it, as an example's words are under it (the user asked), once it is in place; the
                description a placeholder until the videos carry one */}
            <div
              key={landing ? 'landing' : 'landed'}
              className={cn('flex max-w-[640px] flex-col gap-1.5', landing ? 'invisible' : styles.fadeIn)}
            >
              <span className="text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: GREEN }}>
                {video.kind}
              </span>
              <span className="text-primary-9 font-serif text-[28px] leading-[34px]">{video.title}</span>
              <p className="m-0 text-[14px] leading-[21px] text-neutral-600">
                A short walk through this part of the platform: what it is for, where to find it, and the steps to try
                it yourself. Placeholder text for now.
              </p>
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
    <div ref={box} className="relative flex h-full min-h-0 flex-col items-center justify-center gap-4">
      <ScatteredHexes />
      {/* over the hexagons but not cut off from them (no stacking context of its own, and a fade that does not
          linger): the example's white multiplied out, so they show through it as on the landing */}
      {width > 0 && (
        <div key={example.key} className={cn(styles.freeIn, 'relative flex flex-col items-center gap-4')}>
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
  cardStyle = DEFAULT_CARD_STYLE,
}: {
  groups: IJourneyGroup[];
  videos: IExampleVideo[];
  base: string;
  /** Each row under its category's name; without, the rows alone (the menu's third design). */
  titled?: boolean;
  /** How Platform's cards look (the home's second hidden menu). */
  cardStyle?: TCardStyle;
}) {
  // The example on show (on the right, unless a video is) and which example each of the row's tiles holds: every one
  // but that, the two trading places when one is picked, as on the desktop (the user asked: no empty or ringed tile).
  const [hero, setHero] = useState(0);
  const [slots, setSlots] = useState(() => EXAMPLES.map((_, i) => i).filter((i) => i !== 0));
  // a video or one of Do science's places on show instead of the example
  const [side, setSide] = useState<TShown | null>(null);
  const shown: TShown = side ?? { kind: 'example', i: hero };
  // Do science's places, Learn and Teach with them (the user asked: Learn & teach in two, part of Do science)
  const learnOn = groups[1].cards.some((card) => card.icon === 'learning' && !!card.href);
  const places: IJourneyCard[] = [
    ...groups[0].cards,
    {
      label: 'Learn',
      icon: 'learning',
      href: learnOn ? 'learn' : undefined,
      blurb: 'Courses, tutorials, a glossary and the data standard',
      img: '/images/place-previews/learn-1.jpg',
      imgAt: 'left top',
    },
    {
      label: 'Teach',
      icon: 'teaching',
      href: 'teach',
      blurb: 'Run a course on the platform',
      img: '/images/place-previews/teach-1.jpg',
    },
  ];
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
    if (!from) return;
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
    // the rows on the left, what is on show on the right (the sides switched were tried)
    <div ref={stage} className="relative flex h-full w-full min-w-0 gap-8 bg-white px-6 pt-5 pb-4">
      {/* the rows fade out at their right edge (no box round them: the user tried one), scrolling with no bar */}
      {/* 45:55 whatever is on show (the user asked to try it; 40:60 while a video played before) */}
      <div className="flex w-[45%] min-w-0 shrink-0 flex-col">
      {/* no scroll up and down (the user asked): Do science takes what the other rows leave; only a very short window
          scrolls, rather than squeezing its cards to nothing */}
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
        {/* the videos after the examples, no row for The institute (the user asked) */}
        <Row title="Tutorial videos" titled={titled} share={1}>
          {videos.map((v, i) => (
            // as wide as a Platform card, and as tall: one share of the height to its three (the user asked)
            <div
              key={v.key}
              data-video={i}
              className="h-full shrink-0"
              style={{ width: `calc((100% - ${2 * CARD_GAP}px) / 3)` }}
            >
              {/* what it is only while pointed at; its length always (the user asked) */}
              <VideoCard
                small
                fill
                detailsOnHover
                video={v}
                selected={shown.kind === 'video' && shown.i === i}
                delayMs={0}
                onPick={() => pickVideo(i)}
              />
            </div>
          ))}
        </Row>
        {/* Do science last, under the videos (above the examples was tried): three by three, Learn and Teach among
            them, the OBI wordmark in the bottom left corner (the user asked; top left was tried) */}
        <Row title="Platform" titled={titled} grid>
          {places.map((card, i) => {
            const tile = (
              <ScienceRowCard
                key={card.label}
                card={card}
                index={i}
                selected={shown.kind === 'place' && shown.i === i}
                onPick={() => pickPlace(i)}
                look={cardStyle}
              />
            );
            return i === places.length - 2 ? [<ObiCell key="obi" />, tile] : tile;
          })}
        </Row>
      </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <Shown
          shown={shown}
          videos={videos}
          places={places}
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
