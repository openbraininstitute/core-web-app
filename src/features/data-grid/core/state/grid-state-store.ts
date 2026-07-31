import { reducer } from './reducer';

import type { IGridState, TGridAction } from './grid-state';

export type TUnsubscribe = () => void;

/**
 * Framework-agnostic observable store (Observer pattern). Designed for React's
 * `useSyncExternalStore`: {@link getSnapshot} returns a stable reference that only
 * changes when the state actually changes.
 */
export class GridStateStore {
  private state: IGridState;
  private readonly listeners = new Set<() => void>();

  constructor(initial: IGridState) {
    this.state = initial;
  }

  getSnapshot = (): IGridState => this.state;

  subscribe = (listener: () => void): TUnsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch = (action: TGridAction): void => {
    const next = reducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  };
}
