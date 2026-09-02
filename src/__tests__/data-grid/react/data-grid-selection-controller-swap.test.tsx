/**
 * Regression: switching the browse scope while the picker held selections blew up with
 * "Maximum update depth exceeded" — the swap gives the grid a new store while `<DataGrid>`
 * and its `lastEmittedRef` baseline survive, so the store→host emit and the host→store
 * controlled sync each acted on the other's pre-swap value. Asserts the loop itself
 * (bounded emits, no throw), not the symptom.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore';
import {
  createDefaultOperatorRegistry,
  GridController,
  SelectionMode,
} from '@/features/data-grid/core';
import { EntityDataGrid } from '@/features/data-grid/host/browse-entity-grid';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { DataGrid } from '@/features/data-grid/react/data-grid';

import type { ReactNode } from 'react';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type {
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
} from '@/features/data-grid/core';
import type { TGridRenderer } from '@/features/data-grid/react/renderer';

// a shared "?scope=" query param, like the real nuqs-backed hook, so clicking the scope
// tab moves the whole tree
let scopeValue: string = WorkspaceScope.Public;
const scopeListeners = new Set<() => void>();

vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => {
    const scope = useSyncExternalStore(
      (listener: () => void) => {
        scopeListeners.add(listener);
        return () => scopeListeners.delete(listener);
      },
      () => scopeValue,
      () => scopeValue
    );
    return {
      scope,
      isPending: false,
      changeScope: (next: string) => {
        scopeValue = next;
        for (const listener of [...scopeListeners]) listener();
      },
    };
  },
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

interface Row {
  id: string;
  name: string;
}

const schema: IGridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
};

const PICKED: Row = { id: 'a', name: 'A' };

const emptySource: IGridDataSource<Row> = {
  fetch: async (_q: IGridQuery): Promise<IGridPage<Row>> => ({ rows: [], total: 0 }),
};

const nullRenderer: TGridRenderer = () => null;

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('DataGrid picker selection survives a controller swap', () => {
  it('settles (bounded emits) and keeps the host picks when the controller is replaced', async () => {
    const emitted: Row[][] = [];

    function Host({ scopeKey }: { scopeKey: string }) {
      const [selected, setSelected] = useState<Row[]>([PICKED]);
      const onChange = useCallback((rows: Row[]) => {
        emitted.push(rows);
        setSelected(rows);
      }, []);
      // mirrors EntityDataGrid: a NEW controller whenever the listing key changes
      const controller = useMemo(
        () =>
          new GridController<Row>({
            schema,
            context: { dataType: 't', scope: scopeKey },
            defaultPageSize: 30,
          }),
        [scopeKey]
      );
      return (
        <DataGrid<Row>
          controller={controller}
          dataSource={emptySource}
          renderer={nullRenderer}
          operators={createDefaultOperatorRegistry()}
          cellRenderers={new CellRendererRegistry()}
          queryKey={['t', scopeKey]}
          showColumnChooser={false}
          selection={{ mode: SelectionMode.Multi, selectedRows: selected, onChange }}
        />
      );
    }

    const { rerender } = wrap(<Host scopeKey="public" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const before = emitted.length;

    await act(async () => {
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <Host scopeKey="project" />
        </QueryClientProvider>
      );
      await new Promise((r) => setTimeout(r, 200));
    });

    // before the fix this never converged
    expect(emitted.length - before).toBeLessThanOrEqual(1);
    expect(emitted.at(-1) ?? [PICKED]).toEqual([PICKED]);
  });
});

describe('EntityDataGrid — switching scope in a picker listing', () => {
  it('does not exceed the update depth and lands on the new scope', async () => {
    scopeValue = WorkspaceScope.Public;
    const dataType = ExtendedEntitiesTypeDict.UniversalCellMorphology;
    const definition = getEntityGridDefinition(dataType);
    expect(definition).toBeDefined();

    const picked = { id: 'a', name: 'A' } as EntityCoreIdentifiableNamed;
    const source: IGridDataSource<EntityCoreIdentifiableNamed> = {
      fetch: async (): Promise<IGridPage<EntityCoreIdentifiableNamed>> => ({ rows: [], total: 0 }),
    };

    function Host() {
      const [selectionsByType, setSelectionsByType] = useState<
        Record<string, EntityCoreIdentifiableNamed[]>
      >({ [dataType]: [picked] });
      // browse-widget hands a fresh array literal when the type has no picks yet
      const activeSelectedRows = selectionsByType[dataType] ?? [];
      const onRowsSelected = useCallback((rows: EntityCoreIdentifiableNamed[]) => {
        setSelectionsByType((previous) => ({ ...previous, [dataType]: rows }));
      }, []);

      if (!definition) return null;
      return (
        <EntityDataGrid
          definition={definition}
          id="picker"
          requireMiniDetailView
          requireBrainRegion={false}
          requireSpeciesSelector={false}
          requireScopeSelector
          section={WorkspaceSection.GeneralWorkflow}
          dataType={dataType}
          dataSourceOverride={source}
          mainTableProps={{
            selectionType: 'checkbox',
            selectedRows: activeSelectedRows,
            onRowsSelected,
          }}
        />
      );
    }

    wrap(<Host />);
    const projectTab = await screen.findByTestId('scope-selector-tab-project');

    await act(async () => {
      fireEvent.click(projectTab);
      await new Promise((r) => setTimeout(r, 250));
    });

    await waitFor(() =>
      expect(screen.getByTestId('scope-selector-tab-project')).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
  });
});
