'use client';

import { useSyncExternalStore } from 'react';

/**
 * Where the learner is in each course. Kept in this browser's localStorage for now, until progress
 * has a home of its own on the platform.
 */
export type CourseProgress = {
  /** The slide last shown, from 0. */
  slide: number;
  /** The furthest slide reached. */
  furthest: number;
  /** Whether the last slide has been reached. */
  done: boolean;
  /** When it was last opened, ms since the epoch. */
  at: number;
};

type LearnProgress = Record<string, CourseProgress>;

const KEY = 'learn/progress/v1';

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): LearnProgress {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as LearnProgress) : {};
  } catch {
    return {};
  }
}

function write(progress: LearnProgress) {
  const raw = JSON.stringify(progress);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // storage blocked: the place is kept for this visit only, by whoever already holds it
  }
  // as `useLocalStorage` does, so this tab's readers hear of it as other tabs' do
  window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: raw }));
}

/** Records that `slide` of a course of `total` slides is showing. */
export function recordSlide(courseId: string, slide: number, total: number) {
  const progress = parse(readRaw());
  const was = progress[courseId];
  write({
    ...progress,
    [courseId]: {
      slide,
      furthest: Math.max(was?.furthest ?? 0, slide),
      done: Boolean(was?.done) || slide >= total - 1,
      at: Date.now(),
    },
  });
}

/** Forgets a course's progress, to start it again. */
export function resetCourse(courseId: string) {
  const { [courseId]: _, ...rest } = parse(readRaw());
  write(rest);
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/** Every course's progress, as stored; empty on the server. */
export function useLearnProgress(): LearnProgress {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return parse(raw);
}
