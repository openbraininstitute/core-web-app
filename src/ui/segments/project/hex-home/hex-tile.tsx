'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { driftOf, HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { cn } from '@/utils/css-class';

import styles from './hex-cloud.module.css';

import type { CSSProperties, ReactNode } from 'react';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

// the outline in a 173.2 × 200 box, inset by half the stroke
const POINTS = '86.6,1 172.2,50.5 172.2,149.5 86.6,199 1,149.5 1,50.5';

export function Hexagon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 173.2 200" preserveAspectRatio="none" aria-hidden>
      <polygon points={POINTS} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface IHexTileProps {
  box: IHexBox;
  /** How high it stands: 0 on the floor, 1 as high as the picked ones. */
  lift?: number;
  drift?: boolean;
  /** When it rises in, after the cloud first shows. */
  appearMs?: number;
  /** Where it comes out of, as it comes in (layout px of its own frame): the tile it was opened from. */
  from?: IPoint;
  tone?: 'white' | 'floor' | 'tint' | 'navy';
  href?: string;
  onClick?: () => void;
  onHover?: (on: boolean) => void;
  title?: string;
  /** Drawn inside the hexagon, clipped to it. */
  children?: ReactNode;
  /** Drawn over the tile, unclipped: a label under it, a badge. */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Over its neighbours, as while hovered and its label shows. */
  z?: number;
  /** Drawn back into `foldTo` (layout px of its frame), as a tongue retracting into its category's tile. */
  folded?: boolean;
  foldTo?: IPoint;
  /** How long after a fold or unfold starts this tile goes. */
  foldDelayMs?: number;
  /** Moves to a new place (and size, by `scale`) smoothly rather than at once, `glideDelayMs` after the change. */
  glide?: boolean;
  glideDelayMs?: number;
  scale?: number;
}

/** One tile of a cloud: a white hexagon, its shadow growing with its lift, what it carries clipped inside it. */
export function HexTile({
  box,
  lift = 0.5,
  drift = true,
  appearMs = 0,
  from,
  tone = 'white',
  href,
  onClick,
  onHover,
  title,
  children,
  overlay,
  className,
  style,
  z,
  folded = false,
  foldTo,
  foldDelayMs = 0,
  glide = false,
  glideDelayMs = 0,
  scale,
}: IHexTileProps) {
  const w = SQRT3 * box.r;
  const h = 2 * box.r;
  const wander = driftOf(box.x, box.y, box.r);
  const interactive = !!(href || onClick);

  const body = (
    <>
      <Hexagon className={styles.base} />
      {children && (
        <div className={styles.face} style={{ clipPath: HEX_CLIP }}>
          {children}
        </div>
      )}
      <Hexagon className={styles.outline} />
      {overlay}
    </>
  );

  const tileClass = cn(
    styles.tile,
    tone === 'floor' && styles.floor,
    tone === 'tint' && styles.tint,
    tone === 'navy' && styles.navy,
    interactive && styles.interactive,
    className
  );
  const tileStyle = { '--rest-lift': lift, ...style } as CSSProperties;
  const hover = onHover
    ? { onPointerEnter: () => onHover(true), onPointerLeave: () => onHover(false) }
    : {};

  let tile: ReactNode;
  if (href) {
    tile = (
      <Link href={href} className={tileClass} style={tileStyle} title={title} {...hover}>
        {body}
      </Link>
    );
  } else if (onClick) {
    tile = (
      <button
        type="button"
        className={tileClass}
        style={tileStyle}
        title={title}
        onClick={onClick}
        {...hover}
      >
        {body}
      </button>
    );
  } else {
    tile = (
      <div className={tileClass} style={tileStyle} title={title} {...hover}>
        {body}
      </div>
    );
  }

  return (
    <div
      className={cn(styles.slot, drift && styles.drift, glide && styles.glide)}
      style={
        {
          left: box.x - w / 2,
          top: box.y - h / 2,
          width: w,
          height: h,
          '--dx': `${wander.dx}px`,
          '--dy': `${wander.dy}px`,
          '--drift-duration': `${wander.duration}s`,
          '--drift-delay': `${wander.delay}s`,
          zIndex: z,
          scale,
          '--glide-delay': `${glideDelayMs}ms`,
        } as CSSProperties
      }
    >
      <div
        className={cn(styles.appear, from && styles.burst)}
        style={
          {
            '--appear-delay': `${appearMs}ms`,
            ...(from && { '--from-x': `${from.x - box.x}px`, '--from-y': `${from.y - box.y}px` }),
          } as CSSProperties
        }
      >
        {foldTo ? (
          <div
            className={styles.fold}
            data-folded={folded}
            style={
              {
                '--to-x': `${foldTo.x - box.x}px`,
                '--to-y': `${foldTo.y - box.y}px`,
                transitionDelay: `${foldDelayMs}ms`,
              } as CSSProperties
            }
          >
            {tile}
          </div>
        ) : (
          tile
        )}
      </div>
    </div>
  );
}

/**
 * A cloud's frame: laid out at `width` × `height` layout px and scaled to its column's width, so every cloud
 * keeps its arrangement at any size.
 */
export function HexFrame({
  width,
  height,
  children,
  className,
  maxScale = 1.4,
}: {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
  maxScale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const s = Math.min(maxScale, el.clientWidth / width);
      setScale(s);
      // wider than it may grow: centred in its column
      setLeft(Math.max(0, (el.clientWidth - width * s) / 2));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, maxScale]);

  return (
    <div ref={ref} className={cn(styles.frame, className)} style={{ height: height * scale }}>
      {scale > 0 && (
        <div className={styles.stage} style={{ left, width, height, transform: `scale(${scale})` }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * A frame filling its box: laid out `width` layout px across and scaled to the box's width, as tall in layout px as
 * the box's shape makes it (at least `minHeight`, scrolling past the box then), so what is drawn from its edges sits
 * on the box's edges. `children` is given that height.
 */
export function FillFrame({
  width,
  minHeight,
  children,
}: {
  width: number;
  minHeight: number;
  children: (height: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ scale: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const scale = el.clientWidth / width;
      if (!scale) return;
      // in steps, so a small resize does not lay it all out again
      const height = Math.max(minHeight, Math.floor(el.clientHeight / scale / 20) * 20);
      setSize((was) => (was && was.scale === scale && was.height === height ? was : { scale, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, minHeight]);

  return (
    <div ref={ref} className={cn(styles.frame, 'h-full')}>
      {size && (
        <div
          className={styles.stage}
          style={{ width, height: size.height, transform: `scale(${size.scale})`, minHeight: 0 }}
        >
          {children(size.height)}
        </div>
      )}
      {size && <div style={{ height: size.height * size.scale }} aria-hidden />}
    </div>
  );
}

/** When a tile at `x` rises in: a sweep across the frame, a little out of step. */
export function sweepMs(x: number, width: number, jitterKey = 0, startMs = 0, sweepMsTotal = 900) {
  const jitter = (Math.abs(Math.sin(x * 7.13 + jitterKey * 3.7)) % 1) * 160;
  return Math.round(startMs + (x / width) * sweepMsTotal + jitter);
}

/** When a tile coming out of `from` arrives: the nearer, the sooner, a little out of step. */
export function burstMs(box: IPoint, from: IPoint, startMs = 0, msPerPx = 0.5) {
  const jitter = (Math.abs(Math.sin(box.x * 7.13 + box.y * 3.7)) % 1) * 90;
  return Math.round(startMs + Math.hypot(box.x - from.x, box.y - from.y) * msPerPx + jitter);
}
