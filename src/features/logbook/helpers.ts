import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import { CLOCK_MS, DAY_MS, HOUR_MS, MINUTE_MS } from '@/features/logbook/constants';

import type { PointerEvent as ReactPointerEvent } from 'react';

export const POPOVER_PANEL = 'w-auto rounded-2xl border-0 bg-white shadow-(--shadow-pop)';

export const clip = (text: string, length: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= length ? flat : `${flat.slice(0, length - 1)}…`;
};

export const sizeOf = (bytes: number): string =>
  match(bytes)
    .with(P.number.lt(1024), () => `${bytes} B`)
    .with(P.number.lt(1024 * 1024), () => `${(bytes / 1024).toFixed(1)} KB`)
    .otherwise(() => `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export const hexOf = (colour: string | undefined): string =>
  match(colour)
    .with(P.nullish, '', () => '#c4cdd9')
    .with(P.string.startsWith('#'), (hex) => hex)
    .with(P.string, (hex) => `#${hex}`)
    .exhaustive();

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

export const dateOf = (iso: string): string => dayFormat.format(new Date(iso));
export const savedOf = (iso: string): string => dayTimeFormat.format(new Date(iso));
export const timeOf = (at: number): string => timeFormat.format(at);

export function agoOf(iso: string, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(iso).getTime());
  return match(ms)
    .with(P.number.lt(MINUTE_MS), () => 'just now')
    .with(P.number.lt(HOUR_MS), () => relative.format(-Math.floor(ms / MINUTE_MS), 'minute'))
    .with(P.number.lt(DAY_MS), () => relative.format(-Math.floor(ms / HOUR_MS), 'hour'))
    .with(P.number.lt(7 * DAY_MS), () => relative.format(-Math.floor(ms / DAY_MS), 'day'))
    .otherwise(() => dateOf(iso));
}

export function liveAgoOf(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  const minutes = Math.round(seconds / 60);
  return match(seconds)
    .with(P.number.lt(10), () => 'just now')
    .with(P.number.lt(60), () => `${seconds}s ago`)
    .when(
      () => minutes < 60,
      () => `${minutes} min ago`
    )
    .otherwise(() => `${Math.round(minutes / 60)} h ago`);
}

const STORAGE_VERSION = '202611201';
export const storageKeyOf = (slice: string, key: string): string =>
  `logbook:${STORAGE_VERSION}:${slice}:${key}`;

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

export function useNow(intervalMs = CLOCK_MS, running = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, running]);
  return now;
}

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
