import { reducer } from './reducer';

import type { GridAction, GridState } from './grid-state';

export type Unsubscribe = () => void;

/**
 * Framework-agnostic observable store (Observer pattern). Designed for React's
 * `useSyncExternalStore`: {@link getSnapshot} returns a stable reference that only
 * changes when the state actually changes.
 */
export class GridStateStore {
  private state: GridState;
  private readonly listeners = new Set<() => void>();

  constructor(initial: GridState) {
    this.state = initial;
  }

  getSnapshot = (): GridState => this.state;

  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch = (action: GridAction): void => {
    const next = reducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  };
}
