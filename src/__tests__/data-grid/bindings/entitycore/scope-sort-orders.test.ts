import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { scopeColumn } from '@/features/data-grid/bindings/entitycore/columns/scope';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import {
  SCOPE_COLUMN_ID,
  ScopeFilter,
} from '@/features/data-grid/bindings/entitycore/scope-filter';
import { FilterValueKind, OperatorId, SortDirection } from '@/features/data-grid/core';

import type {
  TScopeFilter,
  TScopeKind,
} from '@/features/data-grid/bindings/entitycore/scope-filter';
import type { IGridQuery } from '@/features/data-grid/core';

/**
 * The API can neither order by scope nor leave the project's made-public data out of
 * public data, so the scope orders and the public-only filter are stitched from filtered
 * listings, passing over the made-public rows where no filter can. Every page, laid end
 * to end, must be the listing those ask for.
 */

const PROJECT = 'pr';
const schema = {
  ...cellMorphologySchema,
  columns: [scopeColumn(), ...cellMorphologySchema.columns],
};

interface IRow {
  id: string;
  creation_date: string;
  authorized_public: boolean;
  authorized_project_id: string;
}

/** Rows newest first, each kind drawn from `pattern` (p private, b made public, g public). */
function rowsFrom(pattern: string): IRow[] {
  const start = Date.UTC(2026, 0, 1);
  return [...pattern].map((kind, i) => ({
    id: `r${i}`,
    creation_date: new Date(start - i * 1000).toISOString(),
    authorized_public: kind !== 'p',
    authorized_project_id: kind === 'g' ? 'elsewhere' : PROJECT,
  }));
}

/** A stand-in for the API: equality filters, `creation_date__gte`, newest first, paged. */
function fakeApi(rows: IRow[]) {
  return async ({ filters }: { filters: Record<string, unknown> }) => {
    const matching = rows.filter(
      (row) =>
        (filters.authorized_public === undefined ||
          String(row.authorized_public) === String(filters.authorized_public)) &&
        (filters.authorized_project_id === undefined ||
          row.authorized_project_id === filters.authorized_project_id) &&
        (filters.creation_date__gte === undefined ||
          row.creation_date >= String(filters.creation_date__gte))
    );
    const page = Number(filters.page ?? 1);
    const size = Number(filters.page_size ?? 30);
    return {
      data: matching.slice((page - 1) * size, page * size),
      pagination: { page, page_size: size, total_items: matching.length },
    };
  };
}

function sourceFor(rows: IRow[], projectId = PROJECT) {
  return createEntitycorePagedDataSource<IRow>({
    dataType: ExtendedEntitiesTypeDict.CellMorphology,
    schema: schema as never,
    context: { virtualLabId: 'vl', projectId },
    listQueryFn: fakeApi(rows) as never,
  });
}

function queryFor(
  page: number,
  pageSize: number,
  { order, filter }: { order?: TScopeKind; filter?: TScopeFilter }
): IGridQuery {
  return {
    page,
    pageSize,
    filters: filter
      ? {
          [SCOPE_COLUMN_ID]: {
            columnId: SCOPE_COLUMN_ID,
            operator: OperatorId.Eq,
            value: { kind: FilterValueKind.Text, text: filter },
          },
        }
      : {},
    sort: order ? [{ columnId: SCOPE_COLUMN_ID, direction: SortDirection.Asc, order }] : [],
  };
}

async function allPages(
  rows: IRow[],
  view: { order?: TScopeKind; filter?: TScopeFilter },
  pageSize: number
) {
  const source = sourceFor(rows);
  const listed: string[] = [];
  let total = 0;
  for (let page = 1; page === 1 || (page - 1) * pageSize < total; page += 1) {
    const result = await source.fetch(queryFor(page, pageSize, view));
    total = result.total;
    listed.push(...result.rows.map((row) => row.id));
  }
  return { listed, total };
}

const kindOf = (row: IRow): TScopeKind => {
  if (!row.authorized_public) return 'project';
  return row.authorized_project_id === PROJECT ? 'published' : 'public';
};

const SHOWS: Record<TScopeFilter, (row: IRow) => boolean> = {
  [ScopeFilter.Public]: (row) => row.authorized_public,
  [ScopeFilter.PublicOnly]: (row) => kindOf(row) === 'public',
  [ScopeFilter.PublicFromProject]: (row) => kindOf(row) === 'published',
  [ScopeFilter.Project]: (row) => row.authorized_project_id === PROJECT,
  [ScopeFilter.Published]: (row) => kindOf(row) === 'published',
  [ScopeFilter.Private]: (row) => kindOf(row) === 'project',
};

/** What a view should list: the order's kind first, the rest by date, then the filter. */
function expected(rows: IRow[], { order, filter }: { order?: TScopeKind; filter?: TScopeFilter }) {
  const first = (row: IRow) => kindOf(row) === order;
  const ordered = order ? [...rows.filter(first), ...rows.filter((row) => !first(row))] : rows;
  return ordered.filter((row) => !filter || SHOWS[filter](row)).map((row) => row.id);
}

/** A repeatable mix of the three kinds. */
function mixed(length: number, seed: number, weights: [number, number]) {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const [p, b] = weights;
  return Array.from({ length }, () => {
    const x = next();
    if (x < p) return 'p';
    return x < p + b ? 'b' : 'g';
  }).join('');
}

const PATTERNS = {
  'no made-public data': 'gggpgggpggppgggg',
  'made public at the top': 'bbgggpggbgpp',
  'made public at the bottom': 'gpggpggggpbb',
  'only made public': 'bbbbb',
  'a run across a page edge': 'ggggbbbbggggpggg',
  'a long mix': mixed(157, 7, [0.2, 0.15]),
  'made public in clumps': mixed(203, 11, [0.1, 0.4]),
};
const ORDERS = ['public', 'project', 'published'] as const;

describe('scope column orders, paged', () => {
  for (const [name, pattern] of Object.entries(PATTERNS)) {
    for (const order of ORDERS) {
      for (const pageSize of [3, 5, 30]) {
        it(`${order} first, ${name}, pages of ${pageSize}`, async () => {
          const rows = rowsFrom(pattern);
          const { listed, total } = await allPages(rows, { order }, pageSize);
          expect(total).toBe(rows.length);
          expect(listed).toEqual(expected(rows, { order }));
        });
      }
    }
  }

  it('lists nothing first without a project to have made data public', async () => {
    const source = sourceFor(rowsFrom('gbpg'), '');
    const result = await source.fetch(queryFor(1, 30, { order: 'published' }));
    expect(result.rows.map((row) => row.id)).toEqual(['r0', 'r1', 'r2', 'r3']);
  });
});

describe('scope filter, paged, with and without an order', () => {
  const patterns = ['made public at the top', 'a long mix', 'made public in clumps'] as const;
  for (const name of patterns) {
    for (const filter of Object.values(ScopeFilter)) {
      for (const order of [undefined, ...ORDERS]) {
        for (const pageSize of [3, 30]) {
          it(`${filter}, ${order ?? 'unsorted'}, ${name}, pages of ${pageSize}`, async () => {
            const rows = rowsFrom(PATTERNS[name]);
            const want = expected(rows, { order, filter });
            const { listed, total } = await allPages(rows, { order, filter }, pageSize);
            expect(total).toBe(want.length);
            expect(listed).toEqual(want);
          });
        }
      }
    }
  }
});
