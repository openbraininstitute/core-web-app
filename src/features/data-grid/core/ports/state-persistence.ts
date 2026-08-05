import type { IGridState } from '@/features/data-grid/core/state/grid-state';

/**
 * The persistence port: implementations decide which slice of state to persist (the
 * session slice keeps filters/sort/page, the local slice keeps column layout) and
 * where.
 */
export interface IStatePersistence {
  load(key: string): Partial<IGridState> | null;
  save(key: string, state: IGridState): void;
  clear?(key: string): void;
}
