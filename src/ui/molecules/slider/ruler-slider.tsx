'use client';
// beui.dev/components/motion/range-slider

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from 'motion/react';
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/utils/css-class';

import { TOUCH_GESTURE_CLASS } from './touch';
import { type SliderOptions, snapSliderValue, useSlider } from './use-slider';

// Settle spring for the snap after a flick — quick, no overshoot past the tick.
const SPRING_SNAP = { type: 'spring', stiffness: 500, damping: 40, mass: 0.6 } as const;

/** How long the readout stays after the value settles, in `showValue: "active"`. */
const VALUE_LINGER_MS = 900;

export interface RulerSliderProps extends SliderOptions {
  /** Pixels between two steps. */
  gap?: number;
  /** Label every Nth step; those ticks are drawn tall. */
  majorEvery?: number;
  /** Unit shown next to the value. */
  unit?: string;
  /**
   * Which way the scale runs. Vertical reads bottom-to-top, so more is up, and puts the
   * ticks and their labels to the right of the needle.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Print a tick's label. Defaults to the value itself. */
  formatTick?: (value: number) => string;
  /** Print the readout. Defaults to the value at the step's own precision. */
  formatValue?: (value: number) => string;
  /**
   * When the readout is shown. `active` fades it in while the value is moving and out once
   * it settles, for a ruler that sits over something worth seeing.
   */
  showValue?: 'always' | 'active';
  /** Size the ruler's window; a vertical ruler needs a height from its host. */
  style?: CSSProperties;
  className?: string;
}

/**
 * Ruler slider: the scale scrolls under a fixed needle instead of a handle
 * moving along a track. Flicks carry momentum and settle onto the nearest tick.
 */
