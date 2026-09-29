import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/utils/css-class';

import { type Axis, gizmoTips, type Sign } from '../engine/gizmo';

import type { Viewer } from '../engine/viewer';

const AXES = [
  { name: 'X', color: '#f03c2e', shade: '#4a0d08', ink: '#fff' },
  { name: 'Y', color: '#74e04c', shade: '#173f0b', ink: '#000' },
  { name: 'Z', color: '#2446ff', shade: '#0a1458', ink: '#fff' },
];

const TIPS = ([1, -1] as const).flatMap((sign) =>
  ([0, 1, 2] as const).map((axis) => ({ axis, sign }))
);

/** Half the gizmo's width, how far from its centre a tip seen side on is, and that tip's radius, in CSS pixels. */
const HALF = 48;
const REACH = 30;
const RADIUS = 9;

const tipIndex = (axis: Axis, sign: Sign) => (sign > 0 ? axis : axis + 3);

/**
 * The morphology's axes as the camera sees them, in the bottom-right corner: X, Y and Z labelled, their opposites
 * ringed, the nearer tips larger. A click on a tip views the cell from it.
 */
export function AxesGizmo({ viewer }: { viewer: Viewer }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(
    () =>
      viewer.onViewChange((orientation) => {
        gizmoTips(orientation).forEach((tip, order) => {
          const button = buttons.current[tipIndex(tip.axis, tip.sign)];
          if (!button) return;
          const x = HALF + tip.x * REACH - RADIUS;
          const y = HALF - tip.y * REACH - RADIUS;
          button.style.transform = `translate(${x}px, ${y}px) scale(${1 / (1 - 0.35 * tip.depth)})`;
          button.style.zIndex = String(order);
        });
      }),
    [viewer]
  );

  return (
    <div
      className="pointer-events-none absolute right-3 bottom-3 size-[96px]"
      data-testid="axes-gizmo"
    >
      {TIPS.map(({ axis, sign }) => {
        const { name, color, shade, ink } = AXES[axis];
        const label = `View from ${sign > 0 ? '+' : '−'}${name}`;
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            ref={(button) => {
              buttons.current[tipIndex(axis, sign)] = button;
            }}
            onClick={() => viewer.viewAlong(axis, sign)}
            style={
              sign > 0
                ? { background: color, color: ink }
                : { background: shade, borderColor: color }
            }
            className={cn(
              'pointer-events-auto absolute top-0 left-0 flex size-[18px] items-center justify-center rounded-full',
              'text-[11px] leading-none font-bold select-none hover:brightness-125 focus-visible:outline-none',
              'hover:ring-2 hover:ring-white/80 focus-visible:ring-2 focus-visible:ring-white/80',
              sign < 0 && 'border-2'
            )}
          >
            {sign > 0 && name}
          </button>
        );
      })}
    </div>
  );
}
