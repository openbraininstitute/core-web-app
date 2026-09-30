import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/utils/css-class';

import { gizmoTips, TIPS } from '../engine/gizmo';

import type { Viewer } from '../engine/viewer';

const AXES = [
  { name: 'X', color: '#f03c2e', shade: '#4a0d08', ink: '#fff' },
  { name: 'Y', color: '#74e04c', shade: '#173f0b', ink: '#000' },
  { name: 'Z', color: '#2446ff', shade: '#0a1458', ink: '#fff' },
];

/** How far from the gizmo's centre a tip seen side on is, in CSS pixels. */
const REACH = 30;

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
          const button = buttons.current[tip.index];
          if (!button) return;
          button.style.transform = `translate(${tip.x * REACH}px, ${-tip.y * REACH}px) scale(${1 / (1 - 0.35 * tip.depth)})`;
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
      {TIPS.map(({ axis, sign }, index) => {
        const { name, color, shade, ink } = AXES[axis];
        const label = `View from ${sign > 0 ? '+' : '−'}${name}`;
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            ref={(button) => {
              buttons.current[index] = button;
            }}
            onClick={() => viewer.viewAlong(axis, sign)}
            style={
              sign > 0
                ? { background: color, color: ink }
                : { background: shade, borderColor: color }
            }
            className={cn(
              'pointer-events-auto absolute inset-0 m-auto flex size-[18px] items-center justify-center rounded-full',
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
