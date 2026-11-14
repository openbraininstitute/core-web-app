'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { config } from '@/config';
import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { useMediaQuery } from '@/hooks/use-media-query';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { getClient } from '@/services/sanity/client';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
import { EXAMPLES, journeyGroups, journeyHref, LOCAL_VIDEOS } from '@/ui/segments/project/hex-home/content';
import { APO, driftOf, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { FillFrame, HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { FreeMedia, MeltFlier, TileMedia } from '@/ui/segments/project/hex-home/landing-example';
import { clusterAround, fieldWhites, floorAround, seededRandom } from '@/ui/segments/project/hex-home/landing-field';
import { columnSpecs, layTongues } from '@/ui/segments/project/hex-home/tongue-geometry';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { VideoColumn } from '@/ui/segments/project/hex-home/video-card';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import { AgentMarks } from './agent-marks';
import { HexHomeMobile } from './hex-home-mobile';
import { CATEGORIES, GREEN, placeColours, useFadeSwap, WORDS_FADE_MS, wordsFor } from './hex-home-shared';
import styles from './hex-cloud.module.css';

import type { CSSProperties, ReactNode } from 'react';
import type {
  IExample,
  IExampleVideo,
  IJourneyCard,
  IJourneyGroup,
} from '@/ui/segments/project/hex-home/content';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';
import type { ITongueTile } from '@/ui/segments/project/hex-home/tongue-geometry';

/** The home is laid out this many px across, scaled to the page, and as tall as the page's shape makes it. */
const STAGE_W = 1600;
/** Tall enough for every tongue's places; a shorter page scrolls. */
const MIN_H = 760;
/** The platform's recordings and every tutorial with a poster: the column scrolls. */
const MAX_VIDEOS = 40;

const EXAMPLES_TONGUE = 0;
/** The hexagon the words of the example on show sit in, in the hole the examples lie round (stage px). */
const WORDS_R = 182;
const SCIENCE_TONGUE = 1;
const VIDEOS_TONGUE = 3;

/** What the home shows: an example on show beside the rest (as it opens), or the videos lined up, one playing. */
type TView = { kind: 'examples' } | { kind: 'videos'; k: number };


/** When a tile comes in: its tongue unrolling from the root, each tongue a little after the one above. */
const appearAt = (tongue: number, s: number, x: number) =>
  Math.round(300 + tongue * 90 + s * 0.45 + (Math.abs(Math.sin(x * 7.13)) % 1) * 60);

/** How a tongue's tile folds into its category's tile and out again: the tip first going in, the root first out. */
interface IFold {
  folded: boolean;
  foldTo: IPoint;
  foldDelayMs: number;
}
const foldOf = (folded: boolean, root: IPoint, s: number, reach: number): IFold => ({
  folded,
  foldTo: root,
  foldDelayMs: Math.round(folded ? (reach - s) * 0.25 : 120 + s * 0.3),
});

/** A pill with what a picture tile is, under it while hovered. */
function HoverLabel({ shown, kind, children }: { shown: boolean; kind?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        styles.label,
        'top-[calc(100%+6px)] flex flex-col items-center rounded-full bg-white/95 px-[12px] py-[4px] shadow-md transition-opacity duration-200',
        shown ? 'opacity-100' : 'opacity-0'
      )}
    >
      {kind && (
        <span className="text-[9px] leading-[11px] font-semibold tracking-[1px] text-neutral-400 uppercase">
          {kind}
        </span>
      )}
      <span className="text-primary-9 text-[12px] leading-[15px] font-semibold">{children}</span>
    </span>
  );
}

/** An example on its tongue, its loop playing; empty while it is the one in the middle, or on its way there or back. */
function ExampleTile({
  tile,
  example,
  empty,
  onPick,
  fold,
  onTongue,
}: {
  tile: ITongueTile;
  example: IExample;
  empty: boolean;
  onPick: () => void;
  fold: IFold;
  onTongue: (on: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <HexTile
      box={tile}
      lift={tile.lift}
      drift={tile.drift}
      // nothing left in its place while its example is away (the flights draw it), as on the landing
      style={empty ? { visibility: 'hidden' } : undefined}
      onClick={onPick}
      onHover={(on) => {
        setHover(on);
        onTongue(on);
      }}
      title={example.label}
      appearMs={appearAt(EXAMPLES_TONGUE, tile.s, tile.x)}
      z={hover ? 10 : undefined}
      overlay={<HoverLabel shown={hover && !empty}>{example.label}</HoverLabel>}
      {...fold}
    >
      {!empty && <TileMedia example={example} />}
    </HexTile>
  );
}

function CardTile({
  tile,
  tongue,
  card,
  base,
  fold,
  onTongue,
}: {
  tile: ITongueTile;
  tongue: number;
  card: IJourneyCard;
  base: string;
  fold: IFold;
  onTongue: (on: boolean) => void;
}) {
  return (
    <HexTile
      box={tile}
      lift={tile.lift}
      drift={tile.drift}
      href={card.href ? journeyHref(card.href, base) : undefined}
      title={card.href ? `${card.label}: ${card.blurb}` : `${card.label}: coming soon`}
      appearMs={appearAt(tongue, tile.s, tile.x)}
      onHover={onTongue}
      {...fold}
    >
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-[7px] px-[30px] text-center',
          !card.href && 'opacity-45'
        )}
      >
        <img src={`/images/vlab-home/icons/${card.icon}.svg`} alt="" width={34} height={34} />
        <span className="text-primary-9 text-[19px] leading-[23px] font-semibold">{card.label}</span>
        <span className="text-[13px] leading-[17px] text-neutral-500">{card.blurb}</span>
      </div>
    </HexTile>
  );
}

