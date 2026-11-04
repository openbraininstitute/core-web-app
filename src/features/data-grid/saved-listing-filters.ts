'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { serializeEntitycoreQuery } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import { isEmptyFilterValue, repairPersistedFilters } from '@/features/data-grid/core';
import {
  SESSION_NAMESPACE,
  SESSION_STORAGE_EVENT,
} from '@/features/data-grid/react/persistence/storage-persistence';
import { scopeListing } from '@/features/views/listing/variants/scope-listing';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';
import type { IGridState } from '@/features/data-grid/core';
import type { IListingVariant } from '@/features/views/listing/variants/types';

/** The part of a listing's saved state that changes how many rows it has. */
export type TSavedListingFilters = Pick<IGridState, 'filters' | 'freeTextSearch'>;

/**
 * Normalised, so states that send the same request share one count cache entry: empty
 * filters are dropped and the search trimmed. `null` when nothing narrows the rows.
 */
export function parseSavedListingFilters(raw: string | null): TSavedListingFilters | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<IGridState>;
    const filters = Object.fromEntries(
      Object.entries(saved.filters ?? {}).filter(([, entry]) => !isEmptyFilterValue(entry.value))
    );
    const freeTextSearch = saved.freeTextSearch?.trim() ?? '';
    return Object.keys(filters).length > 0 || freeTextSearch ? { filters, freeTextSearch } : null;
  } catch {
    return null;
  }
}

/**
 * Filters and search a listing saved, i.e. what its grid re-applies when it mounts again;
 * `null` when there are none, `undefined` until the client has read storage (server render
 * and hydration). Follows the grid's writes, so a sidebar count of a listing that is not on
 * screen still counts what the user filtered.
 */
export function useSavedListingFilters(dataKey: string): TSavedListingFilters | null | undefined {
  const storageKey = `${SESSION_NAMESPACE}${dataKey}`;
  const subscribe = useCallback(
    (onChange: () => void) => {
      // only this listing's writes: every grid's session slice dispatches the same event
      const onWrite = (event: Event) => {
        if ((event as StorageEvent).key === storageKey) onChange();
      };
      window.addEventListener(SESSION_STORAGE_EVENT, onWrite);
      return () => window.removeEventListener(SESSION_STORAGE_EVENT, onWrite);
    },
    [storageKey]
  );
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => {
      try {
        return window.sessionStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => undefined
  );
  return useMemo(() => (raw === undefined ? undefined : parseSavedListingFilters(raw)), [raw]);
}

/**
 * Entitycore params for {@link TSavedListingFilters}, built as the listing's grid builds its
 * request: same definition (`scopeListing` for a variant), same filter repair, same
 * serializer. Callers spread their pinned params (region, scope, variant) after these.
 */
export async function savedListingParams(
  dataType: TExtendedEntitiesTypeDict,
  saved: TSavedListingFilters | null | undefined,
  variant?: IListingVariant
): Promise<TEntitycoreParams> {
  if (!saved) return {};
  // Lazy: the registry pulls in every grid schema and AG Grid, which the sidebar on the
  // Data atlas page (no listing) must not load. Reached only when filters are saved.
  const { getEntityGridDefinition } = await import(
    '@/features/data-grid/bindings/entitycore/registry'
  );
  const definition = getEntityGridDefinition(dataType);
  if (!definition) return {};
  const { schema } = variant ? scopeListing({ definition }, variant).definition : definition;
  const {
    page: _page,
    page_size: _pageSize,
    ...params
  } = serializeEntitycoreQuery(dataType, schema, {
    page: 1,
    pageSize: 0,
    sort: [],
    filters: repairPersistedFilters(saved.filters, schema),
    freeTextSearch: saved.freeTextSearch,
  });
  return params;
}
