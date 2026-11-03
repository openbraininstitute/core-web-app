'use client';

import { Input, Segmented } from 'antd';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import type { DeletedScope } from '../api/admin-types';

const SCOPES = ['live', 'all', 'deleted'] as const;
const SCOPE_OPTIONS = [
  { value: 'live', label: 'Live' },
  { value: 'all', label: 'All' },
  { value: 'deleted', label: 'Deleted' },
];
const SCOPE_PARAMS: Record<(typeof SCOPES)[number], DeletedScope> = {
  live: {},
  all: { include_deleted: true },
  deleted: { deleted_only: true },
};

const shallow = { shallow: true };

// `gridKey` goes on the grid, so a changed filter returns to page 1.
export function useListFilters({ scoped }: { scoped?: boolean } = {}) {
  const [query, setQuery] = useQueryState('q', parseAsString.withDefault('').withOptions(shallow));
  const [scope, setScope] = useQueryState(
    'deleted',
    parseAsStringLiteral(SCOPES).withDefault('live').withOptions(shallow)
  );

  return {
    params: { query: query || undefined, ...SCOPE_PARAMS[scope] },
    gridKey: `${query}:${scope}`,
    controls: (placeholder: string) => (
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
            onChange={(value) => setScope(value as (typeof SCOPES)[number])}
          />
        )}
      </div>
    ),
  };
}
