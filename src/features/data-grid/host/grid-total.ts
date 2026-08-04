import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

/**
 * Filtered total of the active browse grid, keyed by the listing `dataKey`. The host
 * publishes its server total on every fetch so the data sidebar's "x of y" counters
 * follow the grid's filters/search. `undefined` = no grid mounted for that key.
 */
export const gridFilteredTotalAtom = atomFamily((_dataKey: string) =>
  atom<number | undefined>(undefined)
);
