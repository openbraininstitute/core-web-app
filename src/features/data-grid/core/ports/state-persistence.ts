import type { IGridState } from '../state/grid-state';

/**
 * The persistence port. Implementations decide WHICH slice of state to persist
 * (e.g. the session slice keeps filters/sort/page but drops selection; the local
 * slice keeps column layout) and WHERE (sessionStorage, localStorage, URL, …).
 * The controller stays agnostic.
 */
export interface IStatePersistence {
  load(key: string): Partial<IGridState> | null;
  save(key: string, state: IGridState): void;
  clear?(key: string): void;
}
