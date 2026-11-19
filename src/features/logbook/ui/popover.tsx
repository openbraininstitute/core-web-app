// A popover opened from a button in a place that clips what passes its edge (the rail, the home
// header, the agent toast): it renders in <body> (a portal), placed under or above the button and
// kept on screen, above the phone's drawer (z-60). A click outside or Escape closes it. One
// pattern for every such button (notification settings, the list order).
import { clamp, isNotNil } from 'es-toolkit';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { MouseEvent, ReactNode } from 'react';
import type { TValueOf } from '@/api/logbook/types';

const EDGE = 8;

// Which part of the button the popover lines up with: its left edge, its right edge, its centre.
export const PopoverAlign = { Start: 'start', End: 'end', Center: 'center' } as const;
export type TPopoverAlign = TValueOf<typeof PopoverAlign>;

// Where it opens: under the button, or above it (a button near the bottom, like the toast's).
export const PopoverSide = { Below: 'below', Above: 'above' } as const;
export type TPopoverSide = TValueOf<typeof PopoverSide>;

// Fixed position: `top` under the button, or `bottom` above it (its height is not known yet).
export interface IAnchor {
  readonly top?: number;
  readonly bottom?: number;
  readonly left: number;
}

export function useAnchoredPopover(
  width: number,
  align: TPopoverAlign = PopoverAlign.Start,
  side: TPopoverSide = PopoverSide.Below
) {
  const [at, setAt] = useState<IAnchor | null>(null);
  const open = isNotNil(at);
  // Escape closes it wherever focus is (it stays on the button after the click).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAt(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // `anchor`: the element the popover lines up with, when not the button itself (the sort menu
  // lines up with the whole search box).
  const toggle = (event: MouseEvent<HTMLElement>, anchor?: Element | null): void => {
    if (open) {
      setAt(null);
      return;
    }
    const box = (anchor ?? event.currentTarget).getBoundingClientRect();
    // On a narrow screen the popover shrinks to the screen less its edges (max-width).
    const shown = Math.min(width, window.innerWidth - 2 * EDGE);
    const wanted =
      align === PopoverAlign.End
        ? box.right - shown
        : align === PopoverAlign.Center
          ? box.left + box.width / 2 - shown / 2
          : box.left;
    const left = clamp(wanted, EDGE, Math.max(EDGE, window.innerWidth - shown - EDGE));
    setAt(
      side === PopoverSide.Above
        ? { bottom: window.innerHeight - box.top + EDGE, left }
        : { top: box.bottom + EDGE, left }
    );
  };
  return { at, open, toggle, close: () => setAt(null) };
}

// The popover's layer: an invisible backdrop that closes it, then the popover itself.
export function PopoverLayer({
  label,
  onClose,
  children,
}: {
  readonly label: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-70 cursor-default border-0 bg-transparent"
        aria-label={label}
        tabIndex={-1}
        onClick={onClose}
      />
      {children}
    </>,
    document.body
  );
}
