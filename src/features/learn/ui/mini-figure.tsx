'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { CourseFigureLive } from '@/features/learn/ui/course-preview';
import { cn } from '@/utils/css-class';

import type { LearnCourse } from '@/features/learn/catalogue';

/*
 * A course's own figure, live, as a small picture: the same widget the course card on the right
 * plays, drawn at a width it looks right at, then scaled down into a small square and cropped to
 * one part of it - the mouse brain of the three, a stretch of membrane. So it is in the same style
 * as the big one, because it is the same thing. It only watches: pointer events go to the card.
 */

/** The width the figure is laid out at before it is scaled down, px. */
const LAYOUT_W = 600;

export type Focus = {
  /** The middle of the part shown, as a share of the figure's width and height. */
  x: number;
  y: number;
  /** How much of the figure's width the square shows. */
  span: number;
};

export function MiniFigure({
  widget,
  focus,
  size,
  interactive = false,
  className,
}: {
  widget: LearnCourse['preview'];
  focus: Focus;
  size: number;
  /** Whether it can be handled as the big one can, e.g. a brain turned by dragging it. */
  interactive?: boolean;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(340);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight || 340));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size / (focus.span * LAYOUT_W);
  const tx = size / 2 - focus.x * LAYOUT_W * scale;
  const ty = size / 2 - focus.y * height * scale;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block shrink-0 overflow-hidden bg-white',
        !interactive && 'pointer-events-none',
        className
      )}
      style={{ width: size, height: size }}
    >
      <div
        ref={inner}
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: LAYOUT_W, transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
      >
        <CourseFigureLive widget={widget} />
      </div>
    </span>
  );
}
