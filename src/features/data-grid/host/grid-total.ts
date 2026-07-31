import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

/**
 * FILTERED total of the active browse grid, keyed by the listing `dataKey`
 * (workspace + section + dataType + scope). The grid host publishes its server
 * total here on every fetch, so the data sidebar's "x of y" counters follow the
 * grid's filters/search exactly like they followed the legacy table's query
 * cache (see `useTableQueryCount`). `undefined` = no grid mounted for that key.
 */
export const gridFilteredTotalAtom = atomFamily((_dataKey: string) =>
  atom<number | undefined>(undefined)
);
