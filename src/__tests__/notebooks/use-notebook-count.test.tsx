import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

const savedFiltersMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/entity-configuration/domain/helpers', () => ({
  getEntityByExtendedType: () => ({ api: { query: { list: listMock } } }),
}));
vi.mock('@/features/data-grid/saved-listing-filters', () => ({
  useSavedListingFilters: () => savedFiltersMock(),
  // marks the saved-filters request so the list mock can tell it from the total's
  savedListingParams: async (_type: string, saved: unknown) => (saved ? { saved: true } : {}),
}));

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { gridFilteredTotalAtom } from '@/features/data-grid/host/grid-total';
import { useNotebookCount } from '@/features/notebooks/hooks/use-notebook-count';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';

/**
 * Pins the Notebooks sidebar count: it shows the saved-filters count of a listing that is not
 * on screen, waits while storage is unread, and its loading/error follow the number it shows.
 */

const TEMPLATE = ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;
const SCOPE = WorkspaceScope.Public;
const SAVED = { filters: {}, freeTextSearch: 'spikes' };
const { dataKey } = makeDataKey({
  virtualLabId: 'vlab',
  projectId: 'proj',
  section: WorkspaceSection.Notebooks,
  dataType: TEMPLATE,
  scope: SCOPE,
});

const page = (total: number) => ({ pagination: { total_items: total } });

function setup(isActive: boolean) {
  const store = createStore();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </Provider>
  );
  const hook = renderHook(
    () => useNotebookCount({ extendedType: TEMPLATE, scope: SCOPE, isActive }),
    {
      wrapper,
    }
  );
  return { ...hook, store };
}

describe('useNotebookCount', () => {
  beforeEach(() => {
    listMock.mockReset();
    savedFiltersMock.mockReset();
  });

  it('counts under the saved filters when the listing is not on screen', async () => {
    savedFiltersMock.mockReturnValue(SAVED);
    listMock.mockImplementation(({ filters }) => Promise.resolve(page(filters.saved ? 21 : 47)));
    const { result } = setup(false);

    await waitFor(() => expect(result.current.filtered).toBe(21));
    expect(result.current).toMatchObject({ total: 47, isLoading: false, isError: false });
  });

  it('waits while storage is unread instead of showing the unfiltered total', async () => {
    savedFiltersMock.mockReturnValue(undefined);
    listMock.mockResolvedValue(page(47));
    const { result } = setup(false);

    await waitFor(() => expect(result.current.total).toBe(47));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.filtered).toBeUndefined();
  });

  it('drops the skeleton once the grid publishes, with the saved request still in flight', async () => {
    savedFiltersMock.mockReturnValue(SAVED);
    listMock.mockImplementation(({ filters }) =>
      filters.saved ? new Promise(() => {}) : Promise.resolve(page(47))
    );
    const { result, store } = setup(true);
    await waitFor(() => expect(result.current.total).toBe(47));
    expect(result.current.isLoading).toBe(true);

    act(() => store.set(gridFilteredTotalAtom(dataKey), 21));

    expect(result.current).toMatchObject({ filtered: 21, isLoading: false });
  });

  it('reports a failed saved-filters count instead of a number', async () => {
    savedFiltersMock.mockReturnValue(SAVED);
    listMock.mockImplementation(({ filters }) =>
      filters.saved ? Promise.reject(new Error('boom')) : Promise.resolve(page(47))
    );
    const { result } = setup(false);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.filtered).toBeUndefined();
  });
});
