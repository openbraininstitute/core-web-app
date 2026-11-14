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
import { GREEN, placeColours, wordsFor } from './hex-home-shared';
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

/** One of Do science's cards, small, in its colours: a click shows it large on the right (the user asked). */
function ScienceRowCard({
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
  const { bg, ink } = placeColours(index);
  return (
    // as wide as they were square, lower (the user asked)
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      title={`${card.label}: ${card.blurb}`}
      className="group relative block h-[96px] w-[146px] shrink-0 overflow-hidden rounded-[14px] text-left"
      style={{ background: bg }}
    >
      {card.img ? (
        <img
          src={card.img}
          alt=""
          className={cn(
            'absolute inset-0 h-full w-full object-cover mix-blend-luminosity grayscale transition-opacity duration-300 group-hover:opacity-80',
            selected ? 'opacity-80' : 'opacity-45'
          )}
          style={{ objectPosition: card.imgAt ?? 'center' }}
        />
      ) : (
        <span
          className={cn('absolute inset-0 transition-opacity duration-300 group-hover:opacity-85', selected ? 'opacity-85' : 'opacity-55')}
          style={{ color: ink }}
        >
          <AiSparkles className="absolute top-[9%] right-[8%] h-[20%] w-auto" />
          <span className="absolute inset-x-0 top-[14%] flex h-[24%] justify-center">
            <AgentMarks className="h-full gap-[9%]" markClassName="h-[70%] w-auto" />
          </span>
        </span>
      )}
      <span
        className="absolute inset-x-0 bottom-0 flex flex-col gap-[2px] px-3.5 pt-8 pb-3"
        style={{ backgroundImage: `linear-gradient(to top, ${bg} 50%, ${bg}00)` }}
      >
        <span className="text-[14px] leading-[17px] font-semibold" style={{ color: ink }}>
          {card.label}
        </span>
        <span className="line-clamp-2 text-[11.5px] leading-[14px] opacity-80" style={{ color: ink }}>
          {card.blurb}
        </span>
      </span>
    </button>
  );
}

/** More about each of Do science's places than its card has room for, on its large card. */
const PLACE_MORE: Record<string, string> = {
  data: 'Browse experimental recordings, reconstructions and models from across species, by brain region, and use them in your own work.',
  workflows: 'Build circuits and single-cell models, simulate them, and analyse the results, each step a workflow you configure.',
  notebooks: 'Run Python analyses of the platform’s data and your simulations in the browser, with nothing to install.',
  labs: 'Your virtual labs and their projects: the data, models and results you and your team have made, and the credits they run on.',
  reports: 'Write up what you found, with figures from your simulations and analyses, and share it.',
  ai: 'Drive the platform from Claude, ChatGPT and other agents through its plugins and MCP server, or ask its own assistant.',
};

/** One of Do science's places, large on the right: its picture, what it is for, and the way in. */
function PlaceShown({ card, index, base, width }: { card: IJourneyCard; index: number; base: string; width: number }) {
  const { bg, ink } = placeColours(index);
  const { setState: setAi } = usePanelState();
  const go = 'flex h-[42px] w-max items-center rounded-full px-[20px] text-[14px] font-semibold transition-opacity hover:opacity-90';
  return (
    <div
      key={card.label}
      className={cn(styles.fadeIn, 'relative overflow-hidden rounded-[24px] shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]')}
      style={{ width, height: width * 0.78, background: bg }}
    >
      {card.img ? (
        <img
          src={card.img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-luminosity grayscale"
          style={{ objectPosition: card.imgAt ?? 'center' }}
        />
      ) : (
        <span className="absolute inset-0 opacity-80" style={{ color: ink }}>
          <AiSparkles className="absolute top-[7%] right-[7%] h-[18%] w-auto" />
          <span className="absolute inset-x-0 top-[16%] flex h-[20%] justify-center">
            <AgentMarks className="h-full gap-[9%]" markClassName="h-[70%] w-auto" />
          </span>
        </span>
      )}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-8 pt-24 pb-7"
        style={{ backgroundImage: `linear-gradient(to top, ${bg} 55%, ${bg}00)` }}
      >
        <span className="text-[34px] leading-[38px] font-semibold" style={{ color: ink }}>
          {card.label}
        </span>
        <span className="max-w-[520px] text-[15px] leading-[21px] opacity-85" style={{ color: ink }}>
          {PLACE_MORE[card.icon] ?? card.blurb}
        </span>
        {card.action === 'ai' ? (
          <button
            type="button"
            onClick={() => setAi(PanelState.Expanded)}
            className={cn(go, 'mt-2')}
            style={{ background: ink, color: bg }}
          >
            Ask the assistant
          </button>
        ) : (
          card.href && (
            <Link href={journeyHref(card.href, base)} className={cn(go, 'mt-2')} style={{ background: ink, color: bg }}>
              Open {card.label}
            </Link>
          )
        )}
      </div>
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
      <div ref={box} className="flex h-full min-h-0 flex-col items-center justify-center">
        {card && size.w > 0 && (
          <PlaceShown
            key={card.label}
            card={card}
            index={shown.i}
            base={base}
            width={Math.max(0, Math.min(size.w * 0.95, (size.h * 0.9) / 0.78, 680))}
          />
        )}
      </div>
    );
  }
  if (shown.kind === 'video') {
    const video = videos[shown.i];
    return (
      <div ref={box} className="flex h-full min-h-0 flex-col justify-center gap-3">
        {video && (
          <div key={video.key} className={cn(styles.fadeIn, 'flex flex-col gap-3')}>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: GREEN }}>
                {video.kind}
              </span>
              <span className="text-primary-9 font-serif text-[28px] leading-[34px]">{video.title}</span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]">
              <VideoPlayer url={video.video ?? video.url} title={video.title} />
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

  // the page's own coordinates of a box on it
  const centreOf = (el: HTMLElement) => {
    const R = stage.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top, w: r.width };
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
  const pickVideo = (i: number) => {
    setFlight(null);
    setLanded({ inbound: true, outbound: true });
    setSide({ kind: 'video', i });
  };
  const pickPlace = (i: number) => {
    setFlight(null);
    setLanded({ inbound: true, outbound: true });
    setSide({ kind: 'place', i });
  };
  // the tile they trade through, gone until both are in (the flights draw them), as on the desktop
  const trading = flight && !(landed.inbound && landed.outbound) ? flight.slot : undefined;

  return (
    <div ref={stage} className="relative flex h-full w-full min-w-0 gap-8 bg-white px-6 pt-5 pb-4">
      {/* the rows fade out at their right edge (no box round them: the user tried one), scrolling with no bar */}
      {/* 60:40 whatever is on show (the user tried 40:60 while a video plays) */}
      <div className="flex w-[60%] min-w-0 shrink-0 flex-col">
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
            <div key={v.key} className="w-[146px] shrink-0">
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
              index={i}
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
          landing={!!flight && !landed.inbound}
        />
      </div>
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
