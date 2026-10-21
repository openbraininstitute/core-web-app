import { FACETS_ONLY_PAGE } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { FilterValueKind } from '@/features/data-grid/core';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';
import type {
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
  IRowGroup,
  TFacets,
} from '@/features/data-grid/core';
import type { WorkspaceContext } from '@/types/common';

export type TListQueryFn<Row> = (args: {
  filters: Record<string, unknown>;
  withFacets?: boolean;
  context: WorkspaceContext;
}) => Promise<EntityCoreResponse<Row> | undefined>;

export interface IEntitycorePagedDataSourceOptions<Row> {
  /** routes to the entity's domain config (single source of truth) */
  dataType: TExtendedEntitiesTypeDict;
  /** schema, used to resolve column ids → backend fields for sort/filter */
  schema: IGridSchema<Row>;
  context: WorkspaceContext;
  /** overrides the entity's domain `query.list`; must be server-side paginated */
  listQueryFn?: TListQueryFn<Row>;
  withFacets?: boolean;
  /** post-processes the serialized params (applied last) */
  transformParams?: (params: TEntitycoreParams) => TEntitycoreParams;
}

/** The groups of the column order the query is sorted by, if it is sorted by one. */
export function groupsInForce<Row>(
  query: IGridQuery,
  schema: IGridSchema<Row>,
  workspace: { projectId?: string }
): ReadonlyArray<IRowGroup> | null {
  for (const entry of query.sort) {
    const column = schema.columns.find((c) => c.id === entry.columnId);
    const groups = column?.sortOrders?.find((order) => order.id === entry.order)?.groups(workspace);
    if (groups) return groups;
  }
  return null;
}

/** The rows a filter leaves out that no request param can, if one does. */
export function exceptInForce<Row>(
  query: IGridQuery,
  schema: IGridSchema<Row>,
  workspace: { projectId?: string }
): Record<string, unknown> | undefined {
  for (const entry of Object.values(query.filters)) {
    const toExcept = schema.columns.find((c) => c.id === entry.columnId)?.filter?.toExcept;
    if (toExcept && entry.value.kind === FilterValueKind.Text) {
      const except = toExcept(entry.value.text, workspace);
      if (except) return except;
    }
  }
  return undefined;
}

/** Whether a row holds a group's params, as the API's equality filters test them. */
export function rowMatches(row: unknown, params: Record<string, unknown>): boolean {
  return Object.entries(params).every(
    ([key, value]) => String((row as Record<string, unknown>)[key]) === String(value)
  );
}

/** Whether a row is one of a group's: its filter's, and not one of the exception's. */
export function inGroup(row: unknown, group: IRowGroup): boolean {
  return rowMatches(row, group.filter) && !(group.except && rowMatches(row, group.except));
}

/**
 * The default {@link IGridDataSource}: one server page per request, delegating to the
 * entity's domain config (`api.query.list`), which owns endpoint, `narrowFilters`,
 * `ilikeSearchEnabled` and facets. The grid contributes only page/sort/filter/search.
 */
