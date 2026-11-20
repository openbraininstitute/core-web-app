import { clamp, isNotNil } from 'es-toolkit';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { MouseEvent, ReactNode } from 'react';
import type { TValueOf } from '@/api/logbook/types';

const EDGE = 8;

export const PopoverAlign = { Start: 'start', End: 'end', Center: 'center' } as const;
export type TPopoverAlign = TValueOf<typeof PopoverAlign>;

export const PopoverSide = { Below: 'below', Above: 'above' } as const;
export type TPopoverSide = TValueOf<typeof PopoverSide>;

// `bottom` when above: the popover's height isn't known yet.
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
  // Escape works wherever focus is.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAt(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // `anchor`: line up with this instead of the button (e.g. the whole search box).
  const toggle = (event: MouseEvent<HTMLElement>, anchor?: Element | null): void => {
    if (open) {
      setAt(null);
      return;
    }
    const box = (anchor ?? event.currentTarget).getBoundingClientRect();
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
