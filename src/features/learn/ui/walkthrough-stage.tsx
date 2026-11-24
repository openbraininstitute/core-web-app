'use client';

import { RiCursorFill } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';
import type { IWalkthrough } from '@/features/learn/walkthroughs';

const pct = (value: number, of: number) => `${(100 * value) / of}%`;

/** Every click of a walkthrough in order, with the screenshot it is on and its step. */
export function walkthroughClicks(walkthrough: IWalkthrough) {
  return walkthrough.steps.flatMap((step, s) =>
    step.clicks.map((click, c) => ({ ...click, image: click.image ?? step.image, s, c }))
  );
}

/**
 * A walkthrough's screenshot, dimmed but for the place to click next, which a pointer moves to; a
 * click there goes on.
 */
export function WalkthroughStage({
  walkthrough,
  at,
  onNext,
  small = false,
  className,
  style,
}: {
  walkthrough: IWalkthrough;
  at: number;
  onNext: () => void;
  /** Drawn small: a thinner ring and a smaller pointer. */
  small?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const clicks = walkthroughClicks(walkthrough);
  const now = clicks[at];
  const { box } = now;
  const { shot } = walkthrough;
  const radius = now.radius === undefined ? '999px' : `${now.radius}px`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[14px] border border-[#e8e8e8] bg-[#f5f5f5]',
        className
      )}
      style={{ aspectRatio: `${shot.w} / ${shot.h}`, ...style }}
    >
      {[...new Set(clicks.map((click) => click.image))].map((image) => (
        // biome-ignore lint/performance/noImgElement: static screenshots, all there to fade between
        <img
          key={image}
          src={image}
          alt={image === now.image ? `${walkthrough.steps[now.s].title}: ${now.text}` : ''}
          draggable={false}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-300',
            image === now.image ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}
      <button
        type="button"
        data-testid="learn-walkthrough-spot"
        aria-label={now.text}
        onClick={onNext}
        className={cn(
          'absolute shadow-[0_0_0_200vmax_rgb(0_16_38/0.38)] ring-[#52c41a] transition-[left,top,width,height] duration-500 ease-out motion-reduce:transition-none',
          small ? 'ring-2' : 'ring-[3px]',
          at === clicks.length - 1 ? 'cursor-default' : 'cursor-pointer'
        )}
        style={{
          left: pct(box.x, shot.w),
          top: pct(box.y, shot.h),
          width: pct(box.w, shot.w),
          height: pct(box.h, shot.h),
          borderRadius: radius,
        }}
      >
        <span
          key={at}
          className={cn(
            'absolute inset-0 animate-ping border-[#52c41a] [animation-duration:1.6s] motion-reduce:hidden',
            small ? 'border-2' : 'border-[3px]'
          )}
          style={{ borderRadius: radius }}
        />
      </button>
      <RiCursorFill
        aria-hidden
        className={cn(
          'pointer-events-none absolute text-[#002766] drop-shadow-[0_1px_2px_rgb(255_255_255/0.9)] transition-[left,top] delay-100 duration-700 ease-out motion-reduce:transition-none',
          small ? 'size-[18px]' : 'size-[28px]'
        )}
        style={{
          left: pct(box.x + box.w / 2, shot.w),
          top: pct(box.y + box.h * 0.62, shot.h),
        }}
      />
    </div>
  );
}