export function createEntitycorePagedDataSource<Row>(
  options: IEntitycorePagedDataSourceOptions<Row>
): IGridDataSource<Row> {
  const { dataType, schema, context, listQueryFn, withFacets = true, transformParams } = options;
  const entity = getEntityByExtendedType({ type: dataType });
  const searchMode: 'ilike' | 'plain' = entity?.api?.config?.ilikeSearchEnabled ? 'ilike' : 'plain';

  const paramsFor = (query: IGridQuery): TEntitycoreParams => {
    const serialized = serializeQuery(query, schema, { searchMode, workspace: context });
    return transformParams ? transformParams(serialized) : serialized;
  };
  const run = (args: Parameters<TListQueryFn<Row>>[0]) =>
    (listQueryFn ? listQueryFn(args) : entity?.api?.query?.list?.(args)) as Promise<
      EntityCoreResponse<Row> | undefined
    >;

  /**
   * Requests for a page cut from groups of rows: the query's filters without its paging
   * (and without `omit`), each group paged through on its own. Within one page a request
   * is made once, however many groups ask for it.
   */
  const pager = (query: IGridQuery, omit: string[] = []) => {
    const { page: _page, page_size: _pageSize, ...shared } = paramsFor(query);
    for (const key of omit) delete shared[key];
    const size = query.pageSize;
    const made = new Map<string, ReturnType<typeof run>>();
    const list = (filters: Record<string, unknown>, page: number, pageSize: number) => {
      const params = { ...shared, ...filters, page, page_size: pageSize };
      const key = JSON.stringify(params);
      if (!made.has(key)) made.set(key, run({ filters: params, withFacets: false, context }));
      return made.get(key) as ReturnType<typeof run>;
    };
    return {
      list,
      count: async (filters: Record<string, unknown>) =>
        (await list(filters, 1, 1))?.pagination?.total_items ?? 0,
      /** rows [from, to) of a filter's listing, from the API pages that hold them */
      slice: async (filters: Record<string, unknown>, from: number, to: number) => {
        if (from >= to) return [];
        const first = Math.floor(from / size) + 1;
        const last = Math.floor((to - 1) / size) + 1;
        const pages = await Promise.all(
          Array.from({ length: last - first + 1 }, (_, k) => list(filters, first + k, size))
        );
        const skip = from - (first - 1) * size;
        return pages.flatMap((res) => res?.data ?? []).slice(skip, skip + (to - from));
      },
      /** false for params at odds with the query's filters (and `also`), which hold nothing */
      agrees: (filters: Record<string, unknown>, also: Record<string, unknown> = {}) => {
        const set = { ...shared, ...also };
        return Object.entries(filters).every(
          ([key, value]) => !(key in set) || String(set[key]) === String(value)
        );
      },
    };
  };

  /**
   * Groups of rows listed one after the other, a page cut from them by offset. A group
   * with an exception is read off its filter's listing, newest first, passing over the
   * excepted rows: a page of it starts past each one listed ahead of it, found by halving
   * over them with a count of the rows created since each.
   */
  const fetchGroups = async (
    query: IGridQuery,
    groups: ReadonlyArray<IRowGroup>
  ): Promise<IGridPage<Row>> => {
    // rows are passed over by creation date, so the listing has to be in that order
    const byDate = groups.some((group) => group.except);
    const { list, count, slice, agrees } = pager(query, byDate ? ['order_by'] : []);
    const size = query.pageSize;
    const offset = (query.page - 1) * size;

    const counted = await Promise.all(
      groups
        .filter((group) => agrees(group.filter))
        .map(async (group) => {
          // an exception at odds with the filters holds nothing to leave out
          const leftOut =
            group.except && agrees(group.except, group.filter)
              ? { ...group.filter, ...group.except }
              : undefined;
          const [listed, passed] = await Promise.all([
            count(group.filter),
            leftOut ? count(leftOut) : 0,
          ]);
          return { filter: group.filter, leftOut, listed, passed, total: listed - passed };
        })
    );

    /** `need` of a group's rows from its `from`-th on, passing over the left-out ones */
    const read = async (
      { filter, leftOut, listed, passed }: (typeof counted)[number],
      from: number,
      need: number
    ) => {
      if (!leftOut) return slice(filter, from, from + need);
      // the kept rows listed ahead of the i-th left-out one, never fewer for a later one
      const keptBefore = async (i: number) => {
        const row = (await list(leftOut, i + 1, 1))?.data?.[0] as
          | { creation_date?: string }
          | undefined;
        if (!row?.creation_date) return Infinity;
        return (await count({ ...filter, creation_date__gte: row.creation_date })) - 1 - i;
      };
      // how many left-out rows come before the first row wanted; ahead of a group's very
      // first row, they are simply passed over as they come
      let lo = 0;
      let hi = from > 0 ? passed : 0;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if ((await keptBefore(mid)) <= from) lo = mid + 1;
        else hi = mid;
      }
      // each one passed over makes room for one more row, so read on by as many as are
      // still to come (up to a page), and further only if that falls short
      const kept = (rows: Row[]) => rows.filter((row) => !rowMatches(row, leftOut));
      let end = Math.min(from + lo + need + Math.min(passed - lo, size), listed);
      const rows = kept(await slice(filter, from + lo, end));
      while (rows.length < need && end < listed) {
        const more = Math.min(end + need - rows.length, listed);
        rows.push(...kept(await slice(filter, end, more)));
        end = more;
      }
      return rows.slice(0, need);
    };

    let start = 0;
    const parts = await Promise.all(
      counted.map((group) => {
        const from = Math.max(offset - start, 0);
        const to = Math.min(offset + size - start, group.total);
        start += group.total;
        return from < to ? read(group, from, to - from) : [];
      })
    );
    return { rows: parts.flat(), total: start };
  };

  const fetch = async (query: IGridQuery): Promise<IGridPage<Row>> => {
    const order = groupsInForce(query, schema, context);
    const except = exceptInForce(query, schema, context);
    if (order || except) {
      // a filter's exception holds for every group; the column orders leave out the
      // same rows, when they leave out any
      const groups = (order ?? [{ filter: {} }]).map((group) => ({
        ...group,
        except: group.except ?? except,
      }));
      return fetchGroups(query, groups);
    }

    // Never `with_facets` here: faceting the whole filtered set costs far more than
    // the page itself, and the rows would wait on it. See `fetchFacets`.
    const res = await run({ filters: paramsFor(query), withFacets: false, context });

    return {
      rows: res?.data ?? [],
      total: res?.pagination?.total_items ?? 0,
    };
  };

  // Left undefined when the host fetches facets itself, so the grid does not run a
  // second, losing request alongside the host's own.
  if (!withFacets) return { fetch };

  const fetchFacets = async (query: IGridQuery): Promise<TFacets | undefined> => {
    // Same filters as the rows, so counts describe exactly what is listed — but no
    // rows, since only the buckets are read.
    const res = await run({
      filters: { ...paramsFor(query), ...FACETS_ONLY_PAGE },
      withFacets: true,
      context,
    });
    return res?.facets as TFacets | undefined;
  };

  return { fetch, fetchFacets };
}
