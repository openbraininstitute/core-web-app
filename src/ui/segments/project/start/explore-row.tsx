'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { itemTypeLabel, type TStartItem } from '@/ui/segments/project/start/items';
import { formatDuration, useVideoDuration } from '@/ui/segments/project/start/use-video-duration';
import { cn } from '@/utils/css-class';

/** A ring drawn over the card's own content, which an inset shadow would sit under. */
const selectedClassName =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[8px] after:ring-2 after:ring-primary-4 after:ring-inset after:content-['']";

interface ICardProps<K extends TStartItem['kind']> {
  item: Extract<TStartItem, { kind: K }>;
  selected: boolean;
  onSelect: () => void;
}

function TutorialCard({ item, selected, onSelect }: ICardProps<'tutorial'>) {
  const duration = useVideoDuration(item.video);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex h-[168px] w-[246px] shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-[8px] p-[12px] text-left',
        selected && selectedClassName
      )}
    >
      <Image src={item.poster} alt="" fill sizes="246px" className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-b from-[rgba(0,39,102,0.86)] to-[rgba(0,39,102,0.42)]" />
      <div className="relative flex items-center gap-[5px]">
        <img src="/images/start/card-dot.svg" alt="" width={5} height={5} />
        <p className="text-primary-2 text-[9.5px] leading-[12px]">{itemTypeLabel(item)}</p>
      </div>
      <div className="relative flex flex-col gap-[6px]">
        <p className="text-[15px] leading-[19px] font-semibold text-white">{item.title}</p>
        <p className="text-primary-2 text-[11px] leading-[14px]">
          {duration ? formatDuration(duration) : ' '}
        </p>
      </div>
    </button>
  );
}

function ExampleArt({ item }: { item: TStartItem }) {
  if (item.kind === 'animation') {
    return (
      <video
        src={item.video}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  if ((item.kind === 'circuit' || item.kind === 'mesh') && item.art) {
    return <Image src={item.art} alt="" fill sizes="206px" className="object-cover" />;
  }
  return (
    <div className="bg-primary-9 text-primary-2 absolute inset-0 flex items-center justify-center text-[11px] tracking-[1.2px] uppercase">
      3D
    </div>
  );
}

function ExampleCard({ item, selected, onSelect }: ICardProps<'circuit' | 'mesh' | 'animation'>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex h-[168px] w-[206px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[8px] border border-[#f0f0f0] bg-white text-left',
        selected && selectedClassName
      )}
    >
      <div className="relative min-h-px w-full flex-1 overflow-hidden">
        <ExampleArt item={item} />
      </div>
      <div className="flex w-full flex-col gap-[3px] px-[11px] pt-[9px] pb-[11px]">
        <p className="text-label text-[9px] leading-[12px] uppercase">{itemTypeLabel(item)}</p>
        <p className="text-primary-9 text-[13px] leading-[16px] font-semibold">{item.title}</p>
      </div>
    </button>
  );
}

function Arrow({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="text-label flex size-[32px] cursor-pointer items-center justify-center rounded-full border border-[#f0f0f0] bg-white text-[15px] leading-[20px] transition-opacity disabled:cursor-default disabled:opacity-40"
    >
      {glyph}
    </button>
  );
}

/** "Tutorials & examples": a card per item, the one on the stage ringed; the arrows page the row. */
export function ExploreRow({
  items,
  selectedKey,
  onSelect,
}: {
  items: TStartItem[];
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEnds({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  const page = (direction: 1 | -1) =>
    scroller.current?.scrollBy({
      left: direction * scroller.current.clientWidth * 0.8,
      behavior: 'smooth',
    });

  return (
    <section className="flex w-full flex-col gap-[12px]">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-px">
          <h2 className="text-primary-9 text-[17px] leading-[22px] font-bold">
            Tutorials &amp; examples
          </h2>
          <p className="text-label text-[12px] leading-[16px]">
            Short videos and worked examples to get you moving.
          </p>
        </div>
        <div className="flex gap-[8px]">
          <Arrow label="Previous" glyph="‹" disabled={ends.start} onClick={() => page(-1)} />
          <Arrow label="Next" glyph="›" disabled={ends.end} onClick={() => page(1)} />
        </div>
      </div>
      <div
        ref={scroller}
        onScroll={measure}
        className="flex w-full gap-[12px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const selected = item.key === selectedKey;
          const select = () => onSelect(item.key);
          return item.kind === 'tutorial' ? (
            <TutorialCard key={item.key} item={item} selected={selected} onSelect={select} />
          ) : (
            <ExampleCard key={item.key} item={item} selected={selected} onSelect={select} />
          );
        })}
      </div>
    </section>
  );
}
