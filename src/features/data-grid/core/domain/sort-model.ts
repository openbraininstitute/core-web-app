export type SortDirection = 'asc' | 'desc';

export interface SortEntry {
  /** logical column id */
  columnId: string;
  direction: SortDirection;
}

/**
 * Ordered list of sort entries. Index 0 is the primary sort; subsequent entries
 * are tie-breakers (multi-sort). An empty list means "no explicit sort".
 */
export type SortModel = SortEntry[];