/** A Do science card's place: its middle, its size, and how far it is from its category. */
interface IPlaceRect {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
  item: number;
}

/**
 * A part of the platform on Do science's tongue: a card with rounded corners in colours of its own, its picture
 * toned to them (clearer while hovered), its name and use over the foot in its ink. It folds into its category as
 * the hexagons do.
 */
function PlaceCard({
  rect,
  card,
  base,
  fold,
  onTongue,
}: {
  rect: IPlaceRect;
  card: IJourneyCard;
  base: string;
  fold: IFold;
  onTongue: (on: boolean) => void;
}) {
  const wander = driftOf(rect.x, rect.y, 60);
  const href = card.href ? journeyHref(card.href, base) : undefined;
  const { bg, ink } = placeColours(rect.item);
  // a card that opens the assistant rather than going anywhere (AI + MCP Server)
  const { setState: setAi } = usePanelState();
  const openAi = card.action === 'ai' ? () => setAi(PanelState.Expanded) : undefined;
  const face = (
    <div className="absolute inset-0 overflow-hidden rounded-[24px] border border-black/10" style={{ background: bg }}>
      {card.img ? (
        // the picture's light and shade in the card's colour
        <img
          src={card.img}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-luminosity grayscale transition-opacity duration-300 group-hover:opacity-80"
          style={{ objectPosition: card.imgAt ?? 'center' }}
        />
      ) : (
        // no picture of it: the agents it can be driven from, by their marks, and the sparkles AI goes by above
        // them to the right (the user asked), in its ink
        <span
          className="absolute inset-0 opacity-55 transition-opacity duration-300 group-hover:opacity-85"
          style={{ color: ink }}
        >
          <AiSparkles className="absolute top-[7%] right-[7%] h-[24%] w-auto" />
          <span className="absolute inset-x-0 top-[24%] flex h-[24%] justify-center">
            <AgentMarks className="h-full gap-[9%]" markClassName="h-[70%] w-auto" />
          </span>
        </span>
      )}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-[4px] px-[28px] pt-[56px] pb-[22px]"
        style={{ backgroundImage: `linear-gradient(to top, ${bg} 40%, ${bg}00)` }}
      >
        <span className="text-[30px] leading-[34px] font-semibold" style={{ color: ink }}>
          {card.label}
        </span>
        <span className="text-[16px] leading-[21px] opacity-80" style={{ color: ink }}>
          {card.blurb}
        </span>
      </div>
    </div>
  );
  const tileClass = cn(styles.tile, styles.place, href && styles.interactive, 'group');
  const tileStyle = { '--rest-lift': 0.62 } as CSSProperties;
  const hover = { onPointerEnter: () => onTongue(true), onPointerLeave: () => onTongue(false) };
  return (
    <div
      className={cn(styles.slot, styles.drift)}
      style={
        {
          left: rect.x - rect.w / 2,
          top: rect.y - rect.h / 2,
          width: rect.w,
          height: rect.h,
          '--dx': `${wander.dx}px`,
          '--dy': `${wander.dy}px`,
          '--drift-duration': `${wander.duration}s`,
          '--drift-delay': `${wander.delay}s`,
        } as CSSProperties
      }
    >
      <div
        className={styles.appear}
        style={{ '--appear-delay': `${appearAt(SCIENCE_TONGUE, rect.s, rect.x)}ms` } as CSSProperties}
      >
        <div
          className={styles.fold}
          data-folded={fold.folded}
          style={
            {
              '--to-x': `${fold.foldTo.x - rect.x}px`,
              '--to-y': `${fold.foldTo.y - rect.y}px`,
              transitionDelay: `${fold.foldDelayMs}ms`,
            } as CSSProperties
          }
        >
          {href ? (
            <Link href={href} className={tileClass} style={tileStyle} title={`${card.label}: ${card.blurb}`} {...hover}>
              {face}
            </Link>
          ) : openAi ? (
            <button
              type="button"
              onClick={openAi}
              className={cn(tileClass, styles.interactive, 'text-left')}
              style={tileStyle}
              title={`${card.label}: ${card.blurb}`}
              {...hover}
            >
              {face}
            </button>
          ) : (
            <div className={tileClass} style={tileStyle} title={`${card.label}: coming soon`} {...hover}>
              {face}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A part of the platform on Do science's tongue as a hexagon: its colours, its picture toned to them (clearer while
 * hovered), its name and use over its foot in its ink; it folds into its category as the other tiles do.
 */
function PlaceHex({
  box,
  index,
  card,
  base,
  fold,
  onTongue,
}: {
  box: IHexBox;
  index: number;
  card: IJourneyCard;
  base: string;
  fold: IFold;
  onTongue: (on: boolean) => void;
}) {
  const { bg, ink } = placeColours(index);
  const { setState: setAi } = usePanelState();
  const href = card.href ? journeyHref(card.href, base) : undefined;
  const onClick = card.action === 'ai' ? () => setAi(PanelState.Expanded) : undefined;
  return (
    <HexTile
      box={box}
      lift={0.75}
      href={href}
      onClick={href ? undefined : onClick}
      onHover={onTongue}
      title={`${card.label}: ${card.blurb}`}
      className="group"
      folded={fold.folded}
      foldTo={fold.foldTo}
      foldDelayMs={fold.foldDelayMs}
    >
      <div className="absolute inset-0" style={{ background: bg }}>
        {card.img ? (
          <img
            src={card.img}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-luminosity grayscale transition-opacity duration-300 group-hover:opacity-80"
            style={{ objectPosition: card.imgAt ?? 'center' }}
          />
        ) : (
          <span
            className="absolute inset-0 opacity-55 transition-opacity duration-300 group-hover:opacity-85"
            style={{ color: ink }}
          >
            <AiSparkles className="absolute top-[14%] right-[24%] h-[14%] w-auto" />
            <span className="absolute inset-x-0 top-[30%] flex h-[13%] justify-center">
              <AgentMarks className="h-full gap-[7%]" markClassName="h-[70%] w-auto" />
            </span>
          </span>
        )}
        <div
          className="absolute inset-x-0 bottom-0 flex h-[58%] flex-col items-center justify-center gap-[4px] px-[16%] pt-[14%] text-center"
          style={{ backgroundImage: `linear-gradient(to top, ${bg} 55%, ${bg}00)` }}
        >
          <span className="text-[27px] leading-[31px] font-semibold" style={{ color: ink }}>
            {card.label}
          </span>
          <span className="text-[15px] leading-[19px] opacity-80" style={{ color: ink }}>
            {card.blurb}
          </span>
        </div>
      </div>
    </HexTile>
  );
}

function CategoryTile({
  category,
  box,
  index,
  scale,
  glideDelayMs,
  onClick,
  onHover,
  on,
}: {
  category: (typeof CATEGORIES)[number];
  box: IHexBox;
  index: number;
  scale: number;
  glideDelayMs: number;
  onClick?: () => void;
  onHover?: (on: boolean) => void;
  /** Its tongue out, or what it opened on show. */
  on?: boolean;
}) {
  return (
    <HexTile
      box={box}
      drift={false}
      // white; navy while hovered, its tongue out, or what it opened on show
      tone={on ? 'navy' : 'white'}
      appearMs={150 + index * 90}
      onClick={onClick}
      onHover={onHover}
      title={category.label}
      lift={on ? 1.1 : 0.9}
      glide
      glideDelayMs={glideDelayMs}
      scale={scale}
    >
      {/* the name alone, large, in capitals, as the Workflows page's categories; The institute its wordmark (the user
          asked, taking it off the top bar) */}
      <div className="flex h-full w-full items-center justify-center px-[8px] text-center">
        {category.key === 'institute' ? (
          <ObiLogo
            className={cn('h-[46px] w-auto transition-colors duration-300', on ? 'text-white' : 'text-primary-9')}
          />
        ) : (
          <span
            className={cn(
              'text-[17px] leading-[20px] font-bold tracking-[0.04em] uppercase transition-colors duration-300',
              on ? 'text-white' : 'text-primary-9'
            )}
          >
            {category.label}
          </span>
        )}
      </div>
    </HexTile>
  );
}

/** The example in the middle: what the model is, and what to do with it. */
function ModelPanel({ example, base }: { example: IExample; base: string }) {
  const words = wordsFor(example);
  const button =
    'flex h-[30px] items-center justify-center rounded-full px-[14px] text-[12px] font-semibold whitespace-nowrap transition-colors';
  // in its hexagon: what it is over what to do with it, centred, within the hexagon's narrowing top and foot
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[10px] px-[15%] text-center">
      <div className="flex min-w-0 flex-col items-center gap-[3px]">
        {/* no "Example" kicker over its name (the user asked) */}
        <h2 className="text-[20px] leading-[24px] font-light text-[#13306f]">{words.name}</h2>
        <p className="line-clamp-4 text-[12.5px] leading-[17px] text-neutral-600">{words.about}</p>
      </div>
      {/* not the hexagon's whole width (the user asked) */}
      <div className="flex w-[74%] flex-col gap-[5px]">
        <Link
          href={`${base}/workflows`}
          className={cn(button, 'text-white hover:brightness-110')}
          style={{ background: GREEN }}
        >
          Simulate this model
        </Link>
        <Link
          href={`${base}/notebooks`}
          className={cn(button, 'border-2 bg-white hover:bg-[#f0f9f0]')}
          style={{ borderColor: GREEN, color: GREEN }}
        >
          Analyse in notebook
        </Link>
        <Link
          href={`${base}/data`}
          className={cn(button, 'border-2 bg-white hover:bg-[#f0f9f0]')}
          style={{ borderColor: GREEN, color: GREEN }}
        >
          View in data
        </Link>
      </div>
    </div>
  );
}

/**
 * The virtual lab's home: five categories in a column down the left, Examples, the Figma's three groups of places
 * (Do science, Learn & teach, The institute) and Tutorial videos. Hovering one brings its tongue of
 * hexagons out to the right, in the landing's white-on-white style. An example picked flies out of its tile into the
 * middle as the landing's chosen one does, beside what the model is and what to do with it. The videos, picked, line
 * up beside the column, with one playing to their right. The categories stay where they are throughout.
 */
export function HexHomePage() {
  const { virtualLabId, projectId } = useWorkspace();
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const learn = useFlag(learnFlag.key) === true;
  const groups = journeyGroups({ learn });

  const client = getClient();
  const { data: tutorials } = useQuery({
    queryKey: keyBuilderExternal.discoverTutorialsList(),
    queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery, {}, { next: { revalidate: 0 } }),
  });
  const videos = useMemo<IExampleVideo[]>(
    () =>
      [
        ...LOCAL_VIDEOS,
        ...(tutorials ?? [])
          .filter((t) => t.posterImage && t.url)
          .map((t) => ({
            key: `tutorial-${t.slug}`,
            kind: t.category ?? 'Tutorial',
            title: t.title,
            poster: `${t.posterImage}?w=400&h=400&fit=crop`,
            // played here, in the player beside the column, rather than on its own page
            url: t.url,
          })),
      ].slice(0, MAX_VIDEOS),
    [tutorials, base]
  );

  // a phone has no room for the field, nor a pointer to hover with: the home laid out down the page instead
  const phone = useMediaQuery('(max-width: 767px)', false);
  // what a category shows fades in and out (the user asked to try it); `?motion=dynamic` folds it out of its category
  const dynamic = useSearchParams().get('motion') === 'dynamic';
  if (phone) return <HexHomeMobile groups={groups} videos={videos} base={base} />;

  return (
    <div className={cn('h-full w-full bg-white', !dynamic && styles.fadeMotion)}>
      <FillFrame width={STAGE_W} minHeight={MIN_H}>
        {(height) => <Home height={height} groups={groups} videos={videos} base={base} />}
      </FillFrame>
    </div>
  );
}

/** The places' size on a tongue: one tongue out at a time leaves room for them large; the examples smaller. */
const PLACE_R = 104;


function Home({
  height,
  groups,
  videos,
  base,
}: {
  height: number;
  groups: IJourneyGroup[];
  videos: IExampleVideo[];
  base: string;
}) {
  // in CATEGORIES' order: the examples but the one on show, the three groups, videos
  const counts = [
    // the examples are laid out below, beside the categories, not on a tongue
    0,
    // Do science's pictures too, large, in the room right of the categories
    0,
    groups[1].cards.length,
    // the videos are cards, not hexagons, laid out below
    0,
    groups[2].cards.length,
  ];
  const specs = useMemo(
    () => columnSpecs(STAGE_W, height, counts),
    [height, counts.join()]
  );
  const laid = useMemo(
    () => layTongues({ specs, width: STAGE_W, height, apart: true, along: 2, itemR: PLACE_R }),
    [specs, height]
  );
  const column = { right: Math.max(...specs.map((sp) => sp.root.x + sp.root.r * APO)) };
  // The examples as the website landing's field (the user asked), at its size here, a tile each: a big one with the
  // rest straight beside it on its sides but its right, which the one on show has, the cluster's top near
  // the page's (the user asked for them high); white tiles round them, and the landing's honeycomb floor under the
  // room between the categories and the one on show. Laid out anew on each visit, as the landing is.
  // As on the landing (laid out 1920 px across), the one on show stands out of its tile, large, on the right: its
  // tile grown as if to this size and melted away; as wide as the example says, within the landing's box.
  const k = STAGE_W / 1920;
  // As on the landing, the one on show stands out of its tile, large, on the right: its tile grown as if to this size
  // and melted away; as large as most of the page (the user asked for it larger than the landing's)
  const heroR = Math.min(330 * k, height * 0.34);
  const widthOf = (example: IExample) =>
    Math.min(example.hero * k * 1.25, 900 * k, height * 0.92 * example.aspect);
  const heroAtFor = (example: IExample) => ({ x: STAGE_W - 32 - widthOf(example) / 2, y: height / 2 });
  const examplesRoot = specs[EXAMPLES_TONGUE].root;
  const [fieldSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  // the examples stop short of the one on show at its widest
  const heroRoomLeft = Math.min(...EXAMPLES.map((e) => STAGE_W - 32 - widthOf(e)));
  // the examples' room, left of the words' hexagon (to their right, the user asked), always the same arrangement
  // (the words may lie over the widest one's white margin, so the examples keep most of the room)
  const clusterRight = heroRoomLeft - 8 - SQRT3 * WORDS_R * 0.55;
  const field = useMemo(() => {
    const random = seededRandom(fieldSeed);
    const bounds = { x0: column.right + 16, x1: clusterRight, y0: 12, y1: height - 12 };
    // a tile for each example but the one on show, as on the landing, round the big one in the middle of their room
    const features = clusterAround({
      center: { x: (bounds.x0 + bounds.x1) / 2, y: height / 2 },
      holeR: 0,
      k,
      count: EXAMPLES.length - 1,
      bounds,
    });
    const right = Math.max(...features.map((f) => f.x + f.r * APO));
    // none of the white tiles under what the one on show is and does (its panel, below the middle on the right)
    const panelBox = { x0: right + 20, x1: STAGE_W, y0: height * 0.48 - 16, y1: height * 0.48 + 330 };
    const whites = fieldWhites({ features, k, bounds, keepOut: [panelBox], random });
    return { features, whites };
  }, [fieldSeed, height, column.right, heroRoomLeft, clusterRight]);
  const minis: ITongueTile[] = field.features.map((f, i) => ({
    key: `mini${i}`,
    ...f,
    s: Math.hypot(f.x - examplesRoot.x, f.y - examplesRoot.y),
    item: i,
    lift: i ? 0.7 : 1,
    drift: true,
  }));
  const minisRight = Math.max(...minis.map((t) => t.x + t.r * APO));
  // Do science's places, the whole platform, as rounded cards all of one shape (the user asked): three across the
  // top and the rest under the first of them, the two rows centred on their category, within the page. Each is two
  // categories tall (the user asked for twice the size), and as wide as that allows up to 1.75 times its height.
  const scienceRoot = specs[SCIENCE_TONGUE].root;
  const sciPitch = specs.length > 1 ? specs[1].root.y - specs[0].root.y : 2 * scienceRoot.r;
  const SCI_GAP = 20;
  const sciAcross = 3;
  const sciH = 2 * (sciPitch - 20);
  const sciW = Math.min(sciH * 1.75, (STAGE_W - 40 - (column.right + 40) - (sciAcross - 1) * SCI_GAP) / sciAcross);
  const sciRows = Math.ceil(groups[0].cards.length / sciAcross);
  const sciBlockH = sciRows * sciH + (sciRows - 1) * SCI_GAP;
  const sciTop = Math.min(Math.max(24, scienceRoot.y - sciBlockH / 2), height - 24 - sciBlockH);
  const science: IPlaceRect[] = groups[0].cards.map((_, i) => {
    const x = column.right + 40 + (i % sciAcross) * (sciW + SCI_GAP) + sciW / 2;
    const y = sciTop + Math.floor(i / sciAcross) * (sciH + SCI_GAP) + sciH / 2;
    return { key: `sci${i}`, x, y, w: sciW, h: sciH, s: Math.hypot(x - scienceRoot.x, y - scienceRoot.y), item: i };
  });
  const scienceReach = Math.max(0, ...science.map((r) => r.s));
  // Tried as hexagons (the user asked): the same cards, three over three interlocked, as large as the room right of
  // the column allows, the block centred on Do science's category as the cards are.
  const SCI_HEX_GAP = 14;
  const sciRoom = STAGE_W - 40 - (column.right + 40);
  const sciHexR = Math.min(
    200,
    (sciRoom - 2.5 * SCI_HEX_GAP) / (3.5 * SQRT3),
    (height - 48 - (SCI_HEX_GAP * SQRT3) / 2) / 3.5
  );
  const sciHexW = SQRT3 * sciHexR;
  const sciHexRise = 1.5 * sciHexR + (SCI_HEX_GAP * SQRT3) / 2;
  const sciHexTop = Math.min(
    Math.max(24, scienceRoot.y - (2 * sciHexR + sciHexRise) / 2),
    height - 24 - (2 * sciHexR + sciHexRise)
  );
  const scienceHexes: IHexBox[] = groups[0].cards.map((_, i) => {
    const row = Math.floor(i / 3);
    return {
      x: column.right + 40 + sciHexW / 2 + (i % 3) * (sciHexW + SCI_HEX_GAP) + (row % 2) * ((sciHexW + SCI_HEX_GAP) / 2),
      y: sciHexTop + sciHexR + row * sciHexRise,
      r: sciHexR,
    };
  });
  const sciHexReach = Math.max(
    0,
    ...scienceHexes.map((b) => Math.hypot(b.x - scienceRoot.x, b.y - scienceRoot.y))
  );
  const tongues = laid.map((tiles, t) => (t === EXAMPLES_TONGUE ? minis : t === SCIENCE_TONGUE ? [] : tiles));
  const reach = tongues.map((tiles) => Math.max(0, ...tiles.map((t) => t.s)));

  const [view, setView] = useState<TView>({ kind: 'examples' });
  // As on the landing: one example on show beside the field, the others in its tiles, one each. A pick flies out of
  // its tile to be on show as the one there flies back into the tile it left, so no tile stays behind empty (the
  // user asked, as on the website; an earlier version kept an empty tile per example).
  const [hero, setHero] = useState(0);
  const [slots, setSlots] = useState(() => EXAMPLES.map((_, i) => i).filter((i) => i !== 0));
  const [flight, setFlight] = useState<{ inbound: number; outbound: number; slot: number; id: number } | null>(
    null
  );
  const [landed, setLanded] = useState({ inbound: true, outbound: true });
  const busy = !!flight;

  // The tongue out besides the examples': the last category hovered, which stays out once the pointer leaves it
  // (the user asked) until another is hovered, or one clicked out, for a touch screen.
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const onTongue = (t: number) => (on: boolean) => {
    if (on) setHovered(t);
  };
  const out = hovered ?? pinned;

  const lined = view.kind === 'videos';

  // The field of white tiles is part of what a category brings out (the user asked): it rises out of the category
  // whose content is out with that content, and folds back into it as another's comes out, a set of its own
  // coming out of that one meanwhile. The first set sweeps in as the page opens.
  const owner = out ?? (lined ? VIDEOS_TONGUE : EXAMPLES_TONGUE);
  const [fieldSets, setFieldSets] = useState<Array<{ id: number; owner: number; leaving: boolean }>>(() => [
    { id: 0, owner, leaving: false },
  ]);
  useEffect(() => {
    setFieldSets((sets) => {
      const live = sets.find((set) => !set.leaving);
      if (live?.owner === owner) return sets;
      const id = Math.max(...sets.map((set) => set.id)) + 1;
      return [...sets.map((set) => ({ ...set, leaving: true })), { id, owner, leaving: false }];
    });
  }, [owner]);
  // a set folded away is gone once it has folded
  useEffect(() => {
    if (!fieldSets.some((set) => set.leaving)) return;
    const done = window.setTimeout(() => setFieldSets((sets) => sets.filter((set) => !set.leaving)), 1200);
    return () => window.clearTimeout(done);
  }, [fieldSets]);
  const examplesOn = view.kind === 'examples';
  // the examples' tongue is out with its example on show, unless another tongue is out over them
  const isOut = (t: number) =>
    t === EXAMPLES_TONGUE ? out === t || (examplesOn && (out === null || out === t)) : out === t;

  // The videos as the Figma's cards, in a column two wide beside the categories that scrolls: out of their category
  // while it is hovered, and kept out, with the one playing to their right, while they are open.
  const videosRoot = specs[VIDEOS_TONGUE].root;
  // the one playing as large as the room right of the column allows, its frame in the page's middle; the column as
  // tall as that frame and level with it (the user asked), not the page's height
  const videoColumnX = column.right + 28;
  const videoColumnW = 246 + 16;
  const lineRight = videoColumnX + videoColumnW;
  const player = { left: lineRight + 40, right: STAGE_W - 32 };
  const playerW = Math.min(player.right - player.left, ((height - 130) * 16) / 9);
  const videoH = (playerW * 9) / 16;
  const videoColumn = { x: videoColumnX, y: height / 2 - videoH / 2, w: videoColumnW, h: videoH };

  // what it is and what to do with it, under the tongue of the others
  // what it is and what to do with it, in a floating window as the landing's bubble: over the lower left of the one
  // on show, clear of the minis
  // the words, and the window round them, fade out where they were and in by the new one on show (the user asked)
  const words = useFadeSwap(hero);
  const panelAway = words.fading || (!!flight && !landed.inbound);
  const said = EXAMPLES[words.said];
  // Its words and what to do with it in a hexagon of their own on its left, expanding out of it as it comes on show
  // (the user asked; it was a window beside it, a frame round both, before): in the white between it and the
  // examples, over its picture's white margin if that is narrow.
  const wordsR = WORDS_R;
  // right of the examples, a little above the middle, a thin grey line from it to the one on show (the user asked)
  const wordsW = SQRT3 * wordsR;
  const wordsHex = { x: minisRight + 24 + wordsW / 2, y: height * 0.42, r: wordsR };
  const leader = {
    x0: wordsHex.x + wordsW / 2,
    x1: Math.max(wordsHex.x + wordsW / 2 + 48, heroAtFor(said).x - widthOf(said) * 0.22),
    y: wordsHex.y,
  };

  const pick = (slot: number) => {
    const incoming = slots[slot];
    if (busy || incoming === undefined || incoming === hero) return;
    setFlight({ inbound: incoming, outbound: hero, slot, id: Date.now() });
    setLanded({ inbound: false, outbound: false });
    setHero(incoming);
    setView({ kind: 'examples' });
    setHovered(null);
    setPinned(null);
  };
  // both flights in: each is where it belongs
  useEffect(() => {
    if (flight && landed.inbound && landed.outbound) setFlight(null);
  }, [flight, landed]);

  const openVideos = (i = 0) => {
    if (busy) return;
    setView({ kind: 'videos', k: Math.max(0, i) });
    setHovered(null);
    setPinned(null);
  };
  const backToExamples = () => {
    setView({ kind: 'examples' });
    setHovered(null);
    setPinned(null);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setHovered(null);
      setPinned(null);
      if (lined) backToExamples();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shown = examplesOn ? EXAMPLES[hero] : null;
  const kept = examplesOn ? EXAMPLES_TONGUE : VIDEOS_TONGUE;
  // what is open goes while another tongue is out over it: the example on show, or the videos folded back into their
  // category with the one playing (the user asked)
  const hide = out !== null && out !== kept;

  const categoryClick = (i: number) => () => {
    if (i === VIDEOS_TONGUE) return lined ? backToExamples() : openVideos();
    if (i === EXAMPLES_TONGUE) return backToExamples();
    // a category opens on a click (the user asked), and stays out until another is clicked
    setHovered(i);
    setPinned(null);
  };

  // the one picked, or the first while the videos' category is hovered (the user asked), muted as nothing was clicked
  const previewing = !lined && out === VIDEOS_TONGUE;
  const playing = lined ? videos[view.k] : previewing ? videos[0] : null;
  const playerHidden = lined && hide;

  // Each category's field round what it shows, so that its content sits in the white tiles (the user asked): the
  // examples' the landing's, grown round their picture tiles; the others' the floor laid round their cards, tiles,
  // or the videos and the one playing.
  const categoryFields = useMemo(() => {
    const rect = (x: number, y: number, w: number, h: number) => ({ x0: x, x1: x + w, y0: y, y1: y + h });
    const playerH = videoH + 64;
    return CATEGORIES.map((_, t) => {
      // the examples on their own, no white tiles round them (the user asked)
      if (t === EXAMPLES_TONGUE) return [];
      const random = seededRandom(fieldSeed + 101 * (t + 1));
      const around =
        t === SCIENCE_TONGUE
          ? science.map((c) => rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h))
          : t === VIDEOS_TONGUE
            ? [
                rect(videoColumn.x, videoColumn.y, videoColumn.w, videoColumn.h),
                rect(player.left + (player.right - player.left - playerW) / 2, height / 2 - videoH / 2 - 64, playerW, playerH),
              ]
            : (laid[t] ?? []);
      if (!around.length) return field.whites;
      // round the content and a little past it, none trailing off to the page's right (the user asked them gone)
      const right = Math.max(...around.map((b) => ('r' in b ? b.x + b.r : b.x1)));
      const bounds = { x0: column.right + 16, x1: Math.min(STAGE_W - 8, right + 150), y0: 12, y1: height - 12 };
      // hexagons: white tiles grown against their sides, as the examples' are; cards and the videos: the floor round
      return 'r' in around[0]
        ? fieldWhites({ features: around as IHexBox[], k, bounds, keepOut: [], random })
        : floorAround({ around, k, bounds, random });
    });
    // the layout's numbers, not the arrays rebuilt on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, fieldSeed, height, column.right, playerW, laid, science.length, sciW, sciH, sciTop]);

  return (
    <>
      {/* the landing's white tiles, behind the category whose content is out and coming out of it with it (the user
          asked); with white ones in the examples' places when it is not the examples', so the field stays whole */}
      {fieldSets.map((set) => {
        const root = specs[set.owner]?.root ?? examplesRoot;
        const tiles = (categoryFields[set.owner] ?? field.whites).map((w) => ({
          box: w as IHexBox,
          key: w.key,
          lift: Math.min(0.6, 0.12 + 0.5 * w.h),
          drift: w.drift,
        }));
        const away = (b: IHexBox) => Math.hypot(b.x - root.x, b.y - root.y);
        const reachOf = Math.max(0, ...tiles.map((t) => away(t.box)));
        return tiles.map((t) => {
          const d = away(t.box);
          return (
            <HexTile
              key={`${set.id}-${t.key}`}
              box={t.box}
              lift={t.lift}
              drift={t.drift}
              className="pointer-events-none!"
              // the page's first set sweeps in from the left as it opens; a later one comes out of its category
              appearMs={
                set.id === 0
                  ? Math.round(
                      200 + (t.box.x / STAGE_W) * 700 + (Math.abs(Math.sin(t.box.x * 7.13 + t.box.y)) % 1) * 160
                    )
                  : Math.round(80 + d * 0.32)
              }
              from={set.id === 0 ? undefined : root}
              folded={set.leaving}
              foldTo={root}
              foldDelayMs={set.leaving ? Math.round((reachOf - d) * 0.22) : 0}
            />
          );
        });
      })}

      {/* what is open, under any tongue that comes out over it */}
      <div
        className={cn(styles.openLayer, 'pointer-events-none absolute inset-0 transition-opacity duration-300')}
        // no z-index of its own: one would isolate the one on show's multiply, its white hiding the tiles under it
        style={{ opacity: hide ? 0 : 1 }}
      >
        {shown && landed.inbound && (
          <div
            key={shown.key}
            className={cn(styles.freeIn, 'absolute')}
            style={{
              left: heroAtFor(shown).x - widthOf(shown) / 2,
              top: height / 2 - widthOf(shown) / shown.aspect / 2,
            }}
          >
            <FreeMedia example={shown} width={widthOf(shown)} />
          </div>
        )}
        {shown && (
          // out of sight from the pick until the one picked has landed, and only then in (the user asked)
          <div
            className={cn(!hide && !panelAway && 'pointer-events-auto', 'transition-opacity ease-in-out')}
            style={{ opacity: panelAway ? 0 : 1, transitionDuration: `${WORDS_FADE_MS}ms` }}
          >
            <div
              aria-hidden
              className="absolute h-px bg-neutral-300"
              style={{ left: leader.x0, top: leader.y, width: leader.x1 - leader.x0 }}
            >
              <span className="absolute -top-[3px] -right-[3.5px] size-[7px] rounded-full bg-neutral-400" />
            </div>
            {/* new for each one on show, so it expands out of it again (its own animation: the fade mode keeps it) */}
            <div
              key={`words-${words.said}`}
              className={cn(styles.wordsIn, 'pointer-events-none absolute inset-0')}
              style={
                {
                  transformOrigin: `${wordsHex.x}px ${wordsHex.y}px`,
                  '--from-x': `${heroAtFor(said).x - wordsHex.x}px`,
                } as CSSProperties
              }
            >
              <HexTile box={wordsHex} lift={0.95} drift={false}>
                <ModelPanel example={said} base={base} />
              </HexTile>
            </div>
          </div>
        )}
      </div>

      {/* the video playing, beside the videos' column: kept out while the pointer is on it, and kept open once clicked */}
      <div
        className={cn(styles.openLayer, 'pointer-events-none absolute inset-0 transition-opacity duration-300')}
        style={{ opacity: playerHidden ? 0 : 1, zIndex: 0 }}
      >
        {playing && (playing.video || playing.url) && (
          <div
            key={playing.key}
            className={cn(styles.fadeIn, !playerHidden && 'pointer-events-auto', 'absolute')}
            style={{
              left: player.left + (player.right - player.left - playerW) / 2,
              // its frame level with the column beside it, the title over it
              top: height / 2 - videoH / 2,
              width: playerW,
              animationDelay: previewing ? '200ms' : '450ms',
            }}
            onPointerEnter={previewing ? () => onTongue(VIDEOS_TONGUE)(true) : undefined}
            onPointerLeave={previewing ? () => onTongue(VIDEOS_TONGUE)(false) : undefined}
            onPointerDown={previewing ? () => openVideos(0) : undefined}
          >
            <div className="absolute bottom-[calc(100%+10px)] left-0 flex flex-col">
              <span className="text-[12px] font-semibold tracking-[0.12em] uppercase" style={{ color: GREEN }}>
                {playing.kind}
              </span>
              <span className="text-primary-9 font-serif text-[32px] leading-[38px]">{playing.title}</span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-[0_18px_50px_rgb(20_40_90_/_0.18)]">
              <VideoPlayer url={playing.video ?? playing.url} title={playing.title} muted={previewing} />
            </div>
          </div>
        )}
      </div>

      {tongues.map((tiles, t) => {
        // a tongue is out while its category is hovered or clicked out (the examples' too while one is on show)
        const folded = !isOut(t);
        const fold = (tile: ITongueTile) => foldOf(folded, specs[t].root, tile.s, reach[t]);
        const keep = onTongue(t);
        return tiles.map((tile) => {
          const i = tile.item!;
          if (t === EXAMPLES_TONGUE) {
            return (
              <ExampleTile
                key={tile.key}
                tile={tile}
                example={EXAMPLES[slots[i] ?? 0]}
                // its example on show, or on its way back to it
                // gone while its example flies out and the other flies in
                empty={!!flight && flight.slot === i && !landed.outbound}
                onPick={() => pick(i)}
                fold={fold(tile)}
                onTongue={keep}
              />
            );
          }
          const group = groups[t === 4 ? 2 : t - 1];
          return (
            <CardTile
              key={tile.key}
              tile={tile}
              tongue={t}
              card={group.cards[i]}
              base={base}
              fold={fold(tile)}
              onTongue={keep}
            />
          );
        });
      })}

      {/* the cards as rounded rectangles (the user tried hexagons, `PlaceHex` and `scienceHexes`, and went back) */}
      {science.map((rect) => (
        <PlaceCard
          key={rect.key}
          rect={rect}
          card={groups[0].cards[rect.item]}
          base={base}
          fold={foldOf(!isOut(SCIENCE_TONGUE), scienceRoot, rect.s, scienceReach)}
          onTongue={onTongue(SCIENCE_TONGUE)}
        />
      ))}

      <VideoColumn
        videos={videos}
        at={videoColumn}
        from={videosRoot}
        open={isOut(VIDEOS_TONGUE) || (lined && !hide)}
        selected={lined ? view.k : previewing ? 0 : null}
        onPick={openVideos}
        onHover={onTongue(VIDEOS_TONGUE)}
      />

      {CATEGORIES.map((category, i) => (
        <CategoryTile
          key={category.key}
          category={category}
          box={specs[i].root}
          index={i}
          scale={1}
          glideDelayMs={0}
          on={out === i || (out === null && kept === i)}
          onClick={categoryClick(i)}
          // a click opens it, not the pointer passing over (the user asked)
          onHover={() => {}}
        />
      ))}

      {flight && (
        <>
          <MeltFlier
            key={`in-${flight.id}`}
            tile={minis[flight.slot]}
            to={heroAtFor(EXAMPLES[flight.inbound])}
            example={EXAMPLES[flight.inbound]}
            width={widthOf(EXAMPLES[flight.inbound])}
            heroR={heroR}
            onDone={() => setLanded((l) => ({ ...l, inbound: true }))}
          />
          <MeltFlier
            key={`out-${flight.id}`}
            tile={minis[flight.slot]}
            to={heroAtFor(EXAMPLES[flight.outbound])}
            example={EXAMPLES[flight.outbound]}
            width={widthOf(EXAMPLES[flight.outbound])}
            heroR={heroR}
            back
            onDone={() => {
              // in its tile now: the tile is its
              setSlots((was) => was.map((e, i) => (i === flight.slot ? flight.outbound : e)));
              setLanded((l) => ({ ...l, outbound: true }));
            }}
          />
        </>
      )}
    </>
  );
}
