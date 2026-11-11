/** The player's time where a view marks it: its rule and the time beside it, in red. */
export const TIME_CURSOR_COLOR = '#f5222d';

/**
 * A time shared by views that each mark it - a scene playing a recording, and
 * the plots of its traces - pushed to them as it moves rather than through
 * React, which would re-render every plot sixty times a second.
 */
export type TimeCursor = {
  set: (timeInMs: number | null) => void;
  /** Called with the time now and on every move; returns the unsubscribe. */
  subscribe: (listener: (timeInMs: number | null) => void) => () => void;
};

export function createTimeCursor(): TimeCursor {
  let current: number | null = null;
  const listeners = new Set<(timeInMs: number | null) => void>();
  return {
    set(timeInMs) {
      current = timeInMs;
      for (const listener of listeners) listener(timeInMs);
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
