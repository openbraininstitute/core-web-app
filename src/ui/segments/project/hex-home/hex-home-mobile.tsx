'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { VideoCard } from '@/ui/segments/project/hex-home/video-card';
import { EXAMPLES, journeyHref } from '@/ui/segments/project/hex-home/content';
import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { FreeMedia, MeltFlier, TileMedia } from '@/ui/segments/project/hex-home/landing-example';
import { PlaceShown } from '@/ui/segments/project/hex-home/rows-home';
import { cn } from '@/utils/css-class';

import { AgentMarks } from './agent-marks';
import { CATEGORIES, GREEN, placeColours, useFadeSwap, WORDS_FADE_MS, wordsFor } from './hex-home-shared';
import styles from './hex-cloud.module.css';

import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { IExample, IExampleVideo, IJourneyCard, IJourneyGroup } from '@/ui/segments/project/hex-home/content';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';
import type { TCategoryKey } from './hex-home-shared';

/** A box's width, for what has to be told its size in px (an example out of its tile). */
function useWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** The one on show's width in a box `room` wide. */
const heroWidth = (example: IExample, room: number) => Math.min(room, 360 * example.aspect);
/** How much of a strip tile its example fills (it sits inset 6% in its hexagon). */
const IN_TILE = 0.88;

/** A hexagon of the home's: white (navy when `on`), raised by its shadow, what it carries clipped inside. */
function Hex({ on, className, children }: { on?: boolean; className?: string; children?: ReactNode }) {
  return (
    <span
      className={cn('relative block drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]', className)}
      style={{ aspectRatio: `${Math.sqrt(3)} / 2` }}
    >
      <span
        className={cn('absolute inset-0 overflow-hidden transition-colors duration-300', on ? 'bg-[#002766]' : 'bg-white')}
        style={{ clipPath: HEX_CLIP }}
      >
        {children}
      </span>
    </span>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: GREEN }}>
      {children}
    </span>
  );
}

/**
 * What the one on show is, and what to do with it: on a pick, the last one's words and buttons fade out and the new
 * one's in (the user asked).
 */
function Words({ example, children }: { example: IExample; children?: ReactNode }) {
  const { said, fading } = useFadeSwap(example);
  const words = wordsFor(said);
  return (
    <div
      className="flex flex-col gap-2 transition-opacity ease-in-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${WORDS_FADE_MS}ms` }}
    >
      <Kicker>{words.kicker}</Kicker>
      <h2 className="text-[26px] leading-[31px] font-light text-[#13306f]">{words.name}</h2>
      <p className="text-[15px] leading-[22px] text-neutral-600">{words.about}</p>
      {children}
    </div>
  );
}

/**
 * The examples: the one on show large, what it is and what to do with it. Kept in its place unseen while it is
 * `landing`, flying there out of its tile, as on the desktop.
 */
function Examples({
  base,
  shown,
  heroBox,
  landing,
}: {
  base: string;
  shown: number;
  heroBox: RefObject<HTMLDivElement | null>;
  landing: boolean;
}) {
  const width = useWidth(heroBox);
  const example = EXAMPLES[shown];
  const button =
    'flex h-[44px] items-center justify-center rounded-full px-[18px] text-[14px] font-semibold transition-colors';
  return (
    <div className="flex flex-col gap-5">
      <div ref={heroBox} className="flex justify-center">
        {width > 0 && (
          <div
            key={example.key}
            className={cn(!landing && styles.freeIn)}
            style={landing ? { visibility: 'hidden' } : undefined}
          >
            <FreeMedia example={example} width={heroWidth(example, width)} />
          </div>
        )}
      </div>
      <Words example={example}>
        <div className="mt-2 flex flex-wrap gap-2">
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
      </Words>
    </div>
  );
}

/**
 * The examples as a line of hexagons along the foot, scrolling sideways (the user asked). As on the desktop, the one
 * on show leaves its tile empty, as does one on its way back to it (`away`).
 */
