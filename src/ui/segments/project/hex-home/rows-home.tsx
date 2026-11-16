'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { EXAMPLES, journeyHref } from '@/ui/segments/project/hex-home/content';
import { driftOf, HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { FreeMedia, MeltFlier, TileMedia } from '@/ui/segments/project/hex-home/landing-example';
import { Hexagon } from '@/ui/segments/project/hex-home/hex-tile';
import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { useAssistantQuestion } from '@/ui/segments/project/get-started/sections/use-assistant-question';
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

/** Shorter names for the clusters' hexagons, where the full one does not fit (it is still the hexagon's title). */
const CLUSTER_NAMES: Record<string, string> = { 'AI, Plugins, MCP Server': 'AI & MCP' };

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
  enter,
  children,
}: {
  title: string;
  titled?: boolean;
  /** On the home's first landing, when its name rises in (ms). */
  enter?: number;
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
    <h2
      className={cn(
        'text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase',
        enter !== undefined && styles.enter
      )}
      style={enterAt(enter)}
    >
      {title}
    </h2>
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
          // faded to nothing at the right edge, and room under them for their shadows, so where those are cut off
          // no faint line shows (the user saw one)
          'no-scrollbar -mr-1 -mb-[10px] -ml-6 overflow-x-auto overflow-y-hidden pt-[4px] pr-1 pb-[22px] pl-6 [mask-image:linear-gradient(to_right,#000_calc(100%-36px),transparent)]',
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
export function mix(hex: string, to: string, t: number) {
  const c = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(c(hex, i) + (c(to, i) - c(hex, i)) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The Platform cards' looks, chosen with the home's second hidden menu (the user asked): the palette as it was, the
 * softer one, and ten white ones with a flourish of the card's colour. */
export const PLATFORM_CARD_STYLES = [
  { key: 'bold', label: 'Colour (before)' },
  { key: 'subtle', label: 'Soft colour' },
  { key: 'top-bar', label: 'White, colour bar on top (now)' },
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
// white with a bar of its colour on top by default (the user asked; the soft colour before)
export const DEFAULT_CARD_STYLE: TCardStyle = 'top-bar';

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
        data-place={index}
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
      data-place={index}
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

/** Learn and Teach as places of their own, beside Platform's (the user asked), on the desktop's rows and the phone. */
export const LEARN_TEACH_CARDS: IJourneyCard[] = [
  {
    label: 'Learn',
    icon: 'learning',
    href: 'learn',
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
export function PlaceShown({
  card,
  base,
  onClose,
}: {
  card: IJourneyCard;
  base: string;
  /** Dismissed with the × in its corner (the user asked). */
  onClose?: () => void;
}) {
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
        'relative flex h-full w-full flex-col gap-4 overflow-hidden rounded-[20px] border border-[rgb(19_48_111/0.12)] bg-white p-4'
      )}
    >
      {/* no taller than nearly half the card, so its words and the way in fit under it on a short screen */}
      {onClose && (
        // over the screenshot's corner, white so it shows on any of them
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${card.label}`}
          title="Close"
          className="text-primary-9 absolute top-6 right-6 z-10 flex size-[34px] items-center justify-center rounded-full border border-[rgb(19_48_111/0.12)] bg-white/95 transition-colors hover:bg-white"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-[14px]">
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
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
  /** A video's card growing into the player, or a Platform card into its large card. */
  video?: IExampleVideo;
  place?: { card: IJourneyCard; index: number };
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
  place,
  back = false,
  onDone,
}: {
  from: IRect;
  /** Where the player is now, measured afresh each frame. */
  target: () => IRect | null;
  video?: IExampleVideo;
  /** A Platform card instead (the user asked: they grow as the videos do), from its colours into the white card. */
  place?: { card: IJourneyCard; index: number };
  /** Shrinking back into its card, something else picked (the user asked): `from` the large one, `target` the card. */
  back?: boolean;
  onDone: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const radius = place ? [14, 20] : [8, 16];
  if (back) radius.reverse();
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
      el.style.borderRadius = `${at(radius[0], radius[1])}px`;
      // a Platform card's colours give way to the white card it becomes, or come back as it shrinks
      if (face.current) face.current.style.opacity = `${back ? e : 1 - e}`;
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
      className={cn('absolute overflow-hidden', video && 'shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]')}
      style={{ left: from.x, top: from.y, width: from.w, height: from.h, borderRadius: radius[0] }}
    >
      {video && (
        <>
          <img src={video.poster} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-linear-to-b from-[rgba(0,39,102,0.94)] to-[rgba(0,39,102,0.72)]" />
        </>
      )}
      {place && <PlaceGrowFaces card={place.card} index={place.index} face={face} faceShown={!back} />}
    </div>
  );
}

/**
 * What a Platform card looks like as it grows: the white bordered card it becomes, its first stage's screenshot at
 * its top, under the small card's colours and picture (`face`), which fade as it goes.
 */
function PlaceGrowFaces({
  card,
  index,
  face,
  faceShown,
}: {
  card: IJourneyCard;
  index: number;
  face: RefObject<HTMLDivElement | null>;
  /** The small card's colours over it at the start (growing), or not yet (shrinking). */
  faceShown: boolean;
}) {
  const { bg } = placeColours(index);
  const pale = mix(bg, '#ffffff', 0.42);
  const first = PLACE_DETAILS[card.icon]?.frames[0];
  return (
    <>
      <div className="absolute inset-0 border border-[rgb(19_48_111/0.12)] bg-white p-[3%]" style={{ borderRadius: 'inherit' }}>
        {first && (
          <img src={first.src} alt="" className="h-[42%] w-full rounded-[10px] object-cover object-top" draggable={false} />
        )}
      </div>
      <div ref={face} className="absolute inset-0" style={{ background: pale, opacity: faceShown ? 1 : 0 }}>
        {card.img && (
          <img
            src={card.img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-luminosity grayscale"
            style={{ objectPosition: card.imgAt ?? 'center' }}
            draggable={false}
          />
        )}
      </div>
    </>
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
function ScatteredHexes({ from = 200, step = 70 }: { from?: number; step?: number }) {
  return (
    // its box reaching into the gap beside the pane, so the hexagons' shadows are not cut off in a faint line at its
    // edge (the user saw one); the hexagons placed on the pane itself, inside it
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -left-8 overflow-hidden">
      <div className="absolute inset-y-0 right-0 left-8">
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
                '--appear-delay': `${from + i * step}ms`,
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
    </div>
  );
}

/** What the background design's example hexagons need from the home: the tiles' examples and what a click does. */
interface IBackdrop {
  slots: number[];
  /** The tile the picked and shrinking examples trade through, gone while they fly. */
  trading?: number;
  onPick: (slot: number) => void;
  strip: RefObject<HTMLDivElement | null>;
}

/**
 * The examples as the small hexagons behind what is on show, exactly where the plain ones were and as many (the
 * user asked: the rows' examples row moved here), each bobbing a little; a click flies it into the middle, as from
 * the row. A video or a Platform card simply comes over them.
 */
function BackdropExamples({ backdrop }: { backdrop: IBackdrop }) {
  const { slots, trading, onPick, strip } = backdrop;
  return (
    <div ref={strip} className="pointer-events-none absolute inset-0 overflow-hidden">
      {slots.slice(0, SCATTER.length).map((i, slot) => {
        const e = EXAMPLES[i];
        const [x, y, w] = SCATTER[slot];
        const place = { left: x, top: y, width: w, height: (2 * w) / SQRT3 };
        return (
          <button
            // eslint-disable-next-line react/no-array-index-key -- a tile is its place round the edge
            key={slot}
            type="button"
            title={e.label}
            data-slot={slot}
            onClick={() => onPick(slot)}
            className="group pointer-events-auto absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: w,
              height: place.height,
              visibility: slot === trading ? 'hidden' : undefined,
            }}
          >
            <Bob place={place}>
              <span className="absolute inset-0 drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)] transition-transform duration-200 group-hover:scale-105">
                <span className="absolute inset-0 bg-white" style={{ clipPath: HEX_CLIP }}>
                  <span className="absolute inset-[5%]" style={{ clipPath: HEX_CLIP }}>
                    <TileMedia key={e.key} example={e} />
                  </span>
                </span>
              </span>
              <HexName>{e.label}</HexName>
            </Bob>
          </button>
        );
      })}
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
  backdrop,
  onClosePlace,
  enter,
  foot,
}: {
  /** How far over the pane's foot its words end (px): level with Platform's cards on the left. */
  foot?: number;
  /** On the home's first landing, when the hexagons behind start rising in, and the example with them (ms). */
  enter?: number;
  shown: TShown;
  videos: IExampleVideo[];
  places: IJourneyCard[];
  base: string;
  /** The example's picture, measured for its flight there. */
  heroBox: RefObject<HTMLDivElement | null>;
  /** Flying there out of its tile: kept in its place unseen, its words only after it lands. */
  landing: boolean;
  /** The examples round the edges instead of the plain hexagons (the background design). */
  backdrop?: IBackdrop;
  /** A Platform card's × closes it, back to the example. */
  onClosePlace?: () => void;
}) {
  const [box, size] = useSize();
  // first in each of the three, so it stays put from one to the next
  const behind = backdrop ? (
    <BackdropExamples backdrop={backdrop} />
  ) : enter !== undefined ? (
    <ScatteredHexes from={enter} step={45} />
  ) : (
    <ScatteredHexes />
  );
  // On the landing the example fades in with the hexagons on the picture itself, its white still taken out (the
  // user asked: no white box), with nothing round it fading; its words just after.
  const heroIn: CSSProperties | undefined = enter !== undefined ? { animation: 'none' } : undefined;
  const wordsIn: CSSProperties | undefined =
    enter !== undefined ? { animationDelay: `${enter + 300}ms`, animationDuration: '600ms' } : undefined;
  const button =
    'flex h-[38px] items-center justify-center rounded-full px-[16px] text-[13px] font-semibold transition-colors';
  if (shown.kind === 'place') {
    const card = places[shown.i];
    return (
      <div ref={box} className="relative flex h-full min-h-0 flex-col">
        {/* the examples stay behind, the card simply over them (the user asked) */}
        {backdrop && behind}
        {card && (
          // measured for its card's growth here, unseen until it has grown into place
          <div
            ref={heroBox}
            className="relative flex min-h-0 flex-1 flex-col"
            style={landing ? { visibility: 'hidden' } : undefined}
          >
            <PlaceShown key={card.label} card={card} base={base} onClose={onClosePlace} />
          </div>
        )}
      </div>
    );
  }
  if (shown.kind === 'video') {
    const video = videos[shown.i];
    return (
      <div ref={box} className="relative flex h-full min-h-0 flex-col justify-center gap-3">
        {/* the same hexagons behind it as behind an example (the user asked) */}
        {behind}
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
      {behind}
      {/* its words and buttons at the pane's foot, level with Platform's cards' on the left (the user asked), the
          picture centred in the room over them */}
      {/* over the hexagons but not cut off from them (no stacking context of its own, and a fade that does not
          linger): the example's white multiplied out, so they show through it as on the landing */}
      {width > 0 && (
        <div
          key={example.key}
          style={heroIn}
          className={cn(
            styles.freeIn,
            'relative flex h-full w-full flex-col items-center gap-4',
            // the hexagons under its picture still clickable, its words and buttons too
            backdrop && 'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto'
          )}
        >
          {/* no fade of its own once landed: the flight ends with it just as it is here */}
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <div ref={heroBox} style={landing ? { visibility: 'hidden' } : undefined}>
            <FreeMedia
              example={example}
              width={width}
              className={enter !== undefined ? styles.enterFade : undefined}
              style={enter !== undefined ? ({ '--enter-delay': `${enter + 100}ms` } as CSSProperties) : undefined}
            />
          </div>
          </div>
          {/* laid out (so it lands where it will stay) but unseen while it flies, fading in once it is there */}
          <div
            // a little up from the pane's foot (the user asked), the left column ending as far up to stay level; its
            // words and buttons fading in as the example flies there, not once it has landed (the user asked)
            className={cn('flex max-w-[560px] shrink-0 flex-col items-center gap-2 pb-[40px] text-center', styles.fadeIn)}
            style={{
              ...(wordsIn ?? { animationDelay: '250ms' }),
              ...(foot !== undefined ? { paddingBottom: foot } : undefined),
            }}
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
 * Learn or Teach, larger and more obvious than the other places (the user asked): a shiny gradient as the project
 * page's card has (blue, or the same in green), its picture fading in from the right, a sheen across its top.
 */
function ShinyCard({
  card,
  index,
  tone,
  selected,
  onPick,
}: {
  card: IJourneyCard;
  index: number;
  tone: 'green' | 'blue';
  selected: boolean;
  onPick: () => void;
}) {
  const fill =
    tone === 'blue'
      ? { from: '#0050b3', to: '#69c0ff', veil: '0 80 179' }
      : { from: '#237804', to: '#95de64', veil: '35 120 4' };
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      title={`${card.label}: ${card.blurb}`}
      data-place={index}
      className={cn(
        'group relative block h-full w-full overflow-hidden rounded-[14px] text-left shadow-[0_8px_20px_-10px_rgb(0_39_102/0.45)] transition-transform duration-200 hover:-translate-y-0.5',
        selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#d6e4ff]'
      )}
      style={{ background: `linear-gradient(95deg, ${fill.from} 0%, ${fill.from} 19%, ${fill.to} 100%)` }}
    >
      {card.img && (
        <img
          src={card.img}
          alt=""
          className="absolute top-0 right-0 h-full w-[62%] object-cover opacity-70 mix-blend-luminosity"
          style={{ objectPosition: card.imgAt ?? 'center' }}
          draggable={false}
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, rgb(${fill.veil} / 0.98) 0%, rgb(${fill.veil} / 0.7) 50%, rgb(${fill.veil} / 0.1) 100%)`,
        }}
      />
      {/* the sheen */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(120% 70% at 10% 0%, rgb(255 255 255 / 0.32), transparent 55%)' }}
      />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3.5">
        <span className="text-[18px] leading-[21px] font-bold text-white">{card.label}</span>
        <span className="line-clamp-2 text-[12px] leading-[15px] text-white/85">{card.blurb}</span>
      </span>
    </button>
  );
}

/**
 * The AI card with a place to ask straight away (the user asked): what it is over a prompt, which opens the
 * assistant with the question sent, as the home's "Try in Assistant" does; the rest of the card shows it large.
 */
function AiPromptCard({
  card,
  index,
  selected,
  onPick,
}: {
  card: IJourneyCard;
  index: number;
  selected: boolean;
  onPick: () => void;
}) {
  const { bg } = placeColours(index);
  const pale = mix(bg, '#ffffff', 0.55);
  const deep = mix(bg, '#14203f', 0.7);
  const { sendQuestion } = useAssistantQuestion();
  const [question, setQuestion] = useState('');
  const ask = () => {
    const q = question.trim();
    if (!q) return;
    sendQuestion(q);
    setQuestion('');
  };
  return (
    // a card to click, with a form in it: the click shows it large, the form's own clicks stay its own
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={onPick}
      title={`${card.label}: ${card.blurb}`}
      data-place={index}
      className={cn(
        'group relative flex h-full w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[14px] p-3 text-left',
        selected ? 'shadow-[inset_0_0_0_2px_rgb(20_32_63/0.35)]' : ''
      )}
      style={{ background: pale }}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[14px] leading-[17px] font-semibold" style={{ color: deep }}>
          {card.label}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 opacity-70" style={{ color: deep }}>
          <AgentMarks className="h-[16px] gap-1.5" markClassName="h-full w-auto" />
          <AiSparkles className="h-[18px] w-auto" />
        </span>
      </span>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex items-center gap-1.5 rounded-full bg-white py-1 pr-1 pl-3.5 shadow-[0_2px_8px_-2px_rgb(20_32_63/0.18)]"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the assistant anything…"
          aria-label="Ask the assistant"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#13306f] outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          aria-label="Ask"
          disabled={!question.trim()}
          className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
          style={{ background: deep }}
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-[14px]">
            <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}

/** How far apart a cluster's hexagons are, past touching (a share of their size). */
const CLUSTER_GAP = 0.1;
/** The largest a cluster's hexagon may be (its circumradius, px). */
const CLUSTER_MAX_R = 64;
/** The largest a band's hexagon may be: larger than a cluster's, so fewer show and a video's title fits. */
const BAND_MAX_R = 80;

type THexPlace = { left: number; top: number; width: number; height: number };

/**
 * The `n` cells of a honeycomb nearest its middle, a little wider than tall (the left column's boxes are), for a
 * hexagon of circumradius 1: the first in the middle, the rest round it.
 */
function clusterCells(n: number) {
  const cells: Array<{ x: number; y: number; d: number }> = [];
  const reach = Math.ceil(Math.sqrt(n)) + 2;
  for (let q = -reach; q <= reach; q++)
    for (let row = -reach; row <= reach; row++) {
      const x = SQRT3 * (q + row / 2);
      const y = 1.5 * row;
      // a small tilt in the tie-break, so equal rings fill the same way each time
      cells.push({ x, y, d: Math.hypot(x, y * 1.55) + 0.001 * (x + 2 * y) });
    }
  return cells.sort((a, b) => a.d - b.d).slice(0, n);
}

/**
 * A hexagon's slow bob about its place, as the website home's field does (the user asked): `children` moved by the
 * landing's drift, its amount and pace from where it is.
 */
function Bob({ place, children }: { place: THexPlace; children: ReactNode }) {
  // a few px, as the field's tiles move
  const wander = driftOf(place.left, place.top, place.height);
  // rounded: the server's sines and the browser's differ in their last places, which React calls a mismatch
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <span
      className={cn(styles.drift, 'absolute inset-0 block')}
      style={
        {
          '--dx': `${round(wander.dx)}px`,
          '--dy': `${round(wander.dy)}px`,
          '--drift-duration': `${round(wander.duration)}s`,
          '--drift-delay': `${round(wander.delay)}s`,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

/**
 * A cluster of hexagons filling its box (as large as fit, up to CLUSTER_MAX_R), centred: `tile(i, place)` draws the
 * i-th at its place (its box's left, top, width and height, px).
 */
function HexCluster({
  n,
  tile,
  className,
}: {
  n: number;
  tile: (i: number, place: THexPlace) => ReactNode;
  className?: string;
}) {
  const [box, size] = useSize();
  const cells = clusterCells(n);
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const span = { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) };
  const k = 1 + CLUSTER_GAP;
  const r = Math.max(
    0,
    Math.min(CLUSTER_MAX_R, size.w / (span.x * k + SQRT3 + 0.3), size.h / (span.y * k + 2.3))
  );
  const mid = { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 };
  return (
    <div ref={box} className={cn('relative min-h-0 flex-1', className)}>
      {r > 0 &&
        cells.map((c, i) =>
          tile(i, {
            left: size.w / 2 + (c.x - mid.x) * r * k - (SQRT3 * r) / 2,
            top: size.h / 2 + (c.y - mid.y) * r * k - r,
            width: SQRT3 * r,
            height: 2 * r,
          })
        )}
    </div>
  );
}

/**
 * A band of hexagons two rows deep, interlocked, as tall as its box allows (up to BAND_MAX_R), running on to the
 * right past it and swept through sideways (the user asked: fewer showing, the rest a scroll away), fading a little
 * at the right edge as the rows do.
 */
function HexBand({ n, tile }: { n: number; tile: (i: number, place: THexPlace) => ReactNode }) {
  const [box, size] = useSize();
  // room round them for their bob and shadow
  const pad = 8;
  const k = 1 + CLUSTER_GAP;
  const r = Math.max(0, Math.min(BAND_MAX_R, (size.h - 2 * pad) / (2 + 1.5 * k)));
  const w = SQRT3 * r;
  const step = w * k;
  const cols = Math.ceil(n / 2);
  const width = 2 * pad + (cols - 1) * step + step / 2 + w + 24;
  return (
    <div
      ref={box}
      className="no-scrollbar relative -mx-1 min-h-0 flex-1 overflow-x-auto overflow-y-hidden [mask-image:linear-gradient(to_right,#000_calc(100%-28px),rgb(0_0_0/0.3))]"
    >
      {r > 0 && (
        <div className="relative h-full" style={{ width }}>
          {Array.from({ length: n }, (_, i) => {
            const row = i % 2;
            const col = Math.floor(i / 2);
            return tile(i, {
              left: pad + col * step + (row ? step / 2 : 0),
              top: pad + row * 1.5 * r * k,
              width: w,
              height: 2 * r,
            });
          })}
        </div>
      )}
    </div>
  );
}

/** A cluster hexagon's name, over its foot while pointed at. */
function HexName({ children }: { children: ReactNode }) {
  return (
    <span className="text-primary-9 pointer-events-none absolute bottom-[12%] left-1/2 z-10 w-max max-w-[170px] -translate-x-1/2 rounded-full bg-white/95 px-2 py-0.5 text-center text-[11.5px] leading-[14px] font-semibold opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

/**
 * The home's second design (the user asked for it beside the hexagons, chosen with the home's hidden menu): the
 * categories' things each in a row of their own down the left, scrolling sideways (Examples, the videos, Do science
 * in two rows; The institute left out), Learn & teach one card along their foot; an example, a video or one of Do
 * science's places clicked shows on the right (the places large, with the way in).
 */
/** An element's start in the first landing's sequence, as the `.enter` animation reads it. */
function enterAt(ms: number | undefined): CSSProperties | undefined {
  return ms === undefined ? undefined : ({ '--enter-delay': `${ms}ms` } as CSSProperties);
}

/**
 * When each part of the home rises in on the first landing (ms): left to right, the wordmark, what the platform is
 * and the examples one by one; the hexagons behind the example on show as the last example comes in; then the videos
 * one by one, then Platform's cards; `end`, once it has all played.
 */
function entranceTimes(examples: number, videos: number) {
  const STEP = 70;
  const examplesAt = 260;
  // the hexagons and the example on show coming in as the examples' row does (the user asked: sooner)
  const behind = examplesAt + 120;
  // the videos and Platform together, and with the examples' small hexagons (the user asked)
  const videosAt = examplesAt;
  const platformAt = videosAt;
  return {
    logo: 0,
    about: 130,
    examples: examplesAt,
    example: (slot: number) => examplesAt + 60 + slot * STEP,
    behind,
    videos: videosAt,
    video: (i: number) => videosAt + 80 + i * 90,
    platform: platformAt,
    place: (i: number) => platformAt + 80 + i * 50,
    end: platformAt + 80 + Math.max(videos * 90, 8 * 50, examples * STEP) + 800,
  };
}

export function RowsHome({
  groups,
  videos,
  base,
  titled = true,
  cardStyle = DEFAULT_CARD_STYLE,
  layout = 'rows',
}: {
  groups: IJourneyGroup[];
  videos: IExampleVideo[];
  base: string;
  /**
   * The left as rows, as three clusters of hexagons (the menu's fourth design), or as rows with the examples round
   * the right's edges instead of in a row (the fifth); the user asked for each.
   */
  layout?: 'rows' | 'clusters' | 'backdrop' | 'compact' | 'featured';
  /** Each row under its category's name; without, the rows alone (the menu's third design). */
  titled?: boolean;
  /** How Platform's cards look (the home's second hidden menu). */
  cardStyle?: TCardStyle;
}) {
  // The example on show (on the right, unless a video is) and which example each of the row's tiles holds: every one
  // but that, the two trading places when one is picked, as on the desktop (the user asked: no empty or ringed tile).
  const [hero, setHero] = useState(0);
  const [slots, setSlots] = useState(() => EXAMPLES.map((_, i) => i).filter((i) => i !== 0));
  // the small-Platform designs: the wordmark at the top, the videos at their own shape
  const compact = layout === 'compact' || layout === 'featured';
  // a video or one of Do science's places on show instead of the example
  const [side, setSide] = useState<TShown | null>(null);
  const shown: TShown = side ?? { kind: 'example', i: hero };
  // Do science's places, Learn and Teach with them (the user asked: Learn & teach in two, part of Do science)
  const places: IJourneyCard[] = [...groups[0].cards, ...LEARN_TEACH_CARDS];
  const tileW = TILE_W;
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const heroBox = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<IFlight | null>(null);
  const [landed, setLanded] = useState({ inbound: true, outbound: true });
  const [grow, setGrow] = useState<IGrow | null>(null);
  // the video or Platform card on show shrinking back into its card as something else is picked (the user asked)
  const [shrink, setShrink] = useState<(IGrow & { selector: string }) | null>(null);

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
    contract();
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
  // The video or Platform card on show, as something else is picked, shrinks back into its card (the user asked), as
  // an example flies back into its tile; not one still growing, which has nowhere settled to shrink from.
  const contract = () => {
    if ((side?.kind !== 'video' && side?.kind !== 'place') || grow) return;
    const big = heroBox.current;
    if (!big) return;
    const selector = side.kind === 'video' ? `[data-video="${side.i}"]` : `[data-place="${side.i}"]`;
    setShrink({
      id: Date.now(),
      from: rectOf(big),
      to: null,
      selector,
      video: side.kind === 'video' ? videos[side.i] : undefined,
      place: side.kind === 'place' && places[side.i] ? { card: places[side.i], index: side.i } : undefined,
    });
  };
  // A video clicked grows out of its card into the player (the user asked), as an example grows out of its hexagon.
  const pickVideo = (i: number) => {
    if (side?.kind === 'video' && side.i === i) return;
    contract();
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
  // Its × shrinks a Platform card back into its own, the example on show again (the user asked).
  const closePlace = () => {
    contract();
    setGrow(null);
    setSide(null);
  };
  // A Platform card clicked grows into its large card on the right, as a video into the player (the user asked).
  const pickPlace = (i: number) => {
    if (side?.kind === 'place' && side.i === i) return;
    contract();
    setFlight(null);
    setLanded({ inbound: true, outbound: true });
    setSide({ kind: 'place', i });
    const el = stage.current?.querySelector<HTMLElement>(`[data-place="${i}"]`);
    if (!el || !places[i]) return setGrow(null);
    setGrow({ id: Date.now(), place: { card: places[i], index: i }, from: rectOf(el), to: null });
  };
  // the tile they trade through, gone until both are in (the flights draw them), as on the desktop
  const trading = flight && !(landed.inbound && landed.outbound) ? flight.slot : undefined;

  // The first landing (the user asked): the wordmark, what the platform is and the examples rising in from left to
  // right, then the hexagons behind the example on show and the example with them; then the videos, then Platform.
  // Over once it has all played, so nothing picked later waits on it.
  const [entering, setEntering] = useState(true);
  const T = entranceTimes(slots.length, videos.length);
  useEffect(() => {
    const done = window.setTimeout(() => setEntering(false), T.end);
    return () => window.clearTimeout(done);
  }, [T.end]);
  const enterWhen = (ms: number) => (entering ? ms : undefined);
  const enterCls = entering ? styles.enter : undefined;

  // The example's words and buttons end level with Platform's cards' foot on the left (the user asked), whatever the
  // window's height: measured from the section (not the cards, which rise in on the landing), as it changes.
  const platform = useRef<HTMLElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const [foot, setFoot] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const section = platform.current;
    const right = pane.current;
    if (!section || !right) return undefined;
    const measure = () => {
      // the cards end 4px over the section's foot (its grid's padding)
      const gap = right.getBoundingClientRect().bottom - (section.getBoundingClientRect().bottom - 4);
      setFoot(Math.max(0, Math.round(gap)));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(right);
    watch.observe(section);
    if (section.parentElement) watch.observe(section.parentElement);
    return () => watch.disconnect();
  }, [layout]);

  return (
    // the rows on the left, what is on show on the right (the sides switched were tried)
    // its content's top and foot level with the assistant's panel beside it (the user asked them aligned)
    <div ref={stage} className="bg-background relative flex h-full w-full min-w-0 gap-8 px-6 pt-[12px] pb-[8px]">
      {/* the rows fade out at their right edge (no box round them: the user tried one), scrolling with no bar */}
      {/* 45:55 whatever is on show (the user asked to try it; 40:60 while a video played before) */}
      <div className="flex w-[45%] min-w-0 shrink-0 flex-col">
      {layout === 'clusters' ? (
        // three clusters of hexagons down the left, one each for the examples, the videos and Platform (the user
        // asked); the examples and the videos in bands that sweep on to the right, every hexagon bobbing a little
        <div className="flex min-h-0 flex-1 flex-col gap-3 pr-2">
          <section aria-label="Examples" className="flex min-h-0 flex-1 flex-col gap-1">
            {titled && <h2 className="text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase">Examples</h2>}
            <div ref={strip} className="flex min-h-0 flex-1 flex-col">
              <HexBand
                n={slots.length}
                tile={(slot, place) => {
                  const e = EXAMPLES[slots[slot]];
                  return (
                    <button
                      // eslint-disable-next-line react/no-array-index-key -- a tile is its place in the band
                      key={slot}
                      type="button"
                      title={e.label}
                      data-slot={slot}
                      onClick={() => pick(slot)}
                      className="group absolute"
                      style={{ ...place, visibility: slot === trading ? 'hidden' : undefined }}
                    >
                      <Bob place={place}>
                        <span className="absolute inset-0 drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]">
                          <span className="absolute inset-0 bg-white" style={{ clipPath: HEX_CLIP }}>
                            <span className="absolute inset-[5%]" style={{ clipPath: HEX_CLIP }}>
                              <TileMedia key={e.key} example={e} />
                            </span>
                          </span>
                        </span>
                        <HexName>{e.label}</HexName>
                      </Bob>
                    </button>
                  );
                }}
              />
            </div>
          </section>
          <section aria-label="Tutorial videos" className="flex min-h-0 flex-1 flex-col gap-1">
            {titled && <h2 className="text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase">Tutorial videos</h2>}
            <HexBand
              n={videos.length}
              tile={(i, place) => {
                const v = videos[i];
                const on = shown.kind === 'video' && shown.i === i;
                // its title in it, sized to it (the user asked: no white rim, titles shown, room for them)
                const size = Math.max(10, Math.min(13, place.width * 0.1));
                return (
                  <button
                    key={v.key}
                    type="button"
                    title={v.title}
                    data-video={i}
                    aria-pressed={on}
                    onClick={() => pickVideo(i)}
                    className="group absolute"
                    style={place}
                  >
                    <Bob place={place}>
                      <span className="absolute inset-0 drop-shadow-[0_6px_10px_rgb(28_40_72/0.22)]">
                        <span className="absolute inset-0 overflow-hidden" style={{ clipPath: HEX_CLIP }}>
                          <img src={v.poster} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                          <span
                            className={cn(
                              'absolute inset-0 bg-linear-to-b transition-opacity duration-300 group-hover:opacity-80',
                              on
                                ? 'from-[rgba(9,88,217,0.88)] to-[rgba(9,88,217,0.7)]'
                                : 'from-[rgba(0,39,102,0.9)] to-[rgba(0,39,102,0.72)]'
                            )}
                          />
                          <span className="absolute inset-x-[13%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-[6%] text-center">
                            <svg viewBox="0 0 16 16" aria-hidden className="size-[18px] shrink-0 text-white/85">
                              <path d="M5.5 3.8v8.4a.6.6 0 0 0 .92.5l6.5-4.2a.6.6 0 0 0 0-1L6.42 3.3a.6.6 0 0 0-.92.5Z" fill="currentColor" />
                            </svg>
                            <span
                              className="line-clamp-3 font-semibold text-white"
                              style={{ fontSize: size, lineHeight: `${Math.round(size * 1.2)}px` }}
                            >
                              {v.title}
                            </span>
                          </span>
                        </span>
                      </span>
                    </Bob>
                  </button>
                );
              }}
            />
          </section>
          <section aria-label="Platform" className="flex min-h-0 flex-1 flex-col gap-1">
            {titled && <h2 className="text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase">About the platform</h2>}
            {/* the OBI wordmark on its own at the bottom left, solid (the user asked), Platform's places beside it */}
            <div className="flex min-h-0 flex-1 gap-2">
              <div className="flex w-[22%] shrink-0 items-end pb-2 pl-1">
                <ObiLogo className="text-primary-9 h-auto w-full max-w-[120px]" />
              </div>
              <HexCluster
                n={places.length}
                tile={(at, place) => {
                  const card = places[at];
                  const on = shown.kind === 'place' && shown.i === at;
                  const { bg } = placeColours(at);
                  const pale = mix(bg, '#ffffff', 0.42);
                  const deep = mix(bg, '#14203f', 0.68);
                  // its name across its widest part, sized to it, so every one shows whole (the user asked)
                  const size = Math.max(9, Math.min(12.5, place.width * 0.105));
                  return (
                    <button
                      key={card.label}
                      type="button"
                      title={`${card.label}: ${card.blurb}`}
                      aria-pressed={on}
                      onClick={() => pickPlace(at)}
                      data-place={at}
                      className="group absolute"
                      style={place}
                    >
                      <Bob place={place}>
                        <span className="absolute inset-0 drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]">
                          <span className="absolute inset-0 overflow-hidden" style={{ clipPath: HEX_CLIP, background: pale }}>
                            {card.img ? (
                              <img
                                src={card.img}
                                alt=""
                                className={cn(
                                  'absolute inset-0 h-full w-full object-cover mix-blend-luminosity grayscale transition-opacity duration-300 group-hover:opacity-70',
                                  on ? 'opacity-70' : 'opacity-35'
                                )}
                                style={{ objectPosition: card.imgAt ?? 'center' }}
                                draggable={false}
                              />
                            ) : (
                              <span className="absolute inset-x-0 top-[16%] flex h-[14%] justify-center opacity-60" style={{ color: deep }}>
                                <AgentMarks className="h-full gap-[8%]" markClassName="h-full w-auto" />
                              </span>
                            )}
                            <span
                              className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center px-[10%] py-[5%] text-center font-bold uppercase"
                              style={{
                                color: deep,
                                fontSize: size,
                                lineHeight: `${Math.round(size * 1.15)}px`,
                                background: `${pale}d9`,
                              }}
                            >
                              {CLUSTER_NAMES[card.label] ?? card.label}
                            </span>
                          </span>
                        </span>
                      </Bob>
                    </button>
                  );
                }}
              />
            </div>
          </section>
        </div>
      ) : (
      // no scroll up and down (the user asked): Platform takes what the other rows leave; only a very short window
      // scrolls, rather than squeezing its cards to nothing
      // its parts spread down the height, so Platform's foot is at the bottom, level with the example's buttons on the
      // right (the user asked)
      // reaching out either side, so the shadows of the first and last things in it are not cut into a band
      <div className="no-scrollbar -mr-6 -ml-6 flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-y-auto pr-8 pl-6">
        {/* the OBI wordmark at the top left with what the platform is beside it (the small-Platform design) */}
        {compact && (
          <header className="flex shrink-0 items-center gap-5 px-1 pt-1">
            {/* a little larger (the user asked) */}
            <span className={cn('shrink-0', enterCls)} style={enterAt(enterWhen(T.logo))}>
              <ObiLogo className="text-primary-9 h-[58px] w-auto" />
            </span>
            <p
              className={cn('m-0 max-w-[540px] text-[15px] leading-[22px] text-neutral-600', enterCls)}
              style={enterAt(enterWhen(T.about))}
            >
              The Open Brain Platform brings the brain’s data, models and simulations together in your browser. Explore
              data from across species, build and simulate models from single neurons to whole brains, and analyse
              what you find.
            </p>
          </header>
        )}
        {layout !== 'backdrop' && (
        <div ref={strip}>
        <Row title="Examples" titled={titled} enter={enterWhen(T.examples)}>
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
                className={cn('group relative flex shrink-0 flex-col items-center', enterCls)}
                style={{
                  width: tileW,
                  visibility: slot === trading ? 'hidden' : undefined,
                  ...enterAt(enterWhen(T.example(slot))),
                }}
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
        )}
        {/* the videos after the examples, no row for The institute (the user asked) */}
        <Row title="Tutorial videos" titled={titled} share={compact ? undefined : 1} enter={enterWhen(T.videos)}>
          {videos.map((v, i) => (
            // as wide as a Platform card, and as tall: one share of the height to its three (the user asked); with
            // the small Platform squares, three across at the videos' own shape
            <div
              key={v.key}
              data-video={i}
              className={cn('shrink-0', compact ? 'aspect-[3/2]' : 'h-full', enterCls)}
              style={{ width: `calc((100% - ${2 * CARD_GAP}px) / 3)`, ...enterAt(enterWhen(T.video(i))) }}
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
        {layout === 'featured' ? (
          // the five squares, then Learn and Teach half again as wide and the AI card with its prompt (the user asked)
          <section ref={platform} aria-label="Platform" className="flex min-w-0 shrink-0 flex-col gap-[8px]">
            {titled && (
              <h2
                className={cn('text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase', enterCls)}
                style={enterAt(enterWhen(T.platform))}
              >
                {/* (the user asked: "Platform" before) */}
                About the platform
              </h2>
            )}
            {/* ten narrow columns: a square two, Learn and Teach three, the AI card four; its rows equal, as tall as a
                square */}
            <div className="grid auto-rows-fr grid-cols-10 gap-2.5 pt-[4px] pb-[4px]">
              {places.slice(0, 5).map((card, i) => (
                <div key={card.label} className={cn('col-span-2 aspect-square', enterCls)} style={enterAt(enterWhen(T.place(i)))}>
                  <ScienceRowCard
                    card={card}
                    index={i}
                    selected={shown.kind === 'place' && shown.i === i}
                    onPick={() => pickPlace(i)}
                    look={cardStyle}
                  />
                </div>
              ))}
              {(['learning', 'teaching'] as const).map((icon) => {
                const at = places.findIndex((c) => c.icon === icon);
                return (
                  // in the other cards' subtle colours again (the user asked; shiny green and blue, `ShinyCard`, were
                  // tried), half again as wide
                  <div key={icon} className={cn('col-span-3', enterCls)} style={enterAt(enterWhen(T.place(icon === 'learning' ? 5 : 6)))}>
                    <ScienceRowCard
                      card={places[at]}
                      index={at}
                      selected={shown.kind === 'place' && shown.i === at}
                      onPick={() => pickPlace(at)}
                      look={cardStyle}
                    />
                  </div>
                );
              })}
              {(() => {
                const at = places.findIndex((c) => c.action === 'ai');
                return (
                  <div className={cn('col-span-4', enterCls)} style={enterAt(enterWhen(T.place(7)))}>
                    <AiPromptCard
                      card={places[at]}
                      index={at}
                      selected={shown.kind === 'place' && shown.i === at}
                      onPick={() => pickPlace(at)}
                    />
                  </div>
                );
              })()}
            </div>
          </section>
        ) : null}
        {/* room under Platform, lifting it and the example's words a little off the foot (the user asked); the first
            to give way on a short window */}
        {layout === 'featured' && <div aria-hidden className="min-h-0 shrink basis-[26px]" />}
        {layout === 'featured' ? null : layout === 'compact' ? (
          // much smaller: squares, five to a row (the user asked; six was tried), the OBI wordmark at the top instead
          <section aria-label="Platform" className="flex min-w-0 shrink-0 flex-col gap-[8px]">
            {titled && (
              <h2 className="text-primary-9 px-1 text-[13px] leading-[16px] font-bold tracking-[0.08em] uppercase">
                About the platform
              </h2>
            )}
            <div className="grid grid-cols-5 gap-2.5 pt-[4px] pb-[4px]">
              {places.map((card, i) => (
                <div key={card.label} className="aspect-square">
                  <ScienceRowCard
                    card={card}
                    index={i}
                    selected={shown.kind === 'place' && shown.i === i}
                    onPick={() => pickPlace(i)}
                    look={cardStyle}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
        <Row title="About the platform" titled={titled} grid>
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
        )}
      </div>
      )}
      </div>
      <div ref={pane} className="min-h-0 min-w-0 flex-1">
        <Shown
          shown={shown}
          videos={videos}
          places={places}
          base={base}
          heroBox={heroBox}
          landing={(!!flight && !landed.inbound) || !!grow}
          backdrop={layout === 'backdrop' ? { slots, trading, onPick: pick, strip } : undefined}
          onClosePlace={closePlace}
          enter={enterWhen(T.behind)}
          foot={foot}
        />
      </div>
      {shrink && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <VideoGrow
            key={`back-${shrink.id}`}
            back
            from={shrink.from}
            target={() => {
              const el = stage.current?.querySelector<HTMLElement>(shrink.selector);
              return el ? rectOf(el) : null;
            }}
            video={shrink.video}
            place={shrink.place}
            onDone={() => setShrink(null)}
          />
        </div>
      )}
      {grow?.to && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <VideoGrow
            key={grow.id}
            from={grow.from}
            target={() => (heroBox.current ? rectOf(heroBox.current) : null)}
            video={grow.video}
            place={grow.place}
            onDone={() => setGrow(null)}
          />
        </div>
      )}
      {flight?.to && (
        // no z-index of its own: a layer of its own would cut the fliers' multiply off from the page under them
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* each gone as it lands, so the one there is not drawn twice over itself */}
          {!landed.inbound && (
            <MeltFlier
              key={`in-${flight.id}`}
              tile={flight.from}
              to={flight.to.at}
              example={EXAMPLES[flight.inbound]}
              width={flight.to.width}
              heroR={flight.to.heroR}
              blend
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
              blend
              onDone={() => setLanded((l) => ({ ...l, outbound: true }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