export function RulerSlider({
  gap = 14,
  majorEvery = 5,
  unit,
  orientation = 'horizontal',
  formatTick,
  formatValue,
  showValue = 'always',
  style,
  className,
  ...options
}: RulerSliderProps) {
  const vertical = orientation === 'vertical';
  const reduce = useReducedMotion();
  // Decimal places the step implies, so 0.5 reads "72.5" and 1 reads "72".
  // Fixed width keeps the readout from jittering as the value rolls; tick
  // labels stay trimmed so a whole-number scale is not littered with ".0".
  // ponytail: reads 0 decimals for an exponential step (1e-7) — no such scale
  // is legible on a ruler anyway, so no parsing beyond this.
  const decimals = String(options.step ?? 1).split('.')[1]?.length ?? 0;
  const readout = (value: number) => value.toFixed(decimals);

  const { current, min, max, step, commit, sliderProps } = useSlider({
    ...options,
    // "72.5 kg" beats a bare "72.5" for a screen reader — but a caller who
    // formats the announcement itself outranks the unit.
    formatValueText: options.formatValueText ?? (unit ? (v) => `${readout(v)} ${unit}` : undefined),
  });

  // The range need not divide by the step (0–10 by 4). Full ticks stop at the
  // last whole one and max gets a tick of its own, so the scale never runs past
  // the value the slider can actually report.
  const span = Number(((max - min) / step).toFixed(6));
  const wholeSteps = Math.floor(span);
  const remainder = span - wholeSteps;
  const maxOffset = span * gap;
  // Vertical reads bottom-to-top, so more is up: its offsets run the other way, and the
  // strip travels from -maxOffset (at min) to 0 (at max) rather than the reverse.
  const travelOf = useCallback(
    (value: number) => {
      const offset = ((value - min) / step) * gap;
      return vertical ? offset - maxOffset : -offset;
    },
    [min, step, gap, maxOffset, vertical]
  );
  const valueAt = (travel: number) =>
    vertical ? min + ((travel + maxOffset) / gap) * step : min + (-travel / gap) * step;
  const tickTop = (offset: number) => (vertical ? maxOffset - offset : offset);

  const x = useMotionValue(travelOf(current));
  // While the pointer drives the strip (or its momentum still runs), x owns the
  // value; outside of that the value owns x.
  const interacting = useRef(false);
  // True only while the pointer is down. It keeps a cancelled momentum's
  // transition end from snapping underneath a fresh grab.
  const holding = useRef(false);
  // A new gesture or key press bumps this, so a snap that resolves late cannot
  // clear interacting underneath an active drag.
  const gesture = useRef(0);

  // ponytail: every tick is in the DOM — fine to a few hundred (80 units at
  // step 0.5 is 161). Window to the visible span if a finer step is ever needed.
  // Each tick carries an offset because max sits `remainder` of a step past the
  // last whole tick. Whenever remainder is under 0.5 that point falls inside
  // the previous box, so an appended flex box can never centre on it.
  const [valueVisible, setValueVisible] = useState(showValue === 'always');
  useEffect(() => {
    if (showValue === 'always') return;

    setValueVisible(true);
    const id = setTimeout(() => setValueVisible(false), VALUE_LINGER_MS);
    return () => clearTimeout(id);
  }, [current, showValue]);

  const ticks = Array.from({ length: wholeSteps + 1 }, (_, i) => ({
    // toFixed trims float dust from fractional steps (0.1 + 0.2 …).
    value: Number((min + i * step).toFixed(6)),
    major: i % majorEvery === 0,
    offset: i * gap,
  }));
  // A tiny remainder puts this label close to the one before it. That is what
  // a scale ending a hair past a step looks like.
  if (remainder > 0) ticks.push({ value: max, major: true, offset: maxOffset });

  const snapToTick = () => {
    // The same nearest-tick rule useSlider applies. max counts as a candidate
    // when the step does not divide the range, so a flick near the end does
    // not settle on the last whole step.
    const target = snapSliderValue(valueAt(x.get()), min, max, step);
    const snapped = travelOf(target);
    const id = ++gesture.current;
    if (reduce) {
      x.set(snapped);
      interacting.current = false;
      return;
    }
    animate(x, snapped, SPRING_SNAP).then(() => {
      if (gesture.current === id) interacting.current = false;
    });
  };

  // A key press takes the scale back from momentum: without this the coasting
  // strip keeps committing its own value and swallows the keyboard input.
  const rootProps = {
    ...sliderProps,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      x.stop();
      gesture.current++;
      interacting.current = false;
      holding.current = false;
      sliderProps.onKeyDown(event);
    },
  };

  useEffect(() => {
    if (interacting.current) return;
    x.set(travelOf(current));
  }, [current, travelOf, x]);

  useMotionValueEvent(x, 'change', (v) => {
    if (!interacting.current) return;
    commit(valueAt(v));
  });

  return (
    <div
      {...rootProps}
      id="ruler-slider"
      aria-label="Ruler slider"
      style={style}
      className={cn(
        'relative touch-none overflow-hidden',
        vertical ? 'h-full' : 'w-full',
        TOUCH_GESTURE_CLASS,
        options.disabled ? 'pointer-events-none opacity-50' : 'cursor-grab active:cursor-grabbing',
        'rounded-2xl outline-none ring-current/30 focus-visible:ring-2',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none flex items-baseline gap-1 transition-opacity duration-200',
          valueVisible ? 'opacity-100' : 'opacity-0',
          vertical
            ? 'absolute left-14 top-1/2 z-10 -translate-y-1/2 justify-start'
            : 'justify-center pt-1 pb-3'
        )}
      >
        <span className={cn('font-semibold tabular-nums', vertical ? 'text-xs' : 'text-3xl')}>
          {formatValue ? formatValue(current) : readout(current)}
        </span>
        {unit ? (
          <span className={cn('opacity-60', vertical ? 'text-[10px]' : 'text-sm')}>{unit}</span>
        ) : null}
      </div>

      {/* masked, not overlaid with background-coloured gradients — the fade has
          to work on any surface the slider is dropped onto */}
      <div
        className={cn(
          'relative',
          vertical
            ? 'h-full w-full mask-[linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]'
            : 'h-12 mask-[linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]'
        )}
      >
        {/* strip — dragged directly, so momentum comes from the drag gesture */}
        <motion.div
          drag={options.disabled ? false : vertical ? 'y' : 'x'}
          dragConstraints={
            vertical ? { top: -maxOffset, bottom: 0 } : { left: -maxOffset, right: 0 }
          }
          dragElastic={0.03}
          dragMomentum={!reduce}
          dragTransition={{ power: 0.22, timeConstant: 320 }}
          onDragStart={() => {
            gesture.current++;
            interacting.current = true;
            holding.current = true;
          }}
          // Momentum end when there is momentum, drag end when there is not.
          onDragTransitionEnd={() => {
            if (!holding.current) snapToTick();
          }}
          onDragEnd={() => {
            holding.current = false;
            if (reduce) snapToTick();
          }}
          // The ticks are positioned rather than laid out, so the row needs an
          // explicit width plus half a gap of slop each side to cover the
          // whole drag surface.
          style={
            vertical
              ? { y: x, marginTop: -gap / 2, height: maxOffset + gap }
              : { x, marginLeft: -gap / 2, width: maxOffset + gap }
          }
          className={vertical ? 'absolute inset-x-0 top-1/2' : 'absolute inset-y-0 left-1/2'}
        >
          {ticks.map((tick) => (
            // pb reserves the label row, so minor ticks need no spacer node
            <span
              key={tick.value}
              className={cn(
                'absolute flex',
                vertical
                  ? 'left-8.5 -translate-y-1/2 flex-row items-center'
                  : 'bottom-0 -translate-x-1/2 flex-col items-center pb-4.5'
              )}
              style={
                vertical ? { top: tickTop(tick.offset) + gap / 2 } : { left: tick.offset + gap / 2 }
              }
            >
              <span
                className={cn(
                  'rounded-full',
                  // minor ticks at /45 clear the 3:1 non-text floor in both themes
                  // `currentColor` rather than a design-system token: the host sets the
                  // colour, so the ruler reads on a light canvas and a dark one alike.
                  'bg-current',
                  tick.major
                    ? cn(vertical ? 'h-px w-3' : 'w-px h-7', 'opacity-70')
                    : cn(vertical ? 'h-px w-1.5' : 'w-px h-3.5', 'opacity-45')
                )}
              />
              {tick.major ? (
                <span
                  className={cn(
                    'absolute text-[10px] tabular-nums opacity-60',
                    vertical ? 'right-full mr-1.5 whitespace-nowrap' : 'bottom-0'
                  )}
                >
                  {formatTick ? formatTick(tick.value) : tick.value}
                </span>
              ) : null}
            </span>
          ))}
        </motion.div>

        {/* needle — the read head the scale moves under */}
        <div
          className={cn(
            'pointer-events-none absolute z-10',
            vertical ? 'left-7.5 top-1/2 -translate-y-1/2' : 'bottom-5 left-1/2 -translate-x-1/2'
          )}
        >
          <span
            className={cn(
              'block rounded-full bg-current',
              vertical ? 'h-0.75 w-5' : 'h-9 w-0.75'
            )}
          />
        </div>
      </div>
    </div>
  );
}
