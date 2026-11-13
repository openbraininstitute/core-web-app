'use client';

import { useEffect, useRef } from 'react';

import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { Hexagon } from '@/ui/segments/project/hex-home/hex-tile';
import { cn } from '@/utils/css-class';

import styles from './hex-cloud.module.css';

import type { CSSProperties, RefObject } from 'react';
import type { IExample } from '@/ui/segments/project/hex-home/content';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

/** The landing's flight: 1100 ms on its ease, a tile there and back along a straight path. */
export const MELT_MS = 1100;
const turnEase = (f: number) => (f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2);
const smooth = (t: number, a: number, b: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/**
 * Every copy of a loop on the page keeps to one clock, the page's time round its length (as the landing's do), so
 * a tile's, the one flying and the one on show pick up where each other left off.
 */
function useClock(ref: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const keep = () => {
      if (!v.duration) return;
      const want = (performance.now() / 1000) % v.duration;
      const off = Math.abs(v.currentTime - want);
      if (off > 0.2 && off < v.duration - 0.2) v.currentTime = want;
    };
    v.addEventListener('loadedmetadata', keep);
    v.addEventListener('playing', keep);
    keep();
    return () => {
      v.removeEventListener('loadedmetadata', keep);
      v.removeEventListener('playing', keep);
    };
  }, [ref]);
}

function Loop({ example, className, style }: { example: IExample; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useClock(ref);
  return (
    <>
      <img src={example.img} alt="" className={className} style={style} draggable={false} />
      {example.video && (
        <video
          ref={ref}
          className={className}
          style={style}
          src={example.video}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </>
  );
}

/** An example inside a hexagon, its loop playing: `zoom` times the tile's width, on white. */
export function TileMedia({ example, big }: { example: IExample; big?: boolean }) {
  const zoom = big ? (example.bigZoom ?? example.zoom) : example.zoom;
  return (
    <div className="absolute inset-0 bg-white">
      <Loop
        example={example}
        className={cn(styles.picture, example.feather && styles.feather)}
        style={{ '--zoom': zoom } as CSSProperties}
      />
    </div>
  );
}

/** An example out of its tile, as the landing's chosen one beside the field: its white taken out against the page. */
export function FreeMedia({ example, width }: { example: IExample; width: number }) {
  return (
    <div
      className={cn(styles.free, example.feather && styles.feather)}
      style={{ width, height: width / example.aspect }}
    >
      <Loop example={example} />
    </div>
  );
}

/**
 * An example on its way between its tile and its place on show, as on the landing: moving in a straight line and
 * growing, its tile melting away from round it as it goes, so that the example is left there on its own; `back`
 * runs it the other way. The tile is drawn as the field's are, white, outlined and raised, and it keeps its body
 * until near the end, so it is seen to grow into the big one as the landing's cube is (the user asked); the picture in
 * it hands over to the free one on the landing's timing.
 */
export function MeltFlier({
  tile,
  to,
  example,
  width,
  heroR,
  hexAt,
  back = false,
  onDone,
}: {
  tile: IHexBox;
  to: IPoint;
  example: IExample;
  /** Its width on show. */
  width: number;
  /** The tile's size at the end, were it to stay: it is gone by then. */
  heroR: number;
  /** Where the tile ends up, when not round the example on show (a frame it grows into). */
  hexAt?: IPoint;
  back?: boolean;
  onDone?: () => void;
}) {
  const mover = useRef<HTMLDivElement>(null);
  const hex = useRef<HTMLDivElement>(null);
  const pic = useRef<HTMLDivElement>(null);
  const free = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [m, h, p, f] = [mover.current, hex.current, pic.current, free.current];
    if (!m || !h || !p || !f) return;
    const N = 24;
    const frames = Array.from({ length: N + 1 }, (_, i) => {
      const e = turnEase(i / N);
      const r = tile.r * (heroR / tile.r) ** e;
      const inTile = SQRT3 * r * example.zoom;
      const w = inTile * (width / (SQRT3 * heroR * example.zoom)) ** e;
      const shown = smooth(e, 0.15, 0.85);
      return {
        move: { transform: `translate(${tile.x + (to.x - tile.x) * e}px, ${tile.y + (to.y - tile.y) * e}px)` },
        hex: {
          transform: `translate(${((hexAt?.x ?? to.x) - to.x) * e}px, ${((hexAt?.y ?? to.y) - to.y) * e}px) scale(${r / heroR})`,
          opacity: 1 - smooth(e, 0.5, 0.98),
        },
        pic: { opacity: 1 - shown },
        free: { transform: `scale(${w / width})`, opacity: shown },
      };
    });
    const timing: KeyframeAnimationOptions = {
      duration: MELT_MS,
      easing: 'linear',
      fill: 'both',
      direction: back ? 'reverse' : 'normal',
    };
    const runs = [
      m.animate(
        frames.map((k) => k.move),
        timing
      ),
      h.animate(
        frames.map((k) => k.hex),
        timing
      ),
      p.animate(
        frames.map((k) => k.pic),
        timing
      ),
      f.animate(
        frames.map((k) => k.free),
        timing
      ),
    ];
    runs[0].onfinish = () => onDone?.();
    return () => runs.forEach((run) => run.cancel());
    // one flight per mount
  }, []);

  const hw = SQRT3 * heroR;
  const height = width / example.aspect;
  return (
    <div ref={mover} className="pointer-events-none absolute top-0 left-0" style={{ zIndex: 6 }}>
      <div
        ref={hex}
        className="absolute"
        style={{
          left: -hw / 2,
          top: -heroR,
          width: hw,
          height: 2 * heroR,
          filter: 'drop-shadow(-10px 18px 22px rgb(28 40 72 / 0.26))',
        }}
      >
        <Hexagon className={styles.base} />
        <div ref={pic} className="absolute inset-0" style={{ clipPath: HEX_CLIP }}>
          <TileMedia example={example} />
        </div>
        <Hexagon className={styles.outline} />
      </div>
      <div ref={free} className="absolute" style={{ left: -width / 2, top: -height / 2 }}>
        <FreeMedia example={example} width={width} />
      </div>
    </div>
  );
}

/** The landing's bubble with what the one on show is, floating beside it. */
export function HeroCaption({ example, at }: { example: IExample; at: IPoint }) {
  return (
    <p key={example.key} className={styles.bubble} style={{ left: at.x, top: at.y }}>
      {example.caption ? (
        <>
          <strong>{example.caption.kicker}</strong>
          {example.caption.text}
        </>
      ) : (
        example.label
      )}
    </p>
  );
}
