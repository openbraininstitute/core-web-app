import isNil from 'es-toolkit/compat/isNil';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { coreFiltersAtom, coreSearchStringAtom } from '@/ui/segments/data-table/elements/context';
import { resetFilterSignalAtom } from '@/ui/segments/explore/circuit/helpers';

/**
 * watch filter and search state for a given data key and
 * signals when a reset of filter-dependent UI should occur.
 *
 * This hook subscribes to:
 *  - coreFiltersAtom({ dataType, key: dataKey }) to observe the current filters
 *  - coreSearchStringAtom(dataKey) to observe the current search string
 *  - resetFilterSignalAtom to emit a reset signal (incrementing a numeric counter)
 *
 * Behavior:
 *  - When any filter in the observed filters array has an "active" value
 *    (value !== undefined && value !== null && value !== ''), the hook
 *    increments the reset signal atom once, indicating UI should react to active filters.
 *  - When the search string is non-empty (after trimming), the hook also
 *    increments the reset signal atom once.
 *  - The hook performs these actions inside useEffect hooks so they run in
 *    response to changes to the filters or search string.
 *
 * Notes:
 *  - This is only for circuit for the moment,
 *    the use case is to allow the hierarchy view to reset
 *    the table Expandable rows to the default state
 */
export function useFilterStateWatcher({
  dataType,
  dataKey,
}: {
  dataType: TExtendedEntitiesTypeDict;
  dataKey: string;
}) {
  const filters = useAtomValue(
    coreFiltersAtom({
      dataType,
      key: dataKey,
    }),
  );
  const searchString = useAtomValue(coreSearchStringAtom(dataKey));
  const setResetFilterSignal = useSetAtom(resetFilterSignalAtom);

  useEffect(() => {
    const hasActiveFilters = filters?.some((filter) => !isNil(filter.value) && filter.value !== '');
    if (hasActiveFilters) {
      setResetFilterSignal((prev) => prev + 1);
    }
  }, [filters, setResetFilterSignal]);

  useEffect(() => {
    if (searchString && searchString.trim().length > 0) {
      setResetFilterSignal((prev) => prev + 1);
    }
  }, [searchString, setResetFilterSignal]);

  return null;
}
