'use client';

import { useSyncExternalStore } from 'react';

import { entitySearchMode } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { isEmptyFilterValue, repairPersistedFilters } from '@/features/data-grid/core';
import {
  readSessionState,
  SESSION_STORAGE_EVENT,
} from '@/features/data-grid/react/persistence/storage-persistence';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';
import type { IGridState } from '@/features/data-grid/core';

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

function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_STORAGE_EVENT, onChange);
  return () => window.removeEventListener(SESSION_STORAGE_EVENT, onChange);
}

/**
 * Filters and search a listing saved, i.e. what its grid re-applies when it mounts again;
 * `null` when there are none, `undefined` until the client has read storage (server render
 * and hydration). Follows the grid's writes, so a sidebar count of a listing that is not on
 * screen still counts what the user filtered.
 */
export function useSavedListingFilters(dataKey: string): TSavedListingFilters | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => readSessionState(dataKey),
    () => undefined
  );
  return raw === undefined ? undefined : parseSavedListingFilters(raw);
}

/**
 * Entitycore params for {@link TSavedListingFilters}, serialized as the listing's grid does.
 * Callers spread their pinned params (region, scope, variant) after these, as the grid does.
 */
export async function savedListingParams(
  dataType: TExtendedEntitiesTypeDict,
  saved: TSavedListingFilters | null | undefined
): Promise<TEntitycoreParams> {
  if (!saved) return {};
  // Lazy: the registry pulls in every grid schema and AG Grid, which the sidebar on the
  // Data atlas page (no listing) must not load. Reached only when filters are saved.
  const { getEntityGridDefinition } = await import(
    '@/features/data-grid/bindings/entitycore/registry'
  );
  const schema = getEntityGridDefinition(dataType)?.schema;
  if (!schema) return {};
  const {
    page: _page,
    page_size: _pageSize,
    ...params
  } = serializeQuery(
    {
      page: 1,
      pageSize: 0,
      sort: [],
      filters: repairPersistedFilters(saved.filters, schema),
      freeTextSearch: saved.freeTextSearch,
    },
    schema,
    { searchMode: entitySearchMode(dataType) }
  );
  return params;
}
