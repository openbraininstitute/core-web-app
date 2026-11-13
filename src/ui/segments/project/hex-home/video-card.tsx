'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

import styles from './hex-cloud.module.css';

import type { CSSProperties, ReactNode } from 'react';
import type { IExampleVideo } from '@/ui/segments/project/hex-home/content';
import type { IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

const durations = new Map<string, number>();

/** "mm:ss" for a duration in seconds. */
function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/** How long the video at `url` lasts, read from its metadata once per page; null until known (or with no url). */
function useVideoDuration(url: string | undefined): number | null {
  const [duration, setDuration] = useState<number | null>(() => (url ? (durations.get(url) ?? null) : null));
  useEffect(() => {
    if (!url) return;
    const known = durations.get(url);
    if (known !== undefined) {
      setDuration(known);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration)) return;
      durations.set(url, video.duration);
      setDuration(video.duration);
    };
    video.src = url;
    return () => {
      video.onloadedmetadata = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [url]);
  return duration;
}

/**
 * A video as the Figma's "Getting started" cards draw one (AI-Trial 306:1752, as the old start page had it): its
 * poster under a navy veil, what it is by a blue dot at the top, its title and length at the foot; playing in place
 * while hovered. `small` for half a phone's width (two to a row there).
 */
export function VideoCard({
  video,
  selected,
  onPick,
  delayMs,
  small = false,
}: {
  video: IExampleVideo;
  selected: boolean;
  onPick: () => void;
  delayMs: number;
  small?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const duration = useVideoDuration(video.video);

  const body: ReactNode = (
    <>
      <img src={video.poster} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      {video.video && hover && (
        <video
          className="absolute inset-0 size-full object-cover"
          src={video.video}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      <div
        className={cn(
          // a deeper navy than the Figma's (0.86 to 0.42), as the user asked
          'absolute inset-0 bg-linear-to-b from-[rgba(0,39,102,0.94)] to-[rgba(0,39,102,0.72)] transition-opacity duration-300',
          hover && 'opacity-80'
        )}
      />
      <div className="relative flex items-center gap-[5px]">
        <img src="/images/vlab-home/card-dot.svg" alt="" width={5} height={5} />
        <p className="text-primary-2 text-[9.5px] leading-[12px]">{video.kind}</p>
      </div>
      <div className="relative flex flex-col gap-[6px]">
        <p
          className={cn(
            'font-semibold text-white',
            small ? 'line-clamp-3 text-[12.5px] leading-[15px]' : 'text-[15px] leading-[19px]'
          )}
        >
          {video.title}
        </p>
        <p className="text-primary-2 text-[11px] leading-[14px]">
          {duration ? formatDuration(duration) : ' '}
        </p>
      </div>
      {selected && (
        <span className="ring-primary-4 pointer-events-none absolute inset-0 rounded-[8px] ring-2 ring-inset" />
      )}
    </>
  );
  const face = cn(
    styles.cardFace,
    'relative flex aspect-[246/168] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[8px] text-left',
    small ? 'p-[9px]' : 'p-[12px]'
  );
  return (
    <div
      className={styles.cardIn}
      style={{ animationDelay: `${delayMs}ms` }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {video.href ? (
        <Link href={video.href} className={face} title={video.title}>
          {body}
        </Link>
      ) : (
        <button type="button" aria-pressed={selected} onClick={onPick} className={face} title={video.title}>
          {body}
        </button>
      )}
    </div>
  );
}

/**
 * The videos as a column one card wide beside the categories, scrolling when they run past it; drawn out of their
 * category (`from`, in the frame's layout px) and back into it.
 */
export function VideoColumn({
  videos,
  at,
  from,
  open,
  selected,
  onPick,
  onHover,
}: {
  videos: IExampleVideo[];
  at: { x: number; y: number; w: number; h: number };
  from: IPoint;
  open: boolean;
  selected: number | null;
  onPick: (i: number) => void;
  onHover: (on: boolean) => void;
}) {
  return (
    <div
      className={cn(styles.column, 'secondary-scrollbar')}
      data-open={open}
      style={
        {
          left: at.x,
          top: at.y,
          width: at.w,
          height: at.h,
          transformOrigin: `${from.x - at.x}px ${from.y - at.y}px`,
        } as CSSProperties
      }
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <div className="grid grid-cols-1 gap-[12px] p-[8px]">
        {open &&
          videos.map((video, i) => (
            <VideoCard
              key={video.key}
              video={video}
              selected={selected === i}
              onPick={() => onPick(i)}
              delayMs={60 + Math.min(i, 8) * 35}
            />
          ))}
      </div>
    </div>
  );
}
