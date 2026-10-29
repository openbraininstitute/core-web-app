import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  buildGridQuery,
  FilterValueKind,
  GridActionType,
  GridController,
  OperatorId,
  repairPersistedFilters,
} from '@/features/data-grid/core';
import { createSessionStatePersistence } from '@/features/data-grid/react';
import {
  parseSavedListingFilters,
  savedListingParams,
  useSavedListingFilters,
} from '@/features/data-grid/saved-listing-filters';
import { resolveListingVariant } from '@/features/views/listing/variants/registry';
import { scopeListing } from '@/features/views/listing/variants/scope-listing';

/**
 * Pins the Data/Notebook sidebar count of a listing that is not on screen: it must count
 * under the filters the listing saved, which its grid re-applies on return. Regression:
 * switching entity type showed "47 of 47" for a circuit listing filtered to "21 of 47".
 */

const CIRCUIT = ExtendedEntitiesTypeDict.Circuit;
const KEY = 'vlab/proj/data/circuit/public/small';

function mountCircuitGrid() {
  const definition = getEntityGridDefinition(CIRCUIT);
  if (!definition) throw new Error('circuit grid definition missing');
  const column = definition.schema.columns.find((c) => c.filter?.field === 'number_neurons');
  if (!column) throw new Error('number_neurons column missing');
  const controller = new GridController({
    schema: definition.schema,
    context: { dataType: CIRCUIT, section: WorkspaceSection.Data },
    instanceKey: KEY,
    persistence: [createSessionStatePersistence()],
    defaultPageSize: 30,
  });
  return { controller, columnId: column.id };
}

describe('saved listing filters', () => {
  beforeEach(() => sessionStorage.clear());

  it('follows the grid, and outlives it once it unmounts', async () => {
    const { controller, columnId } = mountCircuitGrid();
    const { result } = renderHook(() => useSavedListingFilters(KEY));
    expect(result.current).toBeNull();

    act(() =>
      controller.store.dispatch({
        type: GridActionType.SetFilter,
        columnId,
        entry: {
          columnId,
          operator: OperatorId.Range,
          value: { kind: FilterValueKind.Range, min: 100, max: null },
        },
      })
    );
    expect(result.current?.filters[columnId]).toBeDefined();

    // the user switches entity type: the grid goes away, its filters stay
    controller.dispose();
    expect(result.current?.filters[columnId]).toBeDefined();

    await expect(savedListingParams(CIRCUIT, result.current)).resolves.toEqual({
      number_neurons__gte: 100,
    });

    // a breadcrumb clears the slice with no grid mounted
    act(() => createSessionStatePersistence().clear?.(KEY));
    expect(result.current).toBeNull();
  });

  it('carries the free-text search', async () => {
    const { controller } = mountCircuitGrid();
    const { result } = renderHook(() => useSavedListingFilters(KEY));
    act(() => controller.store.dispatch({ type: GridActionType.SetFreeTextSearch, text: 'hippo' }));
    controller.dispose();

    // circuit searches with ilike, as its grid does
    await expect(savedListingParams(CIRCUIT, result.current)).resolves.toEqual({
      ilike_search: '*hippo*',
    });
  });

  it('counts unfiltered when nothing that narrows the rows is saved', async () => {
    // page, sort and empty filters do not change the count, so they must not split the cache
    expect(
      parseSavedListingFilters(
        JSON.stringify({
          page: 3,
          sort: [{ columnId: 'name', direction: 'asc' }],
          filters: {
            name: { columnId: 'name', operator: 'ilike', value: { kind: 'text', text: ' ' } },
          },
          freeTextSearch: '',
        })
      )
    ).toBeNull();
    expect(parseSavedListingFilters('not json')).toBeNull();
    await expect(savedListingParams(CIRCUIT, undefined)).resolves.toEqual({});
  });
});

describe('the sidebar count and the grid send the same filters', () => {
  it('for a variant listing, after the load-time filter repair', async () => {
    const definition = getEntityGridDefinition(CIRCUIT);
    const variant = resolveListingVariant(CIRCUIT, 'small');
    if (!definition || !variant) throw new Error('circuit listing missing');
    // what the listing mounts: the variant-scoped definition and params
    const scoped = scopeListing({ definition }, variant);
    const { schema } = scoped.definition;
    const column = schema.columns.find((c) => c.filter?.field === 'number_neurons');
    if (!column) throw new Error('number_neurons column missing');
    const saved = {
      filters: {
        [column.id]: {
          columnId: column.id,
          operator: OperatorId.Range,
          value: { kind: FilterValueKind.Range, min: 100, max: null },
        },
        // orphaned since the state was saved: both paths must drop it
        'adv:gone:gone': {
          columnId: 'adv:gone:gone',
          operator: OperatorId.Eq,
          value: { kind: FilterValueKind.Text, text: 'x' },
        },
      },
      freeTextSearch: 'hippo',
    };

    let sent: Record<string, unknown> = {};
    const source = createEntitycorePagedDataSource({
      dataType: CIRCUIT,
      schema,
      context: { virtualLabId: 'vlab', projectId: 'proj' },
      listQueryFn: async ({ filters }) => {
        sent = filters;
        return undefined;
      },
    });
    // the grid's request, from the state its controller repaired on load
    await source.fetch(
      buildGridQuery(
        {
          page: 1,
          pageSize: 30,
          sort: [],
          filters: repairPersistedFilters(saved.filters, schema),
          freeTextSearch: saved.freeTextSearch,
        },
        scoped.extraQueryParams
      )
    );
    const { page: _page, page_size: _pageSize, ...gridFilters } = sent;

    const sidebarFilters = {
      ...(await savedListingParams(CIRCUIT, saved, variant)),
      ...variant.params,
    };
    expect(sidebarFilters).toEqual(gridFilters);
  });
});
