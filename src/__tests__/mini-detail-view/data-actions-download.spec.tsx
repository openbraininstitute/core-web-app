import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { downloadArchive } from '@/services/entity-download';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import { DataActions } from '@/ui/segments/mini-detail-view/actions/data';

import { makeCellMorphology, makeCircuit, makeSingleNeuronScaleCircuit } from './fixtures';

import type { ComponentProps } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@/services/entity-download', () => ({
  downloadArchive: vi.fn(async () => undefined),
}));

function renderDataActions(props: ComponentProps<typeof DataActions>, store = createStore()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return {
    store,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <DataActions {...props} />
        </Provider>
      </QueryClientProvider>
    ),
  };
}

describe('DataActions download (mini-detail-view, section: Data)', () => {
  beforeEach(() => {
    vi.mocked(downloadArchive).mockReset();
    vi.mocked(downloadArchive).mockResolvedValue(undefined);
  });

  it('exposes a download control', () => {
    renderDataActions({ record: makeCellMorphology() });

    expect(screen.getByTitle('download')).toBeInTheDocument();
  });

  it('downloads a non-circuit entity as a single-id archive', async () => {
    const record = makeCellMorphology();

    renderDataActions({
      record,
      dataType: ExtendedEntitiesTypeDict.CellMorphology,
    });

    fireEvent.click(screen.getByTitle('download'));

    await waitFor(() => {
      expect(downloadArchive).toHaveBeenCalledWith(record.type, [record.id], {
        virtualLabId: 'vl-1',
        projectId: 'proj-1',
      });
    });
  });

  it('opens the circuit download panel instead of archiving when dataType is Circuit', () => {
    const store = createStore();
    const record = makeCircuit();

    renderDataActions(
      {
        record,
        dataType: ExtendedEntitiesTypeDict.Circuit,
      },
      store
    );

    fireEvent.click(screen.getByTitle('download'));

    expect(store.get(downloadPanelCircuitAtom)).toEqual(record);
    expect(downloadArchive).not.toHaveBeenCalled();
  });

  it('opens the circuit download panel when dataType is SingleNeuronCircuit', () => {
    const store = createStore();
    const record = makeSingleNeuronScaleCircuit();

    renderDataActions(
      {
        record,
        dataType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
      },
      store
    );

    fireEvent.click(screen.getByTitle('download'));

    expect(store.get(downloadPanelCircuitAtom)).toEqual(record);
    expect(downloadArchive).not.toHaveBeenCalled();
  });
});