function ExampleStrip({ shown, away, onPick }: { shown: number; away: number | null; onPick: (i: number) => void }) {
  return (
    // room under the hexagons for their shadows, which a sideways scroll would otherwise cut into a grey band: on the
    // page's white, flush with the rest (the user asked)
    <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-white px-4 pt-2 pb-4">
      {EXAMPLES.map((e, i) => (
        <button
          key={e.key}
          type="button"
          title={e.label}
          aria-pressed={i === shown}
          onClick={() => onPick(i)}
          data-example={i}
          className="w-[64px] shrink-0"
        >
          {/* rising in one after another as the desktop's tiles do (the user asked) */}
          <span className={cn(styles.appear, 'block')} style={{ '--appear-delay': `${150 + i * 80}ms` } as CSSProperties}>
            <Hex>
              {i !== shown && i !== away && (
                <span className="absolute inset-[6%]" style={{ clipPath: HEX_CLIP }}>
                  <TileMedia example={e} />
                </span>
              )}
            </Hex>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Do science's places: the platform's parts as cards, each in colours of its own, as on the desktop. */
function Places({ cards, base }: { cards: IJourneyCard[]; base: string }) {
  // one tapped shows its white card, as the desktop's rows do on their right (the user asked), with the way back
  const [open, setOpen] = useState<number | null>(null);
  if (open !== null && cards[open])
    return (
      <div key={cards[open].label} className={cn(styles.fadeIn, 'flex h-full min-h-[540px] flex-col gap-2.5')}>
        <button
          type="button"
          onClick={() => setOpen(null)}
          className="text-primary-9 flex w-max items-center gap-1 text-[14px] font-semibold"
        >
          ← Platform
        </button>
        <div className="min-h-0 flex-1">
          <PlaceShown card={cards[open]} base={base} />
        </div>
      </div>
    );
  // two to a row, filling the room over the categories so all of them show without a scroll (the user asked)
  return (
    <div
      className="grid h-full min-h-[360px] grid-cols-2 gap-2.5"
      style={{ gridTemplateRows: `repeat(${Math.ceil(cards.length / 2)}, minmax(0, 1fr))` }}
    >
      {cards.map((card, i) => {
        const { bg, ink } = placeColours(i);
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => setOpen(i)}
            className="relative block h-full w-full overflow-hidden rounded-[18px] text-left shadow-[0_6px_18px_rgb(20_40_90/0.16)]"
            style={{ background: bg }}
          >
            {card.img ? (
              <img
                src={card.img}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-luminosity grayscale"
                style={{ objectPosition: card.imgAt ?? 'center' }}
              />
            ) : (
              <span className="absolute inset-0 opacity-60" style={{ color: ink }}>
                <AiSparkles className="absolute top-[6%] right-[7%] h-[17%] w-auto" />
                <span className="absolute inset-x-0 top-[26%] flex h-[13%] justify-center">
                  <AgentMarks className="h-full gap-[8%]" markClassName="h-full w-auto" />
                </span>
              </span>
            )}
            <span
              className="absolute inset-x-0 bottom-0 flex flex-col gap-[2px] px-3.5 pt-8 pb-3.5"
              style={{ backgroundImage: `linear-gradient(to top, ${bg} 50%, ${bg}00)` }}
            >
              <span className="text-[17px] leading-[20px] font-semibold" style={{ color: ink }}>
                {card.label}
              </span>
              <span className="text-[12px] leading-[15px] opacity-80" style={{ color: ink }}>
                {card.blurb}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A group's places as rows: its icon, its name and what it is for; greyed while it has no page yet. */
function Rows({ cards, base }: { cards: IJourneyCard[]; base: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {cards.map((card) => {
        const body = (
          <>
            <img src={`/images/vlab-home/icons/${card.icon}.svg`} alt="" width={30} height={30} className="shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="text-primary-9 text-[17px] leading-[21px] font-semibold">{card.label}</span>
              <span className="text-[14px] leading-[18px] text-neutral-500">
                {card.href ? card.blurb : `${card.blurb} · coming soon`}
              </span>
            </span>
          </>
        );
        const row = 'border-neutral-2 flex items-center gap-4 rounded-2xl border bg-white p-4';
        return card.href ? (
          <Link key={card.label} href={journeyHref(card.href, base)} className={cn(row, 'active:bg-neutral-50')}>
            {body}
          </Link>
        ) : (
          <div key={card.label} className={cn(row, 'opacity-50')}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** The tutorial videos: the one playing on top (the first, muted, until one is tapped), the rest under it. */
function Videos({ videos }: { videos: IExampleVideo[] }) {
  const [playing, setPlaying] = useState(0);
  const [tapped, setTapped] = useState(false);
  const video = videos[playing];
  return (
    <div className="flex flex-col gap-4">
      {video && (
        // pinned at the top while the cards scroll under it (the user asked)
        <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex flex-col gap-2 bg-white px-4 pt-4 pb-3">
          <div className="flex flex-col">
            <Kicker>{video.kind}</Kicker>
            <span className="text-primary-9 font-serif text-[22px] leading-[27px]">{video.title}</span>
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-[0_12px_30px_rgb(20_40_90/0.18)]">
            <VideoPlayer key={video.key} url={video.video ?? video.url} title={video.title} muted={!tapped} />
          </div>
        </div>
      )}
      {/* the desktop's blue cards, two to a row (the user asked); a tap plays one in the pinned player */}
      <div className="grid grid-cols-2 gap-2.5">
        {videos.map((v, i) => (
          <VideoCard
            key={v.key}
            small
            video={v}
            selected={i === playing}
            delayMs={60 + Math.min(i, 8) * 35}
            onPick={() => {
              setPlaying(i);
              setTapped(true);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Where an example flies to or from on show: its centre, its width there and the size its tile grows to. */
interface IOnShow {
  at: IPoint;
  width: number;
  heroR: number;
}

/** A pick under way: the example flying out of its tile to be on show, and the one there flying back to its own. */
interface IFlight {
  id: number;
  inbound: number;
  outbound: number;
  from: IHexBox;
  to: IOnShow;
  back: IHexBox;
  home: IOnShow;
}

/**
 * The platform's home on a phone: the five categories as a row of hexagons along the foot to tap (a phone cannot
 * hover), the tapped one's content over them: the example on show (the examples themselves a line of hexagons just
 * over the categories), Do science's cards, the groups' places as rows, the videos with one playing.
 */
export function HexHomeMobile({
  groups,
  videos,
  base,
}: {
  groups: IJourneyGroup[];
  videos: IExampleVideo[];
  base: string;
}) {
  const [category, setCategory] = useState<TCategoryKey>('examples');
  const [shown, setShown] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLElement>(null);
  const heroBox = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<IFlight | null>(null);
  const [landed, setLanded] = useState({ inbound: true, outbound: true });

  // A tap flies the example out of its tile, growing and its tile melting away, to be on show, as the one there flies
  // back to its tile, as on the desktop (the user asked).
  const pick = (i: number) => {
    if (flight || i === shown) return;
    const tileOf = (n: number) => strip.current?.querySelector<HTMLElement>(`[data-example="${n}"]`);
    const [box, page, a, b] = [heroBox.current, stage.current, tileOf(i), tileOf(shown)];
    if (!box || !page || !a || !b) {
      setShown(i);
      return;
    }
    // to where it can be seen going
    if (scroller.current) scroller.current.scrollTop = 0;
    const R = page.getBoundingClientRect();
    const B = box.getBoundingClientRect();
    const hexOf = (el: HTMLElement): IHexBox => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top, r: (IN_TILE * r.width) / SQRT3 };
    };
    const onShow = (e: IExample): IOnShow => {
      const width = heroWidth(e, B.width);
      return {
        at: { x: B.left + B.width / 2 - R.left, y: B.top + width / e.aspect / 2 - R.top },
        width,
        // as on the desktop, its tile grows to about two thirds of its width as it melts
        heroR: (0.65 * width) / SQRT3,
      };
    };
    setFlight({
      id: Date.now(),
      inbound: i,
      outbound: shown,
      from: hexOf(a),
      to: onShow(EXAMPLES[i]),
      back: hexOf(b),
      home: onShow(EXAMPLES[shown]),
    });
    setLanded({ inbound: false, outbound: false });
    setShown(i);
  };
  // both flights in: each is where it belongs
  useEffect(() => {
    if (flight && landed.inbound && landed.outbound) setFlight(null);
  }, [flight, landed]);
  const showCategory = (key: TCategoryKey) => {
    setCategory(key);
    setFlight(null);
    setLanded({ inbound: true, outbound: true });
  };

  // the category tapped over the categories, which sit along the foot just above the toolbar (the user asked)
  return (
    <div ref={stage} className="relative flex h-full w-full flex-col bg-white">
      <section
        key={category}
        ref={scroller}
        className={cn(
          styles.fadeIn,
          'no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4',
          category === 'build' ? 'pb-3' : 'pb-6'
        )}
      >
        {category === 'examples' && (
          <Examples base={base} shown={shown} heroBox={heroBox} landing={!!flight && !landed.inbound} />
        )}
        {category === 'build' && <Places cards={groups[0].cards} base={base} />}
        {category === 'learn' && <Rows cards={groups[1].cards} base={base} />}
        {category === 'videos' && <Videos videos={videos} />}
        {category === 'institute' && <Rows cards={groups[2].cards} base={base} />}
      </section>
      <div ref={strip} className="shrink-0">
        {category === 'examples' && (
          <ExampleStrip shown={shown} away={flight && !landed.outbound ? flight.outbound : null} onPick={pick} />
        )}
      </div>
      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-white px-4 pt-0 pb-3">
        {/* The institute (the OBI wordmark) first, as at the top of the desktop's column (the user asked) */}
        {[...CATEGORIES.filter((c) => c.key === 'institute'), ...CATEGORIES.filter((c) => c.key !== 'institute')].map((c, i) => {
          const on = c.key === category;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => showCategory(c.key)}
              aria-pressed={on}
              // narrow enough that the last peeks in at the edge, to show the row scrolls
              className="w-[74px] shrink-0"
            >
              {/* rising in one after another as the examples do (the user asked) */}
              <span
                className={cn(styles.appear, 'block')}
                style={{ '--appear-delay': `${60 + i * 80}ms` } as CSSProperties}
              >
                <Hex on={on}>
                  <span
                    className={cn(
                      'absolute inset-0 flex items-center justify-center px-1.5 text-center text-[10.5px] leading-[12.5px] font-bold tracking-[0.03em] uppercase',
                      on ? 'text-white' : 'text-primary-9'
                    )}
                  >
                    {/* The institute its wordmark, as on the desktop (the user asked) */}
                    {c.key === 'institute' ? <ObiLogo className="h-[24px] w-auto" /> : c.label}
                  </span>
                </Hex>
              </span>
            </button>
          );
        })}
      </div>
      {flight && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <MeltFlier
            key={`in-${flight.id}`}
            tile={flight.from}
            to={flight.to.at}
            example={EXAMPLES[flight.inbound]}
            width={flight.to.width}
            heroR={flight.to.heroR}
            onDone={() => setLanded((l) => ({ ...l, inbound: true }))}
          />
          <MeltFlier
            key={`out-${flight.id}`}
            tile={flight.back}
            to={flight.home.at}
            example={EXAMPLES[flight.outbound]}
            width={flight.home.width}
            heroR={flight.home.heroR}
            back
            onDone={() => setLanded((l) => ({ ...l, outbound: true }))}
          />
        </div>
      )}
    </div>
  );
}
