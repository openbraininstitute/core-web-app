import z from 'zod';

import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';

const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;

/** The typed term, unwrapped from the `*…*` wildcards `serializeQuery` adds to `ilike_search`. */
function searchTerm(params: TEntitycoreParams): string | undefined {
  const ilike = params.ilike_search;
  if (typeof ilike === 'string') return ilike.replace(/^\*+|\*+$/g, '').trim();
  const plain = params.search;
  if (typeof plain === 'string') return plain.trim();
  return undefined;
}

/**
 * Look a record up by id when the search term is a UUID.
 *
 * `ilike_search`/`search` match `name` and `description` only, so a pasted id would
 * otherwise always return nothing. An explicit ID filter from the advanced panel wins:
 * overwriting its `id` would silently widen the user's own filter.
 */
export function withWorkflowIdSearch(params: TEntitycoreParams): TEntitycoreParams {
  const term = searchTerm(params);
  if (!term || !isUuid(term)) return params;

  const { ilike_search: _ilikeSearch, search: _search, ...rest } = params;
  if (rest.id !== undefined || rest.id__in !== undefined) return rest;
  return { ...rest, id: term };
}
