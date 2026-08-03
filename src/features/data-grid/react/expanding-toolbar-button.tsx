'use client';

import { cn } from '@/utils/css-class';

import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface IExpandingToolbarButtonProps extends ComponentPropsWithRef<'button'> {
  /** the icon shown at rest (the button is a 40px circle around it) */
  icon: ReactNode;
  /** sentence-case name — the accessible name AND the text revealed on hover/focus */
  label: string;
  /**
   * Optional count overlay (e.g. the number of active filters). At rest it sits on
   * the ICON; while the pill is open it rides out to the pill's top-right corner.
   * Positioned by the consumer against a 20px-tall, zero-width anchor — the same
   * geometry the icon box used to give it — so `-right-2 -top-1.5` still lands where
   * it always did.
   */
  badge?: ReactNode;
}

/**
 * THE toolbar pill used by every icon-only grid control (column chooser, filters).
 *
 * At rest it is exactly the 40px circle the toolbar has always shown; on hover and
 * on `:focus-visible` it grows to `icon + label`. The growth animates
 * `grid-template-columns` (`0fr → 1fr`) on a wrapper whose child clips its overflow
 * — `display` cannot be animated, and an explicit width would have to be guessed per
 * label. `prefers-reduced-motion` drops the transition: the label still appears, it
 * just no longer slides.
 *
 * The accessible name is the `aria-label`, present in BOTH states; the revealed text
 * is `aria-hidden` so a screen reader never hears the name twice and the name never
 * depends on hover.
 *
 * THE BADGE TRAVELS. Its horizontal journey costs nothing: the badge anchor is a
 * ZERO-WIDTH flex item sitting after the label, so it is carried by the very same
 * `grid-template-columns` growth — one animation, never two racing each other, and no
 * layout the anchor itself has to do. Only the constant offset onto the corner (10px
 * out, 10px up) is a `translate`, which makes it label-length-independent and keeps
 * the whole trip on the compositor. Matching `duration-300 ease-in-out` locks it to
 * the reveal; a CSS transition reverses from wherever it currently is, so pulling the
 * pointer away mid-flight glides back instead of snapping or queueing. The anchor is
 * `pointer-events-none`, so the badge can never swallow a click or flicker the hover.
 */
export function ExpandingToolbarButton({
  icon,
  label,
  badge,
  className,
  ...rest
}: IExpandingToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'group/toolbar-pill relative flex h-10 shrink-0 items-center rounded-full bg-white px-2.5',
        'text-primary-8 shadow-sm outline-none hover:pr-3.5 hover:bg-gray-100',
        // never animate `width` off a content-driven layout: only paint properties here
        'transition-[box-shadow,background-color] duration-300 ease-in-out hover:shadow-md active:scale-95',
        'focus-visible:ring-2 focus-visible:ring-primary-8/30',
        'motion-reduce:transition-none motion-reduce:active:scale-100',
        className
      )}
    >
      <span className="relative flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <span
        aria-hidden
        className={cn(
          'grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-in-out',
          'group-hover/toolbar-pill:grid-cols-[1fr] group-focus-visible/toolbar-pill:grid-cols-[1fr]',
          'motion-reduce:transition-none'
        )}
      >
        <span className="overflow-hidden">
          <span className="block whitespace-nowrap pl-1.5 text-[13px] font-medium">{label}</span>
        </span>
      </span>
      {badge ? (
        <span
          data-testid="toolbar-pill-badge-anchor"
          className={cn(
            // zero-width: it is a bookmark at the end of the content, not a box in it,
            // so nothing in the pill or the toolbar shifts when the badge moves
            'pointer-events-none relative z-10 h-5 w-0 shrink-0',
            'transition-transform duration-300 ease-in-out',
            'group-hover/toolbar-pill:translate-x-2.5 group-hover/toolbar-pill:-translate-y-2.5',
            'group-focus-visible/toolbar-pill:translate-x-2.5',
            'group-focus-visible/toolbar-pill:-translate-y-2.5',
            // reduced motion: same destination, no journey
            'motion-reduce:transition-none',
            // the badge overlaps the pill's edge at the corner — a white halo keeps it
            // readable against both the pill and whatever the page puts behind it
            '[&>*]:ring-2 [&>*]:ring-white'
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
