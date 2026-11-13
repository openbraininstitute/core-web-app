'use client';

import { Input, Segmented } from 'antd';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import type { DeletedScope } from '../api/admin-types';

const SCOPE_KEYS = ['live', 'all', 'deleted'] as const;
const SCOPES: Record<(typeof SCOPE_KEYS)[number], { label: string; params: DeletedScope }> = {
  live: { label: 'Live', params: {} },
  all: { label: 'All', params: { include_deleted: true } },
  deleted: { label: 'Deleted', params: { deleted_only: true } },
};
const SCOPE_OPTIONS = SCOPE_KEYS.map((value) => ({ value, label: SCOPES[value].label }));

const shallow = { shallow: true };

// `gridKey` goes on the grid, so a changed filter returns to page 1.
export function useListFilters({ scoped, placeholder }: { scoped?: boolean; placeholder: string }) {
  const [query, setQuery] = useQueryState('q', parseAsString.withDefault('').withOptions(shallow));
  const [scope, setScope] = useQueryState(
    'deleted',
    parseAsStringLiteral(SCOPE_KEYS).withDefault('live').withOptions(shallow)
  );

  return {
    params: { query: query || undefined, ...SCOPES[scope].params },
    gridKey: `${query}:${scope}`,
    controls: (
      <div className="flex items-center gap-3">
        <Input.Search
          key={query}
          allowClear
          defaultValue={query}
          placeholder={placeholder}
          onSearch={(value) => setQuery(value.trim())}
          className="max-w-96"
        />
        {scoped && (
          <Segmented
            value={scope}
            options={SCOPE_OPTIONS}
            onChange={(value) => setScope(value as (typeof SCOPE_KEYS)[number])}
          />
        )}
      </div>
    ),
  };
}
