import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FilterOptionsKind } from '../../core';

import type { TFilterOptionsSource } from '../../core';
import type { IFilterEditorContext } from './context';

export interface ISetOption {
  id: string;
  label: string;
  /** value sent to the API `__in` filter — the facet label (e.g. pref_label), not the id */
  value: string;
  count?: number;
  /** facet type hint ('mtype'/'etype'/…) used to fetch a per-option definition */
  type?: string | null;
}

export interface ISetOptionsResult {
  options: ISetOption[];
  loading: boolean;
}

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Resolves options for a set/facet filter from all three sources: server-computed
 * `facets`, `static` schema items, or `async` loading via React Query. For facets the
 * API `__in` value is the LABEL — bucket ids are UUIDs the API does not filter by —
 * while `id` is kept for per-option definition lookups.
 */
export function useSetOptions(
  source: TFilterOptionsSource | undefined,
  facetKey: string,
  ctx: IFilterEditorContext
): ISetOptionsResult {
  const facets = ctx.facets;
  const asyncSource = source?.kind === FilterOptionsKind.Async ? source : undefined;

  const query = useQuery({
    queryKey: ['data-grid', 'filter-options', facetKey],
    queryFn: () => asyncSource?.load() ?? Promise.resolve([]),
    enabled: Boolean(asyncSource),
    staleTime: FIVE_MINUTES,
  });

  return useMemo<ISetOptionsResult>(() => {
    if (!source || source.kind === FilterOptionsKind.Facets) {
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
    if (source.kind === FilterOptionsKind.Static) {
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
