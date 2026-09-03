import { isUuid } from '@/features/data-grid/react/filters/id-tokens';

import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';

/**
 * Recover the term the user typed from whichever search param the serializer emitted.
 * `ilike_search` is wrapped in the wildcards `serializeQuery` adds (`*term*`); `search`
 * is verbatim. A UUID carries no `*`, so unwrapping is lossless for the case that
 * matters here.
 */
function searchTerm(params: TEntitycoreParams): string | undefined {
  const ilike = params.ilike_search;
  if (typeof ilike === 'string') return ilike.replace(/^\*+|\*+$/g, '').trim();
  const plain = params.search;
  if (typeof plain === 'string') return plain.trim();
  return undefined;
}

/**
 * Workflow-only search behaviour: a search term that IS a UUID looks that one record up
 * by id instead of running a text search.
 *
 * Entitycore's `ilike_search`/`search` match `name` and `description` only, so pasting
 * an id into the box would always return nothing — which is exactly what someone who
 * has an id in their clipboard is likely to do. Swapping in `id` makes that work.
 *
 * A non-UUID term is left completely alone, and so is every other param: an `id__in`
 * from the advanced filter still applies, narrowing alongside this rather than being
 * replaced.
 */
export function withWorkflowIdSearch(params: TEntitycoreParams): TEntitycoreParams {
  const term = searchTerm(params);
  if (!term || !isUuid(term)) return params;

  const { ilike_search: _ilikeSearch, search: _search, ...rest } = params;
  return { ...rest, id: term };
}
