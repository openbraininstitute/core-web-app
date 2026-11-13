'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { EXAMPLES } from '@/ui/segments/project/hex-home/content';
import { cloudFillers, HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import { burstMs, HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { cn } from '@/utils/css-class';

import styles from './hex-cloud.module.css';

import type { CSSProperties } from 'react';
import type { IExample } from '@/ui/segments/project/hex-home/content';
import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

const WIDTH = 880;
const HEIGHT = 650;
/** The layout px the cloud is drawn in, for the page to place and scale it. */
export const EXAMPLES_FRAME = { width: WIDTH, height: HEIGHT };
/** The one on show, large on the right as on the landing. */
const BIG: IHexBox = { x: 615, y: 290, r: 235 };
/** The others, raised out of the honeycomb to its left. */
const SLOTS: IHexBox[] = [
  { x: 110, y: 150, r: 64 },
  { x: 245, y: 95, r: 64 },
  { x: 195, y: 290, r: 64 },
  { x: 330, y: 250, r: 64 },
  { x: 90, y: 420, r: 64 },
  { x: 262, y: 440, r: 64 },
];
export const FLIGHT_MS = 950;

export function Picture({ example, big, playing }: { example: IExample; big?: boolean; playing?: boolean }) {
  const zoom = big ? (example.bigZoom ?? example.zoom) : example.zoom;
  const style = { '--zoom': zoom } as CSSProperties;
  const className = cn(styles.picture, example.feather && styles.feather);
  return (
    <div className="absolute inset-0 bg-white">
      <img src={example.img} alt="" className={className} style={style} draggable={false} />
      {example.video && playing && (
        <video
          className={className}
          style={style}
          src={example.video}
          poster={example.img}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
}

/** A tile in flight between a slot and the large hexagon, along a straight path, growing or shrinking on the way. */
export function Flier({
  from,
  to,
  example,
  big,
  delay = 0,
  onDone,
}: {
  from: IHexBox;
  to: IHexBox;
  example: IExample;
  big?: boolean;
  delay?: number;
  onDone?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const k = from.r / to.r;
    const animation = el.animate(
      [
        { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${k})` },
        { transform: 'none' },
      ],
      { duration: FLIGHT_MS, delay, easing: 'cubic-bezier(0.55, 0, 0.2, 1)', fill: 'both' }
    );
    animation.onfinish = () => onDone?.();
    return () => animation.cancel();
    // one flight per mount
  }, []);
  const w = SQRT3 * to.r;
  const h = 2 * to.r;
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute"
      style={{
        left: to.x - w / 2,
        top: to.y - h / 2,
        width: w,
        height: h,
        zIndex: big ? 3 : 2,
        filter: 'drop-shadow(-8px 14px 18px rgb(28 40 72 / 0.22))',
      }}
    >
      <div className="absolute inset-0" style={{ clipPath: HEX_CLIP }}>
        <Picture example={example} big={big} />
      </div>
    </div>
  );
}

function SlotTile({
  box,
  example,
  from,
  hidden,
  onPick,
}: {
  box: IHexBox;
  example: IExample;
  from: IPoint;
  hidden: boolean;
  onPick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <HexTile
      box={box}
      lift={0.7}
      onClick={onPick}
      onHover={setHover}
      title={example.label}
      from={from}
      appearMs={burstMs(box, from, 250)}
      overlay={
        <span
          className={cn(
            styles.label,
            'text-primary-9 top-[calc(100%+8px)] rounded-full bg-white/95 px-[10px] py-[3px] text-[12px] font-semibold shadow-sm transition-opacity duration-200',
            hover && !hidden ? 'opacity-100' : 'opacity-0'
          )}
        >
          {example.label}
        </span>
      }
    >
      {!hidden && <Picture example={example} playing={hover} />}
    </HexTile>
  );
}

/**
 * The landing's examples as a cloud: the one on show large on the right, playing; the others raised out of a white
 * honeycomb beside it. A pick flies to the large hexagon as the one there flies back to the pick's place. All of it
 * comes out of `from`, the tile it was opened from (layout px of its frame).
 */
export function ExamplesCloud({ from }: { from: IPoint }) {
  // order[0] is on show; order[i + 1] sits in SLOTS[i]
  const [order, setOrder] = useState(() => EXAMPLES.map((_, i) => i).slice(0, SLOTS.length + 1));
  const [flight, setFlight] = useState<{ slot: number; id: number } | null>(null);

  const fillers = useMemo(
    () =>
      cloudFillers({
        seed: 7,
        width: WIDTH,
        height: HEIGHT,
        R: 34,
        centre: { x: 430, y: 300 },
        reach: { x: 480, y: 340 },
        avoid: [BIG, ...SLOTS],
        gap: 7,
        density: 0.8,
        strays: 12,
      }),
    []
  );

  const shown = EXAMPLES[order[0]];
  const pick = (slot: number) => {
    if (flight) return;
    setFlight({ slot, id: Date.now() });
  };
  const land = () => {
    if (!flight) return;
    setOrder((o) => {
      const next = [...o];
      [next[0], next[flight.slot + 1]] = [next[flight.slot + 1], next[0]];
      return next;
    });
    setFlight(null);
  };

  return (
    <>
      {fillers.map((f) => (
        <HexTile
          key={f.key}
          box={f}
          lift={f.lift}
          drift={f.drift}
          tone={f.lift < 0.2 ? 'floor' : 'white'}
          from={from}
          appearMs={burstMs(f, from)}
        />
      ))}

      <HexTile box={BIG} lift={0.9} from={from} appearMs={burstMs(BIG, from, 100)}>
        {!flight && (
          <div key={shown.key} className={cn(styles.fadeIn, 'absolute inset-0')}>
            <Picture example={shown} big playing />
          </div>
        )}
      </HexTile>

      {SLOTS.map((box, i) => (
        <SlotTile
          key={box.x}
          box={box}
          from={from}
          example={EXAMPLES[order[i + 1]]}
          hidden={flight?.slot === i}
          onPick={() => pick(i)}
        />
      ))}

      {flight && (
        <>
          <Flier
            key={`in-${flight.id}`}
            from={SLOTS[flight.slot]}
            to={BIG}
            big
            example={EXAMPLES[order[flight.slot + 1]]}
            onDone={land}
          />
          <Flier
            key={`out-${flight.id}`}
            from={BIG}
            to={SLOTS[flight.slot]}
            delay={120}
            example={EXAMPLES[order[0]]}
          />
        </>
      )}

      <div
        className={cn(styles.fadeIn, 'absolute flex flex-col items-center text-center')}
        style={{ left: BIG.x - 260, width: 520, top: BIG.y + BIG.r + 22, animationDelay: '700ms' }}
      >
        <span
          key={flight ? 'flying' : shown.key}
          className={cn(
            'text-primary-9 text-[30px] leading-[36px] font-light transition-opacity duration-300',
            flight ? 'opacity-0' : 'opacity-100'
          )}
        >
          {shown.label}
        </span>
        <span
          className={cn(
            'mt-[6px] text-[14px] leading-[19px] text-neutral-500 transition-opacity duration-300',
            flight ? 'opacity-0' : 'opacity-100'
          )}
        >
          {shown.blurb}
        </span>
      </div>
    </>
  );
}
