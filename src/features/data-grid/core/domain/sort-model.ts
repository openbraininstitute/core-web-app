export const SortDirection = {
  Asc: 'asc',
  Desc: 'desc',
} as const;

export type TSortDirection = (typeof SortDirection)[keyof typeof SortDirection];

export interface ISortEntry {
  /** logical column id */
  columnId: string;
  direction: TSortDirection;
}

/**
 * Ordered list of sort entries. Index 0 is the primary sort; subsequent entries
 * are tie-breakers (multi-sort). An empty list means "no explicit sort".
 */
export type TSortModel = ISortEntry[];
