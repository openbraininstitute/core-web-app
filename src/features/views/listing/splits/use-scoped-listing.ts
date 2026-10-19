import { useMemo } from 'react';

import { scopeListing } from './scope-listing';

import type { IGridSchema } from '@/features/data-grid/core';
import type { IListingScope } from './scope-listing';
import type { IListingSplitOption } from './types';

/**
 * Memoised {@link scopeListing}: the grid controller's identity follows `definition`, so a
 * fresh object per render would rebuild it. Identity when there is no split option; an
 * unregistered `definition` stays `undefined` for the caller to report.
 */
export function useScopedListing<D extends { schema: IGridSchema<never> }>(
  props: Pick<IListingScope<D>, 'extraQueryParams' | 'id'>,
  definition: D | undefined,
  option: IListingSplitOption | undefined
): Omit<IListingScope<D>, 'definition'> & { definition: D | undefined } {
  const { extraQueryParams, id } = props;
  return useMemo(
    () =>
      option && definition
        ? scopeListing({ definition, extraQueryParams, id }, option)
        : { definition, extraQueryParams, id },
    [definition, option, extraQueryParams, id]
  );
}
