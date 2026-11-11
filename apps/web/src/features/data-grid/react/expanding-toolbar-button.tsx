'use client';

import { kebabCase } from 'es-toolkit/compat';

import { cn } from '@/utils/css-class';

import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface IExpandingToolbarButtonProps extends ComponentPropsWithRef<'button'> {
  /** the icon shown at rest (the button is a 40px circle around it) */
  icon: ReactNode;
  /** sentence-case name — the accessible name AND the text revealed on hover/focus */
  label: string;
  /** Optional count overlay, pinned to the button's top-right border. */
  badge?: ReactNode;
}

/** Structure only — geometry, the group name the reveal hangs off, paint transitions. */
export const EXPANDING_PILL_BASE_CLASS = cn(
  // Collapsed is a circle: 10px + a 20px icon + 10px = 40px, exactly `h-10`. `gap-0` and
  // the explicit `has-[>svg]` padding override `ui/molecules/button`'s cva base, whose
  // `gap-2`/`has-[>svg]:px-3` otherwise make a 48px-wide pill against a 40px height.
  'group/toolbar-pill relative flex h-10 min-w-10 shrink-0 items-center justify-center',
  'gap-0 rounded-full px-2.5 has-[>svg]:px-2.5',
  'outline-none hover:pr-3.5',
  // never animate `width` off a content-driven layout: only paint properties here
  'transition-[box-shadow,background-color] duration-300 ease-in-out active:scale-95',
  'motion-reduce:transition-none motion-reduce:active:scale-100'
);

/** The neutral toolbar palette, split out so the structure above can travel without it. */
export const EXPANDING_PILL_SURFACE_CLASS = cn(
  'bg-white text-primary-8 shadow-sm hover:bg-gray-100 hover:shadow-md',
  'focus-visible:ring-2 focus-visible:ring-primary-8/30'
);

/**
 * The pill's insides, split out so a caller that must own its own `<button>` gets the
 * same reveal. The consumer's element MUST carry {@link EXPANDING_PILL_BASE_CLASS}: the
 * reveal is driven by `group-hover/toolbar-pill`, which needs that group name.
 */
export function ExpandingPillContent({ icon, label, badge }: IExpandingPillContentProps) {
  return (
    <>
      <span className="relative flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <span
        aria-hidden
        className={cn(
          'grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-in-out',
          'group-hover/toolbar-pill:grid-cols-[1fr] group-focus-visible/toolbar-pill:grid-cols-[1fr]',
          'motion-reduce:transition-none'
        )}
      >
        <span className="overflow-hidden select-none">
          <span className="block whitespace-nowrap pl-1.5 text-[13px] font-medium">{label}</span>
        </span>
      </span>
      {badge ? (
        <span
          data-testid="toolbar-pill-badge-anchor"
          className="pointer-events-none absolute top-[-2px] right-[-2px] z-10"
        >
          <span className="block -translate-y-1/2 *:ring-2 *:ring-white">{badge}</span>
        </span>
      ) : null}
    </>
  );
}

export interface IExpandingPillContentProps {
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
}

/**
 * The toolbar pill used by every icon-only grid control. A 40px circle at rest, growing
 * to `icon + label` on hover/`:focus-visible` by animating `grid-template-columns`
 * (`0fr → 1fr`) — `display` cannot be animated and a width would have to be guessed per
 * label. The accessible name is the `aria-label`; the revealed text is `aria-hidden` so
 * it is never announced twice. The badge rides along on the same growth.
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
      data-testid={`toolbar-pill-${kebabCase(label)}`}
      {...rest}
      className={cn(EXPANDING_PILL_BASE_CLASS, EXPANDING_PILL_SURFACE_CLASS, className)}
    >
      <ExpandingPillContent icon={icon} label={label} badge={badge} />
    </button>
  );
}
