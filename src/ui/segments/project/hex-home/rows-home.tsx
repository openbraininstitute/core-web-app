'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { EXAMPLES, journeyHref } from '@/ui/segments/project/hex-home/content';
import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { FreeMedia, TileMedia } from '@/ui/segments/project/hex-home/landing-example';
import { VideoCard } from '@/ui/segments/project/hex-home/video-card';
import { cn } from '@/utils/css-class';

import { GREEN, placeColours, wordsFor } from './hex-home-shared';
import styles from './hex-cloud.module.css';

import type { ReactNode } from 'react';
import type { IExampleVideo, IJourneyCard, IJourneyGroup } from '@/ui/segments/project/hex-home/content';

type TShown = { kind: 'example'; i: number } | { kind: 'video'; i: number };

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
function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="text-primary-9 px-1 text-[13px] font-bold tracking-[0.08em] uppercase">{title}</h2>
      {/* fading out at the box's right edge rather than cut off there */}
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-3 [mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]">
        {children}
        {/* room at the end, so the last one clears the fade */}
        <span aria-hidden className="w-6 shrink-0" />
      </div>
    </section>
  );
}

/** A place of the platform, Learn & teach's or The institute's: its icon, name and what it is for. */
function PlaceRowCard({ card, base }: { card: IJourneyCard; base: string }) {
  const body = (
    <>
      <img src={`/images/vlab-home/icons/${card.icon}.svg`} alt="" width={22} height={22} />
      <span className="text-primary-9 text-[14px] leading-[17px] font-semibold">{card.label}</span>
      <span className="line-clamp-2 text-[11.5px] leading-[14px] text-neutral-500">
        {card.href ? card.blurb : `${card.blurb} · coming soon`}
      </span>
    </>
  );
  // the size of Do science's cards (the user asked)
  const box =
    'border-neutral-2 flex h-[112px] w-[170px] shrink-0 flex-col gap-1.5 overflow-hidden rounded-[16px] border bg-white p-3 text-left shadow-[0_4px_12px_-6px_rgb(0_39_102/0.12)]';
  return card.href ? (
    <Link href={journeyHref(card.href, base)} className={cn(box, 'transition-shadow hover:shadow-md')}>
      {body}
    </Link>
  ) : (
    <div className={cn(box, 'opacity-50')}>{body}</div>
  );
}

/** One of Do science's cards, small, in its colours. */
function ScienceRowCard({ card, index, base }: { card: IJourneyCard; index: number; base: string }) {
  const { bg, ink } = placeColours(index);
  const { setState: setAi } = usePanelState();
  const face = (
    <>
      {card.img && (
        <img
          src={card.img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-luminosity grayscale transition-opacity duration-300 group-hover:opacity-80"
          style={{ objectPosition: card.imgAt ?? 'center' }}
        />
      )}
      <span
        className="absolute inset-x-0 bottom-0 flex flex-col gap-[2px] px-3.5 pt-8 pb-3"
        style={{ backgroundImage: `linear-gradient(to top, ${bg} 50%, ${bg}00)` }}
      >
        <span className="text-[16px] leading-[19px] font-semibold" style={{ color: ink }}>
          {card.label}
        </span>
        <span className="line-clamp-2 text-[11.5px] leading-[14px] opacity-80" style={{ color: ink }}>
          {card.blurb}
        </span>
      </span>
    </>
  );
  // as wide as they were square, lower (the user asked)
  const box = 'group relative block h-[112px] w-[170px] shrink-0 overflow-hidden rounded-[16px] text-left';
  if (card.action === 'ai')
    return (
      <button type="button" onClick={() => setAi(PanelState.Expanded)} className={box} style={{ background: bg }}>
        {face}
      </button>
    );
  return (
    <Link href={card.href ? journeyHref(card.href, base) : '#'} className={box} style={{ background: bg }}>
      {face}
    </Link>
  );
}

/** What is open on the right: the example picked, large, with what it is and what to do with it, or a video. */
function Shown({ shown, videos, base }: { shown: TShown; videos: IExampleVideo[]; base: string }) {
  const [box, size] = useSize();
  const button =
    'flex h-[38px] items-center justify-center rounded-full px-[16px] text-[13px] font-semibold transition-colors';
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
          <FreeMedia example={example} width={width} />
          <div className="flex max-w-[560px] flex-col items-center gap-2 text-center">
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
 * The home's second design (the user asked for it beside the hexagons, chosen with the home's hidden menu): the five
 * categories' things each in a row of their own down the left, scrolling sideways; an example or a video clicked
 * shows on the right, the places of the platform open their pages.
 */
export function RowsHome({
  groups,
  videos,
  base,
}: {
  groups: IJourneyGroup[];
  videos: IExampleVideo[];
  base: string;
}) {
  const [shown, setShown] = useState<TShown>({ kind: 'example', i: 0 });
  const tileW = 108;
  return (
    <div className="flex h-full w-full min-w-0 gap-8 bg-white px-6 pt-5 pb-4">
      {/* the rows fade out at their right edge (no box round them: the user tried one), scrolling with no bar */}
      <div className="flex w-[55%] min-w-0 shrink-0 flex-col">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
        <Row title="Examples">
          {EXAMPLES.map((e, i) => {
            const on = shown.kind === 'example' && shown.i === i;
            return (
              <button
                key={e.key}
                type="button"
                title={e.label}
                aria-pressed={on}
                onClick={() => setShown({ kind: 'example', i })}
                className="group relative flex shrink-0 flex-col items-center"
                style={{ width: tileW }}
              >
                <span
                  className="relative block drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]"
                  style={{ width: tileW, height: (2 * tileW) / SQRT3 }}
                >
                  <span
                    className={cn('absolute inset-0 transition-colors', on ? 'bg-[#002766]' : 'bg-white')}
                    style={{ clipPath: HEX_CLIP }}
                  >
                    <span className="absolute inset-[5%]" style={{ clipPath: HEX_CLIP }}>
                      <TileMedia example={e} />
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
        <Row title="Do science">
          {groups[0].cards.map((card, i) => (
            <ScienceRowCard key={card.label} card={card} index={i} base={base} />
          ))}
        </Row>
        <Row title="Learn & teach">
          {groups[1].cards.map((card) => (
            <PlaceRowCard key={card.label} card={card} base={base} />
          ))}
        </Row>
        <Row title="Tutorial videos">
          {videos.map((v, i) => (
            <div key={v.key} className="w-[170px] shrink-0">
              <VideoCard
                small
                height={112}
                video={v}
                selected={shown.kind === 'video' && shown.i === i}
                delayMs={0}
                onPick={() => setShown({ kind: 'video', i })}
              />
            </div>
          ))}
        </Row>
        <Row title="The institute">
          {groups[2].cards.map((card) => (
            <PlaceRowCard key={card.label} card={card} base={base} />
          ))}
        </Row>
      </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <Shown shown={shown} videos={videos} base={base} />
      </div>
    </div>
  );
}
