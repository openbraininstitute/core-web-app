import type { GridState } from '../state/grid-state';

/**
 * The persistence port. Implementations decide WHICH slice of state to persist
 * (e.g. the session slice keeps filters/sort/page but drops selection; the local
 * slice keeps column layout) and WHERE (sessionStorage, localStorage, URL, …).
 * The controller stays agnostic.
 */
export interface StatePersistence {
  load(key: string): Partial<GridState> | null;
  save(key: string, state: GridState): void;
  clear?(key: string): void;
}
