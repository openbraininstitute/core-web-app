// Small shared helpers for the logbook: motion curves, formatting, a clock and pointer drags.
import { isNil } from 'es-toolkit';
import { useEffect, useState } from 'react';

import type { PointerEvent as ReactPointerEvent } from 'react';

// Motion. Easing curves mirror the CSS custom properties in globals.css.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** For things that fall; not for UI entrances. */
export const EASE_IN = [0.55, 0, 1, 0.45] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const EASE_OUT_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Press feedback on tappable surfaces. */
export const SPRING_PRESS = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const;
/** Label/icon slots swapping inside a control. */
export const SPRING_SWAP = { type: 'spring', stiffness: 460, damping: 30, mass: 0.55 } as const;
/** Modal and sheet entrances. */
export const SPRING_PANEL = { type: 'spring', stiffness: 420, damping: 40, mass: 0.5 } as const;
/** Shared-layout glides between positions. */
export const SPRING_LAYOUT = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const;
/** Decorative mouse tracking. */
export const SPRING_MOUSE = { stiffness: 200, damping: 15, mass: 0.3 } as const;
/** Sliders: critically damped, follows the pointer and never rebounds. */
export const SPRING_GLIDE = { stiffness: 700, damping: 50, mass: 0.5 } as const;

// Text.

/** "Alice Admin" → "AA": the first letters of the first two words. */
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

/** Whitespace folded, then cut to `length` with an ellipsis. */
export const clip = (text: string, length: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= length ? flat : `${flat.slice(0, length - 1)}…`;
};

export const sizeOf = (bytes: number): string =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** A CSS colour from a hex triplet that may lack its "#"; grey when there is none. */
export const hexOf = (colour: string | undefined): string =>
  isNil(colour) || colour.length === 0 ? '#c4cdd9' : colour.startsWith('#') ? colour : `#${colour}`;

// Dates. Each formatter is built once: Intl objects are costly and labels format often.

const dayFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dayTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

/** "12 Nov 2026". */
export const dateOf = (iso: string): string => dayFormat.format(new Date(iso));
/** "12 Nov 2026, 14:05". */
export const savedOf = (iso: string): string => dayTimeFormat.format(new Date(iso));
/** "14:05". */
export const timeOf = (at: number): string => timeFormat.format(at);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "5 min ago", "yesterday" within a week, then the date. */
export function agoOf(iso: string, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(iso).getTime());
  if (ms < MINUTE) return 'just now';
  if (ms < HOUR) return relative.format(-Math.floor(ms / MINUTE), 'minute');
  if (ms < DAY) return relative.format(-Math.floor(ms / HOUR), 'hour');
  if (ms < 7 * DAY) return relative.format(-Math.floor(ms / DAY), 'day');
  return dateOf(iso);
}

/** Seconds-precise, for live labels that tick with useNow: "12s ago", "3 min ago". */
export function liveAgoOf(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
}

// Values.

/** The newest value, for callbacks built once (an editor's extensions) that must not go stale. */
export class Latest<T> {
  #value: T;
  constructor(value: T) {
    this.#value = value;
  }
  get = (): T => this.#value;
  set = (value: T): void => {
    this.#value = value;
  };
}

// Clock.

export const CLOCK_MS = 400;

/** The time now, refreshed on an interval; only the labels that call it re-render. */
export function useNow(intervalMs = CLOCK_MS): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// Pointer.

/** Follows a drag from a handle; pointer capture keeps moves coming when it leaves the handle. */
export function dragHandle(
  event: ReactPointerEvent<HTMLElement>,
  onMove: (move: PointerEvent, stop: () => void) => void
): void {
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const move = (e: PointerEvent): void => onMove(e, stop);
  function stop(): void {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', stop);
    handle.removeEventListener('pointercancel', stop);
  }
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}
