/**
 * Regression: switching species resets the listing's browse state, and a reset that also
 * dropped the column layout wrote the schema defaults over the durable localStorage
 * slice — permanently losing the user's unticked columns. Driven through the real
 * `EntityDataGrid` because the defect was in the host, not the controller.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import {
  speciesSelectionModeAtom,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import { EntityDataGrid } from '@/features/data-grid/host/browse-entity-grid';

import type { ReactNode } from 'react';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { IGridDataSource, IGridPage, IGridState } from '@/features/data-grid/core';

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: WorkspaceScope.Public, isPending: false, changeScope: () => {} }),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'pr' }),
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => ({ selectedBrainRegion: undefined }),
}));
vi.mock('@/features/data-grid/renderers/aggrid', () => ({ AgGridRenderer: () => null }));
vi.mock('@/ui/segments/mini-detail-view', () => ({ MiniDetailView: () => null }));
vi.mock('@/ui/segments/explore/circuit/elements/download-panel', () => ({
  DownloadPanel: () => null,
}));
vi.mock('@/features/brain-region-hierarchy/components/region-banner', () => ({
  PortalRegionBanner: () => null,
}));

const DATA_TYPE = ExtendedEntitiesTypeDict.IonChannelRecording;
// the layout slice is scoped to section + entity type only (no lab/project/scope)
const LAYOUT_KEY = `data-grid:v1:l:${WorkspaceSection.Data}/${DATA_TYPE}`;
const SESSION_KEY = `data-grid:v1:s:vl/pr/data/${DATA_TYPE}/${WorkspaceScope.Public}`;
/** the third checkbox in the chooser (after "Select all" and "Preview") */
const HIDDEN_COLUMN_ID = 'brainRegion';

/**
 * This environment ships no `window.localStorage`/`sessionStorage`, so install a minimal
 * in-memory `Storage`; reading the raw entries back is what makes the assertions real.
 */
function installStorage(name: 'localStorage' | 'sessionStorage') {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
  Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
  return map;
}

function readSlice(map: Map<string, string>, key: string): Partial<IGridState> {
  const raw = map.get(key);
  return raw ? (JSON.parse(raw) as Partial<IGridState>) : {};
}

const source: IGridDataSource<EntityCoreIdentifiableNamed> = {
  fetch: async (): Promise<IGridPage<EntityCoreIdentifiableNamed>> => ({ rows: [], total: 0 }),
};

function wrap(ui: ReactNode, store: ReturnType<typeof createStore>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Provider store={store}>{ui}</Provider>
    </QueryClientProvider>
  );
}

function mountListing(store: ReturnType<typeof createStore>) {
  const definition = getEntityGridDefinition(DATA_TYPE);
  if (!definition) throw new Error(`no grid definition for ${DATA_TYPE}`);
  return wrap(
    <EntityDataGrid
      definition={definition}
      requireMiniDetailView={false}
      section={WorkspaceSection.Data}
      dataType={DATA_TYPE}
      scope={WorkspaceScope.Public}
      dataSourceOverride={source}
    />,
    store
  );
}

function focusedSpecies(hierarchId: string) {
  return {
    id: hierarchId,
    name: 'mouse',
    taxonomyId: 'taxon',
    hierarchId,
    displayName: 'Mouse',
  };
}

describe('species switch vs the saved column layout', () => {
  it('keeps the localStorage layout slice when the species changes', async () => {
    const local = installStorage('localStorage');
    const session = installStorage('sessionStorage');

    const store = createStore();
    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.Focused);
    store.set(workspaceHierarchySpeciesAtom, focusedSpecies('h1'));

    mountListing(store);

    // the user unticks a column in the chooser
    fireEvent.click(await screen.findByRole('button', { name: 'Columns' }));
    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);
    expect(readSlice(local, LAYOUT_KEY).hiddenColumns).toContain(HIDDEN_COLUMN_ID);

    // …then switches species, which resets the browse state
    await act(async () => {
      store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    });

    expect(readSlice(local, LAYOUT_KEY).hiddenColumns).toContain(HIDDEN_COLUMN_ID);
    expect(readSlice(session, SESSION_KEY).page).toBe(1);
    expect(readSlice(session, SESSION_KEY).filters).toEqual({});
  });

  it('re-hydrates the hidden column on a fresh mount after the switch', async () => {
    const local = installStorage('localStorage');
    installStorage('sessionStorage');

    const store = createStore();
    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.Focused);
    store.set(workspaceHierarchySpeciesAtom, focusedSpecies('h1'));

    const { unmount } = mountListing(store);
    fireEvent.click(await screen.findByRole('button', { name: 'Columns' }));
    const checkboxes = await screen.findAllByRole('checkbox');
    const label = checkboxes[2].closest('label')?.textContent ?? '';
    fireEvent.click(checkboxes[2]);
    await act(async () => {
      store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    });
    unmount();

    // "the user refreshes the page"
    mountListing(store);
    fireEvent.click(await screen.findByRole('button', { name: 'Columns' }));
    const restored = await screen.findAllByRole('checkbox');
    const box = restored.find((c) => c.closest('label')?.textContent === label);
    expect(box).toBeDefined();
    expect((box as HTMLInputElement).checked).toBe(false);
    expect(readSlice(local, LAYOUT_KEY).hiddenColumns).toContain(HIDDEN_COLUMN_ID);
  });
});
