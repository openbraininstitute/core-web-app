import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { FilterOptionsSource } from '../../../core';
import type { AgGridContext } from '../ag-context';

export interface SetOption {
  id: string;
  label: string;
  /** value sent to the API `__in` filter — the facet label (e.g. pref_label), not the id */
  value: string;
  count?: number;
  /** facet type hint ('mtype'/'etype'/…) used to fetch a per-option definition */
  type?: string | null;
}

export interface SetOptionsResult {
  options: SetOption[];
  loading: boolean;
}

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Resolves options for a set/facet filter across all three sources:
 * - `facets` → server-computed buckets from the current fetch (id + label + count + type)
 * - `static` → declared inline in the schema
 * - `async`  → lazily loaded via React Query (cached, with a loading state)
 *
 * For facets the API `__in` value is the **label** (matching the legacy CheckList
 * behaviour — bucket ids are UUIDs the API does not filter by), while `id` is kept
 * for per-option definition lookups.
 */
export function useSetOptions(
  source: FilterOptionsSource | undefined,
  facetKey: string,
  ctx: AgGridContext
): SetOptionsResult {
  const facets = ctx.facets;
  const asyncSource = source?.kind === 'async' ? source : undefined;

  const query = useQuery({
    queryKey: ['data-grid', 'filter-options', facetKey],
    queryFn: () => asyncSource?.load() ?? Promise.resolve([]),
    enabled: Boolean(asyncSource),
    staleTime: FIVE_MINUTES,
  });

  return useMemo<SetOptionsResult>(() => {
    if (!source || source.kind === 'facets') {
      const buckets = facets?.[facetKey] ?? [];
      return {
        options: buckets.map((b) => ({
          id: b.id,
          label: b.label,
          value: b.label,
          count: b.count,
          type: b.type,
        })),
        loading: false,
      };
    }
    if (source.kind === 'static') {
      return {
        options: source.items.map((i) => ({ id: i.id, label: i.label, value: i.id })),
        loading: false,
      };
    }
    return {
      options: (query.data ?? []).map((i) => ({ id: i.id, label: i.label, value: i.id })),
      loading: query.isLoading,
    };
  }, [source, facetKey, facets, query.data, query.isLoading]);
}
